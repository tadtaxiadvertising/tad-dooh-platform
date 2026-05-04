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
  syncPending: () => Promise<{ processed: number; remaining: number; success: boolean }>;
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

function writeOfflineQueue(coords: TelemetryCoord[]): void {
  try {
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(coords.slice(-MAX_OFFLINE_RECORDS)));
  } catch {
    // Quota exceeded — mantenemos estado actual sin romper UI
  }
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

  // ─── Memoria persistente durante la sesión ─────────────────────────────
  const memoryBufferRef = useRef<TelemetryCoord[]>([]);

  const resolveApiBase = useCallback(() => '/api/proxy', []);

  const buildTelemetryPayload = useCallback((driverId: string, deviceId: string, points: TelemetryCoord[]) => {
    return {
      driverId,
      deviceId,
      points: points.map((coord) => ({
        lat: coord.lat,
        lng: coord.lng,
        speed: 0,
        timestamp: coord.ts,
      })),
    };
  }, []);

  const postTrackBatch = useCallback(async (
    apiBase: string,
    driverId: string,
    deviceId: string,
    points: TelemetryCoord[]
  ) => {
    return fetch(`${apiBase}/fleet/track-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildTelemetryPayload(driverId, deviceId, points)),
      signal: AbortSignal.timeout(15_000),
    });
  }, [buildTelemetryPayload]);

  const syncOfflineQueue = useCallback(async (
    apiBase: string,
    driverId: string,
    deviceId: string
  ) => {
    const DRIP_CHUNK_SIZE = 50;
    let processed = 0;
    let remainingQueue = readOfflineQueue();

    while (remainingQueue.length > 0) {
      const chunk = remainingQueue.slice(0, DRIP_CHUNK_SIZE);

      try {
        const retryRes = await postTrackBatch(apiBase, driverId, deviceId, chunk);
        if (retryRes.status === 402) {
          setLock(true, 'Suscripción vencida. Pago de RD$6,000 requerido.');
          setConnectionStatus('offline');
          break;
        }
        if (!retryRes.ok) {
          break;
        }
      } catch {
        break;
      }

      processed += chunk.length;
      remainingQueue = remainingQueue.slice(chunk.length);
      writeOfflineQueue(remainingQueue);
      setOfflineCount(remainingQueue.length);

      if (remainingQueue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 1500 + 300));
      }
    }

    if (remainingQueue.length === 0) {
      clearOfflineQueue();
      setOfflineCount(0);
    }

    return {
      processed,
      remaining: remainingQueue.length,
      success: remainingQueue.length === 0,
    };
  }, [postTrackBatch, setLock]);

  // ─── Flush: envía el batch al backend ────────────────────────────────────
  const flushBatch = useCallback(async (forceFlush = false) => {
    // 1. Sincronizar memoria con storage antes de procesar
    const storageBatch = readBatch();
    const combinedBatch = [...storageBatch, ...memoryBufferRef.current];
    
    if (combinedBatch.length === 0) return;
    if (!forceFlush && combinedBatch.length < BATCH_SIZE) return;

    // Limpiar buffers inmediatamente para evitar duplicados en re-entradas
    memoryBufferRef.current = [];
    writeBatch([]);

    if (!isOnlineRef.current) {
      // Sin red → guardar en cola offline
      appendOfflineQueue(combinedBatch);
      setBatchCount(0);
      setOfflineCount(readOfflineQueue().length);
      return;
    }

    setConnectionStatus('syncing');

    try {
      const apiBase = resolveApiBase();
      
      const userRaw = localStorage.getItem('tad_driver_user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const driverId = user?.entityId || 'unknown';
      const deviceId = localStorage.getItem('TAD_DEVICE_ID') || 'unknown';

      const res = await postTrackBatch(apiBase, driverId, deviceId, combinedBatch);

      if (res.status === 402) {
        stopTracking();
        setLock(true, 'Suscripción vencida. Pago de RD$6,000 requerido.');
        setConnectionStatus('offline');
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setBatchCount(0);

      if (readOfflineQueue().length > 0) {
        const syncResult = await syncOfflineQueue(apiBase, driverId, deviceId);
        if (!syncResult.success) {
          setConnectionStatus('offline');
          return;
        }
      }

      setConnectionStatus('online');
    } catch {
      // Re-encolar si falló el envío
      appendOfflineQueue(combinedBatch);
      setBatchCount(0);
      setOfflineCount(readOfflineQueue().length);
      setConnectionStatus('offline');
    }
  }, [postTrackBatch, resolveApiBase, setLock, syncOfflineQueue]);

  const syncPending = useCallback(async () => {
    const userRaw = localStorage.getItem('tad_driver_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const driverId = user?.entityId || 'unknown';
    const deviceId = localStorage.getItem('TAD_DEVICE_ID') || 'unknown';
    const apiBase = resolveApiBase();

    if (!isOnlineRef.current) {
      setConnectionStatus('offline');
      return { processed: 0, remaining: readOfflineQueue().length, success: false };
    }

    setConnectionStatus('syncing');
    const result = await syncOfflineQueue(apiBase, driverId, deviceId);
    setConnectionStatus(result.success ? 'online' : 'offline');
    return result;
  }, [resolveApiBase, syncOfflineQueue]);

  // ─── Inicializar flush periódico ──────────────────────────────────────────
  const resetFlushTimer = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushBatch(true);
      resetFlushTimer();
    }, FLUSH_INTERVAL_MS);
  }, [flushBatch]);

  // ─── Añadir coordenada al batch (OPTIMIZADO: Memoria primero) ─────────────
  const addCoord = useCallback((coord: TelemetryCoord) => {
    memoryBufferRef.current.push(coord);
    setBatchCount(prev => prev + 1);
    writeBatch(memoryBufferRef.current);

    // Persistir a disco solo si el buffer es grande o cada X tiempo 
    // para evitar I/O constante en cada segundo de GPS
    if (memoryBufferRef.current.length >= BATCH_SIZE) {
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
      if (readOfflineQueue().length > 0) {
        void syncPending();
        return;
      }

      setConnectionStatus('online');
      void flushBatch(true);
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
    syncPending,
    startTracking,
    stopTracking,
    isTracking,
  };
}
