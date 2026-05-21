import React, { useState, useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface Props {
  onNext: (data: any) => void;
  onBack: () => void;
}

export const ImpactSimulatorStep = ({ onNext, onBack }: Props) => {
  const [budget, setBudget] = useState(10000);

  // useSpring for smooth counter animation without heavy re-renders
  const animatedBudget = useSpring(budget, { stiffness: 50, damping: 20 });
  const animatedScreens = useTransform(animatedBudget, (val) => Math.floor(val / 100));
  const animatedImpressions = useTransform(animatedBudget, (val) => Math.floor((val / 100) * 850));

  // Sync state to spring on change
  useEffect(() => {
    animatedBudget.set(budget);
  }, [budget, animatedBudget]);

  // Render components that read from spring values directly
  const NumberDisplay = ({ value, label }: { value: any, label: string }) => {
    const [displayVal, setDisplayVal] = useState(0);
    
    useEffect(() => {
      return value.on("change", (v: number) => setDisplayVal(Math.floor(v)));
    }, [value]);

    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
        <div className="text-4xl font-bold text-white mb-2">
          {displayVal.toLocaleString()}
        </div>
        <div className="text-sm font-medium text-gray-400">{label}</div>
      </div>
    );
  };

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-full"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Simulador de Impacto</h2>
        <p className="text-gray-400">Proyecta el alcance de tu primera campaña con nosotros.</p>
      </div>

      <div className="flex-1 flex flex-col space-y-8">
        <div>
          <label className="flex justify-between text-sm font-medium text-gray-300 mb-4">
            <span>Presupuesto Mensual</span>
            <span className="text-white font-bold">RD$ {budget.toLocaleString()}</span>
          </label>
          <input 
            type="range" 
            min="5000" 
            max="100000" 
            step="1000"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <NumberDisplay value={animatedScreens} label="Pantallas Activas" />
          <NumberDisplay value={animatedImpressions} label="Impresiones Est." />
        </div>

        <div className="pt-8 mt-auto flex justify-between">
          <button 
            type="button"
            onClick={onBack}
            className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all"
          >
            Atrás
          </button>
          <button 
            type="button"
            onClick={() => onNext({ initialBudget: budget })}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25"
          >
            Continuar
          </button>
        </div>
      </div>
    </motion.div>
  );
};
