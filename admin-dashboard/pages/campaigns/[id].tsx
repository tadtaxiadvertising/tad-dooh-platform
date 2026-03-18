import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getCampaignById, getCampaignDevices } from '../../services/api';
import { ArrowLeft, Megaphone, Calendar, Film, Clock, Zap, MapPin, Play, Tablet, RefreshCcw, ShieldCheck, Target, Share2, Layers, Download } from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { CampaignModal } from '../../components/CampaignModal';

export default function CampaignDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [campaign, setCampaign] = useState<{ id: string; name: string; advertiser: string; active: boolean; startDate: string; endDate: string; start_date?: string; end_date?: string; mediaAssets?: unknown[]; media?: unknown[]; priority?: number; version?: number; targetImpressions?: number; target_impressions?: number; createdAt?: string; targetCities?: string; status?: string; targetAll?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignedDevices, setAssignedDevices] = useState<{ id: string; deviceId: string; taxiNumber?: string; lastHeartbeat?: string; lastSeen?: string; lastSync?: string; assigned_at?: string; city?: string; assignment_type?: string }[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const fetchCampaign = useCallback(() => {
    if (!id) return;
    setLoading(true);
    getCampaignById(id as string)
      .then(data => setCampaign(data))
      .catch(err => {
        console.error(err);
        setError("Error de sincronización con el núcleo de la campaña.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const fetchAssignedDevices = useCallback(() => {
    if (!id) return;
    setLoadingDevices(true);
    getCampaignDevices(id as string)
      .then(data => setAssignedDevices(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error loading devices:', err))
      .finally(() => setLoadingDevices(false));
  }, [id]);

  useEffect(() => {
    fetchCampaign();
    fetchAssignedDevices();
  }, [id, fetchCampaign, fetchAssignedDevices]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-12">
        <div className="h-10 bg-zinc-900 rounded-3xl w-64" />
        <div className="h-80 bg-zinc-900/40 rounded-[3.5rem] border border-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           {[1,2,3,4].map(i => <div key={i} className="h-40 bg-zinc-900/20 rounded-[2.5rem] border border-white/5" />)}
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="text-center py-40 bg-zinc-950/20 border-2 border-dashed border-white/5 rounded-[4rem] animate-in fade-in duration-1000">
        <div className="w-24 h-24 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mb-10 mx-auto shadow-3xl">
           <Megaphone className="w-12 h-12 text-zinc-800" />
        </div>
        <h3 className="text-3xl font-black text-zinc-700 uppercase italic tracking-[0.2em] leading-none mb-4 italic">Falla de Enlace</h3>
        <p className="text-zinc-800 font-bold uppercase tracking-[0.2em] text-[10px] max-w-sm leading-relaxed mb-10 mx-auto">
          {error || "La campaña solicitada no ha podido ser localizada en el cluster de datos central."}
        </p>
        <Link href="/campaigns" className="bg-white/5 hover:bg-tad-yellow hover:text-black text-zinc-400 px-12 py-5 rounded-[2rem] border border-white/5 hover:border-transparent text-[10px] font-black uppercase tracking-[0.5em] transition-all italic">
          ← REINTENTAR ACCESO
        </Link>
      </div>
    );
  }

  const isActive = campaign.active;
  const startDate = new Date(campaign.startDate || campaign.start_date || '');
  const endDate = new Date(campaign.endDate || campaign.end_date || '');
  const now = new Date();
  const isLive = isActive && now >= startDate && now <= endDate;

  const v1Assets = campaign.mediaAssets || [];
  const v2Assets = ((campaign.media as { id: string; filename?: string; originalFilename?: string; url?: string; cdnUrl?: string; fileSize?: number; durationSeconds?: number; createdAt?: string }[]) || []).map((m) => ({
    id: m.id,
    type: 'VIDEO',
    filename: m.filename || m.originalFilename || 'video.mp4',
    url: m.url || m.cdnUrl,
    fileSize: Number(m.fileSize || 0),
    duration: m.durationSeconds || 15,
    createdAt: m.createdAt
  }));
  const assets = [...(v1Assets as { id: string, type?: string, filename?: string, url?: string, fileSize?: number, duration?: number, createdAt?: string }[]), ...v2Assets];
  const totalDuration = assets.reduce((sum: number, a: { duration?: number }) => sum + (a.duration || 0), 0);

  const getCleanUrl = (url: string) => url?.split('#')[0] || url;

  return (
    <div className="animate-in fade-in duration-1000 pb-20 relative">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-tad-yellow/5 blur-[120px] rounded-full animate-pulse" />
         <div className="absolute bottom-[5%] right-[-5%] w-[35%] h-[35%] bg-white/5 blur-[100px] rounded-full" />
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10 mb-12">
        <div className="flex items-center gap-8">
          <Link href="/campaigns" className="group w-14 h-14 bg-zinc-950 border border-white/5 rounded-2xl flex items-center justify-center hover:border-tad-yellow/40 hover:bg-tad-yellow hover:text-black transition-all shadow-2xl active:scale-90">
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
               <span className="w-2 h-2 rounded-full bg-tad-yellow animate-pulse shadow-[0_0_10px_#fad400]" />
               <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Campaña: Insight Digital v4.2</p>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-white uppercase tracking-tighter italic leading-none text-shadow-glow">
              Terminal de <span className="text-tad-yellow italic">Campaña</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-950/50 p-2 rounded-3xl border border-white/5 backdrop-blur-3xl shadow-3xl">
           <button 
             onClick={async () => {
                if (!confirm(`¿Iniciar protocolo de purga para "${campaign.name}"? Esta acción es irreversible.`)) return;
                try {
                  await (await import('../../services/api')).deleteCampaign(campaign.id);
                  router.push('/campaigns');
                } catch (err: unknown) {
                  alert('FALLA_PUGA: ' + (err as Error).message);
                }
             }}
             className="px-8 py-4 bg-zinc-900 border border-white/5 hover:bg-rose-500 text-zinc-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic shadow-2xl"
           >
             Purgar Registro
           </button>
           <button 
             onClick={() => setIsModalOpen(true)}
             className="flex items-center gap-4 bg-tad-yellow hover:bg-yellow-400 text-black font-black uppercase text-[10px] tracking-[0.2em] py-4 px-10 rounded-2xl transition-all shadow-2xl shadow-tad-yellow/20 italic"
           >
             <Zap className="w-5 h-5 animate-pulse" />
             Despliegue Táctico
           </button>
        </div>
      </div>

      {/* Main Intel Cluster */}
      <div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/10 rounded-[4rem] overflow-hidden shadow-3xl mb-12 relative group/header animate-in fade-in slide-in-from-bottom-10 duration-1000 fill-mode-both">
        <div className="absolute top-0 right-0 w-96 h-96 bg-tad-yellow/[0.03] blur-[120px] -z-10 opacity-0 group-hover/header:opacity-100 transition-opacity duration-1000" />
        
        <div className="p-12 border-b border-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-10">
          <div className="flex items-center gap-8">
            <div className={clsx(
              "w-24 h-24 rounded-[2rem] border transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-3xl flex items-center justify-center",
              isLive ? "bg-tad-yellow text-black border-tad-yellow shadow-tad-yellow/20" : "bg-zinc-950 text-zinc-700 border-white/5"
            )}>
              <Megaphone className="w-10 h-10 group-hover:animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none mb-3">{campaign.name}</h1>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-3 px-5 py-2 bg-black/40 rounded-full border border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                    <p className="text-[11px] text-zinc-500 font-black uppercase tracking-[0.3em] italic">{campaign.advertiser}</p>
                 </div>
                 <div className="h-4 w-px bg-white/5" />
                 <p className="text-[10px] font-mono font-black text-zinc-800 uppercase tracking-widest italic group-hover:text-zinc-600 transition-colors">HASH_KEY_{campaign.id.slice(0, 16).toUpperCase()}</p>
              </div>
            </div>
          </div>
          
          <div className={clsx(
             "px-8 py-4 rounded-[1.5rem] border transition-all duration-500 shadow-3xl flex items-center gap-5",
             isLive ? "bg-tad-yellow/10 border-tad-yellow/30 text-tad-yellow shadow-2xl shadow-tad-yellow/5" : isActive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
          )}>
             <div className={clsx("w-3 h-3 rounded-full", isLive ? "bg-tad-yellow animate-pulse shadow-[0_0_12px_#fad400]" : isActive ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-rose-500")} />
             <span className="text-[11px] font-black uppercase tracking-[0.4em] italic leading-none">
                {isLive ? 'Transmisión Regional' : isActive ? 'Ciclo Programado' : 'Operación Offline'}
             </span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/5 bg-white/[0.01]">
           {[
             { label: 'Enlace Temporal', value: format(startDate, 'dd MMM, yy'), icon: Calendar, color: 'text-white' },
             { label: 'Cierre Ciclo', value: format(endDate, 'dd MMM, yy'), icon: RefreshCcw, color: 'text-white' },
             { label: 'Activos Vault', value: assets.length, icon: Film, color: 'text-tad-yellow', large: true },
             { label: 'Tiempo Loop', value: `${totalDuration}s`, icon: Clock, color: 'text-white' }
           ].map((stat, i) => (
             <div key={i} className="p-8 text-center group/stat hover:bg-white/[0.01] transition-all">
                <div className="flex items-center justify-center gap-3 text-[10px] text-zinc-600 uppercase font-black tracking-widest mb-3 italic">
                   <stat.icon className="w-3.5 h-3.5 group-hover/stat:text-tad-yellow transition-colors" /> {stat.label}
                </div>
                <p className={clsx("font-black tracking-tighter italic leading-none transition-all group-hover/stat:scale-105", stat.large ? "text-4xl" : "text-xl", stat.color)}>{stat.value}</p>
             </div>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2 space-y-12">
          {/* Media Asset grid with Antigravity Cards */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
              Vault <span className="text-tad-yellow">Multimedia</span>
            </h2>
            <Link href="/media" className="text-[10px] font-black text-zinc-500 hover:text-tad-yellow transition-colors uppercase tracking-[0.4em] italic leading-none flex items-center gap-3 bg-zinc-950 border border-white/5 px-6 py-3 rounded-2xl">
               Inyectar Activos <ArrowLeft className="w-3 h-3 rotate-180" />
            </Link>
          </div>

          {assets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {assets.map((asset, ai) => (
                <div 
                  key={asset.id} 
                  className={clsx(
                    "group/asset relative bg-zinc-950/60 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-tad-yellow/30 transition-all duration-500 shadow-2xl animate-in fade-in slide-in-from-bottom-8 fill-mode-both",
                    `[animation-delay:${ai * 100}ms]`
                  )}
                >
                  <div className="aspect-video bg-black relative overflow-hidden group-hover/asset:scale-[1.02] transition-transform duration-700">
                    <video 
                      src={getCleanUrl(asset.url || '')}
                      className="w-full h-full object-cover opacity-60 group-hover/asset:opacity-100 transition-opacity"
                      preload="metadata"
                      muted
                      playsInline
                      onMouseOver={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                      onMouseOut={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
                    <div className="absolute top-4 right-4 p-3 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 group-hover/asset:border-tad-yellow/40 transition-all">
                       <Play className="w-4 h-4 text-white group-hover/asset:text-tad-yellow transition-colors" />
                    </div>
                    <div className="absolute bottom-6 left-6 flex items-center gap-4">
                       <div className="bg-black/80 backdrop-blur-2xl px-4 py-2 rounded-xl border border-white/10 text-[10px] text-tad-yellow font-black italic tracking-widest">
                          {asset.duration || '?'} SEC
                       </div>
                       <div className="bg-white/5 backdrop-blur-2xl px-4 py-2 rounded-xl border border-white/5 text-[10px] text-zinc-400 font-black italic tracking-widest uppercase">
                          {asset.type}
                       </div>
                    </div>
                  </div>

                  <div className="p-8">
                    <h4 className="text-xl font-black text-white italic truncate tracking-tight mb-2 group-hover/asset:text-tad-yellow transition-colors">{asset.filename}</h4>
                    <div className="flex items-center justify-between text-[10px] text-zinc-600 font-black uppercase tracking-widest italic pt-6 border-t border-white/5">
                       <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-zinc-800" />
                          {((asset.fileSize || 0) / 1024 / 1024).toFixed(2)} MB
                       </div>
                       <span className="opacity-50 group-hover/asset:opacity-100 transition-opacity">
                          ID_{asset.id.slice(0, 8).toUpperCase()}
                       </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-32 bg-zinc-950/20 border-2 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
              <Film className="w-16 h-16 text-zinc-900 mb-8" />
              <h3 className="text-2xl font-black text-zinc-700 uppercase italic tracking-[0.2em] leading-none mb-4">Vault Vacìo</h3>
              <p className="text-zinc-800 font-bold uppercase tracking-widest text-[10px] mt-2 max-w-sm leading-relaxed mb-10 mx-auto">
                No se han localizado vectores multimedia asignados a esta campaña. Inicie el protocolo de carga en el centro de activos.
              </p>
              <Link href="/media" className="bg-white/5 hover:bg-tad-yellow hover:text-black text-zinc-400 px-12 py-5 rounded-[2rem] border border-white/5 hover:border-transparent text-[10px] font-black uppercase tracking-[0.5em] transition-all italic">
                ACCEDER AL VAULT
              </Link>
            </div>
          )}

          {/* Assigned Nodes Cluster */}
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                Nodos <span className="text-tad-yellow">Asignados</span>
              </h2>
              <div className="flex items-center gap-6">
                 <span className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.4em] italic">{assignedDevices.length} Terminales Activas</span>
                  <button 
                    onClick={fetchAssignedDevices} 
                    title="Actualizar terminales"
                    className="p-3 bg-zinc-950 border border-white/5 rounded-2xl hover:border-tad-yellow/30 transition-all text-zinc-600 hover:text-tad-yellow"
                  >
                    <RefreshCcw className={clsx("w-4 h-4", loadingDevices && "animate-spin")} />
                  </button>
              </div>
            </div>

            {loadingDevices ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {[1,2].map(i => <div key={i} className="h-40 bg-zinc-900/20 rounded-[3rem] animate-pulse" />)}
              </div>
            ) : assignedDevices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {assignedDevices.map((device) => {
                  const isDeviceOnline = device.lastHeartbeat ? (new Date().getTime() - new Date(device.lastHeartbeat || device.lastSeen || '').getTime() < 300000) : false;
                  return (
                    <div key={device.id} className="group/node bg-zinc-950/80 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-8 hover:border-white/10 transition-all duration-500 shadow-2xl relative overflow-hidden">
                       <div className={clsx(
                          "absolute -right-10 -bottom-10 w-32 h-32 blur-[60px] opacity-10 transition-all duration-1000",
                          isDeviceOnline ? "bg-tad-yellow group-hover:opacity-30" : "bg-white/[0.01]"
                       )} />
                       <div className="flex items-center justify-between mb-8 relative z-10">
                          <div className="flex items-center gap-5">
                             <div className={clsx(
                                "w-14 h-14 rounded-[1.25rem] border flex items-center justify-center transition-all duration-500 shadow-3xl",
                                isDeviceOnline ? "bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow" : "bg-zinc-900 border-white/5 text-zinc-700"
                             )}>
                                <Tablet className="w-7 h-7" />
                             </div>
                             <div>
                                <h4 className="text-lg font-black text-white italic tracking-tighter uppercase leading-none mb-1">{device.taxiNumber || "NODE_UNNAMED"}</h4>
                                <p className="text-[9px] font-mono font-black text-zinc-800 uppercase tracking-tighter">I_KEY_{device.deviceId.toUpperCase()}</p>
                             </div>
                          </div>
                          <div className={clsx(
                             "flex items-center gap-2 px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest italic transition-all",
                             isDeviceOnline ? "bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow" : "bg-zinc-900 border-white/5 text-zinc-700"
                          )}>
                             <div className={clsx("w-1.5 h-1.5 rounded-full", isDeviceOnline ? "bg-tad-yellow animate-pulse shadow-[0_0_8px_#fad400]" : "bg-zinc-800")} />
                             {isDeviceOnline ? 'SYNC' : 'AWAY'}
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
                          <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                             <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-1 italic leading-none">Cluster Sector</p>
                             <p className="text-xs font-black text-white italic truncate">{device.city || 'GLOBAL_NET'}</p>
                          </div>
                          <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                             <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-1 italic leading-none">Latencia Sync</p>
                             <p className="text-xs font-black text-white italic truncate">{device.lastSeen ? formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true }).toUpperCase() : 'VOID'}</p>
                          </div>
                       </div>

                       <div className="flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
                          <span className={clsx(
                             "text-[9px] font-black px-4 py-1.5 rounded-xl border italic tracking-[0.2em] shadow-2xl",
                             device.assignment_type === 'GLOBAL' ? "bg-white/5 text-white border-white/10" : "bg-tad-yellow/10 text-tad-yellow border-tad-yellow/10"
                          )}>
                             {device.assignment_type || 'DIRECT'} PROTOCOL
                          </span>
                          <span className="text-[9px] font-black text-zinc-800 uppercase tracking-widest italic">{device.assigned_at ? format(new Date(device.assigned_at), 'dd.MM.yyyy') : '---'}</span>
                       </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-24 bg-zinc-950/20 border-2 border-dashed border-white/5 rounded-[3.5rem] flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
                <Tablet className="w-14 h-14 text-zinc-900 mb-8" />
                <h3 className="text-xl font-black text-zinc-700 uppercase italic tracking-[0.2em] mb-4 italic">Red Desierta</h3>
                <p className="text-zinc-800 font-bold uppercase tracking-widest text-[10px] max-w-sm leading-relaxed mb-10 mx-auto">
                   No se han localizado terminales de hardware asignadas directamente a este protocolo de difusión.
                </p>
                <button onClick={() => setIsModalOpen(true)} className="bg-white/5 hover:bg-tad-yellow hover:text-black text-zinc-400 px-12 py-5 rounded-[2rem] border border-white/5 hover:border-transparent text-[10px] font-black uppercase tracking-[0.5em] transition-all italic flex items-center gap-3">
                   VINCULAR HARDWARE <Share2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tactical Metrics sidebar */}
        <div className="space-y-12">
           <div className="bg-zinc-950/80 backdrop-blur-3xl border border-white/5 p-12 rounded-[4rem] shadow-3xl relative overflow-hidden group/intel">
              <div className="absolute top-0 right-0 w-64 h-64 bg-tad-yellow/[0.03] blur-[100px] -z-10" />
              <div className="relative z-10">
                 <div className="w-20 h-20 bg-tad-yellow rounded-[2rem] flex items-center justify-center mb-10 shadow-3xl shadow-tad-yellow/20 group-hover/intel:scale-110 group-hover/intel:rotate-3 transition-transform duration-700">
                    <Target className="w-10 h-10 text-black" />
                 </div>
                 <h4 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-6 italic">Intel de <br/><span className="text-tad-yellow uppercase">Campaña</span></h4>
                 <div className="space-y-6 mb-12">
                   {[
                     { label: 'Estatus Núcleo', value: campaign.status === 'active' ? 'ESTABLE' : 'PAUSADO', highlight: true },
                     { label: 'Escalafón Prioridad', value: campaign.priority || 'NORMAL' },
                     { label: 'Revisión Protocolo', value: `v${campaign.version || '1.0'}` },
                     { label: 'Meta de Impresiones', value: (campaign.target_impressions || campaign.targetImpressions || 0).toLocaleString(), color: 'text-tad-yellow' }
                   ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-4 border-b border-white/5">
                         <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] italic">{item.label}</span>
                         <span className={clsx("text-xs font-black italic tracking-tighter uppercase", item.highlight ? "text-emerald-500" : item.color || "text-white")}>{item.value}</span>
                      </div>
                   ))}
                 </div>
                 <div className="p-6 bg-black/40 rounded-[2.5rem] border border-white/5 flex items-center gap-5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse" />
                    <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em] italic">Auditoría SSL Activa</span>
                 </div>
              </div>
           </div>

           <div className="bg-zinc-950/80 backdrop-blur-3xl border border-white/5 p-12 rounded-[4rem] shadow-3xl relative overflow-hidden group/geotarget">
              <div className="flex items-center gap-4 mb-10">
                 <MapPin className="w-6 h-6 text-tad-yellow animate-pulse" />
                 <h4 className="text-xl font-black text-white uppercase italic tracking-tighter italic leading-none">Target Geográfico</h4>
              </div>
              <div className="space-y-4 mb-10">
                 {(() => {
                    try { 
                      const cities = JSON.parse(campaign.targetCities || '[]'); 
                      return cities.length > 0 ? cities.map((c: string, ci: number) => (
                        <div key={ci} className="flex items-center gap-4 bg-black/40 px-6 py-4 rounded-2xl border border-white/5 hover:border-tad-yellow/20 transition-all">
                           <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow shadow-[0_0_10px_#fad400]" />
                           <span className="text-[11px] font-black text-white uppercase italic tracking-widest">{c}</span>
                        </div>
                      )) : (
                        <div className="flex items-center gap-5 bg-tad-yellow/5 px-6 py-5 rounded-[2rem] border border-tad-yellow/10">
                           <Layers className="w-5 h-5 text-tad-yellow" />
                           <span className="text-[11px] font-black text-tad-yellow uppercase tracking-[0.2em] italic">Distribución Global</span>
                        </div>
                      );
                    } catch { return null; }
                 })()}
              </div>
              <button className="w-full bg-zinc-900 hover:bg-white/5 border border-white/5 text-zinc-600 hover:text-white py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.4em] transition-all italic flex items-center justify-center gap-3">
                 Exportar Intel Auditada <Download className="w-4 h-4" />
              </button>
           </div>

           <div className="p-10 border-2 border-dashed border-white/5 rounded-[3.5rem] text-center opacity-30 group hover:opacity-100 transition-all duration-500 cursor-default">
              <ShieldCheck className="w-10 h-10 text-zinc-800 mx-auto mb-6 group-hover:scale-110 group-hover:text-tad-yellow transition-all" />
              <p className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.6em] italic font-display">TAD_CIPHER_v4.2_VALIDATED</p>
           </div>
        </div>
      </div>

      <CampaignModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        campaignId={campaign.id}
        campaignName={campaign.name}
        onSuccess={() => { fetchCampaign(); fetchAssignedDevices(); }}
      />
      
      <style jsx global>{`
        .text-shadow-glow {
          text-shadow: 0 0 30px rgba(250, 212, 0, 0.35);
        }
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
      `}</style>
    </div>
  );
}
