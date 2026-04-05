import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import api, { sendCommand, getDevices, getOfflineDevices, getPendingDevices, approvePendingDevice, rejectPendingDevice } from '@/services/api';
import { RefreshCcw, Tablet, Wifi, WifiOff, Battery, HardDrive, MapPin, Gauge, Search, Power, Trash2, Zap, MonitorOff, Server, CheckCircle2, LayoutGrid, Terminal, Activity, Bell, Cpu, Clock, Copy, ExternalLink, Link2, Edit2, AlertTriangle, Check, RefreshCw, ShieldAlert, ShieldCheck, XCircle, Smartphone } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import DeviceModal from '@/components/DeviceModal';
import DeviceHubModal from '@/components/DeviceHubModal';
import { notifyChange } from '@/lib/sync-channel';
import { toast } from 'sonner';
import { StatusSemaphore, SemaphoreStatus } from '@/components/ui/StatusSemaphore';
import { AntigravityButton } from '@/components/ui/AntigravityButton';

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
  const [activeTab, setActiveTab] = useState<'monitoring' | 'alerts' | 'inventory' | 'pending'>('monitoring');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline' | 'santiago'>('all');
  const [commanding, setCommanding] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);

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

  // 🛡️ Pending Approvals
  const [pendingDevicesList, setPendingDevicesList] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

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

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const data = await getPendingDevices();
      setPendingDevicesList(data);
    } catch (e) {
      console.error('Pending error:', e);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  // Sincronización inteligente de pestañas
  useEffect(() => {
    if (activeTab === 'inventory') loadInventory();
    if (activeTab === 'alerts') loadAlerts();
    if (activeTab === 'pending') loadPending();
    if (activeTab === 'monitoring') mutateFleet();
  }, [activeTab, loadInventory, loadAlerts, loadPending, mutateFleet]);

  const handleCommand = async (deviceId: string, type: string) => {
    if (type === 'HUB') {
      setSelectedHubId(deviceId);
      setIsHubOpen(true);
      return;
    }
    setCommanding(deviceId);
    try {
      await sendCommand(deviceId, type);
      setStatusMessage(`Comando ${type} enviado`);
      setTimeout(() => setStatusMessage(null), 3000);
      toast.success(`Comando ${type} enviado con éxito a la terminal ${deviceId}`);
    } catch (err) {
      toast.error('FALLA DE SISTEMA: Error enviando comando de hardware.');
    } finally {
      setCommanding(null);
    }
  };

  const handleDeleteDevice = async (id: string, confirmed: boolean = false) => {
    if (!confirmed) {
       // We'll rely on AntigravityButton's confirmation for this call now.
       return;
    }
    try {
      await api.delete(`/devices/${id}`);
      setStatusMessage('Pantalla eliminada exitosamente');
      toast.success('PANTALLA PURGADA: El nodo ha sido removido de la red TAD.');
      mutateFleet();
      if (activeTab === 'inventory') loadInventory();
    } catch (err) {
      toast.error('ERROR CRÍTICO: No se pudo eliminar el dispositivo.');
    }
  };

  const tabs = [
    { id: 'monitoring', name: 'Monitoreo', icon: Activity },
    { id: 'alerts', name: 'Alertas', icon: Bell },
    { id: 'inventory', name: 'Inventario', icon: LayoutGrid },
    { id: 'pending', name: 'Pendientes', icon: ShieldAlert },
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
      <div className="mb-10 flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4 opacity-40">
            <div className="w-8 h-[1px] bg-white" />
            <p className="text-[9px] font-black text-white uppercase tracking-[0.5em]">Hardware / Fleet Monitoring</p>
          </div>
          <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-white uppercase italic flex items-center gap-4">
            <span className="bg-tad-yellow text-black px-4 py-1 rounded-sm not-italic mr-2 shadow-[0_0_30px_rgba(255,212,0,0.3)]">TAD</span>
            NODE <span className="text-zinc-700 text-3xl ml-2 font-light">MASTER CONSOLE</span>
          </h1>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
           <button 
             onClick={() => mutateFleet()}
             className="flex items-center gap-3 px-8 py-4 bg-zinc-900/50 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
           >
             <RefreshCcw className={clsx("w-4 h-4", isLoadingFleet && "animate-spin")} />
             Sync Integridad
           </button>
           <button 
             onClick={() => { setSelectedDevice(null); setIsModalOpen(true); }}
             className="flex items-center gap-3 px-8 py-4 bg-tad-yellow text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_40px_rgba(255,212,0,0.2)] hover:scale-[1.02] active:scale-95 transition-all"
           >
             <LayoutGrid className="w-4 h-4" />
             Vincular Pantalla
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard 
          label="Unidades Vinculadas" 
          value={Array.isArray(fleetData) ? fleetData.length : (fleetData?.total || 0)} 
          icon={Tablet} 
          color="text-white" 
        />
        <StatCard 
          label="Pantallas en Línea" 
          value={Array.isArray(fleetData) ? fleetData.filter((d: any) => d.is_online).length : (fleetData?.online || 0)} 
          icon={Wifi} 
          color="text-tad-yellow" 
          glow
        />
        <StatCard 
          label="Vault Global" 
          value="4.2 TB" 
          icon={HardDrive} 
          color="text-emerald-500" 
        />
        <StatCard 
          label="Estatus Energia" 
          value="Nominal" 
          icon={Zap} 
          color="text-white" 
        />
      </div>

      <div className="flex items-center gap-2 bg-zinc-905/40 p-1.5 rounded-2xl border border-white/5 shadow-2xl mb-10 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 relative",
              activeTab === tab.id 
                ? "bg-zinc-800 text-tad-yellow shadow-inner" 
                : "text-zinc-600 hover:text-zinc-400"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
            {tab.id === 'pending' && pendingDevicesList.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] text-white">
                {pendingDevicesList.length}
              </span>
            )}
          </button>
        ))}
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
                 {(['all', 'santiago', 'online', 'offline'] as const).map(f => (
                   <button 
                     key={f}
                     onClick={() => setFilter(f)}
                     className={clsx(
                       "px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                       filter === f 
                        ? (f === 'santiago' ? "bg-tad-yellow text-black shadow-[0_0_20px_rgba(255,212,0,0.4)]" : "bg-white text-black") 
                        : "bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10"
                     )}
                   >
                     {f === 'all' ? 'Ver Todos' : f === 'santiago' ? 'Santiago STI' : f === 'online' ? 'Online' : 'Offline'}
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

             <div className="p-8">
               {fleetError ? (
                 <div className="p-20 text-center bg-black/20 rounded-3xl border border-rose-500/10">
                   <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                   <p className="text-zinc-500 font-bold uppercase text-[10px]">Error cargando telemetría en tiempo real</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                   {(isLoadingFleet ? [1,2,3,4,5,6,7,8] : (Array.isArray(fleetData) ? fleetData : [])).filter((d: any) => {
                     if (isLoadingFleet) return true;
                     const matchSearch = d.device_id.toLowerCase().includes(search.toLowerCase()) || (d.taxi_number || '').toLowerCase().includes(search.toLowerCase()) || (d.city || '').toLowerCase().includes(search.toLowerCase());
                     if (filter === 'all') return matchSearch;
                     if (filter === 'santiago') return matchSearch && (d.device_id || '').startsWith('STI');
                     return matchSearch && (filter === 'online' ? d.is_online : !d.is_online);
                   }).map((device: any, i: number) => (
                     <DeviceGridCard 
                        key={isLoadingFleet ? i : device.id}
                        device={device}
                        isLoading={isLoadingFleet}
                        onCommand={handleCommand}
                        onConfigure={() => { setSelectedDevice(device); setIsModalOpen(true); }}
                        onDelete={() => handleDeleteDevice(device.id, true)}
                        isCommanding={commanding === device?.device_id}
                        playerLink={`${process.env.NEXT_PUBLIC_PLAYER_URL || 'https://proyecto-ia-tad-player.rewvid.easypanel.host'}/?deviceId=${device.device_id}`}
                     />
                   ))}
                 </div>
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

      {activeTab === 'pending' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-tad-yellow/20 bg-tad-yellow/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-tad-yellow/10 rounded-2xl text-tad-yellow shadow-[0_0_20px_rgba(255,212,0,0.1)]">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-white font-black uppercase tracking-tighter text-xl italic">Aprobación Pendiente</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Dispositivos que intentan ingresar a la red auditada</p>
                </div>
              </div>
              <button 
                onClick={loadPending}
                className="px-6 py-2.5 bg-tad-yellow/10 text-tad-yellow border border-tad-yellow/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-tad-yellow hover:text-black transition-all flex items-center gap-2"
              >
                <RefreshCw className={clsx("w-3 h-3", loadingPending && "animate-spin")} />
                Actualizar
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">ID Reportado (Hardware)</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Versión Cliente</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Primer Contacto</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Acciones (Control Total)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(loadingPending ? [1,2,3] : pendingDevicesList).map((device: any, i) => (
                    <tr key={device.deviceId || i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-6 whitespace-nowrap text-xs font-mono font-bold text-white uppercase tracking-wider">
                        {loadingPending ? <div className="h-4 w-24 bg-white/5 animate-pulse rounded" /> : device.deviceId}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-xs text-zinc-400 font-bold font-mono">
                         {loadingPending ? <div className="h-4 w-20 bg-white/5 animate-pulse rounded" /> : device.appVersion || 'Desconocida'}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-xs text-zinc-400 font-bold font-mono">
                        {loadingPending ? <div className="h-4 w-40 bg-white/5 animate-pulse rounded" /> : (device.lastSeen ? new Date(device.lastSeen).toLocaleString().toUpperCase() : 'SIN REGISTRO')}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap">
                        {loadingPending ? <div className="h-6 w-32 bg-white/5 animate-pulse rounded-full" /> : (
                          <div className="flex items-center gap-3">
                             <AntigravityButton
                               actionName="approve_pending_device"
                               onAsyncClick={async () => {
                                 try {
                                   await approvePendingDevice(device.deviceId);
                                   setStatusMessage('Dispositivo Aprobado');
                                   toast.success('ACCESO CONCEDIDO: El dispositivo ya forma parte de la flota activa.');
                                   loadPending();
                                   mutateFleet();
                                 } catch (e) {
                                   toast.error('FALLA DE AUTORIZACIÓN: No se pudo aprobar el dispositivo.');
                                 }
                               }}
                               variant="primary"
                               className="px-4 py-1.5 h-auto text-[9px] rounded-xl"
                             >
                               <ShieldCheck className="w-3 h-3" />
                               Aprobar
                             </AntigravityButton>
                             <AntigravityButton
                               actionName="reject_pending_device"
                               confirmMessage={`¿Rechazar (eliminar) dispositivo ${device.deviceId}?`}
                               onAsyncClick={async () => {
                                 try {
                                   await rejectPendingDevice(device.deviceId);
                                   setStatusMessage('Dispositivo Rechazado');
                                   toast.warning('SOLICITUD RECHAZADA: El dispositivo ha sido bloqueado de la red.');
                                   loadPending();
                                 } catch (e) {
                                   toast.error('ERROR: No se pudo procesar el rechazo del dispositivo.');
                                 }
                               }}
                               variant="danger"
                               className="px-4 py-1.5 h-auto text-[9px] rounded-xl"
                             >
                               <XCircle className="w-3 h-3" />
                               Rechazar
                             </AntigravityButton>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {pendingDevicesList.length === 0 && !loadingPending && (
                    <tr>
                      <td colSpan={4} className="px-8 py-32 text-center">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500/20 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-emerald-500 uppercase tracking-widest mb-2 italic">Sin Solicitudes Pendientes</h3>
                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest max-w-sm mx-auto leading-loose">No hay tablets nuevas intentando ingresar a la flota auditada en este momento.</p>
                      </td>
                    </tr>
                  )}
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

      <DeviceHubModal 
        isOpen={isHubOpen}
        onClose={() => setIsHubOpen(false)}
        deviceId={selectedHubId || ''}
      />

      {statusMessage && (
        <div className="fixed bottom-10 right-10 z-[100] bg-zinc-900 border border-tad-yellow/40 text-tad-yellow px-8 py-4 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right-20">
           <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-tad-yellow animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest">{statusMessage}</span>
           </div>
        </div>
      )}

    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, glow }: { label: string; value: string | number; icon: any; color: string; glow?: boolean }) {
  return (
    <div className="bg-[#111317] border border-white/[0.05] p-6 rounded-[24px] relative overflow-hidden transition-all duration-300">
      <div className="flex justify-between items-start mb-6">
        <div className={clsx("p-2.5 rounded-2xl border bg-transparent", 
           color === 'text-tad-yellow' ? 'border-[#FFD400]/40 text-[#FFD400]' : 
           color === 'text-emerald-500' ? 'border-emerald-500/40 text-emerald-500' : 'border-white/20 text-zinc-400',
           glow && "shadow-[0_0_20px_rgba(255,212,0,0.15)]"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-slate-600/50" />
      </div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <h3 className={clsx("text-4xl font-black tracking-tighter leading-none", 
         color === 'text-tad-yellow' ? 'text-[#FFD400]' : color, 
         glow && "text-shadow-glow"
      )}>
         {typeof value === 'number' && value < 10 ? `0${value}` : value}
      </h3>
    </div>
  );
}

function DeviceGridCard({ device, isLoading, onCommand, onConfigure, onDelete, isCommanding }: any) {
  if (isLoading) {
    return (
      <div className="bg-[#111317] border border-white/[0.05] rounded-[24px] p-6 h-[340px] animate-pulse">
        <div className="flex justify-between mb-8">
           <div className="w-10 h-10 bg-white/5 rounded-2xl" />
           <div className="w-16 h-4 bg-white/5 rounded-lg" />
        </div>
        <div className="space-y-4">
           <div className="h-6 w-3/4 bg-white/5 rounded-lg" />
           <div className="h-20 w-full bg-white/5 rounded-2xl" />
           <div className="h-10 w-full bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  const battery = device.battery_level ?? 0;
  const storage = device.storage_free || '0.0 GB';
  const city = device.city || 'Regional';
  const stream = device.player_status || 'IDLE';
  const slots = device.occupied_slots || 0;
  const maxSlots = device.max_slots || 15;
  const isPaid = device.subscription_status === 'PAID';

  // SRE SEMAPHORE LOGIC
  let healthStatus: SemaphoreStatus = 'optimum';
  const lastSeenDate = device.last_seen ? new Date(device.last_seen) : null;
  const offlineMoreThanOneHour = lastSeenDate && (new Date().getTime() - lastSeenDate.getTime() > 60 * 60 * 1000);

  if (!device.is_online || !isPaid) {
    healthStatus = 'critical';
  } else if (battery < 20 || (storage && parseFloat(storage) < 1)) {
    healthStatus = 'warning';
  }

  return (
    <div 
      onClick={() => onCommand(device.id, 'HUB')}
      className={clsx(
        "bg-[#111317] border border-white/[0.05] rounded-[24px] p-6 hover:border-[#FFD400]/30 transition-all duration-300 group relative overflow-hidden cursor-pointer active:scale-[0.98] animate-in fade-in slide-in-from-bottom-8",
        device.is_online ? "ring-1 ring-[#FFD400]/10" : ""
      )}
    >
      {/* GLOW BACKGROUND */}
      {device.is_online && <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD400]/5 blur-[60px] -mr-16 -mt-16 group-hover:bg-[#FFD400]/10 transition-all duration-500" />}

       <div className="flex justify-between items-start mb-6">
        <div className={clsx(
          "p-2.5 rounded-2xl border bg-transparent transition-all",
          device.is_online ? "border-[#FFD400]/40 text-[#FFD400]" : "border-white/20 text-zinc-400"
        )}>
          <Tablet className="w-5 h-5" />
        </div>
        
        <div className="flex items-start gap-2">
           <button 
             onClick={(e) => { e.stopPropagation(); onConfigure(); }}
             title="Editar Configuración"
             aria-label="Editar Configuración"
             className="p-2 mt-0.5 rounded-xl bg-white/5 border border-white/10 text-zinc-500 hover:text-[#FFD400] hover:border-[#FFD400]/30 transition-all"
           >
             <Edit2 className="w-4 h-4" />
           </button>
           <AntigravityButton
             actionName="delete_node"
             confirmMessage={`¿Eliminar nodo ${device.device_id}? Se perderán sus vínculos.`}
             onAsyncClick={async () => await onDelete()}
             variant="danger"
             className="p-2 mt-0.5 w-[34px] h-[34px] flex items-center justify-center rounded-xl"
             title="Eliminar Pantalla"
           >
             <Trash2 className="w-4 h-4" />
           </AntigravityButton>
           <div className="flex flex-col items-end gap-1.5 ml-1">
             <StatusSemaphore status={healthStatus} size="sm" />
             <div className={clsx(
               "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
               device.is_online ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]" : "bg-transparent text-slate-500 border-white/10"
             )}>
               {device.is_online ? '• Online' : '• Offline'}
             </div>
           </div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-xl font-black text-white tracking-tighter uppercase group-hover:text-[#FFD400] transition-colors duration-300">{device.device_id}</h4>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">SN: {device.taxi_number || 'STI-0000'}</p>
      </div>

      <div className="grid grid-cols-2 gap-y-4 gap-x-6 mb-6">
        <TelemetryMini label="BATERÍA" value={`${battery}%`} icon={Battery} color={battery < 20 ? 'text-rose-500' : 'text-emerald-500'} />
        <TelemetryMini label="LATENCIA" value={device.last_seen ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true }).toUpperCase() : 'N/A'} icon={Clock} />
        <TelemetryMini label="CIUDAD" value={city} icon={MapPin} />
        <TelemetryMini label="STREAM" value={stream.toUpperCase()} icon={Activity} color={stream === 'playing' ? 'text-[#FFD400]' : 'text-slate-500'} />
      </div>

      <div className="mb-8 p-4 bg-black/40 rounded-[16px] border border-white/[0.05]">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Capacidad de Inventario</span>
          <span className="text-[9px] font-black text-white italic">{slots} / {maxSlots}</span>
        </div>
        <div className="h-1.5 w-full bg-[#111317] rounded-full overflow-hidden border border-white/[0.05]">
          <div className="progress-bar h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
        </div>
        <style jsx>{`
          .progress-bar {
            width: ${(slots / maxSlots) * 100}%;
          }
        `}</style>
        <p className="text-[8px] font-bold text-emerald-500/60 uppercase mt-2 tracking-widest flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3" /> Inventario Saludable
        </p>
      </div>

      <div className="flex gap-2">
         <button 
           onClick={(e) => { e.stopPropagation(); onCommand(device.device_id, 'RELOAD'); }} 
           disabled={isCommanding}
           className="flex-1 py-3 bg-white/[0.03] border border-white/[0.05] text-[9px] font-black uppercase tracking-widest text-slate-400 rounded-xl hover:bg-white hover:text-black transition-all disabled:opacity-50"
         >
           {isCommanding ? <RefreshCcw className="w-3 h-3 animate-spin mx-auto" /> : 'Reboot'}
         </button>
         <a 
           href={`${process.env.NEXT_PUBLIC_PLAYER_URL || 'https://proyecto-ia-tad-player.rewvid.easypanel.host'}/tad-driver.html?deviceId=${device.device_id}&server=${encodeURIComponent(process.env.NEXT_PUBLIC_API_URL || 'https://proyecto-ia-tad-api.rewvid.easypanel.host/api')}`}
           target="_blank"
           rel="noopener noreferrer"
           onClick={(e) => e.stopPropagation()}
           className="flex-1 py-3 bg-blue-500/10 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2"
           title="Business Hub del Conductor"
         >
           <Smartphone className="w-3 h-3" />
           Hub
         </a>
         <a 
           href={`${process.env.NEXT_PUBLIC_PLAYER_URL || 'https://proyecto-ia-tad-player.rewvid.easypanel.host'}/?deviceId=${device.device_id}`}
           target="_blank"
           rel="noopener noreferrer"
           onClick={(e) => e.stopPropagation()}
           className="flex-1 py-3 bg-[#FFD400]/10 border border-[#FFD400]/20 text-[9px] font-black uppercase tracking-widest text-[#FFD400] rounded-xl hover:bg-[#FFD400] hover:text-black transition-all flex items-center justify-center gap-2"
         >
           <ExternalLink className="w-3 h-3" />
           Live
         </a>
      </div>
    </div>
  );
}


function TelemetryMini({ label, value, icon: Icon, color = "text-slate-400" }: any) {
  return (
    <div className="space-y-1.5 border-l-2 border-white/[0.05] pl-3">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-slate-600" />
        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
      </div>
      <p className={clsx("text-[10px] font-black tracking-tight", color)}>{value}</p>
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

