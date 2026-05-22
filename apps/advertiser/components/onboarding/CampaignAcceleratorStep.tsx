import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onComplete: (data: any) => void;
  onBack: () => void;
  onSkip: () => void;
}

export const CampaignAcceleratorStep = ({ onComplete, onBack, onSkip }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setError(null);
    
    if (!selected) return;

    // Browser-side Validation
    if (selected.type !== 'video/mp4') {
      setError('Solo se permiten archivos en formato MP4 (H.264).');
      return;
    }

    const maxSizeInBytes = 55 * 1024 * 1024; // 55 MB
    if (selected.size > maxSizeInBytes) {
      setError('El archivo excede el tamaño máximo permitido de 55MB.');
      return;
    }

    setFile(selected);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = () => {
    if (!file) return;
    // In real implementation, this would upload to Supabase Storage
    // and wait for tad-remotion webhook feedback.
    toast.success('Archivo cargado exitosamente. Validando formato...');
    onComplete({ campaignFile: file });
  };

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-full"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Acelerador de Campaña</h2>
        <p className="text-gray-400">Sube tu primer anuncio MP4 para lanzarlo al instante.</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {!file ? (
          <div 
            onClick={handleUploadClick}
            className="w-full h-64 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group"
          >
            <Upload className="w-12 h-12 text-gray-400 group-hover:text-blue-500 mb-4 transition-colors" />
            <p className="text-white font-medium mb-1">Haz clic o arrastra tu video aquí</p>
            <p className="text-gray-500 text-sm">MP4 (H.264), Máx 55MB</p>
          </div>
        ) : (
          <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center space-x-4 overflow-hidden">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-blue-400" />
              </div>
              <div className="truncate">
                <p className="text-white font-medium truncate">{file.name}</p>
                <p className="text-gray-400 text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
            <button 
              onClick={() => setFile(null)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="video/mp4" 
          className="hidden" 
        />

        {error && (
          <div className="mt-4 flex items-start space-x-2 text-red-400 bg-red-400/10 p-3 rounded-lg w-full">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      <div className="pt-8 mt-auto flex justify-between items-center">
        <button 
          type="button"
          onClick={onBack}
          className="px-6 py-3 text-gray-400 hover:text-white font-medium transition-colors"
        >
          Atrás
        </button>
        
        <div className="flex space-x-4">
          <button 
            type="button"
            onClick={onSkip}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all"
          >
            Crear después
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={!file}
            className={`px-8 py-3 font-semibold rounded-xl transition-all shadow-lg ${
              file 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-blue-500/25'
                : 'bg-white/5 text-gray-500 cursor-not-allowed'
            }`}
          >
            Finalizar
          </button>
        </div>
      </div>
    </motion.div>
  );
};
