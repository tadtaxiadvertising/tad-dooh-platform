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
         <div className="absolute top-[-15%] left-[-10%] w-[65%] h-[65%] bg-tad-yellow/[0.04] blur-[180px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[5%] right-[-10%] w-[55%] h-[55%] bg-white/[0.01] blur-[160px] rounded-full" />
      </div>

      {/* Header Terminal */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-tad-yellow rounded-3xl flex items-center justify-center shadow-[0_20px_50px_rgba(255,212,0,0.15)]">
                <Cpu className="w-7 h-7 text-black" />
             </div>
             <div>
                <div className="flex items-center gap-3 mb-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow shadow-[0_0_8px_rgba(255,212,0,0.8)] animate-pulse" />
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Peripheral Hardware Lifecycle v4.2</p>
                </div>
                <h1 className="text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none font-display">
                  Hardware <span className="text-tad-yellow transition-all duration-700 hover:text-white cursor-default italic">Nexus</span>
                </h1>
             </div>
          </div>
          <p className="text-zinc-500 max-w-2xl text-[12px] font-bold uppercase tracking-widest leading-relaxed">
            Technical management of <span className="text-white">deployed infrastructure</span>.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-900/10 backdrop-blur-3xl p-1.5 rounded-full border border-white/5">
           <button
             onClick={() => { setSelectedDevice(null); setIsModalOpen(true); }}
             className="btn-primary px-10 h-14 flex items-center gap-4"
           >
             <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" />
             Link_Terminal
           </button>
           <button
             onClick={loadData}
             className="btn-pill px-8 border border-white/5 text-zinc-400 hover:bg-white/5 flex items-center gap-3"
           >
             <RefreshCcw className={clsx("w-4 h-4 transition-transform duration-700", loading ? "animate-spin" : "group-hover:rotate-180")} />
             Sync_Core
           </button>
        </div>
      </div>

      {/* Global Health Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
        {[
          { label: 'Unidades Totales', value: devices.length, icon: Server, color: 'white', shadow: 'white' },
          { label: 'Operativo Nominal', value: healthCounts.healthy, icon: CheckCircle2, color: 'emerald-500', shadow: 'emerald-500' },
          { label: 'Advertencia Nodo', value: healthCounts.warning, icon: AlertTriangle, color: 'amber-400', shadow: 'amber-400' },
          { label: 'Falla Crítica', value: healthCounts.critical, icon: AlertTriangle, color: 'rose-500', shadow: 'rose-500' },
        ].map((s, i) => (
          <div key={i} className="bg-zinc-950/40 backdrop-blur-3xl border border-white/5 p-8 rounded-[2.5rem] group hover:border-white/10 transition-all duration-500 relative overflow-hidden">
            <div className={clsx("absolute -right-6 -bottom-6 w-24 h-24 blur-[40px] opacity-10", `bg-${s.shadow}`)} />
            <div className="flex justify-between items-start mb-6">
              <div className={clsx("p-4 rounded-2xl border transition-all duration-500 group-hover:scale-110 shadow-2xl", `bg-${s.color}/10 border-${s.color}/20 text-${s.color}`)}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1 italic">{s.label}</p>
            <h3 className={clsx("text-4xl font-black italic tracking-tighter leading-none", `text-${s.color}`)}>{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Controller Bar */}
      <div className="flex flex-col xl:flex-row gap-6 mb-12 items-center">
        <div className="relative flex-1 w-full group">
          <div className="absolute inset-0 bg-tad-yellow/5 blur-[40px] opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-600 group-focus-within:text-tad-yellow transition-colors" />
          <input
            type="text"
            placeholder="PROBE HARDWARE MANIFEST..."
            className="w-full bg-zinc-900/10 border border-white/5 rounded-full py-5 pl-16 pr-8 text-[11px] font-black uppercase tracking-[0.3em] text-white outline-none focus:border-tad-yellow transition-all placeholder:text-zinc-800 backdrop-blur-3xl shadow-2xl relative z-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex p-1 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-full shadow-2xl">
          {(['all', 'healthy', 'warning', 'critical'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all italic border',
                filter === f
                  ? 'bg-tad-yellow text-black border-transparent shadow-lg shadow-tad-yellow/10'
                  : 'bg-transparent text-zinc-500 border-transparent hover:text-white hover:bg-white/5'
              )}
            >
              {f === 'all' ? 'All' : f === 'healthy' ? 'Healthy' : f === 'warning' ? 'Warning' : 'Critical'}
            </button>
          ))}
        </div>
      </div>

      {/* Hardware Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-zinc-900/20 backdrop-blur-3xl animate-pulse rounded-[3rem] border border-white/5" />)
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-40 border-2 border-dashed border-white/5 rounded-[4rem] bg-zinc-950/20 flex flex-col items-center justify-center text-center opacity-0 animate-in fade-in duration-1000 fill-mode-both">
            <div className="w-24 h-24 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-3xl">
               <Tablet className="w-12 h-12 text-zinc-800" />
            </div>
            <h3 className="text-3xl font-black text-zinc-700 uppercase italic tracking-[0.2em] leading-none mb-4">Nodo No Detectado</h3>
            <p className="text-zinc-800 font-bold uppercase tracking-[0.2em] text-[10px] max-w-sm leading-relaxed">
               No se han encontrado terminales que coincidan con los criterios de búsqueda en el cluster activo.
            </p>
          </div>
        ) : (
          filtered.map((device, idx) => {
            const health = getDeviceHealth(device);
            const id = device.device_id || device.deviceId || 'Unknown';
            const plate = device.taxi_number || device.taxiNumber || '—';
            const battery = device.battery_level ?? device.batteryLevel ?? null;
            const version = device.app_version || device.appVersion || '—';
            const lastSeen = device.last_seen || device.lastSeen;

            return (
              <div 
                key={id} 
                className={clsx(
                  'group relative bg-zinc-950/60 backdrop-blur-3xl border rounded-[3rem] p-8 transition-all duration-700 hover:shadow-3xl flex flex-col animate-in fade-in slide-in-from-bottom-8 [fill-mode:both] overflow-hidden',
                  health === 'critical' ? 'border-rose-500/20' : health === 'warning' ? 'border-amber-500/10' : 'border-white/5 hover:border-tad-yellow/20',
                  `[animation-delay:${idx * 40}ms]`
                )}
              >
                {/* Visual Accent */}
                <div className={clsx(
                  "absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-700",
                  health === 'critical' ? 'bg-rose-500' : health === 'warning' ? 'bg-amber-400' : 'bg-tad-yellow'
                )} />

                <div className="flex items-start justify-between mb-8 relative z-10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                       <Zap className={clsx("w-4 h-4", health === 'critical' ? 'text-rose-500' : 'text-tad-yellow')} />
                       <p className="text-[11px] font-black text-white italic tracking-[0.1em] uppercase group-hover:text-tad-yellow transition-colors">{id}</p>
                    </div>
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em] flex items-center gap-2 italic">
                       <ShieldCheck className="w-3 h-3" /> PLACA: <span className="text-zinc-400">{plate}</span>
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => { setSelectedDevice(device); setIsModalOpen(true); }}
                      title="Sincronizar Nodo"
                      className="w-10 h-10 bg-white/5 hover:bg-tad-yellow hover:text-black rounded-xl flex items-center justify-center text-zinc-500 transition-all shadow-xl group/btn"
                    >
                      <Edit2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                    </button>
                    <div className={clsx(
                      'px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest h-fit border shadow-2xl italic',
                      device.status === 'online' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 animate-pulse' 
                        : 'bg-zinc-900 text-zinc-700 border-white/5'
                    )}>
                      {device.status === 'online' ? '● uplink' : '○ offline'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                  <div className="bg-black/40 rounded-2xl p-4 border border-white/5 group/metric transition-colors hover:border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <Battery className={clsx('w-4 h-4', battery !== null && battery < 20 ? 'text-rose-500 animate-pulse' : 'text-zinc-600 group-hover/metric:text-tad-yellow')} />
                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest italic">Energía Nodo</span>
                    </div>
                    <p className="text-xl font-black text-white italic">{battery !== null ? `${battery}%` : '—'}</p>
                  </div>
                  <div className="bg-black/40 rounded-2xl p-4 border border-white/5 group/metric transition-colors hover:border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <HardDrive className="w-4 h-4 text-zinc-600 group-hover/metric:text-tad-yellow" />
                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest italic">Core Firmware</span>
                    </div>
                    <p className="text-xl font-black text-white italic">v{version}</p>
                  </div>
                  <div className="col-span-2 bg-black/40 rounded-2xl p-5 border border-white/5 group/metric transition-colors hover:border-white/10">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <Clock className="w-4 h-4 text-zinc-600 group-hover/metric:text-tad-yellow" />
                         <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest italic group-hover/metric:text-zinc-400 transition-colors">Último Reporte Técnico</span>
                       </div>
                       <Activity className={clsx("w-3.5 h-3.5", device.status === 'online' ? "text-emerald-500" : "text-zinc-800")} />
                    </div>
                    <p className="text-xs font-black text-zinc-400 italic mt-3 uppercase tracking-tight">
                      {lastSeen ? `REPORTADO HACE ${formatDistanceToNow(new Date(lastSeen)).toUpperCase()}` : 'SIN ACTIVIDAD REGISTRADA'}
                    </p>
                  </div>
                </div>

                <div className={clsx(
                  'mt-auto pt-6 border-t flex items-center justify-between relative z-10',
                  health === 'critical' ? 'border-rose-500/20' : health === 'warning' ? 'border-amber-500/10' : 'border-white/5'
                )}>
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'w-2 h-2 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]',
                      health === 'healthy' ? 'bg-emerald-500 shadow-emerald-500/50' : health === 'warning' ? 'bg-amber-400 shadow-amber-400/50' : 'bg-rose-500 shadow-rose-500/50 animate-pulse'
                    )} />
                    <span className={clsx(
                      'text-[10px] font-black uppercase tracking-[0.2em] italic',
                      health === 'healthy' ? 'text-emerald-500' : health === 'warning' ? 'text-amber-400' : 'text-rose-500'
                    )}>
                      {health === 'healthy' ? 'Estatus Nominal' : health === 'warning' ? 'Alerta Periférica' : 'Fallo de Segmento'}
                    </span>
                  </div>
                  <div className="flex -space-x-2">
                     {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center"><div className="w-1 h-1 bg-white/20 rounded-full" /></div>)}
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
      <div className="mt-20 py-10 border-t border-white/5 flex flex-col items-center justify-center opacity-30 text-center">
         <Cpu className="w-10 h-10 text-zinc-800 mb-4" />
         <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.5em] italic">TAD CORE OS &middot; HARDWARE INVENTORY v4.2</p>
         <p className="text-[8px] font-bold text-zinc-800 uppercase tracking-widest mt-2">© 2026 AUDITORÍA DE HARDWARE • PROTOCOLO DE RED TAD</p>
      </div>
    </div>
  );
}
