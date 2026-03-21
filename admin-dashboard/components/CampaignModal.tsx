import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Upload, Film, Users, Zap, CheckCircle2, AlertCircle, Target, Library, Loader2, Link2, Unlink, Eye } from 'lucide-react';
import { getDrivers, getMedia, uploadCampaignMedia, assignDriversToCampaign, linkMediaToCampaign, unlinkMediaFromCampaign } from '../services/api';
import clsx from 'clsx';

interface MediaItem {
  id: string;
  filename?: string;
  originalFilename?: string;
  url?: string;
  cdnUrl?: string;
  campaign_id?: string | null;
  size?: number;
  mime?: string;
}

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  onSuccess?: () => void;
}

type Tab = 'gallery' | 'upload' | 'segment';

export const CampaignModal = React.memo(function CampaignModal({
  isOpen,
  onClose,
  campaignId,
  campaignName,
  onSuccess,
}: CampaignModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('gallery');

  // Gallery state
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadDone, setUploadDone] = useState(false);

  // Segmentation state
  const [drivers, setDrivers] = useState<{ id: string; fullName: string; taxiPlate: string }[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [targetAll, setTargetAll] = useState(true);
  const [savingSegment, setSavingSegment] = useState(false);
  const [segmentDone, setSegmentDone] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const loadAllMedia = useCallback(async () => {
    setLoadingMedia(true);
    try {
      const data = await getMedia();
      setAllMedia(data || []);
    } catch (e) {
      console.error('Error cargando galería:', e);
    } finally {
      setLoadingMedia(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadAllMedia();
      getDrivers().then(setDrivers).catch(console.error);
      // Reset
      setFile(null);
      setPreviewUrl(null);
      setUploadDone(false);
      setUploadError(null);
      setSegmentDone(false);
      setActiveTab('gallery');
    }
  }, [isOpen, loadAllMedia]);

  if (!isOpen) return null;

  const assignedMedia = allMedia.filter(m => m.campaign_id === campaignId);
  const availableMedia = allMedia.filter(m => !m.campaign_id || m.campaign_id !== campaignId);

  const handleLink = async (mediaId: string) => {
    setLinkingId(mediaId);
    try {
      await linkMediaToCampaign(campaignId, mediaId);
      await loadAllMedia();
      onSuccess?.();
    } catch (e) {
      console.error('Error vinculando:', e);
    } finally {
      setLinkingId(null);
    }
  };

  const handleUnlink = async (mediaId: string) => {
    setLinkingId(mediaId);
    try {
      await unlinkMediaFromCampaign(campaignId, mediaId);
      await loadAllMedia();
      onSuccess?.();
    } catch (e) {
      console.error('Error desvinculando:', e);
    } finally {
      setLinkingId(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadCampaignMedia(campaignId, file);
      setUploadDone(true);
      setFile(null);
      setPreviewUrl(null);
      await loadAllMedia();
      onSuccess?.();
      // Auto-switch to gallery after upload
      setTimeout(() => setActiveTab('gallery'), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al subir el archivo';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSegment = async () => {
    setSavingSegment(true);
    try {
      await assignDriversToCampaign(campaignId, {
        driverIds: selectedDrivers,
        targetAll,
      });
      setSegmentDone(true);
      onSuccess?.();
    } catch {
      // silent
    } finally {
      setSavingSegment(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'gallery', label: 'Galería', icon: Library, badge: assignedMedia.length },
    { id: 'upload', label: 'Subir Video', icon: Upload },
    { id: 'segment', label: 'Segmentar', icon: Target },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-3">
              <Zap className="w-5 h-5 text-tad-yellow" />
              Distribución de Contenido
            </h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5 truncate max-w-xs">{campaignName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-zinc-400 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 shrink-0 border-b border-white/5 pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all rounded-t-xl border-b-2',
                activeTab === tab.id
                  ? 'border-tad-yellow text-tad-yellow bg-tad-yellow/5'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-tad-yellow text-black text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

          {/* ======= TAB: GALERÍA ======= */}
          {activeTab === 'gallery' && (
            <div className="space-y-6">
              {/* Assigned media */}
              <div>
                <h3 className="text-[10px] font-black text-tad-yellow uppercase tracking-widest mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> En esta campaña ({assignedMedia.length})
                </h3>
                {loadingMedia ? (
                  <div className="flex items-center gap-3 text-zinc-500 text-xs py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Cargando galería...
                  </div>
                ) : assignedMedia.length === 0 ? (
                  <div className="py-8 border-dashed border border-white/10 rounded-2xl text-center text-zinc-600 text-xs font-bold uppercase tracking-widest">
                    Sin contenido asignado — sube un video o vincular desde la biblioteca
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {assignedMedia.map(m => (
                      <MediaCard
                        key={m.id}
                        media={m}
                        assigned
                        loading={linkingId === m.id}
                        onToggle={() => handleUnlink(m.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Available library */}
              {availableMedia.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Library className="w-3.5 h-3.5" /> Biblioteca disponible ({availableMedia.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {availableMedia.map(m => (
                      <MediaCard
                        key={m.id}
                        media={m}
                        assigned={false}
                        loading={linkingId === m.id}
                        onToggle={() => handleLink(m.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!loadingMedia && allMedia.length === 0 && (
                <div className="py-16 text-center space-y-4">
                  <Film className="w-12 h-12 text-zinc-700 mx-auto" />
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
                    La biblioteca está vacía.<br />Sube tu primer video.
                  </p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-6 py-2.5 bg-tad-yellow text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-yellow-400 transition-all"
                  >
                    Subir Video
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ======= TAB: UPLOAD ======= */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              {uploadDone ? (
                <div className="flex flex-col items-center py-10 space-y-4">
                  <div className="w-20 h-20 bg-tad-yellow rounded-[2rem] flex items-center justify-center shadow-[0_0_40px_rgba(250,212,0,0.4)]">
                    <CheckCircle2 className="w-10 h-10 text-black" />
                  </div>
                  <p className="text-white font-black text-lg uppercase tracking-tight">¡Video subido y vinculado!</p>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Redirigiendo a galería...</p>
                </div>
              ) : (
                <>
                  <div
                    className={clsx(
                      'relative group aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden cursor-pointer',
                      previewUrl ? 'border-tad-yellow/40' : 'border-white/10 hover:border-tad-yellow/40 bg-white/[0.02]'
                    )}
                  >
                    {previewUrl ? (
                      <>
                        <video ref={videoRef} src={previewUrl} className="w-full h-full object-cover" controls />
                        <button
                          onClick={() => { setFile(null); setPreviewUrl(null); }}
                          className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur rounded-xl text-white hover:bg-red-500 transition-colors"
                          aria-label="Quitar video"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="p-5 bg-tad-yellow/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                          <Film className="w-10 h-10 text-tad-yellow" />
                        </div>
                        <p className="text-white font-bold text-base">Arrastra tu video aquí</p>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-black mt-1">MP4 o WEBM · Máx 200MB</p>
                        <input
                          type="file"
                          accept="video/mp4,video/webm"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          aria-label="Seleccionar video"
                        />
                      </>
                    )}
                  </div>

                  {uploadError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold uppercase">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      {uploadError}
                    </div>
                  )}

                  <button
                    disabled={!file || uploading}
                    onClick={handleUpload}
                    className="w-full py-4 bg-tad-yellow hover:bg-yellow-400 disabled:opacity-30 disabled:grayscale transition-all rounded-2xl text-black font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(250,212,0,0.25)]"
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    {uploading ? 'Subiendo a Supabase Storage...' : 'Subir y Vincular a Campaña'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ======= TAB: SEGMENT ======= */}
          {activeTab === 'segment' && (
            <div className="space-y-6">
              {segmentDone ? (
                <div className="flex flex-col items-center py-10 space-y-4">
                  <div className="w-20 h-20 bg-tad-yellow rounded-[2rem] flex items-center justify-center shadow-[0_0_40px_rgba(250,212,0,0.4)]">
                    <CheckCircle2 className="w-10 h-10 text-black" />
                  </div>
                  <p className="text-white font-black text-lg uppercase tracking-tight">¡Segmentación Guardada!</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {[
                      { val: true, icon: Zap, label: 'Transmisión Global', sub: 'Todos los taxis activos de la red' },
                      { val: false, icon: Users, label: 'Selección Exclusiva', sub: 'Solo conductores seleccionados' },
                    ].map(opt => (
                      <div
                        key={String(opt.val)}
                        onClick={() => setTargetAll(opt.val)}
                        className={clsx(
                          'p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between',
                          targetAll === opt.val
                            ? 'bg-tad-yellow/10 border-tad-yellow/40'
                            : 'bg-white/5 border-white/5 hover:border-white/20'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', targetAll === opt.val ? 'bg-tad-yellow text-black' : 'bg-zinc-900 text-zinc-500')}>
                            <opt.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm uppercase">{opt.label}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase">{opt.sub}</p>
                          </div>
                        </div>
                        <div className={clsx('w-5 h-5 rounded-full border-2', targetAll === opt.val ? 'bg-tad-yellow border-tad-yellow' : 'border-white/20')} />
                      </div>
                    ))}
                  </div>

                  {!targetAll && (
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest pl-1">
                        Conductores ({selectedDrivers.length} seleccionados)
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                        {drivers.map(d => (
                          <div
                            key={d.id}
                            onClick={() => setSelectedDrivers(prev =>
                              prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id]
                            )}
                            className={clsx(
                              'p-3 rounded-xl border text-[11px] font-bold cursor-pointer flex items-center gap-3 transition-all',
                              selectedDrivers.includes(d.id)
                                ? 'bg-white/10 border-tad-yellow/50 text-white'
                                : 'bg-white/5 border-white/5 text-zinc-500 hover:border-white/20'
                            )}
                          >
                            <div className={clsx('w-4 h-4 rounded-md border shrink-0', selectedDrivers.includes(d.id) ? 'bg-tad-yellow border-tad-yellow' : 'border-white/20')} />
                            <span className="truncate">{d.fullName}</span>
                            <span className="text-[9px] opacity-60 ml-auto font-mono">{d.taxiPlate || 'S/P'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    disabled={savingSegment || (!targetAll && selectedDrivers.length === 0)}
                    onClick={handleSaveSegment}
                    className="w-full py-4 bg-white text-black hover:bg-tad-yellow disabled:opacity-30 transition-all rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3"
                  >
                    {savingSegment ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Guardar Segmentación
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(250,212,0,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(250,212,0,0.4); }
      `}</style>
    </div>
  );
});

// ─── Sub-component: MediaCard ─────────────────────────────────────────────────
function MediaCard({
  media,
  assigned,
  loading,
  onToggle,
}: {
  media: MediaItem;
  assigned: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  const name = media.originalFilename || media.filename || 'video.mp4';
  const url = media.url || media.cdnUrl;
  const cleanUrl = url?.split('#')[0];

  return (
    <div
      className={clsx(
        'group relative rounded-2xl border overflow-hidden transition-all duration-300',
        assigned
          ? 'border-tad-yellow/30 bg-tad-yellow/5'
          : 'border-white/5 bg-white/[0.02] hover:border-white/20'
      )}
    >
      {/* Thumbnail */}
      <div
        className="aspect-video bg-zinc-900 relative overflow-hidden"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {cleanUrl && (
          <video
            src={cleanUrl}
            className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
            preload="metadata"
            muted
            playsInline
            ref={el => {
              if (el) {
                if (hover) el.play().catch(() => {});
                else { el.pause(); el.currentTime = 0; }
              }
            }}
          />
        )}
        {!cleanUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="w-8 h-8 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        {assigned && (
          <div className="absolute top-2 right-2 bg-tad-yellow text-black text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">
            ✓ En campaña
          </div>
        )}
      </div>

      {/* Info + Action */}
      <div className="p-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold text-zinc-300 truncate">{name}</p>
        <button
          disabled={loading}
          onClick={onToggle}
          title={assigned ? 'Quitar de campaña' : 'Añadir a campaña'}
          className={clsx(
            'shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all',
            assigned
              ? 'bg-red-500/10 hover:bg-red-500/30 text-red-400 border border-red-500/20'
              : 'bg-tad-yellow/10 hover:bg-tad-yellow/30 text-tad-yellow border border-tad-yellow/20'
          )}
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : assigned
              ? <Unlink className="w-3.5 h-3.5" />
              : <Link2 className="w-3.5 h-3.5" />
          }
        </button>
      </div>
    </div>
  );
}
