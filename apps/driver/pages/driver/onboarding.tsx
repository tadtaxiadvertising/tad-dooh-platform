import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import api from '@tad/services';
import {
  Car, Camera, DollarSign, ShieldCheck, CheckCircle2, ArrowRight,
  UploadCloud, Zap, Phone, Shield, Eye, EyeOff, MapPin, ChevronLeft,
  Sparkles, BadgeCheck, Wifi, Clock, Users
} from 'lucide-react';
import clsx from 'clsx';

type OnboardingStep = 1 | 2 | 3 | 4;

export default function DriverOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [mounted, setMounted] = useState(false);
  const [campaigns, setCampaigns] = useState(5);
  const projectedEarnings = (campaigns * 500) + 500; // Campaign pay + Availability bonus

  // Registration fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cedula, setCedula] = useState('');
  const [taxiPlate, setTaxiPlate] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreements, setAgreements] = useState({ contract: false, hardware_liability: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const nextStep = () => setStep(s => Math.min(s + 1, 4) as OnboardingStep);
  const prevStep = () => setStep(s => Math.max(s - 1, 1) as OnboardingStep);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agreements.contract || !agreements.hardware_liability) {
      setError('Debes aceptar ambos acuerdos para continuar');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await api.post('/drivers', {
        fullName, phone, cedula, taxiPlate, password,
        contractAccepted: true,
        agreementVersion: '2.0'
      });
      nextStep(); // Go to success step
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  const TOTAL_STEPS = 4;

  return (
    <div className="min-h-screen bg-[#060606] flex flex-col items-center relative overflow-hidden font-sans">
      <Head>
        <title>Únete a TAD | Conviértete en Socio Conductor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="description" content="Registra tu taxi en la red TAD y comienza a generar ingresos pasivos con publicidad digital." />
      </Head>

      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-tad-yellow/[0.04] blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/[0.03] blur-[100px] rounded-full" />
      </div>

      {/* Top Nav Bar */}
      <div className="w-full max-w-lg px-4 pt-4 pb-2 flex items-center justify-between relative z-10">
        <button
          onClick={() => step > 1 ? prevStep() : router.push('/driver/login')}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={clsx(
                "h-1 rounded-full transition-all duration-500",
                step >= i
                  ? "bg-tad-yellow w-8 shadow-[0_0_12px_rgba(255,212,0,0.4)]"
                  : "bg-white/10 w-4"
              )}
            />
          ))}
        </div>

        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest tabular-nums">
          {step}/{TOTAL_STEPS}
        </span>
      </div>

      {/* Content */}
      <div className={clsx(
        "flex-1 w-full max-w-lg px-4 pb-8 flex flex-col transition-all duration-700 relative z-10",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      )}>

        {/* ═══════════════ STEP 1: Value Proposition ═══════════════ */}
        {step === 1 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Hero */}
            <div className="text-center pt-6 pb-8">
              <div className="w-20 h-20 bg-tad-yellow rounded-[1.75rem] flex items-center justify-center mx-auto mb-6 shadow-[0_20px_60px_rgba(255,212,0,0.15)]">
                <Sparkles className="w-10 h-10 text-black" />
              </div>
              <h1 className="text-[28px] font-black text-white uppercase tracking-tight leading-tight mb-3">
                Tu taxi genera<br />
                <span className="text-tad-yellow">dinero extra</span>
              </h1>
              <p className="text-sm text-gray-400 font-medium leading-relaxed max-w-[280px] mx-auto">
                Evoluciona a <b>Hardware-as-a-Service</b>. Gana por cada campaña activa en tu unidad mientras trabajas tu ruta normal.
              </p>
            </div>

            {/* Benefit Cards */}
            <div className="space-y-3 flex-1">
              {[
                { icon: <DollarSign className="w-5 h-5" />, title: 'Pagos por Campaña', desc: 'Recibe RD$500 mensuales por cada anuncio activo en tu tablet (Hasta 15 simultáneos)', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { icon: <Wifi className="w-5 h-5" />, title: 'Internet 5G Ilimitado', desc: 'Conectividad premium para ti y tus pasajeros sin costo adicional', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { icon: <BadgeCheck className="w-5 h-5" />, title: 'Bono de Disponibilidad', desc: 'RD$500 mensuales garantizados con solo mantener tu equipo encendido', color: 'text-tad-yellow', bg: 'bg-tad-yellow/10' },
                { icon: <Users className="w-5 h-5" />, title: 'Plan de Referidos', desc: 'Gana RD$500 por cada nuevo socio o marca (Anunciante) que traigas a la flota', color: 'text-purple-400', bg: 'bg-purple-500/10' },
              ].map((b, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
                >
                  <div className={clsx("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", b.bg, b.color)}>
                    {b.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{b.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="pt-6">
              <button
                onClick={nextStep}
                className="w-full bg-tad-yellow hover:bg-white text-black font-black uppercase tracking-[0.15em] text-sm py-5 rounded-2xl transition-all shadow-[0_10px_40px_rgba(255,212,0,0.15)] active:scale-[0.97] flex items-center justify-center gap-3"
              >
                <span>CALCULAR MIS GANANCIAS</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 2: Earnings Calculator ═══════════════ */}
        {step === 2 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Header */}
            <div className="text-center pt-6 pb-6">
              <div className="inline-flex px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4">
                Lógica Contable Certificada
              </div>
              <h1 className="text-[26px] font-black text-white uppercase tracking-tight leading-tight mb-2">
                Simulación de<br />
                <span className="text-emerald-400">Ingresos</span>
              </h1>
              <p className="text-xs text-gray-500 font-medium">Desliza para proyectar tus bonos mensuales</p>
            </div>

            {/* Calculator Card */}
            <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-6 space-y-6">
              {/* Campaigns Selector */}
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Campañas Activas en tu Unidad</p>
                <div className="flex gap-2">
                  {[3, 6, 9, 12, 15].map(c => (
                    <button
                      key={c}
                      onClick={() => setCampaigns(c)}
                      className={clsx(
                        "flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300",
                        campaigns === c
                          ? "bg-tad-yellow text-black shadow-[0_5px_20px_rgba(255,212,0,0.2)] scale-105"
                          : "bg-white/5 text-gray-500 hover:text-white border border-white/5"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Earnings Display */}
              <div className="bg-black/40 rounded-2xl p-6 border border-white/5">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Pago Mensual (Estimado)</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] text-gray-500 font-bold">RD$</span>
                      <span className="text-4xl font-black text-white tracking-tighter">{projectedEarnings.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mb-1">+ Incentivos</p>
                    <span className="text-lg font-black text-emerald-400 tracking-tight">VIP</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
                   <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-tad-yellow shrink-0" />
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        Incluye <b>Bono de Disponibilidad</b> (RD$500) por telemetría.
                      </p>
                   </div>
                   <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400 shrink-0" />
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        Potencial ilimitado por <b>Referidos</b> de Anunciantes.
                      </p>
                   </div>
                </div>
              </div>

              {/* Business Table info */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                    <span>Concepto</span>
                    <span>Monto</span>
                 </div>
                 <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold text-zinc-300 uppercase">
                       <span>Pago por Campaña</span>
                       <span>RD$500 /u</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-zinc-300 uppercase">
                       <span>Disponibilidad (100 GPS pts)</span>
                       <span>RD$500</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-emerald-500 uppercase">
                       <span>Starter Kit / Membresía Anual</span>
                       <span>RD$6,000</span>
                    </div>
                 </div>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-6 mt-auto">
              <button
                onClick={nextStep}
                className="w-full bg-tad-yellow hover:bg-white text-black font-black uppercase tracking-[0.15em] text-sm py-5 rounded-2xl transition-all shadow-[0_10px_40px_rgba(255,212,0,0.15)] active:scale-[0.97] flex items-center justify-center gap-3"
              >
                <span>QUIERO MI STARTER KIT</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 3: Registration Form ═══════════════ */}
        {step === 3 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center pt-4 pb-4">
              <h1 className="text-[22px] font-black text-white uppercase tracking-tight leading-tight mb-1">
                Registro de Socio
              </h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Adquiere tu membresía de RD$6,000 / año</p>
            </div>

            <form onSubmit={handleRegister} className="flex-1 flex flex-col">
              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400">
                  <Shield className="w-4 h-4 shrink-0" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">{error}</p>
                </div>
              )}

              <div className="space-y-4 flex-1">
                {/* Full Name */}
                <div className="group">
                  <label htmlFor="ob-name" className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-tad-yellow transition-colors">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center text-gray-700 group-focus-within:text-tad-yellow transition-colors pointer-events-none">
                      <Car className="w-4 h-4" />
                    </div>
                    <input
                      id="ob-name" type="text" required value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Juan Pérez"
                      className="w-full bg-black/60 border border-white/5 rounded-xl pl-12 pr-4 py-4 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow/30 transition-all"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="group">
                  <label htmlFor="ob-phone" className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-tad-yellow transition-colors">
                    Teléfono Celular
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center text-gray-700 group-focus-within:text-tad-yellow transition-colors pointer-events-none">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="ob-phone" type="tel" required value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="829-555-0001"
                      className="w-full bg-black/60 border border-white/5 rounded-xl pl-12 pr-4 py-4 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow/30 transition-all"
                    />
                  </div>
                </div>

                {/* Cedula + Placa Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="group">
                    <label htmlFor="ob-ced" className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-tad-yellow transition-colors">
                      Cédula
                    </label>
                    <input
                      id="ob-ced" type="text" value={cedula}
                      onChange={e => setCedula(e.target.value)}
                      placeholder="001-0000000-0"
                      className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow/30 transition-all"
                    />
                  </div>
                  <div className="group">
                    <label htmlFor="ob-plate" className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-tad-yellow transition-colors">
                      Placa
                    </label>
                    <input
                      id="ob-plate" type="text" value={taxiPlate}
                      onChange={e => setTaxiPlate(e.target.value)}
                      placeholder="T-101"
                      className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow/30 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="group">
                  <label htmlFor="ob-pass" className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-tad-yellow transition-colors">
                    Contraseña (mín. 6 caracteres)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center text-gray-700 group-focus-within:text-tad-yellow transition-colors pointer-events-none">
                      <Shield className="w-4 h-4" />
                    </div>
                    <input
                      id="ob-pass" type={showPassword ? 'text' : 'password'} required value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={showPassword ? 'MiClave123' : '••••••••'}
                      className="w-full bg-black/60 border border-white/5 rounded-xl pl-12 pr-12 py-4 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow/30 transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                      className="absolute inset-y-0 right-4 flex items-center text-gray-600 hover:text-tad-yellow transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Agreements */}
                <div className="space-y-3 pt-1">
                  <label className="flex items-start gap-3 cursor-pointer group/check">
                    <input type="checkbox" checked={agreements.contract}
                      onChange={e => setAgreements(prev => ({ ...prev, contract: e.target.checked }))}
                      className="mt-0.5 w-5 h-5 rounded border-2 border-white/10 bg-black text-tad-yellow accent-yellow-400 shrink-0"
                    />
                    <span className="text-[11px] text-gray-500 leading-relaxed group-hover/check:text-gray-400 transition-colors text-shadow-sm">
                      Acepto el <span className="text-tad-yellow font-bold uppercase tracking-tighter">Handshake Operativo</span> y contrato de servicio.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group/check">
                    <input type="checkbox" checked={agreements.hardware_liability}
                      onChange={e => setAgreements(prev => ({ ...prev, hardware_liability: e.target.checked }))}
                      className="mt-0.5 w-5 h-5 rounded border-2 border-white/10 bg-black text-tad-yellow accent-yellow-400 shrink-0"
                    />
                    <span className="text-[11px] text-gray-500 leading-relaxed group-hover/check:text-gray-400 transition-colors text-shadow-sm">
                      Acepto la <span className="text-tad-yellow font-bold uppercase tracking-tighter">Responsabilidad de Hardware</span> y acuerdo de mantenimiento (Membresía RD$6,000/año).
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-5 mt-auto">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-tad-yellow hover:bg-white text-black font-black uppercase tracking-[0.15em] text-sm py-5 rounded-2xl transition-all shadow-[0_10px_40px_rgba(255,212,0,0.15)] active:scale-[0.97] flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>CONFIGURANDO NODO...</span>
                    </>
                  ) : (
                    <>
                      <BadgeCheck className="w-5 h-5" />
                      <span>ADSCRIPCIÓN AL SISTEMA</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/driver/login')}
                  className="w-full mt-3 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wider hover:text-tad-yellow transition-colors py-2"
                >
                  ← Ya tengo cuenta
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ═══════════════ STEP 4: Success ═══════════════ */}
        {step === 4 && (
          <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 fade-in duration-700 text-center py-10">
            {/* Pulsing Circle */}
            <div className="relative mb-8">
              <div className="absolute inset-0 w-32 h-32 border-2 border-tad-yellow/20 rounded-full animate-ping" />
              <div className="absolute inset-0 w-32 h-32 border border-tad-yellow/10 rounded-full scale-125" />
              <div className="w-32 h-32 bg-tad-yellow/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-16 h-16 text-tad-yellow" />
              </div>
            </div>

            <h1 className="text-[28px] font-black text-white uppercase tracking-tight leading-tight mb-3">
              ¡Bienvenido<br />a la Red!
            </h1>
            <p className="text-sm text-gray-400 max-w-[260px] leading-relaxed mb-8">
              Tu cuenta fue creada exitosamente. Nuestro equipo te contactará para coordinar la instalación del equipo.
            </p>

            {/* Terminal-like Status */}
            <div className="w-full bg-black/60 rounded-2xl p-5 border border-white/5 text-left font-mono space-y-2 mb-8">
              <p className="text-[10px] text-emerald-400">✓ Cuenta creada correctamente</p>
              <p className="text-[10px] text-emerald-400">✓ Perfil de conductor registrado</p>
              <p className="text-[10px] text-tad-yellow animate-pulse">⟳ Equipo pendiente de despacho...</p>
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <Zap className="w-3 h-3 text-tad-yellow" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest font-sans">Sistema Listo</span>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => router.push('/driver/login')}
              className="w-full bg-tad-yellow hover:bg-white text-black font-black uppercase tracking-[0.15em] text-sm py-5 rounded-2xl transition-all shadow-[0_10px_40px_rgba(255,212,0,0.15)] active:scale-[0.97] flex items-center justify-center gap-3"
            >
              <span>IR A INICIAR SESIÓN</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="pt-6 text-center">
          <p className="text-[8px] text-gray-700 font-bold uppercase tracking-[0.5em]">
            TAD TECHNOLOGIES © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
