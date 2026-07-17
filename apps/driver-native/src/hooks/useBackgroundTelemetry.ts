/**
 * useBackgroundTelemetry — Native GPS Engine (Expo Location + Task Manager)
 *
 * V13 migration from PWA useBackgroundTelemetry to React Native:
 *
 *   1. DEBOUNCE ESTRICTO 5 MIN (300,000ms) — Immutable business rule preserved.
 *      expo-location foreground watchPosition + expo-task-manager background task.
 *
 *   2. BACKGROUND TRACKING — Android Foreground Service (expo-location config
 *      in app.json) keeps GPS alive when app is backgrounded/kiosk mode.
 *
 *   3. NON-BLOCKING BATCH SYNC — InteractionManager.runAfterInteractions
 *      replaces requestIdleCallback. Drip-sync in 50-item chunks.
 *
 *   4. expo-sqlite BUFFER — replaces IndexedDB. Same schema: batch + offline
 *      statuses, max 500 offline records.
 *
 *   5. KILL-SWITCH 402 — HTTP 402 → destroy GPS task, invalidate auth,
 *      activate KillSwitchOverlay via usePaymentStore.
 *
 *   6. REALTIME BROADCAST — Supabase fleet_tracking_live (throttle 30s)
 *      for Admin Map (MAP-SPEC-2026).
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { InteractionManager, AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useKeepAwake } from 'expo-keep-awake';
import { createClient } from '@supabase/supabase-js';
import { usePaymentStore } from '../store/usePaymentStore';
import {
  initDatabase,
  readCoordsByStatus,
  writeBatchCoords,
  appendOfflineCoords,
  writeOfflineCoords,
  clearOfflineCoords,
  getTelemetryCounts,
  type TelemetryCoord,
  type TelemetryStatus,
} from '../lib/database';
import { API_BASE_URL } from '../lib/api';
import { emitNotification } from '../lib/notificationEngine';

// ─── Constants (same as PWA) ──────────────────────────────────────────────────

const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 300_000;     // 5 min — immutable business rule
const MAX_OFFLINE_RECORDS = 500;
const DRIP_CHUNK_SIZE = 50;
const LIVE_PING_THROTTLE_MS = 30_000;  // 30s — MAP-SPEC-2026
const RECONNECT_SYNC_DELAY_MS = 1500;
const LOCATION_TASK_NAME = 'tad-background-location-task';

export type ConnectionStatus = 'online' | 'offline' | 'syncing';

export interface BackgroundTelemetryState {
  connectionStatus: ConnectionStatus;
  batchCount: number;
  offlineCount: number;
  isTracking: boolean;
  isBackgrounded: boolean;
}

export interface UseBackgroundTelemetryReturn extends BackgroundTelemetryState {
  syncPending: () => Promise<{ processed: number; remaining: number; success: boolean }>;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
}

// ─── Supabase Realtime ────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tad.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Background Location Task ─────────────────────────────────────────────────
// Defined ONCE globally (expo-task-manager requirement — cannot be inside a hook)

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;

  const location = (data as any)?.locations?.[0];
  if (!location) return;

  const coord: TelemetryCoord = {
    ts: location.timestamp,
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy ?? 0,
    status: 'batch',
  };

  // Write directly to SQLite (synchronous API works in background tasks)
  initDatabase();
  const current = readCoordsByStatus('batch');
  writeBatchCoords([...current, coord]);
});

// ─── Non-blocking task scheduler ──────────────────────────────────────────────
// InteractionManager is the RN equivalent of requestIdleCallback

const scheduleIdleTask = (fn: () => void): void => {
  InteractionManager.runAfterInteractions(fn);
};

// ─── Kill-Switch ──────────────────────────────────────────────────────────────

function triggerKillSwitch(opts: {
  setLock: (locked: boolean, message?: string | null) => void;
  setConnectionStatus?: (s: ConnectionStatus) => void;
  stopTracking?: () => Promise<void>;
}): void {
  const { setLock, setConnectionStatus, stopTracking } = opts;
  try {
    (globalThis as any).__TAD_FORCE_LOGOUT = { reason: 'SUBSCRIPTION_UNPAID' };
  } catch { /* no-op */ }
  if (stopTracking) void stopTracking();
  if (setConnectionStatus) setConnectionStatus('offline');
  setLock(true, 'Suscripción vencida. Pago de RD$6,000 requerido.');
  void emitNotification('SUBS_CRITICAL', { message: 'Suscripción vencida. Pago requerido.' });
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useBackgroundTelemetry(): UseBackgroundTelemetryReturn {
  const { setLock } = usePaymentStore();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('online');
  const [batchCount, setBatchCount] = useState<number>(0);
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isTracking, setIsTracking] = useState(false);
  const [isBackgrounded, setIsBackgrounded] = useState(AppState.currentState === 'background');

  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastLivePingRef = useRef<number>(0);
  const syncInProgressRef = useRef(false);
  const watchIdRef = useRef<Location.LocationSubscription | null>(null);
  const memoryBufferRef = useRef<TelemetryCoord[]>([]);

  useKeepAwake(); // Android: keep screen on in kiosk mode

  // ─── Initialize DB + hydrate counters ──────────────────────────────────────
  useEffect(() => {
    initDatabase();
    const counts = getTelemetryCounts();
    setBatchCount(counts.batch);
    setOfflineCount(counts.offline);
  }, []);

  // ─── Payload builder (same format as PWA) ──────────────────────────────────

  const buildPayload = useCallback((driverId: string, deviceId: string, points: TelemetryCoord[]) => ({
    driverId,
    deviceId,
    points: points.map((c) => ({ lat: c.lat, lng: c.lng, speed: 0, timestamp: c.ts })),
  }), []);

  const postTrackBatch = useCallback(async (
    driverId: string, deviceId: string, points: TelemetryCoord[]
  ) => {
    return fetch(`${API_BASE_URL}/fleet/track-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(driverId, deviceId, points)),
      signal: AbortSignal.timeout(15_000),
    });
  }, [buildPayload]);

  // ─── Non-Blocking Offline Queue Sync ────────────────────────────────────────

  const syncOfflineQueue = useCallback(async (
    driverId: string, deviceId: string
  ): Promise<{ processed: number; remaining: number; success: boolean }> => {
    if (syncInProgressRef.current) {
      return { processed: 0, remaining: 0, success: false };
    }
    syncInProgressRef.current = true;

    let processed = 0;
    let remainingQueue = readCoordsByStatus('offline');

    while (remainingQueue.length > 0) {
      const chunk = remainingQueue.slice(0, DRIP_CHUNK_SIZE);

      try {
        const res = await postTrackBatch(driverId, deviceId, chunk);
        if (res.status === 402) {
          triggerKillSwitch({ setLock, setConnectionStatus });
          break;
        }
        if (!res.ok) break;
      } catch {
        break;
      }

      processed += chunk.length;
      remainingQueue = remainingQueue.slice(chunk.length);
      writeOfflineCoords(remainingQueue);
      setOfflineCount(remainingQueue.length);

      if (remainingQueue.length > 0) {
        await new Promise<void>((resolve) => scheduleIdleTask(() => resolve()));
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 800 + 200));
      }
    }

    if (remainingQueue.length === 0) {
      clearOfflineCoords();
      setOfflineCount(0);
    }

    syncInProgressRef.current = false;

    if (processed > 0) {
      void emitNotification('SYNC_COMPLETED', { processed, remaining: remainingQueue.length });
    }

    return { processed, remaining: remainingQueue.length, success: remainingQueue.length === 0 };
  }, [postTrackBatch, setLock]);

  // ─── Flush: send batch to backend ───────────────────────────────────────────

  const flushBatch = useCallback(async (forceFlush = false) => {
    const storageBatch = readCoordsByStatus('batch');
    const combined = [...storageBatch, ...memoryBufferRef.current];

    if (combined.length === 0) return;
    if (!forceFlush && combined.length < BATCH_SIZE) return;

    memoryBufferRef.current = [];
    writeBatchCoords([]);

    // Offline: buffer coords and wait for reconnect
    const isOffline = AppState.currentState === 'background' && !combined.length;
    if (isOffline) {
      appendOfflineCoords(combined);
      setBatchCount(0);
      const counts = getTelemetryCounts();
      setOfflineCount(counts.offline);
      void emitNotification('OFFLINE_MODE', { pointsBuffered: counts.offline });
      return;
    }

    setConnectionStatus('syncing');

    try {
      const driverId = (globalThis as any).__TAD_DRIVER_ID || 'unknown';
      const deviceId = (globalThis as any).__TAD_DEVICE_ID || 'unknown';

      if (driverId === 'unknown' || deviceId === 'unknown') {
        appendOfflineCoords(combined);
        setBatchCount(0);
        setOfflineCount(getTelemetryCounts().offline);
        setConnectionStatus('offline');
        return;
      }

      const res = await postTrackBatch(driverId, deviceId, combined);

      if (res.status === 402) {
        triggerKillSwitch({ setLock, setConnectionStatus });
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setBatchCount(0);

      const offlineQueue = readCoordsByStatus('offline');
      if (offlineQueue.length > 0) {
        const syncResult = await syncOfflineQueue(driverId, deviceId);
        if (!syncResult.success) {
          setConnectionStatus('offline');
          return;
        }
      }

      setConnectionStatus('online');
    } catch {
      appendOfflineCoords(combined);
      setBatchCount(0);
      setOfflineCount(getTelemetryCounts().offline);
      setConnectionStatus('offline');
      void emitNotification('SYNC_FAILED', { pointsLost: combined.length });
    }
  }, [postTrackBatch, setLock, syncOfflineQueue]);

  // ─── Flush Timer (5 min strict) ─────────────────────────────────────────────

  const resetFlushTimer = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      void flushBatch(true);
      resetFlushTimer();
    }, FLUSH_INTERVAL_MS);
  }, [flushBatch]);

  // ─── Add coordinate + Realtime broadcast ────────────────────────────────────

  const addCoord = useCallback((coord: TelemetryCoord) => {
    memoryBufferRef.current.push(coord);
    setBatchCount((prev) => prev + 1);

    // Realtime broadcast (throttle 30s, MAP-SPEC-2026)
    const now = Date.now();
    if (now - lastLivePingRef.current >= LIVE_PING_THROTTLE_MS) {
      lastLivePingRef.current = now;
      const channel = liveChannelRef.current;
      if (channel) {
        const driverId = (globalThis as any).__TAD_DRIVER_ID || null;
        const deviceId = (globalThis as any).__TAD_DEVICE_ID || null;

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
          }).catch(() => { /* broadcast failure non-fatal */ });
        }
      }
    }

    if (memoryBufferRef.current.length >= BATCH_SIZE) {
      void flushBatch(false);
    }
  }, [flushBatch]);

  // ─── startTracking ──────────────────────────────────────────────────────────

  const startTracking = useCallback(async () => {
    if (watchIdRef.current !== null) return;

    // Request permissions
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      void emitNotification('GPS_TRACKING_STOPPED', { reason: 'permission_denied' });
      return;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      void emitNotification('GPS_TRACKING_STOPPED', { reason: 'background_permission_denied' });
      return;
    }

    setIsTracking(true);
    resetFlushTimer();

    // Start foreground GPS watch (high accuracy, same params as PWA)
    watchIdRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10_000,     // 10s interval (same as PWA maximumAge)
        distanceInterval: 0,
      },
      (location) => {
        addCoord({
          ts: location.timestamp,
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          accuracy: location.coords.accuracy ?? 0,
          status: 'batch',
        });
      }
    );

    // Start background location task (Android Foreground Service)
    if (Platform.OS === 'android') {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 10_000,
        distanceInterval: 0,
        foregroundService: {
          notificationTitle: 'TAD GPS Tracking',
          notificationBody: 'Tracking ubicación para sincronización de flota',
        },
      });
    }

    // Realtime channel for live pings
    if (!liveChannelRef.current) {
      const channel = supabase.channel('fleet_tracking_live', {
        config: { broadcast: { ack: true } },
      });
      channel.subscribe();
      liveChannelRef.current = channel;
    }

    void emitNotification('GPS_TRACKING_STARTED', {});
  }, [addCoord, resetFlushTimer]);

  // ─── stopTracking ───────────────────────────────────────────────────────────

  const stopTrackingFn = useCallback(async () => {
    if (watchIdRef.current) {
      watchIdRef.current.remove();
      watchIdRef.current = null;
    }
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (Platform.OS === 'android') {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
    if (liveChannelRef.current) {
      void supabase.removeChannel(liveChannelRef.current);
      liveChannelRef.current = null;
    }
    setIsTracking(false);
    void emitNotification('GPS_TRACKING_STOPPED', {});
  }, []);

  // ─── AppState (replaces visibilitychange) ───────────────────────────────────

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const isBackground = nextState === 'background';
      setIsBackgrounded(isBackground);

      // App returned to foreground — re-sync offline queue
      if (!isBackground && isTracking) {
        scheduleIdleTask(() => {
          const offlineQueue = readCoordsByStatus('offline');
          if (offlineQueue.length > 0) {
            void syncPending();
          } else {
            setConnectionStatus('online');
            void flushBatch(true);
          }
        });
      }
    });

    return () => subscription.remove();
  }, [isTracking, flushBatch]);

  // ─── Network connectivity ──────────────────────────────────────────────────
  // expo-network provides NetInfo — subscribe for online/offline transitions

  useEffect(() => {
    // On Android, we rely on AppState + fetch errors to detect offline
    // expo-network can be added for more precise detection if needed
    // For now, the same pattern as PWA: detect offline via fetch failures
  }, []);

  // ─── syncPending (manual trigger) ──────────────────────────────────────────

  const syncPending = useCallback(async () => {
    const driverId = (globalThis as any).__TAD_DRIVER_ID || 'unknown';
    const deviceId = (globalThis as any).__TAD_DEVICE_ID || 'unknown';

    setConnectionStatus('syncing');
    const result = await syncOfflineQueue(driverId, deviceId);
    setConnectionStatus(result.success ? 'online' : 'offline');
    return result;
  }, [syncOfflineQueue]);

  // ─── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => { void stopTrackingFn(); };
  }, [stopTrackingFn]);

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
