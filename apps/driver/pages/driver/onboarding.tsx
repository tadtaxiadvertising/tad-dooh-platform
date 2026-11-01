"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import api from "@tad/services";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import ValuePropStep from "@/components/onboarding/ValuePropStep";
import EarningsCalculatorStep from "@/components/onboarding/EarningsCalculatorStep";
import RegistrationStep from "@/components/onboarding/RegistrationStep";
import SuccessStep from "@/components/onboarding/SuccessStep";
import { previewDriverEarnings } from "../../lib/earningsPreview";

type OnboardingStep = 1 | 2 | 3 | 4;


export default function DriverOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [mounted, setMounted] = useState(false);

  // Simulator states
  const [campaigns, setCampaigns] = useState(5);
  const [referredDrivers, setReferredDrivers] = useState(0);
  const [approvedSales, setApprovedSales] = useState(0);
  // The wizard and landing share the same capped and distinct revenue streams.
  const earningsPreview = previewDriverEarnings(campaigns, approvedSales, referredDrivers);

  // Registration fields
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    cedula: "",
    taxiPlate: "",
    password: "",
    agreements: {
      contract: false,
      hardware_liability: false,
      representative: false,
      membership: false,
    },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredDriver, setRegisteredDriver] = useState<{
    fullName: string;
    taxiPlate: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const nextStep = () => setStep((s) => Math.min(s + 1, 4) as OnboardingStep);
  const prevStep = () => setStep((s) => Math.max(s - 1, 1) as OnboardingStep);
  const goToLogin = () => router.push("/driver/login");

  const handleFormChange = (
    field: string,
    value: string | boolean | object,
  ) => {
    setFormData((prev) => {
      if (
        field === "agreements" &&
        typeof value === "object" &&
        value !== null
      ) {
        return {
          ...prev,
          agreements: {
            ...prev.agreements,
            ...(value as Record<string, boolean>),
          },
        };
      }
      return { ...prev, [field]: value };
    });
    if (error) setError("");
  };

  const handleRegister = async (data: typeof formData) => {
    setError("");

    if (
      !data.fullName ||
      !data.phone ||
      !data.cedula ||
      !data.taxiPlate ||
      !data.password
    ) {
      setError("Todos los campos son obligatorios");
      return;
    }

    const allAgreed = Object.values(data.agreements).every((v) => v);
    if (!allAgreed) {
      setError("Debes aceptar todos los acuerdos para continuar");
      return;
    }

    if (data.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/drivers", {
        fullName: data.fullName,
        phone: data.phone,
        cedula: data.cedula,
        taxiPlate: data.taxiPlate,
        password: data.password,
        contractAccepted: true,
        agreementVersion: "2.0 (HaaS)",
        subscriptionPaid: false,
        representativeAccepted: data.agreements.representative,
        hardwareLiabilityAccepted: data.agreements.hardware_liability,
        membershipAccepted: data.agreements.membership,
      });

      if (res.status === 201 || res.status === 200) {
        setRegisteredDriver({
          fullName: data.fullName,
          taxiPlate: data.taxiPlate,
        });
        setTimeout(() => setStep(4), 1000);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Error al registrar";
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  const TOTAL_STEPS = 4;

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return <ValuePropStep onNext={nextStep} />;
      case 2:
        return (
          <EarningsCalculatorStep
            onNext={nextStep}
            onPrev={prevStep}
            campaigns={campaigns}
            setCampaigns={setCampaigns}
            referredDrivers={referredDrivers}
            setReferredDrivers={setReferredDrivers}
            approvedSales={approvedSales}
            setApprovedSales={setApprovedSales}
            earningsPreview={earningsPreview}
          />
        );
      case 3:
        return (
          <RegistrationStep
            onNext={nextStep}
            onPrev={prevStep}
            onRegister={handleRegister}
            isLoading={loading}
            error={error}
            formData={formData}
            onFormChange={handleFormChange}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
        );
      case 4:
        return (
          <SuccessStep
            onContinue={goToLogin}
            driverData={registeredDriver || undefined}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <OnboardingWizard
        step={step}
        totalSteps={TOTAL_STEPS}
        onNext={nextStep}
        onPrev={prevStep}
        onClose={goToLogin}
        stepLabels={["Bienvenida", "Simulador", "Registro", "Éxito"]}
      >
        {renderStepContent()}
      </OnboardingWizard>
      <p className="text-[9px] text-zinc-600 font-mono tracking-widest mt-4">
        Proyecto TAD (Taxi Advertising) · IBUSIN3SS SRL
      </p>
    </>
  );
}
