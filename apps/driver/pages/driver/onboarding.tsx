import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Car, Camera, PlayCircle, DollarSign, ShieldCheck, CheckCircle2, ArrowRight, UploadCloud, Zap } from 'lucide-react';
import clsx from 'clsx';
import { AntigravityButton } from '@tad/ui';

export default function DriverOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [hours, setHours] = useState(8);
  const projectedEarnings = hours * 500; // Mock calculation
  
  useEffect(() => { setMounted(true); }, []);

  const nextStep = () => setStep(s => Math.min(s + 1, 3));

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <Head>
        <title>Onboarding Socio | TAD</title>
      </Head>

      <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-tad-yellow/[0.03] to-transparent pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-tad-yellow/10 blur-[80px] rounded-full pointer-events-none" />

      <div className={clsx(
        "w-full max-w-2xl bg-zinc-900/60 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl transition-all duration-700 relative",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        {/* Progress Bar */}
        <div className="flex gap-2 mb-10">
           {[1, 2, 3].map(i => (
             <div key={i} className={clsx("h-1.5 rounded-full flex-1 transition-all duration-500", step >= i ? "bg-tad-yellow shadow-[0_0_10px_rgba(255,212,0,0.4)]" : "bg-white/10")} />
           ))}
        </div>

        {/* ─── Fase 1: Gancho (Cero Fricción) ─── */}
        {step === 1 && (
          <div className="animate-in fade-in zoom-in-95 duration-700 space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-tad-yellow/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 relative group">
                <div className="absolute inset-0 bg-tad-yellow/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Camera className="w-10 h-10 text-tad-yellow relative z-10" />
              </div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Escaneo Inteligente</h1>
              <p className="text-sm text-gray-400 font-medium">Olvídate de formularios. Sube tus documentos y nuestra IA (Nexus-OCR) extraerá la data en milisegundos.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="relative h-40 border-2 border-dashed border-white/5 bg-black/40 rounded-3xl overflow-hidden group cursor-pointer hover:border-tad-yellow/40 transition-all">
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <UploadCloud className="w-8 h-8 text-zinc-700 group-hover:text-tad-yellow transition-colors" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Foto Licencia</span>
                  </div>
                  {/* Scanner Laser Spell */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-tad-yellow shadow-[0_0_15px_#FFD400] animate-[scanner_3s_infinite] opacity-40" />
               </div>
               <div className="relative h-40 border-2 border-dashed border-white/5 bg-black/40 rounded-3xl overflow-hidden group cursor-pointer hover:border-tad-yellow/40 transition-all">
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <UploadCloud className="w-8 h-8 text-zinc-700 group-hover:text-tad-yellow transition-colors" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Foto Seguro</span>
                  </div>
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-tad-yellow shadow-[0_0_15px_#FFD400] animate-[scanner_3s_infinite_ease-in-out_1s] opacity-40 rotate-180" />
               </div>
            </div>

            <style jsx>{`
              @keyframes scanner {
                0% { transform: translateY(0px); opacity: 0 }
                20% { opacity: 1 }
                80% { opacity: 1 }
                100% { transform: translateY(160px); opacity: 0 }
              }
            `}</style>

            <div className="bg-gradient-to-br from-zinc-900 to-black rounded-3xl p-6 border border-white/5 flex items-start gap-4">
               <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                  <PlayCircle className="w-6 h-6 text-tad-yellow" />
               </div>
               <div>
                 <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-tight">Tutorial: Ganado por kilómetro</h4>
                 <p className="text-xs text-gray-500 leading-relaxed">Mira en 15 segundos cómo el cerebro Nexus de TAD detecta zonas premium automáticamente.</p>
               </div>
            </div>

            <AntigravityButton actionName="next_step" variant="glow" onClick={nextStep} className="w-full h-16 text-xs">
               Explorar Potencial de Ganancias <ArrowRight className="w-5 h-5 ml-2" />
            </AntigravityButton>
          </div>
        )}

        {/* ─── Fase 2: La Primera Victoria (Neuromarketing de Logro) ─── */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right duration-500 space-y-8">
            <div className="text-center">
              <div className="inline-flex px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4">
                Simulación Factible 2026
              </div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Tu Nuevo Activo</h1>
              <p className="text-sm text-gray-400 font-medium">Calcula hoy lo que tu taxi puede generar mientras trabajas.</p>
            </div>

            <div className="bg-black/60 rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-tad-yellow/5 blur-[60px] -mr-16 -mt-16 group-hover:bg-tad-yellow/10 transition-colors" />
               
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 relative z-10 gap-6">
                 <div>
                   <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                     <DollarSign className="w-3 h-3 text-emerald-500" />
                     Ingreso Mensual Estimado
                   </p>
                   <div className="flex items-baseline gap-2">
                      <h3 className="text-5xl font-black text-white tracking-tighter">RD$ {projectedEarnings.toLocaleString()}</h3>
                      <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">+ Bonos</span>
                   </div>
                 </div>
                 <div className="w-full sm:w-auto text-left sm:text-right">
                   <p className="text-[9px] font-black uppercase text-zinc-500 mb-3 tracking-widest">Compromiso al Volante</p>
                   <div className="inline-flex bg-white/5 rounded-2xl p-1.5 border border-white/10 shadow-inner">
                      {[4, 8, 12].map(h => (
                         <button key={h} onClick={() => setHours(h)} className={clsx("px-5 py-2 rounded-xl text-xs font-black transition-all", hours === h ? "bg-tad-yellow text-black shadow-lg" : "text-zinc-500 hover:text-white")}>
                           {h}h
                         </button>
                      ))}
                   </div>
                 </div>
               </div>
            </div>

            <div className="bg-zinc-950 rounded-[2rem] p-6 border border-white/5 space-y-4">
              <div className="flex items-center gap-4">
                <ShieldCheck className="w-8 h-8 text-tad-yellow shrink-0" />
                <h4 className="text-white font-black text-sm uppercase tracking-tight">Starter Kit Operativo (VIP)</h4>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Únete con una inversión única de <strong>RD$6,000</strong>. No es un gasto, es tu acceso a:
              </p>
              <div className="grid grid-cols-2 gap-3 pb-2">
                {["Tablet Nexus v2", "Seguro Contra Robo", "Mantenimiento 24/7", "Internet 5G Ilimitado"].map(item => (
                  <div key={item} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5 text-[9px] font-bold text-zinc-300 uppercase tracking-wider">
                     <div className="w-1 h-1 rounded-full bg-tad-yellow shadow-[0_0_5px_rgba(255,212,0,1)]" />
                     {item}
                  </div>
                ))}
              </div>
            </div>

            <AntigravityButton actionName="next_step" variant="primary" onClick={nextStep} className="w-full h-16">
               Adquirir Membresía y Conectar <ArrowRight className="w-5 h-5 ml-2" />
            </AntigravityButton>
          </div>
        )}

        {/* ─── Fase 3: Activación del Hardware (Mensaje Gamificado) ─── */}
        {step === 3 && (
          <div className="animate-in zoom-in-95 duration-500 py-10 text-center space-y-8">
            <div className="w-32 h-32 bg-tad-yellow/10 rounded-full flex items-center justify-center mx-auto relative group">
               <div className="absolute inset-0 border-2 border-tad-yellow/30 rounded-full animate-[ping_2s_infinite]" />
               <div className="absolute inset-0 border border-tad-yellow/10 rounded-full scale-110 group-hover:scale-125 transition-transform" />
               <CheckCircle2 className="w-16 h-16 text-tad-yellow group-hover:scale-110 transition-transform" />
            </div>
            
            <div className="space-y-3">
               <h1 className="text-4xl font-black text-white uppercase tracking-tighter text-shadow-glow">
                 Punto de Control Activo
               </h1>
               <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.2em]">Tu vehículo ha sido vinculado a la Nodo-Red</p>
            </div>

            <div className="bg-black/80 rounded-2xl p-6 border border-white/5 font-mono text-left max-w-sm mx-auto shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500/20 group-hover:bg-tad-yellow/20 transition-colors" />
               <div className="space-y-2 opacity-80">
                 <p className="text-[10px] text-emerald-500">[{new Date().toLocaleTimeString()}] PING_RESPONSE: SUCCESS</p>
                 <p className="text-[10px] text-zinc-400">&gt; VERIFYING_EQUIPMENT... OK</p>
                 <p className="text-[10px] text-zinc-400">&gt; ACTIVATING_REVENUE_STREAM... 100%</p>
                 <div className="flex items-center gap-3 pt-2">
                    <Zap className="w-4 h-4 text-tad-yellow animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest font-sans underline decoration-tad-yellow">FACTURANDO EN VIVO</span>
                 </div>
               </div>
            </div>

            <div className="pt-4">
              <AntigravityButton actionName="go_dashboard" variant="glow" onClick={() => router.push('/driver/dashboard')} className="w-full h-16">
                 ACCEDER AL CENTRO DE GANANCIAS <Car className="w-5 h-5 ml-2" />
              </AntigravityButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
