import { useEffect, useState } from 'react';
import { getTopTaxis } from '../services/api';
import { Trophy, Tablet, Zap, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';

interface TaxiData {
  device_id: string;
  plays: number;
}

export default function TopTaxis() {
  const [taxis, setTaxis] = useState<TaxiData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getTopTaxis();
        setTaxis(data);
      } catch (err) {
        console.error("Error cargando analítica real", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return (
    <div className="bg-zinc-950 border border-white/5 rounded-3xl p-6 h-[400px] animate-pulse" />
  );

  return (
    <div className="group relative bg-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden transition-all hover:border-tad-yellow/30">
      {/* Glossy Effect */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-tad-yellow/5 blur-[100px] rounded-full group-hover:bg-tad-yellow/10 transition-all duration-700" />
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-tad-yellow" />
            <h2 className="text-xl font-black text-white tracking-tight uppercase">Leaderboard <span className="text-tad-yellow">TAD</span></h2>
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Taxis con mayor rotación publicitaria</p>
        </div>
        <Link 
          href="/fleet" 
          className="p-2 bg-zinc-900 border border-white/5 rounded-xl hover:bg-tad-yellow/10 hover:text-tad-yellow transition-all"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-6">
        {taxis.length > 0 ? taxis.map((taxi, index) => {
          // Rule of 15 slots: we use the plays count as a proxy for engagement but 
          // we visualize the slots used for rotation safety.
          // For this specific Top Taxis view, we'll show their rank and performance.
          const isWinner = index === 0;

          return (
            <div key={taxi.device_id} className="relative group/item">
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border",
                    isWinner ? "bg-tad-yellow text-black border-tad-yellow shadow-[0_0_15px_rgba(250,212,0,0.3)]" : "bg-zinc-900 text-zinc-400 border-white/5"
                  )}>
                    #{index + 1}
                  </div>
                  <div>
                    <div className="text-xs font-black text-white uppercase tracking-tighter flex items-center gap-1.5">
                      <Tablet className="w-3 h-3 text-tad-yellow" />
                      {taxi.device_id}
                    </div>
                    <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">
                      Reproducciones Reales: <span className="text-zinc-400">{taxi.plays.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-tad-yellow mb-1 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" />
                    {Math.round((taxi.plays / (taxis[0].plays || 1)) * 100)}% EFF
                  </span>
                </div>
              </div>

              {/* Performance Bar */}
              <div className="relative h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={clsx(
                    "absolute top-0 left-0 h-full transition-all duration-1000 ease-out rounded-full bg-gradient-to-r",
                    isWinner ? "from-tad-yellow to-yellow-600" : "from-zinc-700 to-zinc-500"
                  )}
                  style={{ width: `${(taxi.plays / (taxis[0].plays || 1)) * 100}%` }}
                />
              </div>
            </div>
          );
        }) : (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <Zap className="w-12 h-12 mb-4 opacity-10" />
            <p className="text-xs font-bold uppercase tracking-widest">Esperando datos de la flota...</p>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-white/5">
        <div className="bg-tad-yellow/5 border border-tad-yellow/10 rounded-2xl p-4 flex items-start gap-4">
          <div className="p-2 bg-tad-yellow/10 rounded-xl">
            <Zap className="w-4 h-4 text-tad-yellow" />
          </div>
          <div>
            <p className="text-[11px] text-white font-bold leading-tight">Garantía de Rotación</p>
            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
              Los taxis del Top 5 aseguran una exposición de marca 40% superior al promedio de la flota.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
