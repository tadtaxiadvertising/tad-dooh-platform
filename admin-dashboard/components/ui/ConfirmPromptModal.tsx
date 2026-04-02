import React, { useState } from 'react';
import { AntigravityButton } from './AntigravityButton';
import { X, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface ConfirmPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => Promise<void>;
  title: string;
  description: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  type?: 'text' | 'email';
}

export const ConfirmPromptModal: React.FC<ConfirmPromptModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  placeholder = 'Ingrese valor...',
  defaultValue = '',
  confirmText = 'Confirmar',
  type = 'text'
}) => {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!value && type === 'text') {
      setError('Este campo es obligatorio.');
      return;
    }
    if (type === 'email' && !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) {
       setError('Ingrese un email válido.');
       return;
    }
    setError(null);
    try {
      await onConfirm(value);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error en la operación.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="relative bg-[#111317] border border-white/10 rounded-[32px] p-8 w-full max-w-md shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-tad-yellow/5 blur-[50px] -mr-16 -mt-16" />
        
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-tad-yellow/10 rounded-xl border border-tad-yellow/20 text-tad-yellow">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
             </div>
             <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest leading-loose mb-8">
          {description}
        </p>

        <div className="space-y-6 mb-10">
          <div className="space-y-3">
            <input 
              type={type}
              autoFocus
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(null); }}
              placeholder={placeholder}
              className={clsx(
                "w-full bg-black/40 border rounded-2xl py-4 px-6 text-sm font-bold tracking-wider outline-none transition-all placeholder:text-zinc-700",
                error ? "border-rose-500/50 focus:border-rose-500" : "border-white/5 focus:border-tad-yellow/30"
              )}
            />
            {error && <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest px-2 animate-bounce">{error}</p>}
          </div>
        </div>

        <div className="flex gap-4">
           <button 
             onClick={onClose}
             className="flex-1 py-4 bg-white/5 border border-white/10 text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
           >
             Cancelar
           </button>
           <AntigravityButton
             actionName="confirm_prompt_action"
             onAsyncClick={handleConfirm}
             className="flex-1 py-4"
           >
             {confirmText}
           </AntigravityButton>
        </div>
      </div>
    </div>
  );
};
