import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Map, ArrowRight, Eye, MousePointerClick, UploadCloud, Users, Share2, CheckCircle2, DollarSign, Calculator, Megaphone, Briefcase, Zap } from 'lucide-react';
import clsx from 'clsx';
import { AntigravityButton } from '@tad/ui';

export default function AdvertiserOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [budget, setBudget] = useState(5000);
  const itbis = budget * 0.18;
  const totalWithTax = budget + itbis;
  const reach = Math.floor(budget * 1.8); // 1.8 impressions per peso roughly

  useEffect(() => { setMounted(true); }, []);

  const nextStep = () => setStep(s => Math.min(s + 1, 3));

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <Head>
        <title>Lanzamiento de Campaña | TAD</title>
      </Head>

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-tad-yellow/5 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4" />
      </div>

      <div className={clsx(
        "w-full max-w-4xl bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 lg:p-12 shadow-2xl transition-all duration-700 relative",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      )}>
        {/* Progress */}
        <div className="flex gap-2 mb-10">
           {[1, 2, 3].map(i => (
             <div key={i} className={clsx("h-1.5 rounded-full flex-1 transition-all duration-500", step >= i ? "bg-tad-yellow shadow-[0_0_10px_rgba(255,212,0,0.4)]" : "bg-white/10")} />
           ))}
        </div>

        {/* ─── Fase 1: Segmentación (Mapa y Pantallas Vivas) ─── */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right duration-500 space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 relative group">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Map className="w-10 h-10 text-blue-500 relative z-10" />
              </div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Dominio Territorial</h1>
              <p className="text-sm text-gray-400 font-medium">Segmentación dinámica vía <b>Real-Time Sync</b>. Tu marca donde está la gente.</p>
            </div>

            {/* Mockup Heatmap o Mapa visual */}
            <div className="w-full h-64 bg-zinc-950 rounded-[2.5rem] border border-white/5 relative overflow-hidden group/map cursor-crosshair">
               <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')]" />
               
               {/* Simulación de Coordenadas y Heatmap */}
               <div className="absolute w-40 h-40 bg-rose-500/20 blur-[50px] rounded-full top-4 left-10 animate-pulse" />
               <div className="absolute w-32 h-32 bg-tad-yellow/20 blur-[40px] rounded-full bottom-4 right-20 animate-pulse delay-700" />
               
               {/* Floating Markers */}
               <div className="absolute top-1/4 left-1/3 animate-bounce delay-100">
                  <div className="w-3 h-3 bg-tad-yellow rounded-full shadow-[0_0_10px_#FFD400]" />
                  <div className="absolute top-4 left-0 bg-black/80 px-2 py-1 rounded border border-white/10 text-[8px] text-white font-mono whitespace-nowrap">STI_HUB_01</div>
               </div>
               <div className="absolute bottom-1/3 right-1/4 animate-bounce delay-500">
                  <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
                  <div className="absolute top-4 left-0 bg-black/80 px-2 py-1 rounded border border-white/10 text-[8px] text-white font-mono whitespace-nowrap">SDQ_ZONE_04</div>
               </div>

               <div className="absolute top-4 right-4 z-10">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 px-4 py-2 bg-black/60 rounded-full border border-emerald-500/20 backdrop-blur-md flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Telemetría Gateways 4G
                  </span>
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Santiago (STI)', icon: <Briefcase className="w-5 h-5"/>, active: true },
                { label: 'Santo Domingo', icon: <Users className="w-5 h-5"/>, active: false },
                { label: 'Zonas VIP', icon: <Map className="w-5 h-5"/>, active: true },
                { label: 'Rutas Nocturnas', icon: <MousePointerClick className="w-5 h-5"/>, active: false }
              ].map((zone, i) => (
                <button key={i} className={clsx(
                  "p-5 rounded-3xl border flex flex-col items-center gap-4 transition-all duration-500",
                  zone.active ? "bg-tad-yellow/10 border-tad-yellow text-tad-yellow shadow-[0_20px_40px_rgba(255,212,0,0.1)] scale-105" : "bg-black/40 border-white/5 text-gray-500 hover:text-white"
                )}>
                  {zone.icon}
                  <span className="text-[10px] font-black uppercase tracking-widest">{zone.label}</span>
                </button>
              ))}
            </div>

            <AntigravityButton actionName="next_step" variant="primary" onClick={nextStep} className="w-full h-16">
               Definir Inversión y Multimedia <ArrowRight className="w-5 h-5 ml-2" />
            </AntigravityButton>
          </div>
        )}

        {/* ─── Fase 2: CPM y Facturación Transparente ─── */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right duration-500 space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 group">
                <Calculator className="w-10 h-10 text-emerald-500 group-hover:rotate-12 transition-transform" />
              </div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Presupuesto & Impuestos</h1>
              <p className="text-sm text-gray-400 font-medium">Facturación basada en <b>Playback Complete</b>. Solo pagas lo que se ve.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-zinc-950 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                  <div>
                    <h3 className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-6">Presupuesto de Campaña (RD$)</h3>
                    <input type="range" min="1000" max="50000" step="1000" value={budget} onChange={e => setBudget(Number(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-tad-yellow" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[11px] font-black uppercase text-zinc-500 tracking-widest">
                       <span>Subtotal</span>
                       <span className="text-white">RD${budget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-black uppercase text-zinc-500 tracking-widest">
                       <span>ITBIS (18%)</span>
                       <span className="text-rose-400">RD${itbis.toLocaleString()}</span>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                       <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Total Facturado</p>
                       <span className="text-4xl font-black text-white tracking-tighter">RD${totalWithTax.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-white/5 flex items-center gap-3">
                     <Zap className="w-5 h-5 text-tad-yellow" />
                     <p className="text-[10px] text-zinc-400 font-medium leading-relaxed uppercase tracking-wider">
                       Impacto estimado: <span className="text-white font-black">{reach.toLocaleString()}</span> visualizaciones únicas verificadas.
                     </p>
                  </div>
               </div>

               <div className="bg-black/60 border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-center items-center text-center gap-6 relative group cursor-pointer hover:bg-black transition-colors">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-tad-yellow/40 transition-colors">
                    <UploadCloud className="w-8 h-8 text-zinc-600 group-hover:text-tad-yellow group-hover:scale-110 transition-all" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Cargar Arte (MP4/JPG/PNG)</h3>
                    <p className="text-[10px] text-zinc-500 mt-3 leading-relaxed">Solo archivos optimizados para <b>STI Hardware</b>.<br/>Resolución máxima permitida: 1080p.</p>
                  </div>
                  <div className="flex gap-2">
                     {["16:9", "FullHD", "Smart-Fit"].map(tag => (
                       <span key={tag} className="text-[8px] bg-white/5 text-zinc-500 px-2 py-1 rounded border border-white/5 font-black uppercase">{tag}</span>
                     ))}
                  </div>
               </div>
            </div>

            <AntigravityButton actionName="next_step" variant="primary" onClick={nextStep} className="w-full h-16">
               Publicar Campaña en la Flota <ArrowRight className="w-5 h-5 ml-2" />
            </AntigravityButton>
          </div>
        )}

        {/* ─── Fase 3: Dashboard de Transparencia & Loop de Crecimiento ─── */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right duration-500 space-y-8">
            <div className="text-center">
              <div className="w-24 h-24 bg-tad-yellow/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 relative group">
                 <div className="absolute inset-0 bg-tad-yellow/20 rounded-full blur-3xl animate-pulse" />
                 <CheckCircle2 className="w-12 h-12 text-tad-yellow relative z-10" />
              </div>
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 text-shadow-glow">
                Campaña Sincronizada
              </h1>
              <p className="text-sm text-zinc-400 font-medium uppercase tracking-widest">Tu marca ya está recorriendo la ciudad.</p>
            </div>

            <div className="bg-zinc-950 rounded-[2rem] border border-white/5 p-6 overflow-hidden relative group shadow-2xl">
               <div className="flex items-center gap-6 relative z-10">
                 <div className="w-24 h-24 bg-black rounded-xl border border-white/5 overflow-hidden flex items-center justify-center relative">
                    <Megaphone className="w-8 h-8 text-zinc-800 rotate-12" />
                    {/* Simulated Live Feed line */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-tad-yellow shadow-[0_0_10px_#FFD400] animate-pulse" />
                 </div>
                 <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Feed Directo STI_009</span>
                    </div>
                    <p className="text-white font-black text-sm uppercase mb-1">Campaña Activa: Dominio Local</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Prueba de vida verificada vía Nexus</p>
                 </div>
               </div>
               {/* Background Scan Effect */}
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[2000ms] pointer-events-none" />
            </div>

            <div className="bg-blue-600/10 border border-blue-500/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
               <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full" />
               <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20 group-hover:rotate-6 transition-transform">
                  <Share2 className="w-8 h-8 text-blue-400" />
               </div>
               <div className="text-center md:text-left">
                 <h4 className="text-white font-black uppercase tracking-tight text-lg mb-1">Expandir mi Red</h4>
                 <p className="text-xs text-zinc-400">Refiere a un socio comercial y ambos recibirán <span className="text-blue-400 font-black">RD$2,000 en créditos</span> publicitarios.</p>
               </div>
               <button className="px-8 py-3 bg-blue-600 hover:bg-white hover:text-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl active:scale-95 md:ml-auto">
                 Copiar Código
               </button>
            </div>
            
            <div className="pt-4">
              <AntigravityButton actionName="finish_onboarding" variant="primary" onClick={() => router.push('/advertiser/dashboard')} className="w-full h-16">
                 IR A MI DASHBOARD DE MÉTRICAS <ArrowRight className="w-5 h-5 ml-2" />
              </AntigravityButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
