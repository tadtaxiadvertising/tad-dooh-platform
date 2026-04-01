import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getCampaignBilling, getAutoPayroll, processPayrollPayment, getFinancialSummary, getFinancialLedger, downloadPayrollCsv, downloadCampaignReport, openInvoiceHtml } from '../../services/api';
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
  PieChart,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useTabSync } from '../../hooks/useTabSync';
import { notifyChange } from '../../lib/sync-channel';
import { AntigravityButton } from '../../components/ui/AntigravityButton';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'payroll' | 'campaigns' | 'ledger'>('payroll');
  const [payroll, setPayroll] = useState<{ driverId: string; driverName: string; taxiNumber?: string; activeAds: number; totalAmount: number }[]>([]);
  const [campaignData, setCampaignData] = useState<{ campaignId: string; campaignName: string; assignedTaxis: number; status: string; estimatedRevenue: number; totalImpressions?: number }[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Carga paralela robusta
      const results = await Promise.allSettled([
        getFinancialSummary(),
        activeTab === 'payroll' ? getAutoPayroll() :
        activeTab === 'campaigns' ? getCampaignBilling() :
        getFinancialLedger()
      ]);

      // Procesar resumen (Crítico para cards)
      if (results[0].status === 'fulfilled') {
        setSummary(results[0].value);
      } else {
        console.warn('Resumen financiero no disponible:', results[0].reason);
      }

      // Procesar datos de pestaña
      if (results[1].status === 'fulfilled') {
        const data = results[1].value || [];
        if (activeTab === 'payroll') setPayroll(data);
        else if (activeTab === 'campaigns') setCampaignData(data);
        else setLedger(data);
      } else {
        console.error(`Fallo al cargar datos de ${activeTab}:`, results[1].reason);
        setError(`INTERRUPCIÓN EN DATOS DE ${activeTab.toUpperCase()}.`);
      }

    } catch (err) {
      console.error('Finance load fatal error:', err);
      setError('COLAPSO TOTAL DE ENLACE FISCAL.');
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
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Settlements / Financial Registry v5.2</p>
      </div>

      <div className="flex justify-between items-center mb-10">
        <div className="flex p-1 bg-zinc-900/40 backdrop-blur-3xl rounded-xl border border-white-[0.03] shadow-inner">
          <button 
            onClick={() => setActiveTab('payroll')}
            className={clsx(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] transition-all",
              activeTab === 'payroll' ? "bg-tad-yellow text-black shadow-md" : "text-gray-500 hover:text-white"
            )}
          >
            <Users className="w-4 h-4" />
            Nómina
          </button>
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={clsx(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] transition-all",
              activeTab === 'campaigns' ? "bg-tad-yellow text-black shadow-md" : "text-gray-500 hover:text-white"
            )}
          >
            <Receipt className="w-4 h-4" />
            Facturación
          </button>
          <button 
            onClick={() => setActiveTab('ledger')}
            className={clsx(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] transition-all",
              activeTab === 'ledger' ? "bg-tad-yellow text-black shadow-md" : "text-gray-500 hover:text-white"
            )}
          >
            <PieChart className="w-4 h-4" />
            Libro Mayor
          </button>
        </div>

        <div className="flex items-center gap-4">
          <Link 
              href="/finance/exports"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all bg-gray-900 border border-gray-700 text-gray-400 hover:text-white hover:border-tad-yellow"
          >
            <FileBarChart className="w-4 h-4" /> Centro de Exportación
          </Link>
          <AntigravityButton
            actionName="new_transaction"
            variant="secondary"
            onClick={() => alert('Consola de Registro Rápido: Use el comando de voz o el terminal de Inteligencia Financiera.')}
          >
            <RefreshCcw className="w-4 h-4" />
            Nuevo Registro
          </AntigravityButton>
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

      {/* Global Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <SummaryCard 
          icon={<DollarSign className="w-6 h-6" />} 
          label="MRR Proyectado" 
          value={`RD$ ${summary?.mrr?.toLocaleString() || '0'}`} 
          sub={`${summary?.activeSubscribers || 0} Suscriptores`}
          color="yellow"
          large
        />
        <SummaryCard 
          icon={<TrendingUp className="w-6 h-6" />} 
          label="Ingresos (Impactos)" 
          value={`RD$ ${campaignData.reduce((s, c) => s + (c.estimatedRevenue || 0), 0).toLocaleString()}`} 
          sub="Facturación Publicitaria"
          color="emerald"
        />
        <SummaryCard 
          icon={<Activity className="w-6 h-6" />} 
          label="Burn Rate" 
          value={`RD$ ${summary?.burnRate?.toLocaleString() || '0'}`} 
          sub="Egresos Mensuales"
          color="white"
        />
        <SummaryCard 
          icon={<Target className="w-6 h-6" />} 
          label="Neto Estimado" 
          value={`RD$ ${summary?.netProjection?.toLocaleString() || '0'}`} 
          sub="EBITDA Proyectado"
          color="white"
        />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000 fill-mode-both">
        {activeTab === 'payroll' ? (
          <div className="space-y-8">
            {/* Payroll Ledger Surface */}
            <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden shadow-lg relative">
              <div className="absolute top-0 right-0 w-96 h-96 bg-tad-yellow/[0.02] blur-[120px] -z-10" />
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-900/40 border-b border-gray-700/50">
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">TAD DRIVER</th>
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none text-center">Impactos Verificados</th>
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none text-right">Liquidación</th>
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {loading && payroll.length === 0 ? (
                      [1,2,3,4,5].map((_, i) => (
                        <tr key={i} className="animate-pulse border-b border-white/[0.02]">
                          <td className="px-8 py-6"><div className="h-10 bg-white/5 rounded-xl w-48" /></td>
                          <td className="px-8 py-6"><div className="h-12 bg-white/5 rounded-2xl w-24 mx-auto" /></td>
                          <td className="px-8 py-6 text-right"><div className="h-10 bg-white/5 rounded-xl w-32 ml-auto" /></td>
                          <td className="px-8 py-6 text-center"><div className="h-12 bg-white/5 rounded-[1.5rem] w-32 mx-auto" /></td>
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
                      <tr key={item.driverId} className="hover:bg-white/[0.02] transition-all group cursor-pointer border-b border-white/[0.02] last:border-0 relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-tad-yellow scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500" />
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
                          <div className="flex items-center gap-2">
                            <AntigravityButton
                              actionName="process_payment"
                              critical={true}
                              variant="primary"
                              className="flex-1"
                              onAsyncClick={() => handlePay(item.driverId, item.totalAmount)}
                            >
                              <RefreshCcw className="w-4 h-4" />
                              Liquidar
                            </AntigravityButton>
                            
                            <button 
                              onClick={async () => {
                                const loadingToast = toast.loading("Enviando comprobante WhatsApp...");
                                try {
                                  const { sendDriverPaymentWhatsApp } = await import('../../services/api');
                                  await sendDriverPaymentWhatsApp({ 
                                    phone: (item as any).driverPhone || '', 
                                    driverName: item.driverName, 
                                    amount: item.totalAmount, 
                                    month: format(new Date(), 'MMMM yyyy', { locale: es })
                                  });
                                  toast.success("✅ Notificado exitosamente", { id: loadingToast });
                                } catch (err: any) {
                                  toast.error("❌ Fallo: " + err.message, { id: loadingToast });
                                }
                              }}
                              title="Notificar por WhatsApp"
                              className="w-12 h-12 flex items-center justify-center bg-gray-900 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-xl transition-all shadow-sm group/was"
                            >
                               <MessageSquare className="w-5 h-5 group-hover/was:scale-110 transition-transform" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'campaigns' ? (
          <div className="space-y-8">
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
                    {loading && campaignData.length === 0 ? (
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
                      <tr key={camp.campaignId} className="hover:bg-white/[0.02] transition-all group cursor-pointer border-b border-white/[0.02] last:border-0 relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-tad-yellow scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500" />
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
                             <button 
                              onClick={() => openInvoiceHtml(camp.campaignId)}
                              className="w-10 h-10 inline-flex items-center justify-center bg-gray-900 text-gray-400 rounded-xl hover:bg-tad-yellow hover:text-black transition-all border border-gray-700/50 shadow-sm"
                              title="Invoice"
                             >
                               <Receipt className="w-4 h-4" />
                             </button>
                             <button 
                              onClick={() => downloadCampaignReport(camp.campaignId)}
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
          </div>
        ) : (
          <div className="space-y-8">
            {/* Ledger Terminal Surface */}
            <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden shadow-lg relative">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-900/40 border-b border-gray-700/50">
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Fecha / Referencia</th>
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none text-center">Categoría</th>
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none text-right">Bruto</th>
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none text-right">ITBIS (18%)</th>
                      <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none text-right">Neto Liquidez</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {loading && ledger.length === 0 ? (
                      [1,2,3].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={5} className="px-8 py-8"><div className="h-8 bg-gray-900/40 rounded-xl w-full border border-gray-700/50" /></td>
                        </tr>
                      ))
                    ) : ledger.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-32 text-center">
                           <div className="flex flex-col items-center gap-6">
                              <div className="w-20 h-20 bg-gray-900/50 rounded-2xl flex items-center justify-center border border-gray-700/50">
                                 <Receipt className="w-10 h-10 text-gray-600" />
                              </div>
                              <h3 className="text-2xl font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Libro Mayor Vacío</h3>
                              <p className="text-xs text-gray-600 font-bold uppercase tracking-widest max-w-sm leading-relaxed">No se han registrado movimientos de flujo de caja.</p>
                           </div>
                        </td>
                      </tr>
                    ) : ledger.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-gray-900/40 transition-all group">
                        <td className="px-8 py-6">
                           <div>
                              <p className="text-white font-bold text-xs uppercase tracking-widest mb-1">{new Date(item.createdAt).toLocaleDateString()}</p>
                              <p className="text-[10px] text-gray-500 font-mono uppercase truncate max-w-[150px]">{item.reference || 'SIN_HASH'}</p>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                           <span className={clsx(
                             "px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest",
                             item.type === 'INCOMING' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                           )}>
                             {item.category}
                           </span>
                        </td>
                        <td className="px-8 py-6 text-right font-bold text-white">RD$ {item.amount.toLocaleString()}</td>
                        <td className="px-8 py-6 text-right text-gray-400 font-bold">RD$ {item.taxAmount.toLocaleString()}</td>
                        <td className={clsx("px-8 py-6 text-right font-black", item.type === 'INCOMING' ? "text-emerald-500" : "text-rose-500")}>
                           {item.type === 'INCOMING' ? '+' : '-'} RD$ {item.netAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-20 mt-8">
        <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-8 rounded-3xl shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-tad-yellow/5 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="flex flex-col md:flex-row items-start gap-6 relative z-10">
                <div className="w-16 h-16 bg-tad-yellow text-black rounded-2xl shadow-sm flex items-center justify-center group-hover:-translate-y-1 transition-transform duration-500 shrink-0">
                  <PieChart className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-bold text-2xl uppercase tracking-tight mb-2 leading-none">Módulo de <span className="text-tad-yellow">Inteligencia Financiera</span></h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed mb-6">
                    Auditoría en tiempo real bajo cumplimiento fiscal de Rep. Dom. <span className="text-gray-300 font-black">(ITBIS 18%)</span>.
                  </p>
                  <div className="flex flex-wrap gap-4">
                      <button 
                          onClick={() => downloadPayrollCsv()}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-gray-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-gray-700/50 hover:border-gray-500"
                      >
                          <Download className="w-4 h-4" /> Exportar Ledger
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
                  <h4 className="text-white font-bold text-xl uppercase tracking-tight">Análisis de Liquidez</h4>
                </div>
                <div className="space-y-4">
                  <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-700/50">
                      <div 
                        ref={(el) => {
                          if (el) {
                            const pct = Math.min(100, (summary?.netProjection > 0 ? 85 : 15));
                            el.style.width = `${pct}%`;
                          }
                        }}
                        className="h-full bg-emerald-500 transition-all duration-1000" 
                      />
                  </div>
                  <div className="flex justify-between items-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Ratio Operativo</p>
                      <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">SALUDABLE</p>
                  </div>
                </div>
            </div>
        </div>
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
