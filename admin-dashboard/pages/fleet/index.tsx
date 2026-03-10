import { useEffect, useState } from 'react';
import { getDevices, sendCommand, deleteDevice, getDeviceProfile } from '../../services/api';
import { RefreshCcw, Tablet, Wifi, WifiOff, Battery, HardDrive, MapPin, Gauge, Signal, SignalZero, Search, Power, Trash2, Info, Zap, Plus, X, User as UserIcon, Megaphone, CarFront } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import DeviceSlotsInfo from '../../components/DeviceSlotsInfo';

export default function FleetPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [commanding, setCommanding] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlaca, setNewPlaca] = useState('');
  const [newDriver, setNewDriver] = useState('');
  const [adding, setAdding] = useState(false);

  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getDevices();
      setDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fleet load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const handleCommand = async (deviceId: string, type: string) => {
    setCommanding(`${deviceId}-${type}`);
    try {
      await sendCommand(deviceId, type);
      setToast(`Comando ${type} enviado a ${deviceId}`);
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      console.error(e);
      setToast(`Error al enviar ${type}`);
    } finally {
      setCommanding(null);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaca || !newDriver) return;
    setAdding(true);
    try {
      // Direct fetch to our new endpoint
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const token = localStorage.getItem('tad_admin_token');
      
      const res = await fetch(`${API_URL}/fleet/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ placa: newPlaca, driverName: newDriver })
      });
      
      if (!res.ok) throw new Error('Fallo al registrar nodo');
      
      const data = await res.json();
      setToast(`✅ Nodo creado: ${data.device_id}`);
      setShowAddModal(false);
      setNewPlaca('');
      setNewDriver('');
      loadData();
    } catch (err: any) {
      setToast('⚠️ Error al agregar nodo');
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm(`¿Eliminar permanentemente el nodo ${deviceId}? Se borrará todo el historial.`)) return;
    try {
      await deleteDevice(deviceId);
      setDevices(prev => prev.filter(d => d.device_id !== deviceId && d.id !== deviceId));
      setToast('Nodo eliminado correctamente');
    } catch (err) {
      console.error(err);
      setToast('Error al eliminar nodo');
    }
  };

  const openProfile = async (deviceId: string) => {
    setLoadingProfile(true);
    try {
      const profile = await getDeviceProfile(deviceId);
      setSelectedProfile(profile);
    } catch (err) {
      console.error(err);
      setToast('Error al cargar perfil del nodo');
    } finally {
      setLoadingProfile(false);
    }
  };

  const onlineCount = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;
  const totalDevices = devices.length;

  return (
    <div className="animate-in fade-in duration-700 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Monitoreo de <span className="text-tad-yellow text-shadow-glow">Flota</span>
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Estado de sincronización en tiempo real de la red de hardware. Monitorea el estado de la batería, almacenamiento y conectividad de todas las unidades activas.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={loadData}
            className="group flex gap-2 items-center bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-6 rounded-xl border border-white/10 transition-all active:scale-95 shadow-lg"
          >
            <RefreshCcw className={clsx("h-5 w-5 text-tad-yellow", loading && "animate-spin")} />
            Sincronizar
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="group flex gap-2 items-center bg-tad-yellow hover:bg-yellow-400 text-black font-extrabold py-3 px-6 rounded-xl border border-transparent transition-all active:scale-95 shadow-[0_0_15px_rgba(250,212,0,0.3)]"
          >
            <Plus className="h-5 w-5" />
            Vincular Nodo
          </button>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h2 className="text-xl font-bold text-white">Vincular Nuevo Taxi</h2>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddDevice} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Placa del Vehículo</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: A-123456"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-tad-yellow transition-colors"
                  value={newPlaca}
                  onChange={e => setNewPlaca(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Nombre del Chofer</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Juan Pérez"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-tad-yellow transition-colors"
                  value={newDriver}
                  onChange={e => setNewDriver(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={adding}
                className="w-full mt-6 bg-tad-yellow hover:bg-yellow-400 text-black font-extrabold py-3 rounded-xl disabled:opacity-50 transition-all shadow-lg"
              >
                {adding ? 'Registrando...' : 'Generar UUID y Vincular'}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-24 right-8 bg-zinc-900 border border-white/10 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-right">
          <Info className="w-5 h-5 text-tad-yellow" />
          <span className="font-medium text-sm">{toast}</span>
        </div>
      )}

      {/* Fleet Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-950/50 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-tad-yellow/10 rounded-xl">
            <Tablet className="w-5 h-5 text-tad-yellow" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Flota Total</p>
            <p className="text-2xl font-black text-white">{totalDevices}</p>
          </div>
        </div>
        <div className="bg-zinc-950/50 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-xl">
            <Wifi className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">En Línea</p>
            <p className="text-2xl font-black text-white">{onlineCount}</p>
          </div>
        </div>
        <div className="bg-zinc-950/50 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-zinc-900 rounded-xl">
            <WifiOff className="w-5 h-5 text-zinc-600" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Fuera de Línea</p>
            <p className="text-2xl font-black text-zinc-400">{offlineCount}</p>
          </div>
        </div>
      </div>

      {/* Global Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 bg-zinc-950/50 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-tad-yellow transition-colors" />
          <input 
            type="text" 
            placeholder="BUSCAR POR TAXI, UUID O CIUDAD..."
            className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-[11px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-tad-yellow/40 transition-all placeholder:text-zinc-800"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
           {['all', 'online', 'offline'].map((f) => (
             <button
               key={f}
               onClick={() => setFilter(f as any)}
               className={clsx(
                 "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                 filter === f 
                  ? "bg-tad-yellow text-black shadow-lg shadow-tad-yellow/10" 
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/5"
               )}
             >
               {f === 'all' ? 'Todos' : f === 'online' ? 'En Línea' : 'Desconectados'}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && devices.length === 0 ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-zinc-900/40 animate-pulse rounded-2xl border border-white/5" />)
        ) : (
          devices
            .filter(d => {
              const matchesSearch = !search || 
                d.device_id.toLowerCase().includes(search.toLowerCase()) || 
                (d.taxi_number || '').toLowerCase().includes(search.toLowerCase()) ||
                (d.city || '').toLowerCase().includes(search.toLowerCase());
              const matchesFilter = filter === 'all' || d.status === filter;
              return matchesSearch && matchesFilter;
            })
            .map((device) => {
              const isOnline = device.status === 'online';
              const isPlaying = device.player_status === 'playing';
              const displayName = device.taxi_number || device.name || `TAXI-${device.device_id.slice(0, 8).toUpperCase()}`;
              
              return (
                <div key={device.device_id} className="relative bg-zinc-950 border border-white/10 rounded-2xl p-6 hover:border-tad-yellow/30 transition-all overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 right-0 p-4 flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteDevice(device.id); }}
                      className="p-1.5 bg-zinc-900/50 hover:bg-red-500/20 text-zinc-600 hover:text-red-500 rounded-lg transition-colors border border-white/5"
                      title="Eliminar Nodo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className={clsx(
                      "w-2.5 h-2.5 rounded-full mt-1.5",
                      isOnline ? "bg-tad-yellow shadow-[0_0_10px_rgba(250,212,0,0.5)] animate-pulse" : "bg-zinc-700"
                    )} />
                  </div>

                  <div 
                    className="cursor-pointer"
                    onClick={() => openProfile(device.id)}
                  >
                    <div className="flex items-start gap-4 mb-6">
                    <div className={clsx(
                      "p-3 rounded-xl transition-colors border border-white/5",
                      isOnline ? "bg-tad-yellow/10 text-tad-yellow" : "bg-zinc-900 text-zinc-500 group-hover:text-tad-yellow"
                    )}>
                      <Tablet className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg leading-tight uppercase tracking-tighter">
                        {displayName}
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-mono mt-1">UUID: {device.device_id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">
                        <Battery className="w-3 h-3 text-tad-yellow" /> Batería
                      </div>
                      <div className="text-sm font-bold text-white">
                        {device.battery_level != null ? `${device.battery_level}%` : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">
                        <HardDrive className="w-3 h-3 text-tad-yellow" /> Almacén.
                      </div>
                      <div className="text-sm font-bold text-white truncate">
                        {device.storage_free || 'Desconocido'}
                      </div>
                    </div>
                    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">
                        <MapPin className="w-3 h-3 text-tad-yellow" /> Zona
                      </div>
                      <div className="text-sm font-bold text-white">
                        {device.city || 'Global'}
                      </div>
                    </div>
                    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">
                        <Gauge className="w-3 h-3 text-tad-yellow" /> Estado Repo
                      </div>
                      <div className={clsx(
                        "text-[10px] font-black uppercase tracking-tighter",
                        isPlaying ? "text-tad-yellow" : "text-zinc-600"
                      )}>
                        {device.player_status || 'Standby'}
                      </div>
                    </div>
                  </div>

                  {/* Inventory Capacity Monitor (Rule of 15 slots) */}
                  <div className="mt-6 p-4 bg-zinc-900/30 border border-white/5 rounded-2xl">
                    <DeviceSlotsInfo deviceId={device.device_id} />
                  </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="text-[10px] text-zinc-600 flex items-center gap-2">
                      {isOnline ? <Wifi className="w-3 h-3 text-tad-yellow" /> : <WifiOff className="w-3 h-3" />}
                      ÚLTIMA SYNC: {device.last_seen ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true }).toUpperCase() : 'NUNCA'}
                    </div>
                    <span className={clsx(
                      "text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest",
                      isOnline ? "bg-tad-yellow/10 text-tad-yellow border-tad-yellow/20" : "bg-zinc-800 text-zinc-500 border-white/5"
                    )}>
                      {device.status}
                    </span>
                  </div>

                  {/* Advanced Remote Actions */}
                  <div className="mt-6 flex gap-2">
                    <button 
                      onClick={() => handleCommand(device.device_id, 'REBOOT')}
                      disabled={commanding === `${device.device_id}-REBOOT` || !isOnline}
                      className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5 transition-all disabled:opacity-30"
                      title="Reiniciar Aplicación"
                    >
                      <Power className={clsx("w-3 h-3", commanding === `${device.device_id}-REBOOT` && "animate-spin")} />
                      Reboot
                    </button>
                    <button 
                      onClick={() => handleCommand(device.device_id, 'CLEAR_CACHE')}
                      disabled={commanding === `${device.device_id}-CLEAR_CACHE` || !isOnline}
                      className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-tad-yellow text-zinc-500 hover:text-black py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5 transition-all disabled:opacity-30"
                      title="Limpiar Caché de Datos"
                    >
                      <Trash2 className={clsx("w-3 h-3", commanding === `${device.device_id}-CLEAR_CACHE` && "animate-spin")} />
                      Wipe
                    </button>
                    <button 
                      onClick={() => handleCommand(device.device_id, 'FORCE_SYNC')}
                      disabled={commanding === `${device.device_id}-FORCE_SYNC` || !isOnline}
                      className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-tad-yellow text-zinc-500 hover:text-black py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5 transition-all disabled:opacity-30"
                      title="Forzar Sincronización"
                    >
                      <RefreshCcw className={clsx("w-3 h-3", commanding === `${device.device_id}-FORCE_SYNC` && "animate-spin")} />
                      Sync
                    </button>
                  </div>
                </div>
              );
            })
        )}
        
        {devices.length === 0 && !loading && (
          <div className="col-span-full py-20 bg-zinc-900/30 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center">
            <WifiOff className="w-16 h-16 text-zinc-700 mb-4" />
            <h3 className="text-xl font-bold text-gray-400">No hay dispositivos conectados</h3>
            <p className="text-gray-500 mt-2 max-w-sm">
              Esperando el handshake del hardware. Las tablets aparecerán aquí una vez operen contra el API local.
            </p>
          </div>
        )}
      </div>

      {/* Node Profile Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-tad-yellow rounded-2xl shadow-xl shadow-tad-yellow/10">
                  <Tablet className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                    Perfil del <span className="text-tad-yellow">Nodo</span>
                  </h2>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">UUID: {selectedProfile.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedProfile(null)}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <UserIcon className="w-5 h-5 text-tad-yellow" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Chofer Vinculado</h3>
                  </div>
                  {selectedProfile.driver ? (
                    <div className="space-y-3">
                      <p className="text-lg font-bold text-white uppercase tracking-tighter">{selectedProfile.driver.fullName}</p>
                      <div className="space-y-2">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">WhatsApp: <span className="text-zinc-300 ml-2">{selectedProfile.driver.phone || 'N/A'}</span></p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">Suscripción: <span className={clsx("ml-2 font-black", selectedProfile.driver.subscriptionPaid ? "text-green-500" : "text-red-500")}>
                          {selectedProfile.driver.subscriptionPaid ? 'AL DÍA' : 'PENDIENTE'}
                        </span></p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">Placa Taxi: <span className="text-zinc-300 ml-2">{selectedProfile.driver.taxiPlate || 'N/A'}</span></p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest italic">Sin chofer asignado.</p>
                  )}
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <CarFront className="w-5 h-5 text-tad-yellow" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Hardware / Telemetría</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Serial ID</span>
                      <span className="text-xs font-bold text-white truncate max-w-[120px] font-mono uppercase">{selectedProfile.device_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Placa Taxi</span>
                      <span className="text-xs font-bold text-white uppercase">{selectedProfile.taxi_number || 'S/N'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Estado</span>
                      <span className={clsx("text-[10px] font-black uppercase", selectedProfile.status === 'online' ? "text-tad-yellow" : "text-zinc-500")}>
                        {selectedProfile.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Remote Actions in Modal */}
              <div className="flex gap-4">
                <button 
                  onClick={() => handleCommand(selectedProfile.device_id, 'REBOOT')}
                  disabled={commanding === `${selectedProfile.device_id}-REBOOT` || selectedProfile.status !== 'online'}
                  className="flex-1 flex items-center justify-center gap-3 bg-zinc-900 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all disabled:opacity-30"
                >
                  <Power className={clsx("w-4 h-4", commanding === `${selectedProfile.device_id}-REBOOT` && "animate-spin")} />
                  Reboot
                </button>
                <button 
                  onClick={() => handleCommand(selectedProfile.device_id, 'CLEAR_CACHE')}
                  disabled={commanding === `${selectedProfile.device_id}-CLEAR_CACHE` || selectedProfile.status !== 'online'}
                  className="flex-1 flex items-center justify-center gap-3 bg-zinc-900 hover:bg-tad-yellow text-zinc-500 hover:text-black py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all disabled:opacity-30"
                >
                  <Trash2 className={clsx("w-4 h-4", commanding === `${selectedProfile.device_id}-CLEAR_CACHE` && "animate-spin")} />
                  Wipe
                </button>
                <button 
                  onClick={() => handleCommand(selectedProfile.device_id, 'FORCE_SYNC')}
                  disabled={commanding === `${selectedProfile.device_id}-FORCE_SYNC` || selectedProfile.status !== 'online'}
                  className="flex-1 flex items-center justify-center gap-3 bg-zinc-900 hover:bg-tad-yellow text-zinc-500 hover:text-black py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all disabled:opacity-30"
                >
                  <RefreshCcw className={clsx("w-4 h-4", commanding === `${selectedProfile.device_id}-FORCE_SYNC` && "animate-spin")} />
                  Sync
                </button>
              </div>

              <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
                <div className="flex items-center gap-3 mb-6">
                  <Megaphone className="w-5 h-5 text-tad-yellow" />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest italic">Mix Publicitario</h3>
                </div>
                {selectedProfile.campaigns && selectedProfile.campaigns.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedProfile.campaigns.map((c: any) => (
                      <div key={c.id} className="p-3 bg-zinc-950 border border-white/5 rounded-2xl flex items-center gap-3 hover:border-tad-yellow/30 transition-all group/camp">
                        <div className="w-8 h-8 bg-tad-yellow/10 rounded-lg flex items-center justify-center shrink-0">
                          <Zap className="w-4 h-4 text-tad-yellow group-hover/camp:scale-110 transition-transform" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white truncate uppercase tracking-tight">{c.name}</p>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase">{c.advertiser}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center border border-dashed border-white/10 rounded-[2rem]">
                    <p className="text-[10px] text-zinc-700 font-black uppercase tracking-widest italic">No hay campañas transmitiendo.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {loadingProfile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all text-tad-yellow">
           <Zap className="w-12 h-12 animate-spin shadow-[0_0_30px_rgba(250,212,0,0.5)]" />
        </div>
      )}

      {/* Floating Notification */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 flex items-center gap-3 bg-tad-yellow text-black font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(250,212,0,0.3)] border border-yellow-200/50">
           <Zap className="w-4 h-4 animate-pulse" />
           {toast}
        </div>
      )}
    </div>
  );
}
