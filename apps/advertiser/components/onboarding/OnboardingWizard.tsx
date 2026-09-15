'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ArrowRight, Sparkles, Calculator, TrendingUp, FileText, BadgeCheck, Maximize2, Minimize2 } from 'lucide-react';
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

const stepIcons = [
  Sparkles,
  Calculator,
  TrendingUp,
  BadgeCheck,
];

const stepLabelsDefault = ['Beneficios', 'Simulador', 'Compromiso', 'Éxito'];

const SIMULATOR_STEP = 2;

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
  const isSimulatorStep = step === SIMULATOR_STEP;
  const [isMobile, setIsMobile] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [screenWidth, setScreenWidth] = useState(0);

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setScreenWidth(width);
      setIsMobile(width < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Adaptive grid columns based on step and screen size
  const getGridCols = () => {
    if (isMobile) return 'grid-cols-1';
    if (isSimulatorStep) return 'lg:grid-cols-[3fr_1fr] xl:grid-cols-[4fr_1fr]'; // Simulator gets 75-80%
    return 'lg:grid-cols-[1fr_420px] xl:grid-cols-[3fr_380px]'; // Other steps: balanced
  };

  const getPanelWidth = () => {
    if (isMobile) return 'w-full';
    if (isSimulatorStep) return 'w-full max-w-xs'; // Very narrow for simulator
    return 'w-full max-w-sm'; // Normal width for other steps
  };

  return (
    <div className={clsx('min-h-screen bg-[#0a0a0a] flex flex-col relative overflow-hidden font-sans', className)}>
      {/* Ambient Background - adapts to step */}
      <div className="fixed inset-0 pointer-events-none transition-all duration-500">
        <div className={clsx(
          "absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] blur-[120px] rounded-full transition-all duration-500",
          isSimulatorStep ? 'bg-[#22C55E]/[0.04]' : 'bg-[#FDCB01]/[0.04]'
        )} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#22C55E]/[0.03] blur-[100px] rounded-full" />
      </div>

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

        {/* Progress Bar - Desktop: Horizontal with labels, Mobile: Compact */}
        <div className="hidden lg:flex items-center gap-2 flex-1 max-w-3xl mx-8" layout>
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
        </div>

        {/* Mobile Progress - Compact */}
        <div className="lg:hidden flex items-center gap-1.5 flex-1 max-w-md mx-4" layout>
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

        {/* Step counter + panel toggle for simulator */}
        <div className="flex items-center gap-4 hidden lg:flex">
          <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest tabular-nums w-16 text-right">
            {step}/{totalSteps}
          </span>
          {isSimulatorStep && (
            <motion.button
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              className="p-2 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label={isPanelCollapsed ? 'Expandir panel lateral' : 'Colapsar panel lateral'}
            >
              {isPanelCollapsed ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
            </motion.button>
          )}
        </div>
      </div>

      {/* Content with AnimatePresence - Adaptive Grid Layout */}
      <div className="flex-1 w-full max-w-7xl px-4 md:px-8 lg:px-12 pb-8 md:pb-12 lg:pb-16 relative z-10">
        <div className={clsx(
          "grid gap-8 lg:gap-12 items-start transition-all duration-500",
          getGridCols(),
          isPanelCollapsed && isSimulatorStep && !isMobile && 'lg:grid-cols-[1fr_0fr] lg:gap-0'
        )}>
          {/* Left Column: Step Content - Gets most space on simulator step */}
          <div className={clsx(
            "min-w-0 transition-all duration-500",
            isSimulatorStep && !isMobile && 'lg:col-span-1'
          )}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: isSimulatorStep ? 20 : 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isSimulatorStep ? -20 : -40 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1 flex flex-col"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Column: Adaptive Visual Panel */}
          {!isMobile && (
            <motion.div
              key={`panel-${step}`}
              initial={{ opacity: 0, width: isPanelCollapsed ? 0 : undefined }}
              animate={{ opacity: 1, width: isPanelCollapsed ? 0 : undefined }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={clsx(
                "relative overflow-hidden",
                getPanelWidth(),
                isPanelCollapsed && 'lg:hidden'
              )}
              style={isPanelCollapsed ? { display: 'none' } : undefined}
            >
              <div className="sticky top-24 h-full">
                <motion.div
                  className={clsx(
                    "stitched-card rounded-3xl p-6 md:p-8 bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] h-full transition-all duration-300",
                    isSimulatorStep && 'p-4 md:p-6 max-h-[calc(100vh-10rem)] overflow-y-auto'
                  )}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  {/* Compact Step Indicator for Simulator */}
                  <div className={clsx(
                    "mb-6 text-center transition-all duration-300",
                    isSimulatorStep && 'mb-4'
                  )}>
                    <div className={clsx(
                      "inline-flex items-center justify-center rounded-full bg-[#FDCB01]/10 border border-[#FDCB01]/20 mb-3 transition-all duration-300",
                      isSimulatorStep ? 'w-14 h-14 md:w-16 md:h-16' : 'w-20 h-20 md:w-24 md:h-24'
                    )}>
                      <motion.span
                        key={step}
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        className={clsx(
                          "font-black text-[#FDCB01]",
                          isSimulatorStep ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl'
                        )}
                      >
                        {step}
                      </motion.span>
                    </div>
                    <h3 className={clsx(
                      "font-black text-white uppercase tracking-tight mb-1 transition-all duration-300",
                      isSimulatorStep ? 'text-base md:text-lg' : 'text-lg md:text-xl'
                    )}>
                      {labels[step - 1]}
                    </h3>
                    {!isSimulatorStep && (
                      <p className="text-sm text-gray-500 max-w-xs mx-auto">
                        Paso {step} de {totalSteps} — Completa cada sección para activar tu campaña
                      </p>
                    )}
                  </div>

                  {/* Visual Illustration per Step - Adaptive Height */}
                  <div className={clsx(
                    "relative mb-6 transition-all duration-300",
                    isSimulatorStep ? 'h-32 md:h-40' : 'h-64 md:h-80'
                  )}>
                    {step === 1 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-[#FDCB01]/20 to-[#FF8C00]/10 blur-xl animate-float"
                        />
                        <motion.div
                          className="relative w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-[#121212] to-black border border-white/10 flex items-center justify-center"
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
                        >
                          <Sparkles className="w-10 h-10 md:w-14 md:h-14 text-[#FDCB01] drop-shadow-[0_0_20px_rgba(253,203,1,0.5)]" />
                        </motion.div>
                      </div>
                    )}
                    {step === 2 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {/* Simulator-specific visual: live preview chart */}
                        <div className="relative w-full h-full max-w-xs mx-auto">
                          <motion.div
                            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#22C55E]/10 to-[#06B6D4]/5 border border-[#22C55E]/20"
                          />
                          <div className="relative p-3 bg-black/40 rounded-xl border border-white/5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] font-black text-[#22C55E] uppercase tracking-wider">Vista Previa</span>
                              <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                                <div className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                                <div className="w-2 h-2 rounded-full bg-[#FDCB01]" />
                              </div>
                            </div>
                            <div className="h-24 md:h-32 relative">
                              <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                                <defs>
                                  <linearGradient id="simGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.1" />
                                  </linearGradient>
                                </defs>
                                <path
                                  d="M10,90 L30,70 L50,75 L70,50 L90,55 L110,35 L130,40 L150,25 L170,30 L190,20"
                                  stroke="url(#simGrad)"
                                  strokeWidth="2.5"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="animate-draw"
                                />
                                <path
                                  d="M10,90 L30,65 L50,70 L70,45 L90,50 L110,30 L130,35 L150,20 L170,25 L190,15"
                                  stroke="#FDCB01"
                                  strokeWidth="1.5"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeDasharray="4,4"
                                  className="animate-draw-delayed"
                                />
                              </svg>
                            </div>
                            <div className="flex justify-between text-[8px] text-gray-500 mt-1">
                              <span>Presupuesto</span>
                              <span>Alcance</span>
                              <span>Impresiones</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {step === 3 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-[#E51636]/20 to-[#FDCB01]/10 blur-xl animate-float"
                        />
                        <motion.div
                          className="relative w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-[#121212] to-black border border-white/10 flex items-center justify-center"
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
                        >
                          <FileText className="w-10 h-10 md:w-14 md:h-14 text-[#E51636] drop-shadow-[0_0_20px_rgba(229,22,54,0.5)]" />
                        </motion.div>
                      </div>
                    )}
                    {step === 4 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-[#22C55E]/20 to-[#FDCB01]/10 blur-xl animate-float"
                        />
                        <motion.div
                          className="relative w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-[#121212] to-black border border-white/10 flex items-center justify-center"
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
                        >
                          <BadgeCheck className="w-10 h-10 md:w-14 md:h-14 text-[#22C55E] drop-shadow-[0_0_20px_rgba(34,197,94,0.5)]" />
                        </motion.div>
                      </div>
                    )}
                  </div>

                  {/* Key Benefits / Summary - Condensed for Simulator */}
                  {!isSimulatorStep && (
                    <div className="space-y-3 border-t border-white/10 pt-4">
                      {labels.slice(step).map((label, i) => (
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
                  )}

                  {/* Simulator Step: Quick Stats Preview */}
                  {isSimulatorStep && (
                    <div className="space-y-3 border-t border-white/10 pt-4">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Proyección en vivo</p>
                      <div className="grid grid-cols-3 gap-2">
                        <SimulatorStatCard label="Pantallas" value="—" icon="MonitorSmartphone" color="#FDCB01" />
                        <SimulatorStatCard label="Impresiones" value="—" icon="Eye" color="#22C55E" />
                        <SimulatorStatCard label="Presupuesto" value="—" icon="Calculator" color="#06B6D4" />
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}

        </div>

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

// Helper component for simulator step stats
function SimulatorStatCard({ label, value, icon: IconName, color }: { label: string; value: string; icon: string; color: string }) {
  const icons: Record<string, React.ElementType> = {
    MonitorSmartphone: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.5 8a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>,
    Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    Calculator: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  };
  const Icon = icons[IconName] || icons.Calculator;

  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
      <div className="w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15`, borderColor: `${color}40` }}>
        <Icon style={{ color }} />
      </div>
      <p className="text-xl font-black text-white tabular-nums" style={{ color }}>{value}</p>
      <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}