import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { AntigravityButton } from '../ui/AntigravityButton';
import { UploadCloud, FileVideo, X } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface DirectUploadProps {
  onSuccess: (url: string, filename: string) => void;
}

export function DirectUpload({ onSuccess }: DirectUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== 'video/mp4') {
        toast.error('Formato inválido. Solo se permite video/mp4.');
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit logic
        toast.error('El video no puede superar los 50MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setProgress(0);

    try {
      const fileName = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
      const filePath = `advertiser_uploads/${fileName}`;

      const { data, error } = await supabase.storage
        .from('campaign-videos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Upload successful. Now get public URL
      const { data: publicData } = supabase.storage
        .from('campaign-videos')
        .getPublicUrl(filePath);

      toast.success('Video subido exitosamente.');
      onSuccess(publicData.publicUrl, fileName);
      setSelectedFile(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al subir el video.');
    } finally {
      setIsUploading(false);
      setProgress(100);
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
              <h3 className="text-lg font-medium text-white text-center">Cargar Nuevo Contenido</h3>
              <p className="text-sm text-zinc-400 text-center">Solo formato MP4 permitido</p>
            </div>
            <label className="cursor-pointer">
              <AntigravityButton variant="secondary" onClick={() => {}} className="pointer-events-none">
                Seleccionar Video
              </AntigravityButton>
              <input type="file" className="hidden" accept="video/mp4" onChange={handleFileChange} />
            </label>
          </>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl w-full border border-white/10">
              <FileVideo className="w-8 h-8 text-[#FFD400]" />
              <div className="flex-1 truncate">
                <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                <p className="text-xs text-zinc-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button onClick={() => !isUploading && setSelectedFile(null)} className="text-zinc-400 hover:text-white" disabled={isUploading}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {isUploading && (
              <div className="w-full mt-4">
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FFD400] transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-xs text-zinc-400 mt-2 text-center">Subiendo directo a almacenamiento seguro...</p>
              </div>
            )}

            <div className="mt-6 w-full flex justify-end space-x-3">
              <AntigravityButton 
                variant="primary" 
                onClick={handleUpload} 
                isPending={isUploading}
                className="w-full sm:w-auto"
              >
                Subir Video
              </AntigravityButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
