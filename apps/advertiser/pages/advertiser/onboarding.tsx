import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import api from '@tad/services';
import {
  Map, ArrowRight, Users, CheckCircle2,
  Calculator, Megaphone, Zap, Phone, Shield, Eye, EyeOff,
  Building, User, Mail, ChevronLeft, TrendingUp, Clock, AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';
import { AntigravityButton } from '@tad/ui';

type OnboardingStep = 1 | 2 | 3;

export default function AdvertiserOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [mounted, setMounted] = useState(false);

  // Budget + Zone state (Step 1 — merged)
  const [budget, setBudget] = useState(6000);
  const [selectedZones, setSelectedZones] = useState<string[]>(['santiago']);
  const itbis = budget * 0.18;
  const totalWithTax = budget + itbis;
  const reach = Math.floor(budget * 1.8);

  // Scarcity state (psychological trigger)
  const [availableSlots] = useState(() => Math.floor(Math.random() * 8) + 5); // 5-12 slots

  // Registration fields (Step 2)
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

  const nextStep = () => setStep(s => Math.min(s + 1, 3) as OnboardingStep);
  const prevStep = () => setStep(s => Math.max(s - 1, 1) as OnboardingStep);

  const toggleZone = (zone: string) => {
    setSelectedZones(prev =>
      prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]
    );
  };

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
        companyName, contactName, email, phone, password,
        initialBudget: budget,
        zones: selectedZones,
      });
      nextStep();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const TOTAL_STEPS = 3;

  const zones = [
    { id: 'santiago', label: 'Santiago (STI)', taxis: 45, active: true },
    { id: 'sto-domingo', label: 'Santo Domingo', taxis: 0, active: false },
    { id: 'vip', label: 'Zonas VIP', taxis: 12, active: true },
    { id: 'nocturno', label: 'Rutas Nocturnas', taxis: 8, active: true },
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center relative overflow-hidden font-sans pb-8">
      <Head>
        <title>Lanzamiento de Campaña | TAD</title>
        <meta name="description" content="Anuncia tu marca en taxis con pantallas digitales. Cobertura real en Santiago y Santo Domingo." />
      </Head>

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-tad-yellow/5 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4" />
      </div>

      {/* Top Nav */}
      <div className="w-full max-w-4xl px-4 pt-4 pb-2 flex items-center justify-between relative z-10 mx-auto">
        <button
          onClick={() => step > 1 ? prevStep() : router.push('/advertiser/login')}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={clsx(
                "h-1.5 rounded-full transition-all duration-500",
                step >= i
                  ? "bg-tad-yellow w-12 shadow-[0_0_12px_rgba(255,212,0,0.4)]"
                  : "bg-white/10 w-6"
              )}
            />
          ))}
        </div>

        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest tabular-nums">
          {step}/{TOTAL_STEPS}
        </span>
      </div>

      {/* ── Scarcity Banner (Aversión a la Pérdida) ── */}
      <div className="w-full max-w-4xl px-4 mt-2 relative z-10 mx-auto">
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl px-5 py-3 flex items-center gap-3 backdrop-blur-md">
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 animate-pulse" />
          <p className="text-[10px] font-bold text-orange-300 uppercase tracking-wider">
            Solo quedan <span className="text-orange-400 font-black text-xs">{availableSlots}</span> espacios publicitarios en Santiago esta semana
          </p>
          <Clock className="w-3 h-3 text-orange-500/60 shrink-0" />
        </div>
      </div>

      <div className={clsx(
        "w-full max-w-4xl bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 lg:p-12 shadow-2xl transition-all duration-700 relative mt-4 mx-4",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      )}>

        {/* ─── PASO 1: Zona + Presupuesto (Fusionados) ─── */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right duration-500 space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 relative group">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Map className="w-10 h-10 text-blue-500 relative z-10" />
              </div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Tu Campaña en 60 Segundos</h1>
              <p className="text-sm text-gray-400 font-medium">Selecciona zonas e inversión. <b>Solo pagas por vistas verificadas.</b></p>
            </div>

            {/* Social Proof (Prueba Social) */}
            <div className="flex items-center justify-center gap-3 py-3 px-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl mx-auto max-w-md">
              <Users className="w-4 h-4 text-emerald-400" />
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                342 empresas ya anuncian con TAD
              </p>
              <TrendingUp className="w-3 h-3 text-emerald-500" />
            </div>

            {/* Zone Selection */}
            <div>
              <h3 className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-4">Zonas de Cobertura</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {zones.map((zone) => (
                  <button
                    key={zone.id}
                    onClick={() => zone.active && toggleZone(zone.id)}
                    disabled={!zone.active}
                    className={clsx(
                      "p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all duration-300 relative overflow-hidden",
                      !zone.active && "opacity-30 cursor-not-allowed",
                      selectedZones.includes(zone.id)
                        ? "bg-tad-yellow/10 border-tad-yellow text-tad-yellow shadow-[0_10px_30px_rgba(255,212,0,0.1)] scale-[1.02]"
                        : "bg-black/40 border-white/5 text-gray-500 hover:text-white hover:border-white/10"
                    )}
                  >
                    <Map className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">{zone.label}</span>
                    {zone.active && (
                      <span className="text-[8px] font-bold text-zinc-600">
                        {zone.taxis} taxis
                      </span>
                    )}
                    {!zone.active && (
                      <span className="text-[8px] font-black text-zinc-700 uppercase">Próximamente</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget Slider + Breakdown */}
            <div className="bg-zinc-950 border border-white/5 rounded-[2rem] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Inversión Mensual</h3>
                <Calculator className="w-4 h-4 text-emerald-500" />
              </div>
              <input
                type="range" min="3000" max="50000" step="1000"
                value={budget} onChange={e => setBudget(Number(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-tad-yellow"
              />
              <div className="flex justify-between text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                <span>RD$3,000</span>
                <span>RD$50,000</span>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex justify-between text-[11px] font-black uppercase text-zinc-500 tracking-widest">
                  <span>Subtotal</span>
                  <span className="text-white">RD${budget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] font-black uppercase text-zinc-500 tracking-widest">
                  <span>ITBIS (18%)</span>
                  <span className="text-rose-400">RD${itbis.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t border-white/5 flex justify-between items-end">
                  <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Total</p>
                  <span className="text-3xl font-black text-white tracking-tighter">RD${totalWithTax.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                <Zap className="w-5 h-5 text-tad-yellow shrink-0" />
                <p className="text-[10px] text-zinc-400 font-medium leading-relaxed uppercase tracking-wider">
                  Alcance estimado: <span className="text-white font-black">{reach.toLocaleString()}</span> impresiones verificadas en {selectedZones.length} zona(s).
                </p>
              </div>
            </div>

            <AntigravityButton
              actionName="next_step" variant="primary" onClick={nextStep}
              className="w-full h-16"
            >
              Crear Mi Cuenta <ArrowRight className="w-5 h-5 ml-2" />
            </AntigravityButton>
          </div>
        )}

        {/* ─── PASO 2: Registro Rápido ─── */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right duration-500 space-y-8 max-w-xl mx-auto">
            <div className="text-center">
              <h1 className="text-[26px] font-black text-white uppercase tracking-tight leading-tight mb-2">
                Último Paso:<br />Tu Cuenta Corporativa
              </h1>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                Reserva tu espacio en {selectedZones.length} zona(s) por RD${totalWithTax.toLocaleString()}/mes
              </p>
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

                {/* Agreements */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group/check">
                    <input type="checkbox" checked={agreements.terms}
                      onChange={e => setAgreements({ terms: e.target.checked })}
                      className="mt-0.5 w-5 h-5 rounded border-2 border-white/10 bg-black text-tad-yellow accent-yellow-400 shrink-0"
                    />
                    <span className="text-[11px] text-zinc-400 leading-relaxed group-hover/check:text-zinc-300 transition-colors">
                      Acepto el <span className="text-tad-yellow font-bold uppercase tracking-tight">Contrato de Anunciante</span> y autorizo a TAD a facturar por reproducciones verificadas (Playback-Complete).
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
                      <span>RESERVAR MI ESPACIO</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── PASO 3: Éxito + Loop de Crecimiento ─── */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right duration-500 space-y-8">
            <div className="text-center">
              <div className="w-24 h-24 bg-tad-yellow/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 relative group">
                <div className="absolute inset-0 bg-tad-yellow/20 rounded-full blur-3xl animate-pulse" />
                <CheckCircle2 className="w-12 h-12 text-tad-yellow relative z-10" />
              </div>
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">
                ¡Espacio Reservado!
              </h1>
              <p className="text-sm text-zinc-400 font-medium uppercase tracking-widest">Tu marca estará en las calles.</p>
            </div>

            {/* Confirmation Card */}
            <div className="bg-zinc-950 rounded-[2rem] border border-white/5 p-6 overflow-hidden relative group shadow-2xl">
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-24 h-24 bg-black rounded-xl border border-white/5 overflow-hidden flex items-center justify-center">
                  <Megaphone className="w-8 h-8 text-zinc-800 rotate-12" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Plataforma Lista</span>
                  </div>
                  <p className="text-white font-black text-sm uppercase mb-1">{companyName}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                    {selectedZones.length} zona(s) · RD${totalWithTax.toLocaleString()}/mes
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[2000ms] pointer-events-none" />
            </div>

            {/* Referral CTA (Investment phase of Hook Model) */}
            <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full" />
              <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20 group-hover:rotate-6 transition-transform">
                <Users className="w-7 h-7 text-blue-400" />
              </div>
              <div className="text-center md:text-left">
                <h4 className="text-white font-black uppercase tracking-tight text-lg mb-1">Refiere y Gana Crédito</h4>
                <p className="text-xs text-zinc-400 max-w-sm">Cada empresa que refieras te da <span className="text-blue-400 font-black">RD$1,000 en crédito</span> publicitario.</p>
              </div>
            </div>

            <AntigravityButton actionName="finish_onboarding" variant="primary" onClick={() => router.push('/advertiser/login')} className="w-full h-16">
              IR A MI DASHBOARD <ArrowRight className="w-5 h-5 ml-2" />
            </AntigravityButton>
          </div>
        )}
      </div>

      {/* Social Proof Footer */}
      <div className="mt-6 text-center opacity-60">
        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.3em]">
          Empresas que confían en TAD: Claro · Brugal · La Sirena · Popular
        </p>
      </div>
    </div>
  );
}
