'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ArrowRight, Sparkles, Calculator, TrendingUp, FileText, BadgeCheck } from 'lucide-react';
import clsx from 'clsx';

interface OnboardingWizardProps<T extends number> {
  step: T;
  totalSteps: number;
  children: React.ReactNode;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  stepLabels?: string[];
  className?: string;
}

const stepIcons = [
  Sparkles,
  Calculator,
  TrendingUp,
  BadgeCheck,
];

const stepVariants = {
  enter: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    x: 40,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function OnboardingWizard<T extends number>({
  step,
  totalSteps,
  children,
  onNext,
  onPrev,
  onClose,
  stepLabels,
  className,
}: OnboardingWizardProps<T>) {
  const labels = stepLabels || ['Beneficios', 'Simulador', 'Compromiso', 'Éxito'];

  return (
    <div className={clsx('min-h-screen bg-[#0a0a0a] flex flex-col relative overflow-hidden font-sans', className)}>
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#FDCB01]/[0.04] blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#22C55E]/[0.03] blur-[100px] rounded-full" />
      </div>

      {/* Top Nav Bar */}
      <div className="w-full max-w-6xl px-4 md:px-8 lg:px-12 pt-4 pb-2 flex items-center justify-between relative z-10">
        <motion.button
          onClick={() => step > 1 ? onPrev() : onClose()}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        {/* Progress Bar with layoutId - Desktop: Horizontal with labels, Mobile: Compact */}
        <motion.div className="hidden lg:flex items-center gap-2 flex-1 max-w-2xl mx-8" layout>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((i) => (
            <motion.div
              key={i}
              layoutId={`progress-${i}`}
              className="flex flex-col items-center gap-1.5 flex-1"
            >
              <motion.div
                className={clsx(
                  "h-1.5 rounded-full transition-all duration-500 w-full",
                  step >= i
                    ? "bg-[#FDCB01] shadow-[0_0_12px_rgba(253,203,1,0.4)]"
                    : "bg-white/10"
                )}
                initial={false}
                animate={{ width: step >= i ? '100%' : '0%' }}
              />
              <span className={clsx(
                "text-[9px] font-black uppercase tracking-wider transition-colors whitespace-nowrap",
                step >= i ? "text-[#FDCB01]" : "text-gray-600"
              )}>
                {labels[i - 1]}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile Progress - Compact */}
        <motion.div className="lg:hidden flex items-center gap-1.5 flex-1 max-w-md mx-4" layout>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((i) => (
            <motion.div
              key={i}
              layoutId={`progress-mobile-${i}`}
              className={clsx(
                "h-1 rounded-full transition-all duration-500",
                step >= i
                  ? "bg-[#FDCB01] w-8 shadow-[0_0_12px_rgba(253,203,1,0.4)]"
                  : "bg-white/10 w-4"
              )}
              initial={false}
              animate={{ width: step >= i ? '2rem' : '1rem' }}
            />
          ))}
        </motion.div>

        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest tabular-nums w-16 text-right hidden lg:block">
          {step}/{totalSteps}
        </span>
      </div>

      {/* Content with AnimatePresence for step transitions - Grid Layout for Desktop */}
      <div className="flex-1 w-full max-w-6xl px-4 md:px-8 lg:px-12 pb-8 md:pb-12 lg:pb-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] lg:gap-12 items-start">
          {/* Left Column: Step Content */}
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1 flex flex-col"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Column: Visual Panel / Progress Tracker (Desktop only) */}
          <div className="hidden lg:block relative">
            <div className="sticky top-24">
              <motion.div
                className="stitched-card rounded-3xl p-6 md:p-8 bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {/* Step Indicator Large */}
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#FDCB01]/10 border border-[#FDCB01]/20 mb-4">
                    <motion.span
                      key={step}
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      className="text-3xl md:text-4xl font-black text-[#FDCB01]"
                    >
                      {step}
                    </motion.span>
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mb-2">
                    {labels[step - 1]}
                  </h3>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto">
                    Paso {step} de {totalSteps} — Completa cada sección para activar tu campaña
                  </p>
                </div>

                {/* Visual Illustration per Step */}
                <div className="relative h-64 md:h-80 mb-6">
                  {step === 1 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        className="w-48 h-48 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-[#FDCB01]/20 to-[#FF8C00]/10 blur-xl animate-float"
                      />
                      <motion.div
                        className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-[#121212] to-black border border-white/10 flex items-center justify-center"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
                      >
                        <Sparkles className="w-16 h-16 md:w-20 md:h-20 text-[#FDCB01] drop-shadow-[0_0_20px_rgba(253,203,1,0.5)]" />
                      </motion.div>
                    </div>
                  )}
                  {step === 2 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        className="w-48 h-48 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-[#22C55E]/20 to-[#06B6D4]/10 blur-xl animate-float"
                      />
                      <motion.div
                        className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-[#121212] to-black border border-white/10 flex items-center justify-center"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
                      >
                        <Calculator className="w-16 h-16 md:w-20 md:h-20 text-[#22C55E] drop-shadow-[0_0_20px_rgba(34,197,94,0.5)]" />
                      </motion.div>
                    </div>
                  )}
                  {step === 3 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        className="w-48 h-48 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-[#E51636]/20 to-[#FDCB01]/10 blur-xl animate-float"
                      />
                      <motion.div
                        className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-[#121212] to-black border border-white/10 flex items-center justify-center"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
                      >
                        <FileText className="w-16 h-16 md:w-20 md:h-20 text-[#E51636] drop-shadow-[0_0_20px_rgba(229,22,54,0.5)]" />
                      </motion.div>
                    </div>
                  )}
                  {step === 4 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        className="w-48 h-48 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-[#22C55E]/20 to-[#FDCB01]/10 blur-xl animate-float"
                      />
                      <motion.div
                        className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-[#121212] to-black border border-white/10 flex items-center justify-center"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
                      >
                        <BadgeCheck className="w-16 h-16 md:w-20 md:h-20 text-[#22C55E] drop-shadow-[0_0_20px_rgba(34,197,94,0.5)]" />
                      </motion.div>
                    </div>
                  )}
                </div>

                {/* Key Benefits / Summary */}
                <div className="space-y-4 border-t border-white/10 pt-6">
                  {step < 4 && labels.slice(step).map((label, i) => (
                    <motion.div
                      key={label}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-[#FDCB01]/30 hover:bg-white/[0.05] transition-all"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-500">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-gray-400">{label}</span>
                    </motion.div>
                  ))}
                  {step === 4 && (
                    <motion.div
                      className="flex items-center gap-3 p-4 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E]"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    >
                      <BadgeCheck className="w-6 h-6 shrink-0" />
                      <span className="text-sm font-black">¡Campaña asegurada! Redirigiendo al login...</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 text-center lg:hidden">
          <p className="text-[8px] text-gray-700 font-bold uppercase tracking-[0.5em]">
            TAD TECHNOLOGIES © 2026
          </p>
        </div>
      </div>
    </div>
  );
}