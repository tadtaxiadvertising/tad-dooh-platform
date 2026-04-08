import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import api from '@tad/services';
import {
  Map, ArrowRight, UploadCloud, Users, Share2, CheckCircle2,
  Calculator, Megaphone, Briefcase, Zap, Phone, Shield, Eye, EyeOff,
  Building, User, Mail, ChevronLeft, MousePointerClick
} from 'lucide-react';
import clsx from 'clsx';
import { AntigravityButton } from '@tad/ui';

type OnboardingStep = 1 | 2 | 3 | 4;

export default function AdvertiserOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [mounted, setMounted] = useState(false);
  
  // Calculator state
  const [budget, setBudget] = useState(5000);
  const itbis = budget * 0.18;
  const totalWithTax = budget + itbis;
  const reach = Math.floor(budget * 1.8); // 1.8 impressions per peso roughly

  // Registration fields
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreements, setAgreements] = useState({ terms: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const nextStep = () => setStep(s => Math.min(s + 1, 4) as OnboardingStep);
  const prevStep = () => setStep(s => Math.max(s - 1, 1) as OnboardingStep);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!agreements.terms) {
      setError('Debes aceptar el Contrato de Anunciante para continuar');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    
    try {
      await api.post('/advertisers', {
        companyName,
        contactName,
        email,
        phone,
        password,
      });
      nextStep(); // Go to success step
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const TOTAL_STEPS = 4;

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center relative overflow-hidden font-sans pb-8">
      <Head>
        <title>Lanzamiento de Campaña | TAD</title>
      </Head>

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-tad-yellow/5 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4" />
      </div>

      {/* Top Nav Bar */}
      <div className="w-full max-w-4xl px-4 pt-4 pb-2 flex items-center justify-between relative z-10 mx-auto">
        <button
          onClick={() => step > 1 ? prevStep() : router.push('/advertiser/login')}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={clsx(
                "h-1.5 rounded-full transition-all duration-500",
                step >= i
                  ? "bg-tad-yellow w-10 shadow-[0_0_12px_rgba(255,212,0,0.4)]"
                  : "bg-white/10 w-6"
              )}
            />
          ))}
        </div>

        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest tabular-nums">
          {step}/{TOTAL_STEPS}
        </span>
      </div>

      <div className={clsx(
        "w-full max-w-4xl bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 lg:p-12 shadow-2xl transition-all duration-700 relative mt-4 mx-4",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      )}>

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
               Definir Inversión <ArrowRight className="w-5 h-5 ml-2" />
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
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Soporte Multimedia</h3>
                    <p className="text-[10px] text-zinc-500 mt-3 leading-relaxed">Sube JPG, PNG o MP4.<br/>Nuestro motor de transcodificación ajustará los codecs para hardware STI de forma automática.</p>
                  </div>
                  <div className="flex gap-2">
                     {["h264", "yuv420p", "1080p"].map(tag => (
                       <span key={tag} className="text-[8px] bg-white/5 text-zinc-500 px-2 py-1 rounded border border-white/5 font-black uppercase">{tag}</span>
                     ))}
                  </div>
               </div>
            </div>

            <AntigravityButton actionName="next_step" variant="primary" onClick={nextStep} className="w-full h-16">
               Crear Cuenta Corporativa <ArrowRight className="w-5 h-5 ml-2" />
            </AntigravityButton>
          </div>
        )}

        {/* ─── Fase 3: Registro ─── */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right duration-500 space-y-8 max-w-xl mx-auto">
            <div className="text-center">
              <h1 className="text-[26px] font-black text-white uppercase tracking-tight leading-tight mb-2">
                Paso Final:<br />Cuenta de Cliente
              </h1>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Completa los datos de tu empresa</p>
            </div>

            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400">
                  <Shield className="w-4 h-4 shrink-0" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Company Name */}
                <div className="group">
                  <label htmlFor="companyName" className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-tad-yellow transition-colors">
                    Nombre de Empresa o Agencia
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center text-zinc-700 group-focus-within:text-tad-yellow transition-colors pointer-events-none">
                      <Building className="w-4 h-4" />
                    </div>
                    <input
                      id="companyName" type="text" required value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="Mi Agencia EIRL"
                      className="w-full bg-black/60 border border-white/5 rounded-xl pl-12 pr-4 py-4 text-white text-sm font-bold placeholder:text-zinc-700 focus:outline-none focus:border-tad-yellow/30 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contact Name */}
                  <div className="group">
                    <label htmlFor="contactName" className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-tad-yellow transition-colors">
                      Nombre de Contacto
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-4 flex items-center text-zinc-700 group-focus-within:text-tad-yellow transition-colors pointer-events-none">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="contactName" type="text" required value={contactName}
                        onChange={e => setContactName(e.target.value)}
                        placeholder="Ej. Ana Pérez"
                        className="w-full bg-black/60 border border-white/5 rounded-xl pl-12 pr-4 py-4 text-white text-sm font-bold placeholder:text-zinc-700 focus:outline-none focus:border-tad-yellow/30 transition-all"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="group">
                    <label htmlFor="phone" className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-tad-yellow transition-colors">
                      Teléfono
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-4 flex items-center text-zinc-700 group-focus-within:text-tad-yellow transition-colors pointer-events-none">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        id="phone" type="tel" value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="809-555-0000"
                        className="w-full bg-black/60 border border-white/5 rounded-xl pl-12 pr-4 py-4 text-white text-sm font-bold placeholder:text-zinc-700 focus:outline-none focus:border-tad-yellow/30 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="group">
                  <label htmlFor="email" className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-tad-yellow transition-colors">
                    Correo Electrónico (Login)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center text-zinc-700 group-focus-within:text-tad-yellow transition-colors pointer-events-none">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="email" type="email" required value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="agencia@empresa.com"
                      className="w-full bg-black/60 border border-white/5 rounded-xl pl-12 pr-4 py-4 text-white text-sm font-bold placeholder:text-zinc-700 focus:outline-none focus:border-tad-yellow/30 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="group">
                  <label htmlFor="password" className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-tad-yellow transition-colors">
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center text-zinc-700 group-focus-within:text-tad-yellow transition-colors pointer-events-none">
                      <Shield className="w-4 h-4" />
                    </div>
                    <input
                      id="password" type={showPassword ? 'text' : 'password'} required value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={showPassword ? 'mIcl4v3s3gurA' : '••••••••'}
                      className="w-full bg-black/60 border border-white/5 rounded-xl pl-12 pr-12 py-4 text-white text-sm font-bold placeholder:text-zinc-700 focus:outline-none focus:border-tad-yellow/30 transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                      className="absolute inset-y-0 right-4 flex items-center text-zinc-600 hover:text-tad-yellow transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* agreements */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group/check">
                    <input type="checkbox" checked={agreements.terms}
                      onChange={e => setAgreements({ terms: e.target.checked })}
                      className="mt-0.5 w-5 h-5 rounded border-2 border-white/10 bg-black text-tad-yellow accent-yellow-400 shrink-0"
                    />
                    <span className="text-[11px] text-zinc-400 leading-relaxed group-hover/check:text-zinc-300 transition-colors">
                      Acepto el <span className="text-tad-yellow font-bold uppercase tracking-tight">Contrato de Anunciante</span> y las políticas de privacidad. Autorizo a TAD a facturar por reproducciones verificadas (Playback-Complete).
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit" disabled={loading}
                  className="w-full bg-tad-yellow hover:bg-white text-black font-black uppercase tracking-[0.15em] text-sm py-5 rounded-2xl transition-all shadow-[0_10px_40px_rgba(255,212,0,0.15)] active:scale-[0.97] flex items-center justify-center gap-3 disabled:opacity-50 h-16"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>PROCESANDO...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>CREAR CUENTA</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── Fase 4: Success & Loop de Crecimiento ─── */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right duration-500 space-y-8 animate-in zoom-in-95 fade-in">
            <div className="text-center">
              <div className="w-24 h-24 bg-tad-yellow/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 relative group">
                 <div className="absolute inset-0 bg-tad-yellow/20 rounded-full blur-3xl animate-pulse" />
                 <CheckCircle2 className="w-12 h-12 text-tad-yellow relative z-10" />
              </div>
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 text-shadow-glow">
                ¡Cuenta Creada!
              </h1>
              <p className="text-sm text-zinc-400 font-medium uppercase tracking-widest">Bienvenido a la red TAD.</p>
            </div>

            <div className="bg-zinc-950 rounded-[2rem] border border-white/5 p-6 overflow-hidden relative group shadow-2xl">
               <div className="flex items-center gap-6 relative z-10">
                 <div className="w-24 h-24 bg-black rounded-xl border border-white/5 overflow-hidden flex items-center justify-center relative">
                    <Megaphone className="w-8 h-8 text-zinc-800 rotate-12" />
                 </div>
                 <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Plataforma Lista</span>
                    </div>
                    <p className="text-white font-black text-sm uppercase mb-1">{companyName}</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Podrás crear campañas en tu dashboard.</p>
                 </div>
               </div>
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[2000ms] pointer-events-none" />
            </div>

            <div className="bg-blue-600/10 border border-blue-500/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group mt-6">
               <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full" />
               <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20 group-hover:rotate-6 transition-transform">
                  <Share2 className="w-8 h-8 text-blue-400" />
               </div>
               <div className="text-center md:text-left">
                 <h4 className="text-white font-black uppercase tracking-tight text-xl mb-1">Programa de Referidos</h4>
                 <p className="text-xs text-zinc-400 max-w-sm">Refiere a un socio comercial o un conductor, y recibe <span className="text-blue-400 font-black">comisiones y créditos</span> publicitarios en tu billetera corporativa.</p>
               </div>
            </div>
            
            <div className="pt-4">
              <AntigravityButton actionName="finish_onboarding" variant="primary" onClick={() => router.push('/advertiser/login')} className="w-full h-16">
                 IR A INICIAR SESIÓN <ArrowRight className="w-5 h-5 ml-2" />
              </AntigravityButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
