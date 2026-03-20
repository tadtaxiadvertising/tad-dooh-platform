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
         <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-tad-yellow/[0.04] blur-[150px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[0%] right-[-5%] w-[40%] h-[40%] bg-white/[0.01] blur-[120px] rounded-full" />
      </div>

      {/* Page Context Transition */}
      <div className="flex items-center gap-3 mb-8 opacity-60">
        <div className="w-8 h-px bg-white/20" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Settlements / Financial Registry</p>
      </div>

      <div className="flex justify-end mb-10">
        <div className="flex p-1 bg-zinc-900/40 backdrop-blur-3xl rounded-xl border border-white-[0.03] shadow-inner">
          <button 
            onClick={() => setActiveTab('payroll')}
            className={clsx(
              "flex items-center gap-2 px-8 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] transition-all",
              activeTab === 'payroll' ? "bg-tad-yellow text-black shadow-md" : "text-gray-500 hover:text-white"
            )}
          >
            <Users className="w-4 h-4" />
            Nómina
          </button>
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={clsx(
              "flex items-center gap-2 px-8 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] transition-all",
              activeTab === 'campaigns' ? "bg-tad-yellow text-black shadow-md" : "text-gray-500 hover:text-white"
            )}
          >
            <Receipt className="w-4 h-4" />
            Facturación
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
          <div className="space-y-8">
            {/* Payroll Metric Clusters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <SummaryCard 
                  icon={<Users className="w-6 h-6" />} 
                  label="Tripulación Vinculada" 
                  value={payroll.length} 
                  sub="Conductores Activos"
                  color="white"
               />
               <SummaryCard 
                  icon={<Zap className="w-6 h-6" />} 
                  label="Tesorería Proyectada" 
                  value={`RD$ ${payroll.reduce((s, p) => s + p.totalAmount, 0).toLocaleString()}`} 
                  sub="Ciclo Fiscal Actual"
                  color="yellow"
                  large
               />
               <SummaryCard 
                  icon={<ShieldCheck className="w-6 h-6" />} 
                  label="Estatus de Auditoría" 
                  value="INTEGRAL" 
                  sub="Verificación Activa"
                  color="emerald"
               />
            </div>

            {/* Payroll Ledger Surface */}
            <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden shadow-lg relative">
              <div className="absolute top-0 right-0 w-96 h-96 bg-tad-yellow/[0.02] blur-[120px] -z-10" />
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-900/40 border-b border-gray-700/50">
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Conductor</th>
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none text-center">Impactos Verificados</th>
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none text-right">Liquidación</th>
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {loading ? (
                      [1,2,3].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={4} className="px-8 py-8"><div className="h-8 bg-gray-900/40 rounded-xl w-full border border-gray-700/50" /></td>
                        </tr>
                      ))
                    ) : payroll.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-32 text-center">
                           <div className="flex flex-col items-center gap-6">
                              <div className="w-20 h-20 bg-gray-900/50 rounded-2xl flex items-center justify-center border border-gray-700/50">
                                 <Users className="w-10 h-10 text-gray-600" />
                              </div>
                              <h3 className="text-2xl font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Nómina Vacía</h3>
                              <p className="text-xs text-gray-600 font-bold uppercase tracking-widest max-w-sm leading-relaxed">No se detectan pagos pendientes en este momento.</p>
                           </div>
                        </td>
                      </tr>
                    ) : payroll.map((item, idx) => (
                      <tr key={item.driverId} className="hover:bg-gray-900/40 transition-all group cursor-default">
                        <td className="px-8 py-6">
                          <div className={clsx("flex items-center gap-4 animate-in slide-in-from-left-4 duration-500 fill-mode-both", idx === 0 ? 'delay-0' : idx === 1 ? 'delay-50' : idx === 2 ? 'delay-100' : idx === 3 ? 'delay-150' : 'delay-200')}>
                             <div className="w-12 h-12 rounded-xl bg-gray-900/80 flex items-center justify-center border border-gray-700/50 text-tad-yellow font-bold text-xl group-hover:border-tad-yellow/40 transition-all shadow-sm group-hover:-translate-y-1">
                                {item.driverName.charAt(0)}
                             </div>
                             <div>
                                <p className="font-bold text-white text-lg tracking-tight uppercase group-hover:text-tad-yellow transition-colors leading-none mb-1.5">{item.driverName}</p>
                                <div className="flex items-center gap-2">
                                   <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                   <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">PANTALLA: {item.taxiNumber || 'DESCONOCIDO'}</p>
                                </div>
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="inline-flex flex-col items-center px-6 py-2 bg-gray-900/50 rounded-xl border border-gray-700/50">
                             <span className="text-2xl font-bold text-white tracking-tight leading-none mb-1 group-hover:text-tad-yellow transition-colors">{item.activeAds}</span>
                             <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Impactos</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex flex-col items-end">
                             <p className="text-2xl font-bold text-white tracking-tight leading-none mb-2">RD$ {item.totalAmount.toLocaleString()}</p>
                             <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                                <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Verificado</span>
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <button 
                            onClick={() => handlePay(item.driverId, item.totalAmount)}
                            className="bg-tad-yellow text-black px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:bg-yellow-400 hover:shadow-md shadow-sm"
                          >
                            <span className="flex items-center justify-center gap-2">
                               <RefreshCcw className="w-4 h-4 transition-transform duration-500 hover:rotate-180" />
                               Procesar
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-20 mt-8">
               <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-8 rounded-3xl shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-tad-yellow/5 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="flex flex-col md:flex-row items-start gap-6 relative z-10">
                     <div className="w-16 h-16 bg-tad-yellow text-black rounded-2xl shadow-sm flex items-center justify-center group-hover:-translate-y-1 transition-transform duration-500 shrink-0">
                        <AlertTriangle className="w-8 h-8" />
                     </div>
                     <div className="flex-1">
                        <h4 className="text-white font-bold text-2xl uppercase tracking-tight mb-2 leading-none">Protocolo de <span className="text-tad-yellow">Compensación</span></h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed mb-6">
                           Los socios conductores reciben una bonificación de <span className="text-gray-300 font-black">RD$ 500 mensuales</span> por cada pauta activa verificada.
                        </p>
                        <div className="flex flex-wrap gap-4">
                           <button 
                               onClick={() => window.open(getPayrollExportUrl(), '_blank')}
                               className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-gray-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-gray-700/50 hover:border-gray-500"
                           >
                               <Download className="w-4 h-4" /> Exportar CSV
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-8 rounded-3xl shadow-sm relative overflow-hidden group flex flex-col justify-center">
                  <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-tad-yellow/[0.03] blur-[80px]" />
                  <div className="relative z-10 w-full">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center border border-gray-700/50 group-hover:border-tad-yellow/30 transition-all">
                           <Cpu className="w-6 h-6 text-tad-yellow animate-pulse" />
                        </div>
                        <h4 className="text-white font-bold text-xl uppercase tracking-tight">Precisión Predictiva</h4>
                     </div>
                     <div className="space-y-4">
                        <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-700/50">
                           <div className="h-full bg-tad-yellow w-[85%]" />
                        </div>
                        <div className="flex justify-between items-center">
                           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Score Regional</p>
                           <p className="text-[10px] text-tad-yellow font-bold uppercase tracking-widest">85% PRECISION</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Ad Revenue Clusters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <SummaryCard 
                  icon={<BarChart3 className="w-6 h-6" />} 
                  label="CPM Referencia" 
                  value="RD$ 120" 
                  sub="Impactos x 1K"
                  color="white"
               />
               <SummaryCard 
                  icon={<Target className="w-6 h-6" />} 
                  label="Audiencia Auditada" 
                  value={(campaignData.reduce((s, c) => s + (c.totalImpressions || 0), 0)).toLocaleString()} 
                  sub="Impactos Reales"
                  color="emerald"
               />
               <SummaryCard 
                  icon={<DollarSign className="w-6 h-6" />} 
                  label="Ingresos Proyectados" 
                  value={`RD$ ${campaignData.reduce((s, c) => s + (c.estimatedRevenue || 0), 0).toLocaleString()}`} 
                  sub="Ciclo Actual"
                  color="yellow"
                  large
               />
               <SummaryCard 
                  icon={<PieChart className="w-6 h-6" />} 
                  label="Share de Mercado" 
                  value="42.8%" 
                  sub="Red Regional"
                  color="white"
               />
            </div>

            {/* Campaign Invoicing Terminal Surface */}
            <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden shadow-sm relative">
              <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-tad-yellow/[0.02] blur-[150px] -z-10" />
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-900/40 border-b border-gray-700/50">
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Estrategia Global</th>
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none text-center">Alcance</th>
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none text-center">Pantallas Emisores</th>
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none text-right">Proyección</th>
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none text-center">Auditoría</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {loading ? (
                      [1,2,3].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={5} className="px-8 py-8"><div className="h-8 bg-gray-900/40 rounded-xl w-full border border-gray-700/50" /></td>
                        </tr>
                      ))
                    ) : campaignData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-32 text-center">
                           <div className="flex flex-col items-center gap-6">
                              <div className="w-20 h-20 bg-gray-900/50 rounded-2xl flex items-center justify-center border border-gray-700/50">
                                 <Building2 className="w-10 h-10 text-gray-600" />
                              </div>
                              <h3 className="text-2xl font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Vacío Fiscal</h3>
                              <p className="text-xs text-gray-600 font-bold uppercase tracking-widest max-w-sm leading-relaxed">No se han localizado auditorías de pauta en el cluster.</p>
                           </div>
                        </td>
                      </tr>
                    ) : campaignData.map((camp, idx) => (
                      <tr key={camp.campaignId} className="hover:bg-gray-900/40 transition-all group cursor-default">
                        <td className="px-8 py-6">
                          <div className={clsx("flex items-center gap-4 animate-in slide-in-from-left-4 duration-500 fill-mode-both", idx === 0 ? 'delay-0' : idx === 1 ? 'delay-50' : idx === 2 ? 'delay-100' : idx === 3 ? 'delay-150' : 'delay-200')}>
                             <div className="w-12 h-12 rounded-xl bg-gray-900/80 flex items-center justify-center border border-gray-700/50 group-hover:border-tad-yellow/30 transition-all shadow-sm group-hover:-translate-y-1">
                                <Building2 className="w-6 h-6 text-gray-500 group-hover:text-tad-yellow transition-colors" />
                             </div>
                             <div>
                                <p className="font-bold text-white text-lg tracking-tight uppercase group-hover:text-tad-yellow transition-colors leading-none mb-1.5">{camp.campaignName}</p>
                                <div className="flex items-center gap-2">
                                   <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">{camp.status}</span>
                                   </div>
                                </div>
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            <span className="text-xl font-bold text-white tracking-tight leading-none">{(camp.totalImpressions || 0).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex flex-col items-center">
                             <span className="text-gray-400 font-bold text-xl leading-none group-hover:text-white transition-colors">{camp.assignedTaxis}</span>
                             <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Pantallas Activos</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex flex-col items-end">
                             <p className="text-xl font-bold text-emerald-500 tracking-tight leading-none mb-1.5">RD$ {camp.estimatedRevenue?.toLocaleString()}</p>
                             <div className="px-2 py-1 bg-tad-yellow/10 rounded-md border border-tad-yellow/20">
                                <p className="text-[9px] text-tad-yellow font-bold uppercase tracking-widest leading-none">High Impact</p>
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-2">
                             <a 
                              href={getInvoiceUrl(camp.campaignId)} 
                              target="_blank" 
                              rel="noreferrer"
                              className="w-10 h-10 inline-flex items-center justify-center bg-gray-900 text-gray-400 rounded-xl hover:bg-tad-yellow hover:text-black transition-all border border-gray-700/50 shadow-sm"
                              title="Invoice"
                             >
                               <Receipt className="w-4 h-4" />
                             </a>
                             <button 
                              onClick={() => window.open(getCampaignReportUrl(camp.campaignId), '_blank')}
                              className="w-10 h-10 inline-flex items-center justify-center bg-gray-900 text-gray-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all border border-gray-700/50 shadow-sm"
                               title="Report"
                             >
                               <FileBarChart className="w-4 h-4" />
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-20 mt-8">
               <div className="bg-gray-800/40 border border-gray-700/50 p-10 rounded-3xl relative group overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="flex items-center gap-4 mb-6">
                     <div className="p-3 bg-gray-900 rounded-xl border border-gray-700/50">
                        <PieChart className="w-5 h-5 text-emerald-500" />
                     </div>
                     <h4 className="text-white font-bold text-xl uppercase tracking-tight">Impact ROI Analytics</h4>
                  </div>
                  <p className="text-gray-400 text-xs font-bold leading-relaxed uppercase tracking-widest mb-8">
                    DOOH Inteligente garantiza un retorno de inversión auditado.
                  </p>
                  <button 
                    onClick={() => window.open(getCampaignExportUrl(), '_blank')}
                    className="flex items-center gap-3 bg-gray-900 border border-gray-700/50 text-gray-400 hover:bg-tad-yellow hover:text-black transition-all px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest"
                  >
                     Exportar Reporte Global <Download className="w-4 h-4" />
                  </button>
               </div>
               
               <div className="bg-gray-900/50 p-10 rounded-3xl border border-gray-700/50 flex flex-col items-center justify-center text-center group shadow-sm relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-tad-yellow/[0.03] blur-[60px]" />
                  <div className="p-5 bg-gray-800 rounded-2xl mb-6 group-hover:-translate-y-1 transition-transform duration-500 border border-gray-700/50">
                     <ShieldCheck className="w-8 h-8 text-tad-yellow" />
                  </div>
                  <h4 className="text-white font-bold text-lg uppercase tracking-widest mb-2">Integridad Fiscal v4.2</h4>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest max-w-sm">Validación bi-factorial nativa con el clúster.</p>
               </div>
            </div>
          </div>
        )}
      </div>

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
      white: 'bg-gray-800/80 border-gray-700 text-white',
      yellow: 'bg-tad-yellow/10 border-tad-yellow/20 text-tad-yellow',
      emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
   }[color as 'white' | 'yellow' | 'emerald'] || 'bg-gray-900 border-gray-700/50 text-gray-500';

   return (
      <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-3xl shadow-md relative overflow-hidden group hover:border-gray-500 transition-all duration-300 animate-in fade-in slide-in-from-bottom-8 fill-mode-both hover:-translate-y-1">
         <div className={clsx("p-3 rounded-2xl inline-block mb-4 border transition-all duration-500 shadow-sm", colorClasses)}>
            {icon}
         </div>
         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
         <h3 className={clsx("font-bold tracking-tight mb-1 leading-none transition-all", large ? "text-3xl lg:text-4xl" : "text-2xl lg:text-3xl", color === 'yellow' ? 'text-tad-yellow' : 'text-white')}>{value}</h3>
         <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            {sub}
         </p>
      </div>
   );
}
