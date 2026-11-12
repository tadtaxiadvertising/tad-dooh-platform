"use client";

import { useEffect, useRef, useState } from "react";

const MAX_BYTES = 30 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]);

export default function CreativePreview() {
  const [media, setMedia] = useState<{ url: string; type: "image" | "video"; name: string } | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (media) URL.revokeObjectURL(media.url); }, [media]);

  function onFile(file?: File) {
    setError("");
    if (!file) return;
    if (!ACCEPTED.has(file.type)) {
      setError("Usa JPG, PNG, WebP, MP4 o WebM.");
      return;
    }
    if (file.size > MAX_BYTES || file.size === 0) {
      setError("El archivo debe tener entre 1 byte y 30 MB.");
      return;
    }
    setMedia({ url: URL.createObjectURL(file), type: file.type.startsWith("video/") ? "video" : "image", name: file.name });
  }

  return (
    <section aria-labelledby="creative-preview-title" style={{ padding: "clamp(20px, 4vw, 48px)", borderRadius: 24, background: "#161616", color: "#fff", marginBlock: 32 }}>
      <h2 id="creative-preview-title" style={{ fontSize: "clamp(1.5rem, 3vw, 2.5rem)", marginBottom: 12 }}>Mira tu anuncio dentro de un taxi TAD</h2>
      <p style={{ color: "#ddd", maxWidth: 650, marginBottom: 20 }}>Prueba una imagen o video en una representación de la pantalla detrás del copiloto. La vista previa permanece en tu dispositivo; no publica ni sube tu anuncio.</p>
      <label htmlFor="creative-preview-file" style={{ display: "inline-block", background: "#facc15", color: "#111", padding: "12px 18px", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>Elegir imagen o video</label>
      <input ref={inputRef} id="creative-preview-file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(event) => onFile(event.target.files?.[0])} style={{ display: "block", marginTop: 10, maxWidth: "100%" }} aria-describedby="creative-preview-help" />
      <p id="creative-preview-help" style={{ fontSize: 13, color: "#ccc" }}>Formatos: JPG, PNG, WebP, MP4, WebM · Máximo 30 MB.</p>
      {error && <p role="alert" style={{ color: "#ffb4b4" }}>{error}</p>}
      <div style={{ marginTop: 24, maxWidth: 680, marginInline: "auto", padding: "clamp(12px, 4vw, 32px)", background: "#303030", borderRadius: 24 }}>
        <p style={{ textAlign: "center", fontSize: 13, color: "#ddd", marginBottom: 12 }}>VISTA ILUSTRATIVA · PANTALLA ORIENTADA AL PASAJERO</p>
        <div style={{ padding: 10, borderRadius: 16, background: "#050505", border: "4px solid #666", aspectRatio: "16 / 9", display: "grid", placeItems: "center", overflow: "hidden" }}>
          {media?.type === "image" ? <img src={media.url} alt="Vista previa local de tu anuncio" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : media?.type === "video" ? <video key={media.url} src={media.url} controls playsInline preload="metadata" aria-label="Vista previa de video" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ textAlign: "center", color: "#facc15", fontWeight: 800, fontSize: "clamp(24px, 6vw, 56px)" }}>TAD ▶</div>}
        </div>
        {media && <p style={{ marginTop: 12, overflowWrap: "anywhere", fontSize: 13 }}>Vista previa: {media.name}</p>}
      </div>
      <p style={{ fontSize: 12, color: "#bbb", marginTop: 14 }}>Esta demostración no verifica compatibilidad final con el Player. Las creatividades deben pasar revisión y validación antes de publicarse.</p>
    </section>
  );
}
