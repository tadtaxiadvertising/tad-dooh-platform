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
  loading: () => <div className="w-full h-[600px] bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-gray-700/50 flex flex-col items-center justify-center text-gray-500 gap-4 shadow-md">
    <div className="w-10 h-10 border-2 border-tad-yellow border-t-transparent rounded-full animate-spin" />
    <p className="font-bold uppercase tracking-widest text-xs animate-pulse">Estableciendo Conexión Satelital...</p>
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
    <div className="min-h-screen pb-12 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-tad-yellow/[0.04] blur-[150px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[0%] right-[-5%] w-[40%] h-[40%] bg-white/[0.01] blur-[120px] rounded-full" />
      </div>

      {/* Page Context Transition */}
      <div className="flex items-center gap-3 mb-8 opacity-60">
        <div className="w-8 h-px bg-white/20" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Intelligence / GPS Telemetry</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatsCard 
           icon={<Signal className="w-5 h-5 text-current" />}
           label="Activos"
           value={`${activeDrivers}/${summary.length}`}
           sub="Handshake Móvil"
           trend="En Línea"
           color="emerald"
        />
        <StatsCard 
           icon={<MapPin className="w-5 h-5 text-current" />}
           label="Puntos de Hoy"
           value={totalPointsToday.toLocaleString()}
           sub="GPS Recibidos"
           trend="Optimizado"
           color="yellow"
        />
        <StatsCard 
           icon={<Navigation className="w-5 h-5 text-current" />}
           label="Flota Geocercada"
           value={totalPointsAll > 1000 ? `${(totalPointsAll/1000).toFixed(1)}k` : totalPointsAll.toString()}
           sub="Histórico Global"
           trend="Auditado"
           color="blue"
        />
        <StatsCard 
           icon={<Gauge className="w-5 h-5 text-current" />}
           label="Rendimiento"
           value={`${avgSpeed} km/h`}
           sub="Velocidad Prom."
           trend="Crucero"
           color="purple"
        />
      </div>

      {/* View Toggle + Search */}
      <div className="flex flex-col xl:flex-row gap-4 mb-10 items-center">
        <div className="flex p-1 bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-sm">
          <button
            onClick={() => setView('summary')}
            className={clsx(
              'px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2',
              view === 'summary'
                ? 'bg-tad-yellow text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            )}
          >
            <Activity className={clsx("w-4 h-4", view === 'summary' ? "animate-pulse" : "opacity-50")} />
            Fleet Summary
          </button>
          <button
            onClick={() => setView('log')}
            className={clsx(
              'px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2',
              view === 'log'
                ? 'bg-tad-yellow text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            )}
          >
            <MapPin className={clsx("w-4 h-4", view === 'log' ? "animate-bounce" : "opacity-50")} />
            Orbital Log
          </button>
          <button
            onClick={() => setView('map')}
            className={clsx(
              'px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2',
              view === 'map'
                ? 'bg-tad-yellow text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            )}
          >
            <Navigation className={clsx("w-4 h-4", view === 'map' ? "rotate-45" : "opacity-50")} />
            Sat View
          </button>
        </div>

        <div className="relative flex-1 w-full group">
          <div className="absolute inset-0 bg-tad-yellow/5 blur-[20px] opacity-0 group-focus-within:opacity-100 transition-opacity rounded-full z-0" />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-tad-yellow transition-colors z-10" />
          <input
            type="text"
            placeholder="PROBE TELEMETRY MANIFEST..."
            className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl py-3 pl-12 pr-6 text-sm font-bold uppercase tracking-wider text-white outline-none focus:border-tad-yellow/40 transition-all placeholder:text-gray-600 shadow-sm relative z-10"
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
        <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-12 text-center backdrop-blur-xl animate-in fade-in zoom-in duration-500 max-w-2xl mx-auto">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white uppercase tracking-widest">Error de Enlace Terrestre</h3>
          <p className="text-red-400 font-bold mt-2 uppercase text-xs tracking-widest">{error}</p>
          <button 
            onClick={loadData} 
            title="Reintentar Conexión"
            className="mt-6 px-8 py-3 bg-gray-900 border border-gray-700 hover:bg-gray-800 text-xs font-bold uppercase text-white rounded-xl transition-all shadow-sm"
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
            <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden shadow-sm relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-tad-yellow/5 blur-[100px] -z-10" />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700 bg-gray-900/40">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Fuente / Conductor</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Vinc. de Red</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Estado GPS</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Carga Datos</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Vel. Actual</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Localización</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {filteredSummary.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-24 text-center">
                          <Navigation className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest">Cámara de Vacío Operacional</h3>
                          <p className="text-xs font-medium text-gray-500 mt-2">No se detectan paquetes de telemetría GPS en la red.</p>
                        </td>
                      </tr>
                    ) : filteredSummary.map((driver, idx) => (
                      <React.Fragment key={driver.driverId}>
                        <tr 
                          className={clsx(
                            "hover:bg-gray-800/50 transition-colors group relative animate-in fade-in slide-in-from-left-4 duration-500 fill-mode-both",
                            `[animation-delay:${idx * 40}ms]`
                          )}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className={clsx(
                                'w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-sm transition-all',
                                driver.tracking.isActive
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover:scale-105'
                                  : 'bg-gray-900 border-gray-700 text-gray-500'
                              )}>
                                {driver.taxiNumber || '—'}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white uppercase group-hover:text-tad-yellow transition-colors">{driver.driverName}</p>
                                <p className="text-[10px] font-mono text-gray-400 mt-0.5 tracking-tight">PH: {driver.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {driver.device ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Tablet className="w-3.5 h-3.5 text-gray-500 group-hover:text-tad-yellow transition-colors" />
                                  <span className="text-xs font-bold text-white">{driver.device.deviceId.slice(0, 10).toUpperCase()}</span>
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{driver.device.city || 'ZONA GLOBAL'}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500 font-medium uppercase tracking-widest">Sin Tablet Vinc.</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1.5">
                               <div className="flex items-center gap-2">
                                 {driver.tracking.isActive ? (
                                   <>
                                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_#10b981]" />
                                     <span className="text-xs font-bold text-emerald-500 uppercase">En Ruta</span>
                                   </>
                                 ) : driver.tracking.totalPoints > 0 ? (
                                   <>
                                     <div className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                                     <span className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Estacionario</span>
                                   </>
                                 ) : (
                                   <>
                                     <div className="w-1.5 h-1.5 bg-red-500/50 rounded-full" />
                                     <span className="text-xs font-bold text-gray-600 uppercase">Sin Telemetría</span>
                                   </>
                                 )}
                               </div>
                               {driver.tracking.isActive && <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">Transmitiendo...</p>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-end gap-1.5">
                              <span className="text-sm font-bold text-white">{driver.tracking.pointsToday}</span>
                              <span className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">/ {driver.tracking.totalPoints} Global</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                               <Gauge className={clsx("w-4 h-4", driver.tracking.avgSpeedToday > 0 ? "text-tad-yellow" : "text-gray-600")} />
                               <span className="text-xs font-bold text-gray-300">
                                 {driver.tracking.avgSpeedToday > 0 ? `${driver.tracking.avgSpeedToday} km/h` : 'OFFLINE'}
                               </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {driver.tracking.lastPosition ? (
                              <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                   <div className="flex items-center gap-1.5 mb-1">
                                      <Clock className="w-3 h-3 text-gray-500" />
                                      <span className="text-[10px] font-bold text-gray-400 uppercase leading-none">{timeAgo(driver.tracking.lastPosition.timestamp).toUpperCase()}</span>
                                   </div>
                                   <p className="text-[10px] font-mono text-gray-500 leading-none">{driver.tracking.lastPosition.lat.toFixed(4)}, {driver.tracking.lastPosition.lng.toFixed(4)}</p>
                                </div>
                                <button
                                  onClick={() => openInMaps(driver.tracking.lastPosition!.lat, driver.tracking.lastPosition!.lng)}
                                  className="p-2 rounded-xl bg-gray-800 text-gray-400 hover:text-tad-yellow hover:bg-gray-700 transition-colors border border-gray-700"
                                  title="Ver en Google Maps"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-600 font-bold">SINC_PENDING</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setExpandedDriver(expandedDriver === driver.driverId ? null : driver.driverId)}
                              title={expandedDriver === driver.driverId ? "Contraer Conductor" : "Expandir Conductor"}
                              className={clsx(
                                 "p-2.5 rounded-xl transition-all border",
                                 expandedDriver === driver.driverId
                                  ? "bg-tad-yellow text-black border-tad-yellow"
                                  : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white"
                              )}
                            >
                              {expandedDriver === driver.driverId ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                            </button>
                          </td>
                        </tr>
                        {expandedDriver === driver.driverId && (
                          <tr className="bg-gray-900/50 border-b border-gray-700/50">
                            <td colSpan={7} className="p-0">
                              <div className="px-8 py-8 border-l-4 border-tad-yellow grid grid-cols-1 xl:grid-cols-2 gap-10 animate-in slide-in-from-top-4 duration-500">
                                <div className="space-y-6">
                                  <div className="flex items-center gap-3">
                                     <Tablet className="w-5 h-5 text-tad-yellow" />
                                     <h4 className="text-white font-bold uppercase tracking-widest text-xs">Especificaciones del Pantalla Receptor</h4>
                                  </div>
                                  {driver.device ? (
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="bg-gray-800/40 p-4 rounded-2xl border border-gray-700/50 transition-all">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1.5">Pantalla</p>
                                        <p className="text-white font-mono text-xs break-all leading-tight uppercase">
                                          {driver.device.deviceId.startsWith('NEXUS-') 
                                            ? `[${driver.device.deviceId.replace('NEXUS-', '').replace(/-/g, '')}]` 
                                            : driver.device.deviceId}
                                        </p>
                                      </div>
                                      <div className="bg-gray-800/40 p-4 rounded-2xl border border-gray-700/50 transition-all">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1.5">Zona de Operación</p>
                                        <p className="text-white text-sm font-bold uppercase">{driver.device.city || 'Sin Asignar'}</p>
                                      </div>
                                      <div className="bg-gray-800/40 p-4 rounded-2xl border border-gray-700/50 transition-all">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1.5">Estado Batería</p>
                                        <div className="flex items-center gap-2">
                                          <Battery className={clsx('w-4 h-4', (driver.device.batteryLevel ?? 100) > 20 ? 'text-emerald-500' : 'text-rose-500')} />
                                          <p className="text-white text-lg font-bold">{driver.device.batteryLevel ?? '—'}%</p>
                                        </div>
                                      </div>
                                      <div className="bg-gray-800/40 p-4 rounded-2xl border border-gray-700/50 transition-all">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1.5">Sincronización</p>
                                        <p className="text-white text-sm font-bold uppercase">{timeAgo(driver.device.lastSeen).toUpperCase()}</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-8 border border-dashed border-gray-700 rounded-2xl text-center">
                                       <Tablet className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Pantalla receptor no detectado</p>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-6">
                                  <div className="flex items-center gap-3">
                                     <Smartphone className="w-5 h-5 text-emerald-500" />
                                     <h4 className="text-white font-bold uppercase tracking-widest text-xs">Transmisión Mobile Gateway</h4>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-800/40 p-4 rounded-2xl border border-gray-700/50 transition-all">
                                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Handshakes Hoy</p>
                                      <p className="text-tad-yellow font-black text-2xl leading-none">{driver.tracking.pointsToday}</p>
                                    </div>
                                    <div className="bg-gray-800/40 p-4 rounded-2xl border border-gray-700/50 transition-all">
                                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Métrica Acumulada</p>
                                      <p className="text-blue-400 font-black text-2xl leading-none">{driver.tracking.totalPoints}</p>
                                    </div>
                                    {driver.tracking.lastPosition && (
                                      <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700/50 col-span-2 relative overflow-hidden group/pos">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-4">Coordenadas del Último Paquete</p>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                          <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center">
                                               <MapPin className="w-5 h-5 text-tad-yellow" />
                                            </div>
                                            <div>
                                               <p className="text-white font-mono text-sm font-bold tracking-tight">
                                                 {driver.tracking.lastPosition.lat.toFixed(6)} <span className="text-gray-600 mx-1">/</span> <span className="text-gray-400">{driver.tracking.lastPosition.lng.toFixed(6)}</span>
                                               </p>
                                               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Vía GPS Terrestre</p>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => openInMaps(driver.tracking.lastPosition!.lat, driver.tracking.lastPosition!.lng)}
                                            className="px-6 py-2.5 bg-gray-900 border border-gray-700 text-gray-300 font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-tad-yellow hover:text-black hover:border-tad-yellow transition-colors"
                                          >
                                            Ver Mapa
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex justify-end pt-2">
                                    <div className={clsx(
                                      'text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg border',
                                      driver.subscriptionPaid ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                    )}>
                                      {driver.subscriptionPaid ? 'Suscripción Auditada' : 'Registro Pendiente'}
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
            <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden shadow-sm relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-tad-yellow/5 blur-[100px] -z-10" />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700 bg-gray-900/40">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Hora (Local)</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Conductor</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Dispositivo</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Latitud</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Longitud</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Velocidad</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {filteredLocations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-24 text-center">
                          <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest">Sincronización Vacía</h3>
                          <p className="text-xs font-medium text-gray-500 mt-2">No se han registrado secuencias de posicionamiento activo.</p>
                        </td>
                      </tr>
                    ) : filteredLocations.map((loc, i) => (
                      <tr key={loc.id || i} className={clsx(
                        'hover:bg-gray-800/50 transition-colors relative group',
                        i === 0 && 'bg-tad-yellow/5 border-l-2 border-tad-yellow'
                      )}>
                        <td className="px-6 py-4"><span className="text-xs text-gray-400 font-mono">{formatDate(loc.timestamp)}</span></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow opacity-70" />
                             <span className="text-xs font-bold text-white uppercase">{loc.driver?.name || 'GENERIC SOURCE'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4"><span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider bg-gray-900 px-2.5 py-1 rounded-md border border-gray-700">{loc.device?.deviceId.slice(0, 12).toUpperCase() || 'EXTERNAL'}</span></td>
                        <td className="px-6 py-4"><span className="text-[11px] font-mono text-gray-400">{loc.latitude.toFixed(6)}</span></td>
                        <td className="px-6 py-4"><span className="text-[11px] font-mono text-gray-400">{loc.longitude.toFixed(6)}</span></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={clsx('w-1.5 h-1.5 rounded-full', loc.speed > 60 ? 'bg-rose-500 animate-pulse' : loc.speed > 20 ? 'bg-tad-yellow' : 'bg-emerald-500')} />
                            <span className={clsx('text-xs font-bold', loc.speed > 50 ? 'text-rose-400' : loc.speed > 20 ? 'text-tad-yellow' : 'text-emerald-400')}>
                              {loc.speed.toFixed(1)} <span className="text-[9px] uppercase font-bold opacity-70">km/h</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => openInMaps(loc.latitude, loc.longitude)} 
                            className="p-2 rounded-xl bg-gray-900 border border-gray-700 text-gray-400 hover:text-tad-yellow hover:border-tad-yellow transition-all shadow-sm"
                            title="Ver en Google Maps"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredLocations.length > 0 && (
                <div className="px-6 py-4 bg-gray-900/30 border-t border-gray-700/50 flex items-center justify-between">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Mostrando cola: {filteredLocations.length} Paquetes</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Protocolo TLS 1.3</p>
                </div>
              )}
            </div>
          )}

          {/* MAP VIEW */}
          {view === 'map' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-800/40 p-4 rounded-3xl border border-gray-700/50 backdrop-blur-xl shadow-sm gap-4">
                <div className="flex p-1 bg-gray-900/50 rounded-2xl border border-gray-700/50">
                  <button onClick={() => setMapMode('live')} className={clsx("px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all", mapMode === 'live' ? "bg-tad-yellow text-black shadow-md" : "text-gray-400 hover:text-white hover:bg-gray-700/50")}>Ubicación Real</button>
                  <button onClick={() => setMapMode('heatmap')} className={clsx("px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all", mapMode === 'heatmap' ? "bg-rose-600 text-white shadow-md shadow-rose-600/30" : "text-gray-400 hover:text-white hover:bg-gray-700/50")}>Mapa de Calor (Ads)</button>
                </div>
                <div className="px-6 py-2.5 bg-gray-900 border border-gray-700 rounded-xl flex items-center gap-3">
                   <div className={clsx("w-2 h-2 rounded-full", mapMode === 'live' ? "bg-tad-yellow" : "bg-rose-500")}></div>
                   <span className="text-[10px] font-bold text-white uppercase tracking-widest">{mapMode === 'live' ? `${fleetLocations.length} UNIDADES ONLINE` : `${heatmap.length} IMPACTOS`}</span>
                </div>
              </div>
              <div className="h-[750px] relative rounded-3xl overflow-hidden border border-gray-700/50 shadow-md group/map">
                <MapView locations={fleetLocations} heatmapData={heatmap} mode={mapMode} />
                
                {/* Map Overlay Decor */}
                <div className="absolute top-6 right-6 z-[1000] pointer-events-none space-y-4">
                   {mapMode === 'heatmap' && (
                      <div className="bg-rose-950/90 backdrop-blur-xl border border-rose-500/30 p-6 rounded-2xl max-w-xs shadow-xl animate-in fade-in zoom-in slide-in-from-right-8 duration-500 pointer-events-auto">
                        <div className="flex items-center gap-3 mb-3">
                           <Activity className="w-5 h-5 text-rose-500" />
                           <h3 className="text-white font-bold text-xs uppercase tracking-widest">Densidad de Anuncios</h3>
                        </div>
                        <p className="text-[10px] text-rose-200/80 font-medium leading-relaxed uppercase tracking-wider">Visualización de impactos publicitarios entregados en zonas geográficas clave.</p>
                        <div className="mt-4 h-1 w-full bg-rose-500/20 rounded-full overflow-hidden">
                           <div className="h-full bg-rose-500 w-3/4 animate-pulse" />
                        </div>
                      </div>
                   )}
                   <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 p-5 rounded-2xl max-w-[180px] shadow-lg pointer-events-auto">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Leyenda de Flota</p>
                      <div className="space-y-2.5">
                         <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-tad-yellow" />
                            <span className="text-[10px] font-bold text-white uppercase">Vehículo Activo</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold text-white uppercase">Suscripción OK</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Sin Actividad</span>
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
      <div className="mt-16 py-8 border-t border-gray-800 flex flex-col items-center justify-center text-center opacity-70">
         <Navigation className="w-8 h-8 text-gray-600 mb-4" />
         <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">TAD DOOH OS • GPS CORE v4.5</p>
         <p className="text-[10px] font-medium text-gray-600 uppercase tracking-widest mt-2 px-6 py-1">© 2026 DIGITAL TAXI ADVERTISING</p>
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
      yellow: 'bg-gray-900 text-tad-yellow border-gray-700',
      emerald: 'bg-gray-900 text-emerald-500 border-gray-700',
      blue: 'bg-gray-900 text-blue-400 border-gray-700',
      purple: 'bg-gray-900 text-purple-400 border-gray-700',
   };

   const trendColorMap: Record<string, string> = {
      yellow: 'bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow',
      emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
      blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
   };

    return (
      <div 
        className={clsx(
          "bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-3xl group hover:-translate-y-1 hover:border-gray-600 transition-all duration-300 shadow-sm flex flex-col relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 fill-mode-both tracking-stats-card"
        )}
      >
         <style jsx>{`
           .tracking-stats-card { animation-delay: ${delay}ms; }
           .status-indicator-dot { background-color: ${color === 'yellow' ? '#fad400' : color === 'emerald' ? '#10b981' : color === 'blue' ? '#60a5fa' : color === 'purple' ? '#c084fc' : '#6b7280'}; }
         `}</style>
         <div className="flex justify-between items-start mb-6">
            <div className={clsx("p-3 rounded-xl border transition-all duration-500 shadow-sm group-hover:scale-110", colorMap[color] || 'bg-gray-900 border-gray-700 text-white')}>
               {icon}
            </div>
            <span className={clsx("text-[10px] font-bold px-3 py-1 rounded-full border transition-colors shadow-sm", trendColorMap[color] || 'bg-gray-800 border-gray-700 text-gray-400')}>
               {trend}
            </span>
         </div>
         <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
         <h3 className="text-3xl lg:text-4xl font-black text-white tracking-tight mb-3 transition-colors duration-500 leading-none">{value}</h3>
         <div className="flex items-center gap-2 mt-auto">
            <div className={clsx("w-1.5 h-1.5 rounded-full status-indicator-dot", trendColorMap[color] ? trendColorMap[color].split(' ')[2] : 'bg-gray-500')} />
            <p className="text-xs font-medium text-gray-500">{sub}</p>
         </div>
      </div>
    );
}
