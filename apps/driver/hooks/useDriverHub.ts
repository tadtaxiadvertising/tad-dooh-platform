// apps/driver/hooks/useDriverHub.ts
import { useState, useEffect, useCallback } from 'react';
import api from '@tad/services';

export interface DriverHubData {
  driverId: string;
  driverName: string;
  balance: number;
  projectedEarnings: number;
  activeAds: number;
  subscriptionPaid: boolean;
  subscriptionStatus: string;
  deviceId: string | null;
  gpsPoints: number;
  adsPlayed: number;
}

export function useDriverHub() {
  const [data, setData] = useState<DriverHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHub = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/drivers/me/hub');
      setData(res.data);
      localStorage.setItem('TAD_DRIVER_HUB_CACHE', JSON.stringify(res.data));
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al conectar con el servidor');
      
      // Fallback a caché local si estamos offline
      const cached = localStorage.getItem('TAD_DRIVER_HUB_CACHE');
      if (cached) {
        setData(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial desde caché para evitar flash en blanco
    const cached = localStorage.getItem('TAD_DRIVER_HUB_CACHE');
    if (cached) {
      setData(JSON.parse(cached));
      setLoading(false);
    }
    
    fetchHub();
    // Refrescar cada 5 minutos
    const interval = setInterval(fetchHub, 300_000);
    return () => clearInterval(interval);
  }, [fetchHub]);

  return { data, loading, error, refresh: fetchHub };
}
