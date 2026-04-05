import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createCampaign } from '@/services/api';
import { ArrowLeft, Save, Megaphone, Activity, Info, Zap, Calendar, Target, ShieldCheck, RefreshCcw, Globe, Radio, MapPin } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

export default function NewCampaignPage() {
  const router = useRouter();
  const [advertisers, setAdvertisers] = useState<{ id: string; companyName: string }[]>([]);
  const [form, setForm] = useState({
    name: '',
    advertiser: '',
    advertiser_id: '',
    start_date: '',
    end_date: '',
    target_impressions: 1000,
    active: true,
    category: 'General',
    target_city: 'Global',
    whatsapp: '',
    instagram: '',
    facebook: '',
    websiteUrl: '',
    pedidosYaUrl: '',
    uberEatsUrl: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar Catálogo de Anunciantes/Marcas
    const { getAdvertisers } = require('@/services/api');
    getAdvertisers()
      .then((data: any) => {
        if (Array.isArray(data)) setAdvertisers(data);
      })
      .catch(console.error);

    if (router.isReady && router.query.advertiser) {
      setForm(prev => ({
        ...prev,
        advertiser: router.query.advertiser as string,
        advertiser_id: (router.query.advertiserId as string) || ''
      }));
    }
  }, [router.isReady, router.query.advertiser, router.query.advertiserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.advertiser_id && advertisers.length > 0) {
      alert('POR_FAVOR: Selecciona una marca válida del catálogo.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : '',
        end_date: form.end_date ? new Date(form.end_date).toISOString() : ''
      };
      await createCampaign(payload);
      router.push('/campaigns');
    } catch (err) {
      console.error(err);
      alert('FALLA_DE_PROTOCOLO: Revisa la consola para detalles técnicos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-12 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 pt-6">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-tad-yellow/[0.04] blur-[150px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[0%] right-[-5%] w-[40%] h-[40%] bg-white/[0.01] blur-[120px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Nexus */}
        <div className="flex items-center justify-between">
          <Link href="/campaigns" className="bg-gray-900 border border-gray-700 px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:border-gray-500 transition-all flex items-center gap-2 shadow-sm">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Cerrar Terminal</span>
          </Link>
          <div className="flex items-center gap-3 bg-gray-800/40 backdrop-blur-xl p-1.5 rounded-xl border border-gray-700/50 pl-4 pr-1.5 shadow-sm">
               <div className="w-2 h-2 rounded-full bg-tad-yellow shadow-[0_0_8px_rgba(255,212,0,0.8)] animate-pulse" />
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pr-3">Injection Protocol 4.2</p>
          </div>
        </div>

        {/* Form Core Terminal */}
        <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden shadow-lg relative animate-in slide-in-from-bottom-10 duration-1000 fill-mode-both">
          <div className="absolute top-0 right-0 w-64 h-64 bg-tad-yellow/[0.03] blur-[80px] -z-10" />
          
          <div className="p-8 border-b border-gray-700/50 bg-gray-900/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-tad-yellow rounded-2xl flex items-center justify-center shadow-md shrink-0">
                <Megaphone className="w-8 h-8 text-black" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none mb-1">
                  Nueva <span className="text-tad-yellow">Campaña</span>
                </h1>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Inyección de contenedor DOOH</p>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-1 text-right">
               <ShieldCheck className="w-6 h-6 text-gray-500" />
               <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">SECURED_API</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="group/field relative">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block group-focus-within/field:text-tad-yellow transition-colors ml-2">Nombre del Proyecto</label>
                  <div className="relative">
                    <Radio className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within/field:text-tad-yellow transition-all" />
                    <input 
                      required
                      type="text" 
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value.toUpperCase()})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white text-sm font-bold focus:border-tad-yellow outline-none transition-all placeholder:text-gray-600 uppercase shadow-sm"
                      placeholder="EJ. CAMPAÑA_VERANO_V4"
                    />
                  </div>
                </div>

                <div className="group/field relative">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block group-focus-within/field:text-tad-yellow transition-colors ml-2">Marca / Anunciante Principal</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within/field:text-tad-yellow transition-all" />
                    <select 
                      required
                      value={form.advertiser_id}
                      onChange={e => {
                        const selected = advertisers.find(a => a.id === e.target.value);
                        setForm({
                           ...form, 
                           advertiser_id: e.target.value,
                           advertiser: selected?.companyName || '' 
                        });
                      }}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white text-sm font-bold focus:border-tad-yellow outline-none transition-all appearance-none shadow-sm"
                    >
                      <option value="">Selecciona una Marca...</option>
                      {advertisers.map(a => (
                        <option key={a.id} value={a.id}>{a.companyName.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="group/field relative">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block group-focus-within/field:text-tad-yellow transition-colors ml-2">Meta de Impactos</label>
                  <div className="relative">
                    <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within/field:text-tad-yellow transition-all" />
                    <input 
                      required
                      type="number" 
                      value={form.target_impressions}
                      onChange={e => setForm({...form, target_impressions: parseInt(e.target.value)})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white text-sm font-bold focus:border-tad-yellow outline-none transition-all placeholder:text-gray-600 shadow-sm"
                      placeholder="EJ. 500000"
                    />
                  </div>
                </div>

                <div className="group/field relative">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block group-focus-within/field:text-tad-yellow transition-colors ml-2">Categoría de Segmentación</label>
                  <div className="relative">
                    <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within/field:text-tad-yellow transition-all" />
                    <select 
                      title="Categoría de Segmentación"
                      value={form.category}
                      onChange={e => setForm({...form, category: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white text-sm font-bold focus:border-tad-yellow outline-none transition-all shadow-sm appearance-none"
                    >
                      <option value="General">GENERAL</option>
                      <option value="Restaurante">RESTAURANTE</option>
                      <option value="Entretenimiento">ENTRETENIMIENTO</option>
                      <option value="Salud">SALUD / BIENESTAR</option>
                      <option value="Servicios">SERVICIOS</option>
                      <option value="Retail">RETAIL / TIENDAS</option>
                    </select>
                  </div>
                </div>

                <div className="group/field relative">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block group-focus-within/field:text-tad-yellow transition-colors ml-2">Ciudad de Destino</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within/field:text-tad-yellow transition-all" />
                    <select 
                      title="Ciudad de Destino"
                      value={form.target_city}
                      onChange={e => setForm({...form, target_city: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white text-sm font-bold focus:border-tad-yellow outline-none transition-all shadow-sm appearance-none"
                    >
                      <option value="Global">GLOBAL_NET (Toda la red)</option>
                      <option value="Santo Domingo">SANTO DOMINGO</option>
                      <option value="Santiago">SANTIAGO</option>
                      <option value="Punta Cana">PUNTA CANA</option>
                      <option value="Puerto Plata">PUERTO PLATA</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group/field relative">
                    <label 
                      htmlFor="start_date"
                      className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block group-focus-within/field:text-tad-yellow transition-colors ml-2"
                    >
                      Inicio de Difusión
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within/field:text-tad-yellow transition-all z-10" />
                      <input 
                        id="start_date"
                        required
                        type="date" 
                        value={form.start_date}
                        onChange={e => setForm({...form, start_date: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white text-sm font-bold focus:border-tad-yellow outline-none transition-all [color-scheme:dark] shadow-sm" 
                        placeholder="AAAA-MM-DD"
                      />
                    </div>
                  </div>
                  <div className="group/field relative">
                    <label 
                      htmlFor="end_date"
                      className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block group-focus-within/field:text-tad-yellow transition-colors ml-2"
                    >
                      Término de Difusión
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within/field:text-tad-yellow transition-all z-10" />
                      <input 
                        id="end_date"
                        required
                        type="date" 
                        value={form.end_date}
                        onChange={e => setForm({...form, end_date: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white text-sm font-bold focus:border-tad-yellow outline-none transition-all [color-scheme:dark] shadow-sm" 
                        placeholder="AAAA-MM-DD"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900/50 border border-gray-700 p-6 rounded-2xl flex items-center justify-between group/toggle hover:border-tad-yellow/30 transition-all shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={clsx(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 border shadow-sm",
                      form.active ? "bg-tad-yellow/10 text-tad-yellow border-tad-yellow/30" : "bg-gray-800 border-gray-700 text-gray-500"
                    )}>
                      <Activity className={clsx("w-6 h-6", form.active && "animate-pulse")} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white uppercase tracking-tight mb-0.5">Autorizar Inyección</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Activar campaña de forma inmediata</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      id="active_toggle"
                      type="checkbox" 
                      checked={form.active}
                      onChange={e => setForm({...form, active: e.target.checked})}
                      className="sr-only peer" 
                      title="Autorizar Inyección"
                    />
                    <div className="w-14 h-7 bg-gray-800 border border-gray-700 rounded-full peer peer-checked:after:translate-x-7 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-gray-400 peer-checked:after:bg-black after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tad-yellow shadow-sm" />
                  </label>
                </div>

                <div className="p-4 bg-gray-900/30 rounded-xl border border-gray-700 flex gap-3 items-start">
                   <Info className="w-5 h-5 text-tad-yellow shrink-0 mt-0.5" />
                   <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider leading-relaxed">
                      Tras la autorización, este contenedor será verificado por el clúster central y estará disponible para recibir activos en el Vault Digital.
                   </p>
                </div>
              </div>
            </div>

            <div className="pt-10 flex flex-col items-center border-t border-gray-700/50">
            </div>

            {/* Ecosistema de Conversión (QR Hub) */}
            <div className="space-y-6 pt-6 border-t border-white/5">
               <div className="flex items-center gap-3 ml-2">
                 <Zap className="w-4 h-4 text-tad-yellow" />
                 <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Protocolo de Conversión (QR Hub)</h3>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/[0.02] p-8 rounded-3xl border border-white/5">
                  <div className="space-y-6">
                    <div className="group/field relative">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block group-focus-within/field:text-tad-yellow transition-colors ml-1">WhatsApp de Ventas</label>
                      <input 
                        type="text" 
                        value={form.whatsapp}
                        onChange={e => setForm({...form, whatsapp: e.target.value})}
                        className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white text-sm font-bold focus:border-tad-yellow outline-none transition-all placeholder:text-gray-800 shadow-sm"
                        placeholder="8091112222"
                      />
                    </div>
                    <div className="group/field relative">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block group-focus-within/field:text-tad-yellow transition-colors ml-1">Instagram (@usuario)</label>
                      <input 
                        type="text" 
                        value={form.instagram}
                        onChange={e => setForm({...form, instagram: e.target.value})}
                        className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white text-sm font-bold focus:border-tad-yellow outline-none transition-all placeholder:text-gray-800 shadow-sm"
                        placeholder="@marca"
                      />
                    </div>
                    <div className="group/field relative">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block group-focus-within/field:text-tad-yellow transition-colors ml-1">Sitio Web</label>
                      <input 
                        type="text" 
                        value={form.websiteUrl}
                        onChange={e => setForm({...form, websiteUrl: e.target.value})}
                        className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white text-sm font-bold focus:border-tad-yellow outline-none transition-all placeholder:text-gray-800 shadow-sm"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="group/field relative">
                      <label className="text-[10px] font-black text-red-500/50 uppercase tracking-widest mb-2 block group-focus-within/field:text-tad-yellow transition-colors ml-1">Pedidos Ya (Link)</label>
                      <input 
                        type="text" 
                        value={form.pedidosYaUrl}
                        onChange={e => setForm({...form, pedidosYaUrl: e.target.value})}
                        className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white text-sm font-bold focus:border-tad-yellow outline-none transition-all placeholder:text-gray-800 shadow-sm"
                        placeholder="https://pedidosya.com/..."
                      />
                    </div>
                    <div className="group/field relative">
                      <label className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mb-2 block group-focus-within/field:text-tad-yellow transition-colors ml-1">Uber Eats (Link)</label>
                      <input 
                        type="text" 
                        value={form.uberEatsUrl}
                        onChange={e => setForm({...form, uberEatsUrl: e.target.value})}
                        className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white text-sm font-bold focus:border-tad-yellow outline-none transition-all placeholder:text-gray-800 shadow-sm"
                        placeholder="https://ubereats.com/..."
                      />
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 mt-2">
                       <p className="text-[10px] font-bold text-zinc-500 uppercase leading-relaxed">
                         Estos enlaces aparecerán en el hub interactivo cuando el pasajero escanee el código QR de esta campaña.
                       </p>
                    </div>
                  </div>
               </div>
            </div>

            <div className="pt-10 flex flex-col items-center border-t border-gray-700/50">
               <button 
                type="submit" 
                disabled={loading}
                className="group relative w-full md:w-auto md:min-w-[350px] bg-tad-yellow hover:bg-yellow-400 text-black py-4 px-8 rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
              >
                {loading ? (
                   <RefreshCcw className="w-5 h-5 animate-spin" />
                ) : (
                   <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                )}
                
                <span className="text-sm font-black uppercase tracking-widest">{loading ? 'Estableciendo Enlace...' : 'Confirmar e Iniciar'}</span>
              </button>
              
              <p className="mt-6 text-[10px] font-bold text-gray-600 uppercase tracking-[0.4em] flex items-center gap-2">
                 <Zap className="w-3 h-3 text-tad-yellow" /> TAD_PROTOCOL_ACTIVE
              </p>
            </div>
          </form>
        </div>
      </div>

      <style jsx global>{`
        .text-shadow-glow {
          text-shadow: 0 0 40px rgba(250, 212, 0, 0.4);
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
           opacity: 0;
           position: absolute;
           right: 20px;
           width: 30px;
           height: 30px;
           z-index: 20;
           cursor: pointer;
        }
      `}</style>
    </div>
  );
}

