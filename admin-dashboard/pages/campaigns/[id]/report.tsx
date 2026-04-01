import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getCampaignById, getWeeklyPerformance, downloadWeeklyCampaignPdf } from '../../../services/api';
import { 
  ArrowLeft, 
  Download, 
  TrendingUp, 
  Users, 
  MapPin, 
  QrCode, 
  BarChart3, 
  Calendar,
  Share2,
  ShieldCheck,
  Zap,
  Printer
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import { toast } from 'sonner';

export default function CampaignReportPage() {
  const router = useRouter();
  const { id } = router.query;
  const [campaign, setCampaign] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [campaignData, performanceData] = await Promise.all([
        getCampaignById(id as string),
        getWeeklyPerformance(id as string)
      ]);
      setCampaign(campaignData);
      setMetrics(performanceData);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar los datos del reporte.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !campaign) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <Zap className="w-12 h-12 text-tad-yellow animate-pulse" />
           <p className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] animate-pulse">Compilando Inteligencia de Campaña...</p>
        </div>
      </div>
    );
  }

  const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
  const totalScans = metrics.reduce((sum, m) => sum + m.scans, 0);
  const avgCtr = totalImpressions > 0 ? (totalScans / totalImpressions) * 100 : 0;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-tad-yellow selection:text-black">
      {/* Print Overlay Hide */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; color: black !important; }
          .bg-gray-800\/40 { background: transparent !important; border: 1px solid #eee !important; }
          .text-white { color: black !important; }
          .text-gray-400 { color: #666 !important; }
          .bg-black { background: white !important; }
        }
      `}</style>

      <div className="max-w-[1400px] mx-auto px-6 py-10">
        
        {/* Header no-print */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 no-print">
          <div className="flex items-center gap-5">
            <Link href={`/campaigns/${id}`} className="w-12 h-12 bg-gray-900 border border-gray-700 rounded-2xl flex items-center justify-center hover:border-tad-yellow hover:text-tad-yellow transition-all shadow-xl group">
               <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div>
               <div className="flex items-center gap-2 mb-1">
                 <ShieldCheck className="w-3.5 h-3.5 text-tad-yellow" />
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Auditoría de Impacto Certificada</p>
               </div>
               <h1 className="text-3xl font-black uppercase tracking-tight leading-none">
                 Reporte de <span className="text-tad-yellow">Impacto</span>
               </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <button 
               onClick={async () => {
                 const phone = prompt("📲 Ingresa el WhatsApp del Anunciante (Ej: 18495043872):", campaign.whatsapp || "");
                 if (!phone) return;
                 
                 const loadingToast = toast.loading("Enviando reporte por WhatsApp...");
                 try {
                   const { shareReportByWhatsApp } = await import('../../../services/api');
                   await shareReportByWhatsApp(campaign.id, {
                     phone,
                     advertiserName: campaign.advertiser,
                     campaignName: campaign.name,
                     reportUrl: window.location.href
                   });
                   toast.success("✅ Reporte enviado exitosamente", { id: loadingToast });
                 } catch (err: any) {
                   toast.error("❌ Fallo al enviar WhatsApp: " + err.message, { id: loadingToast });
                 }
               }}
               className="p-3 bg-gray-900 border border-[#25D366]/30 rounded-xl hover:border-[#25D366] text-[#25D366] transition-all shadow-sm flex items-center gap-2 group/wa"
             >
                <Share2 className="w-5 h-5 group-hover/wa:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Compartir WhatsApp</span>
             </button>
             <button 
               onClick={() => window.print()}
               className="p-3 bg-gray-900 border border-gray-700 rounded-xl hover:border-white transition-all text-gray-400 hover:text-white"
             >
                <Printer className="w-5 h-5" />
             </button>
             <button 
               onClick={async () => {
                 setDownloading(true);
                 try {
                   await downloadWeeklyCampaignPdf(campaign.id, campaign.name);
                   toast.success("Descargando Certificado Oficial PDF");
                 } catch (err) {
                   toast.error("Error al generar el PDF");
                 } finally {
                   setDownloading(false);
                 }
               }}
               disabled={downloading}
               className="flex items-center gap-3 bg-tad-yellow hover:bg-yellow-400 text-black font-black uppercase text-xs tracking-widest px-8 py-3.5 rounded-2xl transition-all shadow-2xl disabled:opacity-50"
             >
                {downloading ? (
                   <Zap className="w-4 h-4 animate-spin" />
                ) : (
                   <Download className="w-4 h-4" />
                )}
                Descargar Certificado PDF
             </button>
          </div>
        </div>

        {/* Brand Banner */}
        <div className="bg-gray-800/40 backdrop-blur-3xl border border-gray-700/50 rounded-3xl p-10 mb-8 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-tad-yellow/[0.03] blur-[100px] -z-10 group-hover:bg-tad-yellow/[0.05] transition-all duration-1000" />
           
           <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-tad-yellow text-black text-[10px] font-black uppercase tracking-widest rounded-md">
                       {campaign.advertiser}
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Estado: Operativo</p>
                 </div>
                 <h2 className="text-5xl lg:text-6xl font-black uppercase tracking-tighter text-white leading-none">
                    {campaign.name}
                 </h2>
                 <div className="flex items-center gap-6 pt-2">
                    <div className="flex items-center gap-2">
                       <Calendar className="w-4 h-4 text-gray-500" />
                       <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                         {format(new Date(campaign.startDate), 'dd MMMM yyyy', { locale: es })}
                       </span>
                    </div>
                    <div className="w-px h-4 bg-gray-700" />
                    <div className="flex items-center gap-2">
                       <MapPin className="w-4 h-4 text-gray-500" />
                       <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">REDOOH_NET / DOMINICANA</span>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 lg:gap-8 bg-black/40 p-8 rounded-3xl border border-gray-700/30 backdrop-blur-md">
                 <div className="text-center md:text-left">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Total Impactos</p>
                    <p className="text-4xl font-black text-white tracking-tight">{totalImpressions.toLocaleString()}</p>
                 </div>
                 <div className="text-center md:text-left">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Unique Reach</p>
                    <p className="text-4xl font-black text-tad-yellow tracking-tight">109 Unidades</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
           
           {/* Chart Column */}
           <div className="lg:col-span-2 bg-gray-800/40 backdrop-blur-3xl border border-gray-700/50 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-10">
                 <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-tad-yellow" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Cronograma de Impactos</h3>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <div className="w-2.5 h-2.5 rounded-full bg-tad-yellow/80 shadow-[0_0_8px_rgba(250,212,0,0.5)]" />
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Impactos Hoy</span>
                    </div>
                 </div>
              </div>
              
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics}>
                    <defs>
                      <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFD400" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#FFD400" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis 
                      dataKey="day" 
                      stroke="#9CA3AF" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => val.split('/')[0]}
                    />
                    <YAxis 
                      stroke="#9CA3AF" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', fontSize: '10px' }}
                      itemStyle={{ color: '#FFD400', fontWeight: 'bold', textTransform: 'uppercase' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="impressions" 
                      stroke="#FFD400" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorImp)" 
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* CTR and Scans Column */}
           <div className="space-y-8">
              
              <div className="bg-gray-800/40 backdrop-blur-3xl border border-gray-700/50 rounded-3xl p-8 flex flex-col justify-between h-[230px] group">
                 <div className="flex items-center gap-3">
                    <QrCode className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Engagement QR</h3>
                 </div>
                 <div>
                    <p className="text-5xl font-black text-white tracking-tighter mb-2">{totalScans}</p>
                    <div className="flex items-center gap-2">
                       <TrendingUp className="w-4 h-4 text-emerald-500" />
                       <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Conversión Directa</span>
                    </div>
                 </div>
              </div>

              <div className="bg-gray-800/40 backdrop-blur-3xl border border-gray-700/50 rounded-3xl p-8 flex flex-col justify-between h-[230px] group relative overflow-hidden">
                 <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-tad-yellow/[0.05] blur-3xl rounded-full" />
                 <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-tad-yellow" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">CTR Acumulado</h3>
                 </div>
                 <div>
                    <p className="text-5xl font-black text-tad-yellow tracking-tighter mb-2">{avgCtr.toFixed(2)}%</p>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Eficiencia de Interacción</p>
                 </div>
              </div>

           </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-gray-800/40 backdrop-blur-3xl border border-gray-700/50 rounded-3xl overflow-hidden mb-12">
            <div className="p-8 border-b border-gray-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-gray-400" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Auditoría Diaria de Pauta</h3>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-white/[0.02]">
                            <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Fecha</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Total Impactos</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Conversiones QR</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">CTR Diario</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-right">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/30">
                        {metrics.map((row, i) => (
                           <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                               <td className="px-8 py-6">
                                   <span className="text-xs font-bold text-white uppercase tracking-wider">{row.day}</span>
                               </td>
                               <td className="px-8 py-6">
                                   <span className="text-sm font-black text-gray-300 tracking-tight">{row.impressions.toLocaleString()}</span>
                               </td>
                               <td className="px-8 py-6">
                                   <span className="text-sm font-black text-emerald-500 tracking-tight">{row.scans}</span>
                               </td>
                               <td className="px-8 py-6">
                                   <span className="text-xs font-mono font-bold text-gray-400 group-hover:text-tad-yellow transition-colors">{row.ctr.toFixed(2)}%</span>
                               </td>
                               <td className="px-8 py-6 text-right">
                                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                       <ShieldCheck className="w-3 h-3" /> Certificado
                                   </div>
                               </td>
                           </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Footer Audit */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-8 border-t border-gray-700/50 text-center md:text-left">
           <div className="flex items-center gap-4">
              <Zap className="w-10 h-10 text-gray-700" />
              <div>
                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Tecnología TAD Dominicana</p>
                 <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-none">Validación Offline-First v4.5.1</p>
              </div>
           </div>
           <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest italic max-w-lg leading-relaxed">
             Los datos presentados son capturados por el hardware en cada unidad y sincronizados vía lotes. La precisión de ubicación está sujeta a las condiciones atmosféricas locales.
           </p>
        </div>

      </div>
    </div>
  );
}
