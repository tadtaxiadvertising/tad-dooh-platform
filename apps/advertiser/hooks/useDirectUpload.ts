"use client";
import { calculateFileMd5, getErrorMessage } from "@tad/services";

import { useCallback, useState, useRef } from "react";

// ─── Business rules (espejo de backend) ─────────────────────────────────────────
const ALLOWED_MIME_TYPES = ["video/mp4", "image/jpeg", "image/png"];
const ALLOWED_EXTENSIONS = [".mp4", ".jpg", ".jpeg", ".png"];
const MAX_SIZE_BYTES = 57671680; // 55MB

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  filename: string;
  mediaId: string;
  verified: boolean;
}

interface UseDirectUploadOptions {
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: UploadProgress) => void;
  maxRetries?: number;
  retryBaseDelayMs?: number;
}

function extOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

function validateFile(file: File): string | null {
  const ext = extOf(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Extensión no permitida: "${file.name}". Solo se aceptan ${ALLOWED_EXTENSIONS.join(", ")}.`;
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `Tipo MIME no permitido: ${file.type || "(sin tipo)"}. Solo se aceptan ${ALLOWED_MIME_TYPES.join(", ")}.`;
  }
  if (file.size > MAX_SIZE_BYTES) {
    const maxMB = (MAX_SIZE_BYTES / (1024 * 1024)).toFixed(1);
    return `El archivo excede el límite permitido de ${maxMB}MB (${file.name}).`;
  }
  return null;
}

export function useDirectUpload(options: UseDirectUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const currentFileRef = useRef<File | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const resetState = useCallback(() => {
    setProgress({ loaded: 0, total: 0, percentage: 0 });
    setError(null);
    setRetryCount(0);
  }, []);

  const cancelUpload = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    currentFileRef.current = null;
    setIsUploading(false);
    setProgress({ loaded: 0, total: 0, percentage: 0 });
    setError("Subida cancelada por el usuario.");
    setRetryCount(0);
  }, []);

  const upload = async (file: File, campaignId?: string) => {
    // Validación cliente
    const validationError = validateFile(file);
    if (validationError) {
      const err = new Error(validationError);
      setError(validationError);
      options.onError?.(err);
      throw err;
    }

    if (controllerRef.current?.signal.aborted) {
      throw new Error("Subida cancelada antes de iniciar.");
    }

    setIsUploading(true);
    setError(null);
    setRetryCount(0);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

    try {
      // 1. Obtener signed URL del backend
      const uploadUrlRes = await fetch(
        `${apiBase}/media/upload-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        },
      );

      if (!uploadUrlRes.ok) {
        const errData = await uploadUrlRes.json().catch(() => ({}));
        throw new Error(
          errData.message ||
            `Error obteniendo URL de subida: ${uploadUrlRes.status}`,
        );
      }

      const { uploadUrl, path } = await uploadUrlRes.json();

      // 2. Calcular hash MD5 localmente (para verificación)
      const hashMd5 = await calculateFileMd5(file);

      // 3. Subir a Supabase Storage con progress + soporte de cancelación
      await uploadToSignedUrl(uploadUrl, file, (loaded) => {
        setProgress({
          loaded,
          total: file.size,
          percentage: Math.round((loaded / file.size) * 100),
        });
        options.onProgress?.({
          loaded,
          total: file.size,
          percentage: Math.round((loaded / file.size) * 100),
        });
      });

      // 4. Confirmar subida en backend (valida hash + tamaño + crea registro BD)
      const confirmRes = await fetch(`${apiBase}/media/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          path,
          campaignId,
          expectedSize: file.size,
          expectedHashMd5: hashMd5,
          filename: file.name,
        }),
      });

      if (!confirmRes.ok) {
        const errData = await confirmRes.json().catch(() => ({}));
        throw new Error(
          errData.message || `Error confirmando subida: ${confirmRes.status}`,
        );
      }

      const result = await confirmRes.json();

      const uploadResult: UploadResult = {
        url: result.cdnUrl || result.url,
        filename: result.filename,
        mediaId: result.id,
        verified: result.verified === true,
      };

      setProgress({ loaded: file.size, total: file.size, percentage: 100 });
      options.onSuccess?.(uploadResult);

      return uploadResult;
    } catch (err: unknown) {
      const message = getErrorMessage(err) || "Error desconocido en la subida";
      setError(message);
      options.onError?.(err instanceof Error ? err : new Error(message));
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    upload,
    isUploading,
    progress,
    error,
    retryCount,
    reset: resetState,
    cancel: cancelUpload,
  };
}

function getAuthToken(): string {
  if (typeof document !== "undefined") {
    const cookieMatch = document.cookie.match(/sb-access-token=([^;]+)/);
    if (cookieMatch) return cookieMatch[1];
  }
  if (typeof localStorage !== "undefined") {
    const token = localStorage.getItem("sb-access-token");
    if (token) return token;
  }
  if (typeof sessionStorage !== "undefined") {
    const token = sessionStorage.getItem("sb-access-token");
    if (token) return token;
  }
  return "";
}

async function uploadToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress: (loaded: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload aborted"));
    });

    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}
