'use client';

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import BenefitsStep from '@/components/onboarding/BenefitsStep';
import SimulatorStep, { SimulatorConfig } from '@/components/onboarding/SimulatorStep';
import CommitmentStep, {
  CommitmentAgreements,
  CommitmentForm,
} from '@/components/onboarding/CommitmentStep';
import SuccessStep from '@/components/onboarding/SuccessStep';
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
    content_policy: false,
    data_processing: false,
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [campaignData, setCampaignData] = useState<{
    companyName: string;
    screens: number;
    months: number;
    budget: number;
    impressions: number;
  } | null>(null);

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
  const goToLogin = () => router.push('/advertiser/login');

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
    if (!agreements.representative || !agreements.terms || !agreements.content_policy || !agreements.data_processing) {
      return 'Debes confirmar todas las casillas para continuar';
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
      setCampaignData({
        companyName: form.companyName.trim(),
        screens: simulator.screens,
        months: simulator.months,
        budget: estimate.total,
        impressions: estimate.impressions,
      });
      setTimeout(() => setStep(4), 600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const TOTAL_STEPS = 4;

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return <BenefitsStep onNext={nextStep} />;
      case 2:
        return (
          <SimulatorStep
            config={simulator}
            onChange={(patch) => setSimulator((prev) => ({ ...prev, ...patch }))}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 3:
        return (
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
        );
      case 4:
        return <SuccessStep onContinue={goToLogin} campaignData={campaignData || undefined} />;
      default:
        return null;
    }
  };

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

      <OnboardingWizard
        step={step}
        totalSteps={TOTAL_STEPS}
        onNext={nextStep}
        onPrev={prevStep}
        onClose={goToLogin}
        stepLabels={['Beneficios', 'Simulador', 'Compromiso', 'Éxito']}
      >
        {renderStepContent()}
      </OnboardingWizard>
    </div>
  );
}