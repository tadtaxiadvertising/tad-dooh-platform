import React from 'react';
import { usePerformanceFallback } from '@tad/ui';
import { motion, AnimatePresence } from 'framer-motion';

export const DriverOnboardingLayout = ({ children, currentStep, totalSteps }: { children: React.ReactNode, currentStep: number, totalSteps: number }) => {
  const isLowPerformance = usePerformanceFallback();

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-green-900 via-slate-900 to-black overflow-hidden relative`}>
      {/* Background Decorative Elements */}
      {!isLowPerformance && (
        <>
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/20 rounded-full blur-[120px] pointer-events-none" />
        </>
      )}

      {/* Main Glass Panel */}
      <div 
        className={`relative w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 ${
          isLowPerformance ? 'bg-black/80' : 'bg-white/5 backdrop-blur-xl'
        }`}
      >
        <div className="p-8 md:p-12">
          {/* Progress Bar */}
          <div className="mb-8 relative w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-teal-500"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>

          <div className="relative min-h-[400px]">
            <AnimatePresence mode="wait">
              {children}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
