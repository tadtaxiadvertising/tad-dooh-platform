import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  MapPin,
  Check,
  Eye,
  Zap,
  MonitorSmartphone,
  Loader2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import CityMapBackdrop from './CityMapBackdrop';

/**
 * Wizard de bienvenida de 3 pasos para nuevos anunciantes.
 *
 * Persistencia de completitud: clave `tad_adv_onboarded_${advertiserId}` en
 * localStorage — la escribe el paso 3 y desmonta el modal (ver dashboard.tsx).
 */
const CITIES = ['Santo Domingo', 'Santiago'] as const;
type TargetCity = (typeof CITIES)[number];

interface SimulationResult {
  budget: number;
  city: string;
  recommendedScreens: number;
  uniqueReach: number;
  totalImpressions: number;
  onlineScreensInZone: number;
}

const BUDGET_MIN = 1500;
const BUDGET_MAX = 150000;
const BUDGET_STEP = 500;
const BUDGET_DEFAULT = 15000;

const formatRD = (value: number) => `RD$ ${Math.round(value).toLocaleString('es-DO')}`;
const formatNum = (value: number) => Math.round(value).toLocaleString('es-DO');

export function getOnboardingKey(advertiserId: string): string {
  return `tad_adv_onboarded_${advertiserId}`;
}

interface OnboardingWizardProps {
  advertiserId: string;
  onComplete: () => void;
}

export default function OnboardingWizard({ advertiserId, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [city, setCity] = useState<TargetCity | null>(null);
  const [budget, setBudget] = useState(BUDGET_DEFAULT);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSimulation = useCallback(async (budgetRD: number, targetCity: string) => {
    setSimulating(true);
    setSimError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('tad_advertiser_token') : null;
      const res = await fetch('/api/proxy/campaigns/simulate-budget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ budgetRD, city: targetCity }),
      });

      if (!res.ok) throw new Error('La simulación no está disponible en este momento.');
      const data = (await res.json()) as SimulationResult;
      setSimulation(data);
    } catch {
      setSimulation(null);
      setSimError('No pudimos calcular la proyección. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setSimulating(false);
    }
  }, []);

  // Llamada proxy con debounce mientras se mueve el slider
  useEffect(() => {
    if (step !== 1 || !city) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSimulation(budget, city);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [budget, city, step, runSimulation]);

  const completeOnboarding = () => {
    try {
      if (typeof window !== 'undefined' && advertiserId) {
        window.localStorage.setItem(getOnboardingKey(advertiserId), '1');
      }
    } catch (err) {
      console.error('[OnboardingWizard] Error al guardar completitud de onboarding local:', err);
    }
    onComplete();
  };

  const steps = ['Ciudad', 'Presupuesto', 'Proyección'];
  const fillPct = ((budget - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop: oscuridad + ciudad viva */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-lg" aria-hidden="true" />
      <CityMapBackdrop />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        role="dialog"
        aria-modal="true"
        aria-label="Bienvenida a TAD Advertiser"
        className="stitched-card relative w-full max-w-lg rounded-[28px] overflow-hidden"
      >
        {/* Orbes ambientales dentro de la tarjeta */}
        <div className="pointer-events-none absolute -top-28 left-1/2 h-56 w-80 -translate-x-1/2 rounded-full bg-[#FFD400]/[0.13] blur-[90px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-56 w-56 rounded-full bg-blue-500/[0.07] blur-[100px]" aria-hidden="true" />

        <div className="relative px-7 py-8 sm:px-9">
          {/* Header — insignia TAD con halo */}
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="animate-float mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_44px_rgba(255,212,0,0.18)]">
              <span className="text-2xl font-black tracking-tight text-[#FFD400] drop-shadow-[0_0_12px_rgba(255,212,0,0.5)]">T</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Bienvenida TAD</span>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-white uppercase italic">
              Configura tu <span className="text-[#FFD400]">primera campaña</span>
            </h2>
          </div>

          {/* Progress */}
          <div className="mb-7 flex items-center gap-2">
            {steps.map((label, i) => (
              <React.Fragment key={label}>
                <div className="flex items-center gap-1.5">
                  <motion.div
                    animate={
                      i === step
                        ? { boxShadow: ['0 0 0 0 rgba(255,212,0,0.4)', '0 0 0 6px rgba(255,212,0,0)', '0 0 0 0 rgba(255,212,0,0)'] }
                        : { boxShadow: '0 0 0 0 rgba(255,212,0,0)' }
                    }
                    transition={i === step ? { duration: 1.8, repeat: Infinity } : { duration: 0.2 }}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-black transition-colors ${
                      i < step
                        ? 'border-[#FFD400] bg-[#FFD400] text-black'
                        : i === step
                          ? 'border-[#FFD400] bg-[#FFD400]/10 text-[#FFD400]'
                          : 'border-white/15 bg-transparent text-white/30'
                    }`}
                  >
                    {i < step ? <Check className="h-3 w-3" /> : i + 1}
                  </motion.div>
                  <span className={`hidden text-[10px] font-bold uppercase tracking-wider sm:block ${i <= step ? 'text-white/70' : 'text-white/30'}`}>
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="relative h-px flex-1 overflow-visible bg-white/10">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-[#FFD400] shadow-[0_0_8px_rgba(255,212,0,0.6)]"
                      initial={false}
                      animate={{ width: i < step ? '100%' : '0%' }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ─── PASO 1: Ciudad objetivo ─── */}
            {step === 0 && (
              <motion.div key="step-city" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
                <p className="mb-4 text-sm text-white/60">¿En qué ciudad quieres impactar a tus clientes?</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {CITIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      aria-pressed={city === c}
                      className={`group relative flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                        city === c
                          ? 'border-[#FFD400]/70 bg-[#FFD400]/10 shadow-[0_0_32px_rgba(255,212,0,0.15),inset_0_1px_0_rgba(255,255,255,0.08)]'
                          : 'border-white/10 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-white/25 hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${city === c ? 'bg-[#FFD400] text-black shadow-[0_0_18px_rgba(255,212,0,0.4)]' : 'bg-white/5 text-white/60 group-hover:text-white'}`}>
                        <MapPin className="h-5 w-5" />
                      </span>
                      <span>
                        <span className={`block text-sm font-black ${city === c ? 'text-[#FFD400]' : 'text-white'}`}>{c}</span>
                        <span className="block text-[11px] text-white/40">Flota activa DOOH</span>
                      </span>
                      {city === c && (
                        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#FFD400] text-black">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={!city}
                  onClick={() => setStep(1)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD400] to-[#ffdd33] py-3.5 text-sm font-black uppercase tracking-wide text-black shadow-[0_0_30px_rgba(255,212,0,0.22)] transition-all hover:scale-[1.015] hover:shadow-[0_0_44px_rgba(255,212,0,0.35)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {/* ─── PASO 2: Slider de presupuesto ─── */}
            {step === 1 && (
              <motion.div key="step-budget" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
                <p className="mb-4 text-sm text-white/60">
                  Define tu inversión mensual en <span className="font-bold text-white">{city}</span>.
                </p>

                <div className="rounded-2xl border border-white/5 bg-black/30 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm">
                  <div className="mb-5 text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Presupuesto mensual</span>
                    <motion.p
                      key={budget}
                      initial={{ scale: 0.97, opacity: 0.7 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.18 }}
                      className="text-5xl font-black tracking-tight text-[#FFD400] drop-shadow-[0_0_20px_rgba(255,212,0,0.25)]"
                    >
                      {formatRD(budget)}
                    </motion.p>
                  </div>

                  <input
                    type="range"
                    min={BUDGET_MIN}
                    max={BUDGET_MAX}
                    step={BUDGET_STEP}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    aria-label="Presupuesto mensual en pesos dominicanos"
                    className="tad-range"
                    style={{ '--fill': `${fillPct}%` } as React.CSSProperties}
                  />
                  <div className="mt-2 flex justify-between text-[10px] font-bold text-white/30">
                    <span>{formatRD(BUDGET_MIN)}</span>
                    <span>{formatRD(BUDGET_MAX)}</span>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/50">
                    {simulating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FFD400]" />
                        Calculando cobertura…
                      </>
                    ) : simulation ? (
                      <>
                        <MonitorSmartphone className="h-3.5 w-3.5 text-[#FFD400]" />
                        {formatNum(simulation.recommendedScreens)} pantallas recomendadas · {formatNum(simulation.onlineScreensInZone)} disponibles en zona
                      </>
                    ) : (
                      <span>Ajusta el slider para simular tu cobertura</span>
                    )}
                  </div>
                </div>

                {simError ? (
                  <p className="animate-fade-in mt-3 flex items-center gap-1.5 text-xs text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> {simError}
                  </p>
                ) : null}

                <button
                  type="button"
                  disabled={simulating || (!simulation && !simError)}
                  onClick={() => setStep(2)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD400] to-[#ffdd33] py-3.5 text-sm font-black uppercase tracking-wide text-black shadow-[0_0_30px_rgba(255,212,0,0.22)] transition-all hover:scale-[1.015] hover:shadow-[0_0_44px_rgba(255,212,0,0.35)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  Ver proyección
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="mt-2 w-full py-1 text-xs font-semibold text-white/40 transition-colors hover:text-white/70"
                >
                  ← Cambiar ciudad
                </button>
              </motion.div>
            )}

            {/* ─── PASO 3: Proyecciones ─── */}
            {step === 2 && (
              <motion.div key="step-projection" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
                <p className="mb-4 text-sm text-white/60">
                  Proyección estimada con {formatRD(budget)} en <span className="font-bold text-white">{simulation?.city || city}</span>:
                </p>

                {simulation ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      { icon: Eye, value: formatNum(simulation.uniqueReach), label: 'Alcance único' },
                      { icon: Zap, value: formatNum(simulation.totalImpressions), label: 'Impresiones' },
                      { icon: MonitorSmartphone, value: formatNum(simulation.recommendedScreens), label: 'Pantallas' },
                    ].map(({ icon: Icon, value, label }) => (
                      <div
                        key={label}
                        className="group rounded-2xl border border-white/5 bg-white/[0.04] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FFD400]/30 hover:bg-white/[0.06] hover:shadow-[0_0_28px_rgba(255,212,0,0.1)]"
                      >
                        <Icon className="animate-float mx-auto mb-2 h-5 w-5 text-[#FFD400] drop-shadow-[0_0_8px_rgba(255,212,0,0.45)]" />
                        <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">{value}</p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center text-xs text-red-300">
                    <AlertTriangle className="mx-auto mb-2 h-5 w-5" />
                    No hay proyección disponible. Vuelve al paso anterior e intenta de nuevo.
                  </div>
                )}

                <button
                  type="button"
                  disabled={!simulation}
                  onClick={completeOnboarding}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD400] to-[#ffdd33] py-3.5 text-sm font-black uppercase tracking-wide text-black shadow-[0_0_36px_rgba(255,212,0,0.3)] transition-all hover:scale-[1.015] hover:shadow-[0_0_52px_rgba(255,212,0,0.45)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  <Building2 className="h-4 w-4" />
                  Comenzar a anunciar
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="mt-2 w-full py-1 text-xs font-semibold text-white/40 transition-colors hover:text-white/70"
                >
                  ← Ajustar presupuesto
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Marca inferior */}
          <div className="mt-7 border-t border-white/5 pt-4 text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-white/25">TAD Node OS · Ecosystem Revision 04</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
