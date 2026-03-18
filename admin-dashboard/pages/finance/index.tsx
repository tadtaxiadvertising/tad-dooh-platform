import { useEffect, useState, useCallback } from 'react';
import { getCampaignBilling, getAutoPayroll, processPayrollPayment, getInvoiceUrl, getCampaignExportUrl, getPayrollExportUrl, getCampaignReportUrl } from '../../services/api';
import { 
  AlertTriangle,
  Receipt,
  Users,
  Zap,
  TrendingUp,
  Target,
  BarChart3,
  DollarSign,
  FileBarChart,
  ShieldCheck,
  Activity,
  Cpu,
  ArrowUpRight,
  Download,
  Building2,
  RefreshCcw,
  PieChart
} from 'lucide-react';
import clsx from 'clsx';
import { useTabSync } from '../../hooks/useTabSync';
import { notifyChange } from '../../lib/sync-channel';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'payroll' | 'campaigns'>('payroll');
  const [payroll, setPayroll] = useState<{ driverId: string; driverName: string; taxiNumber?: string; activeAds: number; totalAmount: number }[]>([]);
  const [campaignData, setCampaignData] = useState<{ campaignId: string; campaignName: string; assignedTaxis: number; status: string; estimatedRevenue: number; totalImpressions?: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'payroll') {
        const data = await getAutoPayroll();
        setPayroll(data || []);
      } else {
        const data = await getCampaignBilling();
        setCampaignData(data || []);
      }
    } catch (err) {
      console.error('Finance load error:', err);
      setError('ERROR DE ENLACE CON EL SERVIDOR DE TESORERÍA.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useTabSync('FINANCE', loadData);

  useEffect(() => {
    loadData();
  }, [activeTab, loadData]);

  const handlePay = async (driverId: string, amount: number) => {
    const ref = window.prompt(`Confirmar liquidación de RD$${amount.toLocaleString()}. Ingrese Hash o Ref. de Transferencia:`);
    if (ref) {
      try {
        const now = new Date();
        await processPayrollPayment({ 
          driverId, 
          month: now.getMonth() + 1, 
          year: now.getFullYear(),
          reference: ref 
        });
        alert('Protocolo de pago ejecutado exitosamente.');
        notifyChange('FINANCE');
        loadData();
      } catch (err: unknown) {
        console.error(err);
        alert('Error crítico en el proceso de liquidación. Verifique duplicidad de registros.');
      }
    }
  };

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-1000 relative selection:bg-tad-yellow selection:text-black font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-15%] left-[-10%] w-[65%] h-[65%] bg-tad-yellow/[0.04] blur-[180px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[5%] right-[-10%] w-[55%] h-[55%] bg-white/[0.01] blur-[160px] rounded-full" />
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-tad-yellow rounded-3xl flex items-center justify-center shadow-[0_20px_50px_rgba(255,212,0,0.15)]">
                <DollarSign className="w-7 h-7 text-black" />
             </div>
             <div>
                <div className="flex items-center gap-3 mb-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow shadow-[0_0_8px_rgba(255,212,0,0.8)] animate-pulse" />
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Integrated Fiscal Intelligence v4.2</p>
                </div>
                <h1 className="text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none font-display">
                  Tad <span className="text-tad-yellow transition-all duration-700 hover:text-white cursor-default italic">Treasury</span>
                </h1>
             </div>
          </div>
          <p className="text-zinc-500 max-w-2xl text-[12px] font-bold uppercase tracking-widest leading-relaxed">
            Fiscal <span className="text-white">DOOH asset management</span> and regional schedule delivery.
          </p>
        </div>
        
        <div className="flex p-1.5 bg-zinc-900/10 border border-white/5 rounded-full backdrop-blur-3xl shadow-3xl">
          <button 
            onClick={() => setActiveTab('payroll')}
            className={clsx(
              "flex items-center gap-4 px-10 py-3.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all italic",
              activeTab === 'payroll' ? "bg-tad-yellow text-black shadow-3xl shadow-tad-yellow/10" : "text-zinc-600 hover:text-white"
            )}
          >
            <Users className="w-4 h-4" />
            Payroll_Manual
          </button>
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={clsx(
              "flex items-center gap-4 px-10 py-3.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all italic",
              activeTab === 'campaigns' ? "bg-tad-yellow text-black shadow-3xl shadow-tad-yellow/10" : "text-zinc-600 hover:text-white"
            )}
          >
            <Receipt className="w-4 h-4" />
            Billing_Cluster
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-12 p-8 bg-rose-500/10 border border-rose-500/30 rounded-[3rem] flex items-center gap-6 text-rose-500 animate-in zoom-in duration-700 shadow-3xl">
           <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center animate-pulse">
              <Activity className="w-6 h-6" />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-1 italic">Interrupción de Enlace Fiscal</p>
              <p className="text-sm font-black uppercase tracking-tight italic">{error}</p>
           </div>
        </div>
      )}

      <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000 fill-mode-both">
        {activeTab === 'payroll' ? (
          <div className="space-y-16">
            {/* Payroll Metric Clusters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <SummaryCard 
                  icon={<Users className="w-7 h-7 font-black" />} 
                  label="Tripulación Vinculada" 
                  value={payroll.length} 
                  sub="Protocolos de Conductor Activo"
                  color="white"
               />
               <SummaryCard 
                  icon={<Zap className="w-7 h-7 font-black" />} 
                  label="Tesorería Proyectada" 
                  value={`RD$ ${payroll.reduce((s, p) => s + p.totalAmount, 0).toLocaleString()}`} 
                  sub="Ciclo Fiscal en Curso"
                  color="yellow"
                  large
               />
               <SummaryCard 
                  icon={<ShieldCheck className="w-7 h-7 font-black" />} 
                  label="Estatus de Auditoría" 
                  value="INTEGRAL" 
                  sub="Verificación OIDC Activa"
                  color="emerald"
               />
            </div>

            {/* Payroll Ledger Surface */}
            <div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/5 rounded-[4rem] overflow-hidden shadow-3xl relative">
              <div className="absolute top-0 right-0 w-96 h-96 bg-tad-yellow/[0.02] blur-[120px] -z-10" />
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.01] border-b border-white/5">
                      <th className="px-12 py-10 text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] italic leading-none">Token del Conductor</th>
                      <th className="px-12 py-10 text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] italic leading-none text-center">Difusión Verificada</th>
                      <th className="px-12 py-10 text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] italic leading-none text-right">Liquidación Neta</th>
                      <th className="px-12 py-10 text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] italic leading-none text-center">Nexus Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      [1,2,3].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={4} className="px-12 py-12"><div className="h-10 bg-zinc-900/40 rounded-3xl w-full border border-white/5" /></td>
                        </tr>
                      ))
                    ) : payroll.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-12 py-48 text-center">
                           <div className="flex flex-col items-center gap-8">
                              <div className="w-24 h-24 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center shadow-3xl">
                                 <Users className="w-12 h-12 text-zinc-800" />
                              </div>
                              <h3 className="text-3xl font-black text-zinc-700 uppercase italic tracking-[0.3em] leading-none mb-2">Cámara de Pagos Desierta</h3>
                              <p className="text-[11px] text-zinc-800 font-black uppercase tracking-[0.3em] max-w-sm leading-relaxed italic">No se detectan solicitudes de liquidación pendientes en el cluster actual.</p>
                           </div>
                        </td>
                      </tr>
                    ) : payroll.map((item, idx) => (
                      <tr key={item.driverId} className="hover:bg-white/[0.02] transition-all group cursor-default">
                        <td className="px-12 py-10">
                          <div className={clsx("flex items-center gap-8 animate-in slide-in-from-left-4 duration-500 [fill-mode:both]", `[animation-delay:${idx * 40}ms]`)}>
                             <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-900 flex items-center justify-center border border-white/5 text-tad-yellow font-black text-2xl italic group-hover:border-tad-yellow/40 transition-all shadow-3xl group-hover:rotate-6">
                                {item.driverName.charAt(0)}
                             </div>
                             <div>
                                <p className="font-black text-white text-2xl tracking-tighter italic uppercase group-hover:text-tad-yellow transition-colors leading-none mb-3">{item.driverName}</p>
                                <div className="flex items-center gap-3">
                                   <div className="w-2 h-2 rounded-full bg-zinc-800" />
                                   <p className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.5em] italic">TAXI_NODE_{item.taxiNumber || 'UNKNOWN'}</p>
                                </div>
                             </div>
                          </div>
                        </td>
                        <td className="px-12 py-10 text-center">
                          <div className="inline-flex flex-col items-center group/ads bg-black/40 px-8 py-4 rounded-[2rem] border border-white/5 group-hover:bg-black/60 transition-colors">
                             <span className="text-4xl font-black text-white italic tracking-tighter group-hover:scale-110 transition-transform leading-none mb-1">{item.activeAds}</span>
                             <span className="text-[9px] text-zinc-800 font-black uppercase tracking-[0.2em] italic">Impactos Auditados</span>
                          </div>
                        </td>
                        <td className="px-12 py-10 text-right">
                          <div className="flex flex-col items-end">
                             <p className="text-4xl font-black text-white tracking-tighter italic leading-none mb-3">RD$ {item.totalAmount.toLocaleString()}</p>
                             <div className="flex items-center gap-3 px-4 py-1.5 bg-emerald-500/5 rounded-full border border-emerald-500/10">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                                <span className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em] italic">CALC_RATE_VERIFIED</span>
                             </div>
                          </div>
                        </td>
                        <td className="px-12 py-10 text-center">
                          <button 
                            onClick={() => handlePay(item.driverId, item.totalAmount)}
                            className="group/btn relative bg-tad-yellow text-black px-12 py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] transform transition-all hover:scale-105 hover:bg-yellow-400 active:scale-95 shadow-3xl shadow-tad-yellow/20 italic"
                          >
                            <span className="relative z-10 flex items-center justify-center gap-4">
                               <RefreshCcw className="w-5 h-5 group-hover/btn:rotate-180 transition-transform duration-700" />
                               Ejecutar Handshake
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
               <div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/5 p-12 rounded-[4rem] shadow-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-tad-yellow/5 blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  <div className="flex flex-col md:flex-row items-start gap-10 relative z-10">
                     <div className="w-24 h-24 bg-tad-yellow text-black rounded-[2.5rem] shadow-3xl shadow-tad-yellow/20 flex items-center justify-center group-hover:rotate-12 transition-transform duration-700">
                        <AlertTriangle className="w-10 h-10" />
                     </div>
                     <div className="flex-1">
                        <h4 className="text-white font-black text-3xl uppercase tracking-tighter italic mb-4 leading-none italic">Protocolo de <span className="text-tad-yellow">Compensación</span></h4>
                        <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-[0.2em] leading-loose mb-10 italic">
                           Los socios conductores reciben una bonificación de <span className="text-zinc-400 font-black">RD$ 500 mensuales</span> por cada pauta activa verificada. La telemetría de hardware audita la integridad del stream DOOH para asegurar la facturación final.
                        </p>
                        <div className="flex flex-wrap gap-6">
                           <div className="flex items-center gap-4 px-6 py-3 bg-black/40 rounded-2xl border border-white/5">
                              <TrendingUp className="w-5 h-5 text-emerald-500" />
                              <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em] font-display italic">Nivel de Retorno Óptimo</span>
                           </div>
                           <button 
                              onClick={() => window.open(getPayrollExportUrl(), '_blank')}
                              className="flex items-center gap-4 px-8 py-3 bg-white/5 text-zinc-500 hover:bg-tad-yellow hover:text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-3xl border border-white/10 hover:border-transparent italic"
                           >
                              <Download className="w-5 h-5" /> Exportar Ledger CSV
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-zinc-950/80 backdrop-blur-3xl border border-white/5 p-12 rounded-[4rem] shadow-2xl relative overflow-hidden group flex flex-col justify-center">
                  <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-tad-yellow/[0.03] blur-[100px]" />
                  <div className="relative z-10 w-full">
                     <div className="flex items-center gap-5 mb-10">
                        <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-tad-yellow/40 transition-all">
                           <Cpu className="w-7 h-7 text-tad-yellow animate-pulse" />
                        </div>
                        <h4 className="text-white font-black text-2xl uppercase italic tracking-tighter italic">Automación Predictiva</h4>
                     </div>
                     <div className="space-y-6">
                        <div className="h-3 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                           <div className="h-full bg-gradient-to-r from-tad-yellow to-yellow-500 w-[85%] shadow-[0_0_25px_rgba(250,212,0,0.4)]" />
                        </div>
                        <div className="flex justify-between items-center px-2">
                           <p className="text-[11px] text-zinc-700 font-black uppercase tracking-[0.5em] italic">Score de Tesorería Regional</p>
                           <p className="text-[11px] text-tad-yellow font-black uppercase tracking-widest italic">85% PRECISION</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="space-y-16">
            {/* Ad Revenue Clusters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
               <SummaryCard 
                  icon={<BarChart3 className="w-7 h-7 text-white" />} 
                  label="CPM Referencia" 
                  value="RD$ 120" 
                  sub="Impactos x 1K Verificados"
                  trend="Market High"
                  color="white"
               />
               <SummaryCard 
                  icon={<Target className="w-7 h-7 text-emerald-500" />} 
                  label="Audiencia Auditada" 
                  value={(campaignData.reduce((s, c) => s + (c.totalImpressions || 0), 0)).toLocaleString()} 
                  sub="Handshake DOOH Real"
                  trend="OIDC Verified"
                  color="emerald"
               />
               <SummaryCard 
                  icon={<DollarSign className="w-7 h-7 text-tad-yellow" />} 
                  label="Ingresos Proyectados" 
                  value={`RD$ ${campaignData.reduce((s, c) => s + (c.estimatedRevenue || 0), 0).toLocaleString()}`} 
                  sub="Ciclo Fiscal Pipeline"
                  trend="Growth Tier"
                  color="yellow"
                  large
               />
               <SummaryCard 
                  icon={<PieChart className="w-7 h-7 text-blue-500" />} 
                  label="Share de Mercado" 
                  value="42.8%" 
                  sub="Red Regional Tad"
                  trend="Up +2.4%"
                  color="white"
               />
            </div>

            {/* Campaign Invoicing Terminal Surface */}
            <div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/5 rounded-[4rem] overflow-hidden shadow-3xl relative">
              <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-tad-yellow/[0.02] blur-[150px] -z-10" />
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.01] border-b border-white/5">
                      <th className="px-12 py-10 text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] italic leading-none">Estrategia Global</th>
                      <th className="px-12 py-10 text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] italic leading-none text-center">Alcance Auditado</th>
                      <th className="px-12 py-10 text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] italic leading-none text-center">Nodos Emisores</th>
                      <th className="px-12 py-10 text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] italic leading-none text-right">Proyección Fiscal</th>
                      <th className="px-12 py-10 text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] italic leading-none text-center">Auditoría Nexus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      [1,2,3].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={5} className="px-12 py-12"><div className="h-10 bg-zinc-900/40 rounded-3xl w-full border border-white/5" /></td>
                        </tr>
                      ))
                    ) : campaignData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-12 py-48 text-center">
                           <div className="flex flex-col items-center gap-8">
                              <div className="w-24 h-24 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center shadow-3xl">
                                 <Building2 className="w-12 h-12 text-zinc-800" />
                              </div>
                              <h3 className="text-3xl font-black text-zinc-700 uppercase italic tracking-[0.3em] leading-none mb-2">Vacío Fiscal en Red</h3>
                              <p className="text-[11px] text-zinc-800 font-black uppercase tracking-[0.3em] max-w-sm leading-relaxed italic">No se han localizado auditorías de pauta publicitaria en el cluster regional.</p>
                           </div>
                        </td>
                      </tr>
                    ) : campaignData.map((camp, idx) => (
                      <tr key={camp.campaignId} className="hover:bg-white/[0.02] transition-all group cursor-default">
                        <td className="px-12 py-10">
                          <div className={clsx("flex items-center gap-8 animate-in slide-in-from-left-4 duration-500 [fill-mode:both]", `[animation-delay:${idx * 40}ms]`)}>
                             <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-900 flex items-center justify-center border border-white/5 group-hover:border-tad-yellow transition-all shadow-3xl group-hover:rotate-6">
                                <Building2 className="w-7 h-7 text-tad-yellow" />
                             </div>
                             <div>
                                <p className="font-black text-white text-2xl tracking-tighter uppercase italic group-hover:text-tad-yellow transition-colors leading-none mb-3">{camp.campaignName}</p>
                                <div className="flex items-center gap-4">
                                   <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/10">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                                      <span className="text-[9px] text-emerald-500 font-black uppercase tracking-[0.3em] italic">{camp.status}</span>
                                   </div>
                                   <div className="w-1 h-1 rounded-full bg-zinc-800" />
                                   <span className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.4em] italic">SECURE_HANDSHAKE_v4</span>
                                </div>
                             </div>
                          </div>
                        </td>
                        <td className="px-12 py-10 text-center">
                          <div className="inline-flex items-center gap-4 px-8 py-4 bg-black/40 border border-white/5 rounded-[2rem] group-hover:bg-black/60 transition-colors">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            <span className="text-3xl font-black text-white tracking-tighter italic leading-none">{(camp.totalImpressions || 0).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-12 py-10 text-center">
                          <div className="flex flex-col items-center">
                             <span className="text-zinc-600 font-black text-2xl italic leading-none group-hover:text-white transition-colors">{camp.assignedTaxis}</span>
                             <span className="text-[9px] text-zinc-800 font-black uppercase tracking-[0.3em] mt-2 italic">Active Emisor Nodes</span>
                          </div>
                        </td>
                        <td className="px-12 py-10 text-right">
                          <div className="flex flex-col items-end">
                             <p className="text-4xl font-black text-white tracking-tighter italic leading-none mb-3">RD$ {camp.estimatedRevenue?.toLocaleString()}</p>
                             <div className="px-4 py-1.5 bg-tad-yellow/10 rounded-full border border-tad-yellow/20">
                                <p className="text-[10px] text-tad-yellow font-black uppercase tracking-[0.3em] italic leading-none">High Impact Tier</p>
                             </div>
                          </div>
                        </td>
                        <td className="px-12 py-10">
                          <div className="flex items-center justify-center gap-4">
                             <a 
                              href={getInvoiceUrl(camp.campaignId)} 
                              target="_blank" 
                              rel="noreferrer"
                              className="w-14 h-14 inline-flex items-center justify-center bg-zinc-950 text-zinc-700 rounded-2xl hover:bg-tad-yellow hover:text-black transition-all border border-white/5 shadow-3xl group/btn active:scale-95"
                              title="Fetch Verified Invoice"
                             >
                               <Receipt className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
                             </a>
                             <button 
                              onClick={() => window.open(getCampaignReportUrl(camp.campaignId), '_blank')}
                              className="w-14 h-14 inline-flex items-center justify-center bg-zinc-950 text-zinc-700 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all border border-white/5 shadow-3xl group/btn active:scale-95"
                               title="Download Fiscal Telemetry"
                             >
                               <FileBarChart className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
                             </button>
                              <button title="Ver detallesNexus" className="w-14 h-14 inline-flex items-center justify-center bg-zinc-950 text-zinc-800 rounded-2xl hover:bg-white hover:text-black transition-all border border-white/5 shadow-3xl group/btn active:scale-95">
                                 <ArrowUpRight className="w-6 h-6" />
                              </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 mt-12">
               <div className="bg-zinc-950/60 p-14 rounded-[4.5rem] border border-white/5 relative group overflow-hidden shadow-3xl">
                  <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-500/10 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  <div className="flex items-center gap-5 mb-8">
                     <div className="p-4 bg-zinc-900 rounded-2xl border border-white/5">
                        <PieChart className="w-6 h-6 text-emerald-500" />
                     </div>
                     <h4 className="text-white font-black text-3xl uppercase italic tracking-tighter italic">Impact ROI Analytics</h4>
                  </div>
                  <p className="text-zinc-500 text-[11px] font-bold leading-relaxed uppercase tracking-[0.2em] mb-12 italic">
                    Nuestra infraestructura de <span className="text-white">DOOH Inteligente</span> garantiza un retorno de inversión auditado por telemetría GPS y logs de reproducción verificados. Liquidación proyectada por impactos únicos reales.
                  </p>
                  <button 
                    onClick={() => window.open(getCampaignExportUrl(), '_blank')}
                    className="flex items-center gap-5 bg-zinc-900 border border-white/5 text-zinc-600 hover:bg-tad-yellow hover:text-black hover:border-transparent px-12 py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.4em] transition-all italic shadow-2xl relative overflow-hidden group/export"
                  >
                     <div className="absolute inset-0 bg-white/5 translate-y-full group-hover/export:translate-y-0 transition-transform duration-700" />
                     <span className="relative z-10 flex items-center gap-4">
                        Protocolo de Exportación Global <Download className="w-5 h-5" />
                     </span>
                  </button>
               </div>
               
               <div className="bg-black/60 p-14 rounded-[4.5rem] border border-white/5 flex flex-col items-center justify-center text-center group shadow-3xl relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 w-48 h-48 bg-tad-yellow/[0.03] blur-[80px]" />
                  <div className="p-8 bg-zinc-900 rounded-[3rem] mb-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000 border border-white/5 shadow-22xl">
                     <ShieldCheck className="w-16 h-16 text-tad-yellow" />
                  </div>
                  <h4 className="text-white font-black text-2xl uppercase tracking-[0.3em] italic mb-4 italic leading-none">Integridad Fiscal v4.2</h4>
                  <p className="text-zinc-800 text-[10px] font-black uppercase tracking-[0.5em] max-w-sm italic">Validación bi-factorial nativa con el clúster de nodos regional DOOH.</p>
               </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .text-shadow-glow {
          text-shadow: 0 0 50px rgba(250, 212, 0, 0.4);
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

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: 'white' | 'yellow' | 'emerald';
  trend?: string;
  large?: boolean;
}

function SummaryCard({ icon, label, value, color, sub, large }: SummaryCardProps) {
   const colorClasses = {
      white: 'bg-white/5 border-white/10 text-white',
      yellow: 'bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow shadow-[0_0_40px_rgba(250,212,0,0.08)]',
      emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
   }[color as 'white' | 'yellow' | 'emerald'] || 'bg-zinc-900 border-white/10 text-zinc-500';

   return (
      <div className="bg-zinc-950/40 backdrop-blur-3xl border border-white/5 p-12 rounded-[4rem] shadow-3xl relative overflow-hidden group hover:border-white/10 transition-all duration-700 animate-in fade-in slide-in-from-bottom-8 fill-mode-both">
         <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] blur-3xl -z-10 group-hover:bg-white/[0.04] transition-colors" />
         <div className={clsx("p-6 rounded-[1.75rem] inline-block mb-10 border transition-all duration-1000 group-hover:scale-110 group-hover:rotate-6 shadow-3xl", colorClasses)}>
            {icon}
         </div>
         <p className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.4em] mb-4 italic">{label}</p>
         <h3 className={clsx("font-black italic tracking-tighter mb-4 leading-none transition-all group-hover:scale-105 origin-left", large ? "text-5xl" : "text-4xl", color === 'yellow' ? 'text-tad-yellow text-shadow-glow' : 'text-white')}>{value}</h3>
         <p className="text-[10px] font-black text-zinc-800 uppercase tracking-widest italic flex items-center gap-3">
            <span className="w-1 h-1 rounded-full bg-zinc-800" />
            {sub}
         </p>
      </div>
   );
}
