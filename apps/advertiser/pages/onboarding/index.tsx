import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';

// Lazy loading the steps to reduce initial bundle size as requested
const BrandIdentityStep = dynamic(() => import('../../components/onboarding/BrandIdentityStep').then(mod => mod.BrandIdentityStep), { ssr: false });
const ImpactSimulatorStep = dynamic(() => import('../../components/onboarding/ImpactSimulatorStep').then(mod => mod.ImpactSimulatorStep), { ssr: false });
const CampaignAcceleratorStep = dynamic(() => import('../../components/onboarding/CampaignAcceleratorStep').then(mod => mod.CampaignAcceleratorStep), { ssr: false });

export default function AdvertiserOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({});
  const totalSteps = 3;

  const handleNext = (stepData: any) => {
    setOnboardingData(prev => ({ ...prev, ...stepData }));
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleComplete = (finalData: any) => {
    const fullData = { ...onboardingData, ...finalData };
    console.log("Onboarding completed with data:", fullData);
    // Redirect to dashboard or finish onboarding flow
    // window.location.href = '/dashboard';
  };

  return (
    <OnboardingLayout currentStep={currentStep} totalSteps={totalSteps}>
      {currentStep === 1 && <BrandIdentityStep onNext={handleNext} />}
      {currentStep === 2 && <ImpactSimulatorStep onNext={handleNext} onBack={handleBack} />}
      {currentStep === 3 && <CampaignAcceleratorStep onComplete={handleComplete} onBack={handleBack} onSkip={() => handleComplete({ campaignFile: null })} />}
    </OnboardingLayout>
  );
}
