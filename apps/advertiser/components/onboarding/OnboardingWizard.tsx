'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ArrowRight, Sparkles, Calculator, TrendingUp, FileText, BadgeCheck, Maximize2, Minimize2, MonitorSmartphone, Eye } from 'lucide-react';
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
  simulatorData?: {
    screens: number;
    impressions: number;
    budget: number;
  };
}

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
  simulatorData,
}: OnboardingWizardProps<T>) {
  const labels = stepLabels || stepLabelsDefault;
  const isSimulatorStep = step === SIMULATOR_STEP;
  const [isMobile, setIsMobile] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getGridCols = () => {
    if (isMobile) return 'grid-cols-1';
    if (isSimulatorStep) return 'lg:grid-cols-[4fr_1fr] xl:grid-cols-[5fr_1fr]';
    return 'lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_260px]';
  };

  const getPanelWidth = () => {
    if (isMobile) return 'w-full';
    if (isSimulatorStep) return 'w-full max-w-sm';
    return 'w-full max-w-[220px]';
  };

  const formatNum = (n: number) => n.toLocaleString('es-DO');
  const formatBudget = (n: number) => `RD$ ${n.toLocaleString('es-DO')}`;

  // Progress bar line positions - calculated once
  const stepPositions = [0, 33.33, 66.66, 100];

  return (
    <div className={clsx('min-h-screen bg-[#0a0a0a] flex flex-col relative overflow-hidden font-sans', className)}>
      {/* Single Ambient Background - changes with step */}
      <motion.div
        className="fixed inset-0 pointer-events-none -z-20"
        initial={false}
        animate={{
          background: isSimulatorStep
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
              const isSimulator = i === SIMULATOR_STEP;
              
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
                  <div className="relative flex items-center justify-center">
                    {/* Connecting line segment (visual only, progress handled by fill above) */}
                    {i < totalSteps && (
                      <div className="absolute left-1/2 top-1/2 w-full h-1 -translate-y-1/2 -translate-x-full bg-white/10 rounded-full pointer-events-none" />
                    )}
                    
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
                  </div>
                  
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
          "grid gap-6 lg:gap-8 items-start transition-all duration-500",
          getGridCols(),
          isPanelCollapsed && isSimulatorStep && !isMobile && 'lg:grid-cols-[1fr_0fr] lg:gap-0'
        )}>
          {/* Left Column: Step Content */}
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
                    "stitched-card rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] h-full transition-all duration-300",
                    isSimulatorStep 
                      ? 'p-4 md:p-6 max-h-[calc(100vh-10rem)] overflow-y-auto'
                      : 'p-3 md:p-4'
                  )}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  {isSimulatorStep ? (
                    // SIMULATOR STEP: Rich panel with live data
                    <>
                      <div className="mb-5 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#FDCB01]/15 border border-[#FDCB01]/40 mb-3 shadow-[0_0_20px_rgba(253,203,1,0.15)]">
                          <motion.span
                            key={step}
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                            className="text-2xl md:text-3xl font-black text-[#FDCB01]"
                          >
                            {step}
                          </motion.span>
                        </div>
                        <h3 className="text-base md:text-lg font-black text-white uppercase tracking-tight mb-1">Simulador</h3>
                        <p className="text-[10px] text-gray-500 max-w-xs mx-auto">Configura tu campaña en tiempo real</p>
                      </div>

                      {/* Live Preview Chart */}
                      <div className="relative mb-5 h-40 md:h-48">
                        <div className="relative w-full h-full max-w-xs mx-auto">
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#FDCB01]/10 to-[#22C55E]/5 border border-[#FDCB01]/20" />
                          <div className="relative p-4 bg-black/50 rounded-xl border border-white/10 h-full backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[9px] font-black text-[#FDCB01] uppercase tracking-wider">Proyección</span>
                              <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-[#FDCB01]" />
                                <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                                <div className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                              </div>
                            </div>
                            <div className="h-28 md:h-36 relative">
                              <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                                <defs>
                                  <linearGradient id="simGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stopColor="#FDCB01" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#22C55E" stopOpacity="0.1" />
                                  </linearGradient>
                                </defs>
                                <path
                                  d="M10,90 L25,75 L40,70 L55,55 L70,60 L85,45 L100,50 L115,35 L130,40 L145,25 L160,30 L175,20 L190,15"
                                  stroke="url(#simGrad)"
                                  strokeWidth="3"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="animate-draw"
                                  style={{ strokeDasharray: 300, strokeDashoffset: 300 }}
                                />
                                <path
                                  d="M10,90 L25,70 L40,65 L55,50 L70,55 L85,40 L100,45 L115,30 L130,35 L145,20 L160,25 L175,15 L190,10"
                                  stroke="#FDCB01"
                                  strokeWidth="2"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeDasharray="6,4"
                                  className="animate-draw-delayed"
                                  style={{ strokeDasharray: 300, strokeDashoffset: 300 }}
                                />
                              </svg>
                            </div>
                            <div className="flex justify-between text-[8px] text-gray-500 mt-2">
                              <span>Inversión</span>
                              <span>Alcance</span>
                              <span>Impactos</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Live Stats Cards - Real Data - LARGER & READABLE */}
                      <div className="space-y-3 border-t border-white/10 pt-4">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Proyección en vivo</p>
                        <div className="grid grid-cols-3 gap-3">
                          <SimulatorStatCard 
                            label="Pantallas" 
                            value={simulatorData ? formatNum(simulatorData.screens) : '—'} 
                            icon={MonitorSmartphone} 
                            color="#FDCB01" 
                          />
                          <SimulatorStatCard 
                            label="Impresiones" 
                            value={simulatorData ? formatNum(simulatorData.impressions) : '—'} 
                            icon={Eye} 
                            color="#22C55E" 
                          />
                          <SimulatorStatCard 
                            label="Presupuesto" 
                            value={simulatorData ? formatBudget(simulatorData.budget) : '—'} 
                            icon={Calculator} 
                            color="#06B6D4" 
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    // NON-SIMULATOR STEPS: Ultra-minimal panel
                    <div className="text-center h-full flex flex-col items-center justify-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/5 border border-white/10 mb-3 mx-auto">
                        <motion.span
                          key={step}
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                          className="text-lg md:text-xl font-black text-gray-400"
                        >
                          {step}
                        </motion.span>
                      </div>
                      <h3 className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1">
                        {labels[step - 1]}
                      </h3>
                      <p className="text-[9px] text-gray-600 max-w-xs mx-auto leading-snug">
                        Paso {step} de {totalSteps}
                      </p>
                    </div>
                  )}

                  {/* Only show upcoming steps hint on non-simulator steps - very subtle */}
                  {!isSimulatorStep && step < totalSteps && (
                    <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
                      {labels.slice(step).map((label, i) => (
                        <div
                          key={label}
                          className="px-2 py-1.5 rounded-lg text-[9px] font-medium text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Success step completion */}
                  {!isSimulatorStep && step === 4 && (
                    <motion.div
                      className="mt-6 p-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-center"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    >
                      <BadgeCheck className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-[10px] font-black">Campaña asegurada</p>
                    </motion.div>
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

// Helper component for simulator step stats - LARGER, READABLE
function SimulatorStatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  const hoverBorder = `${color}66`;
  const hoverBg = `${color}15`;
  return (
    <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-center transition-all" 
         onMouseEnter={(e) => { e.currentTarget.style.borderColor = hoverBorder; e.currentTarget.style.backgroundColor = hoverBg; }}
         onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; }}>
      <div className="w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20`, borderColor: `${color}50` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <p className="text-2xl md:text-3xl font-black text-white tabular-nums leading-tight" style={{ color }}>{value}</p>
      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mt-1">{label}</p>
    </div>
  );
}