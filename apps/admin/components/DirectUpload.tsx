"use client";

import React, { useRef } from "react";
import { CloudUpload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useDirectUpload } from "@/hooks/useDirectUpload";

interface DirectUploadProps {
  onSuccess?: (url: string, filename: string) => void;
  campaignId?: string;
  className?: string;
}

export function DirectUpload({
  onSuccess,
  campaignId,
  className = "",
}: DirectUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, progress, error, reset } = useDirectUpload({
    onSuccess: (result) => {
      onSuccess?.(result.url, result.filename);
      reset();
    },
    onError: (err) => {
      console.error("Upload error:", err);
      // Error handled in UI
    },
  });

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = "";

    try {
      await upload(file, campaignId);
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={`bg-zinc-900/30 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#fad400]/30 transition-all group ${className}`}
    >
      {isUploading ? (
        <>
          <Loader2 className="w-8 h-8 text-[#fad400] animate-spin mb-4" />
          <p className="text-xs font-black uppercase tracking-widest text-[#fad400]">
            Subiendo...
          </p>
          <div className="w-full max-w-xs mt-4">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#fad400] transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="text-[8px] text-zinc-600 uppercase tracking-widest mt-1 text-center">
              {progress.percentage}% • {formatBytes(progress.loaded)} /{" "}
              {formatBytes(progress.total)}
            </p>
          </div>
        </>
      ) : error ? (
        <>
          <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
          <p className="text-xs font-black uppercase tracking-widest text-red-500">
            Error
          </p>
          <p className="text-[8px] text-zinc-600 uppercase tracking-widest mt-1 text-center max-w-xs">
            {error}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            className="mt-4 text-xs text-[#fad400] hover:underline"
          >
            Reintentar
          </button>
        </>
      ) : (
        <>
          <CloudUpload className="w-8 h-8 text-zinc-500 group-hover:text-[#fad400] transition-colors mb-4" />
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">
            Subir Contenido
          </p>
          <p className="text-[8px] text-zinc-600 uppercase tracking-widest mt-1">
            MP4, JPG, PNG • Máx 100MB
          </p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,image/jpeg,image/png"
        onChange={handleChange}
        className="hidden"
        disabled={isUploading}
      />
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
