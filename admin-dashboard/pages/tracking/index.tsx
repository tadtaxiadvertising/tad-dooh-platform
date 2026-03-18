import React, { useState, useEffect, useCallback } from 'react';
import {
  Navigation, MapPin, Activity, Search, RefreshCw,
  Battery, ChevronDown, ChevronRight, Gauge, Signal,
  AlertTriangle, Smartphone, Tablet, ExternalLink, Clock
} from 'lucide-react';
import clsx from 'clsx';
import { getTrackingSummary, getTrackingData, getFleetLocations, getHeatmapData } from '../../services/api';
import { useTabSync } from '../../hooks/useTabSync';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('../../components/MapView'), { 
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-zinc-950/80 backdrop-blur-3xl rounded-[3rem] border border-white/5 flex flex-col items-center justify-center text-zinc-500 gap-4">
    <div className="w-12 h-12 border-2 border-tad-yellow border-t-transparent rounded-full animate-spin" />
    <p className="font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Estableciendo Conexión Satelital...</p>
  </div>
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

interface LocationRecord {
  id: string;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
  driver: {
    id: string;
    name: string;
    phone: string;
    taxiNumber: string;
    plate: string;
    status: string;
    subscriptionPaid: boolean;
  } | null;
  device: {
    deviceId: string;
    taxiNumber: string;
    city: string;
    status: string;
    batteryLevel: number | null;
    lastSeen: string | null;
  } | null;
}

interface MapLocation {
  deviceId?: string;
  taxiNumber?: string;
  lastLat?: number;
  lastLng?: number;
  isOnline?: boolean;
  city?: string;
}

export default function TrackingPage() {
  const [view, setView] = useState<'summary' | 'log' | 'map'>('summary');
  const [summary, setSummary] = useState<TrackingDriver[]>([]);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [fleetLocations, setFleetLocations] = useState<MapLocation[]>([]);
  const [heatmap, setHeatmap] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mapMode, setMapMode] = useState<'live' | 'heatmap'>('live');

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
    } catch (err: unknown) {
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

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const formatTime = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleTimeString('es-DO', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch { return '—'; }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('es-DO', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    } catch { return '—'; }
  };

  const timeAgo = (iso: string | null) => {
    if (!iso) return 'Nunca';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  // Filtros
  const filteredSummary = summary.filter(d =>
    (d.driverName || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.plate || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.device?.deviceId || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredLocations = locations.filter(l =>
    (l.driver?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.device?.deviceId || '').toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const activeDrivers = summary.filter(d => d.tracking.isActive).length;
  const totalPointsToday = summary.reduce((sum, d) => sum + d.tracking.pointsToday, 0);
  const totalPointsAll = summary.reduce((sum, d) => sum + d.tracking.totalPoints, 0);
  const avgSpeed = summary.length > 0
    ? (summary.reduce((sum, d) => sum + d.tracking.avgSpeedToday, 0) / summary.filter(d => d.tracking.avgSpeedToday > 0).length || 0).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-15%] left-[-10%] w-[65%] h-[65%] bg-tad-yellow/[0.04] blur-[180px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[5%] right-[-10%] w-[55%] h-[55%] bg-white/[0.01] blur-[160px] rounded-full" />
      </div>

      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-tad-yellow rounded-3xl flex items-center justify-center shadow-[0_20px_50px_rgba(255,212,0,0.15)]">
                <Navigation className="w-7 h-7 text-black" />
             </div>
             <div>
                <div className="flex items-center gap-3 mb-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow shadow-[0_0_8px_rgba(255,212,0,0.8)] animate-pulse" />
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Integrated Tracking Intelligence v4.2</p>
                </div>
                <h1 className="text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none font-display">
                  GPS <span className="text-tad-yellow transition-all duration-700 hover:text-white cursor-default italic">Telemetry</span>
                </h1>
             </div>
          </div>
          <p className="text-zinc-500 max-w-2xl text-[12px] font-bold uppercase tracking-widest leading-relaxed">
            Synchronized <span className="text-white">orbital tracking</span> via mobile gateway.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-900/10 backdrop-blur-3xl p-1.5 rounded-full border border-white/5">
           <div className="px-6 py-2 text-right hidden lg:block border-r border-white/5">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Server_Status</p>
              <p className="text-xs font-black text-emerald-500 italic">NOMINAL</p>
           </div>
           <button
             onClick={loadData}
             disabled={isRefreshing}
             className="btn-pill px-8 border border-white/5 text-zinc-400 hover:bg-white/5 flex items-center gap-3"
           >
             <RefreshCw className={clsx('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
             Sync_Net
           </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatsCard 
           icon={<Signal className="w-5 h-5 text-emerald-400" />}
           label="Conductores Activos"
           value={`${activeDrivers}/${summary.length}`}
           sub="Handshake Móvil"
           trend="En Línea"
           color="emerald"
           delay="delay-[100ms]"
        />
        <StatsCard 
           icon={<MapPin className="w-5 h-5 text-tad-yellow" />}
           label="Puntos GPS Hoy"
           value={totalPointsToday.toLocaleString()}
           sub="Paquetes Recibidos"
           trend="Optimizado"
           color="yellow"
           delay="delay-[200ms]"
        />
        <StatsCard 
           icon={<Navigation className="w-5 h-5 text-blue-400" />}
           label="Flota Geocercada"
           value={totalPointsAll > 1000 ? `${(totalPointsAll/1000).toFixed(1)}k` : totalPointsAll.toString()}
           sub="Histórico Global"
           trend="Auditado"
           color="blue"
           delay="delay-[300ms]"
        />
        <StatsCard 
           icon={<Gauge className="w-5 h-5 text-purple-400" />}
           label="Vel. Promedio"
           value={`${avgSpeed} km/h`}
           sub="Tendencia de Tráfico"
           trend="Crucero"
           color="purple"
           delay="delay-[400ms]"
        />
      </div>

      {/* View Toggle + Search */}
      <div className="flex flex-col xl:flex-row gap-6 mb-12 items-center">
        <div className="flex p-1 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-full shadow-2xl">
          <button
            onClick={() => setView('summary')}
            className={clsx(
              'px-10 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all group relative overflow-hidden italic',
              view === 'summary'
                ? 'bg-tad-yellow text-black shadow-lg shadow-tad-yellow/10'
                : 'text-zinc-500 hover:text-white hover:bg-white/5'
            )}
          >
            <span className="flex items-center gap-3 relative z-10">
              <Activity className={clsx("w-4 h-4", view === 'summary' ? "animate-pulse" : "opacity-50")} />
              Fleet_Summary
            </span>
          </button>
          <button
            onClick={() => setView('log')}
            className={clsx(
              'px-10 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all group relative overflow-hidden italic',
              view === 'log'
                ? 'bg-tad-yellow text-black shadow-lg shadow-tad-yellow/10'
                : 'text-zinc-500 hover:text-white hover:bg-white/5'
            )}
          >
            <span className="flex items-center gap-3 relative z-10">
              <MapPin className={clsx("w-4 h-4", view === 'log' ? "animate-bounce" : "opacity-50")} />
              Orbital_Log
            </span>
          </button>
          <button
            onClick={() => setView('map')}
            className={clsx(
              'px-10 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all group relative overflow-hidden italic',
              view === 'map'
                ? 'bg-tad-yellow text-black shadow-lg shadow-tad-yellow/10'
                : 'text-zinc-500 hover:text-white hover:bg-white/5'
            )}
          >
            <span className="flex items-center gap-3 relative z-10">
              <Navigation className={clsx("w-4 h-4", view === 'map' ? "rotate-45" : "opacity-50")} />
              Satellite_View
            </span>
          </button>
        </div>

        <div className="relative flex-1 w-full group">
          <div className="absolute inset-0 bg-tad-yellow/5 blur-[40px] opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-600 group-focus-within:text-tad-yellow transition-colors" />
          <input
            type="text"
            placeholder="PROBE TELEMETRY MANIFEST..."
            className="w-full bg-zinc-900/10 border border-white/5 rounded-full py-5 pl-16 pr-8 text-[11px] font-black uppercase tracking-[0.3em] text-white outline-none focus:border-tad-yellow transition-all placeholder:text-zinc-800 backdrop-blur-3xl shadow-2xl relative z-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 border-4 border-tad-yellow/20 border-t-tad-yellow rounded-full animate-spin" />
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] animate-pulse">Sincronizando con Constelación GPS</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-[3rem] p-16 text-center backdrop-blur-xl animate-in fade-in zoom-in duration-500">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h3 className="text-xl font-black text-white uppercase italic tracking-widest">Error de Enlace Terrestre</h3>
          <p className="text-red-400 font-bold mt-2 uppercase text-[10px] tracking-widest">{error}</p>
          <button 
            onClick={loadData} 
            title="Reintentar Conexión"
            className="mt-8 px-10 py-4 bg-zinc-900 text-[10px] font-black uppercase text-white rounded-2xl border border-white/5 hover:bg-zinc-800 transition-all"
          >
            Reintentar Conexión
          </button>
        </div>
      )}

      {/* VIEWS */}
      {!loading && !error && (
        <>
          {/* SUMMARY VIEW */}
          {view === 'summary' && (
            <div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-tad-yellow/5 blur-[100px] -z-10" />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Fuente / Conductor</th>
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Vinc. de Red</th>
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Estado GPS</th>
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Carga Datos</th>
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Vel. Actual</th>
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Localización</th>
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredSummary.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-10 py-32 text-center">
                          <Navigation className="w-16 h-16 text-zinc-900 mx-auto mb-6 animate-bounce" />
                          <h3 className="text-xl font-black text-zinc-700 uppercase tracking-widest italic">Cámara de Vacío Operacional</h3>
                          <p className="text-xs font-bold text-zinc-800 uppercase tracking-widest mt-2">No se detectan paquetes de telemetría GPS en la red de conductores.</p>
                        </td>
                      </tr>
                    ) : filteredSummary.map((driver, idx) => (
                      <React.Fragment key={driver.driverId}>
                        <tr 
                          className={clsx(
                            "hover:bg-tad-yellow/[0.03] transition-all group relative animate-in fade-in slide-in-from-left-4 duration-500 fill-mode-both",
                            `[animation-delay:${idx * 40}ms]`
                          )}
                        >
                          <td className="px-10 py-7">
                            <div className="flex items-center gap-4">
                              <div className={clsx(
                                'w-10 h-10 rounded-xl flex items-center justify-center border font-black text-[11px] transition-all',
                                driver.tracking.isActive
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover:scale-110 shadow-lg shadow-emerald-500/5'
                                  : 'bg-zinc-900 border-white/5 text-zinc-500'
                              )}>
                                {driver.taxiNumber || '—'}
                              </div>
                              <div>
                                <p className="text-sm font-black text-white italic tracking-tight uppercase group-hover:text-tad-yellow transition-colors">{driver.driverName}</p>
                                <p className="text-[10px] font-mono text-zinc-600 mt-0.5 tracking-tighter">PH: {driver.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-10 py-7">
                            {driver.device ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Tablet className="w-3.5 h-3.5 text-zinc-500 group-hover:text-tad-yellow transition-colors" />
                                  <span className="text-[11px] font-black text-white italic">{driver.device.deviceId.slice(0, 10).toUpperCase()}</span>
                                </div>
                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em]">{driver.device.city || 'ZONA GLOBAL'}</p>
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-700 font-black italic uppercase tracking-widest">Sin Tablet Vinc.</span>
                            )}
                          </td>
                          <td className="px-10 py-7">
                            <div className="flex flex-col gap-1.5">
                               <div className="flex items-center gap-2">
                                 {driver.tracking.isActive ? (
                                   <>
                                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_#10b981]" />
                                     <span className="text-[10px] font-black text-emerald-500 uppercase italic">En Ruta</span>
                                   </>
                                 ) : driver.tracking.totalPoints > 0 ? (
                                   <>
                                     <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
                                     <span className="text-[10px] font-black text-zinc-600 uppercase italic whitespace-nowrap">Estacionario</span>
                                   </>
                                 ) : (
                                   <>
                                     <div className="w-1.5 h-1.5 bg-red-900 rounded-full" />
                                     <span className="text-[10px] font-black text-zinc-800 uppercase italic">Sin Telemetría</span>
                                   </>
                                 )}
                               </div>
                               {driver.tracking.isActive && <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Transmitiendo...</p>}
                            </div>
                          </td>
                          <td className="px-10 py-7">
                            <div className="flex items-end gap-1.5">
                              <span className="text-md font-black text-white italic">{driver.tracking.pointsToday}</span>
                              <span className="text-[9px] text-zinc-600 font-bold uppercase mb-0.5">/ {driver.tracking.totalPoints} Global</span>
                            </div>
                          </td>
                          <td className="px-10 py-7">
                            <div className="flex items-center gap-2">
                               <Gauge className={clsx("w-3.5 h-3.5", driver.tracking.avgSpeedToday > 0 ? "text-tad-yellow" : "text-zinc-800")} />
                               <span className="text-xs font-black text-zinc-300 italic">
                                 {driver.tracking.avgSpeedToday > 0 ? `${driver.tracking.avgSpeedToday} km/h` : 'OFFLINE'}
                               </span>
                            </div>
                          </td>
                          <td className="px-10 py-7">
                            {driver.tracking.lastPosition ? (
                              <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                   <div className="flex items-center gap-1.5 mb-1">
                                      <Clock className="w-3 h-3 text-zinc-600" />
                                      <span className="text-[10px] font-black text-zinc-400 uppercase leading-none">{timeAgo(driver.tracking.lastPosition.timestamp).toUpperCase()}</span>
                                   </div>
                                   <p className="text-[9px] font-mono text-zinc-600 leading-none">{driver.tracking.lastPosition.lat.toFixed(4)}, {driver.tracking.lastPosition.lng.toFixed(4)}</p>
                                </div>
                                <button
                                  onClick={() => openInMaps(driver.tracking.lastPosition!.lat, driver.tracking.lastPosition!.lng)}
                                  className="p-2.5 rounded-xl bg-tad-yellow/10 text-tad-yellow hover:bg-tad-yellow hover:text-black transition-all border border-tad-yellow/20"
                                  title="Ver en Google Maps"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-800 font-black italic">SINC_PENDING</span>
                            )}
                          </td>
                          <td className="px-10 py-7 text-right">
                            <button
                              onClick={() => setExpandedDriver(expandedDriver === driver.driverId ? null : driver.driverId)}
                              title={expandedDriver === driver.driverId ? "Contraer Conductor" : "Expandir Conductor"}
                              className={clsx(
                                 "p-3 rounded-2xl transition-all border",
                                 expandedDriver === driver.driverId
                                  ? "bg-tad-yellow text-black border-tad-yellow"
                                  : "bg-zinc-900 text-zinc-500 hover:text-white border-white/5 shadow-xl"
                              )}
                            >
                              {expandedDriver === driver.driverId ? <ChevronDown className="w-5 h-5 animate-bounce" /> : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                            </button>
                          </td>
                        </tr>
                        {expandedDriver === driver.driverId && (
                          <tr className="bg-zinc-950/80 backdrop-blur-3xl border-b border-white/5">
                            <td colSpan={7} className="p-0">
                              <div className="p-10 border-l-[6px] border-tad-yellow grid grid-cols-1 xl:grid-cols-2 gap-12 animate-in slide-in-from-top-4 duration-500">
                                <div className="space-y-6">
                                  <div className="flex items-center gap-3">
                                     <Tablet className="w-5 h-5 text-tad-yellow" />
                                     <h4 className="text-white font-black uppercase tracking-[0.2em] italic text-xs">Especificaciones del Nodo Receptor</h4>
                                  </div>
                                  {driver.device ? (
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 group/info hover:border-tad-yellow/30 transition-all">
                                        <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-2 group-hover/info:text-tad-yellow">UUID Satelital</p>
                                        <p className="text-white font-mono text-xs break-all leading-relaxed uppercase">{driver.device.deviceId}</p>
                                      </div>
                                      <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 group/info hover:border-tad-yellow/30 transition-all">
                                        <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-2 group-hover/info:text-tad-yellow">Zona de Operación</p>
                                        <p className="text-white text-md font-black italic uppercase">{driver.device.city || 'Sin Asignar'}</p>
                                      </div>
                                      <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 group/info hover:border-tad-yellow/30 transition-all">
                                        <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-2 group-hover/info:text-tad-yellow">Estado Batería</p>
                                        <div className="flex items-center gap-3">
                                          <Battery className={clsx('w-5 h-5', (driver.device.batteryLevel ?? 100) > 20 ? 'text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]')} />
                                          <p className="text-white text-xl font-black italic">{driver.device.batteryLevel ?? '—'}%</p>
                                        </div>
                                      </div>
                                      <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 group/info hover:border-tad-yellow/30 transition-all">
                                        <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-2 group-hover/info:text-tad-yellow">Sincronización</p>
                                        <p className="text-white text-sm font-bold uppercase">{timeAgo(driver.device.lastSeen).toUpperCase()}</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-10 border border-dashed border-white/10 rounded-[2rem] text-center">
                                       <Tablet className="w-12 h-12 text-zinc-900 mx-auto mb-4" />
                                       <p className="text-[10px] text-zinc-700 font-black uppercase tracking-widest italic">Nodo receptor no detectado en el puente actual.</p>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-6">
                                  <div className="flex items-center gap-3">
                                     <Smartphone className="w-5 h-5 text-emerald-500" />
                                     <h4 className="text-white font-black uppercase tracking-[0.2em] italic text-xs">Transmisión Mobile Gateway</h4>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 group/info hover:border-emerald-500/30 transition-all">
                                      <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-2 group-hover/info:text-emerald-500">Handshakes Hoy</p>
                                      <p className="text-tad-yellow font-black text-3xl italic leading-none">{driver.tracking.pointsToday}</p>
                                    </div>
                                    <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 group/info hover:border-blue-500/30 transition-all">
                                      <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-2 group-hover/info:text-blue-500">Métrica Acumulada</p>
                                      <p className="text-blue-400 font-black text-3xl italic leading-none">{driver.tracking.totalPoints}</p>
                                    </div>
                                    {driver.tracking.lastPosition && (
                                      <div className="bg-zinc-950/80 p-8 rounded-[2rem] border border-white/5 col-span-2 relative overflow-hidden group/pos">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-tad-yellow/5 blur-3xl opacity-0 group-hover/pos:opacity-100 transition-opacity" />
                                        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-4">Coordenadas del Último Paquete</p>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                          <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-tad-yellow/5 border border-tad-yellow/20 flex items-center justify-center">
                                               <MapPin className="w-6 h-6 text-tad-yellow shadow-[0_0_10px_#fad400]" />
                                            </div>
                                            <div>
                                               <p className="text-white font-mono text-lg font-black tracking-tight italic">
                                                 {driver.tracking.lastPosition.lat.toFixed(6)}N <span className="text-zinc-700 ml-2">/</span> <span className="text-zinc-400">{driver.tracking.lastPosition.lng.toFixed(6)}W</span>
                                               </p>
                                               <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1 italic">Vía Constelación de GPS Terrestre</p>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => openInMaps(driver.tracking.lastPosition!.lat, driver.tracking.lastPosition!.lng)}
                                            className="px-8 py-3 bg-[#FFD400] text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white transition-all shadow-xl shadow-[#FFD400]/20 italic"
                                          >
                                            Mapping Externo
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex justify-end pt-4">
                                    <div className={clsx(
                                      'text-[10px] font-black uppercase tracking-[0.3em] px-6 py-2.5 rounded-full border shadow-xl',
                                      driver.subscriptionPaid ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                    )}>
                                      {driver.subscriptionPaid ? '• Suscripción Auditada' : '• Registro Pendiente'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LOG VIEW */}
          {view === 'log' && (
            <div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-tad-yellow/5 blur-[100px] -z-10" />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Temporalidad (UTC-4)</th>
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Identidad Conductor</th>
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Terminal Tablet</th>
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Latitud</th>
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Longitud</th>
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Vel. Instantánea</th>
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] text-right">Mapping</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredLocations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-10 py-32 text-center">
                          <MapPin className="w-16 h-16 text-zinc-900 mx-auto mb-6 opacity-30" />
                          <h3 className="text-xl font-black text-zinc-700 uppercase tracking-widest italic">Sincronización Vacía</h3>
                          <p className="text-xs font-bold text-zinc-800 uppercase tracking-widest mt-2">No se han registrado secuencias de posicionamiento activo.</p>
                        </td>
                      </tr>
                    ) : filteredLocations.map((loc, i) => (
                      <tr key={loc.id || i} className={clsx(
                        'hover:bg-white/[0.03] transition-colors relative group',
                        i === 0 && 'bg-tad-yellow/[0.03] border-l-2 border-tad-yellow'
                      )}>
                        <td className="px-10 py-5"><span className="text-[11px] text-zinc-400 font-mono italic">{formatDate(loc.timestamp)}</span></td>
                        <td className="px-10 py-5">
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-tad-yellow opacity-40" />
                             <span className="text-xs font-black text-white uppercase italic tracking-tight">{loc.driver?.name || 'GENERIC_SOURCE'}</span>
                          </div>
                        </td>
                        <td className="px-10 py-5"><span className="text-[10px] font-black text-tad-yellow uppercase tracking-widest bg-tad-yellow/5 px-3 py-1 rounded-full border border-tad-yellow/10">{loc.device?.deviceId.slice(0, 12).toUpperCase() || 'EXTERNAL'}</span></td>
                        <td className="px-10 py-5"><span className="text-[11px] font-mono text-zinc-400">{loc.latitude.toFixed(6)}</span></td>
                        <td className="px-10 py-5"><span className="text-[11px] font-mono text-zinc-400">{loc.longitude.toFixed(6)}</span></td>
                        <td className="px-10 py-5">
                          <div className="flex items-center gap-2">
                            <div className={clsx('w-1.5 h-1.5 rounded-full', loc.speed > 60 ? 'bg-rose-500 animate-pulse' : loc.speed > 20 ? 'bg-tad-yellow' : 'bg-emerald-500')} />
                            <span className={clsx('text-xs font-black italic', loc.speed > 50 ? 'text-rose-400' : loc.speed > 20 ? 'text-tad-yellow' : 'text-emerald-400')}>
                              {loc.speed.toFixed(1)} <span className="text-[9px] uppercase font-bold opacity-60">km/h</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-10 py-5 text-right">
                          <button 
                            onClick={() => openInMaps(loc.latitude, loc.longitude)} 
                            className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500 hover:text-tad-yellow hover:border-tad-yellow/30 transition-all shadow-xl"
                            title="Ver en Google Maps"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredLocations.length > 0 && (
                <div className="px-10 py-5 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
                  <p className="text-[9px] text-zinc-700 font-black uppercase tracking-[0.2em] italic">Mostrando cola de transmisión: {filteredLocations.length} Paquetes Recibidos</p>
                  <p className="text-[9px] text-zinc-800 font-black uppercase tracking-widest">Protocolo TLS 1.3 Auditado</p>
                </div>
              )}
            </div>
          )}

          {/* MAP VIEW */}
          {view === 'map' && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
              <div className="flex flex-col sm:flex-row justify-between items-center bg-zinc-950/50 p-4 rounded-[2rem] border border-white/5 backdrop-blur-3xl shadow-2xl gap-4">
                <div className="flex p-1 bg-zinc-900/50 rounded-2xl border border-white/5">
                  <button onClick={() => setMapMode('live')} className={clsx("px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic", mapMode === 'live' ? "bg-tad-yellow text-black shadow-lg shadow-tad-yellow/10" : "text-zinc-500 hover:text-white hover:bg-white/5")}>Ubicación Real</button>
                  <button onClick={() => setMapMode('heatmap')} className={clsx("px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic", mapMode === 'heatmap' ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30" : "text-zinc-500 hover:text-white hover:bg-white/5")}>Mapa de Calor (Ads)</button>
                </div>
                <div className="px-8 py-3 bg-zinc-900 components border border-white/5 rounded-2xl flex items-center gap-3">
                   <div className={clsx("w-2 h-2 rounded-full", mapMode === 'live' ? "bg-tad-yellow" : "bg-rose-500")}></div>
                   <span className="text-[10px] font-black text-white italic uppercase tracking-[0.1em]">{mapMode === 'live' ? `${fleetLocations.length} UNIDADES REPORTANDO` : `${heatmap.length} IMPACTOS CONFIRMADOS`}</span>
                </div>
              </div>
              <div className="h-[750px] relative rounded-[3.5rem] overflow-hidden border border-white/10 shadow-3xl group/map">
                <MapView locations={fleetLocations} heatmapData={heatmap} mode={mapMode} />
                
                {/* Map Overlay Decor */}
                <div className="absolute top-10 right-10 z-[1000] pointer-events-none space-y-4">
                   {mapMode === 'heatmap' && (
                      <div className="bg-rose-950/90 backdrop-blur-2xl border border-rose-500/30 p-8 rounded-[2.5rem] max-w-sm shadow-2xl animate-in fade-in zoom-in slide-in-from-right-10 duration-700 pointer-events-auto">
                        <div className="flex items-center gap-3 mb-4">
                           <Activity className="w-5 h-5 text-rose-500" />
                           <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] italic">Análisis Dinámico de Densidad</h3>
                        </div>
                        <p className="text-[10px] text-rose-200/60 font-medium leading-relaxed uppercase tracking-wider">Visualización térmica de los impactos publicitarios auditados en los últimos 15 ciclos solares (días).</p>
                        <div className="mt-6 h-1 w-full bg-rose-500/20 rounded-full overflow-hidden">
                           <div className="h-full bg-rose-500 w-3/4 animate-pulse" />
                        </div>
                      </div>
                   )}
                   <div className="bg-zinc-950/80 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] max-w-[200px] shadow-2xl pointer-events-auto">
                      <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-3 italic">Leyenda de Señal</p>
                      <div className="space-y-2">
                         <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-tad-yellow" />
                            <span className="text-[9px] font-black text-white uppercase italic">Nodo Activo</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span className="text-[9px] font-black text-white uppercase italic">Suscripción OK</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                            <span className="text-[9px] font-black text-white uppercase italic">Invernación</span>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Footer Branding */}
      <div className="mt-20 py-10 border-t border-white/5 flex flex-col items-center justify-center opacity-30 text-center">
         <Navigation className="w-10 h-10 text-zinc-800 mb-4" />
         <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.5em]">TADNODE ECOSYSTEM OS • GPS CORE v4.5</p>
         <p className="text-[8px] font-bold text-zinc-800 uppercase tracking-widest mt-2 px-10 border border-[#FFD400]/10 py-2 rounded-full">© 2026 AUDITORÍA DE PASAJEROS DIGITAL • TODOS LOS DERECHOS RESERVADOS</p>
      </div>
    </div>
  );
}

function StatsCard({ icon, label, value, sub, trend, color, delay }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  sub: string; 
  trend: string; 
  color: string;
  delay?: string;
}) {
   const colorMap: Record<string, string> = {
      yellow: 'bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow shadow-tad-yellow/5',
      emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-emerald-500/5',
      blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-blue-500/5',
      purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400 shadow-purple-500/5',
   };

   return (
      <div className={`bg-zinc-950/40 backdrop-blur-3xl border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-white/10 hover:shadow-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 ${delay} fill-mode-both`}>
         <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] blur-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
         
         <div className="flex justify-between items-start mb-6">
            <div className={`p-4 rounded-2xl border transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${colorMap[color] || 'bg-zinc-900 border-white/10 text-white'}`}>
               {icon}
            </div>
            <span className={`text-[9px] font-black px-3 py-1 rounded-full border transform transition-all duration-500 group-hover:translate-x-[-4px] ${colorMap[color] || 'bg-white/5 border-white/5 text-zinc-500'} uppercase tracking-widest shadow-sm`}>
               {trend}
            </span>
         </div>
         <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2">{label}</p>
         <h3 className="text-4xl font-black text-white italic tracking-tighter mb-2 group-hover:text-white transition-colors duration-500 leading-none">{value}</h3>
         <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">{sub}</p>
         
         <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/[0.01] rounded-full blur-3xl group-hover:bg-white/[0.03] transition-all duration-700" />
      </div>
   );
}
