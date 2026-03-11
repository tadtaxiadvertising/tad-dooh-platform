import { useEffect, useState } from 'react';
import { getCampaignBilling, getDriverPayroll, getPayrollExportUrl, getCampaignExportUrl, getInvoiceUrl } from '../../services/api';
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
  BarChart3,
  Zap
} from 'lucide-react';
import clsx from 'clsx';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'payroll' | 'campaigns'>('payroll');
  const [payrollData, setPayrollData] = useState<any>(null);
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
        const data = await getDriverPayroll();
        setPayrollData(data);
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

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Control <span className="text-tad-yellow text-shadow-glow">Financiero</span>
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Facturación basada en impresiones reales detectadas por el sistema. No promedios, solo datos.
          </p>
        </div>
        
        <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-white/5 self-start">
          <button 
            onClick={() => setActiveTab('payroll')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'payroll' ? "bg-tad-yellow text-black shadow-lg" : "text-zinc-500 hover:text-white"
            )}
          >
            <Users className="w-4 h-4" />
            Nómina Choferes
          </button>
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'campaigns' ? "bg-tad-yellow text-black shadow-lg" : "text-zinc-500 hover:text-white"
            )}
          >
            <Receipt className="w-4 h-4" />
            Facturación Marcas
          </button>
        </div>
      </div>

      {activeTab === 'payroll' ? (
        <PayrollView data={payrollData} loading={loading} error={error} />
      ) : (
        <CampaignBillingView data={campaignData} loading={loading} error={error} />
      )}
    </div>
  );
}

function PayrollView({ data, loading, error }: any) {
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const result = await (await import('../../services/api')).simulatePayment();
      setSimResult(result.summary);
    } catch (e) {
      alert('Error en simulación');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-8">
      {simResult && (
        <div className="bg-tad-yellow/10 border border-tad-yellow/30 p-6 rounded-3xl animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-tad-yellow font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <Zap className="w-4 h-4" /> Simulación de Pago Masivo
            </h4>
            <button onClick={() => setSimResult(null)} className="text-zinc-500 hover:text-white text-xs font-bold">Cerrar</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-black">Presupuesto</p>
              <p className="text-xl font-black text-white">RD${simResult.totalBudgetRequired.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-black">Choferes Calificados</p>
              <p className="text-xl font-black text-white">{simResult.qualifiedDrivers}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-black">Ads Detectados</p>
              <p className="text-xl font-black text-white">{simResult.totalUniqueAdsPlayed}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-black">Promedio c/u</p>
              <p className="text-xl font-black text-white">RD${simResult.avgPayoutPerDriver.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-[9px] text-zinc-500 mt-4 italic">* Esta es una auditoría basada en eventos de playback reales al momento de la consulta.</p>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          icon={<DollarSign className="text-tad-yellow" />}
          label="Total a Pagar (DOP)"
          value={loading ? '...' : `RD$${(data?.totalPayout || 0).toLocaleString()}`}
          sub={data?.period || 'Periodo Actual'}
        />
        <StatCard 
          icon={<UserCheck className="text-green-400" />}
          label="Taxis Activos"
          value={loading ? '...' : data?.drivers?.filter((d: any) => d.status === 'ACTIVE').length || 0}
          sub="Detectados este mes"
        />
        <div className="flex items-center justify-center p-2">
           <button 
            disabled={simulating}
            onClick={handleSimulate}
            className="w-full flex items-center justify-center gap-2 bg-tad-yellow hover:bg-tad-yellow/90 text-black font-black py-4 px-6 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
           >
            <Zap className={clsx("w-5 h-5", simulating && "animate-spin")} />
            {simulating ? 'Procesando...' : 'Simular Pago'}
           </button>
        </div>
        <div className="flex items-center justify-end">
           <a 
            href={getPayrollExportUrl()}
            className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:border-tad-yellow/50 text-white font-bold py-4 px-8 rounded-2xl transition-all"
           >
            <Download className="w-5 h-5 text-tad-yellow" />
            CSV
           </a>
        </div>
      </div>

      <div className="bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-black/80 border-b border-white/5">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Chofer</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Placa</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Estado</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Ads Únicos</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Plays Mes</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Pago RD$</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <LoadingRows cols={6} />
            ) : data?.drivers?.map((driver: any) => (
              <tr key={driver.driverId} className="hover:bg-zinc-900/50 transition-colors">
                <td className="px-6 py-5">
                  <p className="font-bold text-sm text-white">{driver.fullName}</p>
                  <p className="text-[10px] text-zinc-600 font-mono italic">{driver.phone}</p>
                </td>
                <td className="px-6 py-5 text-sm font-mono text-zinc-400">{driver.taxiPlate}</td>
                <td className="px-6 py-5">
                  <span className={clsx(
                    "px-2 py-1 rounded text-[9px] font-black uppercase",
                    driver.status === 'ACTIVE' ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                  )}>
                    {driver.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-5 text-right font-mono font-bold text-tad-yellow">{driver.uniqueAdsPlayed}</td>
                <td className="px-6 py-5 text-right font-mono font-bold text-zinc-300">{driver.totalPlaysThisMonth}</td>
                <td className="px-6 py-5 text-right font-black text-tad-yellow text-lg">RD${driver.amountToPay}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CampaignBillingView({ data, loading, error }: any) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<Activity className="text-tad-yellow" />}
          label="Impresiones Totales"
          value={loading ? '...' : data.reduce((s: any, c: any) => s + c.totalImpressions, 0).toLocaleString()}
          sub="Auditables"
        />
        <StatCard 
          icon={<Receipt className="text-zinc-400" />}
          label="Revenue Potencial"
          value={loading ? '...' : `RD$${data.reduce((s: any, c: any) => s + c.estimatedRevenue, 0).toLocaleString()}`}
          sub="Basado en CPM/Plays"
        />
        <div className="flex items-center justify-end">
           <a 
            href={getCampaignExportUrl()}
            className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:border-tad-yellow/50 text-white font-bold py-4 px-8 rounded-2xl transition-all"
           >
            <Download className="w-5 h-5 text-tad-yellow" />
            Reporte Ejecutivo CSV
           </a>
        </div>
      </div>

      <div className="bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-black/80 border-b border-white/5">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Campaña</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Taxis</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Estado</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Impresiones Real</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Facturable Est.</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <LoadingRows cols={6} />
            ) : data.map((camp: any) => (
              <tr key={camp.campaignId} className="hover:bg-zinc-900/50 transition-colors">
                <td className="px-6 py-5">
                  <p className="font-bold text-sm text-white uppercase italic">{camp.campaignName}</p>
                </td>
                <td className="px-6 py-5 text-sm text-zinc-400 text-center">{camp.assignedTaxis} unidades</td>
                <td className="px-6 py-5 text-center">
                  <span className="px-2 py-1 bg-tad-yellow/10 text-tad-yellow rounded text-[9px] font-black uppercase">
                    {camp.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-right font-mono font-bold text-white text-base">
                  {camp.totalImpressions.toLocaleString()}
                </td>
                <td className="px-6 py-5 text-right font-black text-tad-yellow text-lg">
                  RD${camp.estimatedRevenue.toFixed(2)}
                </td>
                <td className="px-6 py-5 text-center">
                  <a 
                    href={getInvoiceUrl(camp.campaignId)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[10px] font-black uppercase transition-all"
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
  );
}

function StatCard({ icon, label, value, sub }: any) {
  return (
    <div className="bg-zinc-950/50 backdrop-blur-md border border-white/10 p-6 rounded-3xl relative overflow-hidden group hover:border-tad-yellow/30 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-black rounded-lg border border-white/5">
          {icon}
        </div>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{label}</p>
      </div>
      <h3 className="text-3xl font-black text-white">{value}</h3>
      <p className="text-[10px] text-zinc-500 mt-2 font-mono uppercase tracking-tighter">{sub}</p>
    </div>
  );
}

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {Array(4).fill(0).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array(cols).fill(0).map((_, j) => (
            <td key={j} className="px-6 py-5">
              <div className="h-4 bg-zinc-800 rounded w-2/3" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
