// apps/driver/hooks/useDriverHub.ts
import { useState, useEffect, useCallback } from 'react';
import api from '@tad/services';

export interface DriverHubData {
  driverId: string;
  driverName: string;
  balance: number;
  projectedEarnings: number;
  activeAds: number;
  activeSlots: number;
  maxSlots: number;
  subscriptionPaid: boolean;
  subscriptionStatus: string;
  deviceId: string | null;
  gpsPoints: number;
  adsPlayed: number;
}

const MAX_DRIVER_SLOTS = 15;

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const normalizeHubData = (raw: any): DriverHubData => {
  const activeAds = toNumber(raw?.activeAds, 0);

  return {
    driverId: String(raw?.driverId || ''),
    driverName: String(raw?.driverName || 'Conductor'),
    balance: toNumber(raw?.balance, 0),
    projectedEarnings: toNumber(raw?.projectedEarnings, 0),
    activeAds,
    activeSlots: Math.max(0, Math.min(MAX_DRIVER_SLOTS, activeAds)),
    maxSlots: MAX_DRIVER_SLOTS,
    subscriptionPaid: Boolean(raw?.subscriptionPaid),
    subscriptionStatus: String(raw?.subscriptionStatus || 'UNKNOWN'),
    deviceId: raw?.deviceId ? String(raw.deviceId) : null,
    gpsPoints: toNumber(raw?.gpsPoints, 0),
    adsPlayed: toNumber(raw?.adsPlayed, 0),
  };
};

export function useDriverHub() {
  const [data, setData] = useState<DriverHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHub = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/drivers/me/hub');
      const normalized = normalizeHubData(res.data);
      setData(normalized);
      localStorage.setItem('TAD_DRIVER_HUB_CACHE', JSON.stringify(normalized));
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al conectar con el servidor');
      
      // Fallback a caché local si estamos offline
      const cached = localStorage.getItem('TAD_DRIVER_HUB_CACHE');
      if (cached) {
        setData(normalizeHubData(JSON.parse(cached)));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial desde caché para evitar flash en blanco
    const cached = localStorage.getItem('TAD_DRIVER_HUB_CACHE');
    if (cached) {
      setData(normalizeHubData(JSON.parse(cached)));
      setLoading(false);
    }
    
    fetchHub();
    // Refrescar cada 5 minutos
    const interval = setInterval(fetchHub, 300_000);
    return () => clearInterval(interval);
  }, [fetchHub]);

  return { data, loading, error, refresh: fetchHub };
}
