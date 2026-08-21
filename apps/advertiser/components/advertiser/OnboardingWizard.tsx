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
  Sparkles,
} from 'lucide-react';

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
      localStorage.setItem(getOnboardingKey(advertiserId), '1');
    } catch {
      /* noop */
    }
    onComplete();
  };

  const steps = ['Ciudad', 'Presupuesto', 'Proyección'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop glassmorphism */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        role="dialog"
        aria-modal="true"
        aria-label="Bienvenida a TAD Advertiser"
        className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        {/* Glow decorativo TAD Yellow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-[#FFD400]/15 blur-[90px]" aria-hidden="true" />

        <div className="relative px-7 py-8 sm:px-9">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-[#FFD400]" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">Bienvenida TAD</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white uppercase italic mb-5">
            Configura tu <span className="text-[#FFD400]">primera campaña</span>
          </h2>

          {/* Progress */}
          <div className="mb-7 flex items-center gap-2">
            {steps.map((label, i) => (
              <React.Fragment key={label}>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-black transition-colors ${
                      i < step
                        ? 'border-[#FFD400] bg-[#FFD400] text-black'
                        : i === step
                          ? 'border-[#FFD400] text-[#FFD400]'
                          : 'border-white/15 text-white/30'
                    }`}
                  >
                    {i < step ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  <span className={`hidden text-[10px] font-bold uppercase tracking-wider sm:block ${i <= step ? 'text-white/70' : 'text-white/30'}`}>
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-px flex-1 ${i < step ? 'bg-[#FFD400]/60' : 'bg-white/10'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ─── PASO 1: Ciudad objetivo ─── */}
            {step === 0 && (
              <motion.div key="step-city" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
                <p className="mb-4 text-sm text-white/60">¿En qué ciudad quieres impactar a tus clientes?</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {CITIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      aria-pressed={city === c}
                      className={`group flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                        city === c
                          ? 'border-[#FFD400]/70 bg-[#FFD400]/10 shadow-[0_0_24px_rgba(255,212,0,0.12)]'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                      }`}
                    >
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${city === c ? 'bg-[#FFD400] text-black' : 'bg-white/5 text-white/60 group-hover:text-white'}`}>
                        <MapPin className="h-5 w-5" />
                      </span>
                      <span>
                        <span className={`block text-sm font-bold ${city === c ? 'text-[#FFD400]' : 'text-white'}`}>{c}</span>
                        <span className="block text-[11px] text-white/40">Flota activa DOOH</span>
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={!city}
                  onClick={() => setStep(1)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD400] to-[#ffdd33] py-3 text-sm font-black text-black transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {/* ─── PASO 2: Slider de presupuesto ─── */}
            {step === 1 && (
              <motion.div key="step-budget" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
                <p className="mb-4 text-sm text-white/60">
                  Define tu inversión mensual en <span className="font-bold text-white">{city}</span>.
                </p>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-5 backdrop-blur-sm">
                  <div className="mb-4 text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Presupuesto mensual</span>
                    <p className="text-4xl font-black tracking-tight text-[#FFD400]">{formatRD(budget)}</p>
                  </div>

                  <input
                    type="range"
                    min={BUDGET_MIN}
                    max={BUDGET_MAX}
                    step={BUDGET_STEP}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    aria-label="Presupuesto mensual en pesos dominicanos"
                    className="w-full accent-[#FFD400]"
                  />
                  <div className="mt-1 flex justify-between text-[10px] font-bold text-white/30">
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
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> {simError}
                  </p>
                ) : null}

                <button
                  type="button"
                  disabled={simulating || (!simulation && !simError)}
                  onClick={() => setStep(2)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD400] to-[#ffdd33] py-3 text-sm font-black text-black transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
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
              <motion.div key="step-projection" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
                <p className="mb-4 text-sm text-white/60">
                  Proyección estimada con {formatRD(budget)} en <span className="font-bold text-white">{simulation?.city || city}</span>:
                </p>

                {simulation ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center backdrop-blur-sm">
                      <Eye className="mx-auto mb-2 h-5 w-5 text-[#FFD400]" />
                      <p className="text-xl font-black text-white">{formatNum(simulation.uniqueReach)}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Alcance único</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center backdrop-blur-sm">
                      <Zap className="mx-auto mb-2 h-5 w-5 text-[#FFD400]" />
                      <p className="text-xl font-black text-white">{formatNum(simulation.totalImpressions)}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Impresiones</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center backdrop-blur-sm">
                      <MonitorSmartphone className="mx-auto mb-2 h-5 w-5 text-[#FFD400]" />
                      <p className="text-xl font-black text-white">{formatNum(simulation.recommendedScreens)}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Pantallas</p>
                    </div>
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
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD400] to-[#ffdd33] py-3 text-sm font-black text-black shadow-[0_0_30px_rgba(255,212,0,0.25)] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
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
        </div>
      </motion.div>
    </div>
  );
}
