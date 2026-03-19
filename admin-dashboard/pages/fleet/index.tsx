import { useState } from 'react';
import useSWR from 'swr';
import api, { sendCommand, deleteDevice, updateDeviceProfile } from '../../services/api';
import { RefreshCcw, Tablet, Wifi, WifiOff, Battery, HardDrive, MapPin, Gauge, Search, Power, Trash2, Zap, Plus, X, User as UserIcon, CarFront, Edit2, Check, AlertTriangle, ShieldCheck, Cpu, ArrowRight, Radio } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import DeviceSlotsInfo from '../../components/DeviceSlotsInfo';
import { useTabSync } from '../../hooks/useTabSync';
import { notifyChange } from '../../lib/sync-channel';

const fetcher = (url: string) => api.get(url).then(res => res.data);

interface FleetDevice {
  id: string;
  device_id: string;
  taxi_number?: string;
  status: string;
  is_online: boolean;
  battery_level?: number;
  occupied_slots: number;
  max_slots: number;
  player_status?: string;
  last_seen?: string;
  city?: string; // Fallback for filtering
}

export default function FleetPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [commanding, setCommanding] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlaca, setNewPlaca] = useState('');
  const [newDriver, setNewDriver] = useState('');
  const [newDeviceId, setNewDeviceId] = useState('');
  const [adding, setAdding] = useState(false);

  const [selectedProfile, setSelectedProfile] = useState<{ id: string; device_id: string; taxi_number?: string; status: string; driver?: { fullName: string; phone?: string; subscriptionPaid: boolean; taxiPlate?: string }; campaigns?: { id: string; name: string; advertiser: string }[] } | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [, setLoadingProfile] = useState(false);
  const [, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ driver_name: '', driver_phone: '', taxi_number: '', subscription_paid: false });

  // ⚡ TAREA B: Frontend Refactor - Use Batch Endpoint via SWR
  // Consolidates 100+ requests into 1, caching natively with deduping.
  const { data: fleetData, error, isLoading, mutate } = useSWR('/fleet/summary', fetcher, {
    dedupingInterval: 60000,
    refreshInterval: 30000, // Replaces setInterval
    revalidateOnFocus: true
  });

  const devices: FleetDevice[] = Array.isArray(fleetData) ? fleetData : [];
  const loading = isLoading;

  useTabSync('DEVICES', mutate);

  const handleCommand = async (deviceId: string, type: string) => {
    setCommanding(`${deviceId}-${type}`);
    try {
      await sendCommand(deviceId, type);
      setToast(`PROTOCOLO ${type} TRANSMITIDO A ${deviceId}`);
      setTimeout(() => setToast(null), 4000);
    } catch (e) {
      console.error(e);
      setToast(`FALLA EN TRANSMISIÓN ${type}`);
    } finally {
      setCommanding(null);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaca || !newDriver) return;
    setAdding(true);
    try {
      await api.post('/fleet/register', { 
         placa: newPlaca, 
         driverName: newDriver, 
         deviceId: newDeviceId || undefined 
      });
      
      setToast(`✅ VINCULACIÓN EXITOSA: ${newPlaca}`);
      setShowAddModal(false);
      setNewPlaca('');
      setNewDriver('');
      setNewDeviceId('');
      await mutate(); // Replaced loadData()
      notifyChange('DEVICES');
    } catch (err: unknown) {
      setToast('⚠️ ERROR DE PROTOCOLO');
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm(`¿Proceder con la purga irreversible del nodo ${deviceId}? Todos los logs de auditoría serán eliminados.`)) return;
    try {
      await deleteDevice(deviceId);
      // No direct state manipulation needed if SWR revalidates
      await mutate(); // Revalidate SWR cache after deletion
      notifyChange('DEVICES');
      setToast('NODO PURGADO DEL CLUSTER');
    } catch (err) {
      console.error(err);
      setToast('FALLA EN PURGADO');
    }
  };

  const openProfile = async (deviceId: string) => {
    const baseDevice = devices.find(d => d.id === deviceId || d.device_id === deviceId);
    if (baseDevice) {
      setSelectedProfile({
        id: baseDevice.id,
        device_id: baseDevice.device_id,
        taxi_number: baseDevice.taxi_number,
        status: baseDevice.status,
      } as typeof selectedProfile);
    }
    setLoadingProfile(true);
    try {
      const profile = await getDeviceProfile(deviceId);
      setSelectedProfile(profile);
      setEditForm({
        driver_name: profile.driver?.fullName || '',
        driver_phone: profile.driver?.phone || '',
        taxi_number: profile.taxi_number || profile.driver?.taxiPlate || '',
        subscription_paid: profile.driver?.subscriptionPaid || false
      });
      setEditingProfile(false);
    } catch (err) {
      console.error(err);
      setToast('ERROR DE ACCESO AL PERFIL');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedProfile) return;
    setSavingProfile(true);
    try {
      await updateDeviceProfile(selectedProfile.device_id, editForm);
      setToast('REGISTRO SINCRONIZADO');
      notifyChange('DEVICES');
      await mutate(); // Revalidate SWR cache after profile update
      await openProfile(selectedProfile.device_id); 
    } catch (err) {
      console.error(err);
      setToast('FALLA EN ACTUALIZACIÓN');
    } finally {
      setSavingProfile(false);
    }
  };

  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const filteredDevices = devices.filter(d => {
    const matchesSearch = !search || 
      d.device_id.toLowerCase().includes(search.toLowerCase()) || 
      (d.taxi_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.city || '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || d.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-15%] left-[-10%] w-[65%] h-[65%] bg-tad-yellow/[0.04] blur-[180px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[5%] right-[-10%] w-[55%] h-[55%] bg-white/[0.01] blur-[130px] rounded-full" />
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-tad-yellow rounded-3xl flex items-center justify-center shadow-[0_20px_50px_rgba(255,212,0,0.15)]">
                <Tablet className="w-7 h-7 text-black" />
             </div>
             <div>
                <div className="flex items-center gap-3 mb-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow shadow-[0_0_8px_rgba(255,212,0,0.8)]" />
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Integrated Fleet Intelligence v4.2</p>
                </div>
                <h1 className="text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none font-display">
                  Fleet <span className="text-tad-yellow transition-all duration-700 hover:text-white cursor-default italic">Command</span>
                </h1>
             </div>
          </div>
          <p className="text-zinc-500 max-w-2xl text-[12px] font-bold uppercase tracking-widest leading-relaxed">
            Centralized <span className="text-white">hardware telemetry</span> and regional device distribution node.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-900/10 backdrop-blur-3xl p-1.5 rounded-full border border-white/5">
           <button 
             onClick={() => mutate()} // Changed from loadData to mutate
             disabled={loading}
             className="px-10 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 text-zinc-400 hover:bg-white/5 flex items-center gap-3 italic"
           >
             <RefreshCcw className={clsx("h-4 w-4", loading && "animate-spin text-tad-yellow")} />
             Sync_Nodes
           </button>
           <button 
             onClick={() => setShowAddModal(true)}
             className="bg-tad-yellow text-black px-10 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-4 hover:bg-yellow-400 transition-all shadow-xl shadow-tad-yellow/20 italic"
           >
             <Plus className="h-5 w-5" />
             Attach_Hardware
           </button>
        </div>
      </div>

      {/* Metrics Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
        {[
          { label: 'Units Connected', value: devices.length, icon: Tablet, color: 'text-white', bgColor: 'bg-black/60' },
          { label: 'Network Handshake', value: onlineCount, icon: Wifi, color: 'text-tad-yellow', bgColor: 'bg-tad-yellow/10' },
          { label: 'Global Storage', value: '4.2 TB', icon: HardDrive, color: 'text-white', bgColor: 'bg-black/60' },
          { label: 'Power Integrity', value: 'Nominal', icon: Zap, color: 'text-white', bgColor: 'bg-black/60' },
        ].map((stat, i) => (
          <div 
            key={i} 
            className={clsx(
              "bg-zinc-900/40 backdrop-blur-3xl border border-white/5 p-8 rounded-[3rem] group hover:border-tad-yellow/30 transition-all duration-700 relative flex flex-col justify-between animate-in fade-in slide-in-from-bottom-8 fill-mode-both shadow-[0_30px_60px_rgba(0,0,0,0.4)] hover:-translate-y-2",
              `[animation-delay:${i * 100}ms]`
            )}
          >
             <div className="flex justify-between items-start mb-8">
                <div className={clsx("p-5 rounded-full border border-white/5 transition-all duration-700 shadow-2xl", stat.bgColor, stat.color)}>
                   <stat.icon className="w-6 h-6" />
                </div>
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-800 group-hover:bg-tad-yellow transition-colors" />
             </div>
             <div>
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1.5 italic lowercase">{stat.label}</p>
                <h3 className={clsx("text-4xl font-black italic tracking-tighter leading-none mt-2 font-display", stat.color)}>
                  {typeof stat.value === 'number' && stat.value < 10 ? `0${stat.value}` : stat.value}
                </h3>
             </div>
          </div>
        ))}
      </div>

      {/* Filter & Search Nexus */}
      <div className="relative mb-16 animate-in slide-in-from-top-10 duration-700 fill-mode-both">
          <div className="relative flex flex-col md:flex-row gap-6 p-4 bg-zinc-900/40 border border-white/5 backdrop-blur-3xl rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
            <div className="relative flex-1 group/search pl-4">
              <Search className="absolute left-10 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within/search:text-tad-yellow transition-colors" />
              <input 
                type="text" 
                placeholder="PROBE UUID, PLATE OR OPERATIONAL SECTOR..."
                className="w-full bg-black/40 border border-white/5 rounded-full py-5 pl-16 pr-8 text-[11px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-tad-yellow/40 transition-all placeholder:text-zinc-800"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex p-1.5 bg-black/60 rounded-full border border-white/5">
              {(['all', 'online', 'offline'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx(
                    "px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all italic",
                    filter === f 
                      ? "bg-tad-yellow text-black shadow-2xl shadow-tad-yellow/20" 
                      : "text-zinc-600 hover:text-white"
                  )}
                >
                  {f === 'all' ? 'All_Units' : f === 'online' ? 'Stable_Link' : 'Offline'}
                </button>
              ))}
            </div>
          </div>
      </div>

      {/* Hardware Grid Surface */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {loading && devices.length === 0 ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="h-96 bg-zinc-900/20 backdrop-blur-3xl animate-pulse rounded-[3rem] border border-white/5" />)
        ) : filteredDevices.map((device, idx) => {
          const isOnline = device.status === 'online';
          const isPlaying = device.player_status === 'playing';
          const displayName = device.taxi_number || `${device.device_id.slice(0, 8).toUpperCase()}`;
          
          return (
            <div 
              key={device.device_id} 
              className={clsx(
                "group relative bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[3.5rem] p-10 hover:border-tad-yellow/30 transition-all duration-700 hover:-translate-y-2 shadow-[0_45px_100px_rgba(0,0,0,0.5)] flex flex-col animate-in fade-in slide-in-from-bottom-12 fill-mode-both",
                `[animation-delay:${idx * 50}ms]`
              )}
            >
              <div className={clsx(
                "absolute -top-10 -right-10 w-56 h-56 blur-[80px] transition-all duration-1000 -z-10",
                isOnline ? "bg-tad-yellow/15 group-hover:bg-tad-yellow/30" : "bg-white/[0.03]"
              )} />

              <div className="flex justify-between items-start mb-10 relative z-10">
                 <div className="flex items-center gap-4 bg-black/50 p-1.5 rounded-2xl border border-white/5">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openProfile(device.id); }}
                      className="p-3 bg-zinc-900 border border-white/5 hover:bg-tad-yellow hover:text-black rounded-xl transition-all shadow-xl group-hover:rotate-6"
                      title="Explorar Terminal"
                    >
                      <Cpu className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteDevice(device.id); }}
                      title="Purgar Nodo"
                      className="p-3 bg-zinc-900/50 border border-white/5 hover:bg-rose-500 text-zinc-600 hover:text-white rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
                 <div className={clsx(
                    "flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all duration-500",
                    isOnline ? "bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow shadow-2xl shadow-tad-yellow/5" : "bg-zinc-900 border-white/5 text-zinc-600"
                 )}>
                    <div className={clsx("w-2 h-2 rounded-full", isOnline ? "bg-tad-yellow animate-pulse shadow-[0_0_10px_#fad400]" : "bg-zinc-800")} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">{device.status.toUpperCase()}</span>
                 </div>
              </div>

              <div onClick={() => openProfile(device.id)} className="cursor-pointer group-hover:translate-x-1 transition-transform duration-500">
                <div className="flex items-center gap-6 mb-10">
                   <div className={clsx(
                     "w-20 h-20 rounded-[2rem] border transition-all duration-700 flex items-center justify-center shadow-2xl",
                     isOnline ? "bg-tad-yellow/90 backdrop-blur-md text-black border-tad-yellow shadow-[0_0_30px_rgba(255,212,0,0.4)] group-hover:shadow-[0_0_50px_rgba(255,212,0,0.6)]" : "bg-zinc-800 border-white/10 text-zinc-500"
                   )}>
                     <Tablet className="w-10 h-10 group-hover:scale-110 transition-transform" />
                   </div>
                   <div>
                     <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none mb-2 mb-2">{displayName}</h3>
                     <p className="text-[10px] font-mono font-black text-zinc-700 tracking-[-0.05em] uppercase">SYSTEM_NODE_{device.device_id.slice(0, 16)}...</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                   {[
                     { icon: Battery, label: 'Energía', value: device.battery_level != null ? `${device.battery_level}%` : 'S/N', color: 'text-tad-yellow' },
                     { icon: HardDrive, label: 'Vault', value: device.storage_free || '0.0 GB', color: 'text-blue-500' },
                     { icon: MapPin, label: 'Geoloc', value: device.city || 'Regional', color: 'text-emerald-500' },
                     { icon: Radio, label: 'Stream', value: isPlaying ? 'ACTIVE' : 'IDLE', color: isPlaying ? 'text-tad-yellow' : 'text-zinc-500' }
                   ].map((m, i) => (
                     <div key={i} className="bg-zinc-950/40 backdrop-blur-xl border border-white/10 p-4 rounded-3xl hover:border-tad-yellow/30 transition-colors shadow-inner">
                        <div className="flex items-center gap-2 mb-2 text-[9px] font-black text-zinc-500 uppercase tracking-widest italic">
                           <m.icon className={clsx("w-3.5 h-3.5", m.color)} /> {m.label}
                        </div>
                        <p className={clsx("text-sm font-black italic", m.color === 'text-zinc-500' ? 'text-zinc-500' : 'text-white')}>{m.value.toUpperCase()}</p>
                     </div>
                   ))}
                </div>

                <div className="bg-zinc-900/50 border border-white/10 p-6 rounded-[2rem] group/slots hover:bg-zinc-800/50 hover:border-tad-yellow/20 transition-all mb-10 shadow-inner">
                  <DeviceSlotsInfo 
                    deviceId={device.device_id} 
                    loading={loading}
                    slots={{
                      device_id: device.device_id,
                      max_slots: device.max_slots || 15,
                      assigned_slots: device.occupied_slots || 0,
                      available_slots: Math.max(0, (device.max_slots || 15) - (device.occupied_slots || 0)),
                      usage_percentage: Math.round(((device.occupied_slots || 0) / (device.max_slots || 15)) * 100)
                    }}
                  />
                </div>
              </div>

              <div className="mt-auto border-t border-white/5 pt-8 flex flex-col gap-6 relative z-10">
                <div className="flex items-center justify-between text-[10px] font-black text-zinc-700 uppercase tracking-widest italic leading-none">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4" />
                    <span className="group-hover:text-zinc-500 transition-colors">Último Enlace</span>
                  </div>
                  <span className="text-zinc-600">
                    {device.last_seen ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true }).toUpperCase() : 'VACÍO'}
                  </span>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => handleCommand(device.device_id, 'REBOOT')}
                    disabled={commanding === `${device.device_id}-REBOOT` || !isOnline}
                    className="flex-1 flex items-center justify-center gap-3 bg-zinc-900/50 border border-white/10 hover:bg-rose-500 text-zinc-500 hover:text-white py-5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all italic disabled:opacity-20 group/btn hover:shadow-[0_10px_20px_rgba(244,63,94,0.3)] hover:-translate-y-1"
                  >
                    <Power className={clsx("w-4 h-4 transition-transform", commanding === `${device.device_id}-REBOOT` ? "animate-spin" : "group-hover/btn:scale-110")} />
                    Reboot_Node
                  </button>
                  <button 
                    onClick={() => handleCommand(device.device_id, 'FORCE_SYNC')}
                    disabled={commanding === `${device.device_id}-FORCE_SYNC` || !isOnline}
                    className="flex-1 flex items-center justify-center gap-3 bg-zinc-900/50 border border-white/10 hover:bg-tad-yellow hover:border-tad-yellow text-zinc-500 hover:text-black py-5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all italic disabled:opacity-20 group/sync hover:shadow-[0_10px_30px_rgba(255,212,0,0.4)] hover:-translate-y-1"
                  >
                    <RefreshCcw className={clsx("w-4 h-4 transition-transform", commanding === `${device.device_id}-FORCE_SYNC` ? "animate-spin" : "group-hover/sync:rotate-180")} />
                    Sync_Loop
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {devices.length === 0 && !loading && (
        <div className="py-40 border-[3px] border-dashed border-white/10 rounded-[4rem] bg-zinc-900/40 backdrop-blur-md flex flex-col items-center justify-center text-center animate-in fade-in duration-1000 shadow-xl group">
           <div className="w-24 h-24 bg-zinc-950 border border-white/10 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl group-hover:shadow-[0_0_40px_rgba(255,212,0,0.2)] transition-shadow duration-500 group-hover:-translate-y-2">
              <WifiOff className="w-12 h-12 text-zinc-600 transition-colors duration-500 group-hover:text-tad-yellow" />
           </div>
           <h3 className="text-3xl font-black text-zinc-500 uppercase italic tracking-[0.2em] leading-none mb-4 transition-colors duration-500 group-hover:text-white">Cámara de Vacío</h3>
           <p className="text-zinc-600 font-bold uppercase tracking-[0.2em] text-[10px] max-w-sm leading-relaxed mb-10">
              No se han detectado latidos de hardware en el clúster regional. Inicie el protocolo de vinculación para poblar la red de nodos periféricos.
           </p>
           <button 
              onClick={() => setShowAddModal(true)}
              className="bg-zinc-900 hover:bg-tad-yellow hover:text-black text-zinc-400 px-12 py-5 rounded-[2rem] border border-white/10 hover:border-tad-yellow hover:shadow-[0_10px_30px_rgba(255,212,0,0.5)] hover:-translate-y-1 text-[10px] font-black uppercase tracking-[0.5em] transition-all italic"
           >
              ANEXAR NODO DE HARDWARE
           </button>
        </div>
      )}

      {/* Linked Hardware Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-3xl p-4 animate-in fade-in duration-500">
           {/* Modal Implementation Refined for High-Fidelity profile */}
           <div className="bg-zinc-900/95 border border-white/10 rounded-[4rem] w-full max-w-4xl overflow-hidden shadow-[0_30px_100px_rgba(255,212,0,0.15)] animate-in zoom-in-95 duration-500 relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-tad-yellow to-transparent" />
              <div className="absolute top-10 right-10 w-96 h-96 bg-tad-yellow/10 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="flex justify-between items-center p-12 border-b border-white/10 bg-white/[0.02]">
                 <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-tad-yellow rounded-[2rem] flex items-center justify-center shadow-3xl shadow-tad-yellow/40 hover:-translate-y-1 transition-transform cursor-default">
                       <Cpu className="w-10 h-10 text-black" />
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none mb-3">Terminal de <span className="text-tad-yellow">Nodo</span></h2>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                              <span className="text-[10px] font-black text-emerald-500 uppercase italic">Secured Protocol</span>
                           </div>
                           <span className="text-zinc-500 text-[10px] font-mono font-black italic">H_ID_{selectedProfile.device_id.toUpperCase()}</span>
                        </div>
                    </div>
                 </div>
                 <button onClick={() => setSelectedProfile(null)} title="Cerrar modal" aria-label="Cerrar modal" className="group p-5 bg-zinc-800 border border-white/10 rounded-[2rem] hover:bg-rose-500 hover:text-white transition-all text-zinc-400 shadow-xl relative z-10 hover:-translate-y-1 hover:shadow-rose-500/20">
                    <X className="w-8 h-8 group-hover:rotate-90 transition-transform duration-500" />
                 </button>
              </div>

              <div className="p-12 overflow-y-auto max-h-[70vh] custom-scrollbar grid grid-cols-1 xl:grid-cols-2 gap-12">
                 {/* Driver Assignment Cluster */}
                 <div className="bg-zinc-900/40 p-10 rounded-[3rem] border border-white/5 relative group/profile flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-tad-yellow/[0.02] blur-[80px] -z-10" />
                    <div className="flex justify-between items-start mb-10">
                       <div className="flex items-center gap-4 uppercase italic">
                          <UserIcon className="w-5 h-5 text-tad-yellow" />
                          <h4 className="text-[11px] font-black text-zinc-400 tracking-widest leading-none">Bitácora de Tripulación</h4>
                       </div>
                       {!editingProfile ? (
                         <button onClick={() => setEditingProfile(true)} title="Editar perfil" aria-label="Editar perfil" className="p-3 bg-zinc-950 border border-white/5 hover:border-tad-yellow text-zinc-600 hover:text-tad-yellow rounded-2xl transition-all shadow-xl">
                            <Edit2 className="w-4 h-4" />
                         </button>
                       ) : (
                         <div className="flex gap-3">
                           <button 
                             onClick={() => setEditingProfile(false)} 
                             title="Cancelar edición"
                             className="p-3 bg-zinc-950 border border-white/5 hover:bg-rose-500/10 text-zinc-600 rounded-2xl transition-all"
                           >
                             <X className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={handleSaveProfile} 
                             title="Guardar cambios"
                             className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl transition-all"
                           >
                             <Check className="w-4 h-4" />
                           </button>
                         </div>
                       )}
                    </div>
                    
                    {editingProfile ? (
                       <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                          {[
                            { label: 'Nombre Completo', field: 'driver_name', icon: UserIcon },
                            { label: 'Canal de Contacto', field: 'driver_phone', icon: Radio },
                            { label: 'Matrícula Vehículo', field: 'taxi_number', icon: CarFront }
                          ].map((field) => (
                             <div key={field.field} className="space-y-2">
                                <label className="text-[9px] font-black text-zinc-700 uppercase tracking-widest ml-2 italic">{field.label}</label>
                                <div className="relative">
                                   <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-800" />
                                   <input title={field.label} placeholder={field.label} className="w-full bg-black/60 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-xs font-black text-white italic tracking-tighter focus:border-tad-yellow/40 transition-all outline-none" value={editForm[field.field as keyof typeof editForm] as string} onChange={e => setEditForm(prev => ({...prev, [field.field]: e.target.value}))} />
                                </div>
                             </div>
                          ))}
                          <div className="flex items-center gap-4 p-5 bg-black/40 rounded-3xl border border-white/5">
                            <input type="checkbox" id="subPaid" className="w-6 h-6 accent-tad-yellow bg-zinc-900 border-white/10 rounded-lg" checked={editForm.subscription_paid} onChange={e => setEditForm(prev => ({...prev, subscription_paid: e.target.checked}))} />
                            <label htmlFor="subPaid" className="text-[11px] font-black text-zinc-400 uppercase tracking-widest italic cursor-pointer">Suscripción OIDC Verificada</label>
                          </div>
                       </div>
                    ) : selectedProfile.driver ? (
                       <div className="space-y-10">
                          <div>
                             <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none mb-3">{selectedProfile.driver.fullName}</h3>
                             <p className="text-[10px] font-mono font-black text-tad-yellow/60 uppercase italic tracking-widest">DRV_TOKEN_SYNC_OK</p>
                          </div>
                          <div className="space-y-4">
                             {[
                               { label: 'Canal de Enlace', value: selectedProfile.driver.phone || 'N/A' },
                               { label: 'Matrícula', value: selectedProfile.driver.taxiPlate || '---' },
                               { label: 'Status Fiscal', value: selectedProfile.driver.subscriptionPaid ? 'Verificado OIDC' : 'Pendiente', highlight: true }
                             ].map((d, i) => (
                                <div key={i} className="flex justify-between items-center py-4 border-b border-white/5">
                                   <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.2em] italic">{d.label}</span>
                                   <span className={clsx("text-xs font-black italic", d.highlight ? (selectedProfile.driver?.subscriptionPaid ? "text-emerald-500" : "text-rose-500") : "text-white uppercase")}>{d.value}</span>
                                </div>
                             ))}
                          </div>
                       </div>
                    ) : (
                       <div className="py-20 text-center border border-dashed border-white/5 rounded-[2.5rem] bg-black/20">
                          <p className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.4em] italic leading-relaxed">Cluster en Standby.<br/>Tripulación no asignada.</p>
                       </div>
                    )}
                 </div>

                 {/* System Telemetry & Remote Control */}
                 <div className="space-y-10">
                    <div className="bg-zinc-950 p-10 rounded-[3rem] border border-white/5 relative group/tele overflow-hidden">
                       <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-tad-yellow/[0.03] blur-[80px]" />
                       <div className="flex items-center gap-5 mb-10">
                          <Gauge className="w-6 h-6 text-tad-yellow" />
                          <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest italic">Telemetría de Hardware</h4>
                       </div>
                       <div className="space-y-4 mb-10">
                          {[
                            { label: 'Estado Núcleo', value: selectedProfile.status, color: 'text-tad-yellow', icon: Zap },
                            { label: 'Protocolo Red', value: '4G LTE S_OK', color: 'text-white', icon: Radio },
                            { label: 'Integridad Vault', value: '100% SECURE', color: 'text-emerald-500', icon: ShieldCheck }
                          ].map((t, i) => (
                             <div key={i} className="flex items-center justify-between p-5 bg-zinc-900/50 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3">
                                   <t.icon className="w-4 h-4 text-zinc-700" />
                                   <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">{t.label}</span>
                                </div>
                                <span className={clsx("text-[11px] font-black uppercase italic tracking-tighter", t.color)}>{t.value}</span>
                             </div>
                          ))}
                       </div>
                       <div className="grid grid-cols-3 gap-4">
                          {[
                            { id: 'REBOOT', label: 'Reboot', icon: Power, color: 'rose' },
                            { id: 'CLEAR_CACHE', label: 'Wipe', icon: Trash2, color: 'tad' },
                            { id: 'FORCE_SYNC', label: 'Sync', icon: RefreshCcw, color: 'tad' }
                          ].map((btn) => (
                             <button 
                               key={btn.id}
                               onClick={() => handleCommand(selectedProfile.device_id, btn.id)}
                               disabled={commanding === `${selectedProfile.device_id}-${btn.id}` || selectedProfile.status !== 'online'}
                               className={clsx(
                                  "flex flex-col items-center justify-center gap-3 py-6 rounded-2xl border transition-all duration-500 group/remote disabled:opacity-20",
                                  btn.color === 'rose' 
                                    ? "bg-zinc-950 border-white/5 text-zinc-700 hover:bg-rose-500 hover:text-white hover:border-rose-500"
                                    : "bg-zinc-950 border-white/5 text-zinc-700 hover:bg-tad-yellow hover:text-black hover:border-tad-yellow"
                               )}
                             >
                                <btn.icon className={clsx("w-5 h-5", commanding === `${selectedProfile.device_id}-${btn.id}` && "animate-spin")} />
                                <span className="text-[9px] font-black uppercase tracking-widest italic">{btn.label}</span>
                             </button>
                          ))}
                       </div>
                    </div>
                    
                    <div className="bg-zinc-900 border border-white/5 p-10 rounded-[3rem] relative group/danger overflow-hidden">
                        <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover/danger:opacity-100 transition-opacity" />
                        <div className="flex items-start gap-6 relative z-10">
                           <div className="p-4 bg-rose-500 rounded-2xl shadow-2xl shadow-rose-500/20">
                              <AlertTriangle className="w-8 h-8 text-white" />
                           </div>
                           <div>
                              <h4 className="text-xl font-black text-white italic uppercase tracking-widest mb-2 leading-none">Protocolo de Purga</h4>
                              <p className="text-[11px] text-zinc-500 font-bold leading-relaxed uppercase tracking-tighter mb-8 italic">
                                La eliminación del nodo desvinculará permanentemente al hardware del cluster de administración regional.
                              </p>
                              <button 
                                onClick={() => { handleDeleteDevice(selectedProfile.id); setSelectedProfile(null); }}
                                className="w-full bg-rose-600 hover:bg-rose-500 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-3xl shadow-rose-600/20 italic"
                              >
                                Eyectar Nodo del Cluster
                              </button>
                           </div>
                        </div>
                    </div>
                 </div>
              </div>

              <div className="p-8 bg-black/40 border-t border-white/5 text-center">
                 <p className="text-[10px] text-zinc-800 font-black uppercase tracking-[0.5em] italic leading-none">© TADNODE TERMINAL INTERNET CORE v4.2 PROTOTYPE</p>
              </div>
           </div>
        </div>
      )}

      {/* Modern Enlace Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-3xl p-6 animate-in fade-in duration-500">
          <div className="bg-zinc-900/95 border border-white/10 rounded-[4rem] w-full max-w-2xl overflow-hidden shadow-[0_30px_100px_rgba(255,212,0,0.15)] animate-in zoom-in-95 duration-500 relative">
             <div className="absolute top-0 right-0 w-80 h-80 bg-tad-yellow/10 blur-[100px] -z-10 rounded-full" />
             <div className="p-12 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-8">
                   <div className="w-20 h-20 bg-tad-yellow rounded-[2rem] flex items-center justify-center shadow-3xl shadow-tad-yellow/40 hover:-translate-y-1 transition-transform">
                      <Plus className="w-10 h-10 text-black" />
                   </div>
                   <div className="relative z-10">
                      <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none mb-3">Nuevo <span className="text-tad-yellow">Enlace</span></h2>
                      <p className="text-[11px] text-zinc-400 font-black uppercase tracking-[0.3em] mt-1">Sincronización de Hardware Periférico</p>
                   </div>
                </div>
                 <button onClick={() => setShowAddModal(false)} title="Cerrar modal" aria-label="Cerrar modal" className="group p-5 bg-zinc-800 border border-white/10 rounded-3xl hover:bg-rose-500 transition-all text-zinc-400 hover:text-white relative z-10 shadow-xl hover:-translate-y-1 hover:shadow-rose-500/20"><X className="w-8 h-8 group-hover:rotate-90 transition-transform duration-500" /></button>
             </div>
             <form onSubmit={handleAddDevice} className="p-12 space-y-10">
                <div className="space-y-4">
                   <div className="flex justify-between items-end mb-2 ml-2">
                      <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest italic">UUID de Referencia Hardware</label>
                      <p className="text-[9px] text-tad-yellow font-black uppercase tracking-widest italic opacity-50">NODE_AUTO_ID_SUPPORTED</p>
                   </div>
                   <div className="relative group/input">
                      <LayoutGrid className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-800 group-focus-within/input:text-tad-yellow transition-all" />
                       <input 
                        type="text" 
                        id="node-uuid"
                        title="UUID de Referencia Hardware"
                        placeholder="TAD-NODE-XXXX (RECOMENDADO AUTO)"
                        className="w-full bg-black border border-white/5 rounded-[1.5rem] py-6 pl-16 pr-6 text-tad-yellow font-mono text-xs font-black uppercase tracking-[0.2em] focus:outline-none focus:border-tad-yellow/40 transition-all placeholder:text-zinc-900"
                        value={newDeviceId}
                        onChange={e => setNewDeviceId(e.target.value.toUpperCase())}
                      />
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest italic ml-2">Matrícula Unidad</label>
                      <div className="relative group/input">
                        <CarFront className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-800 group-focus-within/input:text-white transition-all" />
                        <input type="text" id="unit-plate" required title="Matrícula Unidad" placeholder="NÚMERO PLACA" className="w-full bg-black border border-white/5 rounded-2xl py-6 pl-14 pr-6 text-white text-xs font-black uppercase tracking-widest focus:outline-none focus:border-white/10 transition-all placeholder:text-zinc-900" value={newPlaca} onChange={e => setNewPlaca(e.target.value)} />
                      </div>
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest italic ml-2">Identidad Tripulación</label>
                      <div className="relative group/input">
                        <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-800 group-focus-within/input:text-white transition-all" />
                         <input type="text" id="driver-identity" required title="Identidad Tripulación" placeholder="NOMBRE PILOTO" className="w-full bg-black border border-white/5 rounded-2xl py-6 pl-14 pr-6 text-white text-xs font-black uppercase tracking-widest focus:outline-none focus:border-white/10 transition-all placeholder:text-zinc-900" value={newDriver} onChange={e => setNewDriver(e.target.value.toUpperCase())} />
                      </div>
                   </div>
                </div>

                <div className="pt-6">
                   <button type="submit" disabled={adding} className="w-full bg-tad-yellow hover:bg-yellow-400 text-black font-black uppercase italic tracking-[0.5em] text-xs py-10 rounded-[2rem] transition-all shadow-3xl shadow-tad-yellow/20 flex flex-col items-center gap-3">
                      {adding ? (
                        <div className="flex flex-col items-center gap-4">
                           <RefreshCcw className="w-8 h-8 animate-spin" />
                           <span>SINCRONIZANDO CANALES...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4">
                           <ArrowRight className="w-10 h-10 group-hover:translate-x-4 transition-transform" />
                           <span>INICIAR VINCULACIÓN DE NODO</span>
                        </div>
                      )}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Toast Notification Surface */}
      {toast && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-24 duration-700 fill-mode-both">
           <div className="bg-tad-yellow text-black px-12 py-6 rounded-full shadow-[0_0_60px_rgba(250,212,0,0.3)] border border-white/20 flex items-center gap-5">
              <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center animate-pulse">
                 <Zap className="w-5 h-5" />
              </div>
              <p className="text-[11px] font-black italic uppercase tracking-[0.4em] leading-none">{toast}</p>
           </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(250, 212, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(250, 212, 0, 0.2);
        }
        .text-shadow-glow {
          text-shadow: 0 0 30px rgba(250, 212, 0, 0.35);
        }
      `}</style>
    </div>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  );
}
