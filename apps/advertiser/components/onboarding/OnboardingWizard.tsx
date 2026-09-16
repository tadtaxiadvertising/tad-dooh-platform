'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Maximize2, Minimize2 } from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect } from 'react';

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

const stepLabelsDefault = ['Beneficios', 'Simulador', 'Compromiso', 'Éxito'];

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
  const labels = stepLabels || stepLabelsDefault;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Progress bar line positions - calculated once
  const stepPositions = [0, 33.33, 66.66, 100];

  return (
    <div className={clsx('min-h-screen bg-[#0a0a0a] flex flex-col relative overflow-hidden font-sans', className)}>
      {/* Single Ambient Background - changes with step */}
      <motion.div
        className="fixed inset-0 pointer-events-none -z-20"
        initial={false}
        animate={{
          background: step === 2
            ? 'radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.06) 0%, transparent 70%), radial-gradient(ellipse at 100% 100%, rgba(34,197,94,0.02) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(253,203,1,0.04) 0%, transparent 70%), radial-gradient(ellipse at 100% 100%, rgba(34,197,94,0.02) 0%, transparent 70%)'
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Top Nav Bar */}
      <div className="w-full max-w-7xl px-4 md:px-8 lg:px-12 pt-4 pb-2 flex items-center justify-between relative z-10">
        <motion.button
          onClick={() => step > 1 ? onPrev() : onClose()}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        {/* Progress Bar - Clean horizontal line with step markers */}
        <div className="hidden lg:flex items-center flex-1 max-w-4xl mx-8 relative h-12">
          {/* Base line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-white/10 rounded-full" />
          
          {/* Progress fill - animated */}
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#FDCB01] rounded-full shadow-[0_0_8px_rgba(253,203,1,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${stepPositions[step - 1]}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Step markers */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-between px-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((i) => {
              const isActive = step === i;
              const isCompleted = step > i;
              const isSimulator = i === 2;
              
              return (
                <motion.div
                  key={i}
                  layoutId={`progress-${i}`}
                  className={clsx(
                    "flex flex-col items-center gap-1.5 transition-all duration-500 z-10",
                    isSimulator ? "min-w-[160px]" : "min-w-[100px]"
                  )}
                  style={{ width: isSimulator ? '25%' : '25%' }}
                >
                  <motion.div
                    className={clsx(
                      "rounded-full transition-all duration-500 flex items-center justify-center relative z-10",
                      isSimulator ? "w-12 h-12 md:w-14 md:h-14" : "w-10 h-10 md:w-12 md:h-12",
                      isActive
                        ? "bg-[#FDCB01] text-black shadow-[0_0_24px_rgba(253,203,1,0.7),0_0_40px_rgba(253,203,1,0.3)] ring-4 ring-[#FDCB01]/30"
                        : isCompleted
                          ? "bg-[#22C55E] text-black shadow-[0_0_16px_rgba(34,197,94,0.5)]"
                          : "bg-white/10 text-gray-500 hover:bg-white/20"
                    )}
                    initial={false}
                    animate={{ 
                      scale: isActive ? 1.15 : 1,
                      boxShadow: isActive ? '0 0 32px rgba(253,203,1,0.8), 0 0 64px rgba(253,203,1,0.3)' : undefined
                    }}
                    transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                    whileHover={!isCompleted && !isActive ? { scale: 1.1 } : {}}
                  >
                    {isCompleted ? (
                      <motion.span 
                        key="check"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      >
                        <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      </motion.span>
                    ) : (
                      <span className="font-black text-[12px] md:text-[13px]">{i}</span>
                    )}
                  </motion.div>
                  
                  {/* Labels - always visible for simulator, active for others */}
                  <span className={clsx(
                    "font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 text-center",
                    isSimulator ? "text-[10px] md:text-[11px] text-[#FDCB01]" : 
                    isActive ? "text-[9px] md:text-[10px] text-[#FDCB01]" : 
                    "text-[8px] md:text-[9px] text-gray-500"
                  )}>
                    {labels[i - 1]}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile Progress - Compact */}
        <div className="lg:hidden flex items-center gap-1.5 flex-1 max-w-md mx-4">
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
        </div>

        {/* Step counter */}
        <div className="flex items-center gap-4 hidden lg:flex">
          <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest tabular-nums w-16 text-right">
            {step}/{totalSteps}
          </span>
        </div>
      </div>

      {/* Content - Full width, no side panel */}
      <div className="flex-1 w-full max-w-7xl px-4 md:px-8 lg:px-12 pb-8 md:pb-12 lg:pb-16 relative z-10">
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

        {/* Footer - Mobile only */}
        <div className="pt-6 text-center lg:hidden">
          <p className="text-[8px] text-gray-700 font-bold uppercase tracking-[0.5em]">
            TAD TECHNOLOGIES © 2026
          </p>
        </div>
      </div>
    </div>
  );
}