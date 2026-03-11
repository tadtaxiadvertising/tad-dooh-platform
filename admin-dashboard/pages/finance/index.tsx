import { useEffect, useState } from 'react';
import { getCampaignBilling, getAutoPayroll, processPayrollPayment, getInvoiceUrl } from '../../services/api';
import { 
  Wallet, 
  CarFront, 
  DollarSign, 
  Download, 
  Calendar, 
  Activity, 
  UserCheck, 
  AlertTriangle,
  Receipt,
  Users,
  Zap,
  Search
} from 'lucide-react';
import clsx from 'clsx';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'payroll' | 'campaigns'>('payroll');
  const [payroll, setPayroll] = useState<any[]>([]);
  const [campaignData, setCampaignData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'payroll') {
        const data = await getAutoPayroll();
        setPayroll(data);
      } else {
        const data = await getCampaignBilling();
        setCampaignData(data);
      }
    } catch (err) {
      console.error('Finance load error:', err);
      setError('Error cargando datos financieros del servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (driverId: string, amount: number) => {
    const ref = window.prompt(`Confirmar pago de RD$${amount.toLocaleString()}. Ingrese Ref. de Transferencia:`);
    if (ref) {
      try {
        const now = new Date();
        await processPayrollPayment({ 
          driverId, 
          month: now.getMonth() + 1, 
          year: now.getFullYear(),
          reference: ref 
        });
        alert('Pago registrado exitosamente.');
        loadData();
      } catch (err) {
        alert('Error registrando el pago. Es posible que el chofer ya haya sido liquidado este mes.');
      }
    }
  };

  return (
    <div className="animate-in fade-in duration-700 min-h-screen pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Gestión <span className="text-tad-yellow text-shadow-glow">Económica</span>
          </h1>
          <p className="text-zinc-500 font-medium">Control de nómina de choferes y facturación a marcas.</p>
        </div>
        
        <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-white/5 self-start">
          <button 
            onClick={() => setActiveTab('payroll')}
            className={clsx(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'payroll' ? "bg-tad-yellow text-black shadow-lg" : "text-zinc-500 hover:text-white"
            )}
          >
            <Users className="w-4 h-4" />
            Nómina Choferes
          </button>
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={clsx(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'campaigns' ? "bg-tad-yellow text-black shadow-lg" : "text-zinc-500 hover:text-white"
            )}
          >
            <Receipt className="w-4 h-4" />
            Facturación Marcas
          </button>
        </div>
      </div>

      {activeTab === 'payroll' ? (
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/5">
            <table className="w-full text-left border-collapse">
              <thead className="bg-black/40 border-b border-white/5">
                <tr className="text-tad-yellow">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">Chofer / Unidad</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-center">Anuncios Activos</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-right">Monto a Liquidar</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="px-8 py-6"><div className="h-4 bg-zinc-900 rounded w-full" /></td>
                    </tr>
                  ))
                ) : payroll.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-zinc-500 italic">No hay datos de nómina disponibles.</td>
                  </tr>
                ) : payroll.map((item) => (
                  <tr key={item.driverId} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="font-bold text-white text-base">{item.driverName}</p>
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter">Taxi No. {item.taxiNumber || 'N/A'}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="inline-flex items-center justify-center h-8 w-12 bg-zinc-900 border border-white/5 rounded-lg text-sm font-black text-white group-hover:border-tad-yellow/30 transition-colors">
                        {item.activeAds}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="text-xl font-black text-white">RD$ {item.totalAmount.toLocaleString()}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Liquidación Mensual</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <button 
                        onClick={() => handlePay(item.driverId, item.totalAmount)}
                        className="bg-tad-yellow text-black px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 transition-all shadow-lg active:scale-95 flex items-center gap-2 mx-auto"
                      >
                        <Zap className="w-3 h-3" />
                        Pagar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-start gap-4 bg-tad-yellow/5 border border-tad-yellow/20 p-6 rounded-3xl">
            <div className="p-2 bg-tad-yellow/10 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-tad-yellow" />
            </div>
            <div>
              <p className="text-xs font-bold text-white mb-1 uppercase tracking-wider">Regla de Negocio: Liquidación RD$500</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed uppercase tracking-tighter">
                Cada chofer recibe RD$500 mensuales por cada anuncio activo en el sistema. El cálculo se realiza cruzando las campañas con estado <span className="text-tad-yellow">"ACTIVE"</span> vinculadas al dispositivo del taxi. Solo se permite un pago por mes calendario para evitar duplicidades de tesorería.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/5">
            <table className="w-full text-left border-collapse">
              <thead className="bg-black/40 border-b border-white/5">
                <tr className="text-tad-yellow">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">Marca / Campaña</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-center">Unidades</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-center">Estado</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-right">Monto Estimado</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-8 py-6"><div className="h-4 bg-zinc-900 rounded w-full" /></td>
                    </tr>
                  ))
                ) : campaignData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-zinc-500 italic">No hay campañas registradas para facturación.</td>
                  </tr>
                ) : campaignData.map((camp) => (
                  <tr key={camp.campaignId} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="font-bold text-white text-base uppercase italic">{camp.campaignName}</p>
                    </td>
                    <td className="px-8 py-6 text-center text-zinc-400 font-bold text-sm">
                      {camp.assignedTaxis} Taxis
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="px-3 py-1 bg-white/5 text-zinc-400 rounded-full text-[9px] font-black uppercase border border-white/5">
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="text-xl font-black text-tad-yellow">RD$ {camp.estimatedRevenue.toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <a 
                        href={getInvoiceUrl(camp.campaignId)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-zinc-800 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight hover:bg-zinc-700 transition-all border border-white/5"
                       >
                         <Receipt className="w-3 h-3 text-tad-yellow" />
                         Factura
                       </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
