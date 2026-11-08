import React, { useRef, useState, useCallback } from "react";
import {
  CloudUpload,
  AlertCircle,
  X,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { useDirectUpload } from "@/hooks/useDirectUpload";
import type { UploadResult } from "@/hooks/useDirectUpload";

// Reglas de negocio espejo del backend (validadas también en useDirectUpload)
const MAX_SIZE_BYTES = 55 * 1024 * 1024; // 55MB
const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "image/jpeg",
  "image/png",
  "image/webp",
];

function extOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

/** Verifica (best-effort) que un archivo MP4 sea reproducible (H.264) por el navegador. */
function verifyPlayableVideo(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    const cleanup = () => {
      video.removeAttribute("src");
      URL.revokeObjectURL(url);
    };

    const onTimeout = setTimeout(() => {
      cleanup();
      resolve(false);
    }, 8000);

    video.onloadedmetadata = () => {
      clearTimeout(onTimeout);
      cleanup();
      resolve(video.videoWidth > 0 && video.videoHeight > 0);
    };

    video.onerror = () => {
      clearTimeout(onTimeout);
      cleanup();
      resolve(false);
    };

    video.src = url;
  });
}

export function VideoUpload({
  onUploadComplete,
}: {
  onUploadComplete?: (media: UploadResult) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<File | null>(null);

  const { upload, isUploading, progress, error, retryCount, reset, cancel } =
    useDirectUpload({
      onSuccess: (result) => {
        onUploadComplete?.(result);
      },
    });

  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return;

      const ext = extOf(file.name);
      const mimeOk = !file.type || ALLOWED_MIME_TYPES.includes(file.type);

      if (!ALLOWED_EXTENSIONS.includes(ext) || !mimeOk) {
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        return;
      }

      if (file.type === "video/mp4" || ext === ".mp4") {
        const playable = await verifyPlayableVideo(file);
        if (!playable) {
          return;
        }
      }

      fileInputRef.current = file;
      try {
        await upload(file);
      } catch {
        // El hook maneja error internamente
      }
    },
    [upload],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (e.target.value) e.target.value = "";
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRetry = () => {
    reset();
    if (fileInputRef.current) {
      handleFile(fileInputRef.current);
    }
  };

  const isVideo =
    fileInputRef.current?.type?.startsWith("video/") ||
    fileInputRef.current?.name?.toLowerCase().endsWith(".mp4");
  const objectUrl = isVideo ? URL.createObjectURL(fileInputRef.current!) : null;

  return (
    <div>
      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`bg-zinc-900/30 border rounded-[2rem] p-10 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[200px] ${
          dragActive
            ? "border-[#fad400]/50 bg-zinc-800/40"
            : isUploading
              ? "border-zinc-700/50"
              : "border-white/5 hover:border-[#fad400]/30 hover:bg-zinc-800/20"
        }`}
      >
        {/* Preview o icono */}
        {objectUrl && isVideo ? (
          <video
            src={objectUrl}
            controls
            autoPlay
            muted
            loop
            className="max-h-[160px] w-auto rounded-xl shadow-2xl"
          />
        ) : (
          <>
            <CloudUpload
              className={`w-10 h-10 mb-4 transition-colors ${
                isUploading ? "text-zinc-600" : "text-zinc-500"
              }`}
            />
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
              {isUploading
                ? "Subiendo archivo..."
                : "Drag & Drop or Click to Upload"}
            </p>
            <p className="text-[8px] text-zinc-600 uppercase tracking-widest mt-2">
              MP4 H.264, JPG, PNG — Max 55MB
            </p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,.mp4,image/jpeg,.jpg,.jpeg,image/png,.png"
          onChange={handleChange}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-bold uppercase tracking-widest">
              {progress.percentage}% completado
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                cancel();
              }}
              className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors text-[10px] font-bold uppercase tracking-widest"
            >
              <X className="w-3 h-3" />
              Cancelar
            </button>
          </div>
          <div className="w-full bg-zinc-800/50 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#fad400] to-[#f5a623] rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isUploading && (
        <div className="mt-3 flex items-start gap-2 text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-1 flex items-center gap-1 text-[#fad400] hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reintentar archivo
            </button>
          </div>
        </div>
      )}

      {/* Success State */}
      {!error && !isUploading && progress.percentage === 100 && (
        <div className="mt-3 flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">
            Archivo subido correctamente
          </span>
        </div>
      )}

      {/* Retry badge durante upload */}
      {retryCount > 0 && isUploading && (
        <div className="mt-2 text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
          Reintento {retryCount} de 3
        </div>
      )}
    </div>
  );
}
