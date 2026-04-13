import React, { useState, useRef, useCallback } from 'react';
import { useVideoTranscoder } from '../hooks/useVideoTranscoder';
import { UploadCloud, FileVideo, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from "@tad/services";
import api from "@tad/services";
import { useAuth } from '@tad/ui';

const MAX_FILE_SIZE_MB = 100;

interface VideoUploadProps {
  onUploadComplete?: (media: any) => void;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({ onUploadComplete }) => {
  const { session } = useAuth();
  const { state, progress, transcode, errorMessage } = useVideoTranscoder();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificamos soporte de WASM (necesario para compresión local)
  const [hasWasmSupport] = useState(() => {
    return typeof window !== "undefined" && typeof WebAssembly === 'object';
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    setProcessedBlob(null);
    setOriginalSize(null);
    setSelectedFile(null);

    const fileSizeMB = file.size / (1024 * 1024);

    // Límite duro global (100MB según reglas de negocio TAD)
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setValidationError(`El archivo de ${fileSizeMB.toFixed(1)}MB excede el límite máximo de ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setOriginalSize(fileSizeMB);
    setSelectedFile(file);
  }, []);

  const handleStartTranscode = async () => {
    if (!selectedFile) return;
    try {
      if (!hasWasmSupport) {
         // Fallback: No hay soporte de WASM, subimos directo
         setProcessedBlob(selectedFile);
         return;
      }
      
      const compressed = await transcode(selectedFile);
      setProcessedBlob(compressed);
    } catch (error) {
      console.error('Transcoding failed, falling back to direct upload:', error);
      // Si la optimización falla (ej. error de memoria), permitimos subida directa como último recurso
      setProcessedBlob(selectedFile);
    }
  };

  const [isFinalUploading, setIsFinalUploading] = useState(false);

  const handleUploadToSupabase = async () => {
    if (!processedBlob || !selectedFile) return;
    
    setIsFinalUploading(true);
    try {
      // 0. Get Signed Upload URL from Backend (Bypasses RLS issues)
      const uploadUrlResponse = await api.get(`/media/upload-url?fileName=${encodeURIComponent(selectedFile.name)}&fileType=video%2Fmp4`);
      
      if (!uploadUrlResponse.data || !uploadUrlResponse.data.uploadUrl) {
        throw new Error('No se pudo obtener la URL de subida autorizada.');
      }

      const { uploadUrl, path: storagePath, publicUrl } = uploadUrlResponse.data;

      // 1. Upload to Supabase Storage using the Signed URL
      // We use a clean fetch PUT for signed URLs which is the standard Supabase/S3 way
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: processedBlob,
        headers: {
          'Content-Type': 'video/mp4'
        }
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Storage Upload Error:', errorText);
        throw new Error('Error al subir el archivo al almacenamiento seguro de TAD.');
      }

      // 2. Register Metadata in Backend
      const payload = {
        fileName: selectedFile.name,
        storagePath: storagePath,
        url: publicUrl,
        fileSize: processedBlob.size,
        brandId: session?.user?.app_metadata?.entityId || (session?.user as any)?.entityId
      };

      console.log('[UPLOAD] Registrando media:', payload);

      const response = await api.post('/campaigns/register-media', payload).catch(err => {
        const msg = err.response?.data?.message || err.message;
        throw new Error(`Error en el registro: ${msg}`);
      });

      if (response.data && onUploadComplete) {
        // El backend devuelve { success: true, media: {...} }
        const mediaData = response.data.media || response.data;
        onUploadComplete(mediaData);
        
        // Reset state
        setSelectedFile(null);
        setProcessedBlob(null);
      }
      
      alert('¡Video optimizado, subido y registrado con éxito!');
    } catch (error: any) {
      console.error('❌ Error en el flujo de subida:', error);
      alert(error.message || 'No se pudo completar la subida del video');
    } finally {
      setIsFinalUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 text-slate-100">
      <h2 className="text-2xl font-semibold mb-4 flex items-center space-x-2">
        <FileVideo className="w-6 h-6 text-indigo-400" />
        <span>Subir Video Promocional</span>
      </h2>

      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          selectedFile ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
        }`}
      >
        <input 
          type="file" 
          accept="video/mp4,video/quicktime" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange}
        />
        
        {!selectedFile ? (
          <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <UploadCloud className="w-12 h-12 text-slate-400 mb-3" />
            <p className="font-medium text-slate-300">Seleccionar video (MP4/MOV)</p>
            <p className="text-sm text-slate-500 mt-2">Máximo permitido: {MAX_FILE_SIZE_MB}MB</p>
            {!hasWasmSupport && (
               <p className="text-xs text-amber-500 mt-2 flex items-center gap-1 justify-center px-4 italic">
                 <AlertCircle className="w-3 h-3 flex-shrink-0" /> Compresión local no disponible. Se subirá el archivo original.
               </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
              <div className="flex items-center space-x-3 w-[70%]">
                 <FileVideo className="w-8 h-8 text-indigo-400 shrink-0" />
                 <div className="text-left font-medium overflow-hidden w-full">
                   <p className="truncate w-full" title={selectedFile.name}>{selectedFile.name}</p>
                   <p className="text-xs text-slate-400">{originalSize?.toFixed(1)} MB</p>
                 </div>
              </div>
              <button 
                onClick={() => { setSelectedFile(null); setProcessedBlob(null); }}
                className="text-xs text-slate-400 hover:text-white px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded transition"
              >
                Cambiar
              </button>
            </div>

            {state === 'idle' && !processedBlob && (
              <button 
                onClick={handleStartTranscode}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition shadow-lg shadow-indigo-600/20"
              >
                {hasWasmSupport ? 'Optimizar y Preparar Video' : 'Preparar Video'}
              </button>
            )}

            {(state === 'loading_library' || state === 'transcoding') && (
              <div className="space-y-3 py-4">
                <div className="flex justify-between text-sm text-slate-300 mb-1">
                  <span>{state === 'loading_library' ? 'Cargando motor de video...' : 'Optimizando al estándar TAD (1080p, H264)...'}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300 relative overflow-hidden"
                    style={{ width: `${Math.max(1, progress)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}

            {state === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start space-x-3 text-sm text-left">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{errorMessage || validationError || 'Error procesando el video'}</p>
              </div>
            )}

            {processedBlob && (
              <div className={`p-4 rounded-lg flex flex-col items-center justify-center space-y-3 ${
                processedBlob === selectedFile 
                  ? 'bg-amber-500/10 border border-amber-500/20' 
                  : 'bg-emerald-500/10 border border-emerald-500/20'
              }`}>
                <div className={`flex items-center space-x-2 font-medium ${
                  processedBlob === selectedFile ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {processedBlob === selectedFile ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                  <span>{processedBlob === selectedFile ? 'Video Listo para Subida Directa' : 'Video Optimizado Exitosamente'}</span>
                </div>
                
                <div className="flex w-full justify-between max-w-xs text-sm mt-2">
                  <div className="text-center bg-slate-800 rounded p-2 flex-1 mx-1 border border-slate-700">
                    <p className="text-slate-400 text-xs uppercase mb-1">Tamaño</p>
                    <span className={processedBlob === selectedFile ? 'text-amber-300 font-bold' : 'line-through opacity-70 text-slate-300'}>
                      {originalSize?.toFixed(1)} MB
                    </span>
                  </div>
                  {processedBlob !== selectedFile && (
                    <div className="text-center bg-indigo-500/10 rounded p-2 flex-1 mx-1 border border-indigo-500/20">
                       <p className="text-indigo-300 text-xs uppercase mb-1">Optimizado</p>
                       <span className="font-bold text-white">{(processedBlob.size / (1024*1024)).toFixed(1)} MB</span>
                    </div>
                  )}
                </div>

                <div className={`text-xs mt-1 text-center ${processedBlob === selectedFile ? 'text-amber-400/80' : 'text-emerald-400/80'}`}>
                   {processedBlob === selectedFile 
                     ? 'Sin optimización local. El video se subirá original (más consumo de datos en flota).' 
                     : `Reducción del ${Math.round(100 - (processedBlob.size / (1024*1024) / (originalSize || 1) * 100))}% garantizando transmisión 4G eficiente.`}
                </div>

                <button 
                  onClick={handleUploadToSupabase}
                  disabled={isFinalUploading}
                  className={`w-full py-3 mt-2 text-white font-medium rounded-lg transition shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    processedBlob === selectedFile 
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' 
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  }`}
                >
                  {isFinalUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />} 
                  {isFinalUploading ? 'Guardando en TAD...' : 'Subir a TAD'}
                </button>
              </div>
            )}
          </div>
        )}

        {validationError && !selectedFile && (
           <div className="mt-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded flex items-center gap-2 text-sm text-left">
             <AlertCircle className="w-5 h-5 shrink-0" />
             <p>{validationError}</p>
           </div>
        )}
      </div>
    </div>
  );
};
