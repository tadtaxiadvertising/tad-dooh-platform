import React, { useState, useEffect } from 'react';
import { X, Building2, User, Mail, Phone, Upload, CheckCircle2, UserCheck } from 'lucide-react';
import { createAdvertiser, updateAdvertiser, getDrivers } from '../services/api';

interface AdvertiserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any;
}

export const AdvertiserModal: React.FC<AdvertiserModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [formData, setFormData] = useState({
    companyName: initialData?.companyName || '',
    contactName: initialData?.contactName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    whatsapp: initialData?.whatsapp || '',
    instagram: initialData?.instagram || '',
    facebook: initialData?.facebook || '',
    websiteUrl: initialData?.websiteUrl || '',
    pedidosYaUrl: initialData?.pedidosYaUrl || '',
    uberEatsUrl: initialData?.uberEatsUrl || '',
    category: initialData?.category || 'General',
    productsData: initialData?.productsData || '[]',
    status: initialData?.status || 'ACTIVE',
    referredBy: initialData?.referredBy || ''
  });

  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const data = await getDrivers();
        setDrivers(data || []);
      } catch (err) {
        console.error('Error fetching drivers for referral list');
      }
    };
    fetchDrivers();
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (initialData?.id) {
        await updateAdvertiser(initialData.id, formData);
      } else {
        await createAdvertiser(formData);
      }

      setSuccess(true);
      if (onSuccess) onSuccess();
      
      setTimeout(() => {
        setSuccess(false);
        if (!initialData) {
          setFormData({ 
            companyName: '', contactName: '', email: '', phone: '', 
            whatsapp: '', instagram: '', facebook: '', websiteUrl: '', 
            pedidosYaUrl: '', uberEatsUrl: '',
            category: 'General',
            productsData: '[]',
            status: 'ACTIVE',
            referredBy: ''
          });
        }
        onClose();
      }, 2000);
      
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error al guardar el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Building2 className="w-8 h-8 text-tad-yellow" />
            {initialData ? 'Editar Perfil QR' : 'Nuevo Anunciante'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl text-zinc-500 hover:text-white" title="Cerrar"><X className="w-6 h-6" /></button>
        </div>

        {/* Success / Form */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {success ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-6" />
              <h3 className="text-2xl font-black text-white mb-2 italic uppercase tracking-tighter">Sync Completado</h3>
              <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Datos guardados exitosamente.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-black">{error}</div>}

              {/* basic info */}
              <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 space-y-4">
                <p className="text-[10px] font-black text-tad-yellow uppercase tracking-[0.3em] mb-4">01. Identidad</p>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label htmlFor="companyName" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Empresa</label>
                      <input id="companyName" name="companyName" value={formData.companyName} onChange={handleChange} required className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
                   </div>
                   <div className="space-y-1">
                      <label htmlFor="contactName" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Contacto</label>
                      <input id="contactName" name="contactName" value={formData.contactName} onChange={handleChange} required className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label htmlFor="email" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Email</label>
                      <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
                   </div>
                   <div className="space-y-1">
                      <label htmlFor="password" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Contraseña (Acceso Portal)</label>
                      <input id="password" type="password" name="password" placeholder={initialData ? "Dejar vacío para no cambiar" : "Contraseña"} value={(formData as any).password || ''} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label htmlFor="phone" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Teléfono</label>
                      <input id="phone" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
                   </div>
                </div>
                <div className="space-y-1">
                   <label htmlFor="category" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Categoría / Segmento</label>
                   <select 
                     id="category" 
                     name="category" 
                     value={formData.category} 
                     onChange={handleChange} 
                     className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none"
                   >
                     <option value="General">General / Otros</option>
                     <option value="Gastronomía">Gastronomía & Restaurantes</option>
                     <option value="Retail">Retail & Tiendas</option>
                     <option value="Servicios">Servicios & Salud</option>
                     <option value="Entretenimiento">Entretenimiento & Eventos</option>
                     <option value="Transporte">Transporte & Logística</option>
                   </select>
                </div>
                <div className="space-y-1">
                   <label htmlFor="referredBy" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <UserCheck className="w-3 h-3 text-tad-yellow" /> Referido por (TAD DRIVER)
                   </label>
                   <select 
                     id="referredBy" 
                     name="referredBy" 
                     value={formData.referredBy} 
                     onChange={handleChange} 
                     className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none"
                   >
                     <option value="">-- Sin Referido / Directo --</option>
                     {drivers.map(d => (
                       <option key={d.id} value={d.id}>{d.fullName} ({d.taxiPlate || d.phone})</option>
                     ))}
                   </select>
                </div>
              </div>

              {/* Social Channels */}
              <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 space-y-4">
                <p className="text-[10px] font-black text-tad-yellow uppercase tracking-[0.3em] mb-4">02. Canales QR</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="whatsapp" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">WhatsApp</label>
                    <input id="whatsapp" type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="Ej: 18092201111" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="instagram" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Instagram</label>
                    <input id="instagram" name="instagram" value={formData.instagram} onChange={handleChange} placeholder="@username" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="websiteUrl" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sitio Web</label>
                  <input id="websiteUrl" name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} placeholder="https://..." className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="pedidosYaUrl" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pedidos Ya (URL)</label>
                    <input id="pedidosYaUrl" name="pedidosYaUrl" value={formData.pedidosYaUrl} onChange={handleChange} placeholder="https://..." className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="uberEatsUrl" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Uber Eats (URL)</label>
                    <input id="uberEatsUrl" name="uberEatsUrl" value={formData.uberEatsUrl} onChange={handleChange} placeholder="https://..." className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono" />
                  </div>
                </div>
              </div>

              {/* Products JSON */}
              <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 space-y-2">
                <p className="text-[10px] font-black text-tad-yellow uppercase tracking-[0.3em] mb-4">03. Productos (JSON)</p>
                <textarea 
                  id="productsData"
                  name="productsData" 
                  value={formData.productsData} 
                  onChange={handleChange} 
                  rows={4}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono"
                  placeholder='[{"name": "X", "price": 0, "img": ""}]'
                />
              </div>

              <div className="pt-4">
                <button type="submit" disabled={loading} className="w-full bg-tad-yellow hover:bg-yellow-400 text-black font-black uppercase py-5 rounded-2xl flex items-center justify-center gap-3 transition-all">
                  {loading ? 'Guardando...' : <><Upload className="w-5 h-5" /> {initialData ? 'Actualizar Perfil' : 'Crear Cuenta'}</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
