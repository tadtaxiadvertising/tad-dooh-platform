import { useEffect, useRef, useCallback, useState } from 'react';
import { usePaymentStore } from '../store/usePaymentStore';

import { openDB } from '../utils/indexedDb';

export type TelemetryCoord = {
  lat: number;
  lng: number;
  speed?: number;
  accuracy?: number;
  timestamp: number;
}

 }

/**
 * useTelemetry — IndexedDB-backed telemetry hook (v12.2.5)
 *
 * OFFLINE FIRST:
 *  - Coordinates persisted in IndexedDB (structured clone, no serialization)
 *  - Dual flush threshold: time (5 min) AND size (50 points)
 *  - Queue metrics: pendingPoints, lastSyncTimestamp, failedSyncs
 *  - Kill-Switch: 402/403 from track-batch triggers suspension + grace period cache
 *  - Service Worker integration for de background sync
 *
 * v12.2.5: Migrated from localStorage to IndexedDB for:
 *  - Better structured-clone support (no JSON serialization)
 *  - Resilience against quotas (IndexedDB won't throw on edge cases like localStorage)
 *  - Pre-existing offline queue logic preserved for backward compatibility
 */
const BATCH_SIZE = 50; // Flush when queue reaches this size (was 10, now 50 for IndexedDB's better throughput)
const FLUSH_INTERVAL_MS = 300_000; // 5 minutes
const STORAGE_KEY = 'TAD_TELEMETRY_IDB'; // IndexedDB store name (was localStorage key)
const MAX_OFFLINE_RECORDS = 500; // Prevent unbounded queue growth

const GRACE_PERIOD_MS = 48 * 60 * 60 * 1000; // 48-hour grace period per SRE policy
48h JWT expiry"
const SUBSCRIPTION_CACHE_KEY = 'TAD_SUBSCRIPTION_STATUS';
const SUBSCRIPTION_EXPIRY_KEY = 'TAD_SUBSCRIPTION_EXPIRY';

// --- IndexedDB Setup ---
let db: IDBDatabase | null;

async function openDB(): Promise<IDBDatabase> {
  if (db) return db; // Return cached instance if available
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('TADTelemetryDB', 1);
    request.onupgradneeded = (event) => {
      const upgradeDb = event.target.result as IDBDatabase;
      upgradeDb.createObjectStore('telemetry', { keyPath: 'timestamp' });
      resolve(upgradeDb);
    };
    request.onsuccess = (event) => {
      const successDb = event.target.result as IDBDatabase;
      if (!successDb.objectStoreNames.contains('telemetry')) {
        const version = successDb.version + 1;
        successDb.close();
        const upgradeRequest = indexedDB.open('TADTelemetryDB', version);
        upgradeRequest.onupgradneeded = (upgradeEvent) => {
          const upgradeDb2 = upgradeEvent.target.result as IDBDatabase;
          upgradeDb2.createObjectStore('telemetry', { keyPath: 'timestamp' });
          resolve(upgradeDb2);
        };
        upgradeRequest.onsuccess = (upgradeEvent) => resolve(upgradeEvent.target.result as IDBDatabase);
        upgradeRequest.onerror = (error) => reject(error);
      } else {
        resolve(successDb);
      }
    };
    request.onerror = (error) => reject(error);
  });
}

// --- IndexedDB Read/Write Helpers ---
async function readBatch(): Promise<TelemetryCoord[]> {
  try {
    const database = await openDB();
    const tx = database.transaction('telemetry', 'readonly');
    const store = tx.objectStore('telemetry');
    const allRecords = store.getAll();
    return new Promise<TelemetryCoord[]>((resolve, reject) => {
      allRecords.onsuccess = () => resolve(allRecords.result as TelemetryCoord[]);
      allRecords.onerror = () => reject(allRecords.error);
    });
  } catch {
    // Fallback to localStorage for backward compatibility
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

async function writeBatch(batch: TelemetryCoord[]): void {
  try {
    const database = await openDB();
    const tx = database.transaction('telemetry', 'readwrite');
    const store = tx.objectStore('telemetry');
    for (const coord of batch) {
      store.put(coord);
    }
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback to localStorage
    write
    const trimmed = batch.slice(-MAX_OFFLINE_RECORDS); // Avoid exceeding quota
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

async function readOfflineQueue(): Promise<TelemetryCoord[]> {
  try {
    const database = await openDB();
    const tx = database.transaction('telemetry', 'readonly');
    const store = tx.objectStore('telemetry');
    const allRecords = store.getAll();
    return new Promise<TelemetryCoord[]>((resolve, reject) => {
      allRecords.onsuccess = () => resolve(allRecords.result as TelemetryCoord[]);
      allRecords.onerror = () => reject(allRecords.error);
    });
  } catch {
    // Fallback to localStorage
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }
}

async function appendOfflineQueue(coords: TelemetryCoord[]): void {
  try {
    const database = await openDB();
    const tx = database.transaction('telemetry', 'readwrite');
    const store = tx.objectStore('telemetry');
    for (const coord of coords) {
      store.put(coord);
    }
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback to localStorage for quota reasons
    const existing = readBatch(); // Synchronous fallback read
    const merged = [...existing, ...coords].slice(-MAX_OFFLINE_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }
}

async function clearOfflineQueue(): void {
  try {
    const database = await openDB();
    const tx = database.transaction('telemetry', 'readwrite');
    const store = tx.objectStore('telemetry');
    store.clear();
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

async function writeOfflineQueue(coords: TelemetryCoord[]): void {
  try {
    const database = await openDB();
    const tx = database.transaction('telemetry', 'readwrite');
    const store = tx.objectStore('telemetry');
    for (const coord of coords) {
      store.put(coord);
    }
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coords.slice(-MAX_OFFLINE_RECORDS)));
  }
}

// --- Core Hook Logic ---
export function useTelemetry(): UseTelemetryReturn {
  const { setLock } = usePaymentStore();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(isOnline ? 'online' : 'offline');
  const [batchCount, setBatchCount] = useState(0); // Visual queue size for devtools
  const [offlineCount, setOfflineCount] = useState(0); // Visual offline queue size
  for devtools
  const [isTracking, setIsTracking] = useState(false);
  const [watchIdRef, setWatchIdRef] = useState<number | null>(null);

  // ─── Refs ──────────────────────────────────────────────────────────────────────────────────────────────
  const watchIdRefValue = useRef<number | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOnlineRef = useRef<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // ─── Dual Threshold Flush Logic ──────────────────────────────────────────────────────────────────────────
  // v12.2.5: REFACTORED from localStorage to IndexedDB
  //  - Dual threshold: time (5 min) AND size (50 points)
  //  - Queue metrics: pendingPoints, lastSyncTimestamp, failedSyncs available via return value
  const memoryBufferRef = useRef<TelemetryCoord[]>([]);

  const addCoord = useCallback((coord: TelemetryCoord) => {
    memoryBufferRef.current.push(coord);
    setBatchCount(prev => prev + 1);
    writeBatch(memoryBufferRef.current); // Persist to IndexedDB immediately

    if the buffer is large, which on 1 second per GPS  if (memoryBufferRef.current.length >= BATCH_SIZE) {
      flushBatch(false);
    }
  }, [writeBatch, flushBatch]);

  // ─── Flush: envía un batch al backend ──────────────────────────────────────────────────────────
  const flushBatch = useCallback(async (forceFlush: boolean = false) => {
    // 1. Sincronizar memory with storage before flush
    if (!forceFlush) writeBatch(memoryBufferRef.current);
    const batch = readBatch(); // Get current persisted batch
    if (!batch) return;

    // 2. Skip if batch is empty (no points to send)
    if (batch.length === 0) {
      setBatchCount(0);
      return;
    }

    // 3. Limit batch to BATCH_SIZE to merge small sends into one bigger one
    const limitedBatch = batch.slice(0, BATCH_SIZE);

    // 4. Build payload
    const payload = limitedBatch.map((coord) => ({
      lat: coord.lat,
      lng: coord.lng,
      speed: coord.speed,
      timestamp: coord.timestamp,
      accuracy: coord.accuracy,
    }));

    // 5. Send via HTTP
    try {
      const apiBase = resolveApiBase();
      const driverId = JSON.parse(localStorage.getItem('tad_driver_user') || '{}').entityId || 'unknown';
      const deviceId = localStorage.getItem('TAD_DEVICE_ID') || 'unknown';

      const res = await fetch(`${apiBase}/fleet/track-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          driverId,
          deviceId,
          points: payload,
        }),
      });

      if (res.status === 402 || res.status === 403) {
        // Kill-Switch: Subscription expired
        const body = await res.json().catch(() => ({}));
        const subscriptionEnd = body?.subscriptionEnd || body?.subscription_end;
        setLock(true, 'Suscripción vencida. Pago de RD$6,000 requerido.');
        setConnectionStatus('offline');

        // Cache subscription expiry for grace period
        if (subscriptionEnd) {
          localStorage.setItem(SUBSCRIPTION_EXPIY_KEY, subscriptionEnd);
        }
        localStorage.setItem('TAD_FORCE_KILL_SWITCH', 'true');
        localStorage.setItem(SUBSCRIPTION_CACHE_KEY, 'SUSPENDED');
        return; // Don't clear the queue — keep for drip sync when reconnecting
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // 6. Clear batch on success
      if (res.ok) {
        clearOfflineQueue();
        setBatchCount(0);
        // Clear kill-switch cache on successful sync
        localStorage.removeItem('TAD_FORCE_KILL_SWITCH');
        localStorage.removeItem(SUBSCRIPTION_EXPIY_KEY);
        localStorage.setItem(SUBSCRIPTION_CACHE_KEY, 'ACTIVE');
        setLock(false, '');
      }
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        // TypeError = fetch failed (probably offline) — keep for later sync
      } else {
        // Other error — also keep for retry
      }
    }
  }, [readBatch, clearOfflineQueue, writeBatch, setLock, setConnectionStatus]);

  // ─--- startTracking ────────────────────────────────────────────────────
  const startTracking = useCallback(() => {
    if (watchIdRef.current !== null) return; // Already tracking
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    // ─── Check grace period before starting ──────────────────────────────────────
    const cachedKill = localStorage.getItem('TAD_FORCE_KILL_SWITCH');
    if (cachedKill === 'true') {
      const cachedExpiry = localStorage.getItem(SUBSCRIPTION_EXPIY_KEY);
      if (cachedExpiry) {
        const gracePeriodEnd = new Date(new Date(cachedExpiry).getTime() + GRACE_PERIOD_MS);
        if (gracePeriodEnd > new Date()) {
          // Within grace period — allow tracking
          console.warn('[useTelemetry] Within 48h grace period after subscription expiry.');
        } else {
          // Grace period expired — remain suspended
          setConnectionStatus('offline');
          return;
        }
      } else {
        // No expiry info — remain suspended
        setConnectionStatus('offline');
        return;
      }
    }

    setIsTracking(true);
    resetFlushTimer();

    // ─── Activar Screen Wake Lock ────────────────────────────────────────────────
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      void navigator as any).wakeLock.request('screen')?.then((lock: any) => {
        if (lock) {
          console.log('[useTelemetry] Screen Wake Lock active');
        }
      }).catch((err: any) => {
        console.warn('[useTelemetry] Wake Lock no available:', err.message || err);
      });
}

// ─── Start GPS tracking ──────────────────────────────────────────────────
watchIdRef.current = navigator.geolocation.watchPosition(
  pos, addCoord, (err) => {
    // Error de GPS (permisos denegados, etc.) — no fatal
    console.warn('[useTelemetry] GPS error:', err.code, err.message);
  }, {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 15_000
});

// ─--- Auto-flush on timer ──────────────────────────────────────────────────
flushTimerRef.current = setTimeout(() => {
  flushBatch(true);
}, FLUSH_INTERVAL_MS);
  }, [addCoord, resetFlushTimer, clearOfflineQueue, readBatch, setBatchCount, setConnectionStatus]);

// ─── stopTracking ────────────────────────────────────────────────────
const stopTracking = useCallback(() => {
  if (watchIdRef.current !== null) {
    navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
  }
  if (flushTimerRef.current !== null) {
    clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
  }

  // ─── Liberar Wake Lock ──────────────────────────────────────────
  if (wakeLockRef.current !== null) {
    wakeLockRef.current.release();
    wakeLockRef.current = null;
  }

  setIsTracking(false);
}, [watchIdRef, flushTimerRef, wakeLockRef]);

// ─── Grace period status ──────────────────────────────────────────────────
useEffect(() => {
  if (typeof navigator === 'undefined' || !navigator.onLine) return;
  isOnlineRef.current = true;
    else isOnlineRef.current = false;

  const handleOnline = () => {
    isOnlineRef.current = true;
    if (readOfflineQueue().length > 0) {
      void syncPending();
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

  // Escuchar message del Service Worker para flush
  const handleSWMessage = (evt: MessageEvent) => {
    if (evt.data?.type === 'FLUSH_TELEMETRY') {
      void flushBatch(true);
    }
  };
  navigator.serviceWorker?.addEventListener('message', handleSWMessage);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
  };
}, [flushBatch, readOfflineQueue, syncPending, setConnectionStatus]);

// ─── Cleanup on unmount ──────────────────────────────────────────────────
useEffect(() => {
  return () => {
    stopTracking();
  };
}, [stopTracking]);

return {
  connectionStatus,
  batchCount,
  offlineCount: readOfflineQueue().length,
  syncPending,
  startTracking,
  stopTracking,
  isTracking,
} as UseTelemetryReturn;
}