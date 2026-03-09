import { useEffect, useState } from 'react';
import { getCampaigns } from '../../services/api';
import { PlusCircle, Megaphone, Zap, Calendar, Users, Activity, ExternalLink, MoreVertical, Film, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCampaigns()
      .then(setCampaigns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();

  return (
    <div className="animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Campañas de <span className="text-tad-yellow text-shadow-glow">la Red</span>
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Gestión en tiempo real de emisiones DOOH. Monitorea el estado y despliegue en la red global de tablets.
          </p>
        </div>
        <Link 
          href="/campaigns/new"
          className="group relative flex items-center justify-center gap-2 bg-tad-yellow hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(250,212,0,0.4)]"
        >
          <PlusCircle className="w-5 h-5 transition-transform group-hover:rotate-12" />
          Crear Nueva Campaña
        </Link>
      </div>

      {/* Campaign Cards (replacing the table for better UX) */}
      <div className="space-y-4">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-24 bg-zinc-900/40 animate-pulse rounded-2xl border border-white/5" />)
        ) : campaigns.length > 0 ? (
          campaigns.map((camp) => {
            const startDate = new Date(camp.startDate || camp.start_date);
            const endDate = new Date(camp.endDate || camp.end_date);
            const isLive = camp.active && now >= startDate && now <= endDate;
            const assetCount = camp.mediaAssets?.length || 0;
            const totalDuration = (camp.mediaAssets || []).reduce((sum: number, a: any) => sum + (a.duration || 0), 0);

            return (
              <Link 
                key={camp.id} 
                href={`/campaigns/${camp.id}`}
                className="group block bg-zinc-950/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-tad-yellow/30 transition-all shadow-lg hover:shadow-tad-yellow/5"
              >
                <div className="p-6 flex flex-col md:flex-row md:items-center gap-4">
                  {/* Campaign Icon & Name */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={clsx(
                      "p-3 rounded-xl border shrink-0",
                      isLive 
                        ? "bg-tad-yellow/10 text-tad-yellow border-tad-yellow/20" 
                        : "bg-zinc-900 text-zinc-500 border-white/5"
                    )}>
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white font-bold text-lg group-hover:text-tad-yellow transition-colors uppercase tracking-tight truncate">
                        {camp.name}
                      </h3>
                      <p className="text-zinc-500 text-xs font-medium truncate">{camp.advertiser}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-4 shrink-0">
                    <span className={clsx(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase border",
                      isLive 
                        ? 'bg-tad-yellow/10 text-tad-yellow border-tad-yellow/20' 
                        : camp.active
                          ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                    )}>
                      <span className={clsx("w-1.5 h-1.5 rounded-full", isLive ? "bg-tad-yellow animate-pulse" : camp.active ? "bg-zinc-500" : "bg-red-500")} />
                      {isLive ? 'En Vivo' : camp.active ? 'Programada' : 'Pausada'}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Archivos</p>
                      <p className="text-white font-bold flex items-center gap-1">
                        <Film className="w-3 h-3 text-tad-yellow" /> {assetCount}
                      </p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Duración</p>
                      <p className="text-white font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" /> {totalDuration}s
                      </p>
                    </div>
                    <div className="text-center hidden md:block">
                      <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Cronograma</p>
                      <p className="text-white font-mono text-[11px]">
                        {format(startDate, 'dd/MM')} → {format(endDate, 'dd/MM')}
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-tad-yellow transition-colors shrink-0" />
                </div>
              </Link>
            );
          })
        ) : (
          <div className="py-20 bg-zinc-900/30 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center">
            <Megaphone className="w-16 h-16 text-zinc-700 mb-4" />
            <h3 className="text-xl font-bold text-gray-400">No hay campañas activas</h3>
            <p className="text-gray-500 mt-2 max-w-sm">
              Tu red está actualmente inactiva. Crea una nueva campaña para empezar a distribuir contenido.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
