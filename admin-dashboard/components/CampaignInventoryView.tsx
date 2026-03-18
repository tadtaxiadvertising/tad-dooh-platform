import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Target, Users } from 'lucide-react';

interface DistributionData {
  campaign_name: string;
  total_screens: number;
  monthly_revenue: number;
  taxis: Array<{
    id: string;
    deviceId: string;
    taxiNumber: string;
    driverName: string;
    status: string;
    is_online: boolean;
  }>;
}

export default function CampaignInventoryView({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<DistributionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (campaignId) {
      fetch(`/api/campaigns/stats/${campaignId}/distribution`)
        .then(res => res.json())
        .then(data => {
            if (data.statusCode === 404 || data.statusCode === 401) {
              console.error('API Error:', data.message);
              return;
            }
            setData(data);
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
    }
  }, [campaignId]);

  if (loading) return (
    <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl animate-pulse">
      <div className="h-8 w-64 bg-zinc-900 rounded-lg mb-4" />
      <div className="h-4 w-32 bg-zinc-900 rounded-lg" />
    </div>
  );

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-950 border border-white/5 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <LayoutDashboard size={48} className="text-tad-yellow" />
          </div>
          <p className="text-zinc-500 font-black text-[10px] uppercase tracking-widest mb-2">Ingreso Mensual</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">RD$ {data.monthly_revenue.toLocaleString()}</span>
            <span className="text-zinc-600 text-[10px] font-bold uppercase">POR MES</span>
          </div>
        </div>

        <div className="bg-zinc-950 border border-white/5 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Target size={48} className="text-tad-yellow" />
          </div>
          <p className="text-zinc-500 font-black text-[10px] uppercase tracking-widest mb-2">Pantallas Activas</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{data.total_screens}</span>
            <span className="text-zinc-600 text-[10px] font-bold uppercase">UNIDADES</span>
          </div>
        </div>

        <div className="bg-zinc-950 border border-white/5 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={48} className="text-tad-yellow" />
          </div>
          <p className="text-zinc-500 font-black text-[10px] uppercase tracking-widest mb-2">Retorno Operativo</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-green-500">{( (data.monthly_revenue - (data.total_screens * 500)) / data.monthly_revenue * 100).toFixed(0)}%</span>
            <span className="text-zinc-600 text-[10px] font-bold uppercase">MARGEN</span>
          </div>
        </div>
      </div>

      {/* Grid of Taxis */}
      <h3 className="text-white font-black text-sm uppercase tracking-widest px-2">Células de Propagación Activas</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.taxis.map(taxi => (
          <div key={taxi.id} className="group p-5 bg-zinc-950/50 border border-white/5 rounded-2xl hover:border-tad-yellow/30 transition-all">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <span className="text-white font-black text-xs uppercase tracking-tight block">{taxi.taxiNumber}</span>
                  <span className="text-zinc-600 text-[10px] font-bold uppercase truncate max-w-[150px] block">{taxi.driverName}</span>
               </div>
               <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${
                 taxi.is_online ? 'bg-tad-yellow/10 text-tad-yellow border border-tad-yellow/20' : 'bg-zinc-900 text-zinc-600 border border-white/5'
               }`}>
                 {taxi.is_online ? 'SYNC_LIVE' : 'SYNC_LOST'}
               </span>
            </div>
            
            <div className="space-y-3">
               <div className="flex justify-between items-end">
                  <span className="text-zinc-700 text-[9px] font-bold uppercase tracking-widest">Inventory Slot</span>
                  <span className="text-tad-yellow text-[9px] font-black uppercase">RD$ 1,500 / mes</span>
               </div>
               <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-tad-yellow w-full opacity-50 group-hover:opacity-100 transition-opacity" />
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
