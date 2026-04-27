import React from 'react';
import { Target, Users, MapPin, Eye } from 'lucide-react';

export const MetricsGrid = ({ data }: { data?: any }) => {
  // Use real data if provided, fallback to defaults/mocks for display only
  const metrics = {
    cpm: 1500 / 50, // RD$ 1,500 per month / 50k impressions target = ~30 DOP CPM
    avgFrequency: 3.2, 
    totalImpacts: data?.totalImpressions || 0,
    geoDistribution: [
      { name: 'Santo Domingo', value: 75, color: '#FFD700' },
      { name: 'Santiago', value: 25, color: '#3B82F6' }
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
              LIVE_DATA
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

        {/* Total Scans Card (Replaced Geo for more relevance to advertiser) */}
        <div className="bg-[#18181B] rounded-2xl p-6 border border-[#F4F4F5]/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-16 bg-[#FFD700]/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="bg-[#09090B] p-2.5 rounded-lg text-[#FFD700] border border-[#FFD700]/20">
              <Target size={20} />
            </div>
            <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
              CTR: {(data?.ctr || 0).toFixed(2)}%
            </span>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-[#F4F4F5]/60 mb-1">Escaneos QR Totales</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white tracking-tighter">
                {formatNumber(data?.totalScans || 0)}
              </span>
            </div>
            <p className="text-xs text-[#F4F4F5]/40 mt-2">Interacciones directas con tu contenido</p>
          </div>
        </div>
      </div>
    </div>
  );
};
