'use client';

import { motion } from 'framer-motion';
import { RotateCcw, Calculator, ArrowRight, TrendingUp, BadgeCheck, Wifi, Clock, ShieldCheck } from 'lucide-react';

const REFERRAL_DRIVER_BONUS = 500;

interface EarningsCalculatorStepProps {
  onNext: () => void;
  onPrev: () => void;
  campaigns: number;
  setCampaigns: (value: number) => void;
  referredDrivers: number;
  setReferredDrivers: (value: number) => void;
  projectedEarnings: number;
  REFERRAL_DRIVER_BONUS: number;
  REFERRAL_BUSINESS_BONUS?: number;
}

interface SliderFieldProps {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  color: 'yellow' | 'green' | 'orange';
  icon: React.ElementType;
  ariaLabel: string;
  bonusText?: React.ReactNode;
  description?: string;
}

function SliderField({
  label,
  min,
  max,
  value,
  onChange,
  color,
  icon: Icon,
  ariaLabel,
  bonusText,
  description,
}: SliderFieldProps) {
  const colorMap = {
    yellow: 'tad-range-yellow',
    green: 'tad-range-green',
    orange: 'tad-range-orange',
  };
  const sliderColorClass = colorMap[color];
  const pct = ((value - min) / (max - min)) * 100;
  const bonusColor = color === 'green' ? '#22C55E' : color === 'orange' ? '#FF8C00' : '#FDCB01';

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex justify-between items-end gap-3 mb-1">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider leading-snug">
          {label}
          <span className="text-white/25 normal-case">({min} - {max})</span>
        </span>
        <span className="text-base font-black tabular-nums shrink-0 text-[#FDCB01]">
          {value}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <motion.button
          type="button"
          aria-label={`Reducir ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="tad-stepper"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          −
        </motion.button>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`tad-slider ${sliderColorClass} flex-1 min-h-[32px]`}
          style={{ '--fill': `${Math.min(100, Math.max(0, pct))}%` } as React.CSSProperties}
          aria-label={ariaLabel}
        />
        <motion.button
          type="button"
          aria-label={`Aumentar ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="tad-stepper"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          +
        </motion.button>
      </div>
      {description && (
        <p className="text-[10px] text-[#FDCB01]/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <RotateCcw className="w-3 h-3" />
          {description}
        </p>
      )}
      {bonusText && (
        <motion.p
          className="mt-2 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
          style={{ color: bonusColor }}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          {Icon && <Icon className="w-3 h-3" />}
          {bonusText}
        </motion.p>
      )}
    </motion.div>
  );
}

export default function EarningsCalculatorStep({
  onNext,
  onPrev,
  campaigns,
  setCampaigns,
  referredDrivers,
  setReferredDrivers,
  projectedEarnings,
  REFERRAL_DRIVER_BONUS,
}: EarningsCalculatorStepProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <motion.div
        className="text-center pt-6 pb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="inline-flex px-4 py-1.5 bg-[#FDCB01]/[0.08] border border-[#FDCB01]/25 rounded-full text-[9px] font-black text-[#FDCB01] uppercase tracking-[0.2em] mb-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
        >
          <Calculator className="w-3 h-3" />
          Simulador de Ganancias
        </motion.div>
        <motion.h1
          className="text-[26px] font-black text-white uppercase tracking-tight leading-tight mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Simula tus{' '}
          <span className="text-[#FDCB01]">Ingresos</span>
        </motion.h1>
        <motion.p
          className="text-xs text-gray-500 font-bold uppercase tracking-wider"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Ajusta los valores para calcular tus ganancias estimadas
        </motion.p>
      </motion.div>

      {/* Calculator Card */}
      <motion.div
        className="bg-zinc-900/60 border border-white/5 rounded-3xl p-6 space-y-6 flex-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {/* Campaigns Slider */}
        <SliderField
          label="1. Anuncios en tu Pantalla"
          min={1}
          max={15}
          value={campaigns}
          onChange={setCampaigns}
          color="yellow"
          icon={RotateCcw}
          ariaLabel="Anuncios en tu pantalla"
          description="Rotación exacta cada 30 segundos · Ganas RD$500 mensuales por cada anuncio"
        />

        {/* Driver Referral Slider */}
        <SliderField
          label="2. Compañeros Taxistas Invitados"
          min={0}
          max={100}
          value={referredDrivers}
          onChange={setReferredDrivers}
          color="green"
          icon={BadgeCheck}
          ariaLabel="Compañeros taxistas invitados"
          bonusText={`Bonificación RD$ ${REFERRAL_DRIVER_BONUS.toLocaleString()} c/u · Descuento en tu factura`}
        />

        {/* Earnings Display */}
        <motion.div
          className="bg-black/60 rounded-xl p-5 sm:p-6 border border-white/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 mb-1">
                Total Mensual Estimado
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-[#AAAAAA]">RD$</span>
                <motion.span
                  className="text-4xl sm:text-5xl font-black tracking-tighter text-white tabular-nums"
                >
                  {projectedEarnings.toLocaleString()}
                </motion.span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#FDCB01] mb-1">
                Impactos est.
              </p>
              <span className="text-lg sm:text-xl font-black text-white tabular-nums tracking-tight">
                {Math.round(campaigns * 30 * 10 * 7 * 4 * 0.4).toLocaleString()}
              </span>
            </div>
          </div>

          <motion.div
            className="border-t border-white/[0.06] pt-4 space-y-2 text-[11px] text-[#AAAAAA]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex justify-between gap-4">
              <span>Por anuncios activos ({campaigns} × RD$500):</span>
              <span className="text-white font-bold tabular-nums shrink-0">
                RD${(campaigns * 500).toLocaleString()}
              </span>
            </div>
            {referredDrivers > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex justify-between gap-4 text-[#22C55E]"
              >
                <span>Bonificación taxistas ({referredDrivers} × RD${REFERRAL_DRIVER_BONUS.toLocaleString()}):</span>
                <span className="font-bold tabular-nums shrink-0">
                  RD${(referredDrivers * REFERRAL_DRIVER_BONUS).toLocaleString()}
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Membership Cost */}
          <motion.div
            className="mt-4 pt-4 border-t border-white/[0.06] bg-white/5 rounded-xl p-4 border border-white/5 text-xs text-gray-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
              <span>Inversión de Activación</span>
              <span>Monto</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between font-bold text-zinc-300">
                <span>Membresía Flota y Seguro de Hardware</span>
                <span>RD$6,000 / año</span>
              </div>
              <p className="text-[10px] text-gray-500 leading-normal italic">
                * El pago de la membresía cubre el Starter Kit (tablet, soporte, cableado) y seguro contra robo o averías.
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* CTA */}
        <motion.div className="pt-6 mt-auto">
          <motion.button
            onClick={onNext}
            className="w-full bg-[#FDCB01] hover:bg-white text-black font-black uppercase tracking-[0.15em] text-sm py-5 rounded-2xl transition-all shadow-[0_10px_40px_rgba(253,203,1,0.15)] active:scale-[0.97] flex items-center justify-center gap-3"
            whileHover={{ scale: 1.02, boxShadow: '0 15px 50px rgba(253,203,1,0.25)' }}
            whileTap={{ scale: 0.98 }}
          >
            <span>QUIERO SOLICITAR MI PANTALLA</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}