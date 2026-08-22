import React from 'react';
import { ArrowRight, Calculator, TrendingUp } from 'lucide-react';
import type { CSSProperties } from 'react';
import {
  estimateCampaign,
  frequencyMultiplier,
  SCREEN_WEEKLY_RATE,
} from './simulatorPricing';

export interface SimulatorConfig {
  screens: number;
  weeks: number;
  frequencySeconds: number;
}

interface SimulatorStepProps {
  config: SimulatorConfig;
  onChange: (patch: Partial<SimulatorConfig>) => void;
  onNext: () => void;
}

interface SliderDef {
  key: keyof SimulatorConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  rangeLabel: string;
  sliderClass: string;
  valueClass: string;
}

const SLIDERS: SliderDef[] = [
  {
    key: 'screens',
    label: 'Número de pantallas (taxis)',
    min: 5,
    max: 100,
    step: 1,
    unit: 'taxis',
    rangeLabel: '5 - 100',
    sliderClass: 'tad-slider tad-range-gold',
    valueClass: 'text-[#FDCB01]',
  },
  {
    key: 'weeks',
    label: 'Duración de la campaña (semanas)',
    min: 1,
    max: 12,
    step: 1,
    unit: 'semanas',
    rangeLabel: '1 - 12',
    sliderClass: 'tad-slider tad-range-purple',
    valueClass: 'text-purple-400',
  },
  {
    key: 'frequencySeconds',
    label: 'Frecuencia de repetición (cada X seg)',
    min: 30,
    max: 300,
    step: 10,
    unit: 'seg',
    rangeLabel: '30s - 300s',
    sliderClass: 'tad-slider tad-range-blue',
    valueClass: 'text-blue-400',
  },
];

function fillPercent(def: SliderDef, value: number): string {
  const pct = ((value - def.min) / (def.max - def.min)) * 100;
  return `${Math.min(100, Math.max(0, pct))}%`;
}

function StepperButton({
  onClick,
  children,
  ariaLabel,
}: {
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-11 h-11 shrink-0 rounded-xl bg-white/[0.04] border border-white/10 grid place-items-center font-black text-lg text-white hover:bg-white/10 active:scale-95 transition-all select-none"
    >
      {children}
    </button>
  );
}

export default function SimulatorStep({ config, onChange, onNext }: SimulatorStepProps) {
  const estimate = estimateCampaign(config);
  const multiplier = frequencyMultiplier(config.frequencySeconds);

  return (
    <div className="animate-step-in flex flex-col flex-1">
      <div className="text-center pt-6 pb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FDCB01]/[0.08] border border-[#FDCB01]/25 rounded-full text-[9px] font-black uppercase tracking-[0.25em] text-[#FDCB01] mb-5">
          <Calculator className="w-3 h-3" />
          Simulador en vivo · 2 de 4
        </div>
        <h1 className="text-[26px] sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.05] mb-2">
          Simula tu impacto<br />y presupuesto
        </h1>
        <p className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-bold uppercase tracking-wider text-[#AAAAAA]">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          El anunciante promedio de la red invierte RD$45,000+ por campaña
        </p>
      </div>

      <div className="bg-[#121212]/80 border border-white/10 rounded-xl p-5 sm:p-6 space-y-6">
        {SLIDERS.map((def, index) => {
          const value = config[def.key];
          return (
            <div key={def.key}>
              <div className="flex justify-between items-end gap-3 mb-2">
                <span className="text-[10px] font-black text-[#AAAAAA] uppercase tracking-wider leading-snug">
                  {index + 1}. {def.label}{' '}
                  <span className="text-white/25 normal-case">({def.rangeLabel})</span>
                </span>
                <span className={`text-base font-black tabular-nums shrink-0 ${def.valueClass}`}>
                  {value} {def.unit}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <StepperButton
                  ariaLabel={`Reducir ${def.label}`}
                  onClick={() =>
                    onChange({ [def.key]: Math.max(def.min, value - def.step) } as Partial<SimulatorConfig>)
                  }
                >
                  −
                </StepperButton>
                <input
                  type="range"
                  min={def.min}
                  max={def.max}
                  step={def.step}
                  value={value}
                  onChange={(e) => onChange({ [def.key]: Number(e.target.value) } as Partial<SimulatorConfig>)}
                  className={`${def.sliderClass} flex-1 min-h-[32px]`}
                  style={{ '--fill': fillPercent(def, value) } as CSSProperties}
                  aria-label={def.label}
                />
                <StepperButton
                  ariaLabel={`Aumentar ${def.label}`}
                  onClick={() =>
                    onChange({ [def.key]: Math.min(def.max, value + def.step) } as Partial<SimulatorConfig>)
                  }
                >
                  +
                </StepperButton>
              </div>
            </div>
          );
        })}

        <div className="bg-black/60 rounded-xl p-5 sm:p-6 border border-white/10">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 mb-1">
                Presupuesto estimado
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-[#AAAAAA]">RD$</span>
                <span className="text-4xl sm:text-5xl font-black tracking-tighter text-white tabular-nums">
                  {estimate.total.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-1">
                Impactos est.
              </p>
              <span className="text-lg sm:text-xl font-black text-white tabular-nums tracking-tight">
                {estimate.impressions.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-4 space-y-2 text-[11px] text-[#AAAAAA]">
            <div className="flex justify-between gap-4">
              <span>Pantallas ({config.screens} × {config.weeks} sem × RD${SCREEN_WEEKLY_RATE}):</span>
              <span className="text-white font-bold tabular-nums shrink-0">
                RD${estimate.screensCost.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Acelerador de frecuencia ({multiplier.toFixed(2)}x):</span>
              <span className="text-white font-bold tabular-nums shrink-0">
                RD${estimate.frequencyUplift.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Producción creativa:</span>
              <span className="text-white font-bold tabular-nums shrink-0">
                RD${estimate.productionFee.toLocaleString()}
              </span>
            </div>
          </div>

          <p className="mt-4 pt-4 border-t border-white/[0.06] text-[10px] font-bold leading-relaxed text-[#39FF14]/90">
            * Disponibilidad limitada de pantallas en rutas clave. Resérvalo ahora.
          </p>
        </div>
      </div>

      <div className="pt-6 mt-auto">
        <button
          onClick={onNext}
          className="w-full min-h-[52px] bg-[#FDCB01] hover:bg-white text-black font-black uppercase tracking-[0.12em] text-sm py-4 rounded-xl transition-all active:scale-[0.98] shadow-[0_0_44px_rgba(253,203,1,0.28)] flex items-center justify-center gap-3"
        >
          <span>Asegurar este plan</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
