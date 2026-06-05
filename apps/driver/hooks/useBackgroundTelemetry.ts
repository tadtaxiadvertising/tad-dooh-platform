import { useEffect, useRef } from 'react';
import { supabase } from '@tad/services';
import { usePaymentStore } from '../store/usePaymentStore';

/**
 * useBackgroundTelemetry — Dual-channel telemetry hook (v12.1.2)
 *
 * Channels:
 *  1. Supabase Realtime (Live Pings): telemetry_ping every 30s
 *  2. HTTP Batch Sync: POST /fleet/track-batch every 5 minutes
 *
 * VULN #3 PATCH (v12.1.2):
 *  - HTTP 402/403 responses now trigger killSwitch via usePaymentStore.setLock()
 *  - Supabase Realtime channel is unsubscribed on suspension
 *  - GPS watchPosition is cleared on suspension
 *  - FORCE_KILL_SWITCH flag cached in localStorage for cross-hook propagation
 */
export const useBackgroundTelemetry = (driverId: string) => {
  const lastSyncTime = useRef<number>(0);
  const lastLivePingTime = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);
  const suspendedRef = useRef<boolean>(false);
  const { setLock } = usePaymentStore();

  useEffect(() => {
    if (!driverId) return;
    if (!('geolocation' in navigator)) return;

    // Check for cached killSwitch from another hook (e.g. useTelemetry)
    const cachedKill = localStorage.getItem('TAD_FORCE_KILL_SWITCH');
    if (cachedKill === 'true') {
      suspendedRef.current = true;
      return; // Don't start tracking if already suspended
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

    const handleSuspension = () => {
      // ── VULN #3 PATCH: Kill-Switch enforcement ──
      suspendedRef.current = true;

      // Cache flag in localStorage for cross-hook propagation
      localStorage.setItem('TAD_FORCE_KILL_SWITCH', 'true');

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

        // 5-minute debounce to prevent battery drain (300,000 ms)
        if (now - lastSyncTime.current < 300000) return;
        lastSyncTime.current = now;

        const payload = [{
          driverId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed || 0,
          timestamp: new Date(position.timestamp).toISOString(),
        }];

        // ── VULN #3 PATCH: Check 402 response from track-batch ──
        fetch('/api/proxy/fleet/track-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            driverId,
            deviceId: localStorage.getItem('TAD_DEVICE_ID') || 'unknown',
            points: payload.map((point) => ({
              lat: point.lat,
              lng: point.lng,
              speed: point.speed,
              timestamp: new Date(point.timestamp).getTime(),
            })),
          }),
        }).then((res) => {
          if (res.status === 402 || res.status === 403) {
            handleSuspension();
            return;
          }
          if (!res.ok) {
            console.error('[TELEMETRY_HTTP] Non-OK response:', res.status);
          }
        }).catch(err => console.error('Telemetry error:', err));
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