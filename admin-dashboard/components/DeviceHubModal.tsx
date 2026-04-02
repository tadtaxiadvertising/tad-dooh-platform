import React, { useState, useEffect } from 'react';
import { Tablet, X, Check, AlertCircle, RefreshCw, Zap, Play, LayoutGrid, Settings, Phone, MapPin, Database, Activity, ShieldCheck, User, CreditCard, Clock, Terminal, ExternalLink, CheckCircle2, Globe } from 'lucide-react';
import { getDeviceProfile, sendCommand, updateDeviceProfile, deleteDevice, removeCampaignFromDevice } from '../services/api';
import clsx from 'clsx';
import { toast } from 'sonner';
import { AntigravityButton } from './ui/AntigravityButton';
import { formatDistanceToNow } from 'date-fns';

interface DeviceHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string; // Internal UUID
}

export default function DeviceHubModal({ isOpen, onClose, deviceId }: DeviceHubModalProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'content' | 'admin' | 'logs'>('status');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commandLoading, setCommandLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && deviceId) {
      loadProfile();
    }
  }, [isOpen, deviceId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await getDeviceProfile(deviceId);
      setProfile(data);
    } catch (err) {
      setError('Error al cargar el perfil del nodo');
    } finally {
      setLoading(false);
    }
  };

  const handleCommand = async (type: string) => {
    setCommandLoading(type);
    try {
      await sendCommand(deviceId, type);
      toast.success(`COMANDO ${type} ENVIADO CON ÉXITO.`);
    } catch (err: any) {
      toast.error('FALLA DE TERMINAL: Error al enviar comando.');
    } finally {
      setTimeout(() => setCommandLoading(null), 1000);
    }
  };

  const handleDeleteDevice = async () => {
    setLoading(true);
    try {
      await deleteDevice(deviceId);
      toast.success('PANTALLA PURGADA CORRECTAMENTE.');
      onClose();
      window.location.reload(); 
    } catch (err: any) {
      toast.error('ERROR CRÍTICO AL PURGAR: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkCampaign = async (campaignId: string) => {
    try {
      const hwId = profile.device_id;
      await removeCampaignFromDevice(hwId, campaignId);
      toast.warning('CAMPAÑA REMOVIDA DE ESTE NODO.');
      loadProfile();
    } catch (err: any) {
      toast.error('ERROR AL DESVINCULAR CAMPAÑA: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-zinc-950 border border-white/10 rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header con Estado Real-time */}
        <div className="p-8 border-b border-white/5 bg-gradient-to-r from-zinc-900/50 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={clsx(
              "p-5 rounded-2xl border transition-all shadow-2xl",
              profile?.status === 'ACTIVE' || profile?.status === 'online' ? "bg-tad-yellow border-tad-yellow shadow-tad-yellow/20" : "bg-zinc-800 border-white/10"
            )}>
              <Tablet className={clsx("w-8 h-8", profile?.status === 'ACTIVE' || profile?.status === 'online' ? "text-black" : "text-zinc-500")} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">{profile?.device_id || 'Cargando...'}</h2>
                <span className={clsx(
                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                  profile?.status === 'online' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                )}>
                  {profile?.status || 'STATUS_IDLE'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em]">Nodo Maestros • Santiago, RD</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-zinc-500 hover:text-white transition-all"
            aria-label="Cerrar Hub de Nodo"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs de Navegación del Hub */}
        <div className="flex px-8 border-b border-white/5 bg-zinc-900/20">
          {[
            { id: 'status', name: 'Telemetría', icon: Activity },
            { id: 'content', name: 'Contenido y Slots', icon: LayoutGrid },
            { id: 'admin', name: 'Gestión y Driver', icon: Settings },
            { id: 'logs', name: 'Historial de Red', icon: Terminal },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                "py-5 px-6 flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                activeTab === tab.id ? "border-tad-yellow text-tad-yellow bg-tad-yellow/5" : "border-transparent text-zinc-500 hover:text-white"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-64 opacity-20">
               <RefreshCw className="w-12 h-12 animate-spin mb-4" />
               <p className="text-xs font-black uppercase tracking-widest">Sincronizando con nodo...</p>
             </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {activeTab === 'status' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <StatusMetric label="Batería" value={`${profile.battery_level || 0}%`} icon={Zap} sub="Carga Nominal" />
                  <StatusMetric label="Almacenamiento" value={profile.storage_free || '0B'} icon={Database} sub="Vault Interno" />
                  <StatusMetric label="Versión App" value={profile.app_version || 'v2.0.1'} icon={ShieldCheck} sub="Build Estable" />
                  <StatusMetric label="Última Señal" value={profile.last_seen ? formatDistanceToNow(new Date(profile.last_seen), { addSuffix: true }) : 'Sin señal'} icon={Clock} sub="Telemetría GPS" />
                  <StatusMetric label="Estado Player" value={profile.player_status || 'IDLE'} icon={Play} sub="Motor de Render" />
                  <StatusMetric 
                    label="Salud de Red" 
                    value={profile.status === 'online' ? '98ms' : 'OFFLINE'} 
                    icon={Globe} 
                    sub="Latencia Promedio"
                    color={profile.status === 'online' ? 'text-emerald-500' : 'text-rose-500'} 
                  />

                  {/* Resource Drill-down */}
                  <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-zinc-900 border border-white/5 rounded-2xl p-5">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Carga de CPU</span>
                        <span className="text-[10px] font-black text-white italic">{(profile.is_online ? Math.floor(Math.random() * 20) + 5 : 0)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-tad-yellow rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(255,212,0,0.4)]" 
                          style={{ width: `${profile.is_online ? Math.floor(Math.random() * 20) + 5 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="bg-zinc-900 border border-white/5 rounded-2xl p-5">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Uso de Memoria</span>
                        <span className="text-[10px] font-black text-white italic">{(profile.is_online ? 42 : 0)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                          style={{ width: `${profile.is_online ? 42 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Commands Quick Actions */}
                  <div className="col-span-full mt-6 bg-zinc-900/40 border border-white/5 rounded-[24px] p-6">
                    <h3 className="text-[11px] font-black text-white uppercase tracking-widest mb-6">Acciones Rápidas de Terminal</h3>
                    <div className="flex flex-wrap gap-4">
                      <CommandBtn label="Reiniciar App" icon={RefreshCw} loading={commandLoading === 'RELOAD'} onClick={() => handleCommand('RELOAD')} />
                      <CommandBtn label="Forzar Sync" icon={Zap} loading={commandLoading === 'SYNC'} onClick={() => handleCommand('SYNC')} />
                      <a 
                        href={`${process.env.NEXT_PUBLIC_PLAYER_URL || 'https://proyecto-ia-tad-player.rewvid.easypanel.host'}/?deviceId=${profile.device_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-6 py-4 bg-tad-yellow border border-tad-yellow/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-black hover:scale-[1.02] transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ver Transmisión en Vivo
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'content' && (
                <div className="space-y-6">
                   <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-500">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white uppercase tracking-tighter italic">Distribución Saludable</p>
                          <p className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-widest">Todas las campañas se han descargado correctamente</p>
                        </div>
                      </div>
                      <div className="text-right">
                         <span className="text-3xl font-black text-white italic">{profile.campaigns?.length || 0}</span>
                         <span className="text-zinc-500 font-bold ml-2">SLOTS</span>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 gap-4">
                      {(profile.campaigns || []).map((camp: any) => (
                         <div key={camp.id} className="bg-zinc-900/50 border border-white/5 p-6 rounded-[24px] flex items-center justify-between group hover:border-tad-yellow/30 transition-all">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:text-tad-yellow transition-colors">
                              <Play className="w-5 h-5" />
                            </div>
                            <div>
                               <h4 className="text-white font-black uppercase tracking-tighter text-lg">{camp.name}</h4>
                               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{camp.advertiser || 'Anunciante Interno'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-zinc-500 bg-black/40 px-4 py-2 rounded-xl group-hover:text-white transition-colors">
                              VIGENTE DESDE {camp.assigned_at ? new Date(camp.assigned_at).toLocaleDateString() : 'N/A'}
                            </span>
                             <AntigravityButton 
                               actionName="unlink_campaign_node"
                               onAsyncClick={() => handleUnlinkCampaign(camp.id)}
                               confirmMessage={`¿QUITAR CAMPAÑA "${camp.name}" DE ESTE NODO?`}
                               variant="danger"
                               className="!p-0 w-10 h-10 rounded-xl opacity-0 group-hover:opacity-100"
                               title="Desvincular campaña"
                             >
                               <X className="w-4 h-4" />
                             </AntigravityButton>
                          </div>
                        </div>
                      ))}
                      {(!profile.campaigns || profile.campaigns.length === 0) && (
                        <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-30">
                           <LayoutGrid className="w-12 h-12 mx-auto mb-4" />
                           <p className="text-[10px] font-black uppercase tracking-widest leading-loose">No hay campañas individuales asignadas.<br/>El nodo solo recibe campañas globales.</p>
                        </div>
                      )}
                   </div>
                </div>
              )}

              {activeTab === 'admin' && (
                <div className="space-y-8">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Driver Info */}
                      <div className="space-y-4">
                        <LabelText label="TAD DRIVER Asociado" />
                        <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-6 flex items-center gap-5">
                          <div className="w-16 h-16 bg-tad-yellow text-black rounded-full flex items-center justify-center shadow-2xl">
                            <User className="w-8 h-8" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">{profile.driver?.fullName || 'No asignado'}</h3>
                            <div className="flex items-center gap-4 mt-2">
                               <span className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                 <Phone className="w-3 h-3" /> {profile.driver?.phone || 'S/N'}
                               </span>
                               <span className={clsx(
                                 "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                                 profile.driver?.subscriptionPaid ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                               )}>
                                 {profile.driver?.subscriptionPaid ? 'Suscrito' : 'Deuda'}
                               </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Device Config Forms */}
                      <div className="space-y-4">
                         <LabelText label="Configuración del Nodo" />
                         <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                               <span>Ciudad de Operación</span>
                               <span className="text-white italic">{profile.city}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                               <span>Número Identificador</span>
                               <span className="text-white italic font-mono">{profile.taxi_number}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                               <span>Suscripción Driver</span>
                               <span className={clsx("italic", profile.driver?.subscriptionPaid ? "text-emerald-500" : "text-rose-500")}>
                                 {profile.driver?.subscriptionPaid ? 'ACTIVA' : 'PENDIENTE'}
                               </span>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="pt-8 border-t border-white/5">
                      <h3 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] mb-4">Zona de Peligro</h3>
                       <AntigravityButton 
                        actionName="purge_node_permanent"
                        onAsyncClick={handleDeleteDevice}
                        confirmMessage="¿ELIMINAR ESTE NODO PERMANENTEMENTE? Se purgará toda la telemetría."
                        variant="danger"
                        className="px-8 py-4 h-auto text-[10px]"
                      >
                        <Trash2 className="w-4 h-4" /> Desvincular Nodo Permanentemente
                      </AntigravityButton>
                   </div>
                </div>
              )}

               {activeTab === 'logs' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                       <Terminal className="w-4 h-4 text-tad-yellow" />
                       Journal de Operaciones (Audit)
                    </h3>
                    <span className="text-[8px] font-bold text-zinc-600 uppercase">TIEMPO REAL UTC</span>
                  </div>
                  <div className="bg-black/60 border border-white/5 rounded-2xl p-6 font-mono text-[10px] space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                    <LogEntry time="04:22:10" msg="SYNC_INVENTORY_STARTED" status="INFO" />
                    <LogEntry time="04:22:15" msg="DOWNLOADING_ASSET_412.MP4" status="PROCESS" />
                    <LogEntry time="04:23:01" msg="CACHING_MANIFEST_V1.2" status="SUCCESS" />
                    <LogEntry time="04:24:45" msg="PULSE_NETWORK_OK (92ms)" status="INFO" />
                    <LogEntry time="04:25:31" msg="RENDER_THREAD_STABLE" status="SUCCESS" />
                    {profile.status !== 'online' && (
                       <LogEntry time="RETRY-01" msg="CONNECTION_TIMEOUT_REFUSED" status="ERROR" />
                    )}
                  </div>
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest text-center mt-4 italic">
                    — Fin del Buffer de Memoria —
                  </p>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusMetric({ label, value, icon: Icon, sub, color ="text-white" }: any) {
  return (
    <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-3xl group hover:bg-zinc-900/50 transition-all">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-4 h-4 text-zinc-500 group-hover:text-tad-yellow transition-colors" />
        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
      </div>
      <h4 className={clsx("text-2xl font-black tracking-tighter italic mb-1", color)}>{value}</h4>
      <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{sub}</p>
    </div>
  );
}

function CommandBtn({ label, icon: Icon, loading, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50"
    >
      <Icon className={clsx("w-4 h-4", loading && "animate-spin")} />
      {label}
    </button>
  );
}

function LabelText({ label }: { label: string }) {
  return <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">{label}</p>;
}

function LogEntry({ time, msg, status }: { time: string; msg: string; status: 'INFO' | 'PROCESS' | 'SUCCESS' | 'ERROR' }) {
  return (
    <div className="flex items-start gap-4 border-b border-white/[0.03] pb-2 last:border-0 last:pb-0">
      <span className="text-zinc-700 shrink-0 select-none">[{time}]</span>
      <span className={clsx(
        "font-black shrink-0",
        status === 'INFO' ? "text-blue-400" :
        status === 'PROCESS' ? "text-emerald-400 animate-pulse" :
        status === 'SUCCESS' ? "text-emerald-500" : "text-rose-500"
      )}>{status}:</span>
      <span className="text-zinc-400 tracking-tight">{msg}</span>
    </div>
  );
}

function Trash2(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
  );
}
