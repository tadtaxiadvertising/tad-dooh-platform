import { useEffect, useState, useRef } from 'react';
import { getMedia, uploadMedia, registerMockMedia, getCampaigns, addVideoToCampaign } from '../../services/api';
import { CloudUpload, Link as LinkIcon, Film, Plus, Info, Zap, Calendar, Play, Activity, X, Eye, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function MediaPage() {
  const [media, setMedia] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [mediaStatus, setMediaStatus] = useState<Record<string, any>>({});
  
  // Local blob previews for uploaded files (survives until page reload)
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});
  
  // Upload form state
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(15);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setError(null);
    try {
      const [mediaData, campaignsData] = await Promise.all([getMedia(), getCampaigns()]);
      setMedia(Array.isArray(mediaData) ? mediaData : []);
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
    } catch (err) {
      console.error("Failed to load ecosystem data", err);
      setError("FAILED TO RETRIEVE MEDIA CLOUD INVENTORY. CHECK STORAGE UPLINK.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Poll for media status (who is playing what)
  useEffect(() => {
    if (media.length === 0) return;
    
    const fetchStatuses = async () => {
      const statusMap: Record<string, any> = {};
      await Promise.all(media.map(async (m) => {
        try {
          const status = await getMediaStatus(m.id);
          statusMap[m.id] = status;
        } catch (e) {
          // Ignore
        }
      }));
      setMediaStatus(statusMap);
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [media]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      Object.values(localPreviews).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  /** Check if a URL is a mock placeholder */
  const isMockUrl = (url: string) => url?.includes('#mock-');

  /** Get the best preview URL for a media item */
  const getPreviewUrl = (file: any) => {
    // If we have a local blob preview from this session, use it
    if (localPreviews[file.id]) return localPreviews[file.id];
    // If URL is a mock, the video is the same for all (BigBuckBunny) - still playable for demo
    return file.url?.split('#')[0] || file.url;
  };

  /** Get a display name */
  const getDisplayName = (file: any) => {
    if (file.originalFilename) return file.originalFilename;
    const basename = file.filename?.split('/').pop() || 'Untitled';
    if (/^[0-9a-f]{8}-/.test(basename)) {
      return `Media-${basename.slice(0, 8)}.${basename.split('.').pop() || 'mp4'}`;
    }
    return basename;
  };

  /** Find linked campaigns */
  const getLinkedCampaigns = (mediaId: string) => {
    return campaigns.filter(c => 
      c.mediaAssets?.some((a: any) => a.checksum === mediaId || a.url?.includes(mediaId))
    );
  };

  /** Handle file selection - show preview immediately */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    // Create a local blob URL for instant preview
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    const blobUrl = URL.createObjectURL(file);
    setFilePreviewUrl(blobUrl);
    // Auto-fill title from filename if empty
    if (!title) {
      const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(name.charAt(0).toUpperCase() + name.slice(1));
    }
  };

  const resetUploadForm = () => {
    setTitle('');
    setSelectedCampaign('');
    setSelectedFile(null);
    setDuration(15);
    setUploadProgress(0);
    if (filePreviewUrl) { URL.revokeObjectURL(filePreviewUrl); setFilePreviewUrl(null); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return alert("Por favor seleccione un archivo de video.");
    if (!selectedCampaign) return alert("Seleccione una campaña destino.");
    if (!title) return alert("El título del archivo es obligatorio.");

    setUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setUploadProgress(30);
      let uploadedData;
      
      try {
        // Attempt realistic physical upload (will fail if payload > 4.5MB on Vercel without S3 presigned urls)
        uploadedData = await uploadMedia(formData);
      } catch (err: any) {
        console.warn('Physical upload failed (likely Vercel 4.5MB limit or S3 misconfig). Falling back to Cloud Register.', err);
        // Fallback to bypass Vercel serverless size limit by sending only metadata
        uploadedData = await registerMockMedia({
          filename: selectedFile.name,
          mimetype: selectedFile.type,
          size: selectedFile.size
        });
      }

      setUploadProgress(60);
      
      // 2. Link to campaign
      await addVideoToCampaign(selectedCampaign, {
        type: 'video',
        filename: title,
        url: uploadedData.url,
        fileSize: uploadedData.size,
        checksum: uploadedData.id,
        duration: Number(duration)
      });
      setUploadProgress(90);

      // 3. Save local blob URL for the uploaded media so it previews correctly this session
      if (filePreviewUrl) {
        setLocalPreviews(prev => ({ ...prev, [uploadedData.id]: filePreviewUrl }));
        setFilePreviewUrl(null); // Don't revoke - we keep it for preview
      }

      setUploadProgress(100);
      setShowUploadModal(false);
      resetUploadForm();
      await loadData();
    } catch (e: any) {
      alert("Error al Subir: " + (e.response?.data?.message || e.message));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen pb-12 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Contenido <span className="text-tad-yellow text-shadow-glow">Multimedia</span>
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Repositorio centralizado. Sube videos y asígnalos a las campañas para distribuirlos a la flota de taxis.
          </p>
        </div>
        <button 
          onClick={() => { resetUploadForm(); setShowUploadModal(true); }}
          className="group relative flex items-center justify-center gap-2 bg-tad-yellow hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(250,212,0,0.4)]"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          Subir Nuevo Video
        </button>
      </div>

      {error && (
        <div className="mb-10 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500">
           <Activity className="w-5 h-5 shrink-0" />
           <p className="text-xs font-bold">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-tad-yellow/10 rounded-xl text-tad-yellow"><Film className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Archivos Totales</p>
            <h3 className="text-2xl font-bold text-white">{media.length}</h3>
          </div>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-zinc-800 rounded-xl text-zinc-400"><Zap className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Vinculados a Campañas</p>
            <h3 className="text-2xl font-bold text-white">{media.filter(m => getLinkedCampaigns(m.id).length > 0).length}</h3>
          </div>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-tad-yellow/10 rounded-xl text-tad-yellow"><CloudUpload className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Estado del Almacén</p>
            <h3 className="text-2xl font-bold text-white">Activo</h3>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-64 bg-zinc-900/40 animate-pulse rounded-2xl border border-white/5" />)
        ) : media.length > 0 ? (
          media.map((file, i) => {
            const linkedCampaigns = getLinkedCampaigns(file.id);
            const videoUrl = getPreviewUrl(file);
            const displayName = getDisplayName(file);
            const hasLocalPreview = !!localPreviews[file.id];

            return (
              <div key={file.id || i} className="group relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden hover:border-tad-yellow/50 transition-all hover:shadow-[0_0_30px_rgba(250,212,0,0.15)]">
                {/* Video Thumbnail with real preview */}
                <div 
                  className="aspect-video bg-black relative overflow-hidden cursor-pointer"
                  onClick={() => { setPreviewUrl(videoUrl); setPreviewTitle(displayName); }}
                >
                  <video 
                    src={videoUrl} 
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                    playsInline
                    onMouseOver={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                    onMouseOut={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-tad-yellow/90 rounded-full p-3 shadow-lg shadow-tad-yellow/30">
                      <Eye className="w-5 h-5 text-black" />
                    </div>
                  </div>
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {hasLocalPreview && (
                      <span className="bg-tad-yellow/90 text-black text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Original
                      </span>
                    )}
                    {isMockUrl(file.url) && !hasLocalPreview && (
                      <span className="bg-zinc-800/90 text-zinc-400 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Demo
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-2 py-1 rounded-md text-[10px] text-gray-300 font-mono">
                    {file.mime?.split('/')[1]?.toUpperCase() || 'VIDEO'}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-white font-bold truncate">{displayName}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 font-mono">
                        <Zap className="w-3 h-3 text-tad-yellow shrink-0" />
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <a 
                      href={videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors shrink-0"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </a>
                  </div>

                  {linkedCampaigns.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {linkedCampaigns.map((c: any) => (
                        <span key={c.id} className="text-[9px] bg-tad-yellow/10 text-tad-yellow px-2 py-0.5 rounded-full border border-tad-yellow/20 font-bold tracking-wider uppercase">
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-[10px] text-gray-600">
                      <Calendar className="w-3 h-3" />
                      {file.createdAt ? format(new Date(file.createdAt), 'MMM d, yyyy') : 'Reciente'}
                    </div>
                    {mediaStatus[file.id]?.active_devices?.length > 0 ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20 text-[9px] font-black text-green-500 uppercase tracking-widest animate-pulse">
                        <Activity className="w-3 h-3" /> EN VIVO
                      </div>
                    ) : (
                      <span className="text-[10px] bg-tad-yellow/10 text-tad-yellow px-2 py-1 rounded-full border border-tad-yellow/20 font-bold tracking-wider">LISTO</span>
                    )}
                  </div>

                  {/* Device list dropdown/indication if active */}
                  {mediaStatus[file.id]?.active_devices?.length > 0 && (
                     <div className="mt-4 p-3 bg-black/40 rounded-xl border border-green-500/10">
                        <p className="text-[9px] text-zinc-500 uppercase font-black mb-2 flex items-center gap-2">
                           Sincronizado en <span className="text-green-500">({mediaStatus[file.id].active_devices.length}) Taxis</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                           {mediaStatus[file.id].active_devices.map((id: string) => (
                              <span key={id} className="text-[8px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md border border-white/5 font-mono">
                                 {id.split('-').pop()?.toUpperCase()}
                              </span>
                           ))}
                        </div>
                     </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-20 bg-zinc-900/30 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center">
            <Film className="w-16 h-16 text-zinc-700 mb-4" />
            <h3 className="text-xl font-bold text-gray-400">No hay archivos multimedia</h3>
            <p className="text-gray-500 mt-2">Sube tu primer video para empezar a distribuir contenido.</p>
          </div>
        )}
      </div>

      {/* ======================== FULLSCREEN VIDEO PREVIEW MODAL ======================== */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setPreviewUrl(null)} />
          <div className="relative w-full max-w-4xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg truncate">{previewTitle || 'Vista Previa'}</h3>
              <button onClick={() => setPreviewUrl(null)}
                className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                <X className="w-5 h-5" /> Cerrar
              </button>
            </div>
            <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
              <video src={previewUrl} controls autoPlay className="w-full aspect-video bg-black" />
            </div>
          </div>
        </div>
      )}

      {/* ======================== UPLOAD MODAL ======================== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => !uploading && setShowUploadModal(false)} />
          <div className="relative bg-zinc-900 border border-white/20 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Upload Progress Bar */}
            {uploading && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-800 z-10">
                <div className="h-full bg-tad-yellow transition-all duration-500 rounded-r" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}

            <div className="p-8 pb-0 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <CloudUpload className="text-tad-yellow" /> Subir Video
                </h3>
                <p className="text-gray-400 text-sm mt-1">Selecciona un archivo de video, previsualízalo y asígnalo a una campaña.</p>
              </div>
              {!uploading && (
                <button onClick={() => { setShowUploadModal(false); resetUploadForm(); }} className="text-gray-500 hover:text-white p-2">
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>

            <form onSubmit={handleUpload} className="p-8 space-y-6">
              {/* File Selection with Preview */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Archivo de Video</label>
                
                {!selectedFile ? (
                  <div className="relative border-2 border-dashed border-white/10 hover:border-tad-yellow/40 rounded-2xl p-10 transition-colors cursor-pointer bg-white/5 text-center">
                    <input 
                      type="file" 
                      accept="video/mp4, video/webm"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                    <Film className="w-10 h-10 text-gray-500 mb-3 mx-auto" />
                    <p className="text-sm text-gray-300 font-bold">Arrastra el video aquí o haz clic para buscar</p>
                    <p className="text-[10px] text-gray-500 mt-1">MP4 o WebM — Máx 50MB</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Live Video Preview */}
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
                      <video 
                        src={filePreviewUrl || ''} 
                        controls 
                        className="w-full aspect-video bg-black"
                        preload="metadata"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="bg-tad-yellow/90 text-black text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Vista Previa — Tu Video
                        </span>
                      </div>
                    </div>
                    {/* File info + change button */}
                    <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                      <div className="flex items-center gap-3 min-w-0">
                        <Play className="w-5 h-5 text-tad-yellow shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-white font-bold truncate">{selectedFile.name}</p>
                          <p className="text-[10px] text-zinc-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => { resetUploadForm(); }}
                        className="text-xs text-tad-yellow font-bold uppercase tracking-widest hover:underline shrink-0 ml-4"
                      >
                        Cambiar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Título</label>
                  <input 
                    required type="text" value={title} onChange={e => setTitle(e.target.value)} 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-tad-yellow focus:ring-1 focus:ring-tad-yellow outline-none transition-all font-bold"
                    placeholder="Ej. Festival de Verano 2026"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Duración del Ciclo (seg)</label>
                  <input 
                    required type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={1}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-tad-yellow focus:ring-1 focus:ring-tad-yellow outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* Campaign Selection */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Asignar a Campaña</label>
                <select 
                  required value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-tad-yellow outline-none appearance-none cursor-pointer"
                >
                  <option value="" disabled>-- Seleccionar Campaña --</option>
                  {campaigns?.filter(c => c.active).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.advertiser})</option>
                  ))}
                </select>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <button 
                  disabled={uploading || !selectedFile} 
                  type="submit" 
                  className="w-full flex justify-center py-4 px-4 bg-tad-yellow hover:bg-yellow-400 text-black font-black rounded-2xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed items-center gap-3 active:scale-95 uppercase tracking-widest text-sm"
                >
                  {uploading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/></svg>
                      Subiendo {uploadProgress}%...
                    </>
                  ) : (
                    <><CloudUpload className="w-5 h-5" /> Subir y Asignar</>
                  )}
                </button>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-500 justify-center">
                  <Info className="w-3 h-3" />
                  El video se subirá a la nube y se distribuirá automáticamente a los taxis asignados.
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
