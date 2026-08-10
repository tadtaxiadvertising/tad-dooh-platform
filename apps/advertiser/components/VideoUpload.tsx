import React, { useRef, useState } from 'react';
import { CloudUpload, AlertCircle } from 'lucide-react';

interface VideoUploadProps {
  onUploadComplete?: (media: any) => void;
}

const MAX_SIZE_BYTES = 55 * 1024 * 1024; // 55MB
const ALLOWED_EXTENSIONS = ['.mp4', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIME_TYPES = ['video/mp4', 'image/jpeg', 'image/png'];

function extOf(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '';
}

/** Verifica (best-effort) que un archivo MP4 sea reproducible (H.264) por el navegador. */
function verifyPlayableVideo(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    const cleanup = () => {
      video.removeAttribute('src');
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

export function VideoUpload({ onUploadComplete }: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const ext = extOf(file.name);
    const mimeOk = !file.type || ALLOWED_MIME_TYPES.includes(file.type);

    if (!ALLOWED_EXTENSIONS.includes(ext) || !mimeOk) {
      setError('Solo se permiten archivos MP4 (H.264), JPG o PNG.');
      if (e.target.value) e.target.value = '';
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError('El archivo excede el límite permitido de 55MB.');
      if (e.target.value) e.target.value = '';
      return;
    }

    if (file.type === 'video/mp4' || ext === '.mp4') {
      const playable = await verifyPlayableVideo(file);
      if (!playable) {
        setError('El video no es un MP4 H.264 válido o está dañado. Re-exporta el archivo y vuelve a intentar.');
        if (e.target.value) e.target.value = '';
        return;
      }
    }

    // Placeholder: in production this would upload to Supabase Storage
    const fakeMedia = {
      id: `mock-${Date.now()}`,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || (ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.png' ? 'image/png' : 'video/mp4'),
      url: `https://storage.supabase.co/tad-media/${file.name}`,
    };

    if (onUploadComplete) {
      onUploadComplete(fakeMedia);
    }
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        className="bg-zinc-900/30 border border-white/5 rounded-[2rem] p-10 flex flex-col items-center justify-center cursor-pointer hover:border-[#fad400]/30 transition-all group min-h-[200px]"
      >
        <CloudUpload className="w-10 h-10 text-zinc-500 group-hover:text-[#fad400] transition-colors mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">
          Drag & Drop or Click to Upload
        </p>
        <p className="text-[8px] text-zinc-600 uppercase tracking-widest mt-2">
          MP4 H.264, JPG, PNG — Max 55MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,.mp4,image/jpeg,.jpg,.jpeg,image/png,.png"
          onChange={handleChange}
          className="hidden"
        />
      </div>
      {error ? (
        <div className="mt-3 flex items-start gap-2 text-red-400 text-xs font-bold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
