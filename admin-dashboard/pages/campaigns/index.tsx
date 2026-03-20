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
    <div className="min-h-screen pb-12 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-tad-yellow/[0.04] blur-[150px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[0%] right-[-5%] w-[40%] h-[40%] bg-white/[0.01] blur-[120px] rounded-full" />
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10 pt-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-tad-yellow rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(255,212,0,0.15)] shrink-0">
                <Megaphone className="w-6 h-6 text-black" />
             </div>
             <div>
                <div className="flex items-center gap-2 mb-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow shadow-[0_0_8px_rgba(255,212,0,0.8)]" />
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Broadcast Protocol 4.2</p>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tight leading-none">
                  Campaign <span className="text-tad-yellow">Orchestrator</span>
                </h1>
             </div>
          </div>
          <p className="text-gray-400 max-w-2xl text-sm font-medium leading-relaxed pl-16">
            Tactical DOOH asset management and regional schedule delivery.
          </p>
        </div>
        
        <Link 
          href="/campaigns/new"
          className="bg-tad-yellow text-black px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-yellow-400 transition-all shadow-md shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
           Nueva Campaña
        </Link>
      </div>

      {/* Primary IQ Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { icon: Megaphone, label: 'Global Campaigns', value: campaigns.length, color: 'text-white', bgColor: 'bg-gray-800/80', border: 'border-gray-700' },
          { icon: Zap, label: 'Active Impacts', value: campaigns.filter(c => c.active).length, color: 'text-tad-yellow', bgColor: 'bg-tad-yellow/10', border: 'border-tad-yellow/20' },
          { icon: Target, label: 'Projected Reach', value: '4.2M+', color: 'text-white', bgColor: 'bg-gray-800/80', border: 'border-gray-700' },
          { icon: Activity, label: 'Link Integrity', value: 'Nominal', color: 'text-white', bgColor: 'bg-gray-800/80', border: 'border-gray-700' },
        ].map((stat, i) => (
          <div 
            key={i} 
            className={clsx(
              "bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-2xl group hover:border-gray-500 transition-all duration-300 relative flex flex-col justify-between shadow-md hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8 fill-mode-both",
              `[animation-delay:${i * 50}ms]`
            )}
          >
             <div className="flex justify-between items-start mb-6">
                <div className={clsx("p-3 rounded-xl border transition-all duration-300 shadow-sm", stat.bgColor, stat.border, stat.color)}>
                   <stat.icon className="w-5 h-5" />
                </div>
                <div className="h-2 w-2 rounded-full bg-gray-600 group-hover:bg-tad-yellow transition-colors" />
             </div>
             <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className={clsx("text-3xl font-black tracking-tight leading-none mt-1", stat.color)}>
                  {typeof stat.value === 'number' && stat.value < 10 ? `0${stat.value}` : stat.value}
                </h3>
             </div>
          </div>
        ))}
      </div>

      {/* Campaign Registry Surface */}
      <div className="space-y-6">
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-800/40 backdrop-blur-xl animate-pulse rounded-2xl border border-gray-700/50" />)
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
                  "group relative bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl overflow-hidden hover:border-tad-yellow/40 transition-all duration-500 shadow-md hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8 fill-mode-both hover:shadow-lg",
                  `[animation-delay:${idx * 50}ms]`
                )}
              >
                {/* Visual Status Glow */}
                <div className={clsx(
                  "absolute -top-10 -right-10 w-48 h-48 blur-[60px] transition-all duration-1000 opacity-0 group-hover:opacity-10",
                  isLive ? "bg-tad-yellow" : "bg-emerald-500"
                )} />

                <div className="p-6 flex flex-col xl:flex-row xl:items-center gap-8 relative z-10">
                  {/* Branding & identity Zone */}
                  <div className="flex items-center gap-6 flex-1 min-w-0">
                    <div className={clsx(
                      "w-16 h-16 rounded-2xl border transition-all duration-500 flex items-center justify-center shrink-0",
                      isLive 
                        ? "bg-tad-yellow text-black border-tad-yellow shadow-[0_0_15px_rgba(255,212,0,0.3)] group-hover:scale-105" 
                        : "bg-gray-900 border-gray-700 text-gray-500"
                    )}>
                      <Sparkles className="w-8 h-8 group-hover:animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none mb-2">
                        {camp.name}
                      </h3>
                      <div className="flex items-center gap-3">
                         <div className="flex items-center gap-2 px-3 py-1 bg-gray-900/50 rounded-lg border border-gray-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-tad-yellow" />
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{camp.advertiser}</p>
                         </div>
                         <div className="h-3 w-px bg-gray-600" />
                         <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">ID: {camp.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Operational Metrics Cluster */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 shrink-0 xl:w-[400px]">
                    <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 hover:bg-gray-800 transition-all">
                      <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-2">Vault</p>
                      <div className="flex items-center gap-2">
                        <Film className="w-4 h-4 text-tad-yellow" />
                        <span className="text-sm font-black text-white">{assetCount} ASSETS</span>
                      </div>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 hover:bg-gray-800 transition-all">
                      <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-2">Loop Time</p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-black text-white">{totalDuration} SEC</span>
                      </div>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 hover:bg-gray-800 transition-all hidden md:block">
                      <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-2">Ventana</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">{format(startDate, 'dd-MMM')} / {format(endDate, 'dd-MMM')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status Conduit */}
                  <div className="flex flex-col gap-4 shrink-0 xl:w-64">
                     <div className={clsx(
                        "flex items-center gap-3 px-4 py-2 rounded-lg border transition-all duration-500",
                        isLive ? "bg-tad-yellow/10 border-tad-yellow/30 text-tad-yellow" : camp.active ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-rose-500/10 border-rose-500/30 text-rose-500"
                     )}>
                        <div className={clsx(
                           "w-2 h-2 rounded-full",
                           isLive ? "bg-tad-yellow animate-pulse shadow-[0_0_8px_#fad400]" : camp.active ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-rose-500"
                        )} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                           {isLive ? 'Transmisión Regional' : camp.active ? 'Ciclo Programado' : 'Offline'}
                        </span>
                     </div>
                     <div className="flex gap-3">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedCampaign(camp);
                            setModalOpen(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-900/50 border border-gray-700 hover:bg-tad-yellow hover:border-tad-yellow hover:text-black text-gray-400 font-bold text-[10px] uppercase tracking-wider py-3 rounded-xl transition-all shadow-sm"
                        >
                          <Share2 className="w-4 h-4" />
                          Expandir
                        </button>
                        <Link 
                          href={`/campaigns/${camp.id}`}
                          title="Ver detalle de campaña"
                          className="p-3 bg-gray-900/50 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 rounded-xl transition-all shadow-sm flex items-center justify-center"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                        <button 
                          onClick={async (e) => {
                            e.preventDefault();
                            if (!confirm(`¿Eliminar la campaña "${camp.name}"? Esta acción no se puede deshacer.`)) return;
                            try {
                              await deleteCampaign(camp.id);
                              setCampaigns(prev => prev.filter(c => c.id !== camp.id));
                              notifyChange('CAMPAIGNS');
                              setSuccessMsg(`Campaña "${camp.name}" eliminada.`);
                              setTimeout(() => setSuccessMsg(''), 5000);
                            } catch (err: unknown) {
                              alert('Error: ' + (err as Error).message);
                            }
                          }}
                          title="Eyectar campaña de la red"
                          className="p-3 bg-gray-900/50 border border-gray-700 text-gray-500 hover:bg-rose-500/10 hover:border-rose-500 hover:text-rose-500 rounded-xl transition-all flex items-center justify-center"
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
          <div className="py-24 border-2 border-dashed border-gray-700/50 rounded-3xl bg-gray-800/20 backdrop-blur-xl flex flex-col items-center justify-center text-center animate-in fade-in duration-1000 shadow-sm group hover:border-tad-yellow/30 hover:bg-gray-800/40 transition-all">
             <div className="w-20 h-20 bg-gray-900 border border-gray-700 rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:shadow-[0_0_20px_rgba(255,212,0,0.15)] transition-shadow duration-500 group-hover:-translate-y-1">
                <Megaphone className="w-10 h-10 text-gray-500 transition-colors duration-500 group-hover:text-tad-yellow" />
             </div>
             <h3 className="text-2xl font-black text-gray-400 uppercase tracking-tight leading-none mb-3 transition-colors duration-500 group-hover:text-white">Red Inactiva</h3>
             <p className="text-gray-500 font-bold uppercase tracking-wider text-[11px] max-w-md leading-relaxed mb-8">
                El clúster regional no tiene campañas activas. Inicie un nuevo protocolo de inyección creativa.
             </p>
             <Link 
                href="/campaigns/new"
                className="bg-gray-900 hover:bg-tad-yellow hover:text-black text-gray-400 px-8 py-4 rounded-xl border border-gray-700 hover:border-tad-yellow hover:shadow-lg hover:-translate-y-1 text-xs font-bold uppercase tracking-widest transition-all"
             >
                Generar Protocolo Creativo
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
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-24 duration-700 fill-mode-both">
           <div className="bg-tad-yellow text-black px-8 py-4 rounded-xl shadow-2xl flex items-center gap-4">
              <Zap className="w-4 h-4" />
              <p className="text-xs font-bold uppercase tracking-wider">{successMsg}</p>
           </div>
        </div>
      )}

      {/* Terminal Footer Info */}
      <div className="mt-16 pt-10 border-t border-gray-700/50 flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex flex-col items-center md:items-start gap-2 opacity-60 group hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-3">
               <Activity className="w-5 h-5 text-gray-400" />
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CLUSTER_ORCHESTRATOR_v4.2</p>
            </div>
            <p className="text-xs text-gray-500 max-w-sm">
               Orquestación de impactos verificados bajo protocolos de handshake regional. Auditoría de loops 100% activa.
            </p>
         </div>
         <div className="flex gap-4">
            <button 
              title="Descargar reporte"
              className="p-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-all shadow-sm"
            >
               <Download className="w-4 h-4" />
            </button>
            <button 
              title="Ver alertas"
              className="p-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-all shadow-sm"
            >
               <AlertCircle className="w-4 h-4" />
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
