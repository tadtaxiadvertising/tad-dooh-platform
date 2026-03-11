import React, { useState } from 'react';
import { X, User, Phone, IdCard, CreditCard, Tablet, Hash } from 'lucide-react';
import { createDriver } from '../services/api';

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DriverModal({ isOpen, onClose, onSuccess }: DriverModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    cedula: '',
    taxiPlate: '',
    licensePlate: '',
    deviceId: '',
    subscriptionPaid: false,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createDriver(formData);
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        fullName: '',
        phone: '',
        cedula: '',
        taxiPlate: '',
        licensePlate: '',
        deviceId: '',
        subscriptionPaid: false,
      });
    } catch (err: any) {
      console.error('Error creating driver:', err);
      const message = err.response?.data?.message || 'Error al registrar el chofer. Verifique que el teléfono o cédula no estén duplicados.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-900/50">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <User className="w-5 h-5 text-tad-yellow" />
            Registrar Nuevo <span className="text-tad-yellow">Chofer</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Nombre Completo *</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  required
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  className="w-full bg-zinc-800 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-tad-yellow transition-colors"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">WhatsApp / Teléfono *</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  required
                  type="tel"
                  placeholder="Ej: 8091234567"
                  className="w-full bg-zinc-800 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-tad-yellow transition-colors"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Cédula</label>
              <div className="relative">
                <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="001-0000000-0"
                  className="w-full bg-zinc-800 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-tad-yellow transition-colors"
                  value={formData.cedula}
                  onChange={e => setFormData({ ...formData, cedula: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Placa Vehículo</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Ej: A123456"
                  className="w-full bg-zinc-800 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-tad-yellow transition-colors"
                  value={formData.taxiPlate}
                  onChange={e => setFormData({ ...formData, taxiPlate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">ID Tablet (Opcional)</label>
              <div className="relative">
                <Tablet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Ej: TAD-XXXXXX"
                  className="w-full bg-zinc-800 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-tad-yellow transition-colors"
                  value={formData.deviceId}
                  onChange={e => setFormData({ ...formData, deviceId: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, subscriptionPaid: !formData.subscriptionPaid })}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-bold text-xs uppercase tracking-wider ${
                  formData.subscriptionPaid 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-zinc-800 border-white/5 text-zinc-500'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                {formData.subscriptionPaid ? 'Pagado RD$6,000' : 'Pendiente Pago'}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-2xl transition-all"
            >
              Cancelar
            </button>
            <button
              disabled={loading}
              type="submit"
              className="flex-1 bg-tad-yellow hover:bg-yellow-400 text-black font-black py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(250,212,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registrando...' : 'Confirmar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
