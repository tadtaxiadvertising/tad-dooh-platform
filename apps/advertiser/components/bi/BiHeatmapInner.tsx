import React, { useEffect, useState } from 'react';
import { getFleetLocations, getAdvertiserPortalData } from "@tad/services";
import { supabase } from '@tad/services';
import MapView from '../MapView';

const BiHeatmapInner = () => {
  const [fleetLocations, setFleetLocations] = useState<any[]>([]);
  const [allowedDriverIds, setAllowedDriverIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const advertiserId = localStorage.getItem('tad_advertiser_id') || localStorage.getItem('entityId') || '';
        const [locations, portal] = await Promise.all([
          getFleetLocations(),
          advertiserId ? getAdvertiserPortalData(advertiserId) : Promise.resolve(null),
        ]);
        const portalDrivers = new Set<string>((portal?.activeDriverIds || portal?.driverIds || []).map((id: string) => String(id)));
        setAllowedDriverIds(portalDrivers);
        setFleetLocations((locations || []).filter((v: any) => portalDrivers.has(String(v.driverId))));
      } catch (error) {
        console.error('Error fetching fleet locations:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (allowedDriverIds.size === 0) return;
    const channel = supabase
      .channel('fleet_tracking_live')
      .on('broadcast', { event: 'telemetry_ping' }, ({ payload }) => {
        if (!allowedDriverIds.has(String(payload?.driverId))) return;
        setFleetLocations((prev) => prev.map((v) => (
          String(v.driverId) === String(payload.driverId)
            ? { ...v, lastLat: payload.lat, lastLng: payload.lng, speed: payload.speed, lastSeen: payload.timestamp, isOnline: true }
            : v
        )));
      })
      .subscribe();

    const tick = setInterval(() => {
      setFleetLocations((prev) => prev.map((v) => {
        const lastSeenTs = v.lastSeen ? new Date(v.lastSeen).getTime() : 0;
        return { ...v, isOnline: !!lastSeenTs && (Date.now() - lastSeenTs) <= 90_000 };
      }));
    }, 10_000);

    return () => {
      clearInterval(tick);
      void supabase.removeChannel(channel);
    };
  }, [allowedDriverIds]);

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
        <p className="text-[10px] font-black tracking-wider text-[#FFD700] uppercase">Pantallas Contratadas Mostrando su Anuncio</p>
        <p className="text-2xl font-black text-white leading-none mt-1">{activeContractedScreens} <span className="text-emerald-400 text-sm">Activas</span></p>
      </div>
    </div>
  );
};

export default BiHeatmapInner;
