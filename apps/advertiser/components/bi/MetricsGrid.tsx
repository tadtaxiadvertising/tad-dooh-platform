import React from 'react';
import { Target, Users, Eye } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/SkeletonCard';

export const MetricsGrid = ({ data, loading = false }: { data?: any; loading?: boolean }) => {
  if (loading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{Array.from({length:3}).map((_,i)=><SkeletonCard key={i} variant="kpi-card" />)}</div>;
  const totalImpacts = data?.totalImpressions || 0;
  const totalCost = data?.financials?.totalCost || 0;
  const cpm = totalImpacts > 0 ? (totalCost / totalImpacts) * 1000 : null;
  const formatNumber = (num: number) => new Intl.NumberFormat('es-DO').format(num);
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{[
    {label:'CPM (Costo por Mil)', value: cpm === null ? '--' : `RD$ ${cpm.toFixed(2)}`, icon: Eye, note:`Basado en ${formatNumber(totalImpacts)} impresiones reales`},
    {label:'Frecuencia Promedio', value:`${data?.avgFrequency || 0}x`, icon: Users, note:'Exposiciones por ciudadano promedio'},
    {label:'Escaneos QR Totales', value:formatNumber(data?.totalScans || 0), icon: Target, note:`CTR: ${(data?.ctr || 0).toFixed(2)}%`}
  ].map((m, i)=><div key={i} className="bg-[#18181B] rounded-2xl p-6 border border-[#F4F4F5]/10"><m.icon className="text-[#FFD700] mb-4" size={20}/><p className="text-sm text-[#F4F4F5]/60">{m.label}</p><p className="text-3xl font-black">{m.value}</p><p className="text-xs text-[#F4F4F5]/40 mt-2">{m.note}</p></div>)}</div>;
};
