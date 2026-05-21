// apps/advertiser/components/advertiser/CampaignStep.tsx
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Monitor, CreditCard, Info } from 'lucide-react';

interface CampaignStepProps {
  formData: any;
  setFormData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

const CampaignStep: React.FC<CampaignStepProps> = ({ formData, setFormData, onNext, onPrev }) => {
  const RATE_PER_SLOT = 1500;
  const MAX_SLOTS = 15;

  const handleScreensChange = (screens: number) => {
    const validScreens = Math.min(Math.max(screens, 1), MAX_SLOTS);
    setFormData({
      ...formData,
      expectedScreens: validScreens,
      budget: validScreens * RATE_PER_SLOT
    });
  };

  useEffect(() => {
    // Ensure budget is initialized correctly if not already
    if (!formData.budget || formData.budget !== formData.expectedScreens * RATE_PER_SLOT) {
      setFormData({
        ...formData,
        budget: formData.expectedScreens * RATE_PER_SLOT
      });
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-xl mx-auto space-y-6"
    >
      <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-black text-white tracking-tight">CALCULADORA DE IMPACTO</h2>
          <p className="text-slate-400 text-sm">Define el alcance de tu campaña en tiempo real</p>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <label className="text-white font-bold flex items-center gap-2">
                <Monitor className="w-5 h-5 text-[#fad400]" />
                Cantidad de Pantallas
              </label>
              <span className="text-3xl font-black text-[#fad400]">{formData.expectedScreens}</span>
            </div>
            <input
              type="range"
              min="1"
              max={MAX_SLOTS}
              step="1"
              value={formData.expectedScreens}
              onChange={(e) => handleScreensChange(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#fad400]"
            />
            <div className="flex justify-between mt-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              <span>1 Pantalla</span>
              <span>Límite: {MAX_SLOTS} Pantallas</span>
            </div>
          </div>

          <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800">
            <label className="text-white font-bold flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-[#fad400]" />
              Zona de Cobertura
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Santo Domingo', 'Santiago', 'Punta Cana'].map((city) => (
                <button
                  key={city}
                  onClick={() => setFormData({ ...formData, targetCity: city })}
                  className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                    formData.targetCity === city 
                      ? 'bg-[#fad400] text-slate-950 border-[#fad400]' 
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950/50 p-5 rounded-3xl border border-slate-800 flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Inversión Mensual</span>
              <span className="text-2xl font-black text-white">RD$ {formData.budget.toLocaleString()}</span>
            </div>
            <div className="bg-slate-950/50 p-5 rounded-3xl border border-slate-800 flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Impacto Estimado</span>
              <span className="text-2xl font-black text-white">~{(formData.expectedScreens * 12500).toLocaleString()} <span className="text-xs text-slate-500">VISTAS</span></span>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300 leading-relaxed">
              Cada anuncio garantiza una frecuencia premium de 30 segundos en rotación continua durante todo el mes operativo, dentro del tope de 15 slots por tablet.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onPrev}
          className="flex-1 bg-slate-900 text-slate-400 font-bold py-4 rounded-2xl border border-slate-800 hover:bg-slate-800 transition-colors"
        >
          ATRÁS
        </button>
        <button
          onClick={onNext}
          className="flex-[2] bg-[#fad400] text-slate-950 font-black py-4 rounded-2xl hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(250,212,0,0.15)]"
        >
          CONTINUAR
        </button>
      </div>
    </motion.div>
  );
};

export default CampaignStep;
