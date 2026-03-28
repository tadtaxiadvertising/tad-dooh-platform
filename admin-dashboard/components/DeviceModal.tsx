import React, { useState, useEffect, useCallback } from 'react';
import { Tablet, X, Check, AlertCircle, Save, Trash2, MapPin, Hash, User } from 'lucide-react';
import { createDevice, updateDevice, deleteDevice } from '../services/api';

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  device?: { id?: string; device_id?: string; deviceId?: string; taxi_number?: string; taxiNumber?: string; city?: string; status?: string } | null;
}

const DeviceModal = React.memo(function DeviceModal({ isOpen, onClose, onSuccess, device }: DeviceModalProps) {
  const [formData, setFormData] = useState({
    deviceId: '',
    taxiNumber: '',
    city: 'Santiago',
    status: 'ACTIVE',
    driverId: ''
  });

  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDrivers = useCallback(async () => {
    try {
      const { getDrivers } = await import('../services/api');
      const data = await getDrivers();
      setDrivers(data || []);
    } catch (err) {}
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (device) {
        setFormData({
          deviceId: device.device_id || device.deviceId || '',
          taxiNumber: device.taxi_number || device.taxiNumber || '',
          city: device.city || 'Santiago',
          status: device.status === 'online' ? 'ACTIVE' : (device.status || 'ACTIVE'),
          driverId: (device as any).driverId || (device as any).driver?.id || ''
        });
      } else {
        setFormData({
          deviceId: '',
          taxiNumber: '',
          city: 'Santiago',
          status: 'ACTIVE',
          driverId: ''
        });
      }
      loadDrivers();
      setError(null);
    }
  }, [device, isOpen, loadDrivers]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (device) {
        const id = device.id || device.device_id || ''; 
        if (!id) throw new Error('Identificador de dispositivo no encontrado');
        await updateDevice(id, formData);
      } else {
        await createDevice(formData);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err 
        ? (err as { response: { data: { message: string } } }).response.data.message 
        : (err instanceof Error ? err.message : 'Error al procesar la solicitud');
      setError(errorMessage || 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!device) return;
    if (!window.confirm('¿Estás seguro de eliminar este dispositivo? Se perderán todos los vínculos con conductores y campañas.')) return;

    setLoading(true);
    try {
      const id = device.id || device.device_id || '';
      if (!id) throw new Error('ID no encontrado');
      await deleteDevice(id);
      onSuccess();
      onClose();
    } catch {
      setError('No se pudo eliminar el dispositivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-tad-yellow/5">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-tad-yellow/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-tad-yellow flex items-center justify-center shadow-lg shadow-tad-yellow/20">
              <Tablet className="text-black w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{device ? 'Editar Pantalla' : 'Registrar Pantalla'}</h2>
              <p className="text-[10px] text-tad-yellow font-bold uppercase tracking-widest">Inventario de Hardware</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-white transition-colors"
            title="Cerrar modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Hardware ID */}
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2 px-1">
                ID Tablet (Hardware)
              </label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="text"
                  disabled={!!device}
                  required
                  placeholder="Ej: TADSTI-001"
                  className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 outline-none focus:border-tad-yellow transition-all disabled:opacity-50 text-sm"
                  value={formData.deviceId}
                  onChange={e => setFormData({ ...formData, deviceId: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            {/* Taxi Number */}
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2 px-1">
                Número de Taxi / Placa
              </label>
              <div className="relative">
                <Check className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="text"
                  placeholder="Ej: T-123"
                  className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 outline-none focus:border-tad-yellow transition-all text-sm"
                  value={formData.taxiNumber}
                  onChange={e => setFormData({ ...formData, taxiNumber: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            {/* City */}
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2 px-1">
                Ciudad / Ubicación
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <select
                  title="Seleccionar ciudad"
                  aria-label="Seleccionar ciudad"
                  className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-tad-yellow transition-all appearance-none cursor-pointer text-sm"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                >
                  <option value="Santo Domingo">Santo Domingo</option>
                  <option value="Santiago">Santiago</option>
                  <option value="Punta Cana">Punta Cana</option>
                  <option value="Puerto Plata">Puerto Plata</option>
                </select>
              </div>
            </div>

            {/* Driver Assignment */}
            <div className="pt-2">
              <label className="text-[10px] font-black text-tad-yellow uppercase tracking-widest block mb-2 px-1">
                Asignar Conductor (OPCIONAL)
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-tad-yellow/40" />
                <select
                  title="Asignar conductor"
                  aria-label="Asignar conductor"
                  className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-tad-yellow transition-all appearance-none cursor-pointer text-sm"
                  value={formData.driverId}
                  onChange={e => setFormData({ ...formData, driverId: e.target.value })}
                >
                  <option value="">-- Sin conductor asignado --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} {d.taxiNumber ? `(${d.taxiNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            {device && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                title="Eliminar dispositivo"
                aria-label="Eliminar dispositivo"
                className="flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-4 px-6 rounded-2xl border border-red-500/20 transition-all active:scale-95"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex gap-2 items-center justify-center bg-tad-yellow hover:bg-tad-yellow/90 text-black font-black py-4 px-6 rounded-2xl transition-all active:scale-95 shadow-xl shadow-tad-yellow/10"
            >
              <Save className="h-5 w-5" />
              {loading ? 'Procesando...' : (device ? 'Guardar Cambios' : 'Registrar Pantalla')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default DeviceModal;
