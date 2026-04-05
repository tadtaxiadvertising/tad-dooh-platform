import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Share2, ArrowLeft, BarChart3, CloudUpload, Play, Plus, Megaphone, CheckCircle2, AlertTriangle, MonitorPlay, Zap, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { getAdvertiser } from '@/services/api';
import { useTabSync } from '@/hooks/useTabSync';
import { notifyChange } from '@/lib/sync-channel';
import { QRCodeSVG } from 'qrcode.react';

export default function AdvertiserProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const [advertiser, setAdvertiser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getAdvertiser(id as string);
      setAdvertiser(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadProfile();
  }, [id, loadProfile]);

  useTabSync(['ADVERTISERS', 'CAMPAIGNS', 'MEDIA'], loadProfile);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center animate-pulse">
         <Zap className="w-12 h-12 text-tad-yellow animate-pulse mb-6" />
         <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Cargando Perfil...</p>
      </div>
    );
  }

  if (!advertiser && !loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
         <p className="text-xl text-white font-bold uppercase tracking-widest mb-4">Anunciante no encontrado</p>
         <Link href="/advertisers" className="text-tad-yellow uppercase font-bold text-xs hover:underline">
            Volver
         </Link>
      </div>
    );
  }

  // Calculate overall metrics
  const totalCampaigns = advertiser.campaigns?.length || 0;
  const activeCampaigns = advertiser.campaigns?.filter((c: any) => c.status === 'ACTIVE').length || 0;
  
  let totalImpressions = 0;
  let totalPlays = 0;
  let totalBudget = 0;
  let totalMedia = 0;

  advertiser.campaigns?.forEach((campaign: any) => {
    totalBudget += campaign.budget || 0;
    totalMedia += campaign.media?.length || 0;
    
    if (campaign.metrics) {
      campaign.metrics.forEach((m: any) => {
        totalImpressions += m.impressions || 0;
        totalPlays += m.playCount || 0;
      });
    }
  });

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-tad-yellow/[0.04] blur-[150px] rounded-full animate-pulse-soft" />
      </div>

      <div className="mb-8">
        <Link href="/advertisers" className="inline-flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-white uppercase tracking-widest transition-colors bg-gray-900/50 px-4 py-2 rounded-xl border border-gray-800">
          <ArrowLeft className="w-4 h-4" /> Directorio
        </Link>
      </div>

      {/* Profile Header */}
      <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-tad-yellow/5 blur-[100px] -z-10" />
        
        <div className="flex items-center gap-6">
           <div className="w-24 h-24 bg-gradient-to-br from-gray-700/50 to-gray-900 rounded-3xl flex items-center justify-center border border-gray-700/50 shadow-md relative group">
              <span className="text-4xl font-black text-gray-300 relative z-10">{(advertiser.companyName || 'A').charAt(0)}</span>
              {advertiser.status === 'ACTIVE' && (
                <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-[#0a0a0b] shadow-[0_0_10px_#10b981]" />
              )}
           </div>
           <div>
             <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tight leading-none">
                  {advertiser.companyName}
                </h1>
                <div className="px-3 py-1 bg-tad-yellow/10 text-tad-yellow border border-tad-yellow/20 rounded-lg text-[9px] font-bold uppercase tracking-widest">
                  Hub Anunciante
                </div>
             </div>
             <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-xl">
                {advertiser.contactName} • {advertiser.email} • {advertiser.phone}
             </p>
           </div>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
           {advertiser.whatsapp && (
             <div className="flex flex-col items-center gap-2 px-6 py-4 bg-gray-900/50 border border-gray-700/50 rounded-2xl shadow-inner group cursor-pointer hover:border-tad-yellow/40 transition-colors">
                <QRCodeSVG value={`https://wa.me/${advertiser.whatsapp}`} size={60} level="M" fgColor="#fff" bgColor="transparent" className="opacity-80 group-hover:opacity-100 transition-opacity" />
                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-tad-yellow">Escaneo QR / WhatsApp</p>
             </div>
           )}
           <div className="flex flex-col gap-3">
             <button 
               onClick={() => router.push('/media?openUpload=true')}
               className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl border border-gray-700/50 hover:border-gray-500 text-[10px] font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
             >
                <CloudUpload className="w-4 h-4" /> Subir Contenido
             </button>
             <button 
               onClick={() => router.push(`/campaigns/new?advertiser=${encodeURIComponent(advertiser.companyName)}`)}
               className="bg-tad-yellow text-black px-6 py-3 rounded-xl shadow-md text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-400 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
             >
                <Plus className="w-4 h-4" /> Lanzar Campaña
             </button>
           </div>
        </div>
      </div>

      {/* Main Metrics Dashboard */}
      <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
         <BarChart3 className="w-5 h-5 text-tad-yellow" /> Panel de Rendimiento Global
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Campañas Activas', value: activeCampaigns, icon: Megaphone, color: activeCampaigns > 0 ? 'text-emerald-400' : 'text-gray-400', suffix: ` / ${totalCampaigns} total` },
          { label: 'Inversión Retenida', value: `RD$ ${totalBudget.toLocaleString()}`, icon: Zap, color: 'text-tad-yellow', suffix: null },
          { label: 'Impactos (Reproducciones)', value: totalPlays.toLocaleString(), icon: Play, color: 'text-white', suffix: 'vistas' },
          { label: 'Impresiones (Geo-Fencing)', value: totalImpressions.toLocaleString(), icon: Share2, color: 'text-blue-400', suffix: 'hits' },
        ].map((s, i) => (
          <div key={i} className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-3xl relative flex flex-col justify-between shadow-sm animate-in fade-in slide-in-from-bottom-8 fill-mode-both">
              <div className="flex justify-between items-start mb-6">
                 <div className="p-3 bg-gray-900/80 rounded-2xl border border-gray-700/50 shadow-inner">
                    <s.icon className={clsx("w-5 h-5", s.color)} />
                 </div>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                 <h3 className={clsx("text-3xl font-bold tracking-tight leading-none mt-1", s.color)}>
                   {s.value}
                 </h3>
                 {s.suffix && <p className="text-xs font-medium text-gray-600 mt-2">{s.suffix}</p>}
              </div>
          </div>
        ))}
      </div>

      {/* Detailed Campaigns Feed */}
      <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
         <MonitorPlay className="w-5 h-5 text-tad-yellow" /> Desglose de Campañas
      </h2>
      
      <div className="space-y-6">
        {advertiser.campaigns?.length > 0 ? (
          advertiser.campaigns.map((campaign: any) => {
            const isActive = campaign.status === 'ACTIVE';
            let cPlays = 0;
            let cImpressions = 0;
            if (campaign.metrics) {
               campaign.metrics.forEach((m: any) => {
                 cPlays += m.playCount || 0;
                 cImpressions += m.impressions || 0;
               });
            }
            const mediaCount = campaign.media?.length || 0;

            return (
              <div key={campaign.id} className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 lg:p-8 flex flex-col lg:flex-row gap-8 hover:border-gray-500 transition-all group shadow-sm">
                
                {/* Campaign Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                     <span className={clsx("w-2 h-2 rounded-full", isActive ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-gray-600")} />
                     <h3 className="text-xl font-bold text-white uppercase tracking-tight">{campaign.name}</h3>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">{campaign.description || 'Sin descripción'}</p>
                  
                  <div className="flex flex-wrap gap-4 pt-4">
                     <div className="bg-gray-900/50 px-4 py-2 rounded-xl border border-gray-700/50 flex items-center gap-2">
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Inversión:</span>
                        <span className="text-xs font-bold text-tad-yellow">RD$ {(campaign.budget || 0).toLocaleString()}</span>
                     </div>
                     <div className="bg-gray-900/50 px-4 py-2 rounded-xl border border-gray-700/50 flex items-center gap-2">
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Activos Media:</span>
                        <span className="text-xs font-bold text-white">{mediaCount} Archivos</span>
                     </div>
                     {campaign.targetImpressions > 0 && (
                       <div className="bg-gray-900/50 px-4 py-2 rounded-xl border border-gray-700/50 flex items-center gap-2">
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Meta Hits:</span>
                          <span className="text-xs font-bold text-blue-400">{campaign.targetImpressions.toLocaleString()}</span>
                       </div>
                     )}
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden lg:block w-px bg-white/5" />

                {/* Campaign Action & Metrics */}
                <div className="w-full lg:w-72 space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="text-center bg-black/20 p-4 rounded-2xl border border-white/5">
                         <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Reproducciones</p>
                         <p className="text-xl font-black text-white">{cPlays.toLocaleString()}</p>
                      </div>
                      <div className="text-center bg-black/20 p-4 rounded-2xl border border-white/5">
                         <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Impresiones</p>
                         <p className="text-xl font-black text-white">{cImpressions.toLocaleString()}</p>
                      </div>
                   </div>
                   <div className="flex gap-3">
                      <Link 
                        href={`/campaigns`} 
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-xl py-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all"
                      >
                         <ExternalLink className="w-3 h-3" /> Dashboard
                      </Link>
                   </div>
                </div>

              </div>
            );
          })
        ) : (
          <div className="py-20 bg-gray-900/20 border border-dashed border-gray-700/50 rounded-3xl flex flex-col items-center justify-center text-center">
             <AlertTriangle className="w-10 h-10 text-gray-500 mb-4" />
             <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest mb-2">Sin Campañas Vinculadas</h3>
             <p className="text-xs text-gray-500 uppercase max-w-sm mb-6">Este anunciante no tiene promociones activas en la red TAD.</p>
             <button 
               onClick={() => router.push(`/campaigns/new?advertiser=${encodeURIComponent(advertiser.companyName)}`)}
               className="bg-tad-yellow/10 text-tad-yellow hover:bg-tad-yellow hover:text-black border border-tad-yellow/30 px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all"
             >
               Crear Su Primera Campaña
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
