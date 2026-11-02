"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Crosshair,
  MonitorPlay,
  BarChart3,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface BenefitsStepProps {
  onNext: () => void;
}

const BENEFITS = [
  {
    icon: Crosshair,
    title: "Planificación local",
    copy: "Explora un escenario y confirma las zonas disponibles durante la revisión.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "hover:border-emerald-500/40",
    bar: "bg-emerald-400",
  },
  {
    icon: MonitorPlay,
    title: "Tu anuncio a bordo",
    copy: "Presenta tu creatividad en pantallas de taxis, según disponibilidad y condiciones.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "hover:border-purple-500/40",
    bar: "bg-purple-400",
  },
  {
    icon: BarChart3,
    title: "Métricas con contexto",
    copy: "Distingue las estimaciones de impacto y los resultados verificados de tu campaña.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "hover:border-blue-500/40",
    bar: "bg-blue-400",
  },
];

const PLANNING_STEPS = [
  { value: "01", label: "Define tu campaña" },
  { value: "02", label: "Explora un estimado" },
  { value: "03", label: "Solicita revisión" },
];

export default function BenefitsStep({ onNext }: BenefitsStepProps) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex-1 flex flex-col">
      <div className="text-center pt-6 pb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/[0.04] border border-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.25em] text-[#AAAAAA] mb-5">
          <Sparkles className="w-3 h-3 text-[#FDCB01]" />
          Paso 1 de 4 · Beneficios
        </div>
        <h1 className="text-[26px] sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.05] mb-2">
          Alcance local de <br />
          <span className="text-[#FDCB01]">alto impacto</span>
        </h1>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#FDCB01]">
          Planifica antes de contratar
        </p>
      </div>

      {/* Planning milestones, not claims of measured performance. */}
      <ol
        aria-label="Pasos para planificar"
        className="grid grid-cols-3 gap-2 sm:gap-3 mb-6"
      >
        {PLANNING_STEPS.map((s) => (
          <li
            key={s.label}
            className="bg-[#121212]/80 border border-white/10 rounded-xl px-2 py-3.5 sm:py-4 text-center"
          >
            <p className="text-lg sm:text-2xl font-black tracking-tighter text-[#FDCB01]">
              {s.value}
            </p>
            <p className="mt-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-[#AAAAAA]">
              {s.label}
            </p>
          </li>
        ))}
      </ol>

      {/* Benefit Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 flex-1">
        {BENEFITS.map((b) => {
          const Icon = b.icon;
          return (
            <div
              key={b.title}
              className={`group bg-[#121212]/80 border border-white/10 ${b.border} rounded-xl p-6 transition-colors duration-300 motion-reduce:transition-none stitched-card`}
            >
              <div
                className={`w-12 h-12 rounded-xl ${b.bg} grid place-items-center mb-4`}
              >
                <Icon className={`w-6 h-6 ${b.color}`} />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight mb-1.5">
                {b.title}
              </h3>
              <p className="text-xs text-[#AAAAAA] leading-relaxed">{b.copy}</p>
              <div
                className={`h-0.5 w-8 ${b.bar} rounded-full mt-5 opacity-70`}
              />
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="pt-7 mt-auto">
        <motion.button
          type="button"
          onClick={onNext}
          className="w-full min-h-[52px] bg-[#FDCB01] hover:bg-white text-black font-black uppercase tracking-[0.12em] text-sm py-4 rounded-xl transition-colors motion-reduce:transition-none shadow-[0_0_44px_rgba(253,203,1,0.28)] flex items-center justify-center gap-3"
          whileHover={reduceMotion ? undefined : { scale: 1.02 }}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        >
          <span>Simular mi campaña</span>
          <ArrowRight className="w-5 h-5" />
        </motion.button>
        <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/30">
          Simulación ilustrativa · No reserva pantallas ni garantiza resultados
        </p>
      </div>
    </div>
  );
}
