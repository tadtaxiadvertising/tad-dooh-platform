import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import api, { sendCommand, getDevices, getOfflineDevices } from '../../services/api';
import { RefreshCcw, Tablet, Wifi, WifiOff, Battery, HardDrive, MapPin, Gauge, Search, Power, Trash2, Zap, MonitorOff, Server, CheckCircle2, LayoutGrid, Terminal, Activity, Bell, Cpu, Clock, Copy, ExternalLink, Link2, Edit2, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import DeviceModal from '../../components/DeviceModal';
import { notifyChange } from '../../lib/sync-channel';

const fetcher = (url: string) => api.get(url).then(res => res.data);

interface FleetDevice {
  id: string;
  device_id: string;
  deviceId?: string;
  taxi_number?: string;
  taxiNumber?: string;
  status: string;
  is_online: boolean;
  battery_level?: number;
  batteryLevel?: number;
  occupied_slots: number;
  max_slots: number;
  player_status?: string;
  last_seen?: string;
  lastSeen?: string;
  city?: string;
  storage_free?: string;
  storage_used?: number;
  storage_total?: number;
  app_version?: string;
  appVersion?: string;
}

// Helper: obtiene la base URL del API de producción
const getApiBase = () => {
  if (typeof window === 'undefined') return '';
  const stored = (window as unknown as Record<string, string>).TAD_API_URL;
  if (stored) return stored;
  // En producción usa la URL del backend desplegado en EasyPanel
  return process.env.NEXT_PUBLIC_API_URL || 'https://proyecto-ia-tad-api.rewvid.easypanel.host/api';
};

const getTelemetryUrl = (deviceId: string) => {
  // Points to the new tad-driver.html business hub, pre-filling the deviceId and server via URL
  const base = process.env.NEXT_PUBLIC_PLAYER_URL || 'https://proyecto-ia-tad-player.rewvid.easypanel.host';
  const api = getApiBase();
  return `${base}/tad-driver.html?deviceId=${deviceId}&server=${encodeURIComponent(api)}`;
};

function CopyButton({ value, label = 'URL' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };
  return (
    <button
      onClick={handleCopy}
      title={`Copiar ${label}`}
      className={clsx(
        'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border shrink-0',
        copied
          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
          : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-tad-yellow/10 hover:border-tad-yellow/30 hover:text-tad-yellow'
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado' : label}
    </button>
  );
}

export default function FleetPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'monitoring' | 'alerts' | 'inventory'>('monitoring');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [commanding, setCommanding] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);

  useEffect(() => {
    if (router.query.search) {
      setSearch(router.query.search as string);
    }
  }, [router.query.search]);

  // ⚡ Monitoring Data
  const { data: fleetData, mutate: mutateFleet, isLoading: isLoadingFleet, error: fleetError } = useSWR('/fleet/summary', fetcher, {
    refreshInterval: 30000,
  });
  
  // 🛰️ Inventory Data
  const [inventoryDevices, setInventoryDevices] = useState<FleetDevice[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');

  // 🚨 Alerts Data
  const [offlineDevices, setOfflineDevices] = useState<{ device_id: string; last_seen?: string }[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const loadInventory = useCallback(async () => {
    setLoadingInventory(true);
    try {
      const data = await getDevices();
      setInventoryDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Inventory error:', err);
    } finally {
      setLoadingInventory(false);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const data = await getOfflineDevices();
      setOfflineDevices(data);
    } catch (e) {
      console.error('Alerts error:', e);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'inventory') loadInventory();
    if (activeTab === 'alerts') loadAlerts();
  }, [activeTab, loadInventory, loadAlerts]);

  const handleCommand = async (deviceId: string, type: string) => {
    setCommanding(deviceId);
    try {
      await sendCommand(deviceId, type);
      setToast(`Comando ${type} enviado`);
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      alert('Error enviando comando');
    } finally {
      setCommanding(null);
    }
  };

  const tabs = [
    { id: 'monitoring', name: 'Monitoreo', icon: Activity },
    { id: 'alerts', name: 'Alertas', icon: Bell },
    { id: 'inventory', name: 'Inventario', icon: LayoutGrid },
  ];

  const getDeviceHealth = (d: FleetDevice) => {
    const battery = d.battery_level ?? d.batteryLevel ?? null;
    const storagePct = d.storage_used && d.storage_total ? (d.storage_used / d.storage_total) * 100 : null;
    if (battery !== null && battery < 15) return 'critical';
    if (storagePct !== null && storagePct > 90) return 'critical';
    if (d.status === 'offline') return 'warning';
    if (battery !== null && battery < 40) return 'warning';
    return 'healthy';
  };

  const filteredInventory = inventoryDevices.filter(d => {
    const id = d.device_id || d.deviceId || '';
    const plate = d.taxi_number || d.taxiNumber || '';
    const matchSearch = id.toLowerCase().includes(search.toLowerCase()) || plate.toLowerCase().includes(search.toLowerCase());
    if (inventoryFilter === 'all') return matchSearch;
    return matchSearch && getDeviceHealth(d) === inventoryFilter;
  });

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-1000">
      
      {/* HEADER SECTION */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4 opacity-60">
            <div className="w-8 h-px bg-white/20" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Infraestructura / Red de Nodos</p>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white uppercase italic">
            Pantallas <span className="text-tad-yellow text-shadow-glow">TAD</span>
          </h1>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Centro de Control de Hardware y Telemetría</p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/40 p-1.5 rounded-2xl border border-white/5 shadow-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                "px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2.5",
                activeTab === tab.id 
                  ? "bg-tad-yellow text-black shadow-[0_0_20px_rgba(255,212,0,0.2)]" 
                  : "text-zinc-500 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'monitoring' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Total Nodos" value={Array.isArray(fleetData) ? fleetData.length : (fleetData?.total || 0)} icon={Server} color="text-white" />
            <StatCard label="En Línea" value={Array.isArray(fleetData) ? fleetData.filter(d => d.is_online).length : (fleetData?.online || 0)} icon={Wifi} color="text-emerald-500" />
            <StatCard label="Fuera de Línea" value={Array.isArray(fleetData) ? fleetData.filter(d => !d.is_online).length : (fleetData?.offline || 0)} icon={WifiOff} color="text-rose-500" />
            <StatCard label="Recatando Datos" value={isLoadingFleet ? '...' : 'ACTIVE'} icon={RefreshCcw} color="text-tad-yellow" />
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="relative group flex-1 max-w-xl">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-tad-yellow transition-all" />
                 <input 
                   type="text" 
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   placeholder="BUSCAR POR ID O NÚMERO DE UNIDAD..."
                   className="w-full bg-black/40 border border-white/[0.05] rounded-2xl py-4 pl-14 pr-6 text-[10px] font-bold uppercase tracking-[0.2em] outline-none focus:border-tad-yellow/30 transition-all placeholder:text-zinc-700"
                 />
              </div>

              <div className="flex gap-2">
                 {(['all', 'online', 'offline'] as const).map(f => (
                   <button 
                     key={f}
                     onClick={() => setFilter(f)}
                     className={clsx(
                       "px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                       filter === f ? "bg-white text-black" : "bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10"
                     )}
                   >
                     {f === 'all' ? 'Ver Todos' : f === 'online' ? 'Online' : 'Offline'}
                   </button>
                 ))}
                 <button 
                   onClick={() => mutateFleet()} 
                   title="Sincronizar Red de Nodos"
                   className="p-3 bg-tad-yellow/10 text-tad-yellow rounded-xl hover:bg-tad-yellow hover:text-black transition-all"
                 >
                   <RefreshCcw className={clsx("w-5 h-5", isLoadingFleet && "animate-spin")} />
                 </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {fleetError ? (
                <div className="p-20 text-center">
                  <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                  <p className="text-zinc-500 font-bold uppercase text-[10px]">Error cargando telemetría en tiempo real</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5">
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Estado</th>
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pantalla / Unidad</th>
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ubicación</th>
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Telemetría</th>
                      <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {(isLoadingFleet ? [1,2,3,4,5] : (Array.isArray(fleetData) ? fleetData : [])).filter((d: any) => {
                      if (isLoadingFleet) return true;
                      const matchSearch = d.device_id.toLowerCase().includes(search.toLowerCase()) || (d.taxi_number || '').toLowerCase().includes(search.toLowerCase());
                      if (filter === 'all') return matchSearch;
                      return matchSearch && (filter === 'online' ? d.is_online : !d.is_online);
                    }).map((device: any, i: number) => (
                      <tr key={isLoadingFleet ? i : device.id} className="hover:bg-white/[0.01] transition-all group">
                        <td className="px-8 py-6">
                          {isLoadingFleet ? <div className="h-4 w-20 bg-white/5 animate-pulse rounded" /> : (
                            <div className="flex items-center gap-3">
                              <div className={clsx(
                                "w-3 h-3 rounded-full shadow-lg",
                                device.is_online ? "bg-emerald-500 animate-pulse" : "bg-zinc-800"
                              )} />
                              <span className={clsx(
                                "text-[10px] font-black uppercase tracking-widest",
                                device.is_online ? "text-emerald-500" : "text-zinc-600"
                              )}>
                                {device.is_online ? 'Sincronizado' : 'Offline'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          {isLoadingFleet ? <div className="h-4 w-32 bg-white/5 animate-pulse rounded mb-2" /> : (
                            <>
                              <p className="text-xs font-black text-white group-hover:text-tad-yellow transition-colors">{device.device_id}</p>
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-1">{device.taxi_number || 'S/N'}</p>
                            </>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          {isLoadingFleet ? <div className="h-4 w-24 bg-white/5 animate-pulse rounded" /> : (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-zinc-600" />
                              <span className="text-[10px] font-bold text-zinc-400">{device.city || 'Regional'}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          {isLoadingFleet ? <div className="h-4 w-40 bg-white/5 animate-pulse rounded" /> : (
                            <div className="flex gap-4">
                              <TelemetryItem icon={Battery} value={device.battery_level ? `${device.battery_level}%` : '--'} color={device.battery_level && device.battery_level < 20 ? 'text-rose-500' : 'text-emerald-500'} />
                              <TelemetryItem icon={HardDrive} value={device.storage_free || '0B'} color="text-zinc-500" />
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          {isLoadingFleet ? <div className="h-8 w-24 bg-white/5 animate-pulse rounded" /> : (
                            <div className="flex items-center gap-2">
                              <a href={getTelemetryUrl(device.device_id)} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-tad-yellow/10 text-tad-yellow rounded-lg text-[9px] font-black uppercase hover:bg-tad-yellow hover:text-black transition-all">Hub</a>
                              <button onClick={() => handleCommand(device.device_id, 'RELOAD')} title="Reiniciar Terminal" className="p-2 bg-white/5 text-zinc-500 rounded-lg hover:text-white transition-all"><RefreshCw className={clsx("w-4 h-4", commanding === device.device_id && "animate-spin")} /></button>
                              <button onClick={() => { setSelectedDevice(device); setIsModalOpen(true); }} title="Configurar Nodo" className="p-2 bg-white/5 text-zinc-500 rounded-lg hover:text-tad-yellow transition-all"><Edit2 className="w-4 h-4" /></button>
                            </div>
                          )}
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

      {activeTab === 'alerts' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-rose-500/20 bg-rose-500/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-rose-500/10 rounded-2xl text-rose-500 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                  <MonitorOff className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-white font-black uppercase tracking-tighter text-xl italic">Alertas de Red</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Detección de unidades desconectadas y fuera de rango</p>
                </div>
              </div>
              <button 
                onClick={loadAlerts}
                className="px-6 py-2.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
              >
                Actualizar Alertas
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">ID Global</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Última Señal</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Gravedad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(loadingAlerts ? [1,2,3] : offlineDevices).map((device: any, i) => (
                    <tr key={device.device_id || i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-6 whitespace-nowrap text-xs font-mono font-bold text-white uppercase tracking-wider">
                        {loadingAlerts ? <div className="h-4 w-24 bg-white/5 animate-pulse rounded" /> : device.device_id}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-xs text-zinc-400 font-bold font-mono">
                        {loadingAlerts ? <div className="h-4 w-40 bg-white/5 animate-pulse rounded" /> : (device.last_seen ? new Date(device.last_seen).toLocaleString().toUpperCase() : 'SIN REGISTRO')}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap">
                        {loadingAlerts ? <div className="h-6 w-32 bg-white/5 animate-pulse rounded-full" /> : (
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-4 py-1.5 rounded-full border border-rose-500/20">
                              {device.last_seen ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true }).toUpperCase() : 'DESCONEXIÓN TOTAL'}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {offlineDevices.length === 0 && !loadingAlerts && (
                    <tr>
                      <td colSpan={3} className="px-8 py-32 text-center">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500/20 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-emerald-500 uppercase tracking-widest mb-2 italic">Sistema Estable</h3>
                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest max-w-sm mx-auto leading-loose">No se han detectado anomalías de red. Todas las terminales están operando nominalmente.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-zinc-900/50 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div className="relative group flex-1 max-w-xl">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-tad-yellow transition-all" />
                 <input 
                   type="text" 
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   placeholder="BUSCAR HARDWARE O PLACA..."
                   className="w-full bg-black/40 border border-white/[0.05] rounded-2xl py-4 pl-14 pr-6 text-[10px] font-bold uppercase tracking-[0.2em] outline-none focus:border-tad-yellow/30 transition-all placeholder:text-zinc-700"
                 />
              </div>

              <div className="flex gap-2">
                 {(['all', 'healthy', 'warning', 'critical'] as const).map(f => (
                   <button 
                     key={f}
                     onClick={() => setInventoryFilter(f)}
                     className={clsx(
                       "px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                       inventoryFilter === f ? "bg-tad-yellow text-black" : "bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10"
                     )}
                   >
                     {f === 'all' ? 'Ver Todos' : f === 'healthy' ? 'Nominal' : f === 'warning' ? 'Alertas' : 'Fallos'}
                   </button>
                 ))}
                 <button 
                   onClick={loadInventory} 
                   title="Actualizar Inventario"
                   className="p-3 bg-white/5 text-zinc-400 rounded-xl hover:bg-white/10 transition-all"
                 >
                   <RefreshCw className={clsx("w-5 h-5", loadingInventory && "animate-spin")} />
                 </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">ID Nodo</th>
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Salud Hardware</th>
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Build OS</th>
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Storage</th>
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Actividad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {(loadingInventory ? [1,2,3,4,5] : filteredInventory).map((device: any, i: number) => {
                    if (loadingInventory) {
                      return (
                        <tr key={i}>
                          <td colSpan={5} className="px-8 py-4"><div className="h-4 w-full bg-white/5 animate-pulse rounded" /></td>
                        </tr>
                      );
                    }
                    const health = getDeviceHealth(device);
                    const storagePct = device.storage_total ? Math.round(((device.storage_total - (parseFloat(device.storage_free) || 0)) / device.storage_total) * 100) : 0;
                    return (
                      <tr key={device.device_id} className="hover:bg-white/[0.01] transition-all group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <Cpu className="w-4 h-4 text-zinc-600" />
                            <span className="text-xs font-black text-white uppercase tracking-wider">{device.device_id}</span>
                          </div>
                          <p className="text-[9px] text-tad-yellow font-bold uppercase mt-1 tracking-widest">Placa: {device.taxi_number || 'S/N'}</p>
                        </td>
                        <td className="px-8 py-6">
                           <div className={clsx(
                             "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest",
                             health === 'healthy' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : health === 'warning' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                           )}>
                             {health === 'healthy' ? 'Ok' : health === 'warning' ? 'Alerta' : 'Crítico'}
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2">
                             <Terminal className="w-4 h-4 text-zinc-600" />
                             <span className="text-[10px] font-mono font-bold text-zinc-400 whitespace-nowrap">BUILD_V{device.app_version || '2.0.1'}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="w-full max-w-[120px]">
                              <div className="flex justify-between text-[9px] font-black text-zinc-600 mb-1.5 uppercase tracking-widest">
                                <span>Cache: {storagePct}%</span>
                              </div>
                              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div 
                                  className={clsx(
                                    "h-full rounded-full transition-all", 
                                    storagePct > 90 ? 'bg-rose-500' : 'bg-tad-yellow',
                                    storagePct >= 95 ? 'w-full' :
                                    storagePct >= 90 ? 'w-[90%]' :
                                    storagePct >= 80 ? 'w-[80%]' :
                                    storagePct >= 70 ? 'w-[70%]' :
                                    storagePct >= 60 ? 'w-[60%]' :
                                    storagePct >= 50 ? 'w-[50%]' :
                                    storagePct >= 40 ? 'w-[40%]' :
                                    storagePct >= 30 ? 'w-[30%]' :
                                    storagePct >= 20 ? 'w-[20%]' :
                                    storagePct >= 10 ? 'w-[10%]' : 'w-0'
                                  )} 
                                />
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2 text-zinc-500">
                             <Clock className="w-4 h-4" />
                             <span className="text-[10px] font-bold uppercase tracking-widest">{device.last_seen ? formatDistanceToNow(new Date(device.last_seen)).toUpperCase() : 'N/A'}</span>
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
      )}

      <DeviceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          mutateFleet();
          if (activeTab === 'inventory') loadInventory();
          if (activeTab === 'alerts') loadAlerts();
          notifyChange('DEVICES');
        }}
        device={selectedDevice}
      />

      {toast && (
        <div className="fixed bottom-10 right-10 z-[100] bg-zinc-900 border border-tad-yellow/40 text-tad-yellow px-8 py-4 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right-20">
           <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-tad-yellow animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest">{toast}</span>
           </div>
        </div>
      )}

    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-3xl group hover:border-white/10 transition-all shadow-xl relative overflow-hidden">
      <div className="flex justify-between items-start mb-6">
        <div className={clsx("p-3.5 rounded-2xl bg-white/5 border border-white/5", color)}>
          <Icon className="w-5 h-5 shadow-2xl" />
        </div>
      </div>
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">{label}</p>
      <h3 className={clsx("text-4xl font-black tracking-tighter italic", color)}>{value}</h3>
      <div className={clsx("absolute bottom-0 left-0 h-1 bg-current opacity-0 group-hover:opacity-10 transition-opacity w-full", color)} />
    </div>
  );
}

function TelemetryItem({ icon: Icon, value, color }: { icon: any; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-zinc-600" />
      <span className={clsx("text-[10px] font-bold uppercase tracking-widest", color)}>{value}</span>
    </div>
  );
}
