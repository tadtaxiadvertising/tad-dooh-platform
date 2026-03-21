import { useState } from 'react';
import useSWR from 'swr';
import api, { sendCommand, deleteDevice, updateDeviceProfile, getDeviceProfile } from '../../services/api';
import { RefreshCcw, Tablet, Wifi, WifiOff, Battery, HardDrive, MapPin, Gauge, Search, Power, Trash2, Zap, Plus, X, User as UserIcon, CarFront, Edit2, Check, AlertTriangle, ShieldCheck, Cpu, ArrowRight, Radio, Clock, Copy, ExternalLink, Link2 } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import DeviceSlotsInfo from '../../components/DeviceSlotsInfo';
import { supabase } from '../../services/supabaseClient';
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
  city?: string;
  storage_free?: string;
}

// Helper: obtiene la base URL del API de producción
const getApiBase = () => {
  if (typeof window === 'undefined') return '';
  const stored = (window as unknown as Record<string, string>).TAD_API_URL;
  if (stored) return stored;
  // En producción usa la URL del backend desplegado en EasyPanel
  return process.env.NEXT_PUBLIC_API_URL || 'https://proyecto-ia-tad-api.rewvid.easypanel.host/api';
};

const getSyncUrl = (deviceId: string) => `${getApiBase()}/sync/${deviceId}`;
const getTelemetryUrl = (deviceId: string) => `https://proyecto-ia-tad-portal.rewvid.easypanel.host/${deviceId}`;

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
    if (!confirm(`¿Proceder con la purga irreversible del pantalla ${deviceId}? Todos los logs de auditoría serán eliminados.`)) return;
    try {
      await deleteDevice(deviceId);
      // No direct state manipulation needed if SWR revalidates
      await mutate(); // Revalidate SWR cache after deletion
      notifyChange('DEVICES');
      setToast('PANTALLA PURGADO DEL CLUSTER');
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
    <div className="min-h-screen pb-12 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-tad-yellow/[0.04] blur-[150px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[0%] right-[-5%] w-[40%] h-[40%] bg-white/[0.01] blur-[120px] rounded-full" />
      </div>

      {/* Focus Mode Wrapper - Collapses on Search */}
      <div className={clsx(
                "transition-all duration-700 ease-in-out origin-top",
                isSearching ? "max-h-0 opacity-0 overflow-hidden pointer-events-none mb-0 scale-95" : "max-h-[1200px] opacity-100 mb-8 scale-100"
      )}>

      {/* Page Context Transition */}
      <div className="flex items-center gap-3 mb-8 opacity-60 pt-6">
        <div className="w-8 h-px bg-white/20" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Hardware / Fleet Monitoring</p>
      </div>

      <div className="flex justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-4 bg-gray-800/40 backdrop-blur-xl p-1.5 rounded-2xl border border-gray-700/50 shadow-lg">
           <button 
             onClick={async () => {
               await mutate();
               if (supabase) {
                 await supabase.channel('fleet_sync').send({
                   type: 'broadcast',
                   event: 'WAKE_UP_CALL',
                   payload: { timestamp: new Date().toISOString() }
                 });
               }
             }}
             disabled={loading}
             className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-gray-700/50 flex items-center gap-2 transition-all relative overflow-hidden group"
           >
             <div className="absolute inset-0 bg-tad-yellow/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
             <RefreshCcw className={clsx("h-4 w-4 relative z-10", loading && "animate-spin text-tad-yellow")} />
             <span className="relative z-10">Sync Integridad</span>
           </button>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-tad-yellow text-black px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-[0.1em] flex items-center gap-3 hover:bg-yellow-400 transition-all shadow-lg hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          Vincular Pantalla
        </button>
      </div>

      {/* Metrics Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Unidades Vinculadas', value: devices.length, icon: Tablet, color: 'text-white', bgColor: 'bg-gray-800/80', border: 'border-white/10' },
          { label: 'Pantallas en Línea', value: onlineCount, icon: Wifi, color: 'text-tad-yellow', bgColor: 'bg-tad-yellow/10', border: 'border-tad-yellow/20' },
          { label: 'Vault Global', value: '4.2 TB', icon: HardDrive, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Estatus Energía', value: 'Nominal', icon: Zap, color: 'text-white', bgColor: 'bg-gray-800/80', border: 'border-white/10' },
        ].map((s, i) => (
          <div 
            key={i} 
            className={clsx(
              "bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-3xl group hover:border-gray-500 transition-all duration-300 relative flex flex-col justify-between shadow-sm hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8 fill-mode-both",
              i === 0 ? 'delay-0' : i === 1 ? 'delay-50' : i === 2 ? 'delay-100' : 'delay-150'
            )}
          >
             <div className="flex justify-between items-start mb-6">
                <div className={clsx("p-3 rounded-2xl border transition-all duration-300 shadow-sm", s.bgColor, s.border, s.color)}>
                   <s.icon className="w-5 h-5" />
                </div>
                <div className="h-1.5 w-1.5 rounded-full bg-gray-600 group-hover:bg-tad-yellow transition-colors shadow-[0_0_8px_#fad400]" />
             </div>
             <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                <h3 className={clsx("text-3xl lg:text-4xl font-bold tracking-tight leading-none mt-1", s.color)}>
                  {typeof s.value === 'number' && s.value < 10 ? `0${s.value}` : s.value}
                </h3>
             </div>
          </div>
        ))}
        </div>
      </div>

      {/* Filter & Search Nexus */}
      <div className="relative mb-10 animate-in slide-in-from-top-10 duration-700 fill-mode-both">
          <div className="relative flex flex-col lg:flex-row gap-4 p-2 bg-gray-800/40 border border-gray-700/50 backdrop-blur-xl rounded-2xl shadow-md">
            <div className="relative flex-1 group/search pl-2">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within/search:text-tad-yellow transition-colors" />
              <input 
                type="text" 
                placeholder="PROBE UUID, PLATE OR CITY..."
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl py-4 pl-12 pr-6 text-xs font-bold uppercase tracking-wider text-white focus:outline-none focus:border-tad-yellow/40 transition-all placeholder:text-gray-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex p-1 bg-gray-900/50 rounded-xl border border-gray-700/50">
              {(['all', 'online', 'offline'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx(
                    "px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                    filter === f 
                      ? "bg-tad-yellow text-black shadow-md" 
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  {f === 'all' ? 'All Units' : f === 'online' ? 'Online' : 'Offline'}
                </button>
              ))}
            </div>
          </div>
      </div>

      {/* Hardware Grid Surface */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading && devices.length === 0 ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="h-80 bg-gray-800/40 backdrop-blur-xl animate-pulse rounded-2xl border border-gray-700/50" />)
        ) : filteredDevices.map((device, idx) => {
          const isOnline = device.status === 'online';
          const isPlaying = device.player_status === 'playing';
          const displayName = device.taxi_number || `${device.device_id.slice(0, 8).toUpperCase()}`;
          
          return (
            <div 
              key={device.device_id} 
              className={clsx(
                "group relative bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 hover:border-tad-yellow/30 transition-all duration-500 hover:-translate-y-1 shadow-md hover:shadow-lg flex flex-col animate-in fade-in slide-in-from-bottom-12 fill-mode-both",
                idx === 0 ? 'delay-0' : idx === 1 ? 'delay-50' : idx === 2 ? 'delay-100' : idx === 3 ? 'delay-150' : idx === 4 ? 'delay-200' : 'delay-250'
              )}
            >
              <div className={clsx(
                "absolute -top-10 -right-10 w-48 h-48 blur-[60px] transition-all duration-1000 -z-10",
                isOnline ? "bg-tad-yellow/10 group-hover:bg-tad-yellow/20" : "bg-white/[0.02]"
              )} />

              <div className="flex justify-between items-start mb-6 relative z-10">
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openProfile(device.id); }}
                      className="p-2 bg-gray-900/50 border border-gray-700 hover:bg-tad-yellow hover:text-black hover:border-tad-yellow text-gray-400 rounded-lg transition-all shadow-sm"
                      title="Explorar Terminal"
                    >
                      <Cpu className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteDevice(device.id); }}
                      title="Purgar Pantalla"
                      className="p-2 bg-gray-900/50 border border-gray-700 hover:bg-rose-500 hover:text-white hover:border-rose-500 text-gray-400 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
                 <div className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-500",
                    isOnline ? "bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow" : "bg-gray-900/50 border-gray-700 text-gray-500"
                 )}>
                    <div className={clsx("w-2 h-2 rounded-full", isOnline ? "bg-tad-yellow animate-pulse shadow-[0_0_8px_#fad400]" : "bg-gray-600")} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{device.status}</span>
                 </div>
              </div>

              <div onClick={() => openProfile(device.id)} className="cursor-pointer group-hover:translate-x-1 transition-transform duration-300">
                <div className="flex items-center gap-4 mb-6">
                   <div className={clsx(
                     "w-12 h-12 rounded-xl border transition-all flex items-center justify-center shadow-sm shrink-0",
                     isOnline ? "bg-tad-yellow text-black border-tad-yellow/80 shadow-[0_0_15px_rgba(255,212,0,0.3)]" : "bg-gray-900 border-gray-700 text-gray-500"
                   )}>
                     <Tablet className="w-6 h-6 group-hover:scale-110 transition-transform" />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none mb-1">{displayName}</h3>
                     <p className="text-[10px] font-mono font-bold text-gray-500 uppercase">ID: {device.device_id.slice(0, 16)}...</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                   {[
                     { icon: Battery, label: 'Batería', value: device.battery_level != null ? `${device.battery_level}%` : 'S/N', color: 'text-tad-yellow' },
                     { icon: HardDrive, label: 'Vault', value: device.storage_free || '0.0 GB', color: 'text-blue-400' },
                     { icon: MapPin, label: 'Ciudad', value: device.city || 'Regional', color: 'text-emerald-500' },
                     { icon: Radio, label: 'Stream', value: isPlaying ? 'ACTIVE' : 'IDLE', color: isPlaying ? 'text-tad-yellow' : 'text-gray-500' }
                   ].map((m, i) => (
                     <div key={i} className="bg-gray-900/50 backdrop-blur-xl border border-gray-700 p-3 rounded-xl">
                        <div className="flex items-center gap-1.5 mb-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                           <m.icon className={clsx("w-3 h-3 drop-shadow-sm", m.color)} /> {m.label}
                        </div>
                        <p className={clsx("text-xs font-bold", m.color === 'text-gray-500' ? 'text-gray-500' : 'text-white')}>{m.value}</p>
                     </div>
                   ))}
                </div>

                <div className="bg-gray-900/50 border border-gray-700 p-4 rounded-xl group/slots mb-6">
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

              <div className="mt-auto border-t border-gray-700/50 pt-5 flex flex-col gap-4 relative z-10">
                {/* Content Manifest URL — Lo más importante para la tablet */}
                <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Link2 className="w-3 h-3 text-tad-yellow" /> Sync URL (Tablet)
                    </span>
                    <div className="flex items-center gap-1">
                      <CopyButton value={getSyncUrl(device.device_id)} label="URL" />
                      <a
                        href={getSyncUrl(device.device_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border bg-white/5 border-white/10 text-zinc-400 hover:bg-tad-yellow/10 hover:border-tad-yellow/30 hover:text-tad-yellow transition-all"
                      >
                        <ExternalLink className="w-3 h-3" /> Test
                      </a>
                    </div>
                  </div>
                  <p className="text-[9px] font-mono text-zinc-600 truncate">{getSyncUrl(device.device_id).split('api/')[1] || '/sync/...'}</p>
                </div>

                {/* Telemetry / Driver GPS Portal */}
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Radio className="w-3 h-3 animate-pulse" /> Telemetría Chofer (GPS)
                    </span>
                    <div className="flex items-center gap-1">
                      <CopyButton value={getTelemetryUrl(device.device_id)} label="URL" />
                      <a
                        href={getTelemetryUrl(device.device_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border bg-white/5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all"
                      >
                        <ExternalLink className="w-3 h-3" /> Abrir
                      </a>
                    </div>
                  </div>
                  <p className="text-[9px] font-mono text-emerald-600/60 truncate italic">Tracking ubicación celular chofer</p>
                </div>

                <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Enlace:</span>
                  </div>
                  <span className="text-gray-400">
                    {device.last_seen ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true }) : '---'}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleCommand(device.device_id, 'REBOOT')}
                    disabled={commanding === `${device.device_id}-REBOOT` || !isOnline}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-900/50 border border-gray-700 hover:bg-rose-500 hover:border-rose-500 text-gray-400 hover:text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Power className={clsx("w-3.5 h-3.5", commanding === `${device.device_id}-REBOOT` && "animate-spin")} />
                    Reboot
                  </button>
                  <button 
                    onClick={() => handleCommand(device.device_id, 'FORCE_SYNC')}
                    disabled={commanding === `${device.device_id}-FORCE_SYNC` || !isOnline}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-900/50 border border-gray-700 hover:bg-tad-yellow hover:border-tad-yellow text-gray-400 hover:text-black py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <RefreshCcw className={clsx("w-3.5 h-3.5", commanding === `${device.device_id}-FORCE_SYNC` && "animate-spin")} />
                    Sync
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {devices.length === 0 && !loading && (
        <div className="py-24 border-2 border-dashed border-gray-700/50 rounded-3xl bg-gray-800/20 backdrop-blur-xl flex flex-col items-center justify-center text-center animate-in fade-in duration-1000 shadow-sm group hover:border-tad-yellow/30 hover:bg-gray-800/40 transition-all">
           <div className="w-20 h-20 bg-gray-900 border border-gray-700 rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:shadow-[0_0_20px_rgba(255,212,0,0.15)] transition-shadow duration-500 group-hover:-translate-y-1">
              <WifiOff className="w-10 h-10 text-gray-500 transition-colors duration-500 group-hover:text-tad-yellow" />
           </div>
           <h3 className="text-2xl font-black text-gray-400 uppercase tracking-tight leading-none mb-3 transition-colors duration-500 group-hover:text-white">Red Inactiva</h3>
           <p className="text-gray-500 font-bold uppercase tracking-wider text-[11px] max-w-md leading-relaxed mb-8">
              No se han detectado pantallas de hardware en el espectro. Inicie el protocolo para poblar la red periférica.
           </p>
           <button 
              onClick={() => setShowAddModal(true)}
              className="bg-gray-900 hover:bg-tad-yellow hover:text-black text-gray-400 px-8 py-4 rounded-xl border border-gray-700 hover:border-tad-yellow hover:shadow-lg hover:-translate-y-1 text-xs font-bold uppercase tracking-widest transition-all"
           >
              Anexar Pantalla de Hardware
           </button>
        </div>
      )}

      {/* Linked Hardware Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
           {/* Modal Implementation Refined for High-Fidelity profile */}
           <div className="bg-gray-900/95 border border-gray-700/50 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-tad-yellow to-transparent" />
              <div className="absolute top-10 right-10 w-96 h-96 bg-tad-yellow/10 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="flex justify-between items-center p-8 border-b border-gray-700/50 bg-gray-800/30">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-tad-yellow rounded-2xl flex items-center justify-center shadow-lg hover:-translate-y-1 transition-transform cursor-default">
                       <Cpu className="w-6 h-6 text-black" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight leading-none mb-2">
                          Terminal de <span className="text-tad-yellow">Pantalla</span>
                        </h2>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                              <span className="text-xs font-bold text-emerald-500 uppercase">Secured Link</span>
                           </div>
                           <span className="text-gray-500 text-xs font-mono font-bold">{selectedProfile.device_id.toUpperCase()}</span>
                        </div>
                    </div>
                 </div>
                 <button onClick={() => setSelectedProfile(null)} title="Cerrar modal" aria-label="Cerrar modal" className="group p-4 bg-gray-800 border border-gray-700/50 rounded-xl hover:bg-rose-500 hover:border-transparent hover:text-white transition-all text-gray-400 shadow-sm relative z-10">
                    <X className="w-6 h-6 transition-transform" />
                 </button>
              </div>

              <div className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar grid grid-cols-1 xl:grid-cols-2 gap-8">
                 {/* Driver Assignment Cluster */}
                 <div className="bg-gray-800/40 p-8 rounded-2xl border border-gray-700/50 relative flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-8">
                       <div className="flex items-center gap-3 uppercase">
                          <UserIcon className="w-4 h-4 text-tad-yellow" />
                          <h4 className="text-xs font-bold text-gray-400 tracking-wider">Perfil Piloto</h4>
                       </div>
                       {!editingProfile ? (
                         <button onClick={() => setEditingProfile(true)} title="Editar perfil" aria-label="Editar perfil" className="p-2 bg-gray-900 border border-gray-700 hover:border-tad-yellow text-gray-400 hover:text-tad-yellow rounded-lg transition-all shadow-sm">
                            <Edit2 className="w-4 h-4" />
                         </button>
                       ) : (
                         <div className="flex gap-2">
                           <button 
                             onClick={() => setEditingProfile(false)} 
                             title="Cancelar edición"
                             className="p-2 bg-gray-900 border border-gray-700 hover:bg-rose-500/10 text-gray-400 rounded-lg transition-all"
                           >
                             <X className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={handleSaveProfile} 
                             title="Guardar cambios"
                             className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg transition-all"
                           >
                             <Check className="w-4 h-4" />
                           </button>
                         </div>
                       )}
                    </div>
                    
                    {editingProfile ? (
                       <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                          {[
                            { label: 'Nombre Completo', field: 'driver_name', icon: UserIcon },
                            { label: 'Contacto Interno', field: 'driver_phone', icon: Radio },
                            { label: 'Matrícula Unidad', field: 'taxi_number', icon: CarFront }
                          ].map((field) => (
                             <div key={field.field} className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{field.label}</label>
                                <div className="relative">
                                   <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                   <input title={field.label} placeholder={field.label} className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl py-3 pl-12 pr-4 text-sm font-bold text-white tracking-wide focus:border-tad-yellow/40 transition-all outline-none" value={editForm[field.field as keyof typeof editForm] as string} onChange={e => setEditForm(prev => ({...prev, [field.field]: e.target.value}))} />
                                </div>
                             </div>
                          ))}
                          <div className="flex items-center gap-3 p-4 bg-gray-900/40 rounded-xl border border-gray-700/50">
                            <input type="checkbox" id="subPaid" className="w-5 h-5 accent-tad-yellow bg-gray-900 border-gray-700 rounded" checked={editForm.subscription_paid} onChange={e => setEditForm(prev => ({...prev, subscription_paid: e.target.checked}))} />
                            <label htmlFor="subPaid" className="text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer">Suscripción OIDC Valida</label>
                          </div>
                       </div>
                    ) : selectedProfile.driver ? (
                       <div className="space-y-8">
                          <div>
                             <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-2">{selectedProfile.driver.fullName}</h3>
                             <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">OK_SYNC_PROFILE</p>
                          </div>
                          <div className="space-y-2">
                             {[
                               { label: 'Enlace Com', value: selectedProfile.driver.phone || 'N/A' },
                               { label: 'Matrícula', value: selectedProfile.driver.taxiPlate || '---' },
                               { label: 'Suscripción', value: selectedProfile.driver.subscriptionPaid ? 'Verificada' : 'Pendiente', highlight: true }
                             ].map((d, i) => (
                                <div key={i} className="flex justify-between items-center py-3 border-b border-gray-700/30 last:border-0">
                                   <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{d.label}</span>
                                   <span className={clsx("text-sm font-bold", d.highlight ? (selectedProfile.driver?.subscriptionPaid ? "text-emerald-500" : "text-rose-500") : "text-white uppercase")}>{d.value}</span>
                                </div>
                             ))}
                          </div>
                       </div>
                    ) : (
                       <div className="py-16 text-center border-2 border-dashed border-gray-700/50 rounded-2xl bg-gray-900/40">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">Sin Piloto Enlazado.</p>
                       </div>
                    )}
                 </div>

                 {/* System Telemetry & Remote Control */}
                 <div className="space-y-6">
                    <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-700/50 relative overflow-hidden">
                       <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-tad-yellow/[0.03] blur-[80px]" />
                       <div className="flex items-center gap-4 mb-8">
                          <Gauge className="w-5 h-5 text-tad-yellow" />
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Telemetría de Hardware</h4>
                       </div>
                       <div className="space-y-3 mb-8">
                          {[
                            { label: 'Estado Núcleo', value: selectedProfile.status, color: 'text-tad-yellow', icon: Zap },
                            { label: 'Protocolo Red', value: 'IPv4 Nominal', color: 'text-white', icon: Radio },
                            { label: 'Config Vault', value: '100% OK', color: 'text-emerald-500', icon: ShieldCheck }
                          ].map((t, i) => (
                             <div key={i} className="flex items-center justify-between p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                <div className="flex items-center gap-3">
                                   <t.icon className="w-4 h-4 text-gray-500" />
                                   <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.label}</span>
                                </div>
                                <span className={clsx("text-xs font-black uppercase tracking-tight", t.color)}>{t.value}</span>
                             </div>
                          ))}
                       </div>
                       <div className="grid grid-cols-3 gap-3">
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
                                  "flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none",
                                  btn.color === 'rose' 
                                    ? "bg-gray-800 border-gray-700 text-gray-400 hover:bg-rose-500 hover:text-white hover:border-transparent"
                                    : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-tad-yellow hover:text-black hover:border-transparent"
                               )}
                             >
                                <btn.icon className={clsx("w-4 h-4", commanding === `${selectedProfile.device_id}-${btn.id}` && "animate-spin")} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{btn.label}</span>
                             </button>
                          ))}
                       </div>
                    </div>
                    
                    <div className="bg-gray-900 border border-gray-700/50 p-6 rounded-2xl relative group/danger overflow-hidden">
                        <div className="flex items-start gap-4 relative z-10">
                           <div className="p-3 bg-gray-800 rounded-xl border border-rose-500/20">
                              <AlertTriangle className="w-6 h-6 text-rose-500" />
                           </div>
                           <div className="flex-1">
                              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Protocolo de Purga</h4>
                              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                                Remover el pantalla lo desvinculará físicamente del core de comunicación maestro regional.
                              </p>
                              <button 
                                onClick={() => { handleDeleteDevice(selectedProfile.id); setSelectedProfile(null); }}
                                className="w-full bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-500 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm"
                              >
                                Eyectar Hardware
                              </button>
                           </div>
                        </div>
                    </div>
                 </div>
              </div>

              <div className="p-5 bg-gray-900/80 border-t border-gray-700/50">
                {/* === CONTENT MANIFEST URLS === */}
                <div className="mb-4 space-y-2">
                  <p className="text-[9px] font-black text-tad-yellow uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Link2 className="w-3 h-3" /> URLs de Contenido del Nodo
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-black/60 border border-white/5 rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Sync Manifest (API)</p>
                        <p className="text-[10px] font-mono text-zinc-300 truncate">{getSyncUrl(selectedProfile.device_id)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <CopyButton value={getSyncUrl(selectedProfile.device_id)} label="Copiar" />
                        <a
                          href={getSyncUrl(selectedProfile.device_id)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border bg-white/5 border-white/10 text-zinc-400 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 transition-all"
                        >
                          <ExternalLink className="w-3 h-3" /> Abrir
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-black/60 border border-white/5 rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Telemetría Chofer (GPS / PWA)</p>
                        <p className="text-[10px] font-mono text-emerald-400 truncate">{getTelemetryUrl(selectedProfile.device_id)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <CopyButton value={getTelemetryUrl(selectedProfile.device_id)} label="Copiar" />
                        <a
                          href={getTelemetryUrl(selectedProfile.device_id)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition-all"
                        >
                          <ExternalLink className="w-3 h-3" /> Abrir Portal
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-black/60 border border-white/5 rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Consola Tablet (DevID)</p>
                        <p className="text-[10px] font-mono text-zinc-300 truncate">window.OfflineSyncManager.synchronize('{selectedProfile.device_id}')</p>
                      </div>
                      <CopyButton value={`window.OfflineSyncManager.synchronize('${selectedProfile.device_id}')`} label="Copiar" />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center">© TAD DOOH OS v5.0</p>
              </div>
           </div>
        </div>
      )}

      {/* Modern Enlace Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in fade-in duration-300">
          <div className="bg-gray-900/95 border border-gray-700/50 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 relative">
             <div className="p-10 border-b border-gray-700/50 flex justify-between items-center bg-gray-800/30">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-tad-yellow rounded-2xl flex items-center justify-center shadow-lg hover:-translate-y-1 transition-transform">
                      <Plus className="w-8 h-8 text-black" />
                   </div>
                   <div>
                      <h2 className="text-3xl font-black text-white uppercase tracking-tight leading-none mb-2">Nuevo <span className="text-tad-yellow">Pantalla</span></h2>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Sincronización de Flota</p>
                   </div>
                </div>
                 <button onClick={() => setShowAddModal(false)} title="Cerrar modal" aria-label="Cerrar modal" className="p-4 bg-gray-800 border border-gray-700/50 rounded-xl hover:bg-rose-500 hover:text-white transition-all text-gray-400 relative z-10 shadow-sm"><X className="w-6 h-6 transition-transform" /></button>
             </div>
             <form onSubmit={handleAddDevice} className="p-10 space-y-8">
                <div className="space-y-3">
                   <div className="flex justify-between items-end mb-1 ml-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">UUID de Hardware</label>
                   </div>
                   <input 
                     type="text" 
                     id="node-uuid"
                     title="UUID de Referencia Hardware"
                     placeholder="TAD-NODE-XXXX (RECOMENDADO AUTO)"
                     className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl py-4 px-6 text-tad-yellow font-mono text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-tad-yellow/40 transition-all placeholder:text-gray-600"
                     value={newDeviceId}
                     onChange={e => setNewDeviceId(e.target.value.toUpperCase())}
                   />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-3">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Matrícula Unidad</label>
                      <input type="text" id="unit-plate" required title="Matrícula Unidad" placeholder="AA-XXXX" className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl py-4 px-6 text-white text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-white/20 transition-all placeholder:text-gray-600" value={newPlaca} onChange={e => setNewPlaca(e.target.value)} />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Identidad Piloto</label>
                      <input type="text" id="driver-identity" required title="Identidad Tripulación" placeholder="NOMBRE APELLIDO" className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl py-4 px-6 text-white text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-white/20 transition-all placeholder:text-gray-600" value={newDriver} onChange={e => setNewDriver(e.target.value.toUpperCase())} />
                   </div>
                </div>

                <div className="pt-6">
                   <button type="submit" disabled={adding} className="w-full bg-tad-yellow hover:bg-yellow-400 text-black font-black uppercase tracking-widest text-xs py-5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3">
                      {adding ? (
                        <div className="flex items-center gap-3">
                           <RefreshCcw className="w-5 h-5 animate-spin" />
                           CONFIGURANDO PANTALLAS...
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                           INCLUIR PANTALLA A FLOTA <ArrowRight className="w-5 h-5" />
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
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-24 duration-700 fill-mode-both">
           <div className="bg-tad-yellow text-black px-8 py-4 rounded-xl shadow-2xl flex items-center gap-4">
              <Zap className="w-4 h-4" />
              <p className="text-xs font-bold uppercase tracking-wider">{toast}</p>
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
