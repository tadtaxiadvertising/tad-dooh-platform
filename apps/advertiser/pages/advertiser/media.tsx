import {
  normalizeUploadedMedia,
  type MediaAsset,
  type MediaUploadSource,
} from "@/lib/media-asset";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@tad/ui";
import {
  CloudUpload,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Play,
  Link2,
  Unlink,
  Edit3,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AdvertiserLayout } from "@/components/layout/AdvertiserLayout";
import { VideoUpload } from "@/components/VideoUpload";
import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

export default function AdvertiserMedia() {
  const { session } = useAuth();
  const [mediaLibrary, setMediaLibrary] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renameModal, setRenameModal] = useState<{
    open: boolean;
    media: MediaAsset | null;
    newName: string;
  }>({
    open: false,
    media: null,
    newName: "",
  });
  const [saving, setSaving] = useState(false);
  const [linkModal, setLinkModal] = useState<{
    open: boolean;
    media: MediaAsset | null;
  }>({
    open: false,
    media: null,
  });
  const [unlinkModal, setUnlinkModal] = useState<{
    open: boolean;
    media: MediaAsset | null;
  }>({ open: false, media: null });

  const fetchMedia = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`/api/proxy/media`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("No se pudieron cargar los archivos");
      const data = await res.json();
      setMediaLibrary(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError("Error al cargar la librería de media.");
      console.error("fetch media error:", e);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.access_token) fetchMedia();
  }, [session, fetchMedia]);

  const handleUploadComplete = (newMedia: MediaUploadSource) => {
    const media = normalizeUploadedMedia(newMedia);
    setMediaLibrary((prev) =>
      prev.some((item) => item.id === media.id) ? prev : [media, ...prev],
    );
  };

  const handleRename = async () => {
    const { media, newName } = renameModal;
    if (!media || !newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/proxy/media/${media.id}/rename`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ filename: newName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "No se pudo renombrar el archivo");
      }
      setMediaLibrary((prev) =>
        prev.map((m: MediaAsset) =>
          m.id === media.id
            ? {
                ...m,
                filename: newName.trim(),
                originalFilename: newName.trim(),
              }
            : m,
        ),
      );
      setRenameModal({ open: false, media: null, newName: "" });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al renombrar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (media: MediaAsset) => {
    if (!session?.access_token) return;
    if (!confirm(`¿Eliminar "${media.filename}" permanentemente?`)) return;
    try {
      const res = await fetch(`/api/proxy/media/${media.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "No se pudo eliminar el archivo");
      }
      setMediaLibrary((prev) =>
        prev.filter((m: MediaAsset) => m.id !== media.id),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  const handleUnlink = async (media: MediaAsset) => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`/api/proxy/media/${media.id}/unlink`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "No se pudo desvincular el archivo");
      }
      setMediaLibrary((prev) =>
        prev.map((m: MediaAsset) =>
          m.id === media.id
            ? { ...m, campaign_id: undefined, campaign: null }
            : m,
        ),
      );
      setUnlinkModal({ open: false, media: null });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al desvincular");
    }
  };

  const openRename = (media: MediaAsset) => {
    setRenameModal({
      open: true,
      media,
      newName: media.filename || media.originalFilename || "",
    });
  };

  const isVideo = (m: MediaAsset) =>
    !!(m.mimeType && m.mimeType.startsWith("video/")) ||
    !!(m.mime_type && m.mime_type.startsWith("video/")) ||
    (m.filename && m.filename.toLowerCase().endsWith(".mp4"));

  const isImage = (m: MediaAsset) =>
    !!(m.mimeType && m.mimeType.startsWith("image/")) ||
    !!(m.mime_type && m.mime_type.startsWith("image/")) ||
    !!(
      m.filename &&
      (m.filename.toLowerCase().endsWith(".jpg") ||
        m.filename.toLowerCase().endsWith(".jpeg") ||
        m.filename.toLowerCase().endsWith(".png"))
    );

  return (
    <AdvertiserLayout title="Librería de Media" subtitle="Gestión de Activos">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
            Gestión de Activos
          </p>
          <h1 className="text-4xl font-black uppercase tracking-tighter">
            Mi <span className="text-[#fad400]">Librería</span>
          </h1>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="mb-12">
        <VideoUpload onUploadComplete={handleUploadComplete} />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#fad400] animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-3 bg-red-900/20 border border-red-800/40 rounded-2xl p-4 mb-8">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && mediaLibrary.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CloudUpload className="w-16 h-16 text-zinc-700 mb-6" />
          <h3 className="text-lg font-black uppercase tracking-widest text-zinc-500 mb-2">
            No hay archivos aún
          </h3>
          <p className="text-sm text-zinc-600 max-w-xs">
            Sube tus primeros videos o imágenes para comenzar a crear campañas
            publicitarias.
          </p>
        </div>
      )}

      {/* Media Library Grid */}
      {!loading && !error && mediaLibrary.length > 0 && (
        <>
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">
            Archivos ({mediaLibrary.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {mediaLibrary.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-zinc-900/30 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 hover:bg-zinc-800/40 transition-all group"
                >
                  {/* Preview */}
                  <div className="aspect-video bg-black/60 rounded-2xl mb-5 flex items-center justify-center relative overflow-hidden group-hover:border-[#fad400]/20 border border-transparent transition-all">
                    {isImage(item) ? (
                      <img
                        src={item.cdnUrl || item.url}
                        alt={item.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : isVideo(item) ? (
                      <>
                        <video
                          src={item.cdnUrl || item.url}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="w-12 h-12 rounded-full bg-[#fad400] text-black flex items-center justify-center translate-y-4 group-hover:translate-y-0 transition-transform">
                            <Play className="w-5 h-5 fill-current" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <FileVideo className="w-10 h-10 text-zinc-700" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-tight line-clamp-1 group-hover:text-[#fad400] transition-colors">
                        {item.filename}
                      </h4>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1">
                        {(item.size / (1024 * 1024)).toFixed(1)} MB •{" "}
                        {new Date(item.createdAt).toLocaleDateString("es-DR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">
                        {item.status === "READY" ? "Listo" : item.status}
                      </span>
                      {item.campaign ? (
                        <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500 ml-2">
                          en: {item.campaign.name}
                        </span>
                      ) : null}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 border-t border-white/5 pt-3 mt-1">
                      {item.campaign && item.campaign.active ? (
                        <button
                          onClick={() =>
                            setUnlinkModal({ open: true, media: item })
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-zinc-800/50"
                        >
                          <Unlink className="w-3 h-3" />
                          Desvincular
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            setLinkModal({ open: true, media: item })
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-[#fad400] transition-colors rounded-lg hover:bg-zinc-800/50"
                        >
                          <Link2 className="w-3 h-3" />
                          Vincular
                        </button>
                      )}
                      <button
                        onClick={() => openRename(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800/50"
                      >
                        <Edit3 className="w-3 h-3" />
                        Renombrar
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-rose-500 transition-colors rounded-lg hover:bg-zinc-800/50 ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Rename Modal */}
      <AnimatePresence>
        {renameModal.open && renameModal.media && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() =>
                setRenameModal({ open: false, media: null, newName: "" })
              }
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-zinc-900 rounded-2xl border border-white/10 p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-white mb-1">
                  Renombrar archivo
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">
                  {renameModal.media.filename}
                </p>
                <input
                  type="text"
                  value={renameModal.newName}
                  onChange={(e) =>
                    setRenameModal({ ...renameModal, newName: e.target.value })
                  }
                  className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#fad400]/50 mb-4"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !saving) handleRename();
                    if (e.key === "Escape")
                      setRenameModal({ open: false, media: null, newName: "" });
                  }}
                />
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() =>
                      setRenameModal({ open: false, media: null, newName: "" })
                    }
                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRename}
                    disabled={saving || !renameModal.newName.trim()}
                    className="px-4 py-2 bg-[#fad400] text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#e6b800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      "Guardar"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Link Modal (proximamente: selector de campañas) */}
      <AnimatePresence>
        {linkModal.open && linkModal.media && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setLinkModal({ open: false, media: null })}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-zinc-900 rounded-2xl border border-white/10 p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-white mb-1">
                  Vincular a campaña
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">
                  {linkModal.media.filename}
                </p>
                <p className="text-sm text-zinc-400 mb-6">
                  Esta funcionalidad vincula el archivo multimedia con una
                  campaña activa mediante la API /campaigns. Requiere
                  integración con el módulo de campañas.
                </p>
                <div className="flex gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-[#fad400]/10 text-[#fad400] text-[9px] font-black uppercase tracking-widest rounded-md">
                    Campaña activa
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-md">
                    Compatible
                  </span>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setLinkModal({ open: false, media: null })}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Unlink Modal */}
      <AnimatePresence>
        {unlinkModal.open && unlinkModal.media && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setUnlinkModal({ open: false, media: null })}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-zinc-900 rounded-2xl border border-white/10 p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-white mb-1">
                  Desvincular de campaña
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">
                  {unlinkModal.media.filename}
                </p>
                <p className="text-sm text-zinc-400 mb-6">
                  ¿Confirmas que deseas desvincular este archivo de{" "}
                  <span className="text-white font-bold">
                    {unlinkModal.media.campaign?.name}
                  </span>
                  ?
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setUnlinkModal({ open: false, media: null })}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (unlinkModal.media) handleUnlink(unlinkModal.media);
                    }}
                    className="px-4 py-2 bg-rose-600/80 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-colors flex items-center gap-2"
                  >
                    <Unlink className="w-3 h-3" />
                    Desvincular
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdvertiserLayout>
  );
}
