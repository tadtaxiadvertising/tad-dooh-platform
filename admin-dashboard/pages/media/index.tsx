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
    <div className="min-h-screen pb-12 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 pt-6">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-tad-yellow/[0.04] blur-[150px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[0%] right-[-5%] w-[40%] h-[40%] bg-white/[0.01] blur-[120px] rounded-full" />
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 mt-2">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-tad-yellow rounded-xl flex items-center justify-center shadow-lg">
                <Film className="w-6 h-6 text-black" />
             </div>
             <div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none">
                  Vault <span className="text-tad-yellow transition-all duration-700 hover:text-white cursor-default">Multimedia</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow animate-pulse" />
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Activos y Distribución</p>
                </div>
             </div>
          </div>
        </div>
        
        <button 
          onClick={() => { resetUploadForm(); setShowUploadModal(true); }}
          className="bg-tad-yellow hover:bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold text-sm tracking-wider uppercase transition-all flex items-center gap-2"
        >
          <CloudUpload className="w-4 h-4" />
          Inyectar Activo
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-500">
           <AlertTriangle className="w-5 h-5 animate-pulse" />
           <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
           { label: 'Total Vault Assets', value: media.length, icon: Film, color: 'yellow' },
           { label: 'Network Points', value: media.filter(m => getLinkedCampaigns(m.id).length > 0).length, icon: Share2, color: 'white' },
           { label: 'Auditoría SSL', value: '100%', icon: HardDrive, color: 'yellow' }
        ].map((stat, i) => (
           <div key={i} className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-2xl hover:border-tad-yellow/30 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                 <div className={clsx("p-3 rounded-xl", 
                   stat.color === 'yellow' ? "bg-tad-yellow/10 text-tad-yellow" : "bg-gray-900 text-gray-400"
                 )}>
                    <stat.icon className="w-5 h-5" />
                 </div>
                 <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black text-white tracking-tight">
                {typeof stat.value === 'number' && stat.value < 10 ? `0${stat.value}` : stat.value}
              </h3>
           </div>
        ))}
      </div>

      {/* Media Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          [1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-64 bg-gray-800/40 backdrop-blur-xl animate-pulse rounded-2xl border border-gray-700/50" />)
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
                  "group relative bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl overflow-hidden hover:border-tad-yellow/30 transition-all duration-500 shadow-sm hover:shadow-md hover:-translate-y-1 flex flex-col animate-in fade-in slide-in-from-bottom-8 fill-mode-both",
                  `[animation-delay:${idx * 50}ms]`
                )}
              >
                {/* Preview Surface */}
                <div 
                  className="aspect-video bg-gray-900 relative overflow-hidden cursor-pointer group/surface"
                  onClick={() => { setPreviewUrl(videoUrl); setPreviewTitle(displayName); }}
                >
                  {isVideo ? (
                    <video 
                      src={videoUrl} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover/surface:scale-105"
                      preload="metadata"
                      muted
                      onMouseOver={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                      onMouseOut={e => {
                        const v = e.target as HTMLVideoElement;
                        v.pause(); v.currentTime = 0;
                      }}
                    />
                  ) : (
                    <div className="relative w-full h-full transition-transform duration-700 group-hover/surface:scale-105">
                      <Image src={videoUrl} alt={displayName} fill className="object-cover" />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60" />
                  
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/surface:opacity-100 transition-all duration-300 scale-95 group-hover/surface:scale-100 pointer-events-none">
                    <div className="bg-tad-yellow text-black rounded-full p-4 shadow-[0_0_20px_rgba(250,212,0,0.5)]">
                      <Play className="w-6 h-6 fill-black" />
                    </div>
                  </div>
                  
                  <div className="absolute top-4 left-4 flex gap-2">
                    {isActive ? (
                       <div className="bg-tad-yellow text-[10px] font-bold px-3 py-1 rounded-full text-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm animate-pulse">
                         <Activity className="w-3 h-3" /> LIVE
                       </div>
                    ) : (
                       <div className="bg-gray-900/80 backdrop-blur-md text-[10px] font-bold px-3 py-1 rounded-full text-gray-500 border border-gray-700 uppercase tracking-wider shadow-sm">
                         IDLE
                       </div>
                    )}
                  </div>  

                  <button 
                    onClick={(e) => handleDelete(file.id, e)}
                    title="Eliminar activo"
                    className="absolute top-4 right-4 bg-rose-500/10 hover:bg-rose-600 backdrop-blur-md text-rose-500 hover:text-white p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 duration-300 border border-rose-500/20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Information Surface */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-4">
                     <h4 className="text-sm font-bold text-white truncate mb-1.5 group-hover:text-tad-yellow transition-colors duration-300">{displayName}</h4>
                     <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Cpu className="w-3 h-3 text-tad-yellow" /> {isVideo ? 'VIDEO' : 'STATIC'} • {(file.size ? file.size / 1024 / 1024 : 0).toFixed(2)} MB
                     </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest flex items-center gap-1.5">
                       <Zap className="w-3 h-3" /> Campanãs Enlazadas
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {linkedCampaigns.length > 0 ? (
                        linkedCampaigns.map((c) => (
                          <div key={c.id} className="bg-gray-900/50 border border-gray-700/50 px-2 py-1.5 rounded-lg hover:border-tad-yellow/40 transition-all flex items-center gap-1.5 group/tag cursor-default">
                             <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow/50 group-hover/tag:bg-tad-yellow transition-colors" />
                             <span className="text-[10px] font-bold text-gray-400 group-hover/tag:text-white transition-colors uppercase truncate max-w-[120px]">{c.name}</span>
                          </div>
                        ))
                      ) : (
                        <div className="w-full py-3 text-center border border-dashed border-gray-700 rounded-xl bg-gray-900/20">
                           <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Sin Enlace</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mb-6 p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 group/qr hover:border-gray-500 transition-colors">
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Share2 className="w-3 h-3 text-tad-yellow" /> Enlace QR
                      </span>
                      {file.qrUrl ? (
                         <span className="text-emerald-500/50">ACTIVO</span>
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
                           className="flex-1 bg-gray-800 border border-tad-yellow/30 rounded-lg px-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-tad-yellow"
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
                           className="bg-tad-yellow p-1.5 rounded-lg text-black"
                         >
                            <ShieldCheck className="w-3.5 h-3.5" />
                         </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => setEditingQr(file.id)}
                        className="flex items-center justify-between cursor-pointer group-hover/qr:border-tad-yellow/20 border border-transparent rounded-lg transition-all"
                      >
                         <p className="text-[10px] font-bold text-gray-400 truncate max-w-[150px]">
                           {file.qrUrl || 'Asignar destino...'}
                         </p>
                         <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center opacity-0 group-hover/qr:opacity-100 transition-all border border-gray-700">
                            <Zap className="w-3 h-3 text-gray-500" />
                         </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-700/50 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center group-hover:text-tad-yellow transition-colors">
                           <Calendar className="w-3.5 h-3.5 text-gray-500 group-hover:text-tad-yellow" />
                        </div>
                        <div>
                           <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest leading-none mb-1">Registro</p>
                           <p className="text-[11px] font-bold text-gray-400">{file.createdAt ? format(new Date(file.createdAt), 'dd MMM yy') : 'ID'}</p>
                        </div>
                     </div>
                     
                     <div className="flex -space-x-2">
                        {mediaStatus[file.id]?.active_devices?.slice(0, 3).map((id) => (
                          <div key={id} title={id} className="w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-900 flex items-center justify-center text-[8px] font-bold text-tad-yellow shadow-sm hover:z-10 hover:-translate-y-1 transition-transform cursor-help">
                             {devices.find(d => d.device_id === id)?.taxiNumber?.replace('TAXI-', '') || 'ND'}
                          </div>
                        ))}
                        {(!mediaStatus[file.id]?.active_devices || mediaStatus[file.id].active_devices!.length === 0) && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                             <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                             <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Seguro</span>
                          </div>
                        )}
                     </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-24 border-2 border-dashed border-gray-700/50 rounded-3xl bg-gray-800/20 flex flex-col items-center justify-center text-center opacity-0 animate-in fade-in duration-1000 fill-mode-both">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
               <Activity className="w-8 h-8 text-gray-700" />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Vacío Operacional</h3>
            <p className="text-gray-500 font-bold uppercase tracking-wider text-xs max-w-sm leading-relaxed mb-6">
               No se detectan activos en la Vault. Inicie una subida para poblar el entorno multimedia.
            </p>
            <button 
               onClick={() => { resetUploadForm(); setShowUploadModal(true); }}
               className="bg-gray-900 hover:bg-tad-yellow hover:text-black text-gray-400 px-6 py-3 rounded-xl border border-gray-700 hover:border-tad-yellow text-xs font-bold uppercase tracking-widest transition-all"
            >
               INICIAR INGESTA TÁCTICA
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setPreviewUrl(null)} />
          <div className="relative w-full max-w-5xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                 <div className="w-1.5 h-6 bg-tad-yellow rounded-full" />
                 <h3 className="text-white font-black text-xl uppercase tracking-widest">{previewTitle || 'PREVIEW'}</h3>
              </div>
              <button 
                onClick={() => setPreviewUrl(null)} 
                title="Cerrar vista previa"
                className="p-2.5 bg-gray-900 border border-gray-700 hover:border-rose-500/50 hover:bg-rose-500/10 text-gray-400 hover:text-rose-500 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-xl aspect-video relative group">
              <video src={previewUrl} controls autoPlay className="w-full h-full object-contain" />
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gray-800">
                 <div className="h-full bg-tad-yellow w-full" />
              </div>
            </div>
            <p className="text-center mt-4 text-[10px] text-gray-600 font-bold uppercase tracking-widest">© PREVIEW SYSTEM V4.2</p>
          </div>
        </div>
      )}

      {/* Upload Nexus Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !uploading && setShowUploadModal(false)} />
          <div className="relative bg-gray-900 border border-gray-700 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            
            {uploading && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800 z-50">
                <div 
                  className={clsx(
                    "h-full bg-tad-yellow transition-all duration-300",
                    `w-[${uploadProgress}%]`
                  )} 
                />
              </div>
            )}

            <div className="p-6 md:p-8 pb-5 flex justify-between items-center border-b border-gray-700/50 bg-gray-800/30">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-tad-yellow rounded-2xl shadow-sm group hover:scale-105 transition-transform">
                   <CloudUpload className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">Ingesta de <span className="text-tad-yellow">Activos</span></h3>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Upload Protocol</p>
                </div>
              </div>
              {!uploading && (
                <button 
                  onClick={() => { setShowUploadModal(false); resetUploadForm(); }} 
                  title="Cerrar modal"
                  className="p-3 bg-gray-800 hover:bg-rose-500/10 border border-gray-700 hover:border-rose-500/30 text-gray-400 hover:text-rose-500 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <form onSubmit={handleUpload} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Archivo Fuente</label>
                {!selectedFile ? (
                  <div className="relative border-2 border-dashed border-gray-700 hover:border-tad-yellow/50 bg-gray-800/30 rounded-2xl p-10 transition-all duration-300 group/drop cursor-pointer flex flex-col items-center">
                    <input type="file" accept="video/mp4, video/webm" ref={fileInputRef} onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" title="Escoger archivo" />
                    <Film className="w-12 h-12 text-gray-500 mb-4 group-hover/drop:text-tad-yellow group-hover/drop:scale-110 transition-all duration-300" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider group-hover:text-white transition-colors">Seleccionar Video</p>
                    <p className="text-[10px] text-gray-600 font-bold mt-2 uppercase tracking-widest">MP4 / WEBM • Límite 50MB</p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-gray-700 bg-black shadow-md">
                      <video src={filePreviewUrl || ''} controls className="w-full h-full" preload="metadata" />
                      <div className="absolute top-4 left-4">
                        <span className="bg-tad-yellow text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                          <Eye className="w-3.5 h-3.5" /> Preview Listo
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-tad-yellow/10 rounded-lg border border-tad-yellow/20">
                           <Play className="w-4 h-4 text-tad-yellow" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white uppercase truncate max-w-[200px] md:max-w-xs">{selectedFile?.name}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{(selectedFile!.size / 1024 / 1024).toFixed(2)} MB • {selectedFile?.type.toUpperCase()}</p>
                        </div>
                      </div>
                      <button type="button" onClick={resetUploadForm} className="text-[10px] font-bold text-tad-yellow uppercase tracking-widest hover:underline px-3 py-1.5 bg-gray-900 rounded-lg border border-gray-700">Reiniciar</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Identificador del Contenido</label>
                  <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm font-bold focus:border-tad-yellow outline-none transition-all placeholder:text-gray-600 shadow-sm" placeholder="Ej. CAMPAÑA_DISTRI_V4" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Ciclo de Reproducción</label>
                  <select 
                    required 
                    value={duration} 
                    onChange={e => setDuration(Number(e.target.value))} 
                    title="Seleccionar duración del activo"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm font-bold focus:border-tad-yellow outline-none transition-all cursor-pointer shadow-sm"
                  >
                    <option value={30}>30 SEGUNDOS</option>
                    <option value={60}>60 SEGUNDOS</option>
                    <option value={120}>120 SEGUNDOS</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Destino Escaneo QR (Opcional)</label>
                <div className="relative group/input">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Share2 className="w-4 h-4 text-gray-500 group-focus-within/input:text-tad-yellow transition-colors" />
                   </div>
                   <input 
                     type="text" 
                     value={qrUrl} 
                     onChange={e => setQrUrl(e.target.value)} 
                     className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm font-bold focus:border-tad-yellow outline-none transition-all placeholder:text-gray-600 shadow-sm" 
                     placeholder="https://tudominio.com/promo-video" 
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Campaña Objetivo</label>
                <select 
                  required 
                  value={selectedCampaign} 
                  onChange={e => setSelectedCampaign(e.target.value)} 
                  title="Seleccionar campaña objetivo"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm font-bold focus:border-tad-yellow outline-none cursor-pointer shadow-sm"
                >
                  <option value="" disabled>-- SELECCIONAR CLUSTER OBJETIVO --</option>
                  {campaigns?.filter(c => c.active).map(c => (
                    <option key={c.id} value={c.id}>{c.name.toUpperCase()} [{c.advertiser.toUpperCase()}]</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                   <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Difusión Taxis</label>
                   <span className="text-[10px] font-bold text-tad-yellow uppercase tracking-widest bg-tad-yellow/10 px-2 py-1 rounded-md">{selectedDevices.length} DESTINOS</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                   {swrLoading ? (
                     <div className="col-span-1 sm:col-span-2 py-8 flex justify-center"><div className="w-6 h-6 rounded-full border-2 border-tad-yellow animate-spin border-t-transparent" /></div>
                   ) : swrError ? (
                     <div className="col-span-1 sm:col-span-2 text-[10px] text-rose-500 font-bold uppercase py-4">Falla en Sincronización de Nodos</div>
                   ) : devices.map(device => {
                      const count = device.occupied_slots || 0;
                      const limit = device.max_slots || 15;
                      const freeSlots = limit - count;
                      const isSelected = selectedDevices.includes(device.device_id);
                      const isFull = freeSlots <= 0;

                      return (
                        <div key={device.device_id} onClick={() => { if (!isFull || isSelected) setSelectedDevices(prev => prev.includes(device.device_id) ? prev.filter(id => id !== device.device_id) : [...prev, device.device_id]); }} className={clsx("p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group/dev", isSelected ? "bg-tad-yellow/10 border-tad-yellow/40" : "bg-gray-800/60 border-gray-700 hover:border-gray-500", isFull && !isSelected && "opacity-40 cursor-not-allowed")}>
                           <div className="flex items-center gap-3 min-w-0">
                              <div className={clsx("p-1.5 rounded-lg transition-all", isSelected ? "bg-tad-yellow text-black" : "bg-gray-900 text-gray-500")}>
                                 <CheckCircle className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                 <p className="text-xs font-bold text-white truncate uppercase">{device.taxiNumber || device.name || device.device_id.slice(0, 8)}</p>
                                 <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className={clsx("w-1.5 h-1.5 rounded-full", device.status === 'online' ? "bg-emerald-500 animate-pulse" : "bg-gray-600")} />
                                    <p className="text-[10px] font-bold text-gray-500 uppercase">{freeSlots} SLOTS</p>
                                 </div>
                              </div>
                           </div>
                           {isFull && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                        </div>
                      );
                   })}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700/50">
                <button 
                  disabled={uploading || !selectedFile} 
                  type="submit" 
                  title="Ejecutar ingesta"
                  className="w-full bg-tad-yellow hover:bg-yellow-400 text-black font-bold uppercase tracking-widest py-4 rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-3 active:scale-95 text-sm"
                >
                  {uploading ? (
                    <>
                       <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                       SUBIENDO {uploadProgress}%
                    </>
                  ) : (
                    <><CloudUpload className="w-5 h-5" /> EJECUTAR INGESTA MULTIMEDIA</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
