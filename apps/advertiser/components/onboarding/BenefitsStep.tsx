'use client';

import { motion } from 'framer-motion';
import { Crosshair, MonitorPlay, BarChart3, ArrowRight, Sparkles, TrendingUp, Users, Store, Target } from 'lucide-react';

interface BenefitsStepProps {
  onNext: () => void;
}

const BENEFITS = [
  {
    icon: Crosshair,
    title: 'Segmentación precisa',
    copy: 'Dirige tu anuncio a las rutas exactas que transitan los taxis.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'hover:border-emerald-500/40',
    bar: 'bg-emerald-400',
  },
  {
    icon: MonitorPlay,
    title: 'Exposición exclusiva',
    copy: 'Pantallas HD dedicadas que garantizan la atención del pasajero.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'hover:border-purple-500/40',
    bar: 'bg-purple-400',
  },
  {
    icon: BarChart3,
    title: 'ROI medible',
    copy: 'Analíticas detalladas de impresiones y frecuencia de tu campaña.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'hover:border-blue-500/40',
    bar: 'bg-blue-400',
  },
];

const ANCHOR_STATS = [
  { value: '3.4X', label: 'ROI promedio' },
  { value: '500K+', label: 'Impactos mensuales' },
  { value: '120+', label: 'Pantallas activas' },
];

export default function BenefitsStep({ onNext }: BenefitsStepProps) {
  return (
    <motion.div
      className="flex-1 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="text-center pt-6 pb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/[0.04] border border-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.25em] text-[#AAAAAA] mb-5"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
        >
          <Sparkles className="w-3 h-3 text-[#FDCB01]" />
          Paso 1 de 4 · Beneficios
        </motion.div>
        <motion.h1
          className="text-[32px] sm:text-5xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tight leading-[1.05] mb-2 max-w-none"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Alcance local de{' '}
          <br />
          <span className="text-[#FDCB01]">alto impacto</span>
        </motion.h1>
        <motion.p
          className="text-base md:text-lg font-bold uppercase tracking-[0.18em] text-[#FDCB01] max-w-none"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Cobertura geolocalizada
        </motion.p>
      </motion.div>

      {/* Anchor Stats */}
      <motion.div
        className="grid grid-cols-3 gap-2 sm:gap-3 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {ANCHOR_STATS.map((s, i) => (
          <motion.div
            key={s.label}
            className="bg-[#121212]/80 border border-white/10 rounded-xl px-2 py-3.5 sm:py-4 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.1, type: 'spring', stiffness: 260, damping: 20 }}
            whileHover={{ scale: 1.05, y: -2 }}
          >
            <p className="text-lg sm:text-2xl font-black tracking-tighter text-[#FDCB01]">{s.value}</p>
            <p className="mt-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-[#AAAAAA]">
              {s.label}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Benefit Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        {BENEFITS.map((b, i) => {
          const Icon = b.icon;
          return (
            <motion.div
              key={b.title}
              className={`group bg-[#121212]/80 border border-white/10 ${b.border} rounded-xl p-6 transition-all duration-300 stitched-card`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <motion.div
                className={`w-12 h-12 rounded-xl ${b.bg} grid place-items-center mb-4`}
                whileHover={{ scale: 1.1, rotate: 3 }}
              >
                <Icon className={`w-6 h-6 ${b.color}`} />
              </motion.div>
              <motion.h3
                className="text-sm font-black text-white uppercase tracking-tight mb-1.5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
              >
                {b.title}
              </motion.h3>
              <motion.p
                className="text-xs text-[#AAAAAA] leading-relaxed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 + i * 0.1 }}
              >
                {b.copy}
              </motion.p>
              <motion.div
                className={`h-0.5 w-8 ${b.bar} rounded-full mt-5 opacity-70 group-hover:w-full group-hover:opacity-100 transition-all duration-500`}
                initial={{ width: 0 }}
                animate={{ width: '2rem' }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.6 }}
              />
            </motion.div>
          );
        })}

      </motion.div>

      {/* CTA */}
      <motion.div
        className="pt-7 mt-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.5 }}
      >
        <motion.button
          onClick={onNext}
          className="w-full min-h-[52px] bg-[#FDCB01] hover:bg-white text-black font-black uppercase tracking-[0.12em] text-sm py-4 rounded-xl transition-all active:scale-[0.98] shadow-[0_0_44px_rgba(253,203,1,0.28)] flex items-center justify-center gap-3"
          whileHover={{ scale: 1.02, boxShadow: '0 10px 50px rgba(253,203,1,0.4)' }}
          whileTap={{ scale: 0.98 }}
        >
          <span>Simular mi campaña</span>
          <ArrowRight className="w-5 h-5" />
        </motion.button>
        <motion.p
          className="mt-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          Sin costo · Sin compromiso
        </motion.p>
      </motion.div>
    </motion.div>
  );
}