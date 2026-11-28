"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import clsx from "clsx";

interface OnboardingWizardProps<T extends number> {
  step: T;
  totalSteps: number;
  children: React.ReactNode;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  stepLabels?: string[];
  className?: string;
  navigationLocked?: boolean;
}

export function OnboardingWizard<T extends number>({
  step,
  totalSteps,
  children,
  onPrev,
  onClose,
  stepLabels,
  className,
  navigationLocked = false,
}: OnboardingWizardProps<T>) {
  const reduceMotion = useReducedMotion();
  const content = useRef<HTMLDivElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    const before = previousStep.current;
    previousStep.current = step;
    if (before === step || reduceMotion !== false || !content.current?.animate)
      return;
    const feedback = content.current.animate(
      [
        { transform: `translateX(${step > before ? 12 : -12}px)` },
        { transform: "translateX(0)" },
      ],
      { duration: 180, easing: "ease-out" },
    );
    return () => feedback.cancel();
  }, [step, reduceMotion]);

  return (
    <div
      className={clsx(
        "min-h-screen bg-[#0a0a0a] flex flex-col items-center relative overflow-hidden font-sans",
        className,
      )}
    >
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-tad-yellow/[0.04] blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#22C55E]/[0.03] blur-[100px] rounded-full" />
      </div>
      <div className="w-full max-w-lg px-4 pt-4 pb-2 flex items-center justify-between relative z-10">
        <button
          type="button"
          aria-label={step > 1 ? "Volver al paso anterior" : "Volver al acceso"}
          disabled={navigationLocked}
          onClick={() => {
            if (!navigationLocked) (step > 1 ? onPrev : onClose)();
          }}
          className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FDCB01] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <ol
          aria-label="Progreso de incorporación"
          className="flex items-center gap-1.5 flex-1 max-w-md mx-4"
        >
          {Array.from({ length: totalSteps }, (_, index) => index + 1).map(
            (index) => (
              <li
                key={index}
                aria-current={step === index ? "step" : undefined}
              >
                <span className="sr-only">
                  {index}. {stepLabels?.[index - 1] || `Paso ${index}`}
                </span>
                <span
                  aria-hidden="true"
                  className={clsx(
                    "block h-1 rounded-full",
                    step >= index ? "bg-[#FDCB01] w-8" : "bg-white/10 w-4",
                  )}
                />
              </li>
            ),
          )}
        </ol>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest tabular-nums w-16 text-right">
          {step}/{totalSteps}
        </span>
      </div>
      <div className="flex-1 w-full max-w-lg px-4 pb-8 flex flex-col relative z-10">
        <div key={step} ref={content} className="flex-1 flex flex-col">
          {children}
        </div>
        <div className="pt-6 text-center">
          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-[0.5em]">
            TAD TECHNOLOGIES © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
