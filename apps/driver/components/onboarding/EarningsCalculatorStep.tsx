"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, BadgeCheck, MonitorPlay, ShoppingBag, Users, ShieldCheck } from "lucide-react";
import { previewDriverEarnings } from "../../lib/earningsPreview";

type Earnings = ReturnType<typeof previewDriverEarnings>;

interface Props {
  onNext: () => void;
  onPrev: () => void;
  campaigns: number;
  setCampaigns: (n: number) => void;
  approvedSales: number;
  setApprovedSales: (n: number) => void;
  referredDrivers: number;
  setReferredDrivers: (n: number) => void;
  earningsPreview: Earnings;
}

const rd = (amount: number) => `RD$ ${amount.toLocaleString("es-DO")}`;

function EarningsSlider({
  id, label, value, max, onChange, description,
}: {
  id: string; label: string; value: number; max: number;
  onChange: (value: number) => void; description: string;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-semibold text-zinc-200">{label}</label>
        <output htmlFor={id} className="text-xl font-black tabular-nums text-[#FFD400]">{value}</output>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Disminuir ${label}`} className="tad-stepper shrink-0"
          disabled={value <= 0} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
        <input id={id} className="tad-slider tad-range-yellow min-w-0 flex-1"
          type="range" min={0} max={max} step={1} value={value}
          onChange={event => onChange(Number(event.target.value))}
          aria-valuetext={`${value} ${label.toLowerCase()}`} />
        <button type="button" aria-label={`Aumentar ${label}`} className="tad-stepper shrink-0"
          disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
      <p className="text-xs leading-relaxed text-zinc-400">{description}</p>
    </div>
  );
}

export default function EarningsCalculatorStep({
  onNext, onPrev, campaigns, setCampaigns, approvedSales, setApprovedSales,
  referredDrivers, setReferredDrivers, earningsPreview,
}: Props) {
  const reduceMotion = useReducedMotion();
  const { ads, sales, referrals, screenAdsRD, salesRD, referralsRD,
    recurringMonthlyExampleRD, oneTimeEventsExampleRD, illustrativeTotalRD } = earningsPreview;
  return (
    <motion.section initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }} className="flex flex-1 flex-col gap-5">
      <header className="space-y-2 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#FFD400]/30 bg-[#FFD400]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#FFD400]">
          <BadgeCheck size={15} aria-hidden="true"/> Ejemplo de tres formas de ganar
        </span>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Tu recorrido. <span className="text-[#FFD400]">Tus oportunidades.</span>
        </h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          Ajusta las cantidades del ejemplo. Una oportunidad no equivale a una comisión aprobada ni a un pago recibido.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-[#FFD400]/20 bg-[#FFD400]/[0.06] p-4">
          <MonitorPlay size={23} className="mb-3 text-[#FFD400]" aria-hidden="true"/>
          <h2 className="text-xs font-bold text-white">Anuncios en pantalla</h2>
          <p className="mt-2 text-2xl font-black tabular-nums text-white">{rd(screenAdsRD)}</p>
          <p className="mt-1 text-xs text-zinc-400">Escenario mensual · {ads} de 15 anuncios</p>
        </article>
        <article className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
          <ShoppingBag size={23} className="mb-3 text-emerald-400" aria-hidden="true"/>
          <h2 className="text-xs font-bold text-white">Venta de publicidad</h2>
          <p className="mt-2 text-2xl font-black tabular-nums text-white">{rd(salesRD)}</p>
          <p className="mt-1 text-xs text-zinc-400">Bonos de ejemplo · {sales} ventas aprobadas</p>
        </article>
        <article className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] p-4">
          <Users size={23} className="mb-3 text-sky-400" aria-hidden="true"/>
          <h2 className="text-xs font-bold text-white">Referir conductores</h2>
          <p className="mt-2 text-2xl font-black tabular-nums text-white">{rd(referralsRD)}</p>
          <p className="mt-1 text-xs text-zinc-400">Bonos de ejemplo · {referrals} referidos activados</p>
        </article>
      </div>

      <div className="grid gap-4 rounded-3xl border border-white/10 bg-zinc-950/70 p-4 sm:p-6">
        <div className="grid grid-cols-5 gap-2" aria-label={`Escenario de ${ads} anuncios elegibles de 15`}>
          {Array.from({ length: 15 }, (_, index) => (
            <span key={index} aria-hidden="true"
              className={`grid h-9 place-items-center rounded-lg border text-xs font-bold tabular-nums transition-colors duration-200 ${index < ads ? "border-[#FFD400] bg-[#FFD400] text-black" : "border-white/10 bg-white/5 text-zinc-500"}`}>
              {String(index + 1).padStart(2, "0")}
            </span>
          ))}
        </div>
        <EarningsSlider id="onboarding-screen-ads" label="Anuncios elegibles en pantalla"
          value={campaigns} max={15} onChange={setCampaigns}
          description="RD$500 por anuncio elegible bajo las condiciones del período. Máximo 15." />
        <EarningsSlider id="onboarding-sales" label="Ventas aprobadas de publicidad"
          value={approvedSales} max={20} onChange={setApprovedSales}
          description="RD$500 por comisión de venta validada. No equivale a un anunciante que solo preguntó." />
        <EarningsSlider id="onboarding-referrals" label="Conductores referidos activados"
          value={referredDrivers} max={20} onChange={setReferredDrivers}
          description="RD$500 por referido que cumpla activación y condiciones. No basta con enviar un enlace." />
        <div className="rounded-2xl border border-[#FFD400]/20 bg-[#FFD400]/[0.07] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-300">Total bruto del ejemplo en un período</p>
          <output className="mt-2 block text-4xl font-black tabular-nums tracking-tight text-[#FFD400]"
            htmlFor="onboarding-screen-ads onboarding-sales onboarding-referrals">
            {rd(illustrativeTotalRD)}
          </output>
          <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 text-xs text-zinc-300">
            <p>Escenario mensual de anuncios: <strong>{rd(recurringMonthlyExampleRD)}</strong></p>
            <p>Eventos de venta y referido (no recurrentes): <strong>{rd(oneTimeEventsExampleRD)}</strong></p>
            <p className="flex items-start gap-2 leading-relaxed text-zinc-400">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#FFD400]" aria-hidden="true"/>
              Esta simulación no es saldo, nómina, ROI ni una promesa de ingresos. Las liquidaciones dependen de actividad verificada, comisiones aprobadas, contrato y ajustes.
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <button type="button" onClick={onPrev} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 font-bold text-white">
          <ArrowLeft size={18} aria-hidden="true"/> Anterior
        </button>
        <button type="button" onClick={onNext} className="flex min-h-12 flex-[2] items-center justify-center gap-2 rounded-xl bg-[#FFD400] px-4 font-black text-black transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD400]">
          Conocer los requisitos <ArrowRight size={18} aria-hidden="true"/>
        </button>
      </div>
    </motion.section>
  );
}
