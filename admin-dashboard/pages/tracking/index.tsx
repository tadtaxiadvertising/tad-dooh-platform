import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Navigation, MapPin, Activity, Search, RefreshCw,
  Battery, ChevronDown, ChevronRight, Gauge as Speedometer, Signal,
  AlertTriangle, Smartphone, Tablet, ExternalLink, Clock,
  Filter, Smartphone as Phone, Map as MapIcon, Layers
} from 'lucide-react';
import clsx from 'clsx';
import { getTrackingSummary, getTrackingData, getFleetLocations, getHeatmapData } from '../../services/api';
import { useTabSync } from '../../hooks/useTabSync';
import dynamic from 'next/dynamic';
import { FleetSidebar } from '../../components/ui/FleetSidebar';

const MapView = dynamic(() => import('../../components/MapView'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#0a0a0a] rounded-3xl border border-white/5 flex flex-col items-center justify-center text-zinc-600 gap-6 shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,212,0,0.03),transparent)] animate-pulse" />
      <div className="relative">
         <div className="w-20 h-20 border-r-2 border-tad-yellow rounded-full animate-spin transition-all duration-1000" />
         <Navigation className="absolute inset-0 m-auto w-8 h-8 text-tad-yellow/40 animate-pulse rotate-45" />
      </div>
      <div className="text-center z-10">
         <p className="font-black text-white uppercase tracking-[0.5em] text-[10px] mb-2 animate-pulse">SISTEMA DE RASTREO SATELITAL</p>
         <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Estableciendo Link de Telemetría v4.5...</p>
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

  const selectVehicleOnMap = (v: any) => {
    if (v.lastLat && v.lastLng) {
      setMapCenter([v.lastLat, v.lastLng]);
      setMapZoom(17);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#070707] font-sans selection:bg-tad-yellow selection:text-black overflow-hidden">
      {/* FULLSCREEN MAP BACKGROUND */}
      <div className="absolute inset-0 z-0">
         {!loading && !error && view === 'map' ? (
            <MapView 
              locations={filteredFleet} 
              heatmapData={heatmap} 
              mode={mapMode}
              center={mapCenter}
              zoom={mapZoom}
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

      {/* OVERLAY: TOP NAVIGATION & HUD */}
      <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-start pointer-events-none">
        <div className="flex items-center gap-6 pointer-events-auto">
           <div className="px-6 py-4 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center gap-4 shadow-2xl">
              <div className="w-10 h-10 bg-tad-yellow rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(250,212,0,0.3)]">
                 <MapPin className="w-5 h-5 text-black" />
              </div>
              <div>
                 <p className="text-[9px] font-black text-tad-yellow uppercase tracking-[0.4em] leading-none mb-1">Live Telemetry</p>
                 <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Rastreo <span className="text-tad-yellow">Master</span></h1>
              </div>
           </div>
           
           <div className="flex bg-black/80 backdrop-blur-2xl border border-white/10 p-1.5 rounded-2xl shadow-xl">
              <button 
                onClick={() => setView('map')}
                className={clsx("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2", view === 'map' ? "bg-tad-yellow text-black" : "text-zinc-500 hover:text-white")}
              >
                <Navigation className="w-3.5 h-3.5 rotate-45" /> Mapa
              </button>
              <button 
                onClick={() => setView('summary')}
                className={clsx("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2", view === 'summary' ? "bg-tad-yellow text-black" : "text-zinc-500 hover:text-white")}
              >
                <Activity className="w-3.5 h-3.5" /> Flota
              </button>
              <button 
                onClick={() => setView('log')}
                className={clsx("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2", view === 'log' ? "bg-tad-yellow text-black" : "text-zinc-500 hover:text-white")}
              >
                <Clock className="w-3.5 h-3.5" /> Log
              </button>
           </div>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
           <div className="px-4 py-3 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center gap-4 shadow-xl">
              <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                 <span className="text-[10px] font-bold text-white uppercase tracking-widest">{fleetLocations.filter(v => v.isOnline).length} ONLINE</span>
              </div>
              <button 
                onClick={loadData} 
                disabled={isRefreshing} 
                title="Refrescar Telemetría"
                aria-label="Refrescar Datos de Flota"
                className="bg-white/5 p-1.5 rounded-lg hover:bg-tad-yellow hover:text-black transition-all"
              >
                 <RefreshCw className={clsx("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
              </button>
           </div>
           
           <div className="flex bg-black/80 backdrop-blur-2xl border border-white/10 p-1.5 rounded-2xl">
              <button 
                onClick={() => setMapMode('live')} 
                title="Modo Tiempo Real"
                aria-label="Ver mapa en tiempo real"
                className={clsx("px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-widest", mapMode === 'live' ? "bg-tad-yellow/20 text-tad-yellow" : "text-zinc-600")}
              >
                LIVE
              </button>
              <button 
                onClick={() => setMapMode('heatmap')} 
                title="Modo Mapa de Calor"
                aria-label="Ver mapa de calor"
                className={clsx("px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-widest", mapMode === 'heatmap' ? "bg-rose-500/20 text-rose-500" : "text-zinc-600")}
              >
                HEAT
              </button>
           </div>
        </div>
      </div>

      {/* OVERLAY: FLEET SIDEBAR (POSICIONADO A LA DERECHA) */}
      <div className="absolute top-0 bottom-0 right-0 z-30 pointer-events-none flex items-center">
         <div className={clsx(
           "h-full w-[400px] bg-black/85 backdrop-blur-3xl border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] pointer-events-auto flex relative",
           sidebarOpen ? "translate-x-0" : "translate-x-full"
         )}>
            {/* Toggle Arrow Tab */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="absolute top-1/2 -left-10 -translate-y-1/2 w-10 h-24 bg-black/85 backdrop-blur-2xl border-y border-l border-white/10 rounded-l-2xl flex items-center justify-center text-tad-yellow hover:text-white transition-all group shadow-xl"
            >
               {sidebarOpen ? <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" /> : <ChevronDown className="w-6 h-6 -rotate-90 group-hover:-translate-x-0.5 transition-transform" />}
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
        <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-12">
           <div className="w-full max-w-6xl bg-black/90 border border-white/10 rounded-3xl overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500 flex flex-col max-h-full">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-950/40">
                 <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                    {view === 'summary' ? <Activity className="w-5 h-5 text-tad-yellow" /> : <Clock className="w-5 h-5 text-tad-yellow" />}
                    {view === 'summary' ? 'Reporte de Flota' : 'Log de Telemetría'}
                 </h2>
                 <button 
                   onClick={() => setView('map')} 
                   className="p-2 bg-white/5 hover:bg-rose-500/20 hover:text-rose-500 rounded-xl transition-all"
                   title="Cerrar Reporte"
                   aria-label="Volver al mapa"
                 >
                    <AlertTriangle className="w-5 h-5 rotate-45" />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                 {view === 'summary' ? (
                    <table className="w-full text-left">
                       <thead className="bg-black/50 sticky top-0">
                          <tr className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5">
                             <th className="p-6">Unidad</th>
                             <th className="p-6">Estado</th>
                             <th className="p-6">Batch</th>
                             <th className="p-6">Avg Speed</th>
                             <th className="p-6 text-right">Acción</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {summary.map((driver) => (
                             <tr key={driver.driverId} className="hover:bg-white/[0.02]">
                                <td className="p-6">
                                   <p className="text-sm font-black text-white">{driver.driverName}</p>
                                   <p className="text-[9px] font-bold text-zinc-600 uppercase">Ref: {driver.plate}</p>
                                </td>
                                <td className="p-6">
                                   <div className="flex items-center gap-2">
                                      <div className={clsx("w-1.5 h-1.5 rounded-full", driver.tracking.isActive ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-zinc-700")} />
                                      <span className="text-[10px] font-bold text-white uppercase">{timeAgo(driver.tracking.lastPosition?.timestamp || null)}</span>
                                   </div>
                                </td>
                                <td className="p-6 text-[10px] font-black text-zinc-400">{driver.tracking.pointsToday} Pts</td>
                                <td className="p-6 text-[10px] font-black text-tad-yellow italic">{driver.tracking.avgSpeedToday.toFixed(1)} KM/H</td>
                                <td className="p-6 text-right">
                                   <button 
                                     className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all"
                                     title="Ver detalles de unidad"
                                     aria-label="Ver detalles"
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
                       <thead className="bg-black/50 sticky top-0">
                          <tr className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5">
                             <th className="p-6">Timestamp</th>
                             <th className="p-6">Unidad</th>
                             <th className="p-6">Coordenadas</th>
                             <th className="p-6">Velocidad</th>
                             <th className="p-6 text-right">Maps</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {locations.map((loc, i) => (
                             <tr key={i} className="hover:bg-white/[0.02]">
                                <td className="p-6 text-[10px] font-mono text-zinc-500">{new Date(loc.timestamp).toLocaleTimeString()}</td>
                                <td className="p-6 text-[10px] font-black text-white uppercase">{loc.taxiNumber}</td>
                                <td className="p-6 text-[10px] font-mono text-zinc-600">{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</td>
                                <td className="p-6 text-[10px] font-black text-white">{loc.speed}km/h</td>
                                <td className="p-6 text-right">
                                   <button 
                                     onClick={() => openInMaps(loc.latitude, loc.longitude)} 
                                     className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 hover:text-tad-yellow transition-all"
                                     title="Ver en Google Maps"
                                     aria-label="Abrir mapa externo"
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

      {/* OVERLAY: FOOTER BRANDING */}
      <div className="absolute bottom-6 left-6 z-20 pointer-events-none">
         <div className="px-6 py-3 bg-black/60 backdrop-blur-xl border border-white/5 rounded-2xl flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-tad-yellow shadow-[0_0_10px_#fad400] animate-pulse" />
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">TAD NEXUS CORE V4.5 // Dominican Republic</p>
         </div>
      </div>
    </div>
  );
}

function StatsCard({ icon, label, value, sub, trend, color, delay }: any) {
   // Kept for backward compatibility but using the new theme style
    return (
      <div className="bg-black/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl hover:border-tad-yellow/20 transition-all duration-500 group">
         <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-tad-yellow shadow-inner group-hover:scale-110 group-hover:bg-tad-yellow group-hover:text-black transition-all duration-500">
               {icon}
            </div>
            <div className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-2 py-1 rounded border border-emerald-500/20 uppercase tracking-widest">
               {trend}
            </div>
         </div>
         <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
         <h3 className="text-3xl font-black text-white tracking-tighter mb-1">{value}</h3>
         <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{sub}</p>
      </div>
    );
}
