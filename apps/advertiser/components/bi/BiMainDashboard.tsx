import React from 'react';
import { BiKpiCard } from './BiKpiCard';
import { BiHeatmap } from './BiHeatmap';
import { MetricsGrid } from './MetricsGrid';
import { ScreenUpsellCalculator } from './ScreenUpsellCalculator';
import { 
  Users, 
  Eye, 
  MapPin, 
  Zap,
  TrendingUp,
  BarChart3
} from 'lucide-react';

export const BiMainDashboard = () => {
  return (
    <div className="space-y-12">
      {/* Upper Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <BiKpiCard 
          title="Impactos Totales" 
          value="1.45M" 
          trend="+12.5%" 
          icon={Eye} 
          chartColor="#FFD700" 
        />
        <BiKpiCard 
          title="Alcance Único" 
          value="482K" 
          trend="+5.2%" 
          icon={Users} 
          chartColor="#3B82F6" 
        />
        <BiKpiCard 
          title="Pantallas Activas" 
          value="156" 
          trend="+8" 
          icon={Zap} 
          chartColor="#10B981" 
        />
        <BiKpiCard 
          title="Frecuencia Promedio" 
          value="3.2x" 
          trend="Estable" 
          icon={TrendingUp} 
          chartColor="#8B5CF6" 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Map Area */}
        <div className="xl:col-span-2 bg-[#18181B] rounded-[2.5rem] p-8 border border-white/5 space-y-6">
          <div className="flex justify-between items-center px-2">
             <div className="flex items-center gap-3">
                <MapPin className="text-[#FFD700]" size={20} />
                <h3 className="text-xl font-black uppercase tracking-tighter italic">Distribución <span className="text-[#FFD700]">Geográfica</span></h3>
             </div>
             <div className="flex gap-2">
                <span className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-black uppercase text-zinc-400">Hoy</span>
                <span className="px-3 py-1 bg-[#FFD700] rounded-full text-[9px] font-black uppercase text-black">Mes Actual</span>
             </div>
          </div>
          
          <div className="h-[500px] w-full bg-zinc-950 rounded-3xl overflow-hidden border border-white/5">
             <BiHeatmap />
          </div>
        </div>

        {/* Right Column: Calculator & Quick Insights */}
        <div className="space-y-8">
          <ScreenUpsellCalculator />
          
          <div className="bg-gradient-to-br from-indigo-900/20 to-zinc-900 border border-indigo-500/10 rounded-[2.5rem] p-8 space-y-4">
             <div className="flex items-center gap-3">
                <BarChart3 className="text-indigo-400" size={20} />
                <h3 className="text-lg font-black uppercase tracking-tighter italic">Nivel de <span className="text-indigo-400">Share-of-Voice</span></h3>
             </div>
             <p className="text-zinc-500 text-xs font-medium">Tu pauta tiene una visibilidad del 68% en las rutas de Santo Domingo Piantini/Naco.</p>
             
             <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-[68%]" />
             </div>
             <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <span>0%</span>
                <span>Óptimo 80%</span>
             </div>
          </div>
        </div>
      </div>

      {/* Deep Insights Grid */}
      <MetricsGrid />
    </div>
  );
};
