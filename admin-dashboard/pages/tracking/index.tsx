// admin-dashboard/pages/tracking/index.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Navigation, MapPin, Activity, Search, RefreshCw,
  Battery, ChevronDown, ChevronRight, Gauge as Speedometer, Signal,
  AlertTriangle, Smartphone, Tablet, ExternalLink, Clock,
  Filter, Smartphone as Phone, Map as MapIcon, Layers, ChevronUp
} from 'lucide-react';
import clsx from 'clsx';
import { getTrackingSummary, getTrackingData, getFleetLocations, getHeatmapData, getDeviceRecentPath } from '../../services/api';
import { useTabSync } from '../../hooks/useTabSync';
import dynamic from 'next/dynamic';
import { FleetSidebar } from '../../components/ui/FleetSidebar';

const MapView = dynamic(() => import('../../components/MapView'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#070707] flex flex-col items-center justify-center text-zinc-600 gap-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,212,0,0.03),transparent)] animate-pulse" />
      <div className="relative">
         <div className="w-20 h-20 border-r-2 border-tad-yellow rounded-full animate-spin transition-all duration-1000" />
         <Navigation className="absolute inset-0 m-auto w-8 h-8 text-tad-yellow/40 animate-pulse rotate-45" />
      </div>
      <div className="text-center z-10 font-bold uppercase tracking-[0.4em] text-[10px] text-zinc-500 animate-pulse">
         Link de Telemetría v4.5...
      </div>
    </div>
  )
});

// ============================================
// TYPES
// ============================================
interface TrackingDriver {
  driverId: string;
  driverName: string;
  phone: string;
  taxiNumber: string;
  plate: string;
  status: string;
  subscriptionPaid: boolean;
  device: {
    deviceId: string;
    taxiNumber: string;
    city: string;
    batteryLevel: number | null;
    lastSeen: string | null;
  } | null;
  tracking: {
    isActive: boolean;
    pointsToday: number;
    totalPoints: number;
    avgSpeedToday: number;
    lastPosition: {
      lat: number;
      lng: number;
      speed: number;
      timestamp: string;
    } | null;
  };
}

export default function TrackingPage() {
  const [view, setView] = useState<'summary' | 'log' | 'map'>('map');
  const [summary, setSummary] = useState<TrackingDriver[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [fleetLocations, setFleetLocations] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mapMode, setMapMode] = useState<'live' | 'heatmap'>('live');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [fleetFilter, setFleetFilter] = useState<'all' | 'active' | 'offline' | 'unpaid'>( 'all' );
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.4861, -69.9312]);
  const [mapZoom, setMapZoom] = useState(13);

  const loadData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      if (view === 'summary') {
        const data = await getTrackingSummary();
        setSummary(data || []);
      } else if (view === 'log') {
        const data = await getTrackingData();
        setLocations(data || []);
      } else if (view === 'map') {
        const [fleetData, heatData] = await Promise.all([
          getFleetLocations(),
          getHeatmapData()
        ]);
        setFleetLocations(fleetData || []);
        setHeatmap(heatData || []);
      }
      setError(null);
    } catch (err: any) {
      console.error('Error loading tracking data:', err);
      setError('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [view]);

  useTabSync('DEVICES', loadData);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [view, loadData]);

  useEffect(() => {
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const timeAgo = (iso: string | null) => {
    if (!iso) return 'NUNCA';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'ONLINE';
    if (mins < 60) return `HACE ${mins}M`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `HACE ${hours}H`;
    return `HACE ${Math.floor(hours / 24)}D`;
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const filteredFleet = useMemo(() => {
    return fleetLocations.filter(v => {
      const matchSearch = 
        (v.taxiNumber || '').toLowerCase().includes(search.toLowerCase()) || 
        (v.driverName || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.plate || '').toLowerCase().includes(search.toLowerCase());
      
      const matchFilter = 
        fleetFilter === 'all' ? true :
        fleetFilter === 'active' ? v.isOnline :
        fleetFilter === 'offline' ? !v.isOnline :
        fleetFilter === 'unpaid' ? v.subscriptionStatus !== 'ACTIVE' : true;
      
      return matchSearch && matchFilter;
    });
  }, [fleetLocations, search, fleetFilter]);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [recentPath, setRecentPath] = useState<any[]>([]);

  const selectVehicleOnMap = async (v: any) => {
    if (v.lastLat && v.lastLng) {
      setSelectedVehicleId(v.deviceId);
      setMapCenter([v.lastLat, v.lastLng]);
      setMapZoom(18); // Zoom in closer for spotlight
      
      try {
        const path = await getDeviceRecentPath(v.deviceId);
        setRecentPath(path || []);
      } catch (err) {
        console.error("Failed to fetch recent path", err);
        setRecentPath([]);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-[#070707] font-sans selection:bg-tad-yellow selection:text-black overflow-hidden selection:bg-opacity-30">
      {/* FULLSCREEN MAP BACKGROUND */}
      <div className={clsx(
         "absolute inset-0 z-0 transition-all duration-500 ease-in-out",
         headerCollapsed ? "top-0 h-full" : "top-0 h-full"
      )}>
         {!loading && !error && view === 'map' ? (
               <MapView 
                  locations={filteredFleet} 
                  heatmapData={heatmap} 
                  mode={mapMode}
                  center={mapCenter}
                  zoom={mapZoom}
                  selectedId={selectedVehicleId}
                  recentPath={recentPath}
                  onClearSelection={() => {
                    setSelectedVehicleId(null);
                    setRecentPath([]);
                  }}
               />
         ) : loading ? (
            <div className="w-full h-full bg-[#0a0a0a] flex flex-col items-center justify-center text-zinc-600 gap-6">
              <div className="relative">
                 <div className="w-20 h-20 border-r-2 border-tad-yellow rounded-full animate-spin" />
                 <Navigation className="absolute inset-0 m-auto w-8 h-8 text-tad-yellow/40 animate-pulse rotate-45" />
              </div>
              <p className="font-black text-white uppercase tracking-[0.5em] text-[10px] animate-pulse">SISTEMA DE RASTREO SATELITAL</p>
            </div>
         ) : null}
      </div>

      {/* OVERLAY: COLLAPSABLE HEADER DESIGN */}
      <div className={clsx(
         "absolute top-0 left-0 right-0 z-30 transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-transform",
         headerCollapsed ? "-translate-y-full" : "translate-y-0"
      )}>
         <div className="p-1.5 flex justify-center">
            <div className="w-full max-w-[95%] bg-black/80 backdrop-blur-3xl border border-white/5 rounded-3xl p-4 flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
               <div className="flex items-center gap-6">
                  <div className="px-6 py-3 bg-zinc-950 border border-white/5 rounded-2xl flex items-center gap-4 shadow-inner">
                     <div className="w-10 h-10 bg-tad-yellow rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(250,212,0,0.3)] hover:scale-105 transition-transform duration-500">
                        <MapPin className="w-5 h-5 text-black" />
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-tad-yellow uppercase tracking-[0.4em] leading-none mb-1">Live Telemetry</p>
                        <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Rastreo <span className="text-tad-yellow">Master</span></h1>
                     </div>
                  </div>
                  
                  <div className="flex bg-black/40 border border-white/5 p-1 rounded-2xl shadow-xl">
                     <NavButton active={view === 'map'} onClick={() => setView('map')} icon={<Navigation className="w-3.5 h-3.5 rotate-45" />} label="Mapa" />
                     <NavButton active={view === 'summary'} onClick={() => setView('summary')} icon={<Activity className="w-3.5 h-3.5" />} label="Flota" />
                     <NavButton active={view === 'log'} onClick={() => setView('log')} icon={<Clock className="w-3.5 h-3.5" />} label="Log" />
                  </div>
               </div>

               <div className="flex items-center gap-4">
                  <div className="px-5 py-3 bg-zinc-950/50 border border-white/5 rounded-2xl flex items-center gap-5 shadow-xl">
                     <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse" />
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{fleetLocations.filter(v => v.isOnline).length} ACTIVE</span>
                           <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">Fleet Link OK</span>
                        </div>
                     </div>
                     <button 
                        onClick={loadData} 
                        disabled={isRefreshing} 
                        title="Refrescar Datos"
                        className="bg-white/5 p-2 rounded-xl text-zinc-400 hover:bg-tad-yellow hover:text-black transition-all hover:rotate-180 duration-500 active:scale-95"
                     >
                        <RefreshCw className={clsx("w-4 h-4", isRefreshing && "animate-spin")} />
                     </button>
                  </div>
                  
                  <div className="flex bg-black/40 border border-white/5 p-1 rounded-2xl">
                     <ModeButton active={mapMode === 'live'} onClick={() => setMapMode('live')} label="LIVE" color="text-tad-yellow" />
                     <ModeButton active={mapMode === 'heatmap'} onClick={() => setMapMode('heatmap')} label="HEAT" color="text-rose-500" />
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* HEADER COLLAPSE TRIGGER */}
      <div className={clsx(
         "absolute top-0 left-1/2 -translate-x-1/2 z-40 transition-all duration-700",
         headerCollapsed ? "translate-y-2" : "translate-y-[85px]"
      )}>
         <button 
            onClick={() => setHeaderCollapsed(!headerCollapsed)}
            className="w-10 h-6 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-full flex items-center justify-center text-zinc-600 hover:text-tad-yellow hover:bg-black transition-all group shadow-xl active:scale-90"
         >
            {headerCollapsed ? <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" /> : <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />}
         </button>
      </div>

      {/* OVERLAY: FLEET SIDEBAR (RIGHT SIDE) */}
      {/* IMPORTANT: outer wrapper is pointer-events-none so the map stays interactive.
          The inner panel uses pointer-events-auto explicitly. */}
      <div className="absolute top-0 bottom-0 right-0 z-30 flex items-center pointer-events-none">
         <div
           onClick={(e) => e.stopPropagation()}
           className={clsx(
             "h-full w-[400px] bg-black/85 backdrop-blur-3xl border-l border-white/5 shadow-[-30px_0_60px_rgba(0,0,0,0.6)]",
             "transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
             // pointer-events-auto is critical: overrides parent pointer-events-none
             "pointer-events-auto flex relative",
             sidebarOpen ? "translate-x-0" : "translate-x-full"
           )}
         >
            <button
              onClick={(e) => {
                e.stopPropagation(); // prevent bubbling to map's click handler
                setSidebarOpen(!sidebarOpen);
              }}
              className="absolute top-1/2 -left-8 -translate-y-1/2 w-8 h-24 bg-black/85 backdrop-blur-2xl border-y border-l border-white/5 rounded-l-2xl flex items-center justify-center text-tad-yellow/40 hover:text-tad-yellow transition-all group shadow-xl pointer-events-auto"
            >
               {sidebarOpen ? <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /> : <ChevronDown className="w-5 h-5 -rotate-90 group-hover:-translate-x-0.5 transition-transform" />}
            </button>

            <FleetSidebar
              isOpen={true}
              onClose={() => setSidebarOpen(false)}
              vehicles={filteredFleet}
              searchQuery={search}
              onSearchChange={setSearch}
              onSelectVehicle={selectVehicleOnMap}
              filter={fleetFilter}
              onFilterChange={setFleetFilter}
            />
         </div>
      </div>

      {/* OVERLAY: TRADITIONAL VIEWS (MODAL-LIKE OVER MAP) */}
      {(view === 'summary' || view === 'log') && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-12 animate-in fade-in duration-500">
           <div className="w-full max-w-6xl bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-500 flex flex-col max-h-full">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-zinc-950/40">
                 <div className="flex flex-col">
                    <p className="text-[10px] font-black text-tad-yellow uppercase tracking-[0.4em] mb-1">Telemetry Dashboard</p>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                       {view === 'summary' ? <Activity className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                       {view === 'summary' ? 'Reporte de Flota' : 'Log de Telemetría'}
                    </h2>
                 </div>
                 <button 
                   onClick={() => setView('map')} 
                   title="Volver al Mapa"
                   className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-rose-500/20 hover:text-rose-500 rounded-2xl transition-all shadow-xl active:scale-95"
                 >
                    <AlertTriangle className="w-5 h-5 rotate-45" />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/10">
                 {view === 'summary' ? (
                    <table className="w-full text-left">
                       <thead className="bg-black/50 sticky top-0 z-10">
                          <tr className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5">
                             <th className="p-8">Unidad / Conductor</th>
                             <th className="p-8 text-center">Estado</th>
                             <th className="p-8 text-center">Batch Today</th>
                             <th className="p-8 text-center text-tad-yellow">Avg Velocity</th>
                             <th className="p-8 text-right">Gateway</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/[0.03]">
                          {summary.map((driver) => (
                             <tr key={driver.driverId} className="hover:bg-white/[0.01] transition-colors group">
                                <td className="p-8">
                                   <p className="text-[15px] font-black text-white group-hover:text-tad-yellow transition-colors tracking-tight uppercase leading-none mb-1">{driver.driverName}</p>
                                   <div className="flex gap-2">
                                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{driver.plate}</span>
                                      <span className="text-[9px] font-black text-tad-yellow/40 uppercase tracking-widest px-1 bg-tad-yellow/5 rounded border border-tad-yellow/10">{driver.taxiNumber}</span>
                                   </div>
                                </td>
                                <td className="p-8">
                                   <div className="flex items-center justify-center gap-3">
                                      <div className={clsx("w-2 h-2 rounded-full", driver.tracking.isActive ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-zinc-800")} />
                                      <span className="text-[11px] font-black text-white uppercase tracking-tighter">{timeAgo(driver.tracking.lastPosition?.timestamp || null)}</span>
                                   </div>
                                </td>
                                <td className="p-8 text-center text-[11px] font-black text-zinc-400 group-hover:text-white transition-colors">{driver.tracking.pointsToday} Pts</td>
                                <td className="p-8 text-center text-[12px] font-black text-tad-yellow italic">
                                   {driver.tracking.avgSpeedToday.toFixed(1)} <span className="text-[9px] not-italic text-zinc-600">KM/H</span>
                                </td>
                                <td className="p-8 text-right">
                                   <button 
                                     title="Ver Detalles"
                                     className="w-10 h-10 flex items-center justify-center bg-zinc-950 border border-white/5 rounded-xl text-zinc-600 hover:text-tad-yellow hover:border-tad-yellow/40 transition-all shadow-inner"
                                   >
                                     <ExternalLink className="w-4 h-4" />
                                   </button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 ) : (
                    <table className="w-full text-left">
                       <thead className="bg-black/50 sticky top-0 z-10">
                          <tr className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5">
                             <th className="p-8">Timestamp (Link)</th>
                             <th className="p-8 text-center">Device Unit</th>
                             <th className="p-8 text-center">Coordinates</th>
                             <th className="p-8 text-center">Velocity</th>
                             <th className="p-8 text-right">Map View</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/[0.03]">
                          {locations.map((loc, i) => (
                             <tr key={i} className="hover:bg-white/[0.01] transition-colors group">
                                <td className="p-8 text-[11px] font-black text-white/50 group-hover:text-white transition-colors">{new Date(loc.timestamp).toLocaleTimeString('es-DO')}</td>
                                <td className="p-8 text-center text-[11px] font-black text-tad-yellow uppercase tracking-widest">{loc.taxiNumber}</td>
                                <td className="p-8 text-center text-[11px] font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors uppercase tracking-widest">[{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}]</td>
                                <td className="p-8 text-center text-[12px] font-black text-white italic">{loc.speed} <span className="text-[9px] not-italic text-zinc-600">KM/H</span></td>
                                <td className="p-8 text-right">
                                   <button 
                                     onClick={() => openInMaps(loc.latitude, loc.longitude)} 
                                     title="Ver en Maps"
                                     className="w-10 h-10 flex items-center justify-center bg-zinc-950 border border-white/5 rounded-xl text-zinc-600 hover:text-tad-yellow hover:border-tad-yellow/40 transition-all shadow-inner"
                                   >
                                     <MapIcon className="w-4 h-4" />
                                   </button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* OVERLAY: FOOTER BRANDING (HUD) */}
      <div className={clsx(
         "absolute bottom-6 left-6 z-20 transition-all duration-700 pointer-events-none",
         headerCollapsed ? "scale-105" : "scale-100"
      )}>
         <div className="px-6 py-4 bg-black/50 backdrop-blur-2xl border border-white/5 rounded-2xl flex items-center gap-4 shadow-2xl">
            <div className="w-2.5 h-2.5 rounded-full bg-tad-yellow shadow-[0_0_15px_#fad400] animate-pulse" />
            <div className="flex flex-col">
               <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] leading-none mb-1">TAD NEXUS CORE V4.5</p>
               <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest leading-none">Global Network Active // Dominican Republic</p>
            </div>
         </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(250,212,0,0.2); }
      `}</style>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: any) {
   return (
      <button 
         onClick={onClick}
         className={clsx(
            "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95 group",
            active ? "bg-tad-yellow text-black shadow-[0_10px_20px_rgba(250,212,0,0.1)]" : "text-zinc-500 hover:text-white hover:bg-white/5"
         )}
      >
         <span className={clsx("transition-transform group-hover:scale-110", active ? "opacity-100" : "opacity-40 group-hover:text-tad-yellow group-hover:opacity-100")}>{icon}</span>
         {label}
      </button>
   );
}

function ModeButton({ active, onClick, label, color }: any) {
   return (
      <button 
         onClick={onClick}
         className={clsx(
            "px-5 py-3 rounded-2xl text-[10px] font-black tracking-[0.2em] transition-all flex items-center gap-2 active:scale-95 group",
            active ? `bg-white/5 ${color} shadow-inner border border-white/5` : "text-zinc-600 hover:text-white"
         )}
      >
         <div className={clsx("w-1.5 h-1.5 rounded-full", active ? (color === "text-tad-yellow" ? "bg-tad-yellow" : "bg-rose-500") : "bg-zinc-800")} />
         {label}
      </button>
   );
}
