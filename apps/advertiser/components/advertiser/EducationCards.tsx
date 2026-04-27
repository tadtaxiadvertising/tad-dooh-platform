// apps/advertiser/components/advertiser/EducationCards.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, Video, ShieldCheck, ArrowRight } from 'lucide-react';

interface EducationCardsProps {
  onNext: () => void;
}

const EducationCards: React.FC<EducationCardsProps> = ({ onNext }) => {
  const cards = [
    {
      title: 'Movilidad Premium',
      description: 'Tu marca recorre toda la ciudad en las tablets de nuestra flota exclusiva de taxis.',
      icon: <Rocket className="w-8 h-8 text-[#fad400]" />,
      delay: 0.1
    },
    {
      title: 'Calidad 4K/HD',
      description: 'Aceptamos videos MP4 (H.264) de hasta 55MB para garantizar la mejor experiencia visual.',
      icon: <Video className="w-8 h-8 text-[#fad400]" />,
      delay: 0.2
    },
    {
      title: 'Transparencia Total',
      description: 'Tarifa única de RD$ 1,500 mensuales por cada pantalla de 15 segundos.',
      icon: <ShieldCheck className="w-8 h-8 text-[#fad400]" />,
      delay: 0.3
    }
  ];

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {cards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: card.delay, duration: 0.5 }}
            className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl flex flex-col items-start gap-4 hover:border-[#fad400]/50 transition-colors group shadow-2xl"
          >
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 group-hover:scale-110 transition-transform">
              {card.icon}
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">{card.title}</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              {card.description}
            </p>
          </motion.div>
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={onNext}
        className="group flex items-center gap-3 bg-[#fad400] text-slate-950 px-8 py-4 rounded-2xl font-black text-lg hover:bg-yellow-400 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(250,212,0,0.2)]"
      >
        COMENZAR AHORA
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </motion.button>
    </div>
  );
};

export default EducationCards;
