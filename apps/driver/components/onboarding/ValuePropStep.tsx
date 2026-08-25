'use client';

import { motion } from 'framer-motion';
import { DollarSign, Store, Users, Sparkles, ArrowRight } from 'lucide-react';

const REFERRAL_DRIVER_BONUS = 500;
const REFERRAL_BUSINESS_BONUS = 1000;

interface ValuePropStepProps {
  onNext: () => void;
}

const BENEFITS = [
  {
    icon: DollarSign,
    title: 'Pagos por Campaña',
    desc: 'Recibe RD$500 mensuales por cada anuncio activo en tu pantalla (hasta 15 anuncios simultáneos).',
    color: 'text-[#22C55E]',
    bg: 'bg-[#22C55E]/10',
    border: 'border-[#22C55E]/20',
  },
  {
    icon: Store,
    title: 'Referidos de Negocios',
    desc: `Gana RD$${REFERRAL_BUSINESS_BONUS.toLocaleString()} adicionales por cada marca o negocio local que recomiendes y se anuncie con nosotros.`,
    color: 'text-[#FF8C00]',
    bg: 'bg-[#FF8C00]/10',
    border: 'border-[#FF8C00]/20',
  },
  {
    icon: Users,
    title: 'Invitar Compañeros',
    desc: `Gana un bono de RD$${REFERRAL_DRIVER_BONUS.toLocaleString()} por cada compañero taxista que refieras cuando instale su pantalla.`,
    color: 'text-[#22C55E]',
    bg: 'bg-[#22C55E]/10',
    border: 'border-[#22C55E]/20',
  },
];

export default function ValuePropStep({ onNext }: ValuePropStepProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <motion.div
        className="text-center pt-6 pb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="w-20 h-20 bg-[#FDCB01] rounded-[1.75rem] flex items-center justify-center mx-auto mb-6 shadow-[0_20px_60px_rgba(253,203,1,0.15)]"
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
          whileHover={{ scale: 1.05, rotate: 3 }}
        >
          <Sparkles className="w-10 h-10 text-black" />
        </motion.div>
        <motion.h1
          className="text-[28px] font-black text-white uppercase tracking-tight leading-tight mb-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Tu taxi genera{' '}
          <span className="text-[#FDCB01]">dinero extra</span>
        </motion.h1>
        <motion.p
          className="text-sm text-gray-400 font-medium leading-relaxed max-w-[320px] mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Coloca una pantalla publicitaria en tu taxi y gana dinero mensual mientras realizas tus rutas de siempre.
        </motion.p>
      </motion.div>

      {/* Benefit Cards */}
      <motion.div
        className="space-y-3 flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {BENEFITS.map((b, i) => {
          const Icon = b.icon;
          return (
            <motion.div
              key={i}
              className={`flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border ${b.border} hover:bg-white/[0.04] transition-all duration-300 hover:border-opacity-50`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ x: 4, scale: 1.01 }}
            >
              <motion.div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${b.bg} ${b.color}`}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Icon className="w-5 h-5" />
              </motion.div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-white uppercase tracking-tight">{b.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{b.desc}</p>
              </div>
            </motion.div>
          );
        })}

        {/* Highlighted Referral Card - R6 Formula */}
        <motion.div
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#FF8C00]/10 via-[#FDCB01]/5 to-[#FF8C00]/10 border border-[#FF8C00]/30 p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF8C00]/5 via-transparent to-[#FDCB01]/5" />
          <div className="relative flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[#FF8C00]/20 border border-[#FF8C00]/30 text-[#FF8C00]">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                Programa de Referidos - Negocios Locales
                <motion.span
                  className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-[#FF8C00] text-black rounded"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 20 }}
                >
                  R6
                </motion.span>
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Refiere un negocio local y gana <span className="font-bold text-[#FF8C00]">RD$1,000</span> cuando contrate publicidad.
                <br />
                <span className="text-[#FDCB00] font-bold">Fórmula R6:</span> RD$500 base + RD$500 por activación exitosa = <span className="font-black text-white">RD$1,000 totales</span> por referido convertido.
              </p>
            </div>
            <motion.div
              className="shrink-0 text-right"
              whileHover={{ scale: 1.1 }}
            >
              <p className="text-2xl font-black text-[#FF8C00]">RD$1,000</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">por referido</p>
            </motion.div>
          </div>
        </motion.div>
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
          whileHover={{ scale: 1.02, boxShadow: '0 15px 50px rgba(253,203,1,0.25)' }}
          whileTap={{ scale: 0.98 }}
        >
          <span>PROBAR SIMULADOR DE GANANCIAS</span>
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </motion.div>
    </div>
  );
}