// frontend/src/components/advertiser/ImpactCalculator.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function ImpactCalculator({ onUpdate }: { onUpdate: (data: { screens: number, budget: number }) => void }) {
  const [screens, setScreens] = useState(1);
  const costPerScreen = 1500;
  const impactsPerScreen = 1200;

  const totalBudget = screens * costPerScreen;
  const totalImpacts = screens * impactsPerScreen;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseInt(e.target.value);
    if (isNaN(value) || value < 1) value = 1;
    if (value > 15) value = 15;
    setScreens(value);
    onUpdate({ screens: value, budget: value * costPerScreen });
  };

  return (
    <motion.div 
      className="p-6 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700 shadow-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-xl font-bold text-[#fad400] mb-4">Calculadora de Impacto</h3>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Cantidad de Pantallas (Max 15)
          </label>
          <input
            type="range"
            min="1"
            max="15"
            value={screens}
            onChange={handleChange}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#fad400]"
          />
          <div className="mt-2 flex justify-between text-slate-400 text-sm">
            <span>1</span>
            <span className="text-[#fad400] font-bold text-lg">{screens}</span>
            <span>15</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
          <div className="bg-slate-800 p-4 rounded-xl">
            <p className="text-sm text-slate-400">Inversión Mensual</p>
            <p className="text-2xl font-bold text-white">RD$ {totalBudget.toLocaleString()}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl">
            <p className="text-sm text-slate-400">Impactos Estimados</p>
            <p className="text-2xl font-bold text-[#fad400]">{totalImpacts.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
