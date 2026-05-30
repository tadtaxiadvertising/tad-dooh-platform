import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { DriverOnboardingLayout } from '../../components/onboarding/DriverOnboardingLayout';

const FleetProfileStep = dynamic(() => import('../../components/onboarding/FleetProfileStep').then(mod => mod.FleetProfileStep), { ssr: false });
const HardwarePairingStep = dynamic(() => import('../../components/onboarding/HardwarePairingStep').then(mod => mod.HardwarePairingStep), { ssr: false });
const WalletSetupStep = dynamic(() => import('../../components/onboarding/WalletSetupStep').then(mod => mod.WalletSetupStep), { ssr: false });

export default function DriverOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleComplete = (data: any) => {
    console.log("Driver onboarding completed with wallet data:", data);
    // Submit final data and redirect
    // window.location.href = '/driver/hub';
  };

  return (
    <DriverOnboardingLayout currentStep={currentStep} totalSteps={totalSteps}>
      {currentStep === 1 && <FleetProfileStep onNext={handleNext} />}
      {currentStep === 2 && <HardwarePairingStep onNext={handleNext} onBack={handleBack} />}
      {currentStep === 3 && <WalletSetupStep onComplete={handleComplete} onBack={handleBack} />}
    </DriverOnboardingLayout>
  );
}
