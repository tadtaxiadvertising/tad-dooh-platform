"use client";

import { calculateFileMd5, getErrorMessage } from "@tad/services";

import { useState } from "react";

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  url: string;
  filename: string;
  mediaId: string;
  verified: boolean;
}

interface UseDirectUploadOptions {
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: UploadProgress) => void;
}

export function useDirectUpload(options: UseDirectUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File, campaignId?: string) => {
    if (isUploading) return;

    // Validaciones cliente
    const allowedTypes = ["video/mp4", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      const err = new Error(
        `Tipo de archivo no permitido: ${file.type}. Solo MP4, JPG, PNG.`,
      );
      setError(err.message);
      options.onError?.(err);
      throw err;
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      const err = new Error(`El archivo excede el límite de 100MB`);
      setError(err.message);
      options.onError?.(err);
      throw err;
    }

    setIsUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      // 1. Obtener signed URL del backend
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
      const uploadUrlRes = await fetch(
        `${apiBase}/media/upload-url?fileName=${encodeURIComponent(
          file.name,
        )}&fileType=${encodeURIComponent(file.type)}`,
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

      // 3. Subir directamente a Supabase Storage con progress
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
    reset: () => {
      setProgress({ loaded: 0, total: 0, percentage: 0 });
      setError(null);
    },
  };
}

function getAuthToken(): string {
  // Prioridad: cookie Supabase > localStorage > sessionStorage
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
