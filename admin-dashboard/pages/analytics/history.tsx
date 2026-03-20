import { useEffect, useState } from 'react';
import { getRecentPlays } from '../../services/api';
import { ArrowLeft, RefreshCcw, Tablet, Clock, ShieldCheck, Database, Search, ArrowDownToLine, Zap } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

interface RecentPlay {
  deviceId: string;
  videoId?: string;
  timestamp: string;
  taxiNumber?: string;
}

export default function AnalyticsHistoryPage() {
  const [plays, setPlays] = useState<RecentPlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getRecentPlays();
      setPlays(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPlays = plays.filter(p => 
    p.deviceId.toLowerCase().includes(search.toLowerCase()) || 
    p.taxiNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.videoId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-1000 relative text-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-tad-yellow/[0.04] blur-[150px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[0%] right-[-5%] w-[40%] h-[40%] bg-white/[0.01] blur-[120px] rounded-full" />
      </div>

      {/* Page Context Transition */}
      <div className="flex items-center gap-3 mb-8 opacity-60">
        <Link 
          href="/analytics" 
          className="group w-8 h-8 bg-zinc-900/40 border border-white/5 rounded-lg flex items-center justify-center hover:bg-tad-yellow hover:text-black transition-all active:scale-95"
          aria-label="Volver a Analytics"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </Link>
        <div className="w-8 h-px bg-white/20" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Historical Ledger / Primary Vault</p>
      </div>

      <div className="flex justify-end mb-10 pt-2">
        <div className="flex items-center gap-4 bg-zinc-900/40 backdrop-blur-3xl p-1.5 rounded-2xl border border-white-[0.03] shadow-inner">
           <div className="px-6 py-2 bg-gray-900/10 rounded-xl border border-white/5 text-right hidden lg:block">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Entries</p>
              <p className="text-xl font-bold text-white leading-none">{plays.length}</p>
           </div>
           <button 
             onClick={loadData}
             disabled={loading}
             className="p-3 bg-gray-900 border border-gray-700 text-gray-400 rounded-xl hover:bg-tad-yellow hover:text-black transition-all group disabled:opacity-50 shadow-sm"
             aria-label="Refrescar Registro"
           >
             <RefreshCcw className={clsx("w-5 h-5 transition-transform duration-500", loading ? "animate-spin" : "group-hover:rotate-180")} />
           </button>
        </div>
      </div>

      {/* Primary Filtering Nexus */}
      <div className="relative mb-10 group animate-in slide-in-from-top-10 duration-700 fill-mode-both">
          <div className="relative flex flex-col md:flex-row gap-4 p-2 bg-gray-800/40 border border-gray-700/50 backdrop-blur-xl rounded-2xl shadow-md">
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-tad-yellow transition-colors" />
              <input 
                type="text" 
                placeholder="BUSCAR EVENTOS, ID DE NODO O TAXI..."
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl py-4 pl-14 pr-6 text-xs font-bold uppercase tracking-widest text-white focus:outline-none focus:border-tad-yellow/50 transition-all placeholder:text-gray-600 shadow-inner"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
      </div>

      {/* Cluster Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          { icon: Database, label: 'Integridad Vault', value: 'Sincronizado', color: 'yellow' },
          { icon: Zap, label: 'Latencia Promedio', value: '124 ms', color: 'white' },
          { icon: ShieldCheck, label: 'Protocolo Auditoría', value: 'Activo', color: 'emerald' },
        ].map((stat, i) => (
          <div key={i} className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-2xl group hover:border-gray-500 transition-all duration-300 flex items-center gap-5 shadow-md">
             <div className={clsx(
               "p-3 rounded-xl border transition-all duration-300 shadow-sm group-hover:-translate-y-1",
               stat.color === 'yellow' ? 'bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow' : 
               stat.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
               'bg-gray-800/80 border-gray-700 text-white'
             )}>
                <stat.icon className="w-5 h-5" />
             </div>
             <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-xl font-bold text-white tracking-tight leading-none">{stat.value}</p>
             </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden shadow-lg relative animate-in fade-in slide-in-from-bottom-10 duration-1000 fill-mode-both">
        <div className="absolute top-0 right-0 w-96 h-96 bg-tad-yellow/[0.02] blur-[100px] -z-10" />
        <div className="absolute top-0 left-0 w-2 h-full bg-tad-yellow/20 blur-sm" />
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900/40 border-b border-gray-700/50">
                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Fuente / Nodo</th>
                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Evento de Red</th>
                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Registro Temporal</th>
                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Verificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {loading ? (
                [1,2,3,4,5,6].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-8 py-6"><div className="h-6 bg-gray-900 rounded-lg w-full" /></td>
                  </tr>
                ))
              ) : filteredPlays.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center">
                    <Database className="w-16 h-16 text-gray-700 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-gray-500 uppercase tracking-widest leading-none mb-4">Registro Vacío</h3>
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">No se detectan eventos recientes para los criterios seleccionados.</p>
                  </td>
                </tr>
              ) : (
                filteredPlays.map((play, idx) => (
                  <tr 
                    key={idx} 
                    className={clsx(
                      "hover:bg-gray-900/40 transition-all group relative animate-in fade-in slide-in-from-left-8 duration-500 fill-mode-both cursor-default",
                      `[animation-delay:${idx * 40}ms]`
                    )}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-gray-900/80 flex items-center justify-center border border-gray-700/50 group-hover:border-tad-yellow/30 transition-all shadow-sm">
                            <Tablet className="w-5 h-5 text-gray-500 group-hover:text-tad-yellow transition-colors" />
                         </div>
                         <div>
                            <p className="text-lg font-bold text-white tracking-tight uppercase group-hover:text-tad-yellow transition-colors leading-none mb-1.5">
                               TAXI_{play.taxiNumber || play.deviceId.slice(0, 4).toUpperCase()}
                            </p>
                            <p className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-widest">NODO: {play.deviceId.split('-')[0].toUpperCase()}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow shadow-[0_0_8px_#fad400] animate-pulse" />
                             <p className="text-sm font-bold text-gray-300 uppercase truncate max-w-xs">{play.videoId || 'CONTENIDO ROTATIVO'}</p>
                          </div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-4">Evento Reproducción</p>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2.5 text-gray-500 group-hover:text-gray-400 transition-colors">
                         <Clock className="w-3.5 h-3.5 text-tad-yellow" />
                         <p className="text-[10px] font-bold uppercase tracking-widest">
                           {formatDistanceToNow(new Date(play.timestamp), { addSuffix: true }).toUpperCase()}
                         </p>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 shadow-sm transition-all">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                         <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                            Auditado
                         </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer Insight Surface */}
      <div className="mt-12 p-8 bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl flex flex-col xl:flex-row items-center justify-between group shadow-lg gap-8">
         <div className="flex items-center gap-6 text-center xl:text-left flex-col xl:flex-row">
            <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-700/50 shadow-sm group-hover:-translate-y-1 transition-transform duration-500">
               <ArrowDownToLine className="w-8 h-8 text-tad-yellow" />
            </div>
            <div>
               <h4 className="text-xl font-bold text-white uppercase tracking-tight leading-none mb-2">Registro de Historial Limitado</h4>
               <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest max-w-xl leading-relaxed">
                  Los registros de telemetría más antiguos a 30 días son purgados automáticamente por el sistema para asegurar la integridad de rendimiento.
               </p>
            </div>
         </div>
         <button 
            title="Exportar reporte"
            className="px-8 py-4 bg-gray-900 hover:bg-tad-yellow border border-gray-700/50 hover:border-transparent text-gray-400 hover:text-black rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md active:scale-95"
         >
            Exportar CSV
         </button>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(250, 212, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(250, 212, 0, 0.2);
        }
        .text-shadow-glow {
          text-shadow: 0 0 20px rgba(250, 212, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
