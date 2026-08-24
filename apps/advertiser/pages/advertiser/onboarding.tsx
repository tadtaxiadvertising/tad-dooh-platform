import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import { ChevronLeft, CheckCircle2, Zap, ArrowRight } from 'lucide-react';
import BenefitsStep from '../../components/advertiser/BenefitsStep';
import SimulatorStep, { SimulatorConfig } from '../../components/advertiser/SimulatorStep';
import CommitmentStep, {
  CommitmentAgreements,
  CommitmentForm,
} from '../../components/advertiser/CommitmentStep';
import { estimateCampaign } from '../../components/advertiser/simulatorPricing';
import { captureReferralCode, clearReferralCode } from '../../components/advertiser/referral';

type OnboardingStep = 1 | 2 | 3 | 4;

const EMPTY_FORM: CommitmentForm = {
  rnc: '',
  repName: '',
  companyName: '',
  email: '',
  phone: '',
  password: '',
};

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function AdvertiserOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [mounted, setMounted] = useState(false);

  const [simulator, setSimulator] = useState<SimulatorConfig>({
    screens: 1,
    months: 1,
    frequencySeconds: 30,
    includeProduction: true,
  });
  const [form, setForm] = useState<CommitmentForm>(EMPTY_FORM);
  const [agreements, setAgreements] = useState<CommitmentAgreements>({
    representative: false,
    terms: false,
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    captureReferralCode();
  }, []);

  const estimate = estimateCampaign(simulator);

  const nextStep = () => setStep((s) => Math.min(s + 1, 4) as OnboardingStep);
  const prevStep = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1) as OnboardingStep);
  };

  const validateCommitment = (): string => {
    if (
      !form.rnc.trim() ||
      !form.repName.trim() ||
      !form.companyName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.password
    ) {
      return 'Todos los campos son obligatorios';
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      return 'Ingresa un correo corporativo válido';
    }
    if (form.password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    if (!agreements.representative || !agreements.terms) {
      return 'Debes confirmar ambas casillas para continuar';
    }
    return '';
  };

  const handleSubmit = async () => {
    const validationError = validateCommitment();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/proxy/onboarding/advertiser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.repName.trim(),
          companyName: form.companyName.trim(),
          rnc: form.rnc.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          budget: estimate.total,
          expectedScreens: simulator.screens,
          targetCity: 'Santo Domingo',
          campaignMonths: simulator.months,
          frequencySeconds: simulator.frequencySeconds,
          includeProduction: simulator.includeProduction,
          referralCode: captureReferralCode() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const serverMessage = Array.isArray(data?.message) ? data.message[0] : data?.message;

      if (!res.ok) {
        throw new Error(serverMessage || 'No pudimos registrar tu campaña. Intenta de nuevo.');
      }

      clearReferralCode();
      setTimeout(() => setStep(4), 600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const TOTAL_STEPS = 4;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-[#121212] flex flex-col items-center relative overflow-x-hidden font-sans selection:bg-[#FDCB01] selection:text-black">
      <Head>
        <title>Onboarding | TAD Ad — Anunciantes</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Lanza tu marca en las pantallas HD de la red de taxis TAD. Simula tu campaña y asegura tu cobertura geolocalizada."
        />
      </Head>

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70vw] h-[35vh] bg-[#FDCB01]/[0.05] blur-[130px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[50vw] h-[50vh] bg-[#22C55E]/[0.04] blur-[110px] rounded-full" />
      </div>

      <div className="w-full max-w-lg sm:max-w-2xl px-4 pt-4 pb-2 flex items-center justify-between relative z-10">
        <button
          onClick={() => (step > 1 ? prevStep() : router.push('/advertiser/login'))}
          aria-label="Atrás"
          className="w-11 h-11 grid place-items-center rounded-xl bg-white/[0.04] border border-white/10 text-[#AAAAAA] hover:text-white hover:bg-white/10 active:scale-90 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={clsx(
                'h-1 rounded-full transition-all duration-500',
                step >= i
                  ? 'bg-[#FDCB01] w-8 shadow-[0_0_12px_rgba(253,203,1,0.45)]'
                  : 'bg-white/10 w-4',
              )}
            />
          ))}
        </div>

        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest tabular-nums">
          {step}/{TOTAL_STEPS}
        </span>
      </div>

      <div
        className={clsx(
          'flex-1 w-full max-w-lg sm:max-w-2xl px-4 pb-10 flex flex-col transition-all duration-700 relative z-10',
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        )}
      >
        {step === 1 && <BenefitsStep onNext={nextStep} />}

        {step === 2 && (
          <SimulatorStep
            config={simulator}
            onChange={(patch) => setSimulator((prev) => ({ ...prev, ...patch }))}
            onNext={nextStep}
          />
        )}

        {step === 3 && (
          <CommitmentStep
            form={form}
            onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            agreements={agreements}
            onAgreementsChange={(patch) => setAgreements((prev) => ({ ...prev, ...patch }))}
            campaignSummary={{
              screens: simulator.screens,
              months: simulator.months,
              budget: estimate.total,
            }}
            onSubmit={handleSubmit}
            onPrev={prevStep}
            isLoading={loading}
            error={error}
          />
        )}

        {step === 4 && (
          <div className="animate-zoom-in flex-1 flex flex-col items-center justify-center text-center py-10">
            <div className="relative mb-8">
              <div className="absolute inset-0 w-28 h-28 border-2 border-[#FDCB01]/25 rounded-full animate-ping" />
              <div className="absolute inset-0 w-28 h-28 border border-[#FDCB01]/15 rounded-full scale-125" />
              <div className="w-28 h-28 bg-[#FDCB01]/10 rounded-full grid place-items-center">
                <CheckCircle2 className="w-14 h-14 text-[#FDCB01]" />
              </div>
            </div>

            <h1 className="text-[26px] sm:text-4xl font-black text-white uppercase tracking-tight leading-tight mb-3">
              Tu campaña<br />está asegurada
            </h1>
            <p className="text-sm text-[#AAAAAA] max-w-[320px] leading-relaxed mb-8">
              Registramos tu intención con éxito. Un consultor TAD activará tu plan y coordinará la
              puesta en vía de tus pantallas.
            </p>

            <div className="w-full bg-black/60 rounded-xl p-5 sm:p-6 border border-white/10 text-left space-y-2 mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40">
                  Resumen de registro
                </span>
                <span className="bg-[#FDCB01]/10 text-[#FDCB01] text-[9px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                  Pendiente de pago
                </span>
              </div>
              <p className="text-white font-bold text-lg">{form.companyName}</p>
              <p className="text-xs text-[#AAAAAA]">
                {simulator.screens} pantallas · {simulator.months} mes{simulator.months > 1 ? 'es' : ''} ·{' '}
                {estimate.impressions.toLocaleString()} impactos estimados
              </p>
              <div className="mt-3 pt-3 border-t border-white/[0.06] flex justify-between items-center">
                <span className="text-xs text-[#AAAAAA]">Presupuesto estimado:</span>
                <span className="text-xl font-black text-white tabular-nums">
                  RD$ {estimate.total.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                <Zap className="w-3 h-3 text-[#FDCB01]" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest">
                  Red DOOH · Flota Dominicana
                </span>
              </div>
            </div>

            <button
              onClick={() => router.push('/advertiser/login')}
              className="w-full min-h-[52px] bg-[#FDCB01] hover:bg-white text-black font-black uppercase tracking-[0.12em] text-sm py-4 rounded-xl transition-all active:scale-[0.98] shadow-[0_0_44px_rgba(253,203,1,0.28)] flex items-center justify-center gap-3"
            >
              <span>Ir a iniciar sesión</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="pt-6 text-center">
          <p className="text-[8px] text-white/20 font-bold uppercase tracking-[0.5em]">
            TAD Technologies © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
