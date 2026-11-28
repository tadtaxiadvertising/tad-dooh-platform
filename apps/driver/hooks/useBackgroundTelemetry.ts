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
 *   4. IndexedDB BUFFER — coordenadas persistidas en TADTelemetryDB.
 *      No descartar datos pendientes para imponer un límite de registros.
 *
 *   5. KILL-SWITCH 402 — HTTP 402 del backend → destruye worker GPS,
 *      invalida JWT local, dispara TAD_FORCE_LOGOUT, activa PaymentLockOverlay.
 *
 *   6. REALTIME BROADCAST — ping efímero a fleet_tracking_live (throttle 30s)
 *      para Admin Map (MAP-SPEC-2026), sin alterar debounce de 5 min.
 *
 * Sin dependencias de UI externas. 100% compatible con PWA Pages Router.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@tad/services";
import { usePaymentStore } from "../store/usePaymentStore";
import { openDB } from "../utils/indexedDb";
import { emitNotification } from "../lib/notificationEngine";
import { isCompleteGpsBatchReceipt } from "../lib/gps-batch-receipt";

// ─── Constantes ──────────────────────────────────────────────────────────────
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 300_000; // 5 minutos — debounce estricto (regla de negocio)
const DRIP_CHUNK_SIZE = 50; // Tamaño de chunk para drip-sync offline
const GPS_UPLOAD_MAX_BATCH_SIZE = 500; // Compatible con el límite del API
const LIVE_PING_THROTTLE_MS = 30_000; // 30s — MAP-SPEC-2026
const SYNC_IDLE_DELAY_MS = 200; // requestIdleCallback fallback delay
// Delay post-reconnect para stabilizar red

export type ConnectionStatus = "online" | "offline" | "syncing";

export interface TelemetryCoord {
  lat: number;
  lng: number;
  ts: number;
  accuracy?: number;
}

interface StoredTelemetryCoord extends TelemetryCoord {
  status: "batch" | "offline";
}

export interface BackgroundTelemetryState {
  connectionStatus: ConnectionStatus;
  batchCount: number;
  offlineCount: number;
  isTracking: boolean;
  isBackgrounded: boolean;
}

export interface UseBackgroundTelemetryReturn extends BackgroundTelemetryState {
  syncPending: () => Promise<{
    processed: number;
    remaining: number;
    success: boolean;
  }>;
  startTracking: () => void;
  stopTracking: () => void;
}

// ─── requestIdleCallback polyfill ────────────────────────────────────────────
const scheduleIdleTask =
  typeof requestIdleCallback !== "undefined"
    ? (fn: () => void) => requestIdleCallback(fn, { timeout: 3000 })
    : (fn: () => void) => setTimeout(fn, SYNC_IDLE_DELAY_MS);

// ─── Helpers IndexedDB ────────────────────────────────────────────────────────

async function readCoordsByStatus(
  status: "batch" | "offline",
): Promise<TelemetryCoord[]> {
  try {
    const db = await openDB();
    const tx = db.transaction("telemetry", "readonly");
    const store = tx.objectStore("telemetry");
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const all: StoredTelemetryCoord[] = request.result || [];
        resolve(all.filter((x) => x.status === status));
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function writeBatchCoords(batch: TelemetryCoord[]): Promise<void> {
  if (!batch.length) return;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("telemetry", "readwrite");
    const store = tx.objectStore("telemetry");
    // Never delete unrelated newly captured or unsent batch points.
    batch.forEach((coord) => store.put({ ...coord, status: "batch" }));
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("GPS_BATCH_WRITE_FAILED"));
    tx.onerror = () => reject(tx.error ?? new Error("GPS_BATCH_WRITE_FAILED"));
  });
}

/** Move a batch into durable offline storage without evicting unsent history. */
async function appendOfflineCoords(coords: TelemetryCoord[]): Promise<void> {
  if (!coords.length) return;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("telemetry", "readwrite");
    const store = tx.objectStore("telemetry");
    coords.forEach((coord) => store.put({ ...coord, status: "offline" }));
    tx.oncomplete = () => resolve();
    tx.onabort = () =>
      reject(tx.error ?? new Error("GPS_OFFLINE_WRITE_FAILED"));
    tx.onerror = () =>
      reject(tx.error ?? new Error("GPS_OFFLINE_WRITE_FAILED"));
  });
}

/** Remove only fully acknowledged points with the expected queue status. */
async function removeCoordsByKeys(
  keys: number[],
  status: "batch" | "offline",
): Promise<void> {
  if (!keys.length) return;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("telemetry", "readwrite");
    const store = tx.objectStore("telemetry");
    keys.forEach((key) => {
      const read = store.get(key);
      read.onsuccess = () => {
        if (
          (read.result as StoredTelemetryCoord | undefined)?.status === status
        ) {
          store.delete(key);
        }
      };
    });
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("GPS_ACK_DELETE_FAILED"));
    tx.onerror = () => reject(tx.error ?? new Error("GPS_ACK_DELETE_FAILED"));
  });
}

// ─── Kill-Switch ──────────────────────────────────────────────────────────────

function triggerKillSwitch(opts: {
  setLock: (locked: boolean, message?: string | null) => void;
  setConnectionStatus?: (s: ConnectionStatus) => void;
  stopTracking?: () => void;
}): void {
  const { setLock, setConnectionStatus, stopTracking } = opts;
  try {
    localStorage.removeItem("tad_driver_user");
    localStorage.removeItem("TAD_DRIVER_JWT");
    window.dispatchEvent(
      new CustomEvent("TAD_FORCE_LOGOUT", {
        detail: { reason: "SUBSCRIPTION_UNPAID" },
      }),
    );
  } catch {
    /* localStorage bloqueado */
  }
  if (stopTracking) stopTracking();
  if (setConnectionStatus) setConnectionStatus("offline");
  setLock(true, "Suscripción vencida. Pago de RD$6,000 requerido.");
  void emitNotification("SUBS_CRITICAL", {
    message: "Suscripción vencida. Pago requerido.",
  });
}

// ─── Hook Principal ───────────────────────────────────────────────────────────

export function useBackgroundTelemetry(): UseBackgroundTelemetryReturn {
  const { setLock } = usePaymentStore();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    typeof navigator !== "undefined" && !navigator.onLine
      ? "offline"
      : "online",
  );
  const [batchCount, setBatchCount] = useState<number>(0);
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isTracking, setIsTracking] = useState(false);
  const [isBackgrounded, setIsBackgrounded] = useState(
    typeof document !== "undefined" && document.visibilityState === "hidden",
  );

  const watchIdRef = useRef<number | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOnlineRef = useRef(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const memoryBufferRef = useRef<TelemetryCoord[]>([]);
  const liveChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );
  const lastLivePingRef = useRef<number>(0);
  const syncInProgressRef = useRef(false);
  const batchFlushInProgressRef = useRef(false);

  const resolveApiBase = useCallback(() => "/api/proxy", []);

  // ─── Hidratar contadores iniciales ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const batch = await readCoordsByStatus("batch");
      const offline = await readCoordsByStatus("offline");
      setBatchCount(batch.length);
      setOfflineCount(offline.length);
    })();
  }, []);

  // ─── Payload builder ──────────────────────────────────────────────────────
  const buildPayload = useCallback(
    (driverId: string, deviceId: string, points: TelemetryCoord[]) => ({
      driverId,
      deviceId,
      points: points.map((c) => ({
        lat: c.lat,
        lng: c.lng,
        speed: 0,
        timestamp: c.ts,
      })),
    }),
    [],
  );

  const postTrackBatch = useCallback(
    async (
      apiBase: string,
      driverId: string,
      deviceId: string,
      points: TelemetryCoord[],
    ) => {
      return fetch(`${apiBase}/fleet/track-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildPayload(driverId, deviceId, points)),
        signal: AbortSignal.timeout(15_000),
      });
    },
    [buildPayload],
  );

  // ─── Non-Blocking Offline Queue Sync ──────────────────────────────────────
  // Procesa la cola offline por DRIP_CHUNK_SIZE chunks usando requestIdleCallback
  // para no bloquear la UI thread. Cada chunk se procesa en un idle period.
  const syncOfflineQueue = useCallback(
    async (
      apiBase: string,
      driverId: string,
      deviceId: string,
    ): Promise<{ processed: number; remaining: number; success: boolean }> => {
      if (syncInProgressRef.current) {
        return { processed: 0, remaining: 0, success: false };
      }
      syncInProgressRef.current = true;

      let processed = 0;
      let remainingQueue: TelemetryCoord[] = [];
      try {
        remainingQueue = await readCoordsByStatus("offline");
        while (remainingQueue.length > 0) {
          const chunk = remainingQueue.slice(0, DRIP_CHUNK_SIZE);
          const processedKeys = chunk.map((c) => c.ts);

          try {
            const res = await postTrackBatch(
              apiBase,
              driverId,
              deviceId,
              chunk,
            );
            if (res.status === 402) {
              triggerKillSwitch({
                setLock,
                setConnectionStatus,
                stopTracking: stopTrackingRef.current,
              });
              break; // Keep every unacknowledged point on disk.
            }
            if (!(await isCompleteGpsBatchReceipt(res, chunk.length))) {
              break;
            }
            // A valid receipt is not enough until IndexedDB commits the ACK.
            await removeCoordsByKeys(processedKeys, "offline");
          } catch {
            break; // Retry all outstanding points after connectivity returns.
          }

          processed += chunk.length;
          // Include points queued concurrently, never clear the whole store.
          remainingQueue = await readCoordsByStatus("offline");
          setOfflineCount(remainingQueue.length);

          if (remainingQueue.length > 0) {
            await new Promise<void>((resolve) =>
              scheduleIdleTask(() => resolve()),
            );
            await new Promise((resolve) =>
              setTimeout(resolve, Math.random() * 800 + 200),
            );
          }
        }

        if (processed > 0) {
          void emitNotification("SYNC_COMPLETED", {
            processed,
            remaining: remainingQueue.length,
          });
        }

        return {
          processed,
          remaining: remainingQueue.length,
          success: remainingQueue.length === 0,
        };
      } finally {
        syncInProgressRef.current = false;
      }
    },
    [postTrackBatch, setLock],
  );

  // Ref para stopTracking (evitar closures obsoletos en triggerKillSwitch)
  const stopTrackingRef = useRef<() => void>(() => {});

  // ─── Flush: envía batch al backend ────────────────────────────────────────
  const flushBatch = useCallback(
    async (forceFlush = false) => {
      if (batchFlushInProgressRef.current) return;
      batchFlushInProgressRef.current = true;
      try {
        const storageBatch = await readCoordsByStatus("batch");
        const combined = Array.from(
          new Map(
            [...storageBatch, ...memoryBufferRef.current].map((coord) => [
              coord.ts,
              coord,
            ]),
          ).values(),
        ).slice(0, GPS_UPLOAD_MAX_BATCH_SIZE);
        const processedKeys = combined.map((coord) => coord.ts);
        const keys = new Set(processedKeys);
        const dropAcknowledgedMemory = () => {
          memoryBufferRef.current = memoryBufferRef.current.filter(
            (coord) => !keys.has(coord.ts),
          );
          setBatchCount(memoryBufferRef.current.length);
        };

        if (combined.length === 0) return;
        if (!forceFlush && combined.length < BATCH_SIZE) return;

        // Keep IndexedDB and memory intact while HTTP is in flight.
        if (!isOnlineRef.current) {
          await appendOfflineCoords(combined);
          dropAcknowledgedMemory();
          const len = (await readCoordsByStatus("offline")).length;
          setOfflineCount(len);
          void emitNotification("OFFLINE_MODE", { pointsBuffered: len });
          return;
        }

        setConnectionStatus("syncing");

        try {
          const apiBase = resolveApiBase();
          const userRaw = localStorage.getItem("tad_driver_user");
          let user = null;
          // A2: JSON.parse seguro — si localStorage corrupto, no romper el sync loop.
          if (userRaw) {
            try {
              user = JSON.parse(userRaw);
            } catch {
              user = null;
            }
          }
          const driverId = user?.entityId || "unknown";
          const deviceId = localStorage.getItem("TAD_DEVICE_ID") || "unknown";

          if (driverId === "unknown" || deviceId === "unknown") {
            await appendOfflineCoords(combined);
            dropAcknowledgedMemory();
            setOfflineCount((await readCoordsByStatus("offline")).length);
            setConnectionStatus("offline");
            return;
          }

          const res = await postTrackBatch(
            apiBase,
            driverId,
            deviceId,
            combined,
          );

          if (res.status === 402) {
            triggerKillSwitch({
              setLock,
              setConnectionStatus,
              stopTracking: stopTrackingRef.current,
            });
            // Preserve pending GPS during a subscription suspension.
            await appendOfflineCoords(combined);
            dropAcknowledgedMemory();
            return;
          }

          if (!(await isCompleteGpsBatchReceipt(res, combined.length))) {
            throw new Error("GPS_BATCH_ACK_INCOMPLETE");
          }
          // Commit local deletion only after server confirms full processing.
          await removeCoordsByKeys(processedKeys, "batch");
          dropAcknowledgedMemory();

          const offlineQueue = await readCoordsByStatus("offline");
          if (offlineQueue.length > 0) {
            const syncResult = await syncOfflineQueue(
              apiBase,
              driverId,
              deviceId,
            );
            if (!syncResult.success) {
              setConnectionStatus("offline");
              return;
            }
          }

          setConnectionStatus("online");
        } catch {
          await appendOfflineCoords(combined);
          dropAcknowledgedMemory();
          setOfflineCount((await readCoordsByStatus("offline")).length);
          setConnectionStatus("offline");
          void emitNotification("SYNC_FAILED", {
            pointsBuffered: combined.length,
          });
        }
      } catch {
        // A failed disk write leaves the original batch and RAM snapshot intact.
        setConnectionStatus("offline");
      } finally {
        batchFlushInProgressRef.current = false;
      }
    },
    [postTrackBatch, resolveApiBase, setLock, syncOfflineQueue],
  );

  // ─── Flush Timer (5 min estricto) ─────────────────────────────────────────
  const resetFlushTimer = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushBatch(true);
      resetFlushTimer();
    }, FLUSH_INTERVAL_MS);
  }, [flushBatch]);

  // ─── Añadir coordenada + Realtime broadcast ────────────────────────────────
  const addCoord = useCallback(
    (coord: TelemetryCoord) => {
      memoryBufferRef.current.push(coord);
      setBatchCount((prev) => prev + 1);
      void writeBatchCoords([coord]).catch(() => {
        setConnectionStatus("offline");
      });

      // ── Realtime broadcast (throttle 30s, MAP-SPEC-2026) ──────────────────
      const now = Date.now();
      if (now - lastLivePingRef.current >= LIVE_PING_THROTTLE_MS) {
        lastLivePingRef.current = now;
        const channel = liveChannelRef.current;
        if (channel) {
          const driverId = (() => {
            try {
              const raw = localStorage.getItem("tad_driver_user");
              return raw ? JSON.parse(raw)?.entityId : null;
            } catch {
              return null;
            }
          })();
          const deviceId = localStorage.getItem("TAD_DEVICE_ID") || null;

          if (driverId && deviceId) {
            void channel
              .send({
                type: "broadcast",
                event: "telemetry_ping",
                payload: {
                  driverId,
                  deviceId,
                  lat: coord.lat,
                  lng: coord.lng,
                  speed: 0,
                  bearing: 0,
                  timestamp: new Date(coord.ts).toISOString(),
                },
              })
              .catch(() => {
                /* broadcast failure non-fatal */
              });
          }
        }
      }

      if (memoryBufferRef.current.length >= BATCH_SIZE) {
        flushBatch(false);
      }
    },
    [flushBatch],
  );

  // ─── startTracking ─────────────────────────────────────────────────────────
  const startTracking = useCallback(() => {
    if (watchIdRef.current !== null) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    setIsTracking(true);
    resetFlushTimer();

    // ── Wake Lock ──────────────────────────────────────────────────────────
    if ("wakeLock" in navigator) {
      void navigator.wakeLock
        .request("screen")
        .then((lock) => {
          wakeLockRef.current = lock;
        })
        .catch(() => {
          /* Wake Lock no disponible */
        });
    }

    // ── Realtime channel ───────────────────────────────────────────────────
    if (!liveChannelRef.current) {
      const channel = supabase.channel("fleet_tracking_live", {
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
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[useBackgroundTelemetry] GPS error:",
            err.code,
            err.message,
          );
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );

    void emitNotification("GPS_TRACKING_STARTED", {});
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
      void wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      });
    }
    if (liveChannelRef.current) {
      void supabase.removeChannel(liveChannelRef.current);
      liveChannelRef.current = null;
    }
    setIsTracking(false);
    void emitNotification("GPS_TRACKING_STOPPED", {});
  }, []);

  // Keep ref updated for triggerKillSwitch access
  useEffect(() => {
    stopTrackingRef.current = stopTrackingFn;
  }, [stopTrackingFn]);

  // ─── Background Tracking: visibilitychange ──────────────────────────────────
  // Cuando la PWA pasa a segundo plano en el móvil:
  //   - watchPosition sigue capturando GPS (Android PWA lo soporta)
  //   - Wake Lock se pierde automáticamente — re-adquirir al volver visible
  //   - Flush timer sigue activo (5 min estricto no se pausa)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isHidden = document.visibilityState === "hidden";
      setIsBackgrounded(isHidden);

      if (!isHidden && isTracking) {
        // App volvió al foreground — re-adquirir Wake Lock
        if ("wakeLock" in navigator && !wakeLockRef.current) {
          void navigator.wakeLock
            .request("screen")
            .then((lock) => {
              wakeLockRef.current = lock;
            })
            .catch(() => {
              /* no disponible */
            });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isTracking]);

  // ─── Reconnect Detection & Auto-Sync ──────────────────────────────────────
  // navigator.onLine → true triggera sync automático con delay de stabilización
  // El sync se ejecuta via requestIdleCallback para no bloquear la UI
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;

      void emitNotification("SYNC_COMPLETED", { reason: "reconnect" });

      // Delay para stabilizar la conexión antes de sync
      scheduleIdleTask(() => {
        readCoordsByStatus("offline").then((offlineQueue) => {
          if (offlineQueue.length > 0) {
            void syncPending();
            return;
          }
          setConnectionStatus("online");
          void flushBatch(true);
        });
      });
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      setConnectionStatus("offline");
      void emitNotification("OFFLINE_MODE", {});
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Service Worker message handler
    const handleSWMessage = (evt: MessageEvent) => {
      if (evt.data?.type === "FLUSH_TELEMETRY") {
        scheduleIdleTask(() => void flushBatch(true));
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
    };
  }, [flushBatch, syncOfflineQueue]);

  // ─── syncPending (manual trigger) ─────────────────────────────────────────
  const syncPending = useCallback(async () => {
    const userRaw = localStorage.getItem("tad_driver_user");
    let user = null;
    // A2: JSON.parse seguro — si localStorage corrupto, no romper el sync manual.
    if (userRaw) {
      try {
        user = JSON.parse(userRaw);
      } catch {
        user = null;
      }
    }
    const driverId = user?.entityId || "unknown";
    const deviceId = localStorage.getItem("TAD_DEVICE_ID") || "unknown";
    const apiBase = resolveApiBase();

    if (!isOnlineRef.current) {
      setConnectionStatus("offline");
      return {
        processed: 0,
        remaining: (await readCoordsByStatus("offline")).length,
        success: false,
      };
    }

    setConnectionStatus("syncing");
    const result = await syncOfflineQueue(apiBase, driverId, deviceId);
    setConnectionStatus(result.success ? "online" : "offline");
    return result;
  }, [resolveApiBase, syncOfflineQueue]);

  // ─── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopTrackingFn();
    };
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
