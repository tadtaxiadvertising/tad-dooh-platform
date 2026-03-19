import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import useSWR from 'swr';
import api, { getMedia, uploadMedia, getCampaigns, addVideoToCampaign, getMediaStatus, assignCampaignToDevices, updateMedia } from '../../services/api';
import { CloudUpload, Film, Zap, Calendar, Play, Activity, X, Eye, CheckCircle, AlertTriangle, HardDrive, ShieldCheck, Share2, Cpu } from 'lucide-react';
import { format } from 'date-fns';
import { useTabSync } from '../../hooks/useTabSync';
import { notifyChange } from '../../lib/sync-channel';
import clsx from 'clsx';

// Fetcher for SWR
const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function MediaPage() {
  const [media, setMedia] = useState<{ id: string; url: string; filename: string; originalFilename?: string; size?: number; mime?: string; qrUrl?: string; createdAt?: string }[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; advertiser: string; active: boolean; mediaAssets?: { checksum: string; url: string }[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [mediaStatus, setMediaStatus] = useState<Record<string, { active_devices?: string[] }>>({});
  
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [qrUrl, setQrUrl] = useState('');
  const [editingQr, setEditingQr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mediaData, campaignsData] = await Promise.all([
        getMedia(), 
        getCampaigns()
      ]);
      setMedia(Array.isArray(mediaData) ? mediaData : []);
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
    } catch (err) {
      console.error(err);
      setError("ERROR DE ENLACE CON LA BÓVEDA MULTIMEDIA.");
    } finally {
      setLoading(false);
    }
  }, []);

  useTabSync('MEDIA', loadData);
  useTabSync('DEVICES', loadData);
  useTabSync('CAMPAIGNS', loadData);

  // TAREA B: Frontend Refactor - SWR Implementation for Fleet Summary
  // Eliminates individual GET /api/device/:id/slots calls.
  const { data: fleetSummary, error: swrError, isLoading: swrLoading } = useSWR('/fleet/summary', fetcher, {
    dedupingInterval: 60000,
    revalidateOnFocus: false
  });
  
  const devices = Array.isArray(fleetSummary) ? fleetSummary : [];

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (media.length === 0) return;
    const fetchStatuses = async () => {
      const statusMap: Record<string, { active_devices?: string[] }> = {};
      const batch = media.slice(0, 10);
      await Promise.all(batch.map(async (m) => {
        try {
          const status = await getMediaStatus(m.id);
          statusMap[m.id] = status;
        } catch { /* ignore */ }
      }));
      setMediaStatus(statusMap);
    };
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 120000);
    return () => clearInterval(interval);
  }, [media]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      Object.values(localPreviews).forEach(url => URL.revokeObjectURL(url));
    };
  }, [filePreviewUrl, localPreviews]);

  const getPreviewUrlForFile = (file: { id: string; url: string }) => {
    if (localPreviews[file.id]) return localPreviews[file.id];
    return file.url?.split('#')[0] || file.url;
  };

  const getDisplayName = (file: { originalFilename?: string; filename?: string }) => {
    if (file.originalFilename) return file.originalFilename;
    const basename = file.filename?.split('/').pop() || 'Untitled';
    if (/^[0-9a-f]{8}-/.test(basename)) return `MEDIA-${basename.slice(0, 8)}.${basename.split('.').pop() || 'mp4'}`;
    return basename;
  };

  const getLinkedCampaigns = (mediaId: string) => {
    return campaigns.filter(c => c.mediaAssets?.some((a) => a.checksum === mediaId || a.url?.includes(mediaId)));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    const blobUrl = URL.createObjectURL(file);
    setFilePreviewUrl(blobUrl);
    if (!title) {
      const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(name.charAt(0).toUpperCase() + name.slice(1));
    }
  };

  const resetUploadForm = () => {
    setTitle('');
    setSelectedCampaign('');
    setSelectedFile(null);
    setDuration(30);
    setSelectedDevices([]);
    setUploadProgress(0);
    if (filePreviewUrl) { URL.revokeObjectURL(filePreviewUrl); setFilePreviewUrl(null); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedCampaign || !title) return;
    setUploading(true);
    setUploadProgress(10);
    try {
      setUploadProgress(30);
      const uploadedData = await uploadMedia(selectedFile, selectedCampaign, qrUrl);
      setUploadProgress(60);
      await Promise.all([
        addVideoToCampaign(selectedCampaign, {
          type: 'video',
          filename: title,
          url: uploadedData.url,
          fileSize: uploadedData.size,
          checksum: uploadedData.id,
          duration: Number(duration)
        }),
        selectedDevices.length > 0 ? assignCampaignToDevices(selectedCampaign, selectedDevices) : Promise.resolve()
      ]);
      setUploadProgress(90);
      if (filePreviewUrl) {
        setLocalPreviews(prev => ({ ...prev, [uploadedData.id]: filePreviewUrl }));
        setFilePreviewUrl(null);
      }
      setUploadProgress(100);
      setShowUploadModal(false);
      resetUploadForm();
      await loadData();
      notifyChange('MEDIA');
      notifyChange('CAMPAIGNS');
    } catch (e) {
      console.error(e);
      alert("Error crítico en handshake de carga.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Purgar permanentemente este activo de la bóveda?')) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/${fileId}/delete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('tad_admin_token')}` }
      });
      await loadData();
      notifyChange('MEDIA');
    } catch (err) { console.error(err); }
  };

  const handleUpdateQR = async (fileId: string, url: string) => {
    try {
      await updateMedia(fileId, { qrUrl: url });
      setEditingQr(null);
      await loadData();
      notifyChange('MEDIA');
    } catch (err) {
      console.error(err);
      alert('Error actualizando URL satelital');
    }
  };

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-15%] left-[-10%] w-[65%] h-[65%] bg-tad-yellow/[0.04] blur-[180px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[5%] right-[-10%] w-[55%] h-[55%] bg-white/[0.01] blur-[160px] rounded-full" />
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-tad-yellow rounded-3xl flex items-center justify-center shadow-[0_20px_50px_rgba(255,212,0,0.15)]">
                <Film className="w-7 h-7 text-black" />
             </div>
             <div>
                <div className="flex items-center gap-3 mb-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow shadow-[0_0_8px_rgba(255,212,0,0.8)] animate-pulse" />
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Integrated Media Vault v4.2</p>
                </div>
                <h1 className="text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none font-display">
                  Media <span className="text-tad-yellow transition-all duration-700 hover:text-white cursor-default italic">Nexus</span>
                </h1>
             </div>
          </div>
          <p className="text-zinc-500 max-w-2xl text-[12px] font-bold uppercase tracking-widest leading-relaxed">
            Manage <span className="text-white">high-performance visual assets</span> and distribution pipelines.
          </p>
        </div>
        
        <button 
          onClick={() => { resetUploadForm(); setShowUploadModal(true); }}
          className="btn-primary px-10 h-14 flex items-center gap-4 group"
        >
          <CloudUpload className="w-5 h-5 transition-transform group-hover:-translate-y-1 duration-300" />
          Ingesta_Multimedia
        </button>
      </div>

      {error && (
        <div className="mb-12 p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex items-center gap-4 text-rose-500 animate-in zoom-in duration-500">
           <AlertTriangle className="w-6 h-6 animate-pulse" />
           <p className="text-xs font-black uppercase tracking-widest">{error}</p>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        {[
           { label: 'Total Vault Assets', value: media.length, icon: Film, color: 'yellow' },
           { label: 'Network Points', value: media.filter(m => getLinkedCampaigns(m.id).length > 0).length, icon: Share2, color: 'white' },
           { label: 'Integrity Check', value: '100%', icon: HardDrive, color: 'yellow' }
        ].map((stat, i) => (
           <div key={i} className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 p-8 rounded-[3rem] group hover:border-tad-yellow/30 transition-all duration-700 hover:-translate-y-2 shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
              <div className="flex justify-between items-start mb-8">
                 <div className={clsx("p-5 rounded-full border transition-all duration-700 shadow-2xl", 
                   stat.color === 'yellow' ? "bg-tad-yellow text-black border-tad-yellow" : "bg-black/60 border-white/10 text-white"
                 )}>
                    <stat.icon className="w-6 h-6" />
                 </div>
                 <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
              </div>
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1.5 italic lowercase">{stat.label}</p>
              <h3 className="text-4xl font-black text-white italic tracking-tighter leading-none font-display">
                {typeof stat.value === 'number' && stat.value < 10 ? `0${stat.value}` : stat.value}
              </h3>
           </div>
        ))}
      </div>

      {/* Media Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {loading ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="h-80 bg-zinc-900/20 backdrop-blur-3xl animate-pulse rounded-[3rem] border border-white/5" />)
        ) : media.length > 0 ? (
          media.map((file, idx) => {
            const linkedCampaigns = getLinkedCampaigns(file.id);
            const videoUrl = getPreviewUrlForFile(file);
            const displayName = getDisplayName(file);
            const isVideo = file.mime?.includes('video') || file.url?.includes('.mp4') || file.url?.includes('.webm');
            const isActive = mediaStatus[file.id]?.active_devices && mediaStatus[file.id].active_devices!.length > 0;

            return (
              <div 
                key={file.id} 
                className={clsx(
                  "group relative bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden hover:border-tad-yellow/30 transition-all duration-700 hover:-translate-y-3 shadow-[0_45px_100px_rgba(0,0,0,0.6)] flex flex-col animate-in fade-in slide-in-from-bottom-8 fill-mode-both",
                  `[animation-delay:${idx * 50}ms]`
                )}
              >
                {/* Preview Surface */}
                <div 
                  className="aspect-video bg-black relative overflow-hidden cursor-pointer group/surface"
                  onClick={() => { setPreviewUrl(videoUrl); setPreviewTitle(displayName); }}
                >
                  {isVideo ? (
                    <video 
                      src={videoUrl} 
                      className="w-full h-full object-contain transition-transform duration-1000 group-hover/surface:scale-110"
                      preload="metadata"
                      muted
                      onMouseOver={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                      onMouseOut={e => {
                        const v = e.target as HTMLVideoElement;
                        v.pause(); v.currentTime = 0;
                      }}
                    />
                  ) : (
                    <div className="relative w-full h-full transition-transform duration-1000 group-hover/surface:scale-110">
                      <Image src={videoUrl} alt={displayName} fill className="object-cover" />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
                  
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/surface:opacity-100 transition-all duration-500 scale-90 group-hover/surface:scale-100 pointer-events-none">
                    <div className="bg-tad-yellow text-black rounded-full p-5 shadow-[0_0_40px_rgba(250,212,0,0.5)]">
                      <Play className="w-8 h-8 fill-black" />
                    </div>
                                    <div className="absolute top-6 left-6 flex gap-3">
                    {isActive ? (
                       <div className="bg-tad-yellow text-[10px] font-black px-6 py-2 rounded-full text-black uppercase tracking-widest flex items-center gap-2.5 shadow-2xl shadow-tad-yellow/20 animate-pulse">
                         <Activity className="w-4 h-4" /> LOCAL_LIVE
                       </div>
                    ) : (
                       <div className="bg-zinc-950/80 backdrop-blur-md text-[9px] font-black px-5 py-2 rounded-full text-zinc-500 border border-white/10 uppercase tracking-[0.2em] shadow-lg">
                         READY_IDLE
                       </div>
                    )}
                  </div>  </div>

                  <button 
                    onClick={(e) => handleDelete(file.id, e)}
                    title="Purgar activo"
                    className="absolute top-6 right-6 bg-rose-500/10 hover:bg-rose-600 backdrop-blur-md text-rose-500 hover:text-white p-3 rounded-2xl transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-500 border border-rose-500/20"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Information Surface */}
                <div className="p-8 flex-1 flex flex-col">
                  <div className="mb-8">
                     <h4 className="text-2xl font-black text-white italic tracking-tighter uppercase truncate leading-none mb-3 group-hover:text-tad-yellow transition-colors duration-500">{displayName}</h4>
                     <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-tad-yellow" /> {isVideo ? 'CODEC_AV1' : 'STATIC_RAW'} • {(file.size ? file.size / 1024 / 1024 : 0).toFixed(2)} MB
                     </p>
                  </div>

                  <div className="space-y-5 mb-10">
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em] flex items-center gap-2 italic">
                       <Zap className="w-3.5 h-3.5" /> Canales de Difusión
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {linkedCampaigns.length > 0 ? (
                        linkedCampaigns.map((c) => (
                          <div key={c.id} className="bg-zinc-800/40 border border-white/5 px-4 py-2 rounded-xl hover:border-tad-yellow/40 hover:bg-zinc-800/60 transition-all flex items-center gap-2 group/tag cursor-default">
                             <div className="w-2 h-2 rounded-full bg-tad-yellow/30 group-hover/tag:bg-tad-yellow transition-colors shadow-[0_0_5px_rgba(255,212,0,0.3)]" />
                             <span className="text-[11px] font-black text-zinc-400 group-hover/tag:text-white transition-colors uppercase tracking-tight italic">{c.name}</span>
                          </div>
                        ))
                      ) : (
                        <div className="w-full py-5 text-center border-2 border-dashed border-white/10 rounded-2xl bg-black/20">
                           <p className="text-[10px] text-zinc-700 font-black uppercase italic tracking-widest">Sin Enlace Activo</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 mb-10 p-5 bg-black/40 rounded-[2rem] border border-white/5 group/qr">
                    <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.3em] flex items-center justify-between italic">
                      <span className="flex items-center gap-2">
                        <Share2 className="w-3.5 h-3.5 text-tad-yellow" /> QR Redirect Target
                      </span>
                      {file.qrUrl ? (
                         <span className="text-emerald-500/50">LINK_ACTIVE</span>
                      ) : (
                         <span className="text-rose-500/50">NO_LINK</span>
                      )}
                    </p>
                    
                    {editingQr === file.id ? (
                      <div className="flex gap-2">
                         <input 
                           type="text" 
                           defaultValue={file.qrUrl || ''} 
                           autoFocus
                           aria-label="URL de destino para QR"
                           placeholder="https://..."
                           className="flex-1 bg-zinc-900/50 border border-tad-yellow/30 rounded-xl px-4 py-2.5 text-[11px] text-white focus:outline-none focus:border-tad-yellow italic"
                           onKeyDown={(e) => {
                             if (e.key === 'Enter') handleUpdateQR(file.id, e.currentTarget.value);
                             if (e.key === 'Escape') setEditingQr(null);
                           }}
                         />
                         <button 
                           onClick={(e) => {
                             const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                             handleUpdateQR(file.id, input.value);
                           }}
                           title="Guardar URL QR"
                           aria-label="Guardar URL"
                           className="bg-tad-yellow p-2.5 rounded-xl text-black"
                         >
                            <ShieldCheck className="w-4 h-4" />
                         </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => setEditingQr(file.id)}
                        className="flex items-center justify-between cursor-pointer group-hover/qr:border-tad-yellow/20 border border-transparent rounded-xl transition-all"
                      >
                         <p className="text-[11px] font-bold text-zinc-500 truncate max-w-[200px] italic">
                           {file.qrUrl || 'Asignar destino QR de video...'}
                         </p>
                         <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center opacity-0 group-hover/qr:opacity-100 transition-all">
                            <Zap className="w-3.5 h-3.5 text-zinc-500" />
                         </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-8 border-t border-white/10 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-zinc-800 border border-white/5 flex items-center justify-center group-hover:bg-tad-yellow group-hover:text-black transition-all shadow-inner">
                           <Calendar className="w-5 h-5 text-zinc-500 group-hover:text-black" />
                        </div>
                        <div>
                           <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest leading-none mb-1.5">Registro</p>
                           <p className="text-sm font-black text-zinc-400 italic">{file.createdAt ? format(new Date(file.createdAt), 'dd.MM.yy') : 'REC_ID'}</p>
                        </div>
                     </div>
                     
                     <div className="flex -space-x-3">
                        {mediaStatus[file.id]?.active_devices?.slice(0, 3).map((id) => (
                          <div key={id} title={id} className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center text-[9px] font-black text-tad-yellow shadow-xl hover:z-10 hover:-translate-y-2 transition-all cursor-help ring-1 ring-white/5">
                             {devices.find(d => d.device_id === id)?.taxiNumber?.replace('TAXI-', '') || 'ND'}
                          </div>
                        ))}
                        {(!mediaStatus[file.id]?.active_devices || mediaStatus[file.id].active_devices!.length === 0) && (
                          <div className="flex items-center gap-2.5 px-5 py-2.5 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 shadow-inner">
                             <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" />
                             <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest italic">Integral</span>
                          </div>
                        )}
                     </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-40 border-2 border-dashed border-white/5 rounded-[4rem] bg-zinc-950/20 flex flex-col items-center justify-center text-center opacity-0 animate-in fade-in duration-1000 fill-mode-both">
            <div className="w-24 h-24 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-3xl">
               <Activity className="w-12 h-12 text-zinc-800" />
            </div>
            <h3 className="text-3xl font-black text-zinc-700 uppercase italic tracking-[0.2em] leading-none mb-4">Vacío Operacional</h3>
            <p className="text-zinc-800 font-bold uppercase tracking-[0.2em] text-[10px] max-w-sm leading-relaxed mb-10">
               No se detectan activos en la bóveda central. Inicie el protocolo de ingesta para poblar el cluster multimedia.
            </p>
            <button 
               onClick={() => { resetUploadForm(); setShowUploadModal(true); }}
               className="bg-white/5 hover:bg-tad-yellow hover:text-black text-zinc-400 px-12 py-5 rounded-[2rem] border border-white/5 hover:border-transparent text-[10px] font-black uppercase tracking-[0.5em] transition-all italic"
            >
               INICIAR INGESTA CORE
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={() => setPreviewUrl(null)} />
          <div className="relative w-full max-w-5xl animate-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                 <div className="w-2 h-8 bg-tad-yellow rounded-full" />
                 <h3 className="text-white font-black text-2xl uppercase italic tracking-tighter">{previewTitle || 'PROTOTIPO_VISUAL'}</h3>
              </div>
              <button 
                onClick={() => setPreviewUrl(null)} 
                title="Cerrar vista previa"
                className="p-4 bg-white/5 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-500 rounded-2xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="bg-zinc-950 rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl aspect-video relative group">
              <video src={previewUrl} controls autoPlay className="w-full h-full object-contain" />
              <div className="absolute inset-x-0 bottom-0 h-1 bg-tad-yellow/20">
                 <div className="h-full bg-tad-yellow w-full" />
              </div>
            </div>
            <p className="text-center mt-6 text-[10px] text-zinc-600 font-black uppercase tracking-[0.5em] italic">© TADCORE PREVIEW SYSTEM CORE v4.2</p>
          </div>
        </div>
      )}

      {/* Upload Nexus Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => !uploading && setShowUploadModal(false)} />
          <div className="relative bg-zinc-950 border border-white/10 w-full max-w-3xl rounded-[3.5rem] overflow-hidden shadow-3xl animate-in zoom-in-95 duration-500 max-h-[90vh] flex flex-col">
            
            {uploading && (
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-900 z-50">
                <div 
                  className={clsx(
                    "h-full bg-tad-yellow transition-all duration-700 shadow-[0_0_15px_#fad400]",
                    `w-[${uploadProgress}%]`
                  )} 
                />
              </div>
            )}

            <div className="p-10 pb-6 flex justify-between items-center bg-white/[0.01] border-b border-white/5">
              <div className="flex items-center gap-6">
                <div className="p-5 bg-tad-yellow rounded-3xl shadow-2xl shadow-tad-yellow/20 group hover:rotate-12 transition-transform">
                   <CloudUpload className="w-8 h-8 text-black" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">Ingesta de <span className="text-tad-yellow">Activos</span></h3>
                  <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">Protocolo de Carga Periférica</p>
                </div>
              </div>
              {!uploading && (
                <button 
                  onClick={() => { setShowUploadModal(false); resetUploadForm(); }} 
                  title="Cerrar modal"
                  className="p-4 bg-white/5 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-500 rounded-2xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>

            <form onSubmit={handleUpload} className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Handshake de Archivo</label>
                {!selectedFile ? (
                  <div className="relative border-2 border-dashed border-white/5 hover:border-tad-yellow/30 bg-black/40 rounded-[2.5rem] p-16 transition-all duration-500 group/drop cursor-pointer flex flex-col items-center">
                    <input type="file" accept="video/mp4, video/webm" ref={fileInputRef} onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" title="Escoger archivo" />
                    <Film className="w-16 h-16 text-zinc-800 mb-6 group-hover/drop:text-tad-yellow group-hover/drop:scale-110 transition-all duration-500" />
                    <p className="text-lg font-black text-zinc-500 italic uppercase tracking-tighter group-hover:text-white transition-colors">VINCULAR VIDEO AL NODO</p>
                    <p className="text-[10px] text-zinc-700 font-bold mt-2 uppercase tracking-widest italic">MP4 / WEBM • Límite Operacional 50MB</p>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="relative aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 bg-black shadow-2xl">
                      <video src={filePreviewUrl || ''} controls className="w-full h-full" preload="metadata" />
                      <div className="absolute top-6 left-6">
                        <span className="bg-tad-yellow text-black text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest italic flex items-center gap-2 shadow-2xl">
                          <Eye className="w-3.5 h-3.5" /> Handshake Visual Confirmado
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5">
                      <div className="flex items-center gap-5">
                        <div className="p-4 bg-tad-yellow/10 rounded-2xl border border-tad-yellow/20">
                           <Play className="w-5 h-5 text-tad-yellow shadow-[0_0_10px_#fad400]" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white italic uppercase tracking-tighter">{selectedFile?.name}</p>
                          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest italic">{(selectedFile!.size / 1024 / 1024).toFixed(2)} MB • {selectedFile?.type.toUpperCase()}</p>
                        </div>
                      </div>
                      <button type="button" onClick={resetUploadForm} className="text-[10px] font-black text-tad-yellow uppercase tracking-widest italic hover:underline">Reiniciar Ingesta</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1 italic">Identificador del Contenido</label>
                  <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-white/5 rounded-2xl px-6 py-5 text-white font-black italic tracking-tighter focus:border-tad-yellow outline-none transition-all placeholder:text-zinc-800" placeholder="Ej. CAMPAÑA_DISTRI_V4" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1 italic">Ciclo de Reproducción</label>
                  <select 
                    required 
                    value={duration} 
                    onChange={e => setDuration(Number(e.target.value))} 
                    title="Seleccionar duración del activo"
                    className="w-full bg-black border border-white/5 rounded-2xl px-6 py-5 text-white font-black italic tracking-tighter focus:border-tad-yellow outline-none transition-all cursor-pointer"
                  >
                    <option value={30}>30 SEGUNDOS</option>
                    <option value={60}>60 SEGUNDOS</option>
                    <option value={120}>120 SEGUNDOS</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1 italic">Destino Escaneo QR (Opcional)</label>
                <div className="relative group/input">
                   <div className="absolute left-6 top-1/2 -translate-y-1/2">
                      <Share2 className="w-4 h-4 text-zinc-700 group-focus-within/input:text-tad-yellow transition-colors" />
                   </div>
                   <input 
                     type="text" 
                     value={qrUrl} 
                     onChange={e => setQrUrl(e.target.value)} 
                     className="w-full bg-black border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-white font-black italic tracking-tighter focus:border-tad-yellow outline-none transition-all placeholder:text-zinc-800" 
                     placeholder="https://tudominio.com/promo-video" 
                   />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1 italic">Asignación de Campaña Objetivo</label>
                <select 
                  required 
                  value={selectedCampaign} 
                  onChange={e => setSelectedCampaign(e.target.value)} 
                  title="Seleccionar campaña objetivo"
                  className="w-full bg-black border border-white/5 rounded-2xl px-6 py-5 text-white font-black italic tracking-tighter focus:border-tad-yellow outline-none cursor-pointer"
                >
                  <option value="" disabled>-- SELECCIONAR CLUSTER OBJETIVO --</option>
                  {campaigns?.filter(c => c.active).map(c => (
                    <option key={c.id} value={c.id}>{c.name.toUpperCase()} [{c.advertiser.toUpperCase()}]</option>
                  ))}
                </select>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center px-1">
                   <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">Difusión Crítica (Taxis)</label>
                   <span className="text-[10px] font-black text-tad-yellow uppercase italic tracking-widest">{selectedDevices.length} DESTINOS</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto pr-3 custom-scrollbar">
                   {swrLoading ? (
                     <div className="col-span-1 sm:col-span-2 py-10 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-tad-yellow animate-spin border-t-transparent" /></div>
                   ) : swrError ? (
                     <div className="col-span-1 sm:col-span-2 text-[10px] text-rose-500 font-bold uppercase py-4">Falla en Sincronización de Nodos</div>
                   ) : devices.map(device => {
                      const count = device.occupied_slots || 0;
                      const limit = device.max_slots || 15;
                      const freeSlots = limit - count;
                      const isSelected = selectedDevices.includes(device.device_id);
                      const isFull = freeSlots <= 0;

                      return (
                        <div key={device.device_id} onClick={() => { if (!isFull || isSelected) setSelectedDevices(prev => prev.includes(device.device_id) ? prev.filter(id => id !== device.device_id) : [...prev, device.device_id]); }} className={clsx("p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group/dev", isSelected ? "bg-tad-yellow/10 border-tad-yellow/40" : "bg-black/60 border-white/5 hover:border-white/20", isFull && !isSelected && "opacity-30 cursor-not-allowed")}>
                           <div className="flex items-center gap-4 min-w-0">
                              <div className={clsx("p-2 rounded-xl transition-all", isSelected ? "bg-tad-yellow text-black" : "bg-zinc-900 text-zinc-700")}>
                                 <CheckCircle className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                 <p className="text-[11px] font-black text-white italic truncate uppercase">{device.taxiNumber || device.name || device.device_id.slice(0, 8)}</p>
                                 <div className="flex items-center gap-2 mt-1">
                                    <div className={clsx("w-1.5 h-1.5 rounded-full", device.status === 'online' ? "bg-emerald-500 shadow-[0_0_5px_#10b981]" : "bg-zinc-800")} />
                                    <p className="text-[8px] font-black text-zinc-600 uppercase italic">{freeSlots} SLOTS</p>
                                 </div>
                              </div>
                           </div>
                           {isFull && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                        </div>
                      );
                   })}
                </div>
              </div>

              <div className="pt-6">
                <button 
                  disabled={uploading || !selectedFile} 
                  type="submit" 
                  title="Ejecutar ingesta"
                  className="w-full bg-tad-yellow hover:bg-yellow-400 text-black font-black italic uppercase tracking-[0.2em] py-6 rounded-3xl shadow-3xl shadow-tad-yellow/10 disabled:opacity-50 transition-all flex items-center justify-center gap-4 active:scale-95"
                >
                  {uploading ? (
                    <>
                       <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                       SUBIENDO_NODO {uploadProgress}%
                    </>
                  ) : (
                    <><CloudUpload className="w-6 h-6" /> EJECUTAR INGESTA MULTIMEDIA</>
                  )}
                </button>
              </div>
            </form>
            
            <div className="p-6 bg-white/[0.02] border-t border-white/5 text-center">
               <p className="text-[9px] text-zinc-800 font-black uppercase tracking-[0.5em] italic">© TADCORE UPLOAD NEXUS TERMINAL v4.2</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
