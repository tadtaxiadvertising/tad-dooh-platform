import { useState, useEffect, useCallback } from 'react';
import { getDevices } from '../../services/api';
import { Tablet, Search, Battery, HardDrive, Clock, RefreshCcw, AlertTriangle, CheckCircle2, Server, Plus, Edit2, Cpu, Activity, Zap, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import DeviceModal from '../../components/DeviceModal';
import { useTabSync } from '../../hooks/useTabSync';
import { notifyChange } from '../../lib/sync-channel';

export default function DevicesPage() {
  const [devices, setDevices] = useState<{ device_id?: string; deviceId?: string; taxi_number?: string; taxiNumber?: string; status: string; battery_level?: number; batteryLevel?: number; storage_used?: number; storage_total?: number; app_version?: string; appVersion?: string; last_seen?: string; lastSeen?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<{ device_id?: string; deviceId?: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDevices();
      setDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Device inventory load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useTabSync('DEVICES', loadData);

  useEffect(() => { loadData(); }, [loadData]);

  const getDeviceHealth = (d: { battery_level?: number; batteryLevel?: number; storage_used?: number; storage_total?: number; status: string }) => {
    const battery = d.battery_level ?? d.batteryLevel ?? null;
    const storagePct = d.storage_used && d.storage_total ? (d.storage_used / d.storage_total) * 100 : null;
    if (battery !== null && battery < 15) return 'critical';
    if (storagePct !== null && storagePct > 90) return 'critical';
    if (d.status === 'offline') return 'warning';
    if (battery !== null && battery < 40) return 'warning';
    return 'healthy';
  };

  const filtered = devices.filter(d => {
    const id = d.device_id || d.deviceId || '';
    const plate = d.taxi_number || d.taxiNumber || '';
    const matchSearch = id.toLowerCase().includes(search.toLowerCase()) || plate.toLowerCase().includes(search.toLowerCase());
    if (filter === 'all') return matchSearch;
    return matchSearch && getDeviceHealth(d) === filter;
  });

  const healthCounts = {
    healthy: devices.filter(d => getDeviceHealth(d) === 'healthy').length,
    warning: devices.filter(d => getDeviceHealth(d) === 'warning').length,
    critical: devices.filter(d => getDeviceHealth(d) === 'critical').length,
  };

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-tad-yellow/[0.04] blur-[150px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[0%] right-[-5%] w-[40%] h-[40%] bg-white/[0.01] blur-[120px] rounded-full" />
      </div>

      {/* Page Context Transition */}
      <div className="flex items-center gap-3 mb-8 opacity-60 pt-6">
        <div className="w-8 h-px bg-white/20" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Infrastructure / Node Inventory</p>
      </div>

      <div className="flex justify-end mb-6">
        <div className="flex items-center gap-4 bg-zinc-900/40 backdrop-blur-3xl p-1.5 rounded-2xl border border-white-[0.03] shadow-md">
           <button
             onClick={() => { setSelectedDevice(null); setIsModalOpen(true); }}
             className="px-6 py-2.5 bg-tad-yellow text-black hover:bg-yellow-400 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm group"
           >
             <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
             Vincular Pantalla
           </button>
           <button
             onClick={loadData}
             title="Sincronizar"
             className="w-10 h-10 bg-zinc-800 border border-white-[0.05] hover:bg-white/5 text-gray-400 rounded-xl flex items-center justify-center transition-colors group"
           >
             <RefreshCcw className={clsx("w-4 h-4 transition-transform", loading ? "animate-spin" : "group-hover:rotate-180")} />
           </button>
        </div>
      </div>

      {/* Global Health Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Unidades Totales', value: devices.length, icon: Server, color: 'text-white', bg: 'bg-white/10', border: 'border-white/10' },
          { label: 'Operativo Nominal', value: healthCounts.healthy, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Advertencia', value: healthCounts.warning, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
          { label: 'Falla Crítica', value: healthCounts.critical, icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
        ].map((s, i) => (
          <div key={i} className={clsx("bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-3xl group hover:border-gray-500 transition-all duration-300 relative overflow-hidden shadow-sm hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8 fill-mode-both", i === 0 ? 'delay-0' : i === 1 ? 'delay-50' : i === 2 ? 'delay-100' : 'delay-150')}>
            <div className="flex justify-between items-start mb-6">
              <div className={clsx("p-3 rounded-2xl border transition-all duration-300 shadow-sm", s.bg, s.border, s.color)}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
            <h3 className={clsx("text-3xl lg:text-4xl font-bold tracking-tight leading-none", s.color)}>{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Controller Bar */}
      <div className="flex flex-col xl:flex-row gap-4 mb-8 items-center bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-2 rounded-2xl shadow-sm">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-tad-yellow transition-colors" />
          <input
            type="text"
            placeholder="Buscar pantalla..."
            className="w-full bg-transparent border-none py-3 pl-14 pr-6 text-xs font-bold uppercase tracking-widest text-white outline-none placeholder:text-gray-500"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="h-8 w-px bg-gray-700/50 hidden xl:block mx-2" />
        <div className="flex gap-2 pr-2">
          {(['all', 'healthy', 'warning', 'critical'] as const).map((f, i) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all',
                filter === f
                  ? 'bg-tad-yellow text-black shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              )}
            >
              {f === 'all' ? 'Todos' : f === 'healthy' ? 'OK' : f === 'warning' ? 'Avisos' : 'Críticos'}
            </button>
          ))}
        </div>
      </div>

      {/* Hardware Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="h-56 bg-gray-800/40 backdrop-blur-xl animate-pulse rounded-3xl border border-gray-700/50" />)
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-32 border-2 border-dashed border-gray-700/50 rounded-3xl bg-gray-800/20 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
            <div className="w-20 h-20 bg-gray-900 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-gray-700">
               <Tablet className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">Pantalla No Detectado</h3>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] max-w-sm leading-relaxed">
               No hay terminales que coincidan con los criterios.
            </p>
          </div>
        ) : (
          filtered.map((device, idx) => {
            const health = getDeviceHealth(device);
            const id = device.device_id || device.deviceId || 'Unknown';
            const plate = device.taxi_number || device.taxiNumber || '—';
            const battery = device.battery_level ?? device.batteryLevel ?? null;
            const version = device.appVersion || device.app_version || '—';
            const lastSeen = device.last_seen || device.lastSeen;
            const driverName = (device as any).driver_name || 'Sin Asignar';
            const storageUsed = (device as any).storage_used;
            const storageTotal = (device as any).storage_total;
            const storagePct = storageUsed && storageTotal ? Math.round((storageUsed / storageTotal) * 100) : 0;
            const city = (device as any).city || 'N/A';
            const fleet = (device as any).fleet || 'TAD Core';
            const lastPlayback = (device as any).last_playback;

            return (
              <div 
                key={id} 
                className={clsx(
                  'group relative bg-gray-800/40 backdrop-blur-xl border rounded-3xl p-7 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col animate-in fade-in slide-in-from-bottom-8 fill-mode-both overflow-hidden',
                  health === 'critical' ? 'border-rose-500/30 shadow-[0_10px_40px_rgba(244,63,94,0.1)]' : health === 'warning' ? 'border-amber-500/30' : 'border-gray-700/50 hover:border-tad-yellow/40',
                  idx === 0 ? 'delay-0' : idx === 1 ? 'delay-50' : idx === 2 ? 'delay-100' : idx === 3 ? 'delay-150' : idx === 4 ? 'delay-200' : 'delay-250'
                )}
              >
                {/* Visual Accent */}
                <div className={clsx(
                  "absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-0 group-hover:opacity-30 transition-opacity duration-700",
                  health === 'critical' ? 'bg-rose-500' : health === 'warning' ? 'bg-amber-400' : 'bg-tad-yellow'
                )} />

                <div className="flex items-start justify-between mb-8 relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <div className={clsx("w-2 h-2 rounded-full", device.status === 'online' ? "bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" : "bg-gray-600")} />
                       <p className="text-sm font-black text-white tracking-widest uppercase group-hover:text-tad-yellow transition-colors">{id.slice(0, 8)}</p>
                    </div>
                    <p className="text-[10px] text-tad-yellow font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                       {driverName}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                       <span className="text-[9px] px-2 py-0.5 bg-gray-900/50 border border-gray-700/50 rounded text-gray-400 font-bold uppercase tracking-widest">{plate}</span>
                       <span className="text-[9px] px-2 py-0.5 bg-gray-900/50 border border-gray-700/50 rounded text-gray-400 font-bold uppercase tracking-widest">{city}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setSelectedDevice(device); setIsModalOpen(true); }}
                      title="Configurar Nodo"
                      className="w-10 h-10 bg-gray-900/80 border border-gray-700 hover:border-tad-yellow hover:text-tad-yellow rounded-2xl flex items-center justify-center text-gray-500 transition-all shadow-lg group/btn"
                    >
                      <Cpu className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                  <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl p-4 border border-gray-700/50 group-hover:bg-gray-900/80 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <Battery className={clsx('w-4 h-4', battery !== null && battery < 20 ? 'text-rose-500 animate-pulse' : 'text-gray-500')} />
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Energía</span>
                    </div>
                    <p className="text-xl font-black text-white leading-none">{battery !== null ? `${battery}%` : '—'}</p>
                  </div>

                  <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl p-4 border border-gray-700/50 group-hover:bg-gray-900/80 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-gray-500" />
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Uptime</span>
                    </div>
                    <p className="text-xl font-black text-white leading-none">v{version.replace('v', '')}</p>
                  </div>

                  {/* Storage Progress Bar */}
                  <div className="col-span-2 bg-gray-900/50 backdrop-blur-md rounded-2xl p-4 border border-gray-700/50 group-hover:bg-gray-900/80 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-gray-500" />
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Almacenamiento Local</span>
                      </div>
                      <span className={clsx("text-[10px] font-black", storagePct > 80 ? "text-rose-500" : "text-gray-300")}>{storagePct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700/30">
                       <div 
                         className={clsx(
                           "h-full rounded-full transition-all duration-1000", 
                           storagePct > 80 ? "bg-rose-500" : "bg-tad-yellow",
                           storagePct >= 100 ? "w-full" :
                           storagePct >= 90 ? "w-[90%]" :
                           storagePct >= 80 ? "w-[80%]" :
                           storagePct >= 70 ? "w-[70%]" :
                           storagePct >= 60 ? "w-[60%]" :
                           storagePct >= 50 ? "w-[50%]" :
                           storagePct >= 40 ? "w-[40%]" :
                           storagePct >= 30 ? "w-[30%]" :
                           storagePct >= 20 ? "w-[20%]" :
                           storagePct >= 10 ? "w-[10%]" : "w-0"
                         )}
                       />
                    </div>
                  </div>

                  {/* Fleet & Location */}
                  <div className="col-span-2 bg-gray-900/50 backdrop-blur-md rounded-2xl p-4 border border-gray-700/50 group-hover:bg-gray-900/80 transition-all flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Server className="w-4 h-4 text-gray-500" />
                       <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{fleet}</span>
                     </div>
                     <div className="text-right">
                        <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mb-0.5">Último Playback</p>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                           {lastPlayback ? formatDistanceToNow(new Date(lastPlayback)).toUpperCase() : 'N/A'}
                        </p>
                     </div>
                  </div>
                </div>

                <div className={clsx(
                  'mt-auto pt-5 border-t flex items-center justify-between relative z-10',
                  health === 'critical' ? 'border-rose-500/20' : health === 'warning' ? 'border-amber-500/20' : 'border-gray-700/50'
                )}>
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                     <Clock className="w-3.5 h-3.5" />
                     Visto {lastSeen ? formatDistanceToNow(new Date(lastSeen)).toUpperCase() : 'N/A'}
                  </div>
                  <div className={clsx(
                    'px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg border',
                    health === 'healthy' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : health === 'warning' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  )}>
                    {health === 'healthy' ? 'Sincronizado' : health === 'warning' ? 'Alerta' : 'Desconectado'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <DeviceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadData();
          notifyChange('DEVICES');
        }}
        device={selectedDevice}
      />
      
      {/* Footer Ledger */}
      <div className="mt-16 py-8 border-t border-gray-700/50 flex flex-col items-center justify-center text-center">
         <Cpu className="w-8 h-8 text-gray-600 mb-3" />
         <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">TAD DOOH &middot; PLATAFORMA ADMIN</p>
      </div>
    </div>
  );
}
