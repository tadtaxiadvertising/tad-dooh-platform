import React, { useState } from 'react';
import { ArrowRight, Calculator, TrendingUp, RotateCcw, Check, Users, Store } from 'lucide-react';
import { estimateCampaign, SCREEN_MONTHLY_RATE, PRODUCTION_FEE, FIXED_FREQUENCY_SECONDS } from './simulatorPricing';

export interface SimulatorConfig {
  screens: number;
  months: number;
  frequencySeconds: number;
  includeProduction: boolean;
}

interface SimulatorStepProps {
  config: SimulatorConfig;
  onChange: (patch: Partial<SimulatorConfig>) => void;
  onNext: () => void;
}

const SCREEN_PRESETS = [1, 2, 3, 4, 5];

export default function SimulatorStep({ config, onChange, onNext }: SimulatorStepProps) {
  const [customScreens, setCustomScreens] = useState(6);
  const isCustomScreens = config.screens > 5;

  const estimate = estimateCampaign(config);

  const handleScreenSelect = (n: number) => {
    onChange({ screens: n, frequencySeconds: FIXED_FREQUENCY_SECONDS });
    if (n <= 5) setCustomScreens(6);
  };

  const handleCustomScreensChange = (value: string) => {
    const num = Math.max(6, Math.min(100, parseInt(value) || 6));
    setCustomScreens(num);
    onChange({ screens: num, frequencySeconds: FIXED_FREQUENCY_SECONDS });
  };

  const handleMonthsChange = (months: number) => {
    onChange({ months, frequencySeconds: FIXED_FREQUENCY_SECONDS });
  };

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
          <TrendingUp className="w-3 h-3 text-[#FDCB01]" />
          El anunciante promedio de la red invierte RD$45,000+ por campaña
        </p>
      </div>

      <div className="bg-[#121212]/80 border border-white/10 rounded-xl p-5 sm:p-6 space-y-6">
        <div>
          <div className="flex justify-between items-end gap-3 mb-3">
            <span className="text-[10px] font-black text-[#AAAAAA] uppercase tracking-wider leading-snug">
              1. Número de pantallas (taxis)
              <span className="text-white/25 normal-case">(1 - 100)</span>
            </span>
            <span className="text-base font-black tabular-nums shrink-0 text-[#FDCB01]">
              {config.screens} taxis
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {SCREEN_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleScreenSelect(n)}
                className={`w-12 h-12 rounded-xl font-black text-lg transition-all select-none flex items-center justify-center ${
                  config.screens === n
                    ? 'bg-[#FDCB01] text-black shadow-[0_0_20px_rgba(253,203,1,0.35)] border border-[#FDCB01]/30'
                    : 'bg-white/[0.04] border border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                }`}
              >
                {n}
              </button>
            ))}
            <div className="w-1.5 h-1.5 bg-white/15 rounded-full my-auto" />
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">Más</span>
              <input
                type="number"
                min={6}
                max={100}
                value={customScreens}
                onChange={(e) => handleCustomScreensChange(e.target.value)}
                onBlur={() => handleCustomScreensChange(customScreens.toString())}
                className="w-16 bg-transparent border-none outline-none text-white font-black text-base text-center"
                aria-label="Número de pantallas personalizado"
              />
            </div>
          </div>

          <p className="text-[10px] text-[#FDCB01]/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <RotateCcw className="w-3 h-3" />
            Rotación exacta cada 30 segundos
          </p>
        </div>

        <div>
          <div className="flex justify-between items-end gap-3 mb-3">
            <span className="text-[10px] font-black text-[#AAAAAA] uppercase tracking-wider leading-snug">
              2. Duración de la campaña
              <span className="text-white/25 normal-case">(1 - 12 meses)</span>
            </span>
            <span className="text-base font-black tabular-nums shrink-0 text-[#E51636]">
              {config.months} mes{config.months > 1 ? 'es' : ''}
              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-[#E51636] text-white rounded">
                POR MES
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleMonthsChange(Math.max(1, config.months - 1))}
              aria-label="Reducir meses"
              className="w-11 h-11 shrink-0 rounded-xl bg-white/[0.04] border border-white/10 grid place-items-center font-black text-lg text-white hover:bg-white/10 active:scale-95 transition-all select-none"
            >
              −
            </button>
            <input
              type="range"
              min={1}
              max={12}
              step={1}
              value={config.months}
              onChange={(e) => handleMonthsChange(Number(e.target.value))}
              className="tad-slider tad-range-yellow flex-1 min-h-[32px]"
              style={{ '--fill': `${((config.months - 1) / 11) * 100}%` } as React.CSSProperties}
              aria-label="Duración de la campaña en meses"
            />
            <button
              type="button"
              onClick={() => handleMonthsChange(Math.min(12, config.months + 1))}
              aria-label="Aumentar meses"
              className="w-11 h-11 shrink-0 rounded-xl bg-white/[0.04] border border-white/10 grid place-items-center font-black text-lg text-white hover:bg-white/10 active:scale-95 transition-all select-none"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-end gap-3 mb-3">
            <span className="text-[10px] font-black text-[#AAAAAA] uppercase tracking-wider leading-snug">
              3. Producción creativa
              <span className="text-white/25 normal-case">(opcional)</span>
            </span>
            <span className="text-base font-black tabular-nums shrink-0 text-[#FDCB01]">
              {config.includeProduction ? 'Incluida' : 'No incluida'}
            </span>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group/check p-3 -mx-3 rounded-xl hover:bg-white/[0.03] transition-colors">
            <input
              type="checkbox"
              checked={config.includeProduction}
              onChange={(e) => onChange({ includeProduction: e.target.checked } as Partial<SimulatorConfig>)}
              className="mt-0.5 w-5 h-5 shrink-0 accent-[#FDCB01]"
            />
            <span className="text-[11px] text-[#AAAAAA] leading-relaxed group-hover/check:text-white/80 transition-colors">
              Incluir producción creativa profesional <span className="text-[#FDCB01] font-bold">(RD$ {PRODUCTION_FEE.toLocaleString()})</span>
            </span>
          </label>
        </div>

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
              <p className="text-[9px] font-black uppercase tracking-widest text-[#FDCB01] mb-1">
                Impactos est.
              </p>
              <span className="text-lg sm:text-xl font-black text-white tabular-nums tracking-tight">
                {estimate.impressions.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-4 space-y-2 text-[11px] text-[#AAAAAA]">
            <div className="flex justify-between gap-4">
              <span>Pantallas ({config.screens} × {config.months} mes{config.months > 1 ? 'es' : ''} × RD${SCREEN_MONTHLY_RATE.toLocaleString()}):</span>
              <span className="text-white font-bold tabular-nums shrink-0">
                RD${estimate.screensCost.toLocaleString()}
              </span>
            </div>
            {config.includeProduction && (
              <div className="flex justify-between gap-4">
                <span>Producción creativa:</span>
                <span className="text-white font-bold tabular-nums shrink-0">
                  RD${estimate.productionFee.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <p className="mt-4 pt-4 border-t border-white/[0.06] text-[10px] font-bold leading-relaxed text-[#FDCB01]/90">
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