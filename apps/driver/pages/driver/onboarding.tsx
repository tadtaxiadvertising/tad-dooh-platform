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
          <div className="animate-in fade-in zoom-in-95 duration-500 space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-tad-yellow/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Camera className="w-10 h-10 text-tad-yellow" />
              </div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Escaneo Inteligente</h1>
              <p className="text-sm text-gray-400 font-medium">Olvídate de formularios largos. Sube una foto de tu licencia y seguro, nosotros hacemos el resto mediante OCR.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button className="h-32 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 hover:border-tad-yellow/50 transition-all text-gray-500 group">
                  <UploadCloud className="w-8 h-8 group-hover:text-tad-yellow transition-colors" />
                  <span className="text-[10px] uppercase font-black tracking-widest">Foto Licencia</span>
               </button>
               <button className="h-32 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 hover:border-tad-yellow/50 transition-all text-gray-500 group">
                  <UploadCloud className="w-8 h-8 group-hover:text-tad-yellow transition-colors" />
                  <span className="text-[10px] uppercase font-black tracking-widest">Foto Seguro</span>
               </button>
            </div>

            <div className="bg-black/40 rounded-3xl p-6 border border-white/5 flex items-start gap-4">
               <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center shrink-0">
                  <PlayCircle className="w-6 h-6 text-white" />
               </div>
               <div>
                 <h4 className="text-white font-bold text-sm mb-1">Video: Tu nuevo activo financiero</h4>
                 <p className="text-xs text-gray-500">Mira en 15 segundos cómo la pantalla TAD se instala gratis en tu asiento trasero.</p>
               </div>
            </div>

            <AntigravityButton actionName="next_step" variant="glow" onClick={nextStep} className="w-full">
               Continuar a Ganancias <ArrowRight className="w-5 h-5 ml-2" />
            </AntigravityButton>
          </div>
        )}

        {/* ─── Fase 2: La Primera Victoria (Neuromarketing de Logro) ─── */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right duration-500 space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-10 h-10 text-emerald-500" />
              </div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Simulador de Socio</h1>
              <p className="text-sm text-gray-400 font-medium">Tu vehículo ahora es un activo de alto rendimiento.</p>
            </div>

            <div className="bg-black/60 rounded-3xl p-8 border border-emerald-500/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] -mr-10 -mt-10" />
               <div className="flex justify-between items-end mb-6 relative z-10">
                 <div>
                   <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Proyección de Ingreso Extra</p>
                   <h3 className="text-4xl font-black text-emerald-400">RD$ {projectedEarnings.toLocaleString()}</h3>
                   <span className="text-xs text-gray-500">mes estimado</span>
                 </div>
                 <div className="text-right">
                   <p className="text-[10px] font-black uppercase text-white mb-2">Horas conduciendo al día</p>
                   <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                      {[4, 8, 12].map(h => (
                         <button key={h} onClick={() => setHours(h)} className={clsx("px-4 py-1.5 rounded-full text-xs font-bold transition-all", hours === h ? "bg-emerald-500 text-black shadow-lg" : "text-gray-400")}>
                           {h}h
                         </button>
                      ))}
                   </div>
                 </div>
               </div>
            </div>

            <div className="bg-gradient-to-r from-tad-yellow/10 to-transparent p-6 rounded-3xl border border-tad-yellow/20 flex gap-4">
              <ShieldCheck className="w-8 h-8 text-tad-yellow shrink-0" />
              <div>
                 <h4 className="text-white font-bold mb-1 uppercase tracking-tight">Membresía de Socio VIP</h4>
                 <p className="text-xs text-gray-400 leading-relaxed mb-3">La plataforma requiere un aporte único de <strong>RD$6,000</strong> que incluye: Seguro Full Premium para la Tablet, Mantenimiento Técnico y Datos Móviles Ilimitados 5G por un año.</p>
                 <span className="text-[10px] bg-tad-yellow/20 text-tad-yellow font-black uppercase px-3 py-1 rounded-full">Retorno esperado en {hours === 4 ? '2 meses' : '1 mes'}</span>
              </div>
            </div>

            <AntigravityButton actionName="next_step" variant="primary" onClick={nextStep} className="w-full">
               Comprar Membresía de Socio <ArrowRight className="w-5 h-5 ml-2" />
            </AntigravityButton>
          </div>
        )}

        {/* ─── Fase 3: Activación del Hardware (Mensaje Gamificado) ─── */}
        {step === 3 && (
          <div className="animate-in zoom-in-95 duration-500 py-10 text-center space-y-8">
            <div className="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto relative">
               <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full animate-ping" />
               <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            </div>
            
            <div>
               <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4 text-shadow-glow">
                 ¡Felicidades, Socio!
               </h1>
               <p className="text-lg text-gray-300 font-medium">Tu vehículo ya está <span className="text-emerald-400 font-bold border-b-2 border-emerald-500">facturando</span>.</p>
            </div>

            <div className="bg-black/50 p-6 rounded-3xl border border-white/5 inline-block mx-auto">
               <div className="flex items-center gap-4">
                 <Zap className="w-8 h-8 text-tad-yellow animate-pulse" />
                 <div className="text-left">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-none mb-1">Primer Anuncio Reproducido</p>
                    <p className="text-white font-black text-lg">Campaña: Coca-Cola Zona Norte</p>
                 </div>
               </div>
            </div>

            <div className="pt-8">
              <AntigravityButton actionName="go_dashboard" variant="primary" onClick={() => router.push('/driver/dashboard')} className="w-full">
                 ENTRAR AL TABLERO DE GANANCIAS <Car className="w-5 h-5 ml-2" />
              </AntigravityButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
