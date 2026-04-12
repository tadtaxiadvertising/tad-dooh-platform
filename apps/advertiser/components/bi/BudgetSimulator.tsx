import React, { useState, useEffect } from 'react';
import { Target, DollarSign, Users, Activity, Loader2, BarChart3, Info } from 'lucide-react';
import api from "@tad/services";
import clsx from 'clsx';

export const BudgetSimulator = () => {
  const [budget, setBudget] = useState(25000);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const simulate = async (val: number) => {
    setLoading(true);
    try {
      const { data } = await api.post('/campaigns/simulate-budget', { budget: val });
      setResults(data);
    } catch (e) {
      console.error('Simulación fallida:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      simulate(budget);
    }, 500);
    return () => clearTimeout(timer);
  }, [budget]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-[#09090B] border border-[#18181B] rounded-[2.5rem] p-8 text-[#F4F4F5] w-full shadow-2xl relative overflow-hidden group">
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 p-40 bg-[#fad400]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-[#fad400]/10 transition-colors duration-500" />
      
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-[#fad400]/10 p-4 rounded-2xl text-[#fad400] border border-[#fad400]/20 shadow-[0_0_20px_rgba(250,212,0,0.1)]">
          <BarChart3 size={28} />
        </div>
        <div>
          <h3 className="text-2xl font-black tracking-tighter uppercase italic">Simulador de <span className="text-[#fad400]">Impacto</span></h3>
          <p className="text-[10px] font-bold text-[#F4F4F5]/40 uppercase tracking-[0.2em]">Estimación de Alcance IA v2.0</p>
        </div>
      </div>

      <div className="space-y-8 relative z-10">
        {/* Budget Input */}
        <div>
          <div className="flex justify-between items-end mb-6">
            <label className="text-xs font-black text-[#F4F4F5]/60 uppercase tracking-widest flex items-center gap-2">
              <DollarSign size={14} className="text-[#fad400]" />
              Presupuesto Mensual
            </label>
            <div className="text-3xl font-black text-white tracking-tighter">
              {formatCurrency(budget)}
            </div>
          </div>

          <input
            type="range"
            min="5000"
            max="500000"
            step="5000"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full h-1.5 bg-[#18181B] rounded-full appearance-none cursor-pointer accent-[#fad400] hover:accent-yellow-400 transition-all"
          />
          <div className="flex justify-between text-[9px] font-black text-[#F4F4F5]/20 mt-3 uppercase tracking-widest">
            <span>RD$ 5k</span>
            <span>Escalabilidad Ilimitada</span>
            <span>RD$ 500k+</span>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#18181B]/40 rounded-3xl p-6 border border-white/5 hover:border-[#fad400]/20 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Activity size={18} className="text-blue-400" />
              </div>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Alcance Estimado</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-white tracking-tighter">
                {loading ? <Loader2 className="w-8 h-8 animate-spin text-[#fad400]" /> : (results?.estimatedDevices || 0)}
              </span>
              <span className="text-xs font-bold text-zinc-600 mb-1 uppercase tracking-widest">Pantallas</span>
            </div>
            <p className="text-[9px] text-zinc-500 mt-2 leading-relaxed">Dispositivos activos sincronizados en tiempo real según inventario disponible.</p>
          </div>

          <div className="bg-[#18181B]/40 rounded-3xl p-6 border border-white/5 hover:border-[#fad400]/20 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <Target size={18} className="text-emerald-400" />
              </div>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Costo por Pantalla</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-white tracking-tighter">
                {loading ? <Loader2 className="w-8 h-8 animate-spin text-[#fad400]" /> : formatCurrency(results?.costPerDevice || 1500)}
              </span>
            </div>
            <p className="text-[9px] text-zinc-500 mt-2 leading-relaxed">Tarifa preferencial aplicada por volumen de contratación directa.</p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-[#fad400]/5 border border-[#fad400]/10 rounded-2xl p-4 flex items-start gap-4">
          <Info className="text-[#fad400] shrink-0 w-5 h-5 mt-0.5" />
          <p className="text-[10px] text-[#F4F4F5]/60 leading-relaxed font-medium">
            * Los resultados son estimaciones basadas en la disponibilidad actual de la flota. 
            El algoritmo de prioridad <span className="text-[#fad400] font-black">TAD-SMART</span> asignará automáticamente sus anuncios a los conductores con mejor desempeño.
          </p>
        </div>

        <button className="w-full py-5 bg-[#fad400] hover:bg-yellow-400 text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-[0_20px_40px_rgba(250,212,0,0.15)] hover:shadow-[0_25px_50px_rgba(250,212,0,0.25)] flex items-center justify-center gap-3 active:scale-[0.98]">
           Activar Campaña con este Presupuesto
        </button>
      </div>
    </div>
  );
};
