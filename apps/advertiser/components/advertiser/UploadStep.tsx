// apps/advertiser/components/advertiser/UploadStep.tsx
import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileVideo, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface UploadStepProps {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  onPrev: () => void;
  isLoading: boolean;
}

const UploadStep: React.FC<UploadStepProps> = ({ formData, setFormData, onSubmit, onPrev, isLoading }) => {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // MIME type validation
    if (file.type !== 'video/mp4') {
      return 'Formato no permitido. Solo se acepta video/mp4.';
    }
    
    // Size validation (55MB = 55 * 1024 * 1024 bytes)
    const MAX_SIZE = 55 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return `El archivo es demasiado grande (${(file.size / (1024 * 1024)).toFixed(1)}MB). El máximo es 55MB.`;
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setFormData({ ...formData, file: null });
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setError(null);
        setFormData({ ...formData, file });
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-xl mx-auto space-y-6"
    >
      <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl space-y-6 text-center">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase">Sube tu Contenido</h2>
          <p className="text-slate-400 text-sm">Tu video será validado antes de ser procesado</p>
        </div>

        <div 
          onClick={() => !isLoading && fileInputRef.current?.click()}
          className={`
            relative group border-2 border-dashed rounded-[2rem] p-12 transition-all cursor-pointer
            ${formData.file ? 'border-green-500/50 bg-green-500/5' : 'border-slate-800 bg-slate-950/30 hover:border-[#fad400]/50'}
            ${error ? 'border-red-500/50 bg-red-500/5' : ''}
          `}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/mp4"
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4">
            {formData.file ? (
              <>
                <div className="bg-green-500/20 p-4 rounded-full">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-white font-bold text-sm truncate max-w-[200px]">{formData.file.name}</p>
                  <p className="text-slate-500 text-xs">{(formData.file.size / (1024 * 1024)).toFixed(2)} MB • Listo para subir</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-slate-900 p-4 rounded-full group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10 text-[#fad400]" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-300 font-bold">Haz clic para seleccionar</p>
                  <p className="text-slate-500 text-xs">MP4 • Codec H.264 • Máx 55MB</p>
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex gap-3 items-center text-left"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-xs text-red-400 font-medium">{error}</p>
          </motion.div>
        )}

        <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 text-left">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Resumen de Campaña</h4>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-white font-bold">{formData.companyName || 'Sin Empresa'}</p>
              <p className="text-slate-400 text-xs">{formData.expectedScreens} Pantallas • {formData.email}</p>
            </div>
            <div className="text-right">
              <p className="text-[#fad400] font-black text-xl">RD$ {formData.budget.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onPrev}
          disabled={isLoading}
          className="flex-1 bg-slate-900 text-slate-400 font-bold py-4 rounded-2xl border border-slate-800 hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          ATRÁS
        </button>
        <button
          onClick={onSubmit}
          disabled={!formData.file || isLoading}
          className="flex-[2] bg-[#fad400] text-slate-950 font-black py-4 rounded-2xl hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_30px_rgba(250,212,0,0.2)] flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              PROCESANDO...
            </>
          ) : (
            'CONFIRMAR Y PAGAR'
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default UploadStep;
