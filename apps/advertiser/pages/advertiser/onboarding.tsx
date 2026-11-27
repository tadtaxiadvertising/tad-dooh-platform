"use client";

import React, { useEffect, useRef, useState } from "react";
import type { AdvertiserOffer } from "@tad/impact-calculator";
import Head from "next/head";
import { useRouter } from "next/router";
import "clsx";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import BenefitsStep from "@/components/onboarding/BenefitsStep";
import SimulatorStep, {
  SimulatorConfig,
} from "@/components/onboarding/SimulatorStep";
import CommitmentStep, {
  CommitmentAgreements,
  CommitmentForm,
} from "@/components/onboarding/CommitmentStep";
import SuccessStep from "@/components/onboarding/SuccessStep";
import { estimateCampaign } from "../../components/advertiser/simulatorPricing";
import {
  campaignDraftFromSearch,
  CITIES,
  type DemoCity,
} from "../../lib/landing/model";
import {
  captureReferralCode,
  clearReferralCode,
} from "../../components/advertiser/referral";

type OnboardingStep = 1 | 2 | 3 | 4;

const EMPTY_FORM: CommitmentForm = {
  rnc: "",
  repName: "",
  companyName: "",
  email: "",
  phone: "",
  password: "",
};

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function AdvertiserOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [referralCode, setReferralCode] = useState("");
  const [quoteState, setQuoteState] = useState<{
    key: string;
    offer: AdvertiserOffer;
  } | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<
    "none" | "checking" | "verified" | "invalid" | "error"
  >("none");

  const [simulator, setSimulator] = useState<SimulatorConfig>({
    screens: 1,
    months: 1,
    frequencySeconds: 30,
    includeProduction: false, // Opcional, desactivado por defecto
  });
  const [city, setCity] = useState<DemoCity>("sd");
  const [form, setForm] = useState<CommitmentForm>(EMPTY_FORM);
  const [agreements, setAgreements] = useState<CommitmentAgreements>({
    representative: false,
    terms: false,
    content_policy: false,
    data_processing: false,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Synchronous lock covers repeated events before React commits loading state.
  const submissionLocked = useRef(false);
  const [campaignData, setCampaignData] = useState<{
    companyName: string;
    screens: number;
    months: number;
    budget: number;
    impressions: number;
  } | null>(null);

  useEffect(() => {
    setReferralCode(captureReferralCode() || "");
    const draft = campaignDraftFromSearch(window.location.search);
    if (draft) {
      setCity(draft.city);
      setSimulator((current) => ({
        ...current,
        screens: draft.screens,
        months: draft.months,
      }));
    }
  }, []);

  const quoteKey = `${referralCode}:${simulator.screens}:${simulator.months}:${simulator.includeProduction}`;
  const verifiedOffer = quoteState?.key === quoteKey ? quoteState.offer : null;
  const effectiveQuoteStatus = !referralCode
    ? "none"
    : verifiedOffer
      ? "verified"
      : quoteStatus === "verified"
        ? "checking"
        : quoteStatus;

  // A code in a URL or in an input is never proof of eligibility.
  // The API resolves it against the Driver table; stale responses are ignored.
  useEffect(() => {
    setQuoteState(null);
    if (!referralCode) {
      setQuoteStatus("none");
      return;
    }
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(referralCode)) {
      setQuoteStatus("invalid");
      return;
    }
    setQuoteStatus("checking");
    const abort = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/proxy/onboarding/advertiser/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abort.signal,
          body: JSON.stringify({
            expectedScreens: simulator.screens,
            campaignMonths: simulator.months,
            includeProduction: simulator.includeProduction,
            referralCode,
          }),
        });
        if (!res.ok) {
          if (res.status === 400) {
            if (!abort.signal.aborted) setQuoteStatus("invalid");
            return;
          }
          throw new Error("Quote API unavailable");
        }
        const offer: AdvertiserOffer = await res.json();
        if (
          offer.pricingVersion !== "TAD-2026-11-18-DRIVER40" ||
          offer.verifiedDriverCode !== true ||
          offer.screens !== simulator.screens ||
          offer.months !== simulator.months ||
          !Number.isFinite(offer.subtotal)
        ) {
          throw new Error("Unexpected quote response");
        }
        if (!abort.signal.aborted) {
          setQuoteState({ key: quoteKey, offer });
          setQuoteStatus("verified");
        }
      } catch {
        if (!abort.signal.aborted) setQuoteStatus("error");
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [
    quoteKey,
    referralCode,
    simulator.screens,
    simulator.months,
    simulator.includeProduction,
  ]);

  const estimate = estimateCampaign(simulator);
  const displayedBudget = verifiedOffer?.subtotal ?? estimate.total;

  const nextStep = () => setStep((s) => Math.min(s + 1, 4) as OnboardingStep);
  const prevStep = () => {
    if (submissionLocked.current) return;
    setError("");
    setStep((s) => Math.max(s - 1, 1) as OnboardingStep);
  };
  const goToLogin = () => router.push("/advertiser/login");

  // La finalización visual del wizard no autoriza activar la cuenta.
  // El anunciante permanece PENDING_REVIEW hasta aprobación del servidor.
  const handleOnboardingComplete = () => {
    router.push("/advertiser/login");
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
      return "Todos los campos son obligatorios";
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      return "Ingresa un correo corporativo válido";
    }
    if (form.password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres";
    }
    if (
      !agreements.representative ||
      !agreements.terms ||
      !agreements.content_policy ||
      !agreements.data_processing
    ) {
      return "Debes confirmar todas las casillas para continuar";
    }
    return "";
  };

  const handleSubmit = async () => {
    if (submissionLocked.current) return;
    if (
      referralCode &&
      (!verifiedOffer || effectiveQuoteStatus !== "verified")
    ) {
      setError(
        "Verifica tu código de conductor o elimínalo para continuar sin descuento.",
      );
      return;
    }
    const validationError = validateCommitment();
    if (validationError) {
      setError(validationError);
      return;
    }

    submissionLocked.current = true;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/proxy/onboarding/advertiser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.repName.trim(),
          companyName: form.companyName.trim(),
          rnc: form.rnc.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          budget: displayedBudget,
          expectedScreens: simulator.screens,
          targetCity: CITIES[city],
          campaignMonths: simulator.months,
          frequencySeconds: simulator.frequencySeconds,
          includeProduction: simulator.includeProduction,
          referralCode: referralCode || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const serverMessage = Array.isArray(data?.message)
        ? data.message[0]
        : data?.message;

      if (!res.ok) {
        throw new Error(
          serverMessage || "No pudimos registrar tu campaña. Intenta de nuevo.",
        );
      }

      clearReferralCode();
      // Use the server's recomputed offer, never a client-side price claim.
      const recordedBudget =
        typeof data?.quote?.subtotal === "number"
          ? data.quote.subtotal
          : displayedBudget;
      setCampaignData({
        companyName: form.companyName.trim(),
        screens: simulator.screens,
        months: simulator.months,
        budget: recordedBudget,
        impressions: estimate.impressions,
      });
      // Keep the lock after a successful request and transition immediately.
      setStep(4);
    } catch (err: unknown) {
      submissionLocked.current = false;
      setError(
        err instanceof Error ? err.message : "Ocurrió un error inesperado.",
      );
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
            city={city}
            onCityChange={setCity}
            onChange={(patch) =>
              setSimulator((prev) => ({ ...prev, ...patch }))
            }
            onNext={nextStep}
            onPrev={prevStep}
            referralCode={referralCode}
            onReferralCodeChange={(code) => {
              setReferralCode(code);
              if (!code) clearReferralCode();
            }}
            verifiedOffer={verifiedOffer}
            quoteStatus={effectiveQuoteStatus}
          />
        );
      case 3:
        return (
          <CommitmentStep
            form={form}
            onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            agreements={agreements}
            onAgreementsChange={(patch) =>
              setAgreements((prev) => ({ ...prev, ...patch }))
            }
            campaignSummary={{
              screens: simulator.screens,
              months: simulator.months,
              city: CITIES[city],
              budget: displayedBudget,
            }}
            onSubmit={handleSubmit}
            onPrev={prevStep}
            isLoading={loading}
            error={error}
          />
        );
      case 4:
        return (
          <SuccessStep
            onContinue={handleOnboardingComplete}
            campaignData={campaignData || undefined}
          />
        );
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
        navigationLocked={loading || step === 4}
        stepLabels={["Beneficios", "Simulador", "Compromiso", "Éxito"]}
      >
        {renderStepContent()}
      </OnboardingWizard>
    </div>
  );
}
