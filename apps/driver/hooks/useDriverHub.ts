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
  contractAccepted: boolean;
  agreementVersion: string | null;
  onboardingStatus: string;
  bankAccountConfigured: boolean;
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
    contractAccepted: Boolean(raw?.contractAccepted),
    agreementVersion: raw?.agreementVersion ? String(raw.agreementVersion) : null,
    onboardingStatus: String(raw?.onboardingStatus || 'UNKNOWN'),
    bankAccountConfigured: Boolean(raw?.bankAccountConfigured),
  };
};

const HUB_CACHE_KEY = 'TAD_DRIVER_HUB_CACHE';

const isDnsResolutionError = (error: unknown): boolean => {
  const payload = error as { message?: string; code?: string; response?: { data?: { message?: string } } };
  const text = [payload?.message, payload?.code, payload?.response?.data?.message].filter(Boolean).join(' ').toUpperCase();
  return text.includes('EAI_AGAIN') || text.includes('ENOTFOUND') || text.includes('DNS');
};

export function useDriverHub() {
  const [data, setData] = useState<DriverHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocalMode, setIsLocalMode] = useState(false);

  const fetchHub = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/drivers/me/hub');
      const normalized = normalizeHubData(res.data);
      setData(normalized);
      localStorage.setItem(HUB_CACHE_KEY, JSON.stringify(normalized));
      setError(null);
      setIsLocalMode(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al conectar con el servidor');
      
      // Circuit breaker DNS/offline-first: fallback inmediato al cache local
      const cached = localStorage.getItem(HUB_CACHE_KEY);
      const dnsResolutionError = isDnsResolutionError(err);
      if (cached) {
        setData(normalizeHubData(JSON.parse(cached)));
        setIsLocalMode(true);
      } else {
        setIsLocalMode(dnsResolutionError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial desde caché para evitar flash en blanco
    const cached = localStorage.getItem(HUB_CACHE_KEY);
    if (cached) {
      setData(normalizeHubData(JSON.parse(cached)));
      setLoading(false);
    }
    
    fetchHub();
    // Refrescar cada 5 minutos
    const interval = setInterval(fetchHub, 300_000);
    return () => clearInterval(interval);
  }, [fetchHub]);

  return { data, loading, error, isLocalMode, refresh: fetchHub };
}
