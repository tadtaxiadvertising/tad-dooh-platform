import React from 'react';
import { X, Monitor } from 'lucide-react';

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  device?: { device_id?: string; deviceId?: string } | null;
}

export default function DeviceModal({ isOpen, onClose, onSuccess, device }: DeviceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
      <div className="bg-zinc-900 border border-white/5 rounded-[2rem] w-full max-w-xl p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-[#fad400]" />
            <h2 className="text-xl font-black uppercase tracking-tight text-white">
              {device ? 'Editar Dispositivo' : 'Nuevo Dispositivo'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
          Device management modal pending implementation
        </p>
        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 py-4 bg-white/5 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all border border-white/5">
            Cancelar
          </button>
          <button onClick={() => { onSuccess(); onClose(); }} className="flex-1 py-4 bg-[#fad400] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-[#fad400]/10">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}