import { useEffect, useRef } from 'react';
import { supabase } from '@tad/services';
import { usePaymentStore } from '../store/usePaymentStore';
import { openDB } from 'idb';

const DB_NAME = 'tad_telemetry_db';
const STORE_NAME = 'gps_buffer';
const POSTGREST_RPC_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/bulk_insert_telemetry`;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * useBackgroundTelemetry — Dual-channel telemetry hook (v12.2.5)
 *
 * Channels:
 *  1. Supabase Realtime (Live Pings): telemetry_ping every 30s
 *  2. HTTP Batch Sync: POST /fleet/track-batch every 5 minutes
 *
 * REVENUE SHIELD v12.2.5:
 *  - HTTP 402/403 responses trigger killSwitch via usePaymentStore.setLock()
 *  - Grace period: 48h continued playback after subscription expiry when offline
 *  - Subscription status cached in localStorage for offline resilience
 *  - FORCE_KILL_SWITCH flag cached for cross-hook propagation
 */
const GRACE_PERIOD_MS = 48 * 60 * 60 * 1000; // 48 hours
const SUBSCRIPTION_CACHE_KEY = 'TAD_SUBSCRIPTION_STATUS';
const SUBSCRIPTION_EXPIRY_KEY = 'TAD_SUBSCRIPTION_EXPIRY';

export const useBackgroundTelemetry = (driverId: string) => {
  const lastSyncTime = useRef<number>(0);
  const lastLivePingTime = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);
  const suspendedRef = useRef<boolean>(false);
  const { setLock } = usePaymentStore();

  useEffect(() => {
    if (!driverId) return;
    if (!('geolocation' in navigator)) return;

    // IDB Setup
    const dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      },
    });

    // Check for cached killSwitch from another hook (e.g. useTelemetry)
    const cachedKill = localStorage.getItem('TAD_FORCE_KILL_SWITCH');
    if (cachedKill === 'true') {
      // Check if we're still within the grace period
      const cachedExpiry = localStorage.getItem(SUBSCRIPTION_EXPIRY_KEY);
      if (cachedExpiry) {
        const expiryDate = new Date(cachedExpiry);
        const gracePeriodEnd = new Date(expiryDate.getTime() + GRACE_PERIOD_MS);
        if (gracePeriodEnd > new Date()) {
          // Within grace period — temporarily re-allow telemetry
          suspendedRef.current = false;
          console.warn('[TAD] Within 48h grace period after subscription expiry. Telemetry continues.');
        } else {
          // Grace period expired — remain suspended
          suspendedRef.current = true;
          return;
        }
      } else {
        suspendedRef.current = true;
        return; // Don't start tracking if already suspended without expiry info
      }
    }

    const liveChannel = supabase.channel('fleet_tracking_live', {
      config: { broadcast: { ack: true } },
    });

    liveChannel.subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.error('[TAD_REALTIME][DRIVER] Broadcast channel rejected or closed', {
          status,
          error,
          channel: 'fleet_tracking_live',
        });
      }
    });

    const handleSuspension = (subscriptionEnd?: string) => {
      // ── REVENUE SHIELD: Kill-Switch enforcement ──
      suspendedRef.current = true;

      // Cache subscription expiry for grace period calculation
      if (subscriptionEnd) {
        localStorage.setItem(SUBSCRIPTION_EXPIRY_KEY, subscriptionEnd);
      }

      // Cache flag in localStorage for cross-hook propagation
      localStorage.setItem('TAD_FORCE_KILL_SWITCH', 'true');
      localStorage.setItem(SUBSCRIPTION_CACHE_KEY, 'SUSPENDED');

      // Activate PaymentLockOverlay
      setLock(true, 'Suscripción vencida. Pago de RD$6,000 requerido.');

      // Stop GPS tracking
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      // Destroy Supabase Realtime channel
      void supabase.removeChannel(liveChannel);
    };

    const clearSuspension = () => {
      suspendedRef.current = false;
      localStorage.removeItem('TAD_FORCE_KILL_SWITCH');
      localStorage.removeItem(SUBSCRIPTION_EXPIRY_KEY);
      localStorage.setItem(SUBSCRIPTION_CACHE_KEY, 'ACTIVE');
      setLock(false, '');
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        // Block all telemetry if suspended
        if (suspendedRef.current) return;

        const now = Date.now();
        const isOnline = (localStorage.getItem('TAD_DRIVER_STATUS') || 'ONLINE').toUpperCase() === 'ONLINE';

        if (isOnline && now - lastLivePingTime.current >= 30000) {
          lastLivePingTime.current = now;
          const ping = {
            driverId,
            deviceId: localStorage.getItem('TAD_DEVICE_ID') || 'unknown',
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            speed: position.coords.speed || 0,
            bearing: position.coords.heading || 0,
            timestamp: new Date(position.timestamp).toISOString(),
          };

          void liveChannel.send({
            type: 'broadcast',
            event: 'telemetry_ping',
            payload: ping,
          }).then((status) => {
            if (status !== 'ok') {
              console.error('[TAD_REALTIME][DRIVER] telemetry_ping was not acknowledged', {
                status,
                channel: 'fleet_tracking_live',
                driverId,
              });
            }
          }).catch((error) => {
            console.error('[TAD_REALTIME][DRIVER] telemetry_ping publish failed', error);
          });
        }

        // 1. Acumular punto en el Buffer Local (IndexedDB)
        const addPoint = async () => {
          const db = await dbPromise;
          await db.add(STORE_NAME, {
            device_id: localStorage.getItem('TAD_DEVICE_ID') || 'unknown',
            driver_id: driverId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: position.coords.speed || 0,
            captured_at: new Date(position.timestamp).toISOString(),
          });
        };
        addPoint().catch(console.error);

        // 5-minute debounce for bulk flush (300,000 ms)
        if (now - lastSyncTime.current < 300000) return;
        
        // No sincronizar si no hay red
        if (!navigator.onLine) return;
        
        lastSyncTime.current = now;

        const flushBatch = async () => {
          const db = await dbPromise;
          const allRecords = await db.getAll(STORE_NAME);
          if (allRecords.length === 0) return;

          try {
            const response = await fetch(POSTGREST_RPC_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': ANON_KEY!,
                'Authorization': `Bearer ${ANON_KEY}`,
              },
              body: JSON.stringify({ telemetry_payload: allRecords }),
            });

            if (response.status === 402 || response.status === 403) {
              // Manejo de Error 402/403 de RLS/Supabase
              response.json().then((body) => {
                const subscriptionEnd = body?.subscriptionEnd || body?.subscription_end;
                handleSuspension(subscriptionEnd);
              }).catch(() => handleSuspension());
              return;
            }

            if (response.ok) {
              const tx = db.transaction(STORE_NAME, 'readwrite');
              await tx.store.clear();
              await tx.done;
              clearSuspension();
            } else {
              console.error('[TELEMETRY_HTTP] Non-OK response:', response.status);
            }
          } catch (err) {
            console.error('Error flushing telemetry batch to PostgREST:', err);
          }
        };
        flushBatch();
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      void supabase.removeChannel(liveChannel);
    };
  }, [driverId, setLock]);
};