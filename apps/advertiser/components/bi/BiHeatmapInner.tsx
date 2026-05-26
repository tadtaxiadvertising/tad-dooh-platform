import React, { useEffect, useState } from 'react';
import { getAdvertiserPortalData } from "@tad/services";
import { supabase } from '@tad/services';
import MapView from '../MapView';

interface TelemetryPing {
  driverId: string;
  deviceId: string;
  lat: number;
  lng: number;
  speed: number;
  bearing: number;
  timestamp: string;
}

const OFFLINE_THRESHOLD_MS = 90_000;

const getAdvertiserIdFromStorage = () => {
  const directId = localStorage.getItem('tad_advertiser_id') || localStorage.getItem('entityId');
  if (directId) return directId;

  try {
    const user = JSON.parse(localStorage.getItem('tad_advertiser_user') || 'null');
    return user?.entityId || user?.app_metadata?.entityId || user?.id || '';
  } catch {
    return '';
  }
};

const isFreshTelemetry = (timestamp?: string | null) => {
  if (!timestamp) return false;
  const ts = new Date(timestamp).getTime();
  return Number.isFinite(ts) && Date.now() - ts <= OFFLINE_THRESHOLD_MS;
};

const normalizeTelemetryPing = (payload: any): TelemetryPing | null => {
  if (!payload) return null;
  const driverId = typeof payload.driverId === 'string' ? payload.driverId : '';
  const deviceId = typeof payload.deviceId === 'string' ? payload.deviceId : '';
  const lat = Number(payload.lat);
  const lng = Number(payload.lng);
  const speed = Number(payload.speed ?? 0);
  const bearing = Number(payload.bearing ?? 0);
  const timestamp = typeof payload.timestamp === 'string' ? payload.timestamp : '';

  if (!driverId || !deviceId || !Number.isFinite(lat) || !Number.isFinite(lng) || !timestamp) {
    return null;
  }

  return { driverId, deviceId, lat, lng, speed, bearing, timestamp };
};

const applyFleetFreshness = (vehicles: any[]) =>
  vehicles.map((vehicle) => ({
    ...vehicle,
    isOnline: isFreshTelemetry(vehicle.lastSeen),
    subscriptionStatus: 'ACTIVE',
  }));

const upsertTelemetryPing = (vehicles: any[], ping: TelemetryPing) => {
  const idx = vehicles.findIndex((vehicle) =>
    String(vehicle.driverId || '') === ping.driverId ||
    String(vehicle.deviceId || '') === ping.deviceId
  );

  const patch = {
    driverId: ping.driverId,
    deviceId: ping.deviceId,
    lastLat: ping.lat,
    lastLng: ping.lng,
    speed: ping.speed,
    bearing: ping.bearing,
    lastSeen: ping.timestamp,
    isOnline: true,
    subscriptionStatus: 'ACTIVE',
  };

  if (idx === -1) {
    return [
      ...vehicles,
      {
        ...patch,
        taxiNumber: ping.deviceId,
        driverName: 'Pantalla contratada',
        city: null,
        plate: null,
        status: 'OPERATIVO',
      },
    ];
  }

  const next = vehicles.slice();
  next[idx] = { ...next[idx], ...patch };
  return next;
};

const BiHeatmapInner = () => {
  const [fleetLocations, setFleetLocations] = useState<any[]>([]);
  const [allowedDriverIds, setAllowedDriverIds] = useState<ReadonlySet<string>>(new Set());
  const [allowedDeviceIds, setAllowedDeviceIds] = useState<ReadonlySet<string>>(new Set());
  const [contractedScreensTotal, setContractedScreensTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const advertiserId = getAdvertiserIdFromStorage();
        const portal = advertiserId ? await getAdvertiserPortalData(advertiserId) : null;
        const contractedScreens = portal?.telemetry?.contractedScreens || portal?.contractedScreens || [];
        const driverIds = portal?.telemetry?.driverIds || portal?.driverIds || portal?.activeDriverIds || [];
        const deviceIds = portal?.telemetry?.deviceIds || portal?.deviceIds || [];

        const immutableDriverIds = new Set<string>([
          ...driverIds.map((id: string) => String(id)),
          ...contractedScreens.map((screen: any) => String(screen.driverId || '')).filter(Boolean),
        ]);
        const immutableDeviceIds = new Set<string>([
          ...deviceIds.map((id: string) => String(id)),
          ...contractedScreens.map((screen: any) => String(screen.deviceId || '')).filter(Boolean),
        ]);

        setAllowedDriverIds(immutableDriverIds);
        setAllowedDeviceIds(immutableDeviceIds);
        setContractedScreensTotal(contractedScreens.length);
        setFleetLocations(applyFleetFreshness(contractedScreens));
      } catch (error) {
        console.error('[TAD_REALTIME][ADVERTISER] Error cargando baseline contratado:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (allowedDriverIds.size === 0 && allowedDeviceIds.size === 0) return;
    const channel = supabase
      .channel('fleet_tracking_live', {
        config: { broadcast: { ack: true } },
      })
      .on('broadcast', { event: 'telemetry_ping' }, ({ payload }) => {
        const ping = normalizeTelemetryPing(payload);
        if (!ping) {
          console.warn('[TAD_REALTIME][ADVERTISER] telemetry_ping descartado por payload inválido', payload);
          return;
        }
        if (!allowedDriverIds.has(ping.driverId) && !allowedDeviceIds.has(ping.deviceId)) return;
        setFleetLocations((prev) => upsertTelemetryPing(prev, ping));
      })
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('[TAD_REALTIME][ADVERTISER] Suscripción Broadcast rechazada o cerrada', {
            status,
            error,
            channel: 'fleet_tracking_live',
          });
        }
      });

    const tick = setInterval(() => {
      setFleetLocations((prev) => applyFleetFreshness(prev));
    }, 10_000);

    return () => {
      clearInterval(tick);
      void supabase.removeChannel(channel);
    };
  }, [allowedDriverIds, allowedDeviceIds]);

  const activeContractedScreens = fleetLocations.filter((v) => v.isOnline).length;

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-zinc-800 relative bg-zinc-950">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tad-yellow"></div>
        </div>
      )}
      
      {!loading && (
        <MapView 
          locations={fleetLocations}
          mode="live"
          mapTheme="dark"
        />
      )}

      {/* Overlay controls */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-black/80 border border-zinc-800 px-3 py-1.5 rounded-lg backdrop-blur-md pointer-events-none">
        <p className="text-[9px] font-black tracking-widest text-[#FFD700] uppercase">Red Operativa en Tiempo Real</p>
      </div>
      <div className="absolute top-4 right-4 z-[1000] bg-gradient-to-r from-[#FFD400]/20 to-emerald-500/20 border border-[#FFD400]/40 px-5 py-3 rounded-xl backdrop-blur-md pointer-events-none">
        <p className="text-[10px] font-black tracking-wider text-[#FFD700] uppercase">Pantallas Contratadas</p>
        <p className="text-2xl font-black text-white leading-none mt-1">
          {contractedScreensTotal} <span className="text-zinc-400 text-sm">({activeContractedScreens} activas ahora mismo)</span>
        </p>
      </div>
    </div>
  );
};

export default BiHeatmapInner;
