import React from 'react';
import { Sparkles, Monitor, Users, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface EducationCardsProps {
  onNext: () => void;
}

export default function EducationCards({ onNext }: EducationCardsProps) {
  const cards = [
    { icon: Monitor, title: 'DOOH Network', desc: 'Pantallas en movimiento reaches real audiences' },
    { icon: Users, title: 'Smart Targeting', desc: 'Segmentación geográfica y temporal avanzada' },
    { icon: BarChart3, title: 'Real Analytics', desc: 'Métricas en tiempo real de impacto y rendimiento' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto space-y-10"
    >
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-full backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-[#fad400]" />
          <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">Step 1 — Conoce la Plataforma</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-slate-900/60 backdrop-blur-3xl border border-slate-800 rounded-[2rem] p-8 space-y-4 hover:border-[#fad400]/20 transition-all">
              <div className="w-12 h-12 bg-[#fad400]/10 rounded-2xl flex items-center justify-center">
                <Icon className="w-6 h-6 text-[#fad400]" />
              </div>
              <h4 className="text-sm font-black uppercase tracking-tight text-white">{card.title}</h4>
              <p className="text-[10px] text-slate-500 font-medium">{card.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <button
          onClick={onNext}
          className="px-10 py-5 bg-[#fad400] text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-[#fad400]/20 hover:scale-105 transition-transform"
        >
          Comenzar Registro
        </button>
      </div>
    </motion.div>
  );
}