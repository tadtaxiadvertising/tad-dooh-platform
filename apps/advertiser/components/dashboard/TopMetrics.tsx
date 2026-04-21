import { use } from 'react';
import clsx from 'clsx';
import { Megaphone, TrendingUp, Activity, Clock } from 'lucide-react';

export function TopMetrics({ metricsPromise }: { metricsPromise: Promise<any> }) {
  const data = use(metricsPromise);

  const activeCampaigns = (data?.campaigns || []).filter((c: any) => c.status === 'ACTIVE').length || 0;
  const totalCampaigns = (data?.campaigns || []).length || 0;
  const impressions = data?.summary?.impressions || 0;
  const mediaCount = (data?.campaigns || []).reduce((acc: number, c: any) => acc + (c.mediaAssets?.length || 0), 0) || 0;

  const stats = [
    { icon: <Megaphone />, label: "Campañas Activas", value: activeCampaigns, sub: `${totalCampaigns} Totales Creadas`, color: "yellow" },
    { icon: <TrendingUp />, label: "Impresiones Totales", value: impressions.toLocaleString(), sub: "Impactos Confirmados", color: "white" },
    { icon: <Activity />, label: "Delivery Rate", value: "98.5", sub: "% Efectividad de Emisión", color: "yellow" },
    { icon: <Clock />, label: "Ads Desplegados", value: mediaCount, sub: "Piezas Multimedia Activas", color: "white" }
  ];

  return (
    <>
      {stats.map((s, i) => (
        <StitchedStatsCard key={i} {...s} delay={i * 100} />
      ))}
    </>
  );
}

export function TopMetricsSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[220px] bg-white/5 rounded-[2.5rem] animate-pulse border border-white/5" />
      ))}
    </>
  );
}

function StitchedStatsCard({ icon, label, value, sub, color, delay }: any) {
  return (
    <div className={clsx(
      "stitched-card p-8 flex flex-col justify-between min-h-[220px] group/card animate-in fade-in slide-in-from-bottom-12 fill-mode-both",
      `delay-${delay}`
    )}>
      <style jsx>{`
        .stitched-card { animation-delay: ${delay}ms; }
      `}</style>
      <div className="flex justify-between items-start">
        <div className={clsx(
          "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 relative z-10 box-border",
          color === 'yellow' ? 'bg-tad-yellow border-tad-yellow text-black' : 'bg-white/5 border-white/10 text-white'
        )}>
          {icon}
        </div>
        <div className="w-2 h-2 rounded-full bg-white/10 group-hover/card:bg-tad-yellow/50 transition-colors" />
      </div>
      
      <div>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3">{label}</p>
        <h3 className={clsx(
          "text-5xl font-black tracking-tighter mb-4 leading-none",
          color === 'yellow' ? 'text-tad-yellow' : 'text-white'
        )}>
          {typeof value === 'number' && value < 10 ? `0${value}` : value}
        </h3>
        <div className="flex items-center gap-2">
          <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", color === 'yellow' ? "bg-tad-yellow/60" : "bg-white/30")} />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{sub}</p>
        </div>
      </div>
    </div>
  );
}
