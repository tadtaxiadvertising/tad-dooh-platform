import React from 'react';

interface EarningsLedgerProps {
  currentBalance: number;
  maxLimit: number;
}

export const EarningsCard: React.FC<EarningsLedgerProps> = ({ currentBalance, maxLimit }) => {
  const progress = (currentBalance / maxLimit) * 100;

  return (
    <div className="w-full bg-black border-2 border-neutral-900 p-6">
      <div className="flex flex-col mb-6">
        <span className="text-neutral-500 text-xs font-black uppercase tracking-widest mb-2">
          Ganancias del Mes
        </span>
        <span className="text-white text-6xl font-black tracking-tighter font-mono">
          RD${currentBalance.toLocaleString('en-US')}
        </span>
        <span className="text-neutral-400 text-sm mt-1">
          De RD${maxLimit.toLocaleString()} posibles
        </span>
      </div>

      {/* Barra de Progreso Sólida */}
      <div className="w-full h-5 bg-neutral-900 overflow-hidden border border-neutral-800">
        <div 
          className="h-full bg-[#FFD400] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="flex justify-between mt-2 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
        <span>0%</span>
        <span>{Math.round(progress)}% Completado</span>
        <span>100%</span>
      </div>
    </div>
  );
};
