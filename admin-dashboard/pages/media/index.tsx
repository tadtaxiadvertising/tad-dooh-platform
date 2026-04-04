import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import useSWR from 'swr';
import { QRCodeCanvas } from 'qrcode.react';
import api, { getMedia, uploadMedia, getCampaigns, addVideoToCampaign, getMediaStatus, assignCampaignToDevices, updateMedia, deleteMedia } from '../../services/api';
import { CloudUpload, Film, Zap, Calendar, Play, Activity, X, Eye, CheckCircle, AlertTriangle, HardDrive, ShieldCheck, Share2, Cpu, Trash2, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { useTabSync } from '../../hooks/useTabSync';
import { notifyChange } from '../../lib/sync-channel';
import { AntigravityButton } from '../../components/ui/AntigravityButton';
import clsx from 'clsx';
import { toast } from 'sonner';

// Fetcher for SWR
const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function MediaPage() {
  const [media, setMedia] = useState<{ id: string; url: string; filename: string; originalFilename?: string; size?: number; mime?: string; qrUrl?: string; createdAt?: string; campaignId?: string }[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; advertiser: string; active: boolean; mediaAssets?: { checksum: string; url: string }[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewQr, setPreviewQr] = useState<string | null>(null);
  const [previewCampaignId, setPreviewCampaignId] = useState<string | null>(null);

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
  
  const router = useRouter();

  useEffect(() => { loadData(); }, [loadData]);

  // Check URL query parameters for auto-opening modal and auto-selecting campaign
  useEffect(() => {
    if (router.isReady) {
      if (router.query.openUpload === 'true') {
        setShowUploadModal(true);
      }
      if (router.query.campaignId) {
        setSelectedCampaign(router.query.campaignId as string);
      }
    }
  }, [router.isReady, router.query]);

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

  const getLinkedCampaigns = (mediaId: string, mediaUrl: string) => {
    return campaigns.filter(c =>
      c.mediaAssets?.some((a: any) =>
        a.id === mediaId ||
        a.checksum === mediaId ||
        (mediaUrl && a.url && a.url.includes(mediaUrl.split('?')[0].split('/').pop() || ''))
      )
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'video/mp4' && file.type !== 'video/webm') {
      toast.error('ACCESO DENEGADO: Solo se permiten archivos de video en formato MP4 o WEBM.', {
        style: { background: '#111', color: '#ef4444', border: '1px solid #ef4444' },
        icon: <AlertTriangle className="w-4 h-4" />
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
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
    setUploadProgress(5);
    
    let uploadedData = null;
    
    try {
      // FASE 1: Subida física del binario (Paso crítico)
      setUploadProgress(15);
      uploadedData = await uploadMedia(selectedFile, selectedCampaign, qrUrl);
      setUploadProgress(60);
      
      toast.info('Binario recibido por el servidor. Vinculando asset...', {
         style: { background: '#111', color: '#FFD400', border: '1px solid #FFD400' }
      });

      // FASE 2: Registro en la arquitectura de la campaña (Asset mapping)
      try {
        await addVideoToCampaign(selectedCampaign, {
          type: 'VIDEO',
          filename: title,
          url: uploadedData.url,
          fileSize: uploadedData.fileSize,
          checksum: uploadedData.hashMd5 || uploadedData.id,
          duration: Number(duration)
        });
        setUploadProgress(80);
        toast.info('Asset vinculado. Desplegando a flota...', {
          style: { background: '#111', color: '#FFD400', border: '1px solid #FFD400' }
        });
      } catch (assetError: any) {
        console.warn('⚠️ ERROR_ASSET_LINKING:', assetError);
        toast.warning('Video en la bóveda, enlace a campaña pendiente. Reintenta desde la página de campaña.', { duration: 6000 });
      }

      // FASE 3: Asignar campaña a todos los dispositivos activos de la flota (garantiza cobertura total)
      try {
        const fleetRes = await api.get('/fleet/summary');
        const allDevices: { device_id?: string; deviceId?: string }[] = Array.isArray(fleetRes.data) ? fleetRes.data : [];
        const allDeviceIds = allDevices
          .map(d => d.device_id || d.deviceId)
          .filter(Boolean) as string[];

        if (allDeviceIds.length > 0) {
          await assignCampaignToDevices(selectedCampaign, allDeviceIds);
        }
        setUploadProgress(95);
      } catch (assignErr: any) {
        // Non-fatal: devices may already be assigned or targetAll handles it
        console.warn('⚠️ FASE_3_ASSIGN_WARN:', assignErr.message);
      }

      setUploadProgress(100);
      

      // Éxito total
      setTimeout(() => {
        setShowUploadModal(false);
        resetUploadForm();
        loadData();
        toast.success('✅ ¡Contenido en flota! Las tablets recibirán el anuncio en el próximo ciclo de sync.', {
          icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
          duration: 5000
        });
        notifyChange('MEDIA');
        notifyChange('CAMPAIGNS');
      }, 500);

    } catch (e: any) {
      console.error('CRITICAL_INGEST_FAILURE:', e);
      const errorMsg = e.response?.data?.message || e.message || 'Error desconocido';
      
      if (e.response?.status === 401) {
        toast.error("Credenciales expiradas. Por favor, inicie sesión nuevamente.");
      } else if (e.response?.status === 413) {
        toast.error("Archivo demasiado grande para el clúster actual.");
      } else {
        toast.error(`Falla en ingesta: ${errorMsg}`);
      }
      
      // Retroceder progreso para feedback visual de error
      setUploadProgress(prev => Math.max(0, prev - 20));
    } finally {
      setUploading(false);
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
      toast.success('Activo purgado de la bóveda');
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
      toast.error('Error actualizando URL satelital');
    }
  };

  return (
    <div className="min-h-screen pb-12 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 pt-6">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-tad-yellow/[0.04] blur-[150px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[0%] right-[-5%] w-[40%] h-[40%] bg-white/[0.01] blur-[120px] rounded-full" />
      </div>

      {/* Page Context Transition */}
      <div className="flex items-center gap-3 mb-8 opacity-60">
        <div className="w-8 h-px bg-white/20" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Vault / Nexus Multimedia</p>
      </div>

      <div className="flex justify-end mb-6">
        <button 
          onClick={() => setShowUploadModal(true)}
          className="bg-[#FFD400] text-black px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#e6be00] transition-all shadow-md group shrink-0"
        >
          <CloudUpload className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Importar Asset
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-500">
           <AlertTriangle className="w-5 h-5 animate-pulse" />
           <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
        </div>
      )}

      {/* Main Stats Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
           { label: 'Activos en Bóveda', value: media.length, icon: Film, color: 'text-white', borderColor: 'border-white/20', iconColor: 'text-zinc-400' },
           { label: 'Puntos de Difusión', value: media.filter(m => getLinkedCampaigns(m.id).length > 0).length, icon: Share2, color: 'text-[#FFD400]', borderColor: 'border-[#FFD400]/40', iconColor: 'text-[#FFD400]' },
           { label: 'Integridad Global', value: '100%', icon: ShieldCheck, color: 'text-emerald-500', borderColor: 'border-emerald-500/40', iconColor: 'text-emerald-500' }
        ].map((s, i) => (
           <div key={i} className="bg-[#111317] border border-white/[0.05] p-6 rounded-[24px] relative overflow-hidden transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                 <div className={clsx("p-2.5 rounded-2xl border bg-transparent", s.borderColor, s.iconColor)}>
                    <s.icon className="w-5 h-5" />
                 </div>
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-600/50" />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
              <h3 className={clsx("text-4xl font-black tracking-tighter leading-none", s.color)}>
                {typeof s.value === 'number' && s.value < 10 ? `0${s.value}` : s.value}
              </h3>
           </div>
        ))}
      </div>

      {/* Media Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="h-64 bg-gray-800/20 backdrop-blur-xl animate-pulse rounded-3xl border border-gray-700/30 flex flex-col p-5 gap-4 shadow-inner">
               <div className="aspect-video bg-gray-700/20 rounded-2xl w-full" />
               <div className="h-4 bg-gray-700/20 rounded-full w-3/4" />
               <div className="h-3 bg-gray-700/10 rounded-full w-1/2" />
               <div className="mt-auto h-8 bg-gray-700/10 rounded-xl w-full" />
            </div>
          ))
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
                  "group relative bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden hover:border-tad-yellow/30 transition-all duration-500 shadow-sm hover:shadow-md hover:-translate-y-1 flex flex-col animate-in fade-in slide-in-from-bottom-8 fill-mode-both",
                  idx === 0 ? 'delay-0' : idx === 1 ? 'delay-50' : idx === 2 ? 'delay-100' : idx === 3 ? 'delay-150' : idx === 4 ? 'delay-200' : 'delay-250'
                )}
              >
                {/* Preview Surface */}
                <div 
                  className="aspect-video bg-gray-900 relative overflow-hidden cursor-pointer group/surface"
                  onClick={() => { 
                    setPreviewUrl(videoUrl); 
                    setPreviewTitle(displayName);
                    setPreviewQr(file.qrUrl || null);
                    setPreviewCampaignId(file.campaignId || 'manual');
                  }}
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

                  <AntigravityButton
                    variant="danger"
                    actionName="delete_media"
                    critical={true}
                    className="absolute top-4 right-4 w-10 h-10 p-0 rounded-xl"
                    confirmMessage="¿Purgar permanentemente este activo de la bóveda?"
                    onAsyncClick={async () => await deleteMedia(file.id)}
                    onSuccess={() => {
                      loadData();
                      notifyChange('MEDIA');
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </AntigravityButton>
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
          <div className="col-span-full py-32 border-2 border-dashed border-gray-700/50 rounded-3xl bg-gray-800/20 flex flex-col items-center justify-center text-center animate-in fade-in duration-1000">
            <div className="w-20 h-20 bg-gray-900 rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-sm border border-gray-700">
               <Film className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-400 uppercase tracking-widest leading-none mb-4">Bóveda Vacía</h3>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs max-w-sm leading-relaxed mb-8 mx-auto">
              No se han detectado activos multimedia en el cluster central.
            </p>
            <button 
               onClick={() => { resetUploadForm(); setShowUploadModal(true); }}
               className="bg-gray-900 hover:bg-tad-yellow hover:text-black text-gray-400 px-8 py-3 rounded-xl border border-gray-700 hover:border-tad-yellow text-xs font-bold uppercase tracking-widest transition-all shadow-sm"
            >
               INICIAR INGESTA MULTIMEDIA
            </button>
          </div>
        )}
      </div>
        {/* Fullscreen Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setPreviewUrl(null)} />
          <div className="relative w-full max-w-6xl animate-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                  <div className="w-1.5 h-8 bg-tad-yellow rounded-full shadow-[0_0_10px_#fad400]" />
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none">{previewTitle || 'EXPLORADOR DE ACTIVOS'}</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-2">Visualización de Master Digital v4.2</p>
                  </div>
              </div>
              <button 
                onClick={() => setPreviewUrl(null)} 
                className="p-3 bg-gray-900 border border-gray-800 hover:border-rose-500/50 hover:bg-rose-500/10 text-gray-500 hover:text-rose-500 rounded-2xl transition-all shadow-lg"
                aria-label="Cerrar vista previa"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="bg-black rounded-[2.5rem] overflow-hidden border border-gray-800 shadow-2xl aspect-video relative group ring-1 ring-white/5">
              <video src={previewUrl} controls autoPlay className="w-full h-full object-contain" />
              
              {/* QR Code Overlay Simulation */}
              {previewQr && (
                <div className="absolute bottom-[5%] right-[5%] w-[12%] aspect-square bg-white p-[0.6%] rounded-[8%] shadow-2xl animate-in fade-in zoom-in-50 duration-700 delay-500 fill-mode-both z-10 flex items-center justify-center">
                  <QRCodeCanvas 
                    value={`https://proyecto-ia-tad-api.rewvid.easypanel.host/analytics/qr-scan?campaignId=${previewCampaignId}&deviceId=PREVIEW-MODE`}
                    size={256}
                    level="H"
                    includeMargin={false}
                    className="w-full h-full"
                  />
                  <div className="absolute -top-3 -left-3 bg-tad-yellow text-black text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white/20">LIVE_QR</div>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 h-1 bg-gray-900/50 backdrop-blur-sm">
                 <div className="h-full bg-tad-yellow w-full shadow-[0_0_10px_#fad400]" />
              </div>
            </div>
            <div className="flex justify-center mt-6">
               <div className="px-6 py-2 bg-gray-900/50 border border-gray-800 rounded-full backdrop-blur-md">
                 <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em]">© TAD NEXUS SECURE PREVIEW SYSTEM</p>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Nexus Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => !uploading && setShowUploadModal(false)} />
          <div className="relative bg-gray-900 border border-gray-700/50 w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 max-h-[95vh] flex flex-col">
            
            {uploading && (
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-800 z-50">
                <div className="h-full bg-tad-yellow shadow-[0_0_15px_#fad400] transition-all duration-300 nexus-upload-progress" />
                <style jsx>{`
                  .nexus-upload-progress {
                    width: ${uploadProgress}%;
                  }
                `}</style>
              </div>
            )}

            <div className="p-8 pb-6 flex justify-between items-center bg-gray-800/30 border-b border-gray-700/50">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-tad-yellow rounded-2xl shadow-lg transform group-hover:scale-105 transition-transform">
                   <CloudUpload className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none">Nueva <span className="text-tad-yellow">Ingesta</span></h3>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                    <Activity className="w-3 h-3 text-tad-yellow" /> Protocolo de Carga Nexus v4.2
                  </p>
                </div>
              </div>
              {!uploading && (
                <button 
                  onClick={() => { setShowUploadModal(false); resetUploadForm(); }} 
                  className="p-3 bg-gray-800 hover:bg-rose-500/10 border border-gray-700 hover:border-rose-500/30 text-gray-400 hover:text-rose-500 rounded-xl transition-all shadow-sm"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <form onSubmit={handleUpload} className="p-8 space-y-8 overflow-y-auto custom-scrollbar bg-gray-900/50 flex-1">
              {/* File Drop Surface */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Origen de Datos</label>
                {!selectedFile ? (
                  <div className="relative border-2 border-dashed border-gray-700/50 hover:border-tad-yellow/40 bg-gray-800/10 rounded-3xl p-16 transition-all duration-500 group/drop cursor-pointer flex flex-col items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-tad-yellow/[0.01] opacity-0 group-hover/drop:opacity-100 transition-opacity" />
                    <input type="file" accept="video/mp4, video/webm" ref={fileInputRef} onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer z-10" title="Seleccionar archivo" />
                    <div className="w-20 h-20 bg-gray-900 rounded-3xl flex items-center justify-center mb-6 border border-gray-700/50 group-hover/drop:border-tad-yellow/30 transition-all group-hover/drop:scale-110 shadow-sm relative z-10">
                       <Film className="w-10 h-10 text-gray-500 group-hover/drop:text-tad-yellow transition-colors" />
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest group-hover/drop:text-white transition-colors relative z-10">Seleccionar Master Digital</p>
                    <p className="text-[10px] text-gray-600 font-bold mt-2 uppercase tracking-[0.2em] relative z-10">MP4 / WEBM • Máximo 200MB</p>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="relative aspect-video rounded-3xl overflow-hidden border border-gray-700/50 bg-black shadow-2xl group/preview">
                      <video src={filePreviewUrl || ''} controls className="w-full h-full" preload="metadata" />
                      <div className="absolute top-6 left-6">
                        <span className="bg-tad-yellow text-black text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-2 shadow-lg backdrop-blur-md">
                          <Eye className="w-4 h-4" /> Preview Activo
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-gray-800/40 p-5 rounded-2xl border border-gray-700/50 backdrop-blur-xl">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-tad-yellow/10 rounded-xl border border-tad-yellow/30 flex items-center justify-center shrink-0">
                           <Play className="w-5 h-5 text-tad-yellow" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white uppercase truncate max-w-[300px]">{selectedFile?.name}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{(selectedFile!.size / 1024 / 1024).toFixed(2)} MB • {selectedFile?.type.replace('video/', '').toUpperCase()}</p>
                        </div>
                      </div>
                      <button type="button" onClick={resetUploadForm} className="px-4 py-2 bg-gray-900 border border-gray-700 hover:border-tad-yellow text-gray-400 hover:text-tad-yellow text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm">
                        Purgar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata Cluster */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Nombre del Activo</label>
                  <input 
                    required 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className="w-full bg-gray-800/40 border border-gray-700/50 rounded-2xl px-5 py-4 text-white text-sm font-bold focus:border-tad-yellow/50 outline-none transition-all placeholder:text-gray-600 shadow-inner" 
                    placeholder="IDENTIFICADOR_COMERCIAL_V" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Loop de Reproducción</label>
                  <select 
                    required 
                    value={duration} 
                    onChange={e => setDuration(Number(e.target.value))} 
                    className="w-full bg-gray-800/40 border border-gray-700/50 rounded-2xl px-5 py-4 text-white text-sm font-bold focus:border-tad-yellow/50 outline-none transition-all cursor-pointer shadow-inner appearance-none"
                    title="Duración del loop"
                  >
                    <option value={30}>30 SEGUNDOS (Estándar)</option>
                    <option value={60}>60 SEGUNDOS (Extendido)</option>
                    <option value={120}>120 SEGUNDOS (Master)</option>
                  </select>
                </div>
              </div>

              {/* Link QR Surface */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Call to Action (Enlace QR)</label>
                <div className="relative group/input">
                   <div className="absolute left-5 top-1/2 -translate-y-1/2">
                      <Share2 className="w-5 h-5 text-gray-500 group-focus-within/input:text-tad-yellow transition-colors" />
                   </div>
                   <input 
                     type="url" 
                     value={qrUrl} 
                     onChange={e => setQrUrl(e.target.value)} 
                     className="w-full bg-gray-800/40 border border-gray-700/50 rounded-2xl pl-14 pr-5 py-4 text-white text-sm font-bold focus:border-tad-yellow/50 outline-none transition-all placeholder:text-gray-700 shadow-inner" 
                     placeholder="https://destino-comercial.com/nexus" 
                   />
                </div>
              </div>

              {/* Campaign Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Campaña de Destino</label>
                <select 
                  required 
                  value={selectedCampaign} 
                  onChange={e => setSelectedCampaign(e.target.value)} 
                  className="w-full bg-gray-800/40 border border-gray-700/50 rounded-2xl px-5 py-4 text-white text-sm font-bold focus:border-tad-yellow/50 outline-none cursor-pointer shadow-inner appearance-none"
                  title="Campaña objetivo"
                >
                  <option value="" disabled>-- VINCULAR A CLUSTER COMERCIAL --</option>
                  {campaigns?.filter(c => c.active).map(c => (
                    <option key={c.id} value={c.id}>{c.name.toUpperCase()} • {c.advertiser.toUpperCase()}</option>
                  ))}
                </select>
              </div>



              {/* Action Section */}
              <div className="pt-6 pb-2">
                <button 
                  disabled={uploading || !selectedFile || !selectedCampaign || !title} 
                  type="submit" 
                  className="w-full bg-tad-yellow hover:bg-yellow-400 text-black font-black uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-[0_10px_30px_rgba(250,212,0,0.15)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-4 active:scale-95 text-xs"
                >
                  {uploading ? (
                    <>
                       <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                       DISTRIBUYENDO ACTIVO {uploadProgress}%
                    </>
                  ) : (
                    <><CloudUpload className="w-5 h-5" /> INICIAR PROTOCOLO DE INGESTA</>
                  )}
                </button>
                <p className="text-center text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em] mt-6 leading-relaxed">
                   Al ejecutar el protocolo, el activo será vinculado a la campaña. Las pantallas de la red recibirán el contenido basado en la configuración de la campaña.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
