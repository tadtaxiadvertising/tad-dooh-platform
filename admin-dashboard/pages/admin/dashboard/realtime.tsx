'use client';

import React, {
  useState, useEffect, useCallback, useMemo, useRef
} from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import axios from 'axios';
import clsx from 'clsx';
import {
  Navigation, Radio, Map as MapIcon, ShieldAlert,
  Monitor, Activity, PlayCircle, Clock, Signal, AlertTriangle,
  Building2, Car, Tablet, RefreshCw, Search, ChevronDown,
  MapPin, Layers, Users, Wifi, WifiOff, Sun, Moon,
  Flame, Tv2, ChevronRight, X, Filter,
  CheckCircle2, Gauge as SpeedIcon,
} from 'lucide-react';
import api, { getDeviceRecentPath, getHeatmapData } from '@/services/api';

// ─────────────────────────────────────────────────────────────────────
// DYNAMIC IMPORTS  (everything that touches window/Leaflet)
// ─────────────────────────────────────────────────────────────────────
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#07080d] flex flex-col items-center justify-center gap-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.04),transparent)] animate-pulse" />
      <div className="relative">
        <div className="w-20 h-20 border-r-2 border-emerald-400 rounded-full animate-spin" />
        <Navigation className="absolute inset-0 m-auto w-8 h-8 text-emerald-400/40 animate-pulse rotate-45" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 animate-pulse z-10">
        Cargando geometría de Santiago…
      </p>
    </div>
  ),
});

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────
type TabId = 'geo' | 'fleet' | 'campaigns';
type GeoSegment = 'all' | 'taxis' | 'screens';
type MapMode = 'live' | 'heatmap';
type MapTheme = 'dark' | 'light';
type FleetFilter = 'all' | 'active' | 'offline' | 'unpaid';

interface Device {
  deviceId: string;
  taxiNumber: string;
  isOnline: boolean;
  lastSeen: string;
  lastLat: number | null;
  lastLng: number | null;
  // From /fleet/map endpoint
  driverName?: string;
  plate?: string;
  city?: string;
  batteryLevel?: number | null;
  subscriptionStatus?: string;
  speed?: number;
  // Enriched client-side
  assignedAdvertiser?: string;
  assignedCampaign?: string;
  assignedCampaignId?: string;
}

interface Campaign {
  id: string;
  name: string;
  advertiser: string;
  targetImpressions: number;
  metrics: Array<{ totalImpressions: number; deliveredImpressions: number }>;
  devices?: string[];
}

// ─────────────────────────────────────────────────────────────────────
// SMALL REUSABLE ATOMS
// ─────────────────────────────────────────────────────────────────────
function TabBtn({
  active, onClick, icon, label, badge,
}: {
  active: boolean; onClick: () => void;
  icon: React.ReactNode; label: string; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-200 select-none',
        active
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent',
      )}
    >
      <span className="size-3.5">{icon}</span>
      {label}
      {!!badge && (
        <span className={clsx(
          'absolute -top-1.5 -right-1.5 size-4 rounded-full text-[9px] font-black flex items-center justify-center',
          active ? 'bg-emerald-500 text-black' : 'bg-slate-600 text-white',
        )}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

function Chip({
  label, value, accent,
}: { label: string; value: string | number; accent: string }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center px-3.5 py-2 rounded-xl border text-center', accent)}>
      <span className="text-base font-black leading-none">{value}</span>
      <span className="text-[8px] font-bold uppercase tracking-widest opacity-70 mt-0.5">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// GEO TAB — full MapView + FleetSidebar + segmentation
// ─────────────────────────────────────────────────────────────────────
interface GeoTabProps {
  devices: Device[];
  campaigns: Campaign[];
}

function GeoTab({ devices, campaigns }: GeoTabProps) {
  // Map state
  const [mapMode, setMapMode] = useState<MapMode>('live');
  const [mapTheme, setMapTheme] = useState<MapTheme>(() =>
    typeof window !== 'undefined'
      ? (localStorage.getItem('tad_map_theme') as MapTheme) || 'dark'
      : 'dark',
  );
  const [heatmapIntensity, setHeatmapIntensity] = useState(0.5);
  const [heatmapRadius, setHeatmapRadius] = useState(28);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.4544, -70.6923]);
  const [mapZoom, setMapZoom] = useState(13);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recentPath, setRecentPath] = useState<any[]>([]);

  // Sidebar / filter state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [segment, setSegment] = useState<GeoSegment>('all');
  const [fleetFilter, setFleetFilter] = useState<FleetFilter>('all');
  const [selectedAdvertiser, setSelectedAdvertiser] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load heatmap when mode switches
  useEffect(() => {
    if (mapMode === 'heatmap' && heatmapData.length === 0) {
      getHeatmapData().then(setHeatmapData).catch(() => {});
    }
  }, [mapMode, heatmapData.length]);

  const toggleTheme = () => {
    const next: MapTheme = mapTheme === 'dark' ? 'light' : 'dark';
    setMapTheme(next);
    if (typeof window !== 'undefined') localStorage.setItem('tad_map_theme', next);
  };

  // Derived advertiser list
  const advertisers = useMemo(() => {
    const s = new Set<string>();
    campaigns.forEach(c => { if (c.advertiser) s.add(c.advertiser); });
    return Array.from(s).sort();
  }, [campaigns]);

  // Enrich devices with campaign info
  const enriched = useMemo<Device[]>(() => {
    return devices.map(dev => {
      const matched = campaigns.find(c => c.devices?.includes(dev.deviceId));
      return {
        ...dev,
        assignedAdvertiser: matched?.advertiser,
        assignedCampaign: matched?.name,
        assignedCampaignId: matched?.id,
      };
    });
  }, [devices, campaigns]);

  // Apply all filters
  const visible = useMemo(() => {
    return enriched.filter(dev => {
      const hasTaxi = !!dev.taxiNumber?.trim();
      if (segment === 'taxis' && !hasTaxi) return false;
      if (segment === 'screens' && hasTaxi) return false;

      if (fleetFilter === 'active' && !dev.isOnline) return false;
      if (fleetFilter === 'offline' && dev.isOnline) return false;
      if (fleetFilter === 'unpaid' && dev.subscriptionStatus === 'ACTIVE') return false;

      if (selectedAdvertiser !== 'all' && dev.assignedAdvertiser !== selectedAdvertiser) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          dev.deviceId.toLowerCase().includes(q) ||
          (dev.taxiNumber || '').toLowerCase().includes(q) ||
          (dev.driverName || '').toLowerCase().includes(q) ||
          (dev.assignedAdvertiser || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enriched, segment, fleetFilter, selectedAdvertiser, searchQuery]);

  const selectVehicle = useCallback(async (v: Device) => {
    if (!v.lastLat || !v.lastLng) return;
    setSelectedId(v.deviceId);
    setMapCenter([v.lastLat, v.lastLng]);
    setMapZoom(17);
    try {
      const path = await getDeviceRecentPath(v.deviceId);
      setRecentPath(path || []);
    } catch {
      setRecentPath([]);
    }
  }, []);

  // Stats
  const onlineCount   = visible.filter(d => d.isOnline).length;
  const offlineCount  = visible.length - onlineCount;
  const withGps       = visible.filter(d => d.lastLat && d.lastLng).length;

  // By advertiser table
  const byAdvertiser = useMemo(() => {
    const map: Record<string, { total: number; online: number }> = {};
    enriched.forEach(dev => {
      const k = dev.assignedAdvertiser || '— Sin campaña';
      if (!map[k]) map[k] = { total: 0, online: 0 };
      map[k].total++;
      if (dev.isOnline) map[k].online++;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [enriched]);

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* ── Top controls bar ──────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-white/5 bg-black/20 flex-shrink-0">
        {/* Segment pills */}
        <div className="flex gap-1 p-1 bg-slate-900/60 border border-white/5 rounded-xl">
          {([
            ['all',     'Todo',      <Layers   key="a" className="size-3" />],
            ['taxis',   'Taxis',     <Car      key="b" className="size-3" />],
            ['screens', 'Pantallas', <Tablet   key="c" className="size-3" />],
          ] as [GeoSegment, string, React.ReactNode][]).map(([val, lbl, ic]) => (
            <button key={val} onClick={() => setSegment(val)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                segment === val
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-500 hover:text-slate-200',
              )}>
              {ic}{lbl}
            </button>
          ))}
        </div>

        {/* Advertiser filter */}
        <div className="relative">
          <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-slate-500 pointer-events-none" />
          <select
            value={selectedAdvertiser}
            onChange={e => setSelectedAdvertiser(e.target.value)}
            className="pl-7 pr-7 py-2 text-[10px] font-bold text-slate-300 bg-slate-900/60 border border-white/5 rounded-xl appearance-none focus:outline-none focus:border-emerald-500/30 uppercase tracking-wider min-w-[160px]"
          >
            <option value="all">Todos anunciantes</option>
            {advertisers.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-slate-500 pointer-events-none" />
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[140px] max-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-slate-500" />
          <input
            type="text" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar taxi, pantalla…"
            className="w-full pl-7 pr-3 py-2 text-[10px] text-slate-300 bg-slate-900/60 border border-white/5 rounded-xl focus:outline-none focus:border-emerald-500/30 placeholder:text-slate-600"
          />
        </div>

        <div className="w-px h-6 bg-white/5" />

        {/* Map mode toggle */}
        <div className="flex gap-1 p-1 bg-slate-900/60 border border-white/5 rounded-xl">
          <button onClick={() => setMapMode('live')}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
              mapMode === 'live' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-200')}>
            <Wifi className="size-3" />Live
          </button>
          <button onClick={() => setMapMode('heatmap')}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
              mapMode === 'heatmap' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-500 hover:text-slate-200')}>
            <Flame className="size-3" />Heat
          </button>
        </div>

        {/* Theme toggle */}
        <button onClick={toggleTheme} title="Cambiar tema del mapa"
          className="size-8 flex items-center justify-center bg-slate-900/60 border border-white/5 rounded-xl text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all active:scale-90">
          {mapTheme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        </button>

        {/* Stats chips */}
        <div className="ml-auto flex gap-2">
          <Chip label="Visibles" value={visible.length}  accent="bg-slate-800/50 border-white/5 text-slate-300" />
          <Chip label="Online"   value={onlineCount}     accent="bg-emerald-500/10 border-emerald-500/20 text-emerald-400" />
          <Chip label="Offline"  value={offlineCount}    accent="bg-rose-500/10 border-rose-500/20 text-rose-400" />
          <Chip label="GPS"      value={withGps}         accent="bg-indigo-500/10 border-indigo-500/20 text-indigo-400" />
        </div>
      </div>

      {/* ── Heat controls (shown only when heatmap active) ── */}
      {mapMode === 'heatmap' && (
        <div className="flex items-center gap-6 px-5 py-2.5 border-b border-white/5 bg-black/30 flex-shrink-0 animate-in slide-in-from-top duration-300">
          <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Heatmap Controls</span>
          <label className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Intensidad
            <input type="range" min="0.1" max="1" step="0.1" value={heatmapIntensity}
              onChange={e => setHeatmapIntensity(+e.target.value)}
              className="w-24 accent-rose-500 h-1 rounded-lg cursor-pointer" />
            <span className="text-rose-400 w-6">{heatmapIntensity}</span>
          </label>
          <label className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Radio
            <input type="range" min="10" max="60" step="2" value={heatmapRadius}
              onChange={e => setHeatmapRadius(+e.target.value)}
              className="w-24 accent-rose-500 h-1 rounded-lg cursor-pointer" />
            <span className="text-rose-400 w-6">{heatmapRadius}</span>
          </label>
        </div>
      )}

      {/* ── Map area + sidebar ──────────────────── */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Full map */}
        <div className="flex-1 relative min-h-0">
          <MapView
            locations={visible as any}
            heatmapData={heatmapData}
            mode={mapMode}
            center={mapCenter}
            zoom={mapZoom}
            mapTheme={mapTheme}
            heatmapIntensity={heatmapIntensity}
            heatmapRadius={heatmapRadius}
            selectedId={selectedId}
            recentPath={recentPath}
            onClearSelection={() => { setSelectedId(null); setRecentPath([]); }}
            onViewHistory={(v: any) => selectVehicle(v)}
          />

          {/* Map overlay: legend */}
          <div className="absolute bottom-4 left-4 z-[500] flex gap-2 pointer-events-none">
            <div className="px-3 py-1.5 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />Online
            </div>
            <div className="px-3 py-1.5 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              <span className="size-2 rounded-full bg-zinc-600" />Offline
            </div>
            {selectedAdvertiser !== 'all' && (
              <div className="px-3 py-1.5 bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 rounded-lg flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-indigo-400">
                <Building2 className="size-2.5" />{selectedAdvertiser}
              </div>
            )}
          </div>
        </div>

        {/* Slide-in Fleet sidebar */}
        <div
          onClick={e => e.stopPropagation()}
          className={clsx(
            'h-full w-[380px] flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]',
            'bg-[#0e0f14]/90 backdrop-blur-3xl border-l border-white/[0.04] flex flex-col',
            sidebarOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          {/* Tab: pull handle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-1/2 -left-8 -translate-y-1/2 w-8 h-20 bg-[#0e0f14]/80 backdrop-blur-2xl border-y border-l border-white/5 rounded-l-2xl flex items-center justify-center text-emerald-500/40 hover:text-emerald-400 transition-all group shadow-xl"
          >
            {sidebarOpen
              ? <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              : <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
            }
          </button>

          {/* Sidebar header */}
          <div className="p-5 border-b border-white/[0.05] flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-1">Control de Flota</p>
                <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none flex items-center gap-2">
                  <span className="w-1 h-5 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" />
                  Geolocalización
                </h3>
              </div>
              <button onClick={() => setSidebarOpen(false)}
                className="size-9 rounded-xl bg-white/5 border border-white/5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all flex items-center justify-center">
                <X className="size-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" />
              <input type="search" placeholder="ID, unidad, conductor…"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-black/50 border border-white/[0.07] focus:border-emerald-500/30 rounded-xl py-3 pl-9 pr-4 text-[10px] font-bold uppercase tracking-widest text-white outline-none placeholder:text-slate-700 transition-all"
              />
            </div>

            {/* Fleet filter buttons */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {([
                ['all',     'Todo',    visible.length,                              'text-slate-400'],
                ['active',  'Online',  visible.filter(v => v.isOnline).length,      'text-emerald-500'],
                ['offline', 'Offline', visible.filter(v => !v.isOnline).length,     'text-slate-600'],
                ['unpaid',  'Mora',    visible.filter(v => v.subscriptionStatus !== 'ACTIVE').length, 'text-rose-500'],
              ] as [FleetFilter, string, number, string][]).map(([val, lbl, cnt, col]) => (
                <button key={val} onClick={() => setFleetFilter(val)}
                  className={clsx(
                    'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-tight transition-all',
                    fleetFilter === val
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-black/30 border-white/[0.05] text-slate-500 hover:border-white/10 hover:text-white',
                  )}>
                  <span className={clsx('text-[8px]', col)}>{cnt}</span>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-1.5">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-700 gap-2">
                <Filter className="size-8" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-center">Sin resultados</p>
              </div>
            ) : visible.map(dev => (
              <button
                key={dev.deviceId}
                onClick={() => selectVehicle(dev)}
                className={clsx(
                  'w-full text-left p-3.5 rounded-2xl border transition-all duration-300 group',
                  selectedId === dev.deviceId
                    ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                    : 'bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.03] hover:border-emerald-500/20',
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={clsx(
                    'size-10 rounded-xl border flex items-center justify-center font-mono text-[10px] font-black flex-shrink-0',
                    dev.isOnline
                      ? 'bg-black border-emerald-500/30 text-emerald-400'
                      : 'bg-black border-white/5 text-slate-700',
                  )}>
                    {dev.taxiNumber
                      ? dev.taxiNumber.replace(/[^0-9]/g, '').slice(-3)
                      : dev.deviceId.slice(-3)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-black text-slate-100 truncate group-hover:text-white transition-colors leading-none">
                        {dev.driverName || dev.deviceId}
                      </p>
                      <div className={clsx('size-1.5 rounded-full flex-shrink-0 ml-auto',
                        dev.isOnline ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-slate-700')} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {dev.taxiNumber && (
                        <span className="text-[8px] font-black text-emerald-400/70 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                          {dev.taxiNumber}
                        </span>
                      )}
                      {dev.plate && (
                        <span className="text-[8px] font-bold text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                          {dev.plate}
                        </span>
                      )}
                    </div>
                    {dev.assignedAdvertiser && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Building2 className="size-2.5 text-indigo-400 flex-shrink-0" />
                        <span className="text-[8px] font-bold text-indigo-400 truncate">{dev.assignedAdvertiser}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Telemetry micro row */}
                <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-white/[0.04]">
                  {dev.speed !== undefined && (
                    <span className="text-[8px] text-slate-500 flex items-center gap-1">
                      <SpeedIcon className="size-2.5 text-emerald-500/50" />
                      {(dev.speed || 0).toFixed(0)} km/h
                    </span>
                  )}
                  {dev.batteryLevel !== null && dev.batteryLevel !== undefined && (
                    <span className={clsx('text-[8px] flex items-center gap-1', (dev.batteryLevel || 0) < 20 ? 'text-rose-400' : 'text-slate-500')}>
                      <span className="size-2 rounded-sm border border-current" />
                      {dev.batteryLevel}%
                    </span>
                  )}
                  {dev.lastLat && (
                    <span className="text-[8px] text-teal-500/60 flex items-center gap-1 ml-auto">
                      <MapPin className="size-2.5" />
                      GPS
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-white/[0.04] flex-shrink-0 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse" />
              <div>
                <p className="text-[9px] font-black text-white uppercase tracking-widest leading-none">Telemetría Activa</p>
                <p className="text-[7px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">Santiago RD • Piloto STI</p>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
              <span className="text-[10px] font-black text-white">
                {visible.length} <span className="text-emerald-400">unidades</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Advertiser coverage table ─────────── */}
      <div className="flex-shrink-0 border-t border-white/5 bg-black/20">
        <div className="px-5 py-3 flex items-center gap-2 border-b border-white/[0.04]">
          <Users className="size-3.5 text-indigo-400" />
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Cobertura por Anunciante</h3>
        </div>
        <div className="overflow-x-auto max-h-40">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                <th className="px-5 py-2">Anunciante</th>
                <th className="px-5 py-2 text-center">Unidades</th>
                <th className="px-5 py-2 text-center">Online</th>
                <th className="px-5 py-2 text-center">Offline</th>
                <th className="px-5 py-2 text-center w-36">Cobertura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {byAdvertiser.map(([adv, stats]) => {
                const pct = stats.total > 0 ? (stats.online / stats.total) * 100 : 0;
                return (
                  <tr key={adv} className="hover:bg-white/[0.015] transition-colors group/row cursor-pointer"
                    onClick={() => setSelectedAdvertiser(adv === '— Sin campaña' ? 'all' : (selectedAdvertiser === adv ? 'all' : adv))}>
                    <td className="px-5 py-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-3 text-slate-600 flex-shrink-0" />
                        <span className="text-[9px] font-bold text-slate-300 truncate max-w-[160px] group-hover/row:text-white transition-colors">{adv}</span>
                      </div>
                    </td>
                    <td className="px-5 py-2 text-center text-[9px] font-black text-white">{stats.total}</td>
                    <td className="px-5 py-2 text-center">
                      <span className="text-[9px] font-black text-emerald-400">{stats.online}</span>
                    </td>
                    <td className="px-5 py-2 text-center">
                      <span className={clsx('text-[9px] font-black', (stats.total - stats.online) > 0 ? 'text-rose-400' : 'text-slate-600')}>
                        {stats.total - stats.online}
                      </span>
                    </td>
                    <td className="px-5 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-slate-800/80 rounded-full overflow-hidden">
                          <div
                            className={clsx('h-full rounded-full transition-all duration-700',
                              pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[8px] font-bold text-slate-600 w-7 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// FLEET TAB
// ─────────────────────────────────────────────────────────────────────
function FleetTab({ devices }: { devices: Device[] }) {
  const online  = devices.filter(d => d.isOnline).length;
  const offline = devices.length - online;

  const timeAgo = (iso: string | null) => {
    if (!iso) return 'NUNCA';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return 'AHORA';
    if (m < 60) return `${m}m atrás`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h atrás`;
    return `${Math.floor(h / 24)}d atrás`;
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Flota STI', val: devices.length, sub: 'pantallas piloto', color: 'border-white/5 text-white' },
          { label: 'Online',  val: online,  sub: `${((online / Math.max(devices.length,1))*100).toFixed(0)}% disponibles`, color: 'border-emerald-500/20 text-emerald-400', bg: 'bg-emerald-500/5' },
          { label: 'Offline', val: offline, sub: 'requieren revisión', color: 'border-rose-500/20 text-rose-400', bg: 'bg-rose-500/5' },
        ].map((k, i) => (
          <div key={i} className={clsx('p-5 rounded-2xl border flex flex-col gap-1', k.color, (k as any).bg || 'bg-slate-800/30')}>
            <span className={clsx('text-[9px] font-black uppercase tracking-widest', k.color)}>{k.label}</span>
            <span className={clsx('text-3xl font-black', k.color)}>{k.val}</span>
            <span className="text-[9px] text-slate-600">{k.sub}</span>
          </div>
        ))}
      </div>

      {/* Device grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {devices.map(dev => (
          <div key={dev.deviceId}
            className={clsx(
              'p-4 rounded-2xl border transition-all duration-300 group',
              dev.isOnline
                ? 'bg-slate-900/50 border-emerald-500/15 hover:border-emerald-500/35 hover:bg-emerald-500/5'
                : 'bg-slate-900/30 border-rose-500/10 opacity-65 hover:opacity-100',
            )}>
            <div className="flex items-center justify-between mb-3">
              <div className={clsx('size-9 rounded-xl flex items-center justify-center',
                dev.isOnline ? 'bg-emerald-500/15' : 'bg-rose-500/10')}>
                <Signal className={clsx('size-4', dev.isOnline ? 'text-emerald-400' : 'text-rose-400/50')} />
              </div>
              <div className={clsx('size-1.5 rounded-full',
                dev.isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]' : 'bg-rose-500/50')} />
            </div>
            <p className="text-[11px] font-black text-slate-200 group-hover:text-white transition-colors leading-none">{dev.deviceId}</p>
            <p className="text-[9px] font-mono text-slate-600 mt-0.5">Taxi: {dev.taxiNumber || '—'}</p>
            <div className="flex items-center gap-1 mt-2.5">
              <Clock className="size-2.5 text-slate-700" />
              <span className="text-[8px] text-slate-600">{timeAgo(dev.lastSeen)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// CAMPAIGNS TAB
// ─────────────────────────────────────────────────────────────────────
function CampaignsTab({ campaigns }: { campaigns: Campaign[] }) {
  if (!campaigns.length) return (
    <div className="flex flex-col items-center justify-center h-60 text-slate-700 gap-3">
      <PlayCircle className="size-12" />
      <p className="text-sm font-bold uppercase tracking-widest">Sin campañas activas</p>
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      {campaigns.map(camp => {
        const impressions = camp.metrics?.[0]?.totalImpressions || 0;
        const target      = camp.targetImpressions || 100_000;
        const progress    = Math.min((impressions / target) * 100, 100);
        const devices     = camp.devices?.length || 0;

        return (
          <div key={camp.id}
            className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 hover:border-indigo-500/20 transition-all duration-300 group">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="min-w-0">
                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-1">
                  <Building2 className="size-2.5" />{camp.advertiser}
                </p>
                <h3 className="text-sm font-black text-white truncate group-hover:text-indigo-200 transition-colors">{camp.name}</h3>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Pantallas</p>
                <p className="text-base font-black text-white">{devices}</p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-mono text-slate-600">
              <span>{impressions.toLocaleString()} impactos</span>
              <span>{progress.toFixed(1)}% de meta</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────
export default function RealtimeDashboard() {
  const [activeTab, setActiveTab]   = useState<TabId>('geo');
  const [devices, setDevices]       = useState<Device[]>([]);
  const [campaigns, setCampaigns]   = useState<Campaign[]>([]);
  const [loading, setLoading]       = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [devRes, campRes] = await Promise.all([
        api.get('/monitoring/fleet-status'),
        api.get('/monitoring/campaigns-status'),
      ]);
      // Filtramos exclusivamente los 10 taxis del piloto STI
      const pilotDevices = (devRes.data || []).filter((d: any) => {
        const numMatch = d.deviceId.match(/STI0*(\d+)/);
        if (!numMatch) return false;
        const num = parseInt(numMatch[1], 10);
        return num >= 1 && num <= 10;
      });
      setDevices(pilotDevices);
      setCampaigns(campRes.data || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Realtime fetch error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const online  = devices.filter(d => d.isOnline).length;
  const offline = devices.length - online;

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-200 selection:bg-emerald-500/30 font-sans">
      <Head>
        <title>TAD | Live Monitoring STI</title>
        <meta name="description" content="Dashboard de monitoreo en tiempo real — Flota DOOH Santiago, RD" />
      </Head>

      <div className="flex flex-col h-screen overflow-hidden">
        {/* ── Top header ──────────────────────── */}
        <header className="flex items-center gap-4 px-6 py-3.5 border-b border-white/[0.04] bg-slate-900/50 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-9 bg-emerald-500/15 border border-emerald-500/25 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Navigation className="text-emerald-400 size-4" />
            </div>
            <div>
              <h1 className="text-[13px] font-black text-white tracking-tight leading-none">TAD DRIVERS LIVE</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Radio className="size-2.5 text-rose-500 animate-pulse" />
                <p className="text-[8px] text-slate-500 font-mono tracking-widest uppercase">
                  Transmisión: {lastUpdate.toLocaleTimeString('es-DO')}
                </p>
              </div>
            </div>
          </div>

          <div className="h-7 w-px bg-white/5 mx-1" />

          <div className="flex gap-2">
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400">{online} Online</span>
            </div>
            {offline > 0 && (
              <div className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-[10px] font-black text-rose-400">{offline} Offline</span>
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-[8px] text-slate-500 font-mono uppercase tracking-widest">
              <MapIcon className="size-3 text-indigo-400" />Santiago · RD
            </div>
            <button onClick={fetchData} disabled={isRefreshing} title="Actualizar"
              className="size-8 flex items-center justify-center bg-slate-800/60 border border-white/5 rounded-xl text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all active:scale-90">
              <RefreshCw className={clsx('size-3.5', isRefreshing && 'animate-spin')} />
            </button>
            <button onClick={() => document.documentElement.requestFullscreen?.()}
              className="hidden md:flex px-3 py-1.5 bg-slate-800/60 border border-white/5 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-700 transition-colors items-center gap-1.5 active:scale-95">
              <Tv2 className="size-3" />Pantalla Completa
            </button>
            <button
              className="px-3 py-1.5 bg-rose-500/15 border border-rose-500/25 rounded-xl text-[10px] font-bold text-rose-400 hover:bg-rose-500/25 transition-colors flex items-center gap-1.5 active:scale-95">
              <ShieldAlert className="size-3" />Alertar Flota
            </button>
          </div>
        </header>

        {/* ── Tab nav ─────────────────────────── */}
        <nav className="flex items-center gap-2 px-6 py-2.5 border-b border-white/[0.04] bg-black/15 flex-shrink-0">
          <TabBtn active={activeTab === 'geo'}       onClick={() => setActiveTab('geo')}       icon={<MapPin    className="size-3.5" />} label="Geolocalización" />
          <TabBtn active={activeTab === 'fleet'}     onClick={() => setActiveTab('fleet')}     icon={<Monitor   className="size-3.5" />} label="Flota STI"        badge={offline} />
          <TabBtn active={activeTab === 'campaigns'} onClick={() => setActiveTab('campaigns')} icon={<PlayCircle className="size-3.5" />} label="Campañas"        badge={campaigns.length} />

          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-black/30 border border-white/[0.04] rounded-xl">
            <Activity className={clsx('size-3', isRefreshing ? 'text-emerald-400 animate-pulse' : 'text-slate-700')} />
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
              {isRefreshing ? 'Actualizando…' : 'Live · 30s'}
            </span>
          </div>
        </nav>

        {/* ── Tab content ─────────────────────── */}
        <div className="flex-1 overflow-hidden relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#07080d]">
              <div className="relative">
                <div className="w-16 h-16 border-r-2 border-emerald-400 rounded-full animate-spin" />
                <Navigation className="absolute inset-0 m-auto w-6 h-6 text-emerald-400/40 animate-pulse rotate-45" />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse">Cargando datos de flota…</p>
            </div>
          ) : (
            <>
              {/* GEO — full height, no scroll (map handles it) */}
              <div className={clsx('flex flex-col absolute inset-0', activeTab === 'geo' ? 'visible' : 'invisible pointer-events-none')}>
                <GeoTab devices={devices} campaigns={campaigns} />
              </div>

              {/* FLEET & CAMPAIGNS — scrollable */}
              <div className={clsx('absolute inset-0 overflow-y-auto custom-scrollbar', activeTab !== 'geo' ? 'visible' : 'invisible pointer-events-none')}>
                {activeTab === 'fleet'     && <FleetTab devices={devices} />}
                {activeTab === 'campaigns' && <CampaignsTab campaigns={campaigns} />}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Global CSS */}
      <style jsx global>{`
        .leaflet-container { font-family: 'Inter', sans-serif !important; background:#07080d!important; }
        .popup-clean .leaflet-popup-content-wrapper { background:transparent!important; box-shadow:none!important; padding:0!important; }
        .popup-clean .leaflet-popup-content { margin:0!important; width:auto!important; }
        .popup-clean .leaflet-popup-tip-container { display:none!important; }
        .leaflet-control-zoom { border:none!important; margin:24px!important; }
        .leaflet-control-zoom a {
          background:rgba(10,10,13,.9)!important;
          color:#10b981!important;
          border:1px solid rgba(255,255,255,.06)!important;
          width:40px!important; height:40px!important; line-height:40px!important;
          border-radius:10px!important;
          margin-bottom:6px!important;
          font-weight:900!important;
          transition:all .2s;
        }
        .leaflet-control-zoom a:hover {
          background:#10b981!important;
          color:#000!important;
          transform:translateY(-2px);
        }
        .custom-scrollbar::-webkit-scrollbar { width:4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background:transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.06); border-radius:10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background:rgba(16,185,129,0.25); }
        .no-scrollbar::-webkit-scrollbar { display:none; }
        .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
        @keyframes map-scan {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(1000%); }
        }
        .animate-map-scan { animation: map-scan 4s linear infinite; }
      `}</style>
    </div>
  );
}

