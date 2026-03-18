import { useState } from 'react';
import { useRouter } from 'next/router';
import { createCampaign } from '../../services/api';
import { ArrowLeft, Save, Megaphone, Activity, Info, Zap, Calendar, Target, ShieldCheck, RefreshCcw, Globe, Radio } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

export default function NewCampaignPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    advertiser: '',
    start_date: '',
    end_date: '',
    target_impressions: 1000,
    active: true
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="min-h-screen pb-20 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-15%] left-[-10%] w-[65%] h-[65%] bg-tad-yellow/[0.04] blur-[180px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[5%] right-[-10%] w-[55%] h-[55%] bg-white/[0.01] blur-[160px] rounded-full" />
      </div>

      <div className="max-w-5xl mx-auto space-y-12">
        {/* Navigation Nexus */}
        <div className="flex items-center justify-between">
          <Link href="/campaigns" className="btn-pill px-8 border border-white/5 text-zinc-500 hover:text-white flex items-center gap-4">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest italic">Close_Terminal</span>
          </Link>
          <div className="flex items-center gap-4 bg-zinc-900/10 backdrop-blur-3xl p-1.5 rounded-full border border-white/5 pl-6 pr-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow shadow-[0_0_8px_rgba(255,212,0,0.8)] animate-pulse" />
               <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] italic leading-none pr-4">Injection Protocol v4.2</p>
          </div>
        </div>

        {/* Form Core Terminal */}
        <div className="bg-zinc-950/80 backdrop-blur-3xl border border-white/10 rounded-[4rem] overflow-hidden shadow-3xl relative animate-in slide-in-from-bottom-10 duration-1000 fill-mode-both">
          <div className="absolute top-0 right-0 w-96 h-96 bg-tad-yellow/[0.03] blur-[120px] -z-10" />
          
          <div className="p-12 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-10">
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 bg-tad-yellow rounded-3xl flex items-center justify-center shadow-[0_20px_40px_rgba(255,212,0,0.2)]">
                <Megaphone className="w-10 h-10 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none mb-3 font-display">
                  New <span className="text-tad-yellow italic">Campaign</span>
                </h1>
                <p className="text-zinc-600 text-[11px] font-black uppercase tracking-[0.3em] italic">High-Fidelity DOOH Container Injection</p>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2 text-right">
               <ShieldCheck className="w-8 h-8 text-zinc-800" />
               <p className="text-[9px] font-black text-zinc-800 uppercase tracking-[0.5em] italic">SECURED_API_HANDSHAKE</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-12 space-y-12">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
              <div className="space-y-10">
                <div className="group/field relative">
                  <label className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-4 block group-focus-within/field:text-tad-yellow transition-colors italic ml-6">Comercial Project Name</label>
                  <div className="relative">
                    <Radio className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-800 group-focus-within/field:text-tad-yellow/60 transition-all" />
                    <input 
                      required
                      type="text" 
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value.toUpperCase()})}
                      className="w-full bg-black/40 border border-white/5 rounded-full py-6 pl-16 pr-8 text-white text-sm font-black italic tracking-tight focus:border-tad-yellow/40 outline-none transition-all placeholder:text-zinc-900 uppercase"
                      placeholder="EX. REGIONAL_DISPATCH_NORTH_V4"
                    />
                  </div>
                </div>

                <div className="group/field relative">
                  <label className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-4 block group-focus-within/field:text-tad-yellow transition-colors italic ml-6">Advertiser Brand Matrix</label>
                  <div className="relative">
                    <Globe className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-800 group-focus-within/field:text-tad-yellow/60 transition-all" />
                    <input 
                      required
                      type="text" 
                      value={form.advertiser}
                      onChange={e => setForm({...form, advertiser: e.target.value})}
                      className="w-full bg-black/40 border border-white/5 rounded-full py-6 pl-16 pr-8 text-white text-sm font-black italic tracking-tight focus:border-tad-yellow/40 outline-none transition-all placeholder:text-zinc-900"
                      placeholder="EX. COCA-COLA DOMINICANA"
                    />
                  </div>
                </div>

                <div className="group/field relative">
                  <label className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-4 block group-focus-within/field:text-tad-yellow transition-colors italic ml-6">Impact Target (Impressions)</label>
                  <div className="relative">
                    <Target className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-800 group-focus-within/field:text-tad-yellow/60 transition-all" />
                    <input 
                      required
                      type="number" 
                      value={form.target_impressions}
                      onChange={e => setForm({...form, target_impressions: parseInt(e.target.value)})}
                      className="w-full bg-black/40 border border-white/5 rounded-full py-6 pl-16 pr-8 text-white text-sm font-black italic tracking-tight focus:border-tad-yellow/40 outline-none transition-all placeholder:text-zinc-900"
                      placeholder="EX. 500000"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="group/field relative">
                    <label className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-4 block group-focus-within/field:text-tad-yellow transition-colors italic ml-2">Sincronización Inicial</label>
                    <div className="relative">
                      <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-800 group-focus-within/field:text-tad-yellow/60 transition-all z-10" />
                      <input 
                        required
                        type="date" 
                        value={form.start_date}
                        onChange={e => setForm({...form, start_date: e.target.value})}
                        title="Fecha de inicio de la pauta"
                        placeholder="AAAA-MM-DD"
                        className="w-full bg-black/60 border border-white/5 rounded-[1.5rem] py-6 pl-16 pr-6 text-white text-sm font-black italic tracking-tighter focus:border-tad-yellow/40 outline-none transition-all [color-scheme:dark] group-hover/field:bg-zinc-950 transition-colors" 
                      />
                    </div>
                  </div>
                  <div className="group/field relative">
                    <label className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-4 block group-focus-within/field:text-tad-yellow transition-colors italic ml-2">Término de Difusión</label>
                    <div className="relative">
                      <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-800 group-focus-within/field:text-tad-yellow/60 transition-all z-10" />
                      <input 
                        required
                        type="date" 
                        value={form.end_date}
                        onChange={e => setForm({...form, end_date: e.target.value})}
                        title="Fecha de finalización de la pauta"
                        placeholder="AAAA-MM-DD"
                        className="w-full bg-black/60 border border-white/5 rounded-[1.5rem] py-6 pl-16 pr-6 text-white text-sm font-black italic tracking-tighter focus:border-tad-yellow/40 outline-none transition-all [color-scheme:dark] group-hover/field:bg-zinc-950 transition-colors" 
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[3rem] flex items-center justify-between group/toggle hover:border-tad-yellow/20 transition-all shadow-2xl">
                  <div className="flex items-center gap-6">
                    <div className={clsx(
                      "w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-700 border border-white/5 shadow-3xl",
                      form.active ? "bg-tad-yellow/10 text-tad-yellow border-tad-yellow/20 shadow-tad-yellow/5" : "bg-black/40 text-zinc-800"
                    )}>
                      <Activity className={clsx("w-8 h-8", form.active && "animate-pulse")} />
                    </div>
                    <div>
                      <p className="text-xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">Canal Operativo</p>
                      <p className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.3em] font-display italic">Autorizar Inyección Inmediata</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.active}
                      onChange={e => setForm({...form, active: e.target.checked})}
                      title="Activar campaña inmediatamente"
                      className="sr-only peer" 
                    />
                    <div className="w-20 h-10 bg-zinc-900 border border-white/10 rounded-full peer peer-checked:after:translate-x-10 peer-checked:after:bg-black after:content-[''] after:absolute after:top-1.5 after:left-1.5 after:bg-zinc-700 after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-tad-yellow shadow-3xl"></div>
                  </label>
                </div>

                <div className="p-8 bg-zinc-950/40 rounded-[2.5rem] border border-white/5 flex gap-6 items-start">
                   <Info className="w-6 h-6 text-tad-yellow shrink-0 mt-1" />
                   <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide leading-relaxed italic">
                      Tras la autorización, este contenedor será verificado por el clúster central y estará disponible para recibir activos multimedia en el Vault Digital.
                   </p>
                </div>
              </div>
            </div>

            <div className="pt-16 flex flex-col items-center border-t border-white/5 translate-y-0">
               <button 
                type="submit" 
                disabled={loading}
                className="group relative w-full xl:w-auto min-w-[450px] bg-tad-yellow hover:bg-yellow-400 text-black py-10 px-12 rounded-[2.5rem] shadow-3xl shadow-tad-yellow/20 transition-all active:scale-95 flex flex-col items-center justify-center gap-4 overflow-hidden"
              >
                <div className="absolute top-0 right-[-10%] w-32 h-32 bg-white/10 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-1000" />
                
                {loading ? (
                   <RefreshCcw className="w-10 h-10 animate-spin" />
                ) : (
                   <Save className="w-10 h-10 group-hover:scale-110 transition-transform duration-700" />
                )}
                
                <div className="flex flex-col items-center">
                   <span className="text-[11px] font-black uppercase tracking-[0.5em] italic mb-1 opacity-60">Handshake de Autorización</span>
                   <span className="text-xl font-black uppercase tracking-widest italic">{loading ? 'Estableciendo Enlace...' : 'Confirmar e Iniciar Campaña'}</span>
                </div>
              </button>
              
              <p className="mt-10 text-[10px] font-black text-zinc-800 uppercase tracking-[0.8em] italic leading-none flex items-center gap-4">
                 <Zap className="w-4 h-4 text-tad-yellow shadow-[0_0_10px_#fad400]" /> TADCORE_PROTOCOL_ACTIVE_v4.2
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
