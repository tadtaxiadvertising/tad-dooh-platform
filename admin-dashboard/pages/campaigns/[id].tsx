import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getCampaignById, getCampaignDevices } from '../../services/api';
import { ArrowLeft, Megaphone, Calendar, Film, Clock, Zap, MapPin, Play, Tablet, RefreshCcw, ShieldCheck, Target, Share2, Layers, Download, X, Monitor, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { CampaignModal } from '../../components/CampaignModal';
import { toast } from 'sonner';

export default function CampaignDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [campaign, setCampaign] = useState<{ 
    id: string; 
    name: string; 
    advertiser: string; 
    active: boolean; 
    startDate: string; 
    endDate: string; 
    start_date?: string; 
    end_date?: string; 
    mediaAssets?: unknown[]; 
    media?: unknown[]; 
    priority?: number; 
    version?: number; 
    targetImpressions?: number; 
    target_impressions?: number; 
    createdAt?: string; 
    targetCities?: string; 
    status?: string; 
    targetAll?: boolean;
    category?: string;
    whatsapp?: string;
    instagram?: string;
    facebook?: string;
    websiteUrl?: string;
    pedidosYaUrl?: string;
    uberEatsUrl?: string;
  } | null>(null);
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
      <div className="animate-pulse space-y-8 pt-6">
        <div className="h-10 bg-gray-900 rounded-2xl w-64" />
        <div className="h-48 bg-gray-800/40 rounded-3xl border border-gray-700/50" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-900/50 rounded-2xl border border-gray-700/50" />)}
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="text-center py-32 bg-gray-800/20 border-2 border-dashed border-gray-700/50 rounded-3xl animate-in fade-in duration-700 max-w-2xl mx-auto mt-20">
        <div className="w-20 h-20 bg-gray-900 rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-sm border border-gray-700">
           <Megaphone className="w-10 h-10 text-gray-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-400 uppercase tracking-widest leading-none mb-4">Error de Sincronización</h3>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs max-w-sm leading-relaxed mb-8 mx-auto">
          {error || "La campaña solicitada no ha podido ser localizada."}
        </p>
        <Link href="/campaigns" className="bg-gray-900 hover:bg-tad-yellow hover:text-black text-gray-400 px-8 py-3 rounded-xl border border-gray-700 hover:border-tad-yellow text-xs font-bold uppercase tracking-widest transition-all">
          ← Volver a Campañas
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
    url: m.url || m.cdnUrl || '',
    fileSize: Number(m.fileSize || 0),
    duration: m.durationSeconds || 15,
    createdAt: m.createdAt
  }));
  const assets = [...(v1Assets as { id: string, type?: string, filename?: string, url?: string, fileSize?: number, duration?: number, createdAt?: string }[]), ...v2Assets];
  const totalDuration = assets.reduce((sum: number, a: { duration?: number }) => sum + (a.duration || 0), 0);

  const getCleanUrl = (url: string) => url?.split('#')[0] || url;

  return (
    <div className="animate-in fade-in duration-1000 pb-12 relative mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 pt-6">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-tad-yellow/[0.04] blur-[120px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[5%] right-[-5%] w-[35%] h-[35%] bg-white/[0.01] blur-[100px] rounded-full" />
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-6">
          <Link href="/campaigns" className="w-12 h-12 bg-gray-900 border border-gray-700 rounded-xl flex items-center justify-center hover:border-tad-yellow/40 hover:bg-tad-yellow hover:text-black transition-all shadow-sm shrink-0 group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-tad-yellow animate-pulse shadow-[0_0_8px_#fad400]" />
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Campaña: {campaign.name}</p>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tight leading-none">
              Terminal de <span className="text-tad-yellow">Campaña</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-gray-800/40 p-1.5 rounded-2xl border border-gray-700/50 backdrop-blur-xl shadow-lg shrink-0">
           <button 
             onClick={() => {
               fetchCampaign();
               fetchAssignedDevices();
             }}
             title="Sincronizar Datos"
             className="p-2.5 bg-gray-900 border border-gray-700 rounded-xl hover:border-tad-yellow hover:text-tad-yellow text-gray-500 transition-all shadow-sm"
           >
             <RefreshCcw className={clsx("w-4 h-4", (loading || loadingDevices) && "animate-spin")} />
           </button>
           <button 
             onClick={async () => {
                if (!confirm(`¿Eliminar la campaña "${campaign.name}"? Esta acción no se puede deshacer.`)) return;
                try {
                  await (await import('../../services/api')).deleteCampaign(campaign.id);
                  toast.success(`Campaña "${campaign.name}" eliminada`);
                  router.push('/campaigns');
                } catch (err: unknown) {
                  toast.error('Error: ' + (err as Error).message);
                }
             }}
             className="px-6 py-2.5 bg-gray-900 border border-gray-700 hover:bg-rose-500 text-gray-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
           >
             Eliminar
           </button>
           <button 
             onClick={() => router.push(`/campaigns/${campaign.id}/report`)}
             className="px-6 py-2.5 bg-gray-900 border border-gray-700 hover:border-tad-yellow text-gray-400 hover:text-tad-yellow rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
           >
             <Share2 className="w-4 h-4" />
             Reporte de Impacto
           </button>
           <button 
             onClick={() => setIsModalOpen(true)}
             className="flex items-center gap-2 bg-tad-yellow hover:bg-yellow-400 text-black font-bold uppercase text-xs tracking-wider py-2.5 px-6 rounded-xl transition-all shadow-md"
           >
             <Zap className="w-4 h-4" />
             Despliegue Táctico
           </button>
        </div>
      </div>

      {/* Main Intel Cluster */}
      <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden shadow-lg mb-8 relative group/header animate-in fade-in slide-in-from-bottom-10 duration-1000 fill-mode-both">
        <div className="absolute top-0 right-0 w-64 h-64 bg-tad-yellow/[0.03] blur-[80px] -z-10 opacity-0 group-hover/header:opacity-100 transition-opacity duration-1000" />
        
        <div className="p-8 border-b border-gray-700/50 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className={clsx(
              "w-16 h-16 rounded-2xl border transition-all duration-500 shadow-sm flex items-center justify-center shrink-0",
              isLive ? "bg-tad-yellow text-black border-tad-yellow/80" : "bg-gray-900 text-gray-500 border-gray-700"
            )}>
              <Megaphone className="w-8 h-8 group-hover/header:scale-105 transition-transform" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none mb-2">{campaign.name}</h1>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-900/50 rounded-lg border border-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{campaign.advertiser}</p>
                    </div>
                    <div className="h-3 w-px bg-gray-600" />
                    <div className="flex items-center gap-2 px-3 py-1 bg-tad-yellow/10 rounded-lg border border-tad-yellow/30">
                        <Target className="w-3 h-3 text-tad-yellow" />
                        <p className="text-[10px] text-tad-yellow font-black uppercase tracking-[0.2em]">{campaign.category || 'GENERAL'}</p>
                    </div>
                    <div className="h-3 w-px bg-gray-600" />
                 <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">ID_HASH: {campaign.id.slice(0, 10)}</p>
              </div>
            </div>
          </div>
          
          <div className={clsx(
             "px-5 py-2.5 rounded-xl border transition-all duration-500 flex items-center gap-3",
             isLive ? "bg-tad-yellow/10 border-tad-yellow/30 text-tad-yellow shadow-md" : isActive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
          )}>
             <div className={clsx("w-2 h-2 rounded-full", isLive ? "bg-tad-yellow animate-pulse shadow-[0_0_8px_#fad400]" : isActive ? "bg-emerald-500" : "bg-rose-500")} />
             <span className="text-xs font-bold uppercase tracking-wider">
                {isLive ? 'Transmisión Regional' : isActive ? 'Activa/Programada' : 'Offline'}
             </span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-700/50 bg-gray-900/30">
           {[
             { label: 'Inicio', value: format(startDate, 'dd MMM, yy'), icon: Calendar, color: 'text-white' },
             { label: 'Cierre', value: format(endDate, 'dd MMM, yy'), icon: RefreshCcw, color: 'text-white' },
             { label: 'Activos Vault', value: assets.length, icon: Film, color: 'text-tad-yellow', large: true },
             { label: 'Tiempo Loop', value: `${totalDuration}s`, icon: Clock, color: 'text-white' }
           ].map((stat, i) => (
             <div key={i} className="p-6 text-center group/stat hover:bg-gray-800/30 transition-all">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">
                   <stat.icon className="w-4 h-4 group-hover/stat:text-tad-yellow transition-colors" /> {stat.label}
                </div>
                <p className={clsx("font-black tracking-tight leading-none transition-transform group-hover/stat:scale-105", stat.large ? "text-3xl" : "text-xl", stat.color)}>{stat.value}</p>
             </div>
           ))}
        </div>

        {/* Ecosistema de Conversión Links (NEW SECTION) */}
        {(campaign.whatsapp || campaign.instagram || campaign.websiteUrl || campaign.pedidosYaUrl || campaign.uberEatsUrl) && (
          <div className="p-6 border-t border-gray-700/50 bg-white/[0.01]">
              <div className="flex items-center gap-3 mb-6">
                  <Zap className="w-4 h-4 text-tad-yellow" />
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Protocolo de Conversión Activo</h3>
              </div>
              <div className="flex flex-wrap gap-4">
                  {campaign.whatsapp && (
                      <div className="flex items-center gap-3 bg-gray-900/50 px-4 py-2 rounded-xl border border-gray-700/50">
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">WhatsApp:</span>
                          <span className="text-xs font-bold text-white">{campaign.whatsapp}</span>
                      </div>
                  )}
                  {campaign.instagram && (
                      <div className="flex items-center gap-3 bg-gray-900/50 px-4 py-2 rounded-xl border border-gray-700/50">
                          <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Insta:</span>
                          <span className="text-xs font-bold text-white">{campaign.instagram}</span>
                      </div>
                  )}
                  {campaign.websiteUrl && (
                      <div className="flex items-center gap-3 bg-gray-900/50 px-4 py-2 rounded-xl border border-gray-700/50">
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Web:</span>
                          <span className="text-xs font-bold text-white truncate max-w-[150px]">{campaign.websiteUrl}</span>
                      </div>
                  )}
                  {campaign.pedidosYaUrl && (
                      <div className="flex items-center gap-3 bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/30">
                          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">PedidosYa</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      </div>
                  )}
                  {campaign.uberEatsUrl && (
                      <div className="flex items-center gap-3 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/30">
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Uber Eats</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                  )}
              </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          {/* Media Asset grid with Antigravity Cards */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              Vault <span className="text-tad-yellow">Multimedia</span>
            </h2>
            <Link href={`/media?openUpload=true&campaignId=${campaign.id}`} className="text-xs font-bold text-gray-400 hover:text-tad-yellow transition-colors uppercase tracking-wider leading-none flex items-center gap-2 bg-gray-900 border border-gray-700 px-4 py-2 rounded-xl shadow-sm">
               Inyectar Activos <ArrowLeft className="w-3 h-3 rotate-180" />
            </Link>
          </div>

          {assets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assets.map((asset, ai) => (
                <div 
                  key={asset.id} 
                  className={clsx(
                    "group/asset relative bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl overflow-hidden hover:border-tad-yellow/30 transition-all duration-500 shadow-md hover:shadow-lg hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8 fill-mode-both",
                    `[animation-delay:${ai * 50}ms]`
                  )}
                >
                  <div className="aspect-video bg-gray-900 relative overflow-hidden group-hover/asset:scale-[1.02] transition-transform duration-500">
                    <video 
                      src={getCleanUrl(asset.url || '')}
                      className="w-full h-full object-cover opacity-60 group-hover/asset:opacity-100 transition-opacity"
                      preload="metadata"
                      muted
                      playsInline
                      onMouseOver={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                      onMouseOut={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute top-3 right-3 p-2 bg-gray-900/60 backdrop-blur-md rounded-lg border border-gray-700 group-hover/asset:border-tad-yellow/40 transition-all">
                       <Play className="w-4 h-4 text-white group-hover/asset:text-tad-yellow transition-colors" />
                    </div>
                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                       <div className="bg-gray-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-700 text-[10px] text-tad-yellow font-bold tracking-widest uppercase">
                          {asset.duration || '?'}s
                       </div>
                       <div className="bg-gray-800/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-700 text-[10px] text-gray-300 font-bold tracking-widest uppercase">
                          {asset.type}
                       </div>
                    </div>
                    {/* Botón para Desvincular Activo */}
                    <button 
                      onClick={async (e) => {
                        e.preventDefault();
                        if (!confirm('¿Desvincular este activo de la campaña? El activo NO será borrado del sistema, solo de esta campaña.')) return;
                        try {
                          const { unlinkMediaFromCampaign } = await import('../../services/api');
                          await unlinkMediaFromCampaign(campaign.id, asset.id);
                          
                          // Optimistic update for immediate feedback
                          setCampaign(prev => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              mediaAssets: (prev.mediaAssets || []).filter((m: any) => m.id !== asset.id),
                              media: (prev.media || []).filter((m: any) => m.id !== asset.id)
                            };
                          });
                          toast.success('Activo desvinculado de la campaña');
                        } catch (err: any) {
                          toast.error('Error desvinculando activo: ' + err.message);
                        }
                      }}
                      title="Desvincular activo"
                      className="absolute top-3 left-3 p-2 bg-rose-500/80 hover:bg-rose-500 backdrop-blur-md rounded-lg border border-rose-500/50 text-white transition-all opacity-0 group-hover/asset:opacity-100 shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5">
                    <h4 className="text-sm font-bold text-white truncate mb-4 group-hover/asset:text-tad-yellow transition-colors">{asset.filename}</h4>
                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-widest pt-4 border-t border-gray-700/50">
                       <div className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-gray-600" />
                          {((asset.fileSize || 0) / 1024 / 1024).toFixed(2)} MB
                       </div>
                       <span className="opacity-60 group-hover/asset:opacity-100 transition-opacity">
                          ID: {asset.id.slice(0, 8)}
                       </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 bg-gray-800/20 border-2 border-dashed border-gray-700/50 rounded-2xl flex flex-col items-center justify-center text-center animate-in fade-in duration-700 hover:border-tad-yellow/30 transition-colors group">
              <Film className="w-12 h-12 text-gray-600 mb-6 group-hover:text-tad-yellow transition-colors" />
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Vault Vacío</h3>
              <p className="text-gray-500 font-bold uppercase tracking-wider text-xs max-w-sm leading-relaxed mb-6">
                No hay activos asignados a esta campaña.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-tad-yellow hover:bg-yellow-400 text-black px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <Zap className="w-4 h-4" /> Distribuir Contenido
              </button>
            </div>
          )}

          {/* Assigned Nodes Cluster */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Pantallas <span className="text-tad-yellow">Asignados</span>
              </h2>
              <div className="flex items-center gap-4">
                 <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{assignedDevices.length} Hardware</span>
                  <button 
                    onClick={fetchAssignedDevices} 
                    title="Actualizar pantallas"
                    className="p-2.5 bg-gray-900 border border-gray-700 rounded-xl hover:border-tad-yellow/30 transition-all text-gray-500 hover:text-tad-yellow shadow-sm"
                  >
                    <RefreshCcw className={clsx("w-4 h-4", loadingDevices && "animate-spin")} />
                  </button>
              </div>
            </div>

            {loadingDevices ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-800/40 rounded-2xl animate-pulse border border-gray-700/50" />)}
              </div>
            ) : assignedDevices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignedDevices.map((device, idx) => {
                    const isDeviceOnline = device.lastHeartbeat ? (new Date().getTime() - new Date(device.lastHeartbeat || device.lastSeen || '').getTime() < 300000) : false;
                    const delayStyle = { animationDelay: `${idx * 50}ms` } as React.CSSProperties;
                    const styleProps = { style: delayStyle };
                    return (
                      // eslint-disable-next-line
                      // nosonar
                      <div key={device.id} {...styleProps} className="group/node bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 hover:border-gray-500 transition-all duration-300 shadow-sm hover:shadow-md relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                       <div className={clsx(
                          "absolute -right-8 -bottom-8 w-24 h-24 blur-[40px] opacity-10 transition-all duration-500",
                          isDeviceOnline ? "bg-tad-yellow group-hover/node:opacity-20" : "bg-gray-500"
                       )} />
                       <div className="flex items-center justify-between mb-4 relative z-10">
                          <div className="flex items-center gap-4">
                             <div className={clsx(
                                "w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-300 shadow-sm shrink-0",
                                isDeviceOnline ? "bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow" : "bg-gray-900 border-gray-700 text-gray-500"
                             )}>
                                <Tablet className="w-6 h-6" />
                             </div>
                             <div className="min-w-0">
                                <h4 className="text-sm font-bold text-white uppercase truncate mb-0.5">{device.taxiNumber || "NODE"}</h4>
                                <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">ID: {device.deviceId.slice(0,6)}</p>
                             </div>
                          </div>
                          <div className={clsx(
                             "flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all",
                             isDeviceOnline ? "bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow" : "bg-gray-900 border-gray-700 text-gray-500"
                          )}>
                             <div className={clsx("w-1.5 h-1.5 rounded-full", isDeviceOnline ? "bg-tad-yellow animate-pulse" : "bg-gray-600")} />
                             {isDeviceOnline ? 'SYNC' : 'OFF'}
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
                          <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
                             <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 leading-none">Sector</p>
                             <p className="text-[11px] font-bold text-gray-300 truncate uppercase">{device.city || 'GLOBAL_NET'}</p>
                          </div>
                          <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
                             <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 leading-none">Latencia</p>
                             <p className="text-[11px] font-bold text-gray-300 truncate uppercase">{device.lastSeen ? formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true }).toUpperCase() : 'N/A'}</p>
                          </div>
                       </div>

                       <div className="flex items-center justify-between pt-4 border-t border-gray-700/50 relative z-10 gap-2">
                          <span className={clsx(
                             "text-[10px] font-bold px-3 py-1 rounded-lg border tracking-wider shrink-0",
                             device.assignment_type === 'GLOBAL' ? "bg-gray-800 text-gray-300 border-gray-700" : "bg-tad-yellow/10 text-tad-yellow border-tad-yellow/20"
                          )}>
                             {device.assignment_type || 'DIRECT'} CLUSTER
                          </span>
                          <div className="flex items-center gap-1.5 ml-auto">
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  if (!confirm('¿Desasignar esta pantalla de la campaña actual?')) return;
                                  try {
                                    const { removeCampaignFromDevice } = await import('../../services/api');
                                    await removeCampaignFromDevice(device.deviceId, campaign.id);
                                    
                                    // Optimistic update
                                    setAssignedDevices(prev => prev.filter(d => d.deviceId !== device.deviceId));
                                    toast.success('Pantalla desasignada correctamente');
                                  } catch (err: any) {
                                    toast.error('Error desasignando pantalla: ' + err.message);
                                  }
                                }}
                                title="Desasignar pantalla"
                                className="p-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                             <a 
                               href={`${process.env.NEXT_PUBLIC_PLAYER_URL || 'https://proyecto-ia-tad-player.rewvid.easypanel.host'}/tad-driver.html?deviceId=${device.deviceId}&server=${encodeURIComponent(process.env.NEXT_PUBLIC_API_URL || 'https://proyecto-ia-tad-api.rewvid.easypanel.host/api')}`}
                               target="_blank"
                               rel="noreferrer"
                               title="Ver Business Hub del Conductor (TAD DRIVE)"
                               className="p-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all"
                             >
                                <Smartphone className="w-3.5 h-3.5" />
                             </a>
                             <a 
                               href={`https://proyecto-ia-tad-player.rewvid.easypanel.host/?deviceId=${device.deviceId}`}
                               target="_blank"
                               rel="noreferrer"
                               title="Monitor en Vivo (Transmisión Actual)"
                               className="p-1.5 bg-tad-yellow/10 border border-tad-yellow/20 text-tad-yellow rounded-lg hover:bg-tad-yellow hover:text-black transition-all"
                             >
                                <Monitor className="w-3.5 h-3.5" />
                             </a>
                             <Link 
                               href={`/fleet?search=${device.deviceId}`}
                               title="Ver en Flota"
                               className="p-1.5 bg-gray-900 border border-gray-700 text-gray-400 hover:text-white rounded-lg transition-all"
                             >
                                <Target className="w-3.5 h-3.5" />
                             </Link>
                          </div>
                          <span className="text-[9px] font-bold text-gray-500 tracking-wider font-mono shrink-0">{device.assigned_at ? format(new Date(device.assigned_at), 'dd-MM-yy') : '---'}</span>
                       </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 bg-gray-800/20 border-2 border-dashed border-gray-700/50 rounded-2xl flex flex-col items-center justify-center text-center animate-in fade-in duration-700 hover:border-gray-500 transition-colors">
                <Tablet className="w-10 h-10 text-gray-600 mb-4" />
                <h3 className="text-lg font-black text-gray-400 uppercase tracking-tight mb-2">Red Desierta</h3>
                <p className="text-gray-500 font-medium text-xs max-w-xs mb-6 mx-auto leading-relaxed">
                   Hardware no asignado a esta campaña local.
                </p>
                <button onClick={() => setIsModalOpen(true)} className="bg-gray-900 hover:bg-tad-yellow hover:text-black text-gray-400 px-6 py-2.5 rounded-xl border border-gray-700 hover:border-tad-yellow text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                   Vincular Hardware <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tactical Metrics sidebar */}
        <div className="space-y-6">
           {/* Summary Stats Card */}
           <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-2xl shadow-sm relative overflow-hidden group/intel">
              <div className="absolute top-0 right-0 w-40 h-40 bg-tad-yellow/[0.03] blur-[60px] -z-10" />
              <div className="relative z-10">
                 <div className="w-12 h-12 bg-tad-yellow rounded-xl flex items-center justify-center mb-6 shadow-sm group-hover/intel:scale-105 transition-transform">
                    <Target className="w-6 h-6 text-black" />
                 </div>
                 <h4 className="text-xl font-black text-white uppercase tracking-tight leading-none mb-6">Métricas de <br/><span className="text-tad-yellow">Campaña</span></h4>
                 <div className="space-y-4 mb-6">
                   {[
                     { label: 'Estatus', value: campaign.status === 'active' ? 'ESTABLE' : 'PAUSADO', highlight: true },
                     { label: 'Prioridad', value: campaign.priority || 'NORMAL' },
                     { label: 'Versión', value: `v${campaign.version || '1.0'}` },
                     { label: 'Meta de Impresiones', value: (campaign.target_impressions || campaign.targetImpressions || 0).toLocaleString(), color: 'text-tad-yellow' }
                   ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-3 border-b border-gray-700/50 last:border-0 last:pb-0">
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</span>
                         <span className={clsx("text-xs font-bold uppercase tracking-wider", item.highlight ? "text-emerald-500" : item.color || "text-white")}>{item.value}</span>
                      </div>
                   ))}
                 </div>
                 <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Auditoría SSL Activa</span>
                 </div>
              </div>
           </div>

           {/* Geo Targets Card */}
           <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-2xl shadow-sm relative overflow-hidden group/geotarget">
              <div className="flex items-center gap-3 mb-6">
                 <MapPin className="w-5 h-5 text-tad-yellow animate-pulse" />
                 <h4 className="text-sm font-black text-white uppercase tracking-tight leading-none">Target Geográfico</h4>
              </div>
              <div className="space-y-3 mb-6">
                 {(() => {
                    try { 
                      const cities = JSON.parse(campaign.targetCities || '[]'); 
                      return cities.length > 0 ? cities.map((c: string, ci: number) => (
                        <div key={ci} className="flex items-center gap-3 bg-gray-900/50 px-4 py-3 rounded-xl border border-gray-700/50 hover:border-tad-yellow/30 transition-all">
                           <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow" />
                           <span className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">{c}</span>
                        </div>
                      )) : (
                        <div className="flex items-center gap-3 bg-tad-yellow/10 px-4 py-3 rounded-xl border border-tad-yellow/20">
                           <Layers className="w-4 h-4 text-tad-yellow" />
                           <span className="text-[10px] font-bold text-tad-yellow uppercase tracking-wider">Distribución Global</span>
                        </div>
                      );
                    } catch { return null; }
                 })()}
              </div>
              <button className="w-full bg-gray-900 hover:bg-tad-yellow hover:text-black hover:border-tad-yellow border border-gray-700 text-gray-400 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                 Exportar Intel <Download className="w-4 h-4" />
              </button>
           </div>

           <div className="p-6 border-2 border-dashed border-gray-700/50 rounded-2xl text-center opacity-50 hover:opacity-100 hover:border-tad-yellow/30 transition-all duration-300 cursor-default bg-gray-900/10">
              <ShieldCheck className="w-8 h-8 text-gray-500 mx-auto mb-3 transition-colors hover:text-tad-yellow" />
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono">TAD_CIPHER_VALIDATED</p>
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
