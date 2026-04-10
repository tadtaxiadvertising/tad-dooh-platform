import React from 'react';
import { Target, Users, MapPin, Eye } from 'lucide-react';

export const MetricsGrid = () => {
  // Mock data for CMO insights
  const metrics = {
    cpm: 25.50, // Cost Per Mille (Thousand) in DOP
    avgFrequency: 3.2, 
    totalImpacts: 1450000,
    geoDistribution: [
      { name: 'Santo Domingo', value: 75, color: '#FFD700' }, // TAD Yellow
      { name: 'Santiago', value: 25, color: '#3B82F6' } // Blue Accent
    ]
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('es-DO').format(num);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="text-[#FFD700]" size={24} />
        <h2 className="text-2xl font-bold text-white tracking-tight">Marketing Insights</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CPM Card */}
        <div className="bg-[#18181B] rounded-2xl p-6 border border-[#F4F4F5]/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-16 bg-[#FFD700]/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="bg-[#09090B] p-2.5 rounded-lg text-[#FFD700] border border-[#FFD700]/20">
              <Eye size={20} />
            </div>
            <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
              -12% vs last month
            </span>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-[#F4F4F5]/60 mb-1">CPM (Costo por Mil)</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white tracking-tighter">
                RD$ {metrics.cpm.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-[#F4F4F5]/40 mt-2">Basado en {formatNumber(metrics.totalImpacts)} impactos validados vía GPS</p>
          </div>
        </div>

        {/* Average Frequency Card */}
        <div className="bg-[#18181B] rounded-2xl p-6 border border-[#F4F4F5]/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-16 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="bg-[#09090B] p-2.5 rounded-lg text-blue-400 border border-blue-500/20">
              <Users size={20} />
            </div>
            <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
              +0.4% optimal
            </span>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-[#F4F4F5]/60 mb-1">Frecuencia Promedio</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white tracking-tighter">
                {metrics.avgFrequency}x
              </span>
            </div>
            <p className="text-xs text-[#F4F4F5]/40 mt-2">Exposiciones por ciudadano promedio</p>
          </div>
        </div>

        {/* Geo Distribution Card */}
        <div className="bg-[#18181B] rounded-2xl p-6 border border-[#F4F4F5]/10 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-[#09090B] p-2.5 rounded-lg text-rose-400 border border-rose-500/20">
              <MapPin size={20} />
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-[#F4F4F5]/60 mb-3">Distribución Geo</p>
            <div className="flex h-3 w-full rounded-full overflow-hidden bg-[#09090B]">
              <div 
                className="h-full bg-[#FFD700]" 
                style={{ width: `${metrics.geoDistribution[0].value}%` }} 
                title={metrics.geoDistribution[0].name}
              />
              <div 
                className="h-full bg-[#3B82F6]" 
                style={{ width: `${metrics.geoDistribution[1].value}%` }}
                title={metrics.geoDistribution[1].name}
              />
            </div>
            
            <div className="flex justify-between mt-3">
              {metrics.geoDistribution.map(geo => (
                <div key={geo.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: geo.color }} />
                  <span className="text-[#F4F4F5]/80">{geo.name} ({geo.value}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
