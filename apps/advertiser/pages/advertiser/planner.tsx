import { useState, useMemo } from 'react';
import { AdvertiserLayout } from '../../components/layout/AdvertiserLayout';
import { simulateImpact } from '../../utils/simulations';
import { BarChart3, Users, Monitor, MapPin, TrendingUp, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function CampaignPlanner() {
  const [budget, setBudget] = useState(15000);
  const [city, setCity] = useState('Santo Domingo');

  const simulation = useMemo(() => {
    return simulateImpact(budget, city, city === 'Santo Domingo' ? 120 : 45);
  }, [budget, city]);

  return (
    <AdvertiserLayout title="Planificador" subtitle="Simula el alcance de tu marca">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-10 space-y-8">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Budget <span className="text-[#fad400]">Pilot</span></h2>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-2">Configura tu inversión estimada</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-end px-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Presupuesto Mensual</label>
                  <span className="text-xl font-black text-white">RD$ {budget.toLocaleString()}</span>
                </div>
                <input 
                  type="range"
                  min={1500}
                  max={500000}
                  step={1500}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[#fad400]"
                />
                <div className="flex justify-between text-[8px] font-black text-zinc-700 uppercase tracking-widest px-2">
                  <span>RD$ 1.5k</span>
                  <span>RD$ 500k</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-2 ml-1">Zona Geográfica</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Santo Domingo', 'Santiago'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setCity(c)}
                      className={clsx(
                        "py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                        city === c 
                          ? "bg-[#fad400] text-black border-[#fad400]" 
                          : "bg-white/5 text-zinc-500 border-white/5 hover:border-white/10"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-4">
              <Info className="w-5 h-5 text-blue-400 shrink-0" />
              <p className="text-[9px] text-blue-200/60 leading-relaxed font-medium">
                Esta simulación utiliza datos históricos de telemetría de la flota TAD. Los resultados finales pueden variar según el tráfico y el clima.
              </p>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between min-h-[200px]">
                <div className="flex justify-between items-start">
                   <div className="w-12 h-12 bg-[#fad400] rounded-2xl flex items-center justify-center text-black">
                      <Users className="w-6 h-6" />
                   </div>
                   <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Impactos Estimados</p>
                   <h3 className="text-5xl font-black tracking-tighter text-white">
                      {simulation.totalImpressions.toLocaleString()}
                   </h3>
                   <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-2">Visualizaciones potenciales / mes</p>
                </div>
             </div>

             <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between min-h-[200px]">
                <div className="flex justify-between items-start">
                   <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white">
                      <Monitor className="w-6 h-6" />
                   </div>
                   <MapPin className="w-4 h-4 text-zinc-600" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Cobertura de Flota</p>
                   <h3 className="text-5xl font-black tracking-tighter text-white">
                      {simulation.recommendedScreens}
                   </h3>
                   <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-2">{city} — Unidades TAD </p>
                </div>
             </div>
          </div>

          <div className="bg-[#fad400] text-black rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_20px_50px_rgba(250,212,0,0.15)] overflow-hidden relative">
             <div className="absolute top-0 right-0 w-64 h-64 bg-black/[0.03] rounded-full -translate-y-12 translate-x-12" />
             <div className="space-y-4 relative z-10">
                <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none">¿Listo para <br/>Dominar la Calle?</h3>
                <p className="text-xs font-bold uppercase tracking-widest opacity-60">Configura tu pauta real en el hub de campañas</p>
             </div>
             <button className="bg-black text-[#fad400] px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform shadow-2xl relative z-10">
                Comenzar Campaña Ahora
             </button>
          </div>
        </div>
      </div>
    </AdvertiserLayout>
  );
}
