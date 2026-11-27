"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./creative-preview.module.css";

const MAX_BYTES = 30 * 1024 * 1024;
const TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);
type Preview = { url: string; type: "image" | "video"; name: string };

export default function CreativePreview() {
  const [media, setMedia] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [fit, setFit] = useState<"contain" | "cover">("contain");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (media) URL.revokeObjectURL(media.url);
    },
    [media],
  );

  function choose(file?: File) {
    if (!file) return;
    // Reset even on rejection so the same file can be selected again.
    if (input.current) input.current.value = "";
    setError("");
    if (!TYPES.has(file.type)) {
      setMedia(null);
      setError("Formato no admitido. Selecciona JPG, PNG, WebP, MP4 o WebM.");
      return;
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      setMedia(null);
      setError("Selecciona un archivo de hasta 30 MB que no esté vacío.");
      return;
    }
    // This only validates browser-provided metadata; server-side validation remains mandatory.
    setMedia({
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
      name: file.name,
    });
    setFit("contain");
  }

  function failPreview(message: string) {
    // Removing the preview releases its object URL via the effect cleanup.
    setMedia(null);
    setError(message);
  }

  function clear() {
    setMedia(null);
    setError("");
    if (input.current) {
      input.current.value = "";
      input.current.focus();
    }
  }

  return (
    <section
      className={styles.section}
      aria-labelledby="creative-preview-title"
    >
      <div className={styles.intro}>
        <p className={styles.eyebrow}>
          ESTUDIO CREATIVO · DEMOSTRACIÓN GRATUITA
        </p>
        <h2 id="creative-preview-title">
          Tu marca, <span>en el recorrido.</span>
        </h2>
        <p>
          Sube una imagen o video y descubre cómo se vería en una pantalla TAD
          frente al pasajero. Sin registro y sin enviar el archivo a nuestros
          servidores.
        </p>
      </div>
      <div className={styles.layout}>
        <div className={styles.stage}>
          <div className={styles.stageHeader}>
            <span className={styles.liveDot} /> VISTA PREVIA EN EL TAXI{" "}
            <span>16:9 · ILUSTRATIVA</span>
          </div>
          <div className={styles.cabin}>
            <div className={styles.headrest} aria-hidden="true" />
            <div className={styles.screen}>
              {media?.type === "image" ? (
                <img
                  key={media.url}
                  src={media.url}
                  alt="Vista previa de la creatividad seleccionada"
                  style={{ objectFit: fit }}
                  onError={() =>
                    failPreview(
                      "El navegador no pudo abrir esta imagen. Comprueba el archivo o prueba otro.",
                    )
                  }
                />
              ) : media?.type === "video" ? (
                <video
                  key={media.url}
                  src={media.url}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label="Reproducir video de prueba"
                  style={{ objectFit: fit }}
                  onError={() =>
                    failPreview(
                      "El navegador no pudo reproducir este video. Comprueba el códec o prueba otro archivo.",
                    )
                  }
                />
              ) : (
                <div className={styles.placeholder}>
                  <strong>
                    TAD<span>▶</span>
                  </strong>
                  <small>Tu anuncio puede estar aquí</small>
                </div>
              )}
            </div>
            <div className={styles.mount} aria-hidden="true" />
          </div>
          <p className={styles.stageCaption}>
            Pantalla instalada detrás del reposacabezas del copiloto, orientada
            hacia los pasajeros. Recreación conceptual, no fotografía de una
            instalación real.
          </p>
        </div>
        <div className={styles.editor}>
          <div className={styles.step}>01 / SUBE TU CREATIVIDAD</div>
          <h3>Haz la prueba con tu anuncio.</h3>
          <p>
            Elige el archivo que deseas mostrar. Podrás ajustar su encuadre
            antes de continuar.
          </p>
          <div
            className={styles.dropzone}
            data-dragging={dragging}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              choose(e.dataTransfer.files[0]);
            }}
          >
            <label htmlFor="creative-preview-file">
              Seleccionar imagen o video
            </label>
            <input
              id="creative-preview-file"
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              onChange={(e) => choose(e.target.files?.[0])}
              aria-describedby="creative-preview-help"
            />
            <small id="creative-preview-help">
              También puedes arrastrar un archivo aquí. JPG, PNG, WebP, MP4 o
              WebM · Máximo 30 MB.
            </small>
          </div>
          <p role="status" className={styles.selectionStatus}>
            {media ? "Archivo seleccionado." : "Ningún archivo seleccionado."}
          </p>
          {media && (
            <div className={styles.selected}>
              <span title={media.name}>{media.name}</span>
              <button type="button" onClick={clear}>
                Quitar
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.step}>02 / AJUSTA LA PRESENTACIÓN</div>
          <div
            className={styles.fitControls}
            role="group"
            aria-label="Encuadre de la creatividad"
          >
            <button
              type="button"
              aria-pressed={fit === "contain"}
              onClick={() => setFit("contain")}
            >
              Mostrar completa
            </button>
            <button
              type="button"
              aria-pressed={fit === "cover"}
              onClick={() => setFit("cover")}
            >
              Llenar pantalla
            </button>
          </div>
          <p className={styles.privacy}>
            Tu archivo permanece en este navegador. Esta prueba no crea una
            campaña, no confirma inventario ni garantiza compatibilidad con el
            reproductor final.
          </p>
          <a className={styles.cta} href="#experiencia">
            Calcular mi campaña <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
