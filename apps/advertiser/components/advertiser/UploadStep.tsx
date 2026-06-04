import React, { useRef } from 'react';
import { CloudUpload, ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface UploadStepProps {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  onPrev: () => void;
  isLoading: boolean;
}

export default function UploadStep({ formData, setFormData, onSubmit, onPrev, isLoading }: UploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, file });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-2xl mx-auto bg-slate-900/60 backdrop-blur-3xl border border-slate-800 p-10 rounded-[3rem] shadow-2xl space-y-8"
    >
      <div className="flex items-center gap-3">
        <CloudUpload className="w-5 h-5 text-[#fad400]" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Sube tu <span className="text-[#fad400]">Contenido</span></h2>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        className="bg-black/40 border border-slate-800 rounded-[2rem] p-10 flex flex-col items-center justify-center cursor-pointer hover:border-[#fad400]/30 transition-all group min-h-[180px]"
      >
        <CloudUpload className="w-8 h-8 text-slate-500 group-hover:text-[#fad400] transition-colors mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">
          {formData.file ? formData.file.name : 'Selecciona tu video o imagen'}
        </p>
        <p className="text-[8px] text-slate-700 uppercase tracking-widest mt-2">MP4, JPG, PNG — Max 50MB</p>
        <input ref={inputRef} type="file" accept="video/*,image/*" onChange={handleFileChange} className="hidden" />
      </div>

      <div className="flex gap-4 pt-4">
        <button onClick={onPrev} className="flex-1 py-4 bg-white/5 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all border border-slate-800" disabled={isLoading}>
          <ArrowLeft className="w-4 h-4 inline mr-2" /> Atrás
        </button>
        <button onClick={onSubmit} disabled={isLoading} className="flex-1 py-4 bg-[#fad400] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-[#fad400]/10 disabled:opacity-50">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Enviar Registro'}
        </button>
      </div>
    </motion.div>
  );
}