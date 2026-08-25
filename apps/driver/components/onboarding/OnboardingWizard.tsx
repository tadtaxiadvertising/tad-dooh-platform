'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
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
  const direction = step > (step - 1) ? 1 : -1;

  return (
    <div className={clsx('min-h-screen bg-[#0a0a0a] flex flex-col items-center relative overflow-hidden font-sans', className)}>
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-tad-yellow/[0.04] blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#22C55E]/[0.03] blur-[100px] rounded-full" />
      </div>

      {/* Top Nav Bar */}
      <div className="w-full max-w-lg px-4 pt-4 pb-2 flex items-center justify-between relative z-10">
        <motion.button
          onClick={() => step > 1 ? onPrev() : onClose()}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        {/* Progress Bar with layoutId */}
        <motion.div className="flex items-center gap-1.5 flex-1 max-w-md mx-4" layout>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((i) => (
            <motion.div
              key={i}
              layoutId={`progress-${i}`}
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

        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest tabular-nums w-16 text-right">
          {step}/{totalSteps}
        </span>
      </div>

      {/* Content with AnimatePresence for step transitions */}
      <div className="flex-1 w-full max-w-lg px-4 pb-8 flex flex-col relative z-10">
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

        {/* Footer */}
        <div className="pt-6 text-center">
          <p className="text-[8px] text-gray-700 font-bold uppercase tracking-[0.5em]">
            TAD TECHNOLOGIES © 2026
          </p>
        </div>
      </div>
    </div>
  );
}