import React, { useState } from 'react';
import { X, Building2, User, Mail, Phone, Upload, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { createAdvertiser } from '../services/api';

interface AdvertiserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdvertiserModal: React.FC<AdvertiserModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    status: 'ACTIVE'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createAdvertiser(formData);

      setSuccess(true);
      if (onSuccess) onSuccess();
      
      // Auto close after 2 seconds
      setTimeout(() => {
        setSuccess(false);
        setFormData({ companyName: '', contactName: '', email: '', phone: '', status: 'ACTIVE' });
        onClose();
      }, 2000);
      
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Error al conectar con el servidor.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Building2 className="w-8 h-8 text-tad-yellow" />
            Nuevo Anunciante
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
            title="Cerrar modal"
            aria-label="Cerrar modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">¡Marca Registrada!</h3>
            <p className="text-zinc-400 max-w-md">
              El perfil de &quot;{formData.companyName}&quot; ha sido creado. Ya puedes empezar a subir campañas para este anunciante.
            </p>
          </div>
        ) : (
          /* Form Setup */
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">
                Nombre de la Empresa / Marca
              </label>
              <div className="relative border border-white/10 rounded-2xl bg-black overflow-hidden focus-within:border-tad-yellow focus-within:ring-1 focus-within:ring-tad-yellow/20 transition-all">
                <div className="absolute top-0 bottom-0 left-4 flex items-center pointer-events-none">
                  <Building2 className="w-4 h-4 text-zinc-500" />
                </div>
                <input 
                  type="text" 
                  name="companyName"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Ej: Claro Dominicana" 
                  className="w-full bg-transparent text-white px-12 py-4 outline-none text-sm font-medium placeholder-zinc-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">
                Representante Contacto
              </label>
              <div className="relative border border-white/10 rounded-2xl bg-black overflow-hidden focus-within:border-tad-yellow focus-within:ring-1 focus-within:ring-tad-yellow/20 transition-all">
                <div className="absolute top-0 bottom-0 left-4 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-zinc-500" />
                </div>
                <input 
                  type="text" 
                  name="contactName"
                  required
                  value={formData.contactName}
                  onChange={handleChange}
                  placeholder="Ej: Juan Pérez" 
                  className="w-full bg-transparent text-white px-12 py-4 outline-none text-sm font-medium placeholder-zinc-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">
                  Correo Electrónico
                </label>
                <div className="relative border border-white/10 rounded-2xl bg-black overflow-hidden focus-within:border-tad-yellow focus-within:ring-1 focus-within:ring-tad-yellow/20 transition-all">
                  <div className="absolute top-0 bottom-0 left-4 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-zinc-500" />
                  </div>
                  <input 
                    type="email" 
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="marketing@claro.do" 
                    className="w-full bg-transparent text-white px-12 py-4 outline-none text-sm font-medium placeholder-zinc-700 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">
                  Teléfono
                </label>
                <div className="relative border border-white/10 rounded-2xl bg-black overflow-hidden focus-within:border-tad-yellow focus-within:ring-1 focus-within:ring-tad-yellow/20 transition-all">
                  <div className="absolute top-0 bottom-0 left-4 flex items-center pointer-events-none">
                    <Phone className="w-4 h-4 text-zinc-500" />
                  </div>
                  <input 
                    type="tel" 
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(809) 220-1111" 
                    className="w-full bg-transparent text-white px-12 py-4 outline-none text-sm font-medium placeholder-zinc-700 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit"
                disabled={loading}
                className={clsx(
                  "w-full flex items-center justify-center gap-3 bg-tad-yellow hover:bg-yellow-400 text-black font-extrabold py-4 px-6 rounded-2xl transition-all shadow-[0_0_20px_rgba(250,212,0,0.2)]",
                  loading ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Procesando...
                  </span>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Registrar Anunciante
                  </>
                )}
              </button>
            </div>
            
          </form>
        )}
      </div>
    </div>
  );
};
