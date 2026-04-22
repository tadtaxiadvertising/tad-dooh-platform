import React from 'react';
import { motion } from 'framer-motion';

interface EarningsCardProps {
  currentBalance: number;
  maxLimit: number;
}

export const EarningsCard: React.FC<EarningsCardProps> = ({ currentBalance, maxLimit }) => {
  const progress = (currentBalance / maxLimit) * 100;
  const remaining = maxLimit - currentBalance;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl"
    >
      <p className="text-neutral-400 text-sm font-medium mb-1">Balance Actual</p>
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-white text-5xl font-extrabold tracking-tight">
          RD$ {currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-[#FFD400]">Progreso del límite</span>
          <span className="text-neutral-400">{Math.round(progress)}%</span>
        </div>
        
        <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-[#FFD400]"
          />
        </div>

        <p className="text-neutral-500 text-xs leading-relaxed">
          Faltan <span className="text-white/80 font-semibold">RD$ {remaining.toLocaleString()}</span> para alcanzar el límite máximo de ganancias mensual de RD$ {maxLimit.toLocaleString()}.
        </p>
      </div>
    </motion.div>
  );
};
