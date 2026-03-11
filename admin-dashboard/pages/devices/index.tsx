import { useState, useEffect } from 'react';
import { getDevices } from '../../services/api';
import { Tablet, Search, Wifi, WifiOff, Battery, HardDrive, Clock, RefreshCcw, AlertTriangle, CheckCircle2, Server, Plus, Edit2 } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import DeviceModal from '../../components/DeviceModal';

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getDevices();
      setDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Device inventory load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const getDeviceHealth = (d: any) => {
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
    <div className="animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Inventario de <span className="text-tad-yellow text-shadow-glow">Pantallas</span>
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Estado técnico del hardware desplegado. Batería, almacenamiento, versión de firmware y salud general de cada unidad en la red TAD.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setSelectedDevice(null); setIsModalOpen(true); }}
            className="flex gap-2 items-center bg-tad-yellow hover:bg-tad-yellow/90 text-black font-black py-3 px-6 rounded-xl transition-all active:scale-95 shadow-lg shadow-tad-yellow/10"
          >
            <Plus className="h-5 w-5" />
            Nueva Pantalla
          </button>
          <button
            onClick={loadData}
            className="group flex gap-2 items-center bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-6 rounded-xl border border-white/10 transition-all active:scale-95 shadow-lg"
          >
            <RefreshCcw className={clsx("h-5 w-5 text-tad-yellow", loading && "animate-spin")} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Pantallas', value: devices.length, icon: Server, color: 'text-white' },
          { label: 'Saludables', value: healthCounts.healthy, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Advertencia', value: healthCounts.warning, icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'Críticas', value: healthCounts.critical, icon: AlertTriangle, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <s.icon className={clsx('w-5 h-5', s.color)} />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{s.label}</span>
            </div>
            <p className={clsx('text-3xl font-black', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por ID de dispositivo o placa..."
            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-tad-yellow transition-colors"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'healthy', 'warning', 'critical'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border',
                filter === f
                  ? 'bg-tad-yellow text-black border-transparent'
                  : 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/20'
              )}
            >
              {f === 'all' ? 'Todos' : f === 'healthy' ? '🟢 OK' : f === 'warning' ? '🟡 Warn' : '🔴 Crit'}
            </button>
          ))}
        </div>
      </div>

      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 animate-pulse h-48" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <Tablet className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 font-bold">No se encontraron dispositivos</p>
          </div>
        ) : (
          filtered.map(device => {
            const health = getDeviceHealth(device);
            const id = device.device_id || device.deviceId || 'Unknown';
            const plate = device.taxi_number || device.taxiNumber || '—';
            const battery = device.battery_level ?? device.batteryLevel ?? null;
            const version = device.app_version || device.appVersion || '—';
            const lastSeen = device.last_seen || device.lastSeen;

            return (
              <div key={id} className={clsx(
                'bg-zinc-900/40 border rounded-2xl p-6 transition-all hover:border-white/10',
                health === 'critical' ? 'border-red-500/30' : health === 'warning' ? 'border-amber-500/20' : 'border-white/5'
              )}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-mono font-bold text-tad-yellow">{id}</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">Placa: {plate}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setSelectedDevice(device); setIsModalOpen(true); }}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <div className={clsx(
                      'px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider h-fit',
                      device.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                    )}>
                      {device.status === 'online' ? '● Online' : '○ Offline'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Battery className={clsx('w-4 h-4', battery !== null && battery < 20 ? 'text-red-400' : 'text-zinc-500')} />
                    <span className="text-xs text-zinc-400">{battery !== null ? `${battery}%` : '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs text-zinc-400">v{version}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs text-zinc-400">
                      {lastSeen ? `Visto hace ${formatDistanceToNow(new Date(lastSeen))}` : 'Sin reportar'}
                    </span>
                  </div>
                </div>

                <div className={clsx(
                  'mt-4 pt-3 border-t flex items-center gap-2',
                  health === 'critical' ? 'border-red-500/20' : health === 'warning' ? 'border-amber-500/10' : 'border-white/5'
                )}>
                  <div className={clsx(
                    'w-2 h-2 rounded-full',
                    health === 'healthy' ? 'bg-emerald-400' : health === 'warning' ? 'bg-amber-400' : 'bg-red-400'
                  )} />
                  <span className={clsx(
                    'text-[10px] font-black uppercase tracking-widest',
                    health === 'healthy' ? 'text-emerald-400' : health === 'warning' ? 'text-amber-400' : 'text-red-400'
                  )}>
                    {health === 'healthy' ? 'Hardware OK' : health === 'warning' ? 'Atención Requerida' : 'Estado Crítico'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <DeviceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        device={selectedDevice}
      />
    </div>
  );
}
