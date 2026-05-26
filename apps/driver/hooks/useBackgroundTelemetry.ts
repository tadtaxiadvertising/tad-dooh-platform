import { useEffect, useRef } from 'react';
import { supabase } from '@tad/services';

export const useBackgroundTelemetry = (driverId: string) => {
  const lastSyncTime = useRef<number>(0);
  const lastLivePingTime = useRef<number>(0);

  useEffect(() => {
    if (!driverId) return;
    if (!('geolocation' in navigator)) return;
    const liveChannel = supabase.channel(`fleet_tracking_live:${driverId}`);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        const isOnline = (localStorage.getItem('TAD_DRIVER_STATUS') || 'ONLINE').toUpperCase() === 'ONLINE';

        if (isOnline && now - lastLivePingTime.current >= 30000) {
          lastLivePingTime.current = now;
          void liveChannel.send({
            type: 'broadcast',
            event: 'telemetry_ping',
            payload: {
              driverId,
              deviceId: localStorage.getItem('TAD_DEVICE_ID') || 'unknown',
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              speed: position.coords.speed || 0,
              bearing: position.coords.heading || 0,
              timestamp: new Date(position.timestamp).toISOString(),
            },
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
      navigator.geolocation.clearWatch(watchId);
      void supabase.removeChannel(liveChannel);
    };
  }, [driverId]);
};
