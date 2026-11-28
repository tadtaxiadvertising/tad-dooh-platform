"use client";

import type { AdvertiserOffer } from "@tad/impact-calculator";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  RotateCcw,
  Minus,
  Plus,
  Info,
} from "lucide-react";
import {
  estimateCampaign,
  estimateCampaignDetailed,
  formatRange,
  getCalibrationBadge,
  SCREEN_MONTHLY_RATE,
  PRODUCTION_FEE,
  FIXED_FREQUENCY_SECONDS,
} from "../../components/advertiser/simulatorPricing";

export interface SimulatorConfig {
  screens: number;
  months: number;
  frequencySeconds: number;
  includeProduction: boolean;
}

interface SimulatorStepProps {
  config: SimulatorConfig;
  city?: "sd" | "stgo";
  onCityChange?: (city: "sd" | "stgo") => void;
  onChange: (patch: Partial<SimulatorConfig>) => void;
  onNext: () => void;
  onPrev: () => void;
  referralCode?: string;
  onReferralCodeChange?: (code: string) => void;
  verifiedOffer?: AdvertiserOffer | null;
  quoteStatus?: "none" | "checking" | "verified" | "invalid" | "error";
}

const SCREEN_PRESETS = [1, 2, 3, 4, 5];

export default function SimulatorStep({
  config,
  city = "sd",
  onCityChange,
  onChange,
  onNext,
  onPrev,
  referralCode = "",
  onReferralCodeChange,
  verifiedOffer = null,
  quoteStatus = "none",
}: SimulatorStepProps) {
  const customScreens = Math.max(6, config.screens);
  const reduceMotion = useReducedMotion();

  const estimate = estimateCampaign(config);
  const appliedOffer =
    quoteStatus === "verified" && verifiedOffer?.verifiedDriverCode
      ? verifiedOffer
      : null;
  const displayedTotal = appliedOffer?.subtotal ?? estimate.total;
  const detailed = estimateCampaignDetailed(config);
  const calibration = getCalibrationBadge();

  const handleScreenSelect = (n: number) => {
    onChange({ screens: n, frequencySeconds: FIXED_FREQUENCY_SECONDS });
  };

  const handleCustomScreensChange = (value: string) => {
    const num = Math.max(6, Math.min(100, parseInt(value) || 6));
    onChange({ screens: num, frequencySeconds: FIXED_FREQUENCY_SECONDS });
  };

  const handleMonthsChange = (months: number) => {
    onChange({ months, frequencySeconds: FIXED_FREQUENCY_SECONDS });
  };

  return (
    <div data-onboarding-simulator className="flex-1 flex flex-col">
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [data-onboarding-simulator] .tad-stepper,
          [data-onboarding-simulator] .tad-stepper::before,
          [data-onboarding-simulator] .tad-slider,
          [data-onboarding-simulator] .tad-slider::-webkit-slider-thumb,
          [data-onboarding-simulator] .tad-slider::-moz-range-thumb {
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>
      <div className="text-center pt-6 pb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FDCB01]/[0.08] border border-[#FDCB01]/25 rounded-full text-[9px] font-black uppercase tracking-[0.25em] text-[#FDCB01] mb-5">
          <Calculator className="w-3 h-3" />
          Simulación ilustrativa · 2 de 4
        </div>
        <h1 className="text-[26px] sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.05] mb-2">
          Simula tu impacto <br />
          <span className="text-[#FDCB01]">y presupuesto</span>
        </h1>
        <p className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-bold uppercase tracking-wider text-[#AAAAAA]">
          <Info className="w-3 h-3 text-[#FDCB01]" />
          Explora pantallas, duración y producción opcional antes de solicitar
          revisión
        </p>
      </div>

      <div className="bg-[#121212]/80 border border-white/10 rounded-xl p-5 sm:p-6 space-y-6 flex-1 overflow-y-auto">
        {onCityChange && (
          <div className="space-y-2">
            <label
              htmlFor="onboarding-campaign-city"
              className="block text-xs font-bold text-white"
            >
              Ciudad de interés
            </label>
            <select
              id="onboarding-campaign-city"
              value={city}
              onChange={(event) =>
                onCityChange(event.target.value === "stgo" ? "stgo" : "sd")
              }
              className="w-full min-h-11 px-3 rounded-xl bg-[#121212] text-white border border-white/30 focus-visible:outline-2 focus-visible:outline-[#FDCB01]"
            >
              <option value="sd">Santo Domingo</option>
              <option value="stgo">Santiago</option>
            </select>
            <p className="text-xs text-[#AAAAAA]">
              La disponibilidad se confirma durante la revisión.
            </p>
          </div>
        )}
        {/* Screens Selector */}
        <div>
          <div className="flex justify-between items-end gap-3 mb-3">
            <span className="text-[10px] font-black text-[#AAAAAA] uppercase tracking-wider leading-snug">
              1. Número de pantallas (taxis)
              <span className="text-white/25 normal-case">(1 - 100)</span>
            </span>
            <span className="text-base font-black tabular-nums shrink-0 text-[#FDCB01]">
              {config.screens} taxi{config.screens !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {SCREEN_PRESETS.map((n) => (
              <motion.button
                key={n}
                type="button"
                onClick={() => handleScreenSelect(n)}
                aria-pressed={config.screens === n}
                aria-label={`${n} pantalla${n !== 1 ? "s" : ""}`}
                whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                className={`w-12 h-12 rounded-xl font-black text-lg transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDCB01] select-none flex items-center justify-center ${
                  config.screens === n
                    ? "bg-[#FDCB01] text-black shadow-[0_0_20px_rgba(253,203,1,0.35)] border border-[#FDCB01]/30"
                    : "bg-white/[0.04] border border-white/10 text-white hover:bg-white/10 hover:border-white/20"
                }`}
              >
                {n}
              </motion.button>
            ))}
            <div className="w-1.5 h-1.5 bg-white/15 rounded-full my-auto" />
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">
                Más
              </span>
              <input
                type="number"
                min={6}
                max={100}
                value={customScreens}
                onChange={(e) => handleCustomScreensChange(e.target.value)}
                className="w-16 bg-transparent border-none outline-none text-white font-black text-base text-center"
                aria-label="Número de pantallas personalizado"
              />
            </div>
          </div>

          <p className="text-[10px] text-[#FDCB01]/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <RotateCcw className="w-3 h-3" />
            Frecuencia de ejemplo: cada {FIXED_FREQUENCY_SECONDS} segundos
          </p>
        </div>

        {/* Months Slider */}
        <div>
          <div className="flex justify-between items-end gap-3 mb-3">
            <span className="text-[10px] font-black text-[#AAAAAA] uppercase tracking-wider leading-snug">
              2. Duración de la campaña
              <span className="text-white/25 normal-case">(1 - 12 meses)</span>
            </span>
            <span className="text-base font-black tabular-nums shrink-0 text-[#FF8C00]">
              {config.months} mes{config.months > 1 ? "es" : ""}
              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-[#FF8C00] text-white rounded">
                POR MES
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              onClick={() => handleMonthsChange(Math.max(1, config.months - 1))}
              aria-label="Reducir meses"
              className="tad-stepper"
              whileHover={reduceMotion ? undefined : { scale: 1.06 }}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            >
              <Minus className="w-5 h-5" />
            </motion.button>
            <input
              type="range"
              min={1}
              max={12}
              step={1}
              value={config.months}
              onChange={(e) => handleMonthsChange(Number(e.target.value))}
              className="tad-slider tad-range-yellow flex-1 min-h-[32px] motion-reduce:transition-none"
              style={
                {
                  "--fill": `${((config.months - 1) / 11) * 100}%`,
                } as React.CSSProperties
              }
              aria-label="Duración de la campaña en meses"
            />
            <motion.button
              type="button"
              onClick={() =>
                handleMonthsChange(Math.min(12, config.months + 1))
              }
              aria-label="Aumentar meses"
              className="tad-stepper"
              whileHover={reduceMotion ? undefined : { scale: 1.06 }}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            >
              <Plus className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Production Checkbox */}
        <div>
          <div className="flex justify-between items-end gap-3 mb-3">
            <span className="text-[10px] font-black text-[#AAAAAA] uppercase tracking-wider leading-snug">
              3. Producción creativa
              <span className="text-white/25 normal-case">(opcional)</span>
            </span>
            <span className="text-base font-black tabular-nums shrink-0 text-[#FDCB01]">
              {config.includeProduction ? "Incluida" : "No incluida"}
            </span>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group/check p-3 -mx-3 rounded-xl hover:bg-white/[0.03] transition-colors">
            <input
              type="checkbox"
              checked={config.includeProduction}
              onChange={(e) =>
                onChange({
                  includeProduction: e.target.checked,
                } as Partial<SimulatorConfig>)
              }
              className="mt-0.5 w-5 h-5 shrink-0 accent-[#FDCB01]"
            />
            <span className="text-[11px] text-[#AAAAAA] leading-relaxed group-hover/check:text-white/80 transition-colors">
              Incluir producción creativa profesional{" "}
              <span className="text-[#FDCB01] font-bold">
                (RD$ {PRODUCTION_FEE.toLocaleString()})
              </span>
            </span>
          </label>
        </div>

        {/* Driver referral is an eligibility claim verified by the API. */}
        {onReferralCodeChange && (
          <div className="space-y-2">
            <label
              htmlFor="advertiser-driver-code"
              className="block text-[11px] font-bold text-white"
            >
              Código de conductor TAD (descuento del 40 %)
            </label>
            <input
              id="advertiser-driver-code"
              type="text"
              autoComplete="off"
              maxLength={64}
              value={referralCode}
              onChange={(event) =>
                onReferralCodeChange(event.target.value.trim())
              }
              aria-describedby="advertiser-driver-code-help"
              className="w-full min-h-11 px-3 rounded-xl bg-white/10 text-white border border-white/30 focus-visible:outline-2 focus-visible:outline-[#FDCB01]"
              placeholder="Introduce el código del conductor"
            />
            <p
              id="advertiser-driver-code-help"
              role="status"
              aria-live="polite"
              className="text-[11px] text-[#D7D7D7]"
            >
              {!referralCode
                ? "La tarifa base es RD$2,500 por pantalla/mes. El descuento requiere un código válido."
                : quoteStatus === "verified" && appliedOffer
                  ? "Código verificado: 40 % de descuento aplicado a las pantallas."
                  : quoteStatus === "checking"
                    ? "Validando el código con TAD…"
                    : quoteStatus === "invalid"
                      ? "Código no válido. Comprueba el código o elimínalo para continuar a tarifa base."
                      : quoteStatus === "error"
                        ? "No fue posible validar el código. No aplicamos descuentos sin confirmación."
                        : "El descuento está pendiente de validación."}
            </p>
          </div>
        )}

        {/* Budget Summary Card */}
        <div className="bg-black/60 rounded-xl p-5 sm:p-6 border border-white/10 stitched-card">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 mb-1">
                Presupuesto ilustrativo
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-[#AAAAAA]">RD$</span>
                <output
                  aria-label="Presupuesto ilustrativo"
                  aria-live="polite"
                  className="text-4xl sm:text-5xl font-black tracking-tighter text-white tabular-nums"
                >
                  {displayedTotal.toLocaleString()}
                </output>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#FDCB01] mb-1">
                Impactos est.
              </p>
              <span className="text-lg sm:text-xl font-black text-white tabular-nums tracking-tight">
                {estimate.impressions.toLocaleString()}
              </span>
              <p className="text-[9px] text-white/40 tabular-nums mt-0.5">
                {formatRange(detailed.totalImpressions)}
              </p>
            </div>
          </div>

          {/* Badge de fuente / calibración */}
          <div className="flex items-start gap-2 bg-[#FDCB01]/[0.06] border border-[#FDCB01]/20 rounded-lg px-3 py-2 mt-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#FDCB01]" />
            <div className="text-[9px] leading-snug text-[#AAAAAA]">
              <span className="font-black text-[#FDCB01] uppercase tracking-wider">
                {calibration.label}
              </span>
              <span className="block text-white/45 mt-0.5">
                Rangos de impacto basados en benchmarks, sin calibración local
                validada. No equivalen a reproducciones verificadas ni a
                personas únicas.
              </span>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-4 space-y-2 text-[11px] text-[#AAAAAA]">
            <div className="flex justify-between gap-4">
              <span>
                Pantallas ({config.screens} × {config.months} mes
                {config.months > 1 ? "es" : ""} × RD$
                {SCREEN_MONTHLY_RATE.toLocaleString()}):
              </span>
              <span className="text-white font-bold tabular-nums shrink-0">
                RD${estimate.screensCost.toLocaleString()}
              </span>
            </div>
            {appliedOffer && (
              <div className="flex justify-between gap-4">
                <span className="text-[#FDCB01]">
                  Código de conductor verificado · 40 %
                </span>
                <span className="text-[#FDCB01] font-bold tabular-nums shrink-0">
                  −RD${appliedOffer.discountAmount.toLocaleString()}
                </span>
              </div>
            )}
            {config.includeProduction && (
              <div>
                <div className="flex justify-between gap-4">
                  <span>Producción creativa:</span>
                  <span className="text-white font-bold tabular-nums shrink-0">
                    RD${estimate.productionFee.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <p
            role="note"
            className="mt-4 pt-4 border-t border-white/[0.06] text-[10px] font-bold leading-relaxed text-[#FDCB01]/90"
          >
            La tarifa base es RD$2,500 por pantalla/mes (sin ITBIS). El
            descuento del conductor solo aplica al costo de pantallas y requiere
            verificación del código por el servidor. La producción creativa
            opcional se calcula aparte. La simulación no contrata, cobra ni
            reserva pantallas.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-6 mt-auto flex flex-col sm:flex-row gap-3">
        <motion.button
          type="button"
          onClick={onPrev}
          className="order-2 sm:order-1 w-full min-h-[48px] py-3 bg-white/[0.04] border border-white/10 text-[#AAAAAA] hover:text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors motion-reduce:transition-none flex items-center justify-center gap-2"
          whileHover={reduceMotion ? undefined : { scale: 1.02 }}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        >
          <ArrowRight
            className="w-4 h-4"
            style={{ transform: "rotate(180deg)" }}
          />
          Ajustar simulación
        </motion.button>
        <motion.button
          type="button"
          onClick={onNext}
          className="order-1 sm:order-2 w-full min-h-[52px] bg-[#FDCB01] hover:bg-white text-black font-black uppercase tracking-[0.12em] text-sm py-4 rounded-xl transition-colors motion-reduce:transition-none shadow-[0_0_44px_rgba(253,203,1,0.28)] flex items-center justify-center gap-3"
          whileHover={reduceMotion ? undefined : { scale: 1.02 }}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        >
          <span>Continuar con este escenario</span>
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
