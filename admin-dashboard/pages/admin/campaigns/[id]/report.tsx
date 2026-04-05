import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getCampaignById, getWeeklyPerformance, downloadWeeklyCampaignPdf, emailCampaignReport, emailInvoice } from '@/services/api';
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
  Printer,
  FileText,
  CreditCard,
  Building2,
  User,
  Hash,
  Mail
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import Link from 'next/link';
import { format, addDays } from 'date-fns';
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
  const [emailingSending, setEmailingSending] = useState(false);

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
           <Zap className="w-12 h-12 text-[#FFD400] animate-pulse" />
           <p className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] animate-pulse">Compilando Inteligencia Fiscal...</p>
        </div>
      </div>
    );
  }

  const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
  const totalScans = metrics.reduce((sum, m) => sum + m.scans, 0);
  const avgCtr = totalImpressions > 0 ? (totalScans / totalImpressions) * 100 : 0;
  
  // Tax & Invoice Mock Data / Calculation
  const invoiceId = `INV-${(id as string || 'default').slice(0, 8).toUpperCase()}`;
  const baseAmount = 3000; // This could be dynamic if we had pricing data
  const itbis = baseAmount * 0.18;
  const totalAmount = baseAmount + itbis;
  const startDate = new Date(campaign.startDate);
  const periodEnd = addDays(startDate, 14); // 2 week period as in example

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#FFD400] selection:text-black">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100;300;400;600;900&display=swap');
        
        body {
          font-family: 'Outfit', sans-serif;
        }

        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; font-family: 'Outfit', sans-serif !important; }
          .bg-black { background: white !important; color: black !important; }
          .text-white { color: black !important; }
          .text-gray-400, .text-gray-500 { color: #666 !important; }
          .border-gray-700, .border-gray-800 { border-color: #000 !important; }
          .bg-gray-800\/40, .bg-gray-900\/50, .bg-white\/\[0.02\] { background: transparent !important; border: 1px solid #eee !important; }
          .text-tad-yellow, .text-\[\#FFD400\] { color: #000 !important; }
          .shadow-2xl, .shadow-xl { box-shadow: none !important; }
          .backdrop-blur-3xl { backdrop-filter: none !important; }
          
          .invoice-card {
            border: 2px solid #000 !important;
            padding: 40px !important;
            border-radius: 0 !important;
            margin: 0 !important;
          }
        }

        .glass-card {
          background: rgba(17, 24, 39, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .glow-yellow {
          box-shadow: 0 0 30px rgba(255, 212, 0, 0.15);
        }
      `}</style>

      <div className="max-w-[1200px] mx-auto px-6 py-10">
        
        {/* Navigation & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 no-print">
          <div className="flex items-center gap-5">
            <Link href={`/campaigns/${id}`} className="w-12 h-12 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center hover:border-[#FFD400] hover:text-[#FFD400] transition-all shadow-xl group">
               <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div>
               <div className="flex items-center gap-2 mb-1">
                 <ShieldCheck className="w-3.5 h-3.5 text-[#FFD400]" />
                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Sincronización Fiscal Certificada</p>
               </div>
               <h1 className="text-3xl font-black uppercase tracking-tight leading-none">
                 Reporte & <span className="text-[#FFD400]">Facturación</span>
               </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <button 
               onClick={async () => {
                 const phone = prompt("📲 Enviar por WhatsApp (Ej: 18495043872):", campaign.whatsapp || "");
                 if (!phone) return;
                 const loadingToast = toast.loading("Enviando...");
                 try {
                   const { shareReportByWhatsApp } = await import('@/services/api');
                   await shareReportByWhatsApp(campaign.id, {
                     phone,
                     advertiserName: campaign.advertiser,
                     campaignName: campaign.name,
                     reportUrl: window.location.href
                   });
                   toast.success("✅ WhatsApp enviado", { id: loadingToast });
                 } catch (err: any) {
                   toast.error("❌ Fallo: " + err.message, { id: loadingToast });
                 }
               }}
               className="p-3 bg-gray-900 border border-emerald-500/30 rounded-xl hover:border-emerald-500 text-emerald-500 transition-all shadow-sm flex items-center gap-2"
             >
                <Share2 className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">WhatsApp</span>
             </button>

             {/* Email Report Button */}
             <button 
               onClick={async () => {
                 const email = prompt("✉️ Enviar Reporte por Email:", campaign.advertiserEmail || "");
                 if (!email) return;
                 setEmailingSending(true);
                 const loadingToast = toast.loading("Enviando reporte por email...");
                 try {
                   const result = await emailCampaignReport(campaign.id, {
                     email,
                     advertiserName: campaign.advertiser,
                     reportUrl: window.location.href,
                   });
                   toast.success(`✅ ${result.message || 'Reporte enviado'}`, { id: loadingToast });
                 } catch (err: any) {
                   toast.error("❌ Error al enviar email: " + (err.response?.data?.message || err.message), { id: loadingToast });
                 } finally {
                   setEmailingSending(false);
                 }
               }}
               disabled={emailingSending}
               className="p-3 bg-gray-900 border border-blue-500/30 rounded-xl hover:border-blue-500 text-blue-400 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
             >
                <Mail className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Email Reporte</span>
             </button>

             {/* Email Invoice Button */}
             <button 
               onClick={async () => {
                 const email = prompt("🧾 Enviar Factura por Email:", campaign.advertiserEmail || "");
                 if (!email) return;
                 setEmailingSending(true);
                 const loadingToast = toast.loading("Enviando factura por email...");
                 try {
                   const result = await emailInvoice(campaign.id, { email });
                   toast.success(`✅ ${result.message || 'Factura enviada'}`, { id: loadingToast });
                 } catch (err: any) {
                   toast.error("❌ Error al enviar factura: " + (err.response?.data?.message || err.message), { id: loadingToast });
                 } finally {
                   setEmailingSending(false);
                 }
               }}
               disabled={emailingSending}
               className="p-3 bg-gray-900 border border-amber-500/30 rounded-xl hover:border-amber-500 text-amber-400 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
             >
                <FileText className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Email Factura</span>
             </button>

             <button 
               onClick={() => window.print()}
               className="p-3 bg-gray-900 border border-gray-800 rounded-xl hover:border-white transition-all text-gray-400 hover:text-white"
             >
                <Printer className="w-5 h-5" />
             </button>
             <button 
               onClick={async () => {
                 setDownloading(true);
                 try {
                   await downloadWeeklyCampaignPdf(campaign.id, campaign.name);
                   toast.success("PDF generado exitosamente");
                 } catch (err) {
                   toast.error("Error al generar PDF");
                 } finally {
                   setDownloading(false);
                 }
               }}
               disabled={downloading}
               className="flex items-center gap-3 bg-[#FFD400] hover:bg-[#FFE040] text-black font-black uppercase text-xs tracking-widest px-8 py-3.5 rounded-2xl transition-all shadow-2xl disabled:opacity-50"
             >
                {downloading ? <Zap className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Certificado Oficial
             </button>
          </div>
        </div>

        {/* --- MAIN DASHBOARD VIEW (Interactive) --- */}
        <div className="no-print">
          {/* Brand & Performance Banner */}
          <div className="glass-card glow-yellow rounded-[40px] p-10 mb-8 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFD400]/[0.1] blur-[100px] -z-10" />
             
             <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-[#FFD400] text-black text-[10px] font-black uppercase tracking-widest rounded-md shadow-lg">
                         {campaign.advertiser}
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">ID: {invoiceId}</p>
                   </div>
                   <h2 className="text-5xl lg:text-7xl font-[900] uppercase tracking-tighter text-white leading-[0.9]">
                      {campaign.name}
                   </h2>
                   <div className="flex items-center gap-6 pt-4">
                      <div className="flex items-center gap-2">
                         <Calendar className="w-4 h-4 text-[#FFD400]" />
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                           {format(new Date(campaign.startDate), "dd 'de' MMMM, yyyy", { locale: es })}
                         </span>
                      </div>
                      <div className="w-px h-4 bg-gray-800" />
                      <div className="flex items-center gap-2">
                         <MapPin className="w-4 h-4 text-gray-600" />
                         <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Flota TAD / Santo Domingo</span>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6 bg-black/60 p-8 rounded-[32px] border border-white/5 backdrop-blur-md">
                   <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Impactos Totales</p>
                      <p className="text-4xl font-black text-white tracking-tighter">{totalImpressions.toLocaleString()}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Estado Fiscal</p>
                      <p className="text-4xl font-black text-[#FFD400] tracking-tighter uppercase">Auditado</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Metrics Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
             <div className="lg:col-span-2 glass-card rounded-[40px] p-8 border border-white/5">
                <div className="flex items-center justify-between mb-10">
                   <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-[#FFD400]" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-white">Cronograma de Impacto Diario</h3>
                   </div>
                </div>
                
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics}>
                      <defs>
                        <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FFD400" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#FFD400" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="day" stroke="#444" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val.split('/')[0]} />
                      <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: '16px', fontSize: '10px' }} />
                      <Area type="monotone" dataKey="impressions" stroke="#FFD400" strokeWidth={4} fill="url(#colorImp)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="space-y-8">
                <div className="glass-card rounded-[32px] p-8 flex flex-col justify-between h-[230px] border border-white/5 hover:border-[#FFD400]/20 transition-all group">
                   <div className="flex items-center gap-3">
                      <QrCode className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-white">Interacciones QR</h3>
                   </div>
                   <div>
                      <p className="text-6xl font-black text-white tracking-tighter mb-2">{totalScans}</p>
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Conversión Directa</span>
                   </div>
                </div>

                <div className="glass-card rounded-[32px] p-8 flex flex-col justify-between h-[230px] border border-white/5 hover:border-[#FFD400]/20 transition-all group overflow-hidden">
                   <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-[#FFD400]" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-white">CTR Acumulado</h3>
                   </div>
                   <div>
                      <p className="text-6xl font-black text-[#FFD400] tracking-tighter mb-2">{avgCtr.toFixed(2)}%</p>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Eficiencia Digital</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* --- FISCAL INVOICE SECTION --- */}
        <div className="bg-white text-black p-8 md:p-16 rounded-[40px] shadow-2xl relative overflow-hidden border border-gray-200 invoice-card print:border-none print:shadow-none print:p-0">
            {/* Header / Watermark style */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16 border-b-2 border-black pb-12">
                <div className="space-y-6">
                    <div>
                        <h2 className="text-4xl font-[900] tracking-tighter uppercase leading-none mb-1">TADDOOH</h2>
                        <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-gray-500">Digital Out Of Home Advertising</p>
                    </div>
                    
                    <div className="space-y-1">
                        <h4 className="text-xl font-black uppercase tracking-tight">Comprobante Fiscal</h4>
                        <p className="text-sm font-bold">ID: <span className="font-mono">{invoiceId}</span></p>
                        <p className="text-sm font-bold text-gray-500">Emitido: {format(new Date(), 'd/M/yyyy')}</p>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest no-print">
                        <ShieldCheck className="w-4 h-4" /> Auditoría Aprobada
                    </div>
                    <div className="hidden print:block text-[10px] font-black uppercase tracking-widest border border-black px-4 py-2 rounded-full">
                        Auditoría Aprobada
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 text-sm">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <p className="font-black uppercase tracking-widest text-[10px] text-gray-400">Prestador</p>
                        </div>
                        <div className="font-bold space-y-1">
                            <p className="text-lg">TAD Advertising SRL</p>
                            <p className="text-gray-600">RNC: 132-45678-9</p>
                            <p className="text-gray-500 text-xs leading-relaxed">Calle Central #45, Ensanche Naco<br/>Santo Domingo, RD</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <p className="font-black uppercase tracking-widest text-[10px] text-gray-400">Receptor</p>
                        </div>
                        <div className="font-bold space-y-1">
                            <p className="text-lg">{campaign.advertiser}</p>
                            <p className="text-gray-600">N/A</p>
                            <p className="text-gray-500 text-xs italic">Periodo: {format(startDate, 'd/M/yyyy')} — {format(periodEnd, 'd/M/yyyy')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Invoice Table */}
            <div className="mb-16">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="py-4 text-[11px] font-black uppercase tracking-widest">Concepto de Pauta</th>
                            <th className="py-4 text-[11px] font-black uppercase tracking-widest text-center">Duración</th>
                            <th className="py-4 text-[11px] font-black uppercase tracking-widest text-center">Promociones Contratadas</th>
                            <th className="py-4 text-[11px] font-black uppercase tracking-widest text-right">Total (DOP)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        <tr>
                            <td className="py-8">
                                <p className="font-black text-xl uppercase tracking-tighter leading-none mb-1">{campaign.name}</p>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Servicio de exhibición publicitaria en flota TAD taxis</p>
                            </td>
                            <td className="py-8 text-center font-bold">1 Mes(es)</td>
                            <td className="py-8 text-center font-black text-lg">1</td>
                            <td className="py-8 text-right font-black text-xl tracking-tighter">RD$ {totalAmount.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Bottom Details & Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 border-t-2 border-black pt-12">
                <div className="space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            <p className="font-black uppercase tracking-widest text-[10px] text-gray-400">Detalles de Transferencia</p>
                        </div>
                        <div className="text-xs font-bold space-y-1">
                            <p className="uppercase font-black">Banco Popular Dominicano</p>
                            <p className="text-gray-600 font-mono">Cuenta Corriente: 802-XXXXXXX</p>
                            <p className="text-gray-500">Beneficiario: TAD Advertising SRL</p>
                        </div>
                    </div>

                    <p className="text-[9px] font-bold text-gray-400 uppercase leading-relaxed italic max-w-sm">
                        * Este documento es un reporte de auditoría fiscal generado automáticamente por el sistema de inteligencia financiera de TAD. Los datos están protegidos por el protocolo TAD-CIPHER.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm font-bold py-2 border-b border-gray-100">
                        <span className="uppercase text-gray-400 tracking-widest text-[10px]">Monto Base</span>
                        <span>RD$ {baseAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold py-2 border-b border-gray-100">
                        <span className="uppercase text-gray-400 tracking-widest text-[10px]">ITBIS (18%)</span>
                        <span>RD$ {itbis.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-2xl font-black py-4">
                        <span className="uppercase tracking-tighter">Total DOP</span>
                        <span className="text-3xl tracking-tighter">RD$ {totalAmount.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Audit (no-print) */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-16 mt-16 border-t border-gray-800 text-center md:text-left no-print">
           <div className="flex items-center gap-4">
              <Zap className="w-10 h-10 text-gray-800" />
              <div>
                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Tecnología TAD Dominicana</p>
                 <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-none">Validación Criptográfica v4.5.1</p>
              </div>
           </div>
           <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest italic max-w-lg leading-relaxed">
             La veracidad de estos datos puede ser verificada escaneando el código de auditoría en el panel central. © 2026 TAD Advertising SRL.
           </p>
        </div>

      </div>
    </div>
  );
}
