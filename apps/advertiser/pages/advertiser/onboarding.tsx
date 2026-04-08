import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Map, ArrowRight, Eye, MousePointerClick, UploadCloud, Users, Share2, CheckCircle2, DollarSign, Calculator, Megaphone } from 'lucide-react';
import clsx from 'clsx';
import { AntigravityButton } from '@tad/ui';

export default function AdvertiserOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [budget, setBudget] = useState(1500);
  const reach = Math.floor(budget * 2.4); // Mock calculation: RD$1500 = 3600 impresiones

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
        "w-full max-w-3xl bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl transition-all duration-700 relative",
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
              <div className="w-20 h-20 bg-blue-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Map className="w-10 h-10 text-blue-500" />
              </div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Presencia en Toda la Ciudad</h1>
              <p className="text-sm text-gray-400 font-medium">Selecciona tu audiencia ideal en base a zonas de alto tráfico en RD.</p>
            </div>

            {/* Mockup Heatmap o Mapa visual */}
            <div className="w-full h-48 bg-zinc-950 rounded-3xl border border-white/5 relative overflow-hidden flex items-center justify-center">
               <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
               {/* Simulación de Heatmap */}
               <div className="absolute w-32 h-32 bg-rose-500/30 blur-[40px] rounded-full top-4 left-10 animate-pulse" />
               <div className="absolute w-24 h-24 bg-tad-yellow/30 blur-[30px] rounded-full bottom-4 right-20 animate-pulse delay-75" />
               <span className="relative z-10 text-white font-black uppercase tracking-[0.2em] text-xs px-4 py-2 bg-black/60 rounded-full border border-white/10">Heatmap Activo: Santiago</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Comercial', icon: <Briefcase/>, active: true },
                { label: 'Residencial', icon: <Users />, active: false },
                { label: 'Turística', icon: <Map />, active: true },
                { label: 'Estudiantil', icon: <MousePointerClick />, active: false }
              ].map((zone, i) => (
                <button key={i} className={clsx(
                  "p-4 rounded-3xl border flex flex-col items-center gap-3 transition-all",
                  zone.active ? "bg-tad-yellow/10 border-tad-yellow text-tad-yellow shadow-[0_0_15px_rgba(255,212,0,0.2)]" : "bg-black/40 border-white/5 text-gray-500 hover:text-white"
                )}>
                  {zone.icon}
                  <span className="text-[10px] font-black uppercase tracking-widest">{zone.label}</span>
                </button>
              ))}
            </div>

            <AntigravityButton actionName="next_step" variant="primary" onClick={nextStep} className="w-full">
               Continuar <ArrowRight className="w-5 h-5 ml-2" />
            </AntigravityButton>
          </div>
        )}

        {/* ─── Fase 2: Creación con Facilidad Cognitiva (CPM y Cropping) ─── */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right duration-500 space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Calculator className="w-10 h-10 text-emerald-500" />
              </div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Impacto Real. Sin Sorpresas.</h1>
              <p className="text-sm text-gray-400 font-medium">Configura tu inversión y sube tu arte. Nosotros lo optimizamos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-black/40 border border-white/5 rounded-3xl p-6">
                  <h3 className="text-xs text-white font-black uppercase tracking-widest mb-4">Inversión (RD$)</h3>
                  <input type="range" min="500" max="10000" step="500" value={budget} onChange={e => setBudget(Number(e.target.value))} className="w-full mb-4 accent-tad-yellow" />
                  <div className="flex justify-between items-end">
                    <span className="text-3xl font-black text-tad-yellow">RD${budget}</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Presupuesto</span>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-white/5">
                     <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                       Con RD${budget} llegarás a <span className="text-emerald-400 font-black">{reach.toLocaleString()} visualizaciones</span> reales.
                     </p>
                  </div>
               </div>

               <div className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col justify-center items-center text-center gap-4 relative group">
                  <UploadCloud className="w-12 h-12 text-gray-600 group-hover:text-tad-yellow transition-colors" />
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Cargar Arte</h3>
                    <p className="text-[10px] text-gray-500 mt-2">Detección de formato automático.<br/>Si no encaja, lo recortamos por ti.</p>
                  </div>
                  <div className="absolute bottom-4 right-4 animate-bounce">
                     <span className="text-[9px] bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded-full font-black uppercase">Auto-Crop Activo</span>
                  </div>
               </div>
            </div>

            <AntigravityButton actionName="next_step" variant="primary" onClick={nextStep} className="w-full">
               Publicar Campaña <ArrowRight className="w-5 h-5 ml-2" />
            </AntigravityButton>
          </div>
        )}

        {/* ─── Fase 3: Dashboard de Transparencia & Loop de Crecimiento ─── */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right duration-500 space-y-8">
            <div className="text-center">
              <div className="w-32 h-32 bg-tad-yellow/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                 <div className="absolute inset-0 border-4 border-tad-yellow/30 rounded-full animate-ping" />
                 <CheckCircle2 className="w-16 h-16 text-tad-yellow" />
              </div>
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 text-shadow-glow">
                ¡Tu Campaña está Viva!
              </h1>
              <p className="text-sm text-gray-300 font-medium">Los taxis ya están transmitiendo tu marca en las calles.</p>
            </div>

            <div className="bg-black/60 rounded-3xl p-6 border border-white/5 flex items-center justify-between">
               <div>
                  <h4 className="text-emerald-400 font-black uppercase text-sm flex items-center gap-2 mb-1"><Eye className="w-4 h-4"/> Prueba de Vida</h4>
                  <p className="text-xs text-gray-400">Ver fotos de tus anuncios corriendo ahora mismo.</p>
               </div>
               <AntigravityButton actionName="go_dashboard" variant="ghost" onClick={() => router.push('/advertiser/dashboard')}>
                  Ver Dashboard
               </AntigravityButton>
            </div>

            <div className="bg-gradient-to-r from-blue-600/20 to-transparent p-6 border border-blue-500/30 rounded-3xl flex items-center gap-4">
               <Share2 className="w-10 h-10 text-blue-400 shrink-0" />
               <div>
                 <h4 className="text-white font-black uppercase tracking-tight text-sm mb-1">Refiere y Gana RD$2000</h4>
                 <p className="text-xs text-gray-300/80">Refiere a otro negocio. Cuando publiquen su primera campaña, ambos ganan crédito.</p>
               </div>
               <button className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors ml-auto">
                 Copiar Link
               </button>
            </div>
            
            <div className="pt-4">
              <AntigravityButton actionName="finish_onboarding" variant="primary" onClick={() => router.push('/advertiser/dashboard')} className="w-full">
                 ENTRAR A MI DASHBOARD <Megaphone className="w-5 h-5 ml-2" />
              </AntigravityButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
