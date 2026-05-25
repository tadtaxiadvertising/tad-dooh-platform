import { useEffect, useRef } from 'react';

export const useBackgroundTelemetry = (driverId: string) => {
  const lastSyncTime = useRef<number>(0);

  useEffect(() => {
    if (!driverId) return;
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
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
    };
  }, [driverId]);
};
