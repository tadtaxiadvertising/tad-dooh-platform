// apps/driver/hooks/useTelemetry.ts
/**
 * useTelemetry — Hook de Telemetría Offline-First
 *
 * Reglas de negocio:
 *  - Agrupa coordenadas en lotes de BATCH_SIZE (10) o flushea cada FLUSH_INTERVAL_MS (60s)
 *  - Almacena el buffer en localStorage bajo la clave TAD_TELEMETRY_BATCH
 *  - Al recibir HTTP 402 del backend → destruye el worker GPS y activa el kill-switch
 *  - Sin dependencias de librerías de UI externas
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { usePaymentStore } from '../store/usePaymentStore';

// ─── Constantes ──────────────────────────────────────────────────────────────
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 60_000; // 60 segundos
const STORAGE_KEY = 'TAD_TELEMETRY_BATCH';
const OFFLINE_STORAGE_KEY = 'TAD_TELEMETRY_OFFLINE';
const MAX_OFFLINE_RECORDS = 500;

export type ConnectionStatus = 'online' | 'offline' | 'syncing';

export interface TelemetryCoord {
  lat: number;
  lng: number;
  ts: number;
  accuracy?: number;
}

export interface UseTelemetryReturn {
  connectionStatus: ConnectionStatus;
  batchCount: number;     // coordenadas actuales en el buffer (0–10)
  offlineCount: number;   // registros guardados offline pendientes de sync
  startTracking: () => void;
  stopTracking: () => void;
  isTracking: boolean;
}

// ─── Helpers localStorage ─────────────────────────────────────────────────────
function readBatch(): TelemetryCoord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeBatch(batch: TelemetryCoord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batch));
  } catch {
    // Quota exceeded — descartamos entradas antiguas
    const trimmed = batch.slice(-Math.floor(BATCH_SIZE / 2));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

function readOfflineQueue(): TelemetryCoord[] {
  try {
    const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function appendOfflineQueue(coords: TelemetryCoord[]): void {
  try {
    const existing = readOfflineQueue();
    const merged = [...existing, ...coords].slice(-MAX_OFFLINE_RECORDS);
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Quota — ignorar silenciosamente
  }
}

function clearOfflineQueue(): void {
  localStorage.removeItem(OFFLINE_STORAGE_KEY);
}

// ─── Hook Principal ───────────────────────────────────────────────────────────
export function useTelemetry(): UseTelemetryReturn {
  const { setLock } = usePaymentStore();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
  );
  const [batchCount, setBatchCount] = useState<number>(() => readBatch().length);
  const [offlineCount, setOfflineCount] = useState<number>(() => readOfflineQueue().length);
  const [isTracking, setIsTracking] = useState(false);

  // Refs para evitar closures obsoletos
  const watchIdRef = useRef<number | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOnlineRef = useRef(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const wakeLockRef = useRef<any>(null); // Screen Wake Lock sentinel

  // ─── Flush: envía el batch al backend ────────────────────────────────────
  const flushBatch = useCallback(async (forceFlush = false) => {
    const batch = readBatch();
    if (batch.length === 0) return;
    if (!forceFlush && batch.length < BATCH_SIZE) return;

    if (!isOnlineRef.current) {
      // Sin red → guardar en cola offline
      appendOfflineQueue(batch);
      writeBatch([]);
      setBatchCount(0);
      setOfflineCount(readOfflineQueue().length);
      return;
    }

    setConnectionStatus('syncing');

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/backend-api';
      
      // Obtener IDs para el DTO
      const userRaw = localStorage.getItem('tad_driver_user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const driverId = user?.entityId || 'unknown';
      const deviceId = localStorage.getItem('TAD_DEVICE_ID') || 'unknown';

      const res = await fetch(`${apiBase}/fleet/track-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          driverId,
          deviceId,
          points: batch.map(c => ({
            lat: c.lat,
            lng: c.lng,
            speed: 0, // No disponible en todas las plataformas, default 0
            timestamp: c.ts
          }))
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status === 402) {
        // ⚠️ PARADOJA 402: Kill-Switch activado
        stopTracking();
        setLock(true, 'Suscripción vencida. Pago de RD$6,000 requerido.');
        setConnectionStatus('offline');
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Éxito: limpiar batch principal
      writeBatch([]);
      setBatchCount(0);

      // Intentar también vaciar la cola offline acumulada
      const offlineQueue = readOfflineQueue();
      if (offlineQueue.length > 0) {
        const retryRes = await fetch(`${apiBase}/fleet/track-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            driverId,
            deviceId,
            points: offlineQueue.map(c => ({
              lat: c.lat,
              lng: c.lng,
              speed: 0,
              timestamp: c.ts
            }))
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (retryRes.ok) {
          clearOfflineQueue();
          setOfflineCount(0);
        }
      }

      setConnectionStatus('online');
    } catch {
      // Fallo de red: mover a cola offline
      appendOfflineQueue(batch);
      writeBatch([]);
      setBatchCount(0);
      setOfflineCount(readOfflineQueue().length);
      setConnectionStatus(isOnlineRef.current ? 'online' : 'offline');
    }
  }, [setLock]);

  // ─── Inicializar flush periódico ──────────────────────────────────────────
  const resetFlushTimer = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushBatch(true); // flush forzado por tiempo
      resetFlushTimer();
    }, FLUSH_INTERVAL_MS);
  }, [flushBatch]);

  // ─── Añadir coordenada al batch ───────────────────────────────────────────
  const addCoord = useCallback((coord: TelemetryCoord) => {
    const batch = readBatch();
    batch.push(coord);
    writeBatch(batch);
    setBatchCount(batch.length);

    if (batch.length >= BATCH_SIZE) {
      flushBatch(false);
    }
  }, [flushBatch]);

  // ─── startTracking ────────────────────────────────────────────────────────
  const startTracking = useCallback(() => {
    if (watchIdRef.current !== null) return; // ya está activo
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    setIsTracking(true);
    resetFlushTimer();

    // ─── Activar Screen Wake Lock ──────────────────────────────────────────
    if ('wakeLock' in navigator) {
      try {
        (navigator as any).wakeLock.request('screen').then((lock: any) => {
          wakeLockRef.current = lock;
          if (process.env.NODE_ENV !== 'production') {
            console.log('[useTelemetry] Screen Wake Lock activo');
          }
        });
      } catch (err: any) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[useTelemetry] Wake Lock Error:', err.message);
        }
      }
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        addCoord({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ts: pos.timestamp,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        // Error de GPS (permisos denegados, etc.) — no fatal
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[useTelemetry] GPS error:', err.code, err.message);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      }
    );
  }, [addCoord, resetFlushTimer]);

  // ─── stopTracking (Kill-Switch) ───────────────────────────────────────────
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    // ─── Liberar Wake Lock ────────────────────────────────────────────────
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      });
    }

    setIsTracking(false);
  }, []);

  // ─── Listeners de red ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      setConnectionStatus('online');
      // Intentar sincronizar data offline acumulada
      flushBatch(true);
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
      setConnectionStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Escuchar mensaje del Service Worker para flush
    const handleSWMessage = (evt: MessageEvent) => {
      if (evt.data?.type === 'FLUSH_TELEMETRY') {
        flushBatch(true);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [flushBatch]);

  // ─── Cleanup al desmontar ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    connectionStatus,
    batchCount,
    offlineCount,
    startTracking,
    stopTracking,
    isTracking,
  };
}
