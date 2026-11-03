"use client";

import { motion, useReducedMotion } from "framer-motion";
import { DollarSign, Users, Sparkles, ArrowRight, Zap } from "lucide-react";

const REFERRAL_DRIVER_BONUS = 500;

interface ValuePropStepProps {
  onNext: () => void;
}

const BENEFITS = [
  {
    icon: DollarSign,
    title: "Comisión por venta de publicidad",
    subtitle: "RD$500 por venta aprobada",
    desc: "La comisión se genera al validar la venta. No es un ingreso mensual automático ni se acredita solo por un interesado.",
    color: "text-[#22C55E]",
    bg: "bg-[#22C55E]/10",
    border: "border-[#22C55E]/20",
  },
  {
    icon: Users,
    title: "Referir otros conductores",
    subtitle: `RD${REFERRAL_DRIVER_BONUS.toLocaleString()} por referido activado`,
    desc: "El bono se genera cuando el conductor referido completa los requisitos de activación; no basta con compartir tu enlace.",
    color: "text-[#22C55E]",
    bg: "bg-[#22C55E]/10",
    border: "border-[#22C55E]/20",
  },
  {
    icon: Zap,
    title: "Publicidad en tu pantalla",
    subtitle: "Hasta 15 anuncios elegibles",
    desc: "RD$500 por anuncio elegible en el escenario mensual, sujeto a actividad verificada y a las condiciones de tu contrato.",
    color: "text-[#FDCB01]",
    bg: "bg-[#FDCB01]/10",
    border: "border-[#FDCB01]/20",
  },
];

export default function ValuePropStep({ onNext }: ValuePropStepProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <motion.div
        className="text-center pt-6 pb-8"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="w-20 h-20 bg-[#FDCB01] rounded-[1.75rem] flex items-center justify-center mx-auto mb-6 shadow-[0_20px_60px_rgba(253,203,1,0.15)]"
          initial={reduceMotion ? false : { scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: 0.1,
            duration: 0.7,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          whileHover={{ scale: 1.05, rotate: 3 }}
        >
          <Sparkles className="w-10 h-10 text-black" />
        </motion.div>
        <motion.h1
          className="text-[28px] font-black text-white uppercase tracking-tight leading-tight mb-3"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Tu taxi abre{" "}
          <span className="text-[#FDCB01]">tres oportunidades</span>
        </motion.h1>
        <motion.p
          className="text-sm text-gray-400 font-medium leading-relaxed max-w-[320px] mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Conoce cómo funcionan los anuncios elegibles, las ventas publicitarias
          y los bonos por conductores referidos antes de comenzar.
        </motion.p>
      </motion.div>

      {/* Benefit Cards */}
      <motion.div
        className="space-y-3 flex-1"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {BENEFITS.map((b, i) => {
          const Icon = b.icon;
          return (
            <motion.div
              key={i}
              className={`flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border ${b.border} hover:bg-white/[0.04] transition-all duration-300 hover:border-opacity-50`}
              initial={reduceMotion ? false : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.4 + i * 0.1,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={reduceMotion ? undefined : { x: 4, scale: 1.01 }}
            >
              <motion.div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${b.bg} ${b.color}`}
                whileHover={
                  reduceMotion ? undefined : { scale: 1.1, rotate: 5 }
                }
              >
                <Icon className="w-5 h-5" />
              </motion.div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-white uppercase tracking-tight">
                  {b.title}
                </h3>
                {b.subtitle && (
                  <p className="text-[10px] font-bold text-gray-500/70 mt-0.5 uppercase tracking-wider leading-tight">
                    {b.subtitle}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {b.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* CTA */}
      <motion.div
        className="pt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <motion.button
          onClick={onNext}
          className="w-full bg-[#FDCB01] hover:bg-white text-black font-black uppercase tracking-[0.15em] text-sm py-5 rounded-2xl transition-all shadow-[0_10px_40px_rgba(253,203,1,0.15)] active:scale-[0.97] flex items-center justify-center gap-3"
          whileHover={{
            scale: 1.02,
            boxShadow: "0 15px 50px rgba(253,203,1,0.25)",
          }}
          whileTap={{ scale: 0.98 }}
        >
          <span>PROBAR SIMULADOR DE GANANCIAS</span>
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </motion.div>
    </div>
  );
}
