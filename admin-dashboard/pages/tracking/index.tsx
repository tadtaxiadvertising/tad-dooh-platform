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
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
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
      setLastRefresh(new Date());
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

  // Real-time update logic (Simulating Supabase Realtime via 30s poll)
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

  // Filter Logic for Fleet
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
    <div className="min-h-screen pb-12 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans mx-auto max-w-[1700px] px-2 sm:px-6 lg:px-8">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-tad-yellow/[0.03] blur-[150px] rounded-full" />
         <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-white/[0.01] blur-[120px] rounded-full" />
      </div>

      {/* Header Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 mt-4 px-2">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 bg-tad-yellow/10 border border-tad-yellow/20 rounded-2xl flex items-center justify-center shadow-[0_10px_40px_rgba(250,212,0,0.1)]">
              <MapPin className="w-7 h-7 text-tad-yellow animate-pulse" />
           </div>
           <div>
              <p className="text-[10px] font-black text-tad-yellow uppercase tracking-[0.4em] mb-1">Intelligence Module</p>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Rastreo <span className="text-tad-yellow">GPS Master</span></h1>
           </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
           <button
             onClick={() => setView('summary')}
             className={clsx(
               "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-3",
               view === 'summary' ? "bg-tad-yellow border-tad-yellow text-black" : "bg-black/40 border-white/5 text-zinc-500 hover:text-white"
             )}
           >
             <Activity className="w-4 h-4" /> Resumen
           </button>
           <button
             onClick={() => setView('log')}
             className={clsx(
               "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-3",
               view === 'log' ? "bg-tad-yellow border-tad-yellow text-black" : "bg-black/40 border-white/5 text-zinc-500 hover:text-white"
             )}
           >
             <Clock className="w-4 h-4" /> Historial Lote
           </button>
           <button
             onClick={() => setView('map')}
             className={clsx(
               "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-3",
               view === 'map' ? "bg-tad-yellow border-tad-yellow text-black shadow-[0_10px_20px_rgba(250,212,0,0.15)]" : "bg-black/40 border-white/5 text-zinc-500 hover:text-white"
             )}
           >
             <Navigation className={clsx("w-4 h-4", view === 'map' && "rotate-45")} /> Master View
           </button>
           <div className="w-px h-6 bg-white/10 mx-2 hidden sm:block" />
           <button 
             onClick={loadData}
             disabled={isRefreshing}
             title="Refrescar Telemetría"
             aria-label="Refrescar Datos de Flota"
             className="p-3 bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-tad-yellow transition-all outline-none focus:ring-2 focus:ring-tad-yellow/30"
           >
             <RefreshCw className={clsx("w-4 h-4", isRefreshing && "animate-spin text-tad-yellow")} />
           </button>
        </div>
      </div>

      {/* VIEWS */}
      {!loading && !error && (
        <>
          {view === 'map' ? (
            <div className="h-[800px] relative rounded-3xl overflow-hidden border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-700 bg-[#070707]">
              <MapView 
                locations={filteredFleet} 
                heatmapData={heatmap} 
                mode={mapMode}
                center={mapCenter}
                zoom={mapZoom}
              />
              
              {/* FLEET SIDEBAR (Overlay) */}
              <FleetSidebar 
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                vehicles={filteredFleet}
                searchQuery={search}
                onSearchChange={setSearch}
                onSelectVehicle={selectVehicleOnMap}
                filter={fleetFilter}
                onFilterChange={setFleetFilter}
              />

              {!sidebarOpen && (
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="absolute top-6 left-6 z-[1000] p-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl text-tad-yellow shadow-xl hover:bg-tad-yellow hover:text-black transition-all group"
                >
                  <Search className="w-5 h-5" />
                  <span className="absolute left-full ml-4 px-3 py-1 bg-black text-[9px] font-black uppercase text-white tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Abrir Consola</span>
                </button>
              )}

              {/* MAP MODE CONTROLS */}
              <div className="absolute top-6 right-6 z-[1000] flex gap-2">
                 <button 
                   onClick={() => setMapMode('live')}
                   className={clsx(
                     "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border backdrop-blur-xl flex items-center gap-2",
                     mapMode === 'live' ? "bg-tad-yellow/20 border-tad-yellow text-tad-yellow" : "bg-black/60 border-white/5 text-zinc-500 hover:text-white"
                   )}
                 >
                    <Navigation className="w-3.5 h-3.5 rotate-45" /> Live Path
                 </button>
                 <button 
                   onClick={() => setMapMode('heatmap')}
                   className={clsx(
                     "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border backdrop-blur-xl flex items-center gap-2",
                     mapMode === 'heatmap' ? "bg-rose-600/20 border-rose-500 text-rose-500 shadow-[0_10px_30px_rgba(244,63,94,0.2)]" : "bg-black/60 border-white/5 text-zinc-500 hover:text-white"
                   )}
                 >
                    <Layers className="w-3.5 h-3.5" /> Heatmap
                 </button>
              </div>

              {/* MAP BOTTOM TILES */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex gap-4 px-6 py-3 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl items-center divide-x divide-white/5">
                 <div className="flex items-center gap-4 pr-4">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                       <span className="text-[10px] font-bold text-white uppercase tracking-widest">{fleetLocations.filter(v => v.isOnline).length} Online</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-zinc-600" />
                       <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{fleetLocations.length - fleetLocations.filter(v => v.isOnline).length} Stored</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 pl-4">
                    <div className="flex items-center gap-2">
                       <Phone className="w-4 h-4 text-emerald-500" />
                       <span className="text-[10px] font-bold text-white uppercase tracking-widest">Gateway Link 4.5 Stable</span>
                    </div>
                 </div>
              </div>
            </div>
          ) : view === 'summary' ? (
             <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
               {/* Summary layout remains stable but uses new palette */}
               <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                 <table className="w-full text-left">
                   <thead className="bg-black border-b border-white/5">
                     <tr className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                       <th className="p-6">Fuente Telemetría</th>
                       <th className="p-6">Vínculo Hardware</th>
                       <th className="p-6">Sync Status</th>
                       <th className="p-6">Batch Data</th>
                       <th className="p-6">Dirección / Vel</th>
                       <th className="p-6">Acción</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {summary.map((driver, i) => (
                       <tr key={driver.driverId} className="group hover:bg-white/[0.02] transition-colors">
                         <td className="p-6">
                            <div className="flex items-center gap-4">
                               <div className={clsx(
                                 "w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-xs transition-all",
                                 driver.tracking.isActive ? "text-tad-yellow border-tad-yellow/30" : "text-zinc-600"
                               )}>
                                 {driver.taxiNumber || "—"}
                               </div>
                               <div>
                                  <p className="text-sm font-black text-white uppercase group-hover:text-tad-yellow transition-colors">{driver.driverName}</p>
                                  <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">Ref: {driver.plate}</p>
                               </div>
                            </div>
                         </td>
                         <td className="p-6">
                            <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/5 uppercase">
                              {driver.device?.deviceId.slice(0, 12) || "NULL_HANDLE"}
                            </span>
                         </td>
                         <td className="p-6 text-[10px] font-black">
                            <div className="flex items-center gap-2">
                               <div className={clsx("w-1.5 h-1.5 rounded-full", driver.tracking.isActive ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-zinc-700")} />
                               <span className={driver.tracking.isActive ? "text-emerald-500" : "text-zinc-600"}>
                                 {timeAgo(driver.tracking.lastPosition?.timestamp || null)}
                               </span>
                            </div>
                         </td>
                         <td className="p-6">
                            <div className="flex items-baseline gap-1.5">
                               <span className="text-sm font-black text-white">{driver.tracking.pointsToday}</span>
                               <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Points</span>
                            </div>
                         </td>
                         <td className="p-6 text-[10px] font-black text-white italic">
                            {driver.tracking.avgSpeedToday.toFixed(1)} KM/H
                         </td>
                         <td className="p-6">
                            <button 
                              className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all outline-none focus:ring-2 focus:ring-tad-yellow/30"
                              title="Ver Detalles"
                              aria-label="Ver Detalles del Conductor"
                            >
                               <ExternalLink className="w-4 h-4" />
                            </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          ) : (
             <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* LOG DATA TABLE */}
                <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                  <table className="w-full text-left">
                    <thead className="bg-black border-b border-white/5">
                      <tr className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                        <th className="p-6">Payload Time</th>
                        <th className="p-6">Unidad</th>
                        <th className="p-6">Dataset</th>
                        <th className="p-6">Velocidad</th>
                        <th className="p-6 text-right">Mapping</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {locations.map((loc, i) => (
                        <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                          <td className="p-6 text-[10px] font-mono text-zinc-400">{new Date(loc.timestamp).toLocaleTimeString()}</td>
                          <td className="p-6 text-[10px] font-black text-white uppercase">{loc.taxiNumber}</td>
                          <td className="p-6 text-[10px] font-mono text-zinc-500">{loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}</td>
                          <td className="p-6">
                             <div className="flex items-center gap-2">
                                <div className={clsx("w-1 h-1 rounded-full", loc.speed > 0 ? "bg-tad-yellow" : "bg-zinc-700")} />
                                <span className="text-[10px] font-black text-white">{loc.speed} km/h</span>
                             </div>
                          </td>
                          <td className="p-6 text-right">
                             <button 
                               onClick={() => openInMaps(loc.latitude, loc.longitude)} 
                               className="p-2 border border-white/5 rounded-lg text-zinc-600 hover:text-tad-yellow transition-all outline-none focus:ring-2 focus:ring-tad-yellow/30"
                               title="Ver en Google Maps"
                               aria-label="Ver ubicación en Google Maps"
                             >
                                <MapIcon className="w-4 h-4" />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          )}
        </>
      )}

      {/* Footer Branding */}
      <footer className="mt-20 py-10 border-t border-white/5 flex flex-col items-center">
         <Navigation className="w-8 h-8 text-zinc-800 mb-6 rotate-45" />
         <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.6em] mb-2">TAD DOOH CORE • GS_PILOT_MAPPING</p>
         <div className="flex items-center gap-4 text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
            <span>Latencia: 300ms</span>
            <div className="w-1 h-1 bg-zinc-800 rounded-full" />
            <span>Link: SSL Encrypted</span>
            <div className="w-1 h-1 bg-zinc-800 rounded-full" />
            <span>Auth: RSA-4096</span>
         </div>
      </footer>
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
