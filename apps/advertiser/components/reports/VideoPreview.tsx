'use client';

import { useState } from 'react';
import { Film, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

/**
 * VideoPreview — Reproductor seguro con Regla de Negocio R7 enforced.
 *
 * R7 (Multimedia): Solo MP4 (H.264), máximo 55 MB.
 * - Rechaza en render (sin fetch) cualquier asset que viole formato o tamaño,
 *   evitando saturar el canal media.tad.do y la RAM de las tablets player.
 * - Aísla errores de reproducción (codec inválido, 404, CORS) en un estado
 *   de fallback elegante en lugar de un <video> roto / pantalla en blanco.
 */

// Regla de negocio R7 — límite exacto en MB (55 * 1024 * 1024 bytes).
export const R7_MAX_SIZE_MB = 55;
export const R7_ALLOWED_MIME = 'video/mp4';

interface VideoPreviewProps {
  /** URL del asset (signed URL de Supabase Storage, CDN, o object URL local). */
  url: string;
  /** Tamaño del archivo en MB. */
  sizeInMb: number;
  /** MIME type reportado por el asset. Debe ser video/mp4 (R7). */
  mimeType: string;
  /** Clases extra para el contenedor (layout del consumidor). */
  className?: string;
}

/** Discrimina la razón exacta del rechazo para un mensaje accionable. Exportada para tests. */
export function r7Rejection(mimeType: string, sizeInMb: number): string[] {
  const reasons: string[] = [];
  const normalizedMime = (mimeType || '').trim().toLowerCase();
  // R7: estrictamente video/mp4 (H.264). No se aceptan derivados de mime.
  if (normalizedMime !== R7_ALLOWED_MIME) {
    reasons.push(`Formato no permitido ("${mimeType || 'desconocido'}") — R7 exige MP4 H.264.`);
  }
  if (sizeInMb > R7_MAX_SIZE_MB) {
    // Precisión suficiente para distinguir 55.01 de 55 sin ruido decimal.
    const shown = Number(sizeInMb.toFixed(2));
    reasons.push(`Tamaño ${shown}MB excede el límite de ${R7_MAX_SIZE_MB}MB.`);
  }
  return reasons;
}

export function VideoPreview({ url, sizeInMb, mimeType, className }: VideoPreviewProps) {
  const [hasError, setHasError] = useState(false);

  // ── R7 GATE ────────────────────────────────────────────────
  // Gate determinista en cliente: si viola R7 nunca se monta el <video>,
  // por lo que no hay fetch del asset ni consumo de banda ancha.
  const rejectionReasons = r7Rejection(mimeType, sizeInMb);
  const isR7Valid = rejectionReasons.length === 0;

  if (!isR7Valid) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center gap-3 p-8',
          'bg-red-500/10 border border-red-500/30 rounded-2xl backdrop-blur-xl',
          className
        )}
      >
        <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-xs font-black uppercase tracking-widest text-red-400">
          Asset rechazado — R7
        </p>
        <ul className="space-y-1 text-center">
          {rejectionReasons.map((reason) => (
            <li key={reason} className="text-[10px] font-bold text-zinc-400 leading-relaxed">
              {reason}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center gap-3 p-8',
          'bg-zinc-900/40 border border-white/5 rounded-2xl backdrop-blur-xl',
          className
        )}
      >
        <Film className="w-8 h-8 text-zinc-600" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
          No se pudo reproducir el video
        </p>
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-center">
          El archivo puede estar dañado o el enlace haber expirado
        </p>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-lg',
        className
      )}
    >
      <video
        src={url}
        controls
        preload="metadata"
        playsInline
        onError={() => setHasError(true)}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        className="w-full h-auto max-h-[400px] object-contain bg-black"
      >
        Tu navegador no soporta reproducción de video MP4.
      </video>
    </div>
  );
}

export default VideoPreview;
