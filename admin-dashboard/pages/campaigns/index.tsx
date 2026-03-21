import { useEffect, useState, useCallback } from 'react';
import { getCampaigns, deleteCampaign } from '../../services/api';
import { PlusCircle, Megaphone, Zap, Film, ChevronRight, Clock, Trash2, Calendar, Target, Activity, Share2, AlertCircle, Sparkles, Download, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import clsx from 'clsx';
import DeviceSelectorModal from '../../components/DeviceSelectorModal';
import { CampaignModal } from '../../components/CampaignModal';
import { useTabSync } from '../../hooks/useTabSync';
import { notifyChange } from '../../lib/sync-channel';
import { AntigravityButton } from '../../components/ui/AntigravityButton';
import { getMedia } from '../../services/api';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; advertiser: string; active: boolean; startDate?: string; start_date?: string; endDate?: string; end_date?: string; mediaAssets?: { duration?: number }[]; media?: { id: string }[]; devices?: string[] }[]>([]);
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

      {/* Page Context Transition */}
      <div className="flex items-center gap-3 mb-8 opacity-60">
        <div className="w-8 h-px bg-white/20" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Broadcasting / Campaign Orchestrator</p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
           <button 
             onClick={() => {
               loadData();
               setSuccessMsg('SINCRONIZACIÓN GLOBAL DE RED ACTIVADA.');
               setTimeout(() => setSuccessMsg(''), 3000);
             }}
             className="p-2.5 bg-gray-900 border border-gray-700 rounded-xl hover:border-[#FFD400] hover:text-[#FFD400] transition-all text-gray-500 shadow-sm flex items-center gap-2 group"
           >
             <RefreshCcw className={clsx("w-4 h-4", loading && "animate-spin")} />
             <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Revalidar Clúster</span>
           </button>
        </div>
        <Link 
          href="/campaigns/new"
          className="bg-[#FFD400] text-black px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#e6be00] transition-all shadow-md shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
           Nueva Campaña
        </Link>
      </div>

      {/* Primary IQ Metrics Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { icon: Megaphone, label: 'Campañas Globales', value: campaigns.length, color: 'text-white', borderColor: 'border-white/20', iconColor: 'text-zinc-400' },
          { icon: Zap, label: 'Impactos Activos', value: campaigns.filter(c => c.active).length, color: 'text-[#FFD400]', borderColor: 'border-[#FFD400]/40', iconColor: 'text-[#FFD400]' },
          { icon: Target, label: 'Alcance Red', value: '4.2M+', color: 'text-emerald-500', borderColor: 'border-emerald-500/40', iconColor: 'text-emerald-500' },
          { icon: Activity, label: 'Integridad Link', value: 'Nominal', color: 'text-white', borderColor: 'border-white/20', iconColor: 'text-zinc-400' },
        ].map((s, i) => (
          <div 
            key={i} 
            className={clsx(
              "bg-[#111317] border border-white/[0.05] p-6 rounded-[24px] group relative overflow-hidden transition-all duration-300 shadow-sm flex flex-col justify-between hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8 fill-mode-both",
              i === 0 ? 'delay-0' : i === 1 ? 'delay-50' : i === 2 ? 'delay-100' : 'delay-150'
            )}
          >
             <div className="flex justify-between items-start mb-6">
                 <div className={clsx("p-2.5 rounded-2xl border bg-transparent", s.borderColor, s.iconColor)}>
                    <s.icon className="w-5 h-5" />
                 </div>
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-600/50" />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                <h3 className={clsx("text-4xl font-black tracking-tighter leading-none mt-1", s.color)}>
                  {typeof s.value === 'number' && s.value < 10 ? `0${s.value}` : s.value}
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
            const assetCount = (camp.mediaAssets?.length || 0) + (camp.media?.length || 0);
            const totalDuration = (camp.mediaAssets || []).reduce((sum: number, a: { duration?: number }) => sum + (a.duration || 0), 0);

            return (
              <div 
                key={camp.id} 
                className={clsx(
                  "group relative bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl overflow-hidden hover:border-tad-yellow/40 transition-all duration-500 shadow-md hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8 fill-mode-both hover:shadow-lg",
                  idx === 0 ? 'delay-0' : idx === 1 ? 'delay-50' : idx === 2 ? 'delay-100' : idx === 3 ? 'delay-150' : idx === 4 ? 'delay-200' : 'delay-250'
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
                          className="flex-1 flex items-center justify-center gap-2 bg-tad-yellow/10 border border-tad-yellow/20 hover:bg-tad-yellow hover:text-black text-tad-yellow font-bold text-[10px] uppercase tracking-wider py-3 rounded-xl transition-all shadow-sm group/btn"
                        >
                          <Zap className="w-4 h-4 group-hover/btn:animate-pulse" />
                          Despliegue
                        </button>
                        <Link 
                          href={`/campaigns/${camp.id}`}
                          title="Ver detalle de campaña"
                          className="p-3 bg-gray-900/50 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 rounded-xl transition-all shadow-sm flex items-center justify-center"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                        <AntigravityButton
                          variant="danger"
                          actionName="delete_campaign"
                          critical={true}
                          className="p-3 w-12 h-12 rounded-xl"
                          confirmMessage={`¿Eliminar la campaña "${camp.name}"? Esta acción no se puede deshacer.`}
                          onAsyncClick={async () => await deleteCampaign(camp.id)}
                          onSuccess={() => {
                            loadData();
                            notifyChange('CAMPAIGNS');
                          }}
                        >
                          <Trash2 className="w-5 h-5" />
                        </AntigravityButton>
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
        <CampaignModal 
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          campaignId={selectedCampaign.id}
          campaignName={selectedCampaign.name}
          onSuccess={() => {
            loadData();
            notifyChange('CAMPAIGNS');
            setSuccessMsg(`"${selectedCampaign.name.toUpperCase()}" SINCRONIZADA.`);
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
