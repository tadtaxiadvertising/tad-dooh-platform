import { useEffect, useState, useCallback } from 'react';
import { getCampaigns, deleteCampaign } from '../../services/api';
import { PlusCircle, Megaphone, Zap, Film, ChevronRight, Clock, Trash2, Calendar, Target, Activity, Share2, AlertCircle, Sparkles, Download } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import clsx from 'clsx';
import DeviceSelectorModal from '../../components/DeviceSelectorModal';
import { useTabSync } from '../../hooks/useTabSync';
import { notifyChange } from '../../lib/sync-channel';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; advertiser: string; active: boolean; startDate?: string; start_date?: string; endDate?: string; end_date?: string; mediaAssets?: { duration?: number }[]; devices?: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<{ id: string; name: string; devices?: string[] } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCampaigns();
      setCampaigns(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useTabSync('CAMPAIGNS', loadData);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const now = new Date();

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-15%] left-[-10%] w-[65%] h-[65%] bg-tad-yellow/[0.04] blur-[180px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[5%] right-[-10%] w-[55%] h-[55%] bg-white/[0.01] blur-[160px] rounded-full" />
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-tad-yellow rounded-3xl flex items-center justify-center shadow-[0_20px_50px_rgba(255,212,0,0.15)]">
                <Megaphone className="w-7 h-7 text-black" />
             </div>
             <div>
                <div className="flex items-center gap-3 mb-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow shadow-[0_0_8px_rgba(255,212,0,0.8)]" />
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Integrated Broadcast Protocol v4.2</p>
                </div>
                <h1 className="text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none font-display">
                  Campaign <span className="text-tad-yellow transition-all duration-700 hover:text-white cursor-default italic">Orchestration</span>
                </h1>
             </div>
          </div>
          <p className="text-zinc-500 max-w-2xl text-[12px] font-bold uppercase tracking-widest leading-relaxed">
            Tactical <span className="text-white">DOOH asset management</span> and regional schedule delivery.
          </p>
        </div>
        
        <Link 
          href="/campaigns/new"
          className="btn-primary px-10 h-14 flex items-center gap-4 group"
        >
          <PlusCircle className="w-5 h-5 transition-transform group-hover:rotate-90 duration-700" />
          Proyectar_Nueva_Campaña
        </Link>
      </div>

      {/* Primary IQ Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
        {[
          { icon: Megaphone, label: 'Global Campaigns', value: campaigns.length, color: 'text-white', bgColor: 'bg-black/40' },
          { icon: Zap, label: 'Active Impacts', value: campaigns.filter(c => c.active).length, color: 'text-tad-yellow', bgColor: 'bg-tad-yellow/10' },
          { icon: Target, label: 'Projected Reach', value: '4.2M+', color: 'text-white', bgColor: 'bg-black/40' },
          { icon: Activity, label: 'Link Integrity', value: 'Nominal', color: 'text-white', bgColor: 'bg-black/40' },
        ].map((stat, i) => (
          <div 
            key={i} 
            className={clsx(
              "bg-zinc-900/40 backdrop-blur-3xl border border-white/5 p-8 rounded-[3rem] group hover:border-tad-yellow/30 transition-all duration-700 relative flex flex-col justify-between animate-in fade-in slide-in-from-bottom-6 fill-mode-both shadow-[0_30px_60px_rgba(0,0,0,0.4)] hover:-translate-y-2",
              `[animation-delay:${i * 100}ms]`
            )}
          >
             <div className="flex justify-between items-start mb-8">
                <div className={clsx("p-5 rounded-full border border-white/5 transition-all duration-700 group-hover:scale-110 shadow-2xl", stat.bgColor, stat.color)}>
                   <stat.icon className="w-6 h-6" />
                </div>
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-800 group-hover:bg-tad-yellow transition-colors" />
             </div>
             <div>
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1.5 italic lowercase">{stat.label}</p>
                <h3 className={clsx("text-4xl font-black italic tracking-tighter leading-none mt-2 font-display", stat.color)}>
                  {typeof stat.value === 'number' && stat.value < 10 ? `0${stat.value}` : stat.value}
                </h3>
             </div>
          </div>
        ))}
      </div>

      {/* Campaign Registry Surface */}
      <div className="space-y-8">
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="h-40 bg-zinc-900/20 backdrop-blur-3xl animate-pulse rounded-[3rem] border border-white/5" />)
        ) : campaigns.length > 0 ? (
          campaigns.map((camp, idx) => {
            const startDate = new Date(camp.startDate || camp.start_date || '');
            const endDate = new Date(camp.endDate || camp.end_date || '');
            const isLive = camp.active && now >= startDate && now <= endDate;
            const assetCount = camp.mediaAssets?.length || 0;
            const totalDuration = (camp.mediaAssets || []).reduce((sum: number, a: { duration?: number }) => sum + (a.duration || 0), 0);

            return (
              <div 
                key={camp.id} 
                className={clsx(
                  "group relative bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] overflow-hidden hover:border-tad-yellow/40 transition-all duration-700 shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-8 fill-mode-both hover:-translate-y-2",
                  `[animation-delay:${idx * 50}ms]`
                )}
              >
                {/* Visual Status Glow */}
                <div className={clsx(
                  "absolute -top-10 -right-10 w-48 h-48 blur-[100px] transition-all duration-1000 opacity-0 group-hover:opacity-10",
                  isLive ? "bg-tad-yellow" : "bg-emerald-500"
                )} />

                <div className="p-10 flex flex-col xl:flex-row xl:items-center gap-12 relative z-10">
                  {/* Branding & identity Zone */}
                  <div className="flex items-center gap-8 flex-1 min-w-0">
                    <div className={clsx(
                      "w-24 h-24 rounded-[2.5rem] border transition-all duration-700 group-hover:scale-110 shadow-2xl flex items-center justify-center",
                      isLive 
                        ? "bg-tad-yellow text-black border-tad-yellow shadow-tad-yellow/20" 
                        : "bg-black/40 text-zinc-600 border-white/5"
                    )}>
                      <Sparkles className="w-10 h-10 group-hover:animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase group-hover:text-tad-yellow transition-colors leading-none mb-4 font-display">
                        {camp.name}
                      </h3>
                      <div className="flex items-center gap-4">
                         <div className="flex items-center gap-3 px-5 py-2 bg-black/40 rounded-full border border-white/5">
                            <span className="w-1.5 h-1.5 rounded-full bg-tad-yellow" />
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{camp.advertiser}</p>
                         </div>
                         <div className="h-4 w-px bg-white/10" />
                         <p className="text-[10px] font-mono font-black text-zinc-700 uppercase tracking-tighter italic">REC_ID_{camp.id.slice(0, 10).toUpperCase()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Operational Metrics Cluster */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 shrink-0 xl:w-[450px]">
                    <div className="bg-white/[0.01] p-6 rounded-[2rem] border border-white/5 group-hover:bg-white/[0.03] transition-all">
                      <p className="text-[9px] text-zinc-700 uppercase font-black tracking-[0.3em] mb-3 italic">Vault Vol.</p>
                      <div className="flex items-center gap-3">
                        <Film className="w-4 h-4 text-tad-yellow" />
                        <span className="text-lg font-black text-white italic leading-none">{assetCount} ASSETS</span>
                      </div>
                    </div>
                    <div className="bg-white/[0.01] p-6 rounded-[2rem] border border-white/5 group-hover:bg-white/[0.03] transition-all">
                      <p className="text-[9px] text-zinc-700 uppercase font-black tracking-[0.3em] mb-3 italic">Loop Time</p>
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-zinc-500" />
                        <span className="text-lg font-black text-white italic leading-none">{totalDuration} SEC</span>
                      </div>
                    </div>
                    <div className="bg-white/[0.01] p-6 rounded-[2rem] border border-white/5 group-hover:bg-white/[0.03] transition-all hidden md:block">
                      <p className="text-[9px] text-zinc-700 uppercase font-black tracking-[0.3em] mb-3 italic">Ventana Solar</p>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span className="text-[11px] font-black text-zinc-400 italic leading-none uppercase tracking-tighter">{format(startDate, 'dd-MMM')} / {format(endDate, 'dd-MMM')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status Conduit */}
                  <div className="flex flex-col gap-6 shrink-0 xl:w-72">
                     <div className={clsx(
                        "flex items-center gap-4 px-6 py-3 rounded-full border transition-all duration-500",
                        isLive ? "bg-tad-yellow/10 border-tad-yellow/30 text-tad-yellow shadow-2xl shadow-tad-yellow/5" : camp.active ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-rose-500/10 border-rose-500/30 text-rose-500"
                     )}>
                        <div className={clsx(
                           "w-2 h-2 rounded-full",
                           isLive ? "bg-tad-yellow animate-pulse shadow-[0_0_10px_#fad400]" : camp.active ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-rose-500"
                        )} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] italic leading-none">
                           {isLive ? 'Transmisión Regional' : camp.active ? 'Ciclo Programado' : 'Operación Offline'}
                        </span>
                     </div>
                     <div className="flex gap-4">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedCampaign(camp);
                            setModalOpen(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-3 bg-zinc-950 border border-white/5 hover:bg-tad-yellow text-zinc-500 hover:text-black font-black text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl transition-all italic shadow-2xl shadow-black/50 group/btn"
                        >
                          <Share2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                          Expandir
                        </button>
                        <Link 
                          href={`/campaigns/${camp.id}`}
                          title="Ver detalle de campaña"
                          className="p-5 bg-zinc-950 border border-white/5 text-zinc-700 hover:text-white rounded-2xl transition-all shadow-2xl hover:border-white/20"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </Link>
                        <button 
                          onClick={async (e) => {
                            e.preventDefault();
                            if (!confirm(`¿Iniciar protocolo de purga para "${camp.name}"? Esta acción es irreversible.`)) return;
                            try {
                              await deleteCampaign(camp.id);
                              setCampaigns(prev => prev.filter(c => c.id !== camp.id));
                              notifyChange('CAMPAIGNS');
                              setSuccessMsg(`CAMPAÑA "${camp.name.toUpperCase()}" EYECTADA DEL CLUSTER.`);
                              setTimeout(() => setSuccessMsg(''), 5000);
                            } catch (err: unknown) {
                              alert('ERROR DE PROTOCOLO: ' + (err as Error).message);
                            }
                          }}
                          title="Eyectar campaña de la red"
                          className="p-5 bg-zinc-950 border border-white/5 text-zinc-800 hover:bg-rose-500/10 hover:text-rose-500 rounded-2xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                     </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-40 bg-zinc-950/20 border-2 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center text-center animate-in fade-in duration-1000">
            <div className="w-24 h-24 bg-zinc-900 rounded-[2.5rem] shadow-3xl flex items-center justify-center mb-10">
               <Megaphone className="w-12 h-12 text-zinc-800" />
            </div>
            <h3 className="text-3xl font-black text-zinc-700 uppercase italic tracking-[0.2em] leading-none mb-4">Cámara de Silencio</h3>
            <p className="text-zinc-800 font-bold uppercase tracking-[0.2em] text-[10px] max-w-sm leading-relaxed mb-10">
              La red de difusión se encuentra en standby. Inicie un nuevo protocolo de inyección creativa para poblar el clúster DOOH regional.
            </p>
            <Link 
              href="/campaigns/new"
              className="bg-white/5 hover:bg-tad-yellow hover:text-black text-zinc-400 px-12 py-5 rounded-[2rem] border border-white/5 hover:border-transparent text-[10px] font-black uppercase tracking-[0.5em] transition-all italic"
            >
              GENERAR PROTOCOLO CREATIVO
            </Link>
          </div>
        )}
      </div>

      {selectedCampaign && (
        <DeviceSelectorModal 
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          campaignId={selectedCampaign.id}
          campaignName={selectedCampaign.name}
          initialSelected={selectedCampaign.devices || []}
          onSuccess={() => {
            notifyChange('CAMPAIGNS');
            setSuccessMsg(`DIFUSIÓN DE "${selectedCampaign.name.toUpperCase()}" SINCRONIZADA.`);
            setTimeout(() => setSuccessMsg(''), 5000);
          }}
        />
      )}

      {/* Primary Dispatch Notification */}
      {successMsg && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-24 duration-700 fill-mode-both">
           <div className="bg-tad-yellow text-black px-12 py-6 rounded-full shadow-[0_0_60px_rgba(250,212,0,0.3)] border border-white/20 flex items-center gap-5">
              <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center animate-pulse">
                 <Zap className="w-5 h-5" />
              </div>
              <p className="text-[11px] font-black italic uppercase tracking-[0.4em] leading-none">{successMsg}</p>
           </div>
        </div>
      )}

      {/* Terminal Footer Info */}
      <div className="mt-24 pt-16 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-10">
         <div className="flex flex-col items-center md:items-start gap-4 opacity-40 group hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-4">
               <Activity className="w-6 h-6 text-zinc-800" />
               <p className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.6em] italic">CLUSTER_ORCHESTRATOR_v4.2</p>
            </div>
            <p className="text-[9px] font-bold text-zinc-800 uppercase tracking-[0.2em] max-w-sm leading-loose">
               Orquestación de impactos verificados bajo protocolos de handshake regional. Auditoría de loops 100% activa.
            </p>
         </div>
         <div className="flex gap-4">
            <button 
              title="Descargar reporte"
              className="p-4 bg-zinc-950/50 border border-white/5 rounded-2xl text-zinc-700 hover:text-white transition-all"
            >
               <Download className="w-5 h-5" />
            </button>
            <button 
              title="Ver alertas"
              className="p-4 bg-zinc-950/50 border border-white/5 rounded-2xl text-zinc-700 hover:text-white transition-all"
            >
               <AlertCircle className="w-5 h-5" />
            </button>
         </div>
      </div>

      <style jsx global>{`
        .text-shadow-glow {
          text-shadow: 0 0 30px rgba(250, 212, 0, 0.35);
        }
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
      `}</style>
    </div>
  );
}
