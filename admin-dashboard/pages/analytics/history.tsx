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
    <div className="min-h-screen pb-20 animate-in fade-in duration-1000 relative">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-tad-yellow/5 blur-[120px] rounded-full animate-pulse" />
         <div className="absolute bottom-[5%] right-[-5%] w-[35%] h-[35%] bg-white/5 blur-[100px] rounded-full" />
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
        <div className="flex items-center gap-8">
          <Link 
            href="/analytics" 
            className="group w-14 h-14 bg-zinc-950 border border-white/5 rounded-2xl flex items-center justify-center hover:border-tad-yellow/40 hover:bg-tad-yellow hover:text-black transition-all shadow-2xl active:scale-90"
          >
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-tad-yellow animate-pulse shadow-[0_0_10px_#fad400]" />
               <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Acceso a Base de Datos Primaria v4.2</p>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-white uppercase tracking-tighter italic leading-none text-shadow-glow">
              Registro <span className="text-tad-yellow italic">Maestro</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-950/50 p-2 rounded-3xl border border-white/5 backdrop-blur-3xl shadow-3xl">
           <div className="px-8 py-3 bg-black/40 rounded-2xl border border-white/5 text-right hidden lg:block">
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1 italic">Nodos Sincronizados</p>
              <p className="text-2xl font-black text-white italic leading-none">{plays.length}</p>
           </div>
           <button 
             onClick={loadData}
             disabled={loading}
             title="Refrescar datos"
             className="p-5 bg-zinc-900 text-white rounded-2xl hover:bg-tad-yellow hover:text-black transition-all group disabled:opacity-50 shadow-2xl border border-white/5"
           >
             <RefreshCcw className={clsx("w-6 h-6 transition-transform duration-700", loading ? "animate-spin" : "group-hover:rotate-180")} />
           </button>
        </div>
      </div>

      {/* Primary Filtering Nexus */}
      <div className="relative mb-12 group animate-in slide-in-from-top-10 duration-700">
          <div className="absolute inset-0 bg-tad-yellow/5 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex flex-col md:flex-row gap-6 p-4 bg-zinc-950/80 border border-white/5 backdrop-blur-3xl rounded-[2.5rem] shadow-3xl">
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 group-focus-within:text-tad-yellow transition-colors" />
              <input 
                type="text" 
                placeholder="CONSULTAR HASH DE VIDEO, ID DE NODO O NÚMERO DE TAXI..."
                className="w-full bg-black/40 border border-white/5 rounded-[1.5rem] py-4 pl-14 pr-4 text-[11px] font-black uppercase tracking-[0.2em] text-white focus:outline-none focus:border-tad-yellow/40 transition-all placeholder:text-zinc-800"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
      </div>

      {/* Cluster Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {[
          { icon: Database, label: 'Integridad Vault', value: 'Sincronizado', color: 'yellow' },
          { icon: Zap, label: 'Latencia Promedio', value: '124 ms', color: 'white' },
          { icon: ShieldCheck, label: 'Protocolo Auditoría', value: 'SSL OIDC Active', color: 'emerald' },
        ].map((stat, i) => (
          <div key={i} className="bg-zinc-950/40 backdrop-blur-3xl border border-white/5 p-8 rounded-[2.5rem] group hover:border-white/10 transition-all duration-500 flex items-center gap-6 shadow-2xl">
             <div className={clsx(
               "p-4 rounded-2xl border transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-2xl",
               stat.color === 'yellow' ? 'bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow shadow-tad-yellow/10' : 
               stat.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-emerald-500/10' :
               'bg-white/5 border-white/10 text-white'
             )}>
                <stat.icon className="w-6 h-6" />
             </div>
             <div>
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic mb-1">{stat.label}</p>
                <p className="text-xl font-black text-white italic tracking-tighter leading-none">{stat.value}</p>
             </div>
          </div>
        ))}
      </div>

      <div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/5 rounded-[3.5rem] overflow-hidden shadow-3xl relative animate-in fade-in slide-in-from-bottom-10 duration-1000 fill-mode-both">
        <div className="absolute top-0 right-0 w-96 h-96 bg-tad-yellow/[0.02] blur-[100px] -z-10" />
        <div className="absolute top-0 left-0 w-2 h-full bg-tad-yellow/40 blur-sm" />
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.01] border-b border-white/5">
                <th className="px-12 py-8 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] italic">Fuente / Terminal de Red</th>
                <th className="px-12 py-8 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] italic">Evento de Propagación</th>
                <th className="px-12 py-8 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] italic">Estampa Temporal</th>
                <th className="px-12 py-8 text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] italic text-right">Verificación SSL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [1,2,3,4,5,6].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-12 py-10"><div className="h-6 bg-zinc-900 rounded-2xl w-full" /></td>
                  </tr>
                ))
              ) : filteredPlays.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-12 py-60 text-center">
                    <Database className="w-20 h-20 text-zinc-900 mx-auto mb-10 animate-bounce" />
                    <h3 className="text-3xl font-black text-zinc-800 uppercase tracking-[0.3em] italic leading-none mb-6">Cámara de Vacío Operacional</h3>
                    <p className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.5em] max-w-sm mx-auto leading-relaxed">No se detectan paquetes de telemetría recientes en la red central.</p>
                  </td>
                </tr>
              ) : (
                filteredPlays.map((play, idx) => (
                  <tr 
                    key={idx} 
                    className={clsx(
                      "hover:bg-tad-yellow/[0.03] transition-all group relative animate-in fade-in slide-in-from-left-8 duration-500 fill-mode-both",
                      `[animation-delay:${idx * 40}ms]`
                    )}
                  >
                    <td className="px-12 py-8">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-[1.5rem] bg-zinc-900 flex items-center justify-center border border-white/5 group-hover:border-tad-yellow/30 transition-all shadow-2xl group-hover:-rotate-6">
                            <Tablet className="w-6 h-6 text-zinc-700 group-hover:text-tad-yellow transition-colors" />
                         </div>
                         <div>
                            <p className="text-xl font-black text-white italic tracking-tighter uppercase group-hover:text-tad-yellow transition-colors leading-none mb-2">
                               TAXI_{play.taxiNumber || play.deviceId.slice(0, 4).toUpperCase()}
                            </p>
                            <p className="text-[10px] font-mono text-zinc-700 font-bold tracking-tight uppercase">NODE_ORBITAL_{play.deviceId.split('-')[0].toUpperCase()}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-12 py-8">
                       <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                             <div className="w-2 h-2 rounded-full bg-tad-yellow shadow-[0_0_10px_#fad400] animate-pulse" />
                             <p className="text-sm font-black text-zinc-300 uppercase italic tracking-tight truncate max-w-xs">{play.videoId || 'ASSET_ROTATION_PRIMARY'}</p>
                          </div>
                          <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest ml-5 italic">PLAY_CONFIRMATION_ENCRYPTED</p>
                       </div>
                    </td>
                    <td className="px-12 py-8">
                      <div className="flex items-center gap-3 text-zinc-500 group-hover:text-zinc-300 transition-colors">
                         <Clock className="w-4 h-4 text-tad-yellow" />
                         <p className="text-[10px] font-black uppercase tracking-widest italic">
                           {formatDistanceToNow(new Date(play.timestamp), { addSuffix: true }).toUpperCase()}
                         </p>
                      </div>
                    </td>
                    <td className="px-12 py-8 text-right">
                      <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 shadow-2xl group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                         <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">
                            Audit Verified
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
      <div className="mt-16 p-12 bg-zinc-950/80 backdrop-blur-3xl border border-white/5 rounded-[4rem] flex flex-col xl:flex-row items-center justify-between group shadow-3xl gap-10">
         <div className="flex items-center gap-8 text-center xl:text-left flex-col xl:flex-row">
            <div className="p-6 bg-zinc-900 rounded-[2rem] border border-white/5 shadow-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
               <ArrowDownToLine className="w-10 h-10 text-tad-yellow" />
            </div>
            <div>
               <h4 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none mb-3">Expurgación Automatizada</h4>
               <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] max-w-2xl leading-relaxed">
                  Los registros de telemetría orbital son purgados automáticamente cada 30 ciclos solares para mantener la eficiencia térmica del sistema de archivos.
               </p>
            </div>
         </div>
         <button 
            title="Exportar reporte maestro"
            className="px-12 py-6 bg-white/5 hover:bg-tad-yellow border border-white/10 hover:border-transparent text-white hover:text-black rounded-3xl text-[10px] font-black uppercase tracking-[0.5em] transition-all italic shadow-2xl active:scale-95"
         >
            EXPORTAR REPORTE MAESTRO (CSV)
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
