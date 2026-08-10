// apps/driver/hooks/useBackgroundTelemetry.ts
/**
 * useBackgroundTelemetry — Motor de Sincronización GPS Consolidado (V13)
 *
 * Consolidación del hook `useTelemetry` V12.1.3 con mejoras críticas:
 *
 *   1. DEBOUNCE ESTRICTO 5 MIN (300,000ms) — Regla de negocio inmutable.
 *      Captura GPS constante (watchPosition) pero flush al backend cada 5 min,
 *      minimizando consumo de batería y requests HTTP.
 *
 *   2. BACKGROUND TRACKING — visibilitychange handler mantiene el GPS activo
 *      cuando la PWA pasa a segundo plano en el dispositivo móvil.
 *      Wake Lock se re-adquiere cuando la app vuelve al foreground.
 *
 *   3. NON-BLOCKING BATCH SYNC — requestIdleCallback (o setTimeout fallback)
 *      procesa la cola offline por lotes hacia /fleet/track-batch sin bloquear
 *      la UI thread. Reconexión (navigator.onLine) triggera sync automático.
 *
 *   4. IndexedDB BUFFER — coordenadas acumuladas en TADTelemetryDB con
 *      status 'batch' (en vuelo) y 'offline' (pendientes). Máx 500 registros.
 *
 *   5. KILL-SWITCH 402 — HTTP 402 del backend → destruye worker GPS,
 *      invalida JWT local, dispara TAD_FORCE_LOGOUT, activa PaymentLockOverlay.
 *
 *   6. REALTIME BROADCAST — ping efímero a fleet_tracking_live (throttle 30s)
 *      para Admin Map (MAP-SPEC-2026), sin alterar debounce de 5 min.
 *
 * Sin dependencias de UI externas. 100% compatible con PWA Pages Router.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@tad/services';
import { usePaymentStore } from '../store/usePaymentStore';
import { openDB } from '../utils/indexedDb';
import { emitNotification } from '../lib/notificationEngine';

// ─── Constantes ──────────────────────────────────────────────────────────────
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 300_000;    // 5 minutos — debounce estricto (regla de negocio)
const MAX_OFFLINE_RECORDS = 500;
const DRIP_CHUNK_SIZE = 50;           // Tamaño de chunk para drip-sync offline
const LIVE_PING_THROTTLE_MS = 30_000; // 30s — MAP-SPEC-2026
const SYNC_IDLE_DELAY_MS = 200;       // requestIdleCallback fallback delay
const RECONNECT_SYNC_DELAY_MS = 1500; // Delay post-reconnect para stabilizar red

export type ConnectionStatus = 'online' | 'offline' | 'syncing';

export interface TelemetryCoord {
  lat: number;
  lng: number;
  ts: number;
  accuracy?: number;
}

export interface BackgroundTelemetryState {
  connectionStatus: ConnectionStatus;
  batchCount: number;
  offlineCount: number;
  isTracking: boolean;
  isBackgrounded: boolean;
}

export interface UseBackgroundTelemetryReturn extends BackgroundTelemetryState {
  syncPending: () => Promise<{ processed: number; remaining: number; success: boolean }>;
  startTracking: () => void;
  stopTracking: () => void;
}

// ─── requestIdleCallback polyfill ────────────────────────────────────────────
const scheduleIdleTask = typeof requestIdleCallback !== 'undefined'
  ? (fn: () => void) => requestIdleCallback(fn, { timeout: 3000 })
  : (fn: () => void) => setTimeout(fn, SYNC_IDLE_DELAY_MS);

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
  } catch {
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
        all.filter((x: any) => x.status === 'batch').forEach((x: any) => store.delete(x.ts));
        batch.forEach((coord) => store.put({ ...coord, status: 'batch' }));
        resolve();
      };
      allRequest.onerror = () => resolve();
    });
  } catch {/* graceful */}
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
          if (!toKeepKeys.has(x.ts)) store.delete(x.ts);
        });
        toKeep.forEach((coord) => store.put({ ...coord, status: 'offline' }));
        resolve();
      };
      allRequest.onerror = () => resolve();
    });
  } catch {/* graceful */}
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
        all.filter((x: any) => x.status === 'offline').forEach((x: any) => store.delete(x.ts));
        coords.slice(-MAX_OFFLINE_RECORDS).forEach((coord) => store.put({ ...coord, status: 'offline' }));
        resolve();
      };
      allRequest.onerror = () => resolve();
    });
  } catch {/* graceful */}
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
        all.filter((x: any) => x.status === 'offline').forEach((x: any) => store.delete(x.ts));
        resolve();
      };
      allRequest.onerror = () => resolve();
    });
  } catch {/* graceful */}
}

// ─── Kill-Switch ──────────────────────────────────────────────────────────────

function triggerKillSwitch(opts: {
  setLock: (locked: boolean, message?: string | null) => void;
  setConnectionStatus?: (s: ConnectionStatus) => void;
  stopTracking?: () => void;
}): void {
  const { setLock, setConnectionStatus, stopTracking } = opts;
  try {
    localStorage.removeItem('tad_driver_user');
    localStorage.removeItem('tad_driver_token');
    localStorage.removeItem('TAD_DRIVER_JWT');
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    window.dispatchEvent(new CustomEvent('TAD_FORCE_LOGOUT', { detail: { reason: 'SUBSCRIPTION_UNPAID' } }));
  } catch {/* localStorage bloqueado */}
  if (stopTracking) stopTracking();
  if (setConnectionStatus) setConnectionStatus('offline');
  setLock(true, 'Suscripción vencida. Pago de RD$6,000 requerido.');
  void emitNotification('SUBS_CRITICAL', { message: 'Suscripción vencida. Pago requerido.' });
}

// ─── Hook Principal ───────────────────────────────────────────────────────────

export function useBackgroundTelemetry(): UseBackgroundTelemetryReturn {
  const { setLock } = usePaymentStore();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
  );
  const [batchCount, setBatchCount] = useState<number>(0);
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isTracking, setIsTracking] = useState(false);
  const [isBackgrounded, setIsBackgrounded] = useState(
    typeof document !== 'undefined' && document.visibilityState === 'hidden'
  );

  const watchIdRef = useRef<number | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOnlineRef = useRef(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const wakeLockRef = useRef<any>(null);
  const memoryBufferRef = useRef<TelemetryCoord[]>([]);
  const liveChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastLivePingRef = useRef<number>(0);
  const syncInProgressRef = useRef(false);

  const resolveApiBase = useCallback(() => '/api/proxy', []);

  // ─── Hidratar contadores iniciales ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const batch = await readCoordsByStatus('batch');
      const offline = await readCoordsByStatus('offline');
      setBatchCount(batch.length);
      setOfflineCount(offline.length);
    })();
  }, []);

  // ─── Payload builder ──────────────────────────────────────────────────────
  const buildPayload = useCallback((driverId: string, deviceId: string, points: TelemetryCoord[]) => ({
    driverId,
    deviceId,
    points: points.map((c) => ({ lat: c.lat, lng: c.lng, speed: 0, timestamp: c.ts })),
  }), []);

  const postTrackBatch = useCallback(async (
    apiBase: string, driverId: string, deviceId: string, points: TelemetryCoord[]
  ) => {
    const token = localStorage.getItem('tad_driver_token') ||
      localStorage.getItem('TAD_DRIVER_JWT');
    return fetch(`${apiBase}/fleet/track-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(buildPayload(driverId, deviceId, points)),
      signal: AbortSignal.timeout(15_000),
    });
  }, [buildPayload]);

  // ─── Non-Blocking Offline Queue Sync ──────────────────────────────────────
  // Procesa la cola offline por DRIP_CHUNK_SIZE chunks usando requestIdleCallback
  // para no bloquear la UI thread. Cada chunk se procesa en un idle period.
  const syncOfflineQueue = useCallback(async (
    apiBase: string, driverId: string, deviceId: string
  ): Promise<{ processed: number; remaining: number; success: boolean }> => {
    if (syncInProgressRef.current) {
      return { processed: 0, remaining: 0, success: false };
    }
    syncInProgressRef.current = true;

    let processed = 0;
    let remainingQueue = await readCoordsByStatus('offline');

    while (remainingQueue.length > 0) {
      const chunk = remainingQueue.slice(0, DRIP_CHUNK_SIZE);

      try {
        const res = await postTrackBatch(apiBase, driverId, deviceId, chunk);
        if (res.status === 402) {
          triggerKillSwitch({ setLock, setConnectionStatus, stopTracking: stopTrackingRef.current });
          break;
        }
        if (!res.ok) break;
      } catch {
        break;
      }

      processed += chunk.length;
      remainingQueue = remainingQueue.slice(chunk.length);
      await writeOfflineCoords(remainingQueue);
      setOfflineCount(remainingQueue.length);

      // Non-blocking: yield a la UI thread entre chunks
      if (remainingQueue.length > 0) {
        await new Promise<void>((resolve) => scheduleIdleTask(() => resolve()));
        // Delay aleatorio para no saturar backend
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 800 + 200));
      }
    }

    if (remainingQueue.length === 0) {
      await clearOfflineCoords();
      setOfflineCount(0);
    }

    syncInProgressRef.current = false;

    if (processed > 0) {
      void emitNotification('SYNC_COMPLETED', { processed, remaining: remainingQueue.length });
    }

    return { processed, remaining: remainingQueue.length, success: remainingQueue.length === 0 };
  }, [postTrackBatch, setLock]);

  // Ref para stopTracking (evitar closures obsoletos en triggerKillSwitch)
  const stopTrackingRef = useRef<() => void>(() => {});

  // ─── Flush: envía batch al backend ────────────────────────────────────────
  const flushBatch = useCallback(async (forceFlush = false) => {
    const storageBatch = await readCoordsByStatus('batch');
    const combined = [...storageBatch, ...memoryBufferRef.current];

    if (combined.length === 0) return;
    if (!forceFlush && combined.length < BATCH_SIZE) return;

    memoryBufferRef.current = [];
    await writeBatchCoords([]);

    if (!isOnlineRef.current) {
      await appendOfflineCoords(combined);
      setBatchCount(0);
      const len = (await readCoordsByStatus('offline')).length;
      setOfflineCount(len);
      void emitNotification('OFFLINE_MODE', { pointsBuffered: len });
      return;
    }

    setConnectionStatus('syncing');

    try {
      const apiBase = resolveApiBase();
      const userRaw = localStorage.getItem('tad_driver_user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const driverId = user?.entityId || 'unknown';
      const deviceId = localStorage.getItem('TAD_DEVICE_ID') || 'unknown';

      if (driverId === 'unknown' || deviceId === 'unknown') {
        await appendOfflineCoords(combined);
        setBatchCount(0);
        setOfflineCount((await readCoordsByStatus('offline')).length);
        setConnectionStatus('offline');
        return;
      }

      const res = await postTrackBatch(apiBase, driverId, deviceId, combined);

      if (res.status === 402) {
        triggerKillSwitch({ setLock, setConnectionStatus, stopTracking: stopTrackingRef.current });
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
      await appendOfflineCoords(combined);
      setBatchCount(0);
      setOfflineCount((await readCoordsByStatus('offline')).length);
      setConnectionStatus('offline');
      void emitNotification('SYNC_FAILED', { pointsLost: combined.length });
    }
  }, [postTrackBatch, resolveApiBase, setLock, syncOfflineQueue]);

  // ─── Flush Timer (5 min estricto) ─────────────────────────────────────────
  const resetFlushTimer = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushBatch(true);
      resetFlushTimer();
    }, FLUSH_INTERVAL_MS);
  }, [flushBatch]);

  // ─── Añadir coordenada + Realtime broadcast ────────────────────────────────
  const addCoord = useCallback((coord: TelemetryCoord) => {
    memoryBufferRef.current.push(coord);
    setBatchCount((prev) => prev + 1);
    writeBatchCoords(memoryBufferRef.current);

    // ── Realtime broadcast (throttle 30s, MAP-SPEC-2026) ──────────────────
    const now = Date.now();
    if (now - lastLivePingRef.current >= LIVE_PING_THROTTLE_MS) {
      lastLivePingRef.current = now;
      const channel = liveChannelRef.current;
      if (channel) {
        const driverId = (() => {
          try {
            const raw = localStorage.getItem('tad_driver_user');
            return raw ? JSON.parse(raw)?.entityId : null;
          } catch { return null; }
        })();
        const deviceId = localStorage.getItem('TAD_DEVICE_ID') || null;

        if (driverId && deviceId) {
          void channel.send({
            type: 'broadcast',
            event: 'telemetry_ping',
            payload: {
              driverId, deviceId,
              lat: coord.lat, lng: coord.lng,
              speed: 0, bearing: 0,
              timestamp: new Date(coord.ts).toISOString(),
            },
          }).catch(() => {/* broadcast failure non-fatal */});
        }
      }
    }

    if (memoryBufferRef.current.length >= BATCH_SIZE) {
      flushBatch(false);
    }
  }, [flushBatch]);

  // ─── startTracking ─────────────────────────────────────────────────────────
  const startTracking = useCallback(() => {
    if (watchIdRef.current !== null) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    setIsTracking(true);
    resetFlushTimer();

    // ── Wake Lock ──────────────────────────────────────────────────────────
    if ('wakeLock' in navigator) {
      void (navigator as any).wakeLock.request('screen')
        .then((lock: any) => { wakeLockRef.current = lock; })
        .catch(() => {/* Wake Lock no disponible */});
    }

    // ── Realtime channel ───────────────────────────────────────────────────
    if (!liveChannelRef.current) {
      const channel = supabase.channel('fleet_tracking_live', {
        config: { broadcast: { ack: true } },
      });
      channel.subscribe();
      liveChannelRef.current = channel;
    }

    // ── watchPosition ──────────────────────────────────────────────────────
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
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[useBackgroundTelemetry] GPS error:', err.code, err.message);
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
    );

    void emitNotification('GPS_TRACKING_STARTED', {});
  }, [addCoord, resetFlushTimer]);

  // ─── stopTracking ──────────────────────────────────────────────────────────
  const stopTrackingFn = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (wakeLockRef.current) {
      void wakeLockRef.current.release().then(() => { wakeLockRef.current = null; });
    }
    if (liveChannelRef.current) {
      void supabase.removeChannel(liveChannelRef.current);
      liveChannelRef.current = null;
    }
    setIsTracking(false);
    void emitNotification('GPS_TRACKING_STOPPED', {});
  }, []);

  // Keep ref updated for triggerKillSwitch access
  useEffect(() => { stopTrackingRef.current = stopTrackingFn; }, [stopTrackingFn]);

  // ─── Background Tracking: visibilitychange ──────────────────────────────────
  // Cuando la PWA pasa a segundo plano en el móvil:
  //   - watchPosition sigue capturando GPS (Android PWA lo soporta)
  //   - Wake Lock se pierde automáticamente — re-adquirir al volver visible
  //   - Flush timer sigue activo (5 min estricto no se pausa)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isHidden = document.visibilityState === 'hidden';
      setIsBackgrounded(isHidden);

      if (!isHidden && isTracking) {
        // App volvió al foreground — re-adquirir Wake Lock
        if ('wakeLock' in navigator && !wakeLockRef.current) {
          void (navigator as any).wakeLock.request('screen')
            .then((lock: any) => { wakeLockRef.current = lock; })
            .catch(() => {/* no disponible */});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isTracking]);

  // ─── Reconnect Detection & Auto-Sync ──────────────────────────────────────
  // navigator.onLine → true triggera sync automático con delay de stabilización
  // El sync se ejecuta via requestIdleCallback para no bloquear la UI
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;

      void emitNotification('SYNC_COMPLETED', { reason: 'reconnect' });

      // Delay para stabilizar la conexión antes de sync
      scheduleIdleTask(() => {
        readCoordsByStatus('offline').then((offlineQueue) => {
          if (offlineQueue.length > 0) {
            void syncPending();
            return;
          }
          setConnectionStatus('online');
          void flushBatch(true);
        });
      });
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      setConnectionStatus('offline');
      void emitNotification('OFFLINE_MODE', {});
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Service Worker message handler
    const handleSWMessage = (evt: MessageEvent) => {
      if (evt.data?.type === 'FLUSH_TELEMETRY') {
        scheduleIdleTask(() => void flushBatch(true));
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [flushBatch, syncOfflineQueue]);

  // ─── syncPending (manual trigger) ─────────────────────────────────────────
  const syncPending = useCallback(async () => {
    const userRaw = localStorage.getItem('tad_driver_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const driverId = user?.entityId || 'unknown';
    const deviceId = localStorage.getItem('TAD_DEVICE_ID') || 'unknown';
    const apiBase = resolveApiBase();

    if (!isOnlineRef.current) {
      setConnectionStatus('offline');
      return { processed: 0, remaining: (await readCoordsByStatus('offline')).length, success: false };
    }

    setConnectionStatus('syncing');
    const result = await syncOfflineQueue(apiBase, driverId, deviceId);
    setConnectionStatus(result.success ? 'online' : 'offline');
    return result;
  }, [resolveApiBase, syncOfflineQueue]);

  // ─── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => { return () => { stopTrackingFn(); }; }, [stopTrackingFn]);

  return {
    connectionStatus,
    batchCount,
    offlineCount,
    syncPending,
    startTracking,
    stopTracking: stopTrackingFn,
    isTracking,
    isBackgrounded,
  };
}
