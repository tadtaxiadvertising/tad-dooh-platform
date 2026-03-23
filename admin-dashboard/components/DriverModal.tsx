import React, { useState } from 'react';
import { X, User, Phone, IdCard, CreditCard, Tablet, Hash, CheckCircle2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { createDriver } from '../services/api';
import { notifyChange } from '../lib/sync-channel';

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DriverModal = React.memo(function DriverModal({ isOpen, onClose, onSuccess }: DriverModalProps) {
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
    deviceFound: null as boolean | null,
  });

  const checkDevice = async (id: string) => {
    if (!id) {
      setFormData(prev => ({ ...prev, deviceId: '', deviceFound: null }));
      return;
    }
    
    try {
      // Usamos getDevices para buscar si existe (Backend side check)
      const { getDevices } = await import('../services/api');
      const devices = await getDevices();
      const exists = devices.some((d: any) => (d.deviceId || d.device_id) === id);
      setFormData(prev => ({ ...prev, deviceId: id, deviceFound: exists }));
    } catch (e) {
      setFormData(prev => ({ ...prev, deviceId: id, deviceFound: null }));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.deviceId && formData.deviceFound === false) {
      setError('EL ID DE TABLET NO EXISTE EN EL INVENTARIO. REGÍSTRELO PRIMERO EN LA SECCIÓN DE DISPOSITIVOS.');
      setLoading(false);
      return;
    }

    try {
      await createDriver(formData);
      notifyChange('CONDUCTORES');
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
        deviceFound: null,
      });
    } catch (err: unknown) {
      console.error('Error creating driver:', err);
      const errorMsg = err instanceof Error && 'response' in err 
        ? (err as { response: { data: { message: string | string[] } } }).response.data.message 
        : (err instanceof Error ? err.message : 'Error al registrar el conductor. Verifique que el teléfono o cédula no estén duplicados.');
      setError(Array.isArray(errorMsg) ? errorMsg.join(', ') : (errorMsg || 'Error desconocido'));
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
            Registrar Nuevo <span className="text-tad-yellow">Conductor</span>
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-colors"
            title="Cerrar modal"
            aria-label="Cerrar modal"
          >
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
                  className={clsx(
                    "w-full bg-zinc-800 border rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none transition-colors",
                    formData.deviceFound === true ? "border-emerald-500/50" : 
                    formData.deviceFound === false ? "border-rose-500/50" : "border-white/5 focus:border-tad-yellow"
                  )}
                />
                {formData.deviceFound === true && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-in zoom-in" />}
                {formData.deviceFound === false && <AlertTriangle className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500 animate-in shake-x" />}
              </div>
              {formData.deviceFound === false && (
                <p className="text-[9px] text-rose-500 font-bold uppercase tracking-widest mt-1">Dispositivo no localizado en el cluster.</p>
              )}
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
});

export default DriverModal;
