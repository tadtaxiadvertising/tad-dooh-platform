// apps/driver/hooks/useTelemetry.ts
/**
 * useTelemetry — Hook de Telemetría Offline-First con soporte para IndexedDB
 *
 * Reglas de negocio:
 *  - Agrupa coordenadas en lotes de BATCH_SIZE (10) o flushea cada FLUSH_INTERVAL_MS (300s)
 *  - Almacena el buffer en IndexedDB para mayor resiliencia
 *  - Al recibir HTTP 402 del backend → destruye el worker GPS y activa el kill-switch
 *  - Sin dependencias de librerías de UI externas
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { usePaymentStore } from '../store/usePaymentStore';
import { openDB } from '../utils/indexedDb';

// ─── Constantes ──────────────────────────────────────────────────────────────
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 300_000; // 5 minutos (debounce estricto V12)
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

// ─── Helpers IndexedDB ────────────────────────────────────────────────────────
async function readCoordsByStatus(status: 'batch' | 'offline'): Promise<TelemetryCoord[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('telemetry', 'readonly');
    const store = tx.objectStore('telemetry');
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const all = request.result || [];
        resolve(all.filter((x: any) => x.status === status));
      };
      request.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error('IndexedDB read error:', err);
    return [];
  }
}

async function writeBatchCoords(batch: TelemetryCoord[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('telemetry', 'readwrite');
    const store = tx.objectStore('telemetry');
    
    return new Promise<void>((resolve) => {
      const allRequest = store.getAll();
      allRequest.onsuccess = () => {
        const all = allRequest.result || [];
        const batchKeys = all.filter((x: any) => x.status === 'batch').map((x: any) => x.ts);
        batchKeys.forEach((key: number) => store.delete(key));
        
        batch.forEach((coord) => {
          store.put({ ...coord, status: 'batch' });
        });
        resolve();
      };
      allRequest.onerror = () => resolve();
    });
  } catch (err) {
    console.error('IndexedDB writeBatch error:', err);
  }
}

async function appendOfflineCoords(coords: TelemetryCoord[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('telemetry', 'readwrite');
    const store = tx.objectStore('telemetry');
    
    return new Promise<void>((resolve) => {
      const allRequest = store.getAll();
      allRequest.onsuccess = () => {
        const all = allRequest.result || [];
        const offlineRecords = all.filter((x: any) => x.status === 'offline');
        
        const merged = [...offlineRecords, ...coords];
        const toKeep = merged.slice(-MAX_OFFLINE_RECORDS);
        
        const toKeepKeys = new Set(toKeep.map((x) => x.ts));
        offlineRecords.forEach((x: any) => {
          if (!toKeepKeys.has(x.ts)) {
            store.delete(x.ts);
          }
        });
        
        toKeep.forEach((coord) => {
          store.put({ ...coord, status: 'offline' });
        });
        resolve();
      };
      allRequest.onerror = () => resolve();
    });
  } catch (err) {
    console.error('IndexedDB appendOffline error:', err);
  }
}

async function clearOfflineCoords(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('telemetry', 'readwrite');
    const store = tx.objectStore('telemetry');
    return new Promise<void>((resolve) => {
      const allRequest = store.getAll();
      allRequest.onsuccess = () => {
        const all = allRequest.result || [];
        const offlineKeys = all.filter((x: any) => x.status === 'offline').map((x: any) => x.ts);
        offlineKeys.forEach((key: number) => store.delete(key));
        resolve();
      };
      allRequest.onerror = () => resolve();
    });
  } catch (err) {
    console.error('IndexedDB clearOffline error:', err);
  }
}

async function writeOfflineCoords(coords: TelemetryCoord[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('telemetry', 'readwrite');
    const store = tx.objectStore('telemetry');
    return new Promise<void>((resolve) => {
      const allRequest = store.getAll();
      allRequest.onsuccess = () => {
        const all = allRequest.result || [];
        const offlineKeys = all.filter((x: any) => x.status === 'offline').map((x: any) => x.ts);
        offlineKeys.forEach((key: number) => store.delete(key));

        coords.slice(-MAX_OFFLINE_RECORDS).forEach((coord) => {
          store.put({ ...coord, status: 'offline' });
        });
        resolve();
      };
      allRequest.onerror = () => resolve();
    });
  } catch (err) {
    console.error('IndexedDB writeOffline error:', err);
  }
}

/**
 * triggerKillSwitch — patrón centralizado de respuesta a 402.
 *
 * Antes había DOS copias casi idénticas de la limpieza de credenciales +
 * lock en este hook (`flushBatch` y `syncOfflineQueue`), ambas
 * llamadas `setLock(true, ...)` pero SÓLO UNA invalidaba el JWT en
 * `localStorage`. Resultado: requests autenticadas zombie durante el
 * grace period post-lock.
 *
 * Esta helper centraliza:
 *   1. Detener tracking GPS (si se le pasa stopFn).
 *   2. Limpiar claves de identidad (`tad_driver_user`, `TAD_DRIVER_JWT`).
 *   3. Disparar `TAD_FORCE_LOGOUT` para suscriptores del evento.
 *   4. Activar el PaymentLockOverlay vía `setLock(true)`.
 *
 * Vive como free function (no hook) porque la lógica no depende del
 * estado del componente y se reutiliza desde dos `useCallback`.
 */
function triggerKillSwitch(opts: {
  setLock: (locked: boolean, message?: string | null) => void;
  setConnectionStatus?: (s: 'online' | 'offline' | 'syncing') => void;
  stopTracking?: () => void;
}): void {
  const { setLock, setConnectionStatus, stopTracking } = opts;
  try {
    localStorage.removeItem('tad_driver_user');
    localStorage.removeItem('TAD_DRIVER_JWT');
    window.dispatchEvent(new CustomEvent('TAD_FORCE_LOGOUT', { detail: { reason: 'SUBSCRIPTION_UNPAID' } }));
  } catch {/* localStorage bloqueado no debe romper el flow */}
  if (stopTracking) stopTracking();
  if (setConnectionStatus) setConnectionStatus('offline');
  setLock(true, 'Suscripción vencida. Pago de RD$6,000 requerido.');
}

// ─── Hook Principal ───────────────────────────────────────────────────────────
export function useTelemetry(): UseTelemetryReturn {
  const { setLock } = usePaymentStore();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
  );
  const [batchCount, setBatchCount] = useState<number>(0);
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isTracking, setIsTracking] = useState(false);

  // Refs para evitar closures obsoletos
  const watchIdRef = useRef<number | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOnlineRef = useRef(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const wakeLockRef = useRef<any>(null); // Screen Wake Lock sentinel

  // ─── Memoria persistente durante la sesión ─────────────────────────────
  const memoryBufferRef = useRef<TelemetryCoord[]>([]);

  const resolveApiBase = useCallback(() => '/api/proxy', []);

  // Hidratar contadores iniciales desde IndexedDB
  useEffect(() => {
    async function hydrate() {
      const batch = await readCoordsByStatus('batch');
      const offline = await readCoordsByStatus('offline');
      setBatchCount(batch.length);
      setOfflineCount(offline.length);
    }
    hydrate();
  }, []);

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
      credentials: 'include',
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
    let remainingQueue = await readCoordsByStatus('offline');

    while (remainingQueue.length > 0) {
      const chunk = remainingQueue.slice(0, DRIP_CHUNK_SIZE);

      try {
        const retryRes = await postTrackBatch(apiBase, driverId, deviceId, chunk);
        if (retryRes.status === 402) {
          triggerKillSwitch({ setLock });
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
      await writeOfflineCoords(remainingQueue);
      setOfflineCount(remainingQueue.length);

      if (remainingQueue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 1500 + 300));
      }
    }

    if (remainingQueue.length === 0) {
      await clearOfflineCoords();
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
    const storageBatch = await readCoordsByStatus('batch');
    const combinedBatch = [...storageBatch, ...memoryBufferRef.current];

    if (combinedBatch.length === 0) return;
    if (!forceFlush && combinedBatch.length < BATCH_SIZE) return;

    // Limpiar buffers inmediatamente para evitar duplicados en re-entradas
    memoryBufferRef.current = [];
    await writeBatchCoords([]);

    if (!isOnlineRef.current) {
      // Sin red → guardar en cola offline
      await appendOfflineCoords(combinedBatch);
      setBatchCount(0);
      const offlineLen = (await readCoordsByStatus('offline')).length;
      setOfflineCount(offlineLen);
      return;
    }

    setConnectionStatus('syncing');

    try {
      const apiBase = resolveApiBase();

      const userRaw = localStorage.getItem('tad_driver_user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const driverId = user?.entityId || 'unknown';
      const deviceId = localStorage.getItem('TAD_DEVICE_ID') || 'unknown';

      // Evita enviar telemetría inválida durante onboarding/login sin identidad aún resuelta.
      if (driverId === 'unknown' || deviceId === 'unknown') {
        await appendOfflineCoords(combinedBatch);
        setBatchCount(0);
        const offlineLen = (await readCoordsByStatus('offline')).length;
        setOfflineCount(offlineLen);
        setConnectionStatus('offline');
        return;
      }

      const res = await postTrackBatch(apiBase, driverId, deviceId, combinedBatch);

      if (res.status === 402) {
        stopTracking();
        // B13 PATCH (v12.1.3) vía triggerKillSwitch: path centralizado para que
        // AMBOS puntos de kill-switch (flushBatch + syncOfflineQueue) invaliden
        // JWT local y disparen el evento de logout forzado. Ver helper arriba.
        triggerKillSwitch({ setLock });
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setBatchCount(0);

      const offlineQueue = await readCoordsByStatus('offline');
      if (offlineQueue.length > 0) {
        const syncResult = await syncOfflineQueue(apiBase, driverId, deviceId);
        if (!syncResult.success) {
          setConnectionStatus('offline');
          return;
        }
      }

      setConnectionStatus('online');
    } catch {
      // Re-encolar si falló el envío
      await appendOfflineCoords(combinedBatch);
      setBatchCount(0);
      const offlineLen = (await readCoordsByStatus('offline')).length;
      setOfflineCount(offlineLen);
      setConnectionStatus('offline');
    }
  }, [postTrackBatch, resolveApiBase, setLock, syncOfflineQueue]);

  const syncPending = useCallback(async () => {
    const userRaw = localStorage.getItem('tad_driver_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const driverId = user?.entityId || 'unknown';
    const deviceId = localStorage.getItem('TAD_DEVICE_ID') || 'unknown';
    const apiBase = resolveApiBase();

    const offlineQueue = await readCoordsByStatus('offline');
    if (!isOnlineRef.current) {
      setConnectionStatus('offline');
      return { processed: 0, remaining: offlineQueue.length, success: false };
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
    writeBatchCoords(memoryBufferRef.current);

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
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      void (navigator as any).wakeLock.request('screen')
        .then((lock: any) => {
          wakeLockRef.current = lock;
          if (process.env.NODE_ENV !== 'production') {
            console.log('[useTelemetry] Screen Wake Lock activo');
          }
        })
        .catch((err: any) => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[useTelemetry] Wake Lock no disponible:', err?.message || err);
          }
        });
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
      readCoordsByStatus('offline').then((offlineQueue) => {
        if (offlineQueue.length > 0) {
          void syncPending();
          return;
        }
        setConnectionStatus('online');
        void flushBatch(true);
      });
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
  }, [flushBatch, syncPending]);

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
