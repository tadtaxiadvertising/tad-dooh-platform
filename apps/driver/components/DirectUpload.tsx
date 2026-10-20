"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { AntigravityButton } from "@tad/ui";
import {
  UploadCloud,
  FileVideo,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useDirectUpload } from "@/hooks/useDirectUpload";

interface DirectUploadProps {
  onSuccess: (url: string, filename: string) => void;
}

export function DirectUpload({ onSuccess }: DirectUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { upload, isUploading, progress, error, reset } = useDirectUpload({
    onSuccess: (result) => {
      toast.success("Video subido y verificado exitosamente.");
      onSuccess(result.url, result.filename);
      setSelectedFile(null);
      reset();
    },
    onError: (err) => {
      toast.error(err.message || "Error al subir el video.");
    },
    onProgress: (p) => {
      // Progress handled in UI
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== "video/mp4") {
        toast.error("Formato inválido. Solo se permite video/mp4.");
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.error("El video no puede superar los 100MB.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await upload(selectedFile);
    } catch (err) {
      // Error handled by hook + toast
    }
  };

  return (
    <div className="border border-white/10 rounded-2xl p-6 bg-black/20 backdrop-blur-3xl shadow-xl">
      <div className="flex flex-col items-center justify-center space-y-4">
        {!selectedFile ? (
          <>
            <div className="w-16 h-16 rounded-full bg-[#FFD400]/10 flex items-center justify-center">
              <UploadCloud className="w-8 h-8 text-[#FFD400]" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white text-center">
                Cargar Nuevo Contenido
              </h3>
              <p className="text-sm text-zinc-400 text-center">
                Solo formato MP4 permitido • Máx 100MB
              </p>
            </div>
            <label className="cursor-pointer">
              <AntigravityButton
                actionName="Select_Video"
                variant="secondary"
                onAsyncClick={async () => {}}
                className="pointer-events-none"
              >
                Seleccionar Video
              </AntigravityButton>
              <input
                type="file"
                className="hidden"
                accept="video/mp4"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
          </>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl w-full border border-white/10">
              <FileVideo className="w-8 h-8 text-[#FFD400]" />
              <div className="flex-1 truncate">
                <p className="text-sm font-medium text-white truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-zinc-400">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isUploading) setSelectedFile(null);
                }}
                className="text-zinc-400 hover:text-white"
                disabled={isUploading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isUploading && (
              <div className="w-full mt-4">
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FFD400] transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-zinc-400 mt-2 text-center">
                  {progress.percentage}% • Subiendo a almacenamiento seguro...
                </p>
              </div>
            )}

            {error && !isUploading && (
              <div className="w-full mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-300 flex-1">{error}</p>
                <button
                  onClick={() => reset()}
                  className="text-xs text-red-300 hover:underline"
                >
                  Reintentar
                </button>
              </div>
            )}

            <div className="mt-6 w-full flex justify-end space-x-3">
              <AntigravityButton
                actionName="Upload_Video"
                variant="primary"
                onAsyncClick={async () => {
                  await handleUpload();
                }}
                className="w-full sm:w-auto"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Subiendo...
                  </>
                ) : (
                  "Subir Video"
                )}
              </AntigravityButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
