// frontend/src/pages/advertiser/onboarding.tsx
import React from 'react';
import Head from 'next/head';
import OnboardingWizard from '../../components/advertiser/OnboardingWizard';

export default function AdvertiserOnboarding() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <Head>
        <title>Onboarding - TAD DOOH</title>
        <meta name="description" content="Advertiser Onboarding para TAD Platform" />
      </Head>
      
      <div className="w-full max-w-2xl text-center mb-8">
        <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
          TU CAMPAÑA EN <span className="text-[#fad400]">60 SEGUNDOS</span>
        </h1>
        <p className="text-slate-400">
          Registra tu marca, define tu alcance y sube tu contenido. Fácil y rápido.
        </p>
      </div>

      <OnboardingWizard />
    </div>
  );
}
