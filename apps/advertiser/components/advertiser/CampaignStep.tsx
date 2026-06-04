import React from 'react';
import { Target, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface CampaignStepProps {
  formData: any;
  setFormData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function CampaignStep({ formData, setFormData, onNext, onPrev }: CampaignStepProps) {
  const cities = ['Santo Domingo', 'Santiago'];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-2xl mx-auto bg-slate-900/60 backdrop-blur-3xl border border-slate-800 p-10 rounded-[3rem] shadow-2xl space-y-8"
    >
      <div className="flex items-center gap-3">
        <Target className="w-5 h-5 text-[#fad400]" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Configura tu <span className="text-[#fad400]">Campaña</span></h2>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1">Presupuesto Mensual</label>
          <input
            type="number"
            min={1500}
            max={500000}
            step={1500}
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
            className="w-full bg-black/40 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-[#fad400] transition-all"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1">Pantallas Objetivo</label>
          <input
            type="number"
            min={1}
            max={500}
            value={formData.expectedScreens}
            onChange={(e) => setFormData({ ...formData, expectedScreens: Number(e.target.value) })}
            className="w-full bg-black/40 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-[#fad400] transition-all"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1">Zona Geográfica</label>
          <div className="grid grid-cols-2 gap-2">
            {cities.map((c) => (
              <button
                key={c}
                onClick={() => setFormData({ ...formData, targetCity: c })}
                className={clsx(
                  "py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                  formData.targetCity === c
                    ? "bg-[#fad400] text-black border-[#fad400]"
                    : "bg-white/5 text-slate-500 border-slate-800 hover:border-white/10"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button onClick={onPrev} className="flex-1 py-4 bg-white/5 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all border border-slate-800">
          <ArrowLeft className="w-4 h-4 inline mr-2" /> Atrás
        </button>
        <button onClick={onNext} className="flex-1 py-4 bg-[#fad400] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-[#fad400]/10">
          Continuar <ArrowRight className="w-4 h-4 inline ml-2" />
        </button>
      </div>
    </motion.div>
  );
}