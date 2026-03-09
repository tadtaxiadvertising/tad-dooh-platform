import { useEffect, useState } from 'react';
import { getFleetFinance } from '../../services/api';
import { Wallet, CarFront, DollarSign, TrendingUp, Download, Calendar, Activity, CheckCircle, Clock, Zap, UserCheck, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface DeviceFinance {
  device_id: string;
  display_name: string;
  city: string;
  status: 'online' | 'offline';
  ads_played: number;
  revenue: number;
  driver: { name: string; phone: string; status: string } | null;
  subscription: { plan: string; amount: number; status: string; due_date: string; paid: boolean } | null;
}

interface FinanceData {
  period: string;
  rate_per_ad: number;
  total_revenue: number;
  total_ads_played: number;
  devices: DeviceFinance[];
}

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getFleetFinance()
      .then((finData: FinanceData) => setData(finData))
      .catch((err) => {
        console.error('Finance load error:', err);
        setError('Error cargando datos financieros');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleExportCSV = () => {
    if (!data || data.devices.length === 0) return;

    const headers = ['Dispositivo', 'Chofer', 'Ciudad', 'Estado', 'Anuncios', 'Ingresos (RD$)', 'Plan', 'Suscripción'];
    const rows = data.devices.map(d => [
      d.display_name,
      d.driver?.name || 'Sin asignar',
      d.city,
      d.status,
      d.ads_played,
      d.revenue.toFixed(2),
      d.subscription?.plan || 'N/A',
      d.subscription?.status || 'N/A',
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tad-finance-${data.period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Ingresos y <span className="text-tad-yellow text-shadow-glow">Pagos</span>
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Panel financiero basado en reproducciones reales de la flota. Los datos provienen de la tabla <code className="text-tad-yellow/70">playback_events</code>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="group relative flex items-center justify-center gap-2 bg-zinc-900 border border-white/10 hover:border-tad-yellow/50 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95 shadow-lg"
          >
            <Download className="w-5 h-5 text-zinc-400 group-hover:text-tad-yellow transition-colors" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-zinc-950/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl relative overflow-hidden group hover:border-tad-yellow/30 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-tad-yellow/10 blur-[30px] rounded-full group-hover:bg-tad-yellow/20 transition-all" />
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
            <Wallet className="w-3 h-3 text-tad-yellow" /> Ingresos del Periodo
          </p>
          <h3 className="text-4xl font-black text-white">
            {loading ? '...' : `RD$${(data?.total_revenue || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}`}
          </h3>
          <p className="text-xs text-zinc-500 mt-2 font-mono">{data?.period || '--'}</p>
        </div>

        <div className="bg-zinc-950/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
            <Clock className="w-3 h-3 text-zinc-400" /> Anuncios Reproducidos
          </p>
          <h3 className="text-3xl font-black text-white">
            {loading ? '...' : (data?.total_ads_played || 0).toLocaleString('es-DO')} <span className="text-lg text-zinc-600">plays</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-2 font-mono">Datos reales de playback_events</p>
        </div>

        <div className="bg-zinc-950/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
            <Activity className="w-3 h-3 text-tad-yellow" /> Tarifa por Ad
          </p>
          <h3 className="text-3xl font-black text-tad-yellow">RD${data?.rate_per_ad?.toFixed(2) || '1.25'}</h3>
          <p className="text-xs text-zinc-500 mt-2 font-mono">Por reproducción de 30s</p>
        </div>

        <div className="bg-zinc-950/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
            <CarFront className="w-3 h-3 text-zinc-400" /> Dispositivos
          </p>
          <h3 className="text-3xl font-black text-white">
            {loading ? '...' : data?.devices?.length || 0} <span className="text-lg text-zinc-600">taxis</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-2 font-mono">En la red</p>
        </div>
      </div>

      {/* Fleet Revenue Breakdown Table */}
      <div className="bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/40">
          <h3 className="text-lg font-bold text-white uppercase tracking-tight">Libro Mayor de la Flota</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Periodo:</span>
            <span className="text-xs bg-black px-3 py-1.5 rounded-lg font-mono border border-white/10">{data?.period || '--'}</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/50 border-b border-white/5">
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Unidad</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Chofer</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Anuncios</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Ingresos</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Suscripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 w-32 bg-zinc-800 rounded" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-24 bg-zinc-800 rounded" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-16 bg-zinc-800 rounded" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-12 bg-zinc-800 rounded ml-auto" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-20 bg-zinc-800 rounded ml-auto" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-24 bg-zinc-800 rounded mx-auto" /></td>
                  </tr>
                ))
              ) : data && data.devices.length > 0 ? (
                data.devices.map((device, idx) => {
                  const isOnline = device.status === 'online';
                  const subStatus = device.subscription?.status || 'NONE';

                  return (
                    <tr key={device.device_id || idx} className="hover:bg-zinc-900/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={clsx("p-2 rounded-lg border", isOnline ? "bg-tad-yellow/10 border-tad-yellow/30 text-tad-yellow" : "bg-black border-white/10 text-zinc-600")}>
                            <CarFront className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-white">{device.display_name}</p>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{device.city}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {device.driver ? (
                          <div>
                            <p className="text-sm text-white font-medium flex items-center gap-1.5">
                              <UserCheck className="w-3 h-3 text-tad-yellow" />
                              {device.driver.name}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{device.driver.phone}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-600 italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <span className={clsx(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest uppercase border",
                          isOnline ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-zinc-800 text-zinc-500 border-white/5"
                        )}>
                          <span className={clsx("w-1.5 h-1.5 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-zinc-600")} />
                          {isOnline ? 'En Línea' : 'Offline'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="text-sm font-bold font-mono text-zinc-300">{device.ads_played.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="text-base font-black text-tad-yellow">RD${device.revenue.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className={clsx(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block",
                          subStatus === 'ACTIVE' ? "bg-green-500/20 text-green-400" :
                          subStatus === 'EXPIRED' ? "bg-red-500/20 text-red-400" :
                          subStatus === 'SUSPENDED' ? "bg-orange-500/20 text-orange-400" :
                          "bg-zinc-800 text-zinc-500"
                        )}>
                          {subStatus === 'ACTIVE' ? 'Activa' :
                           subStatus === 'EXPIRED' ? 'Vencida' :
                           subStatus === 'SUSPENDED' ? 'Suspendida' :
                           'Sin Plan'}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    <Wallet className="w-12 h-12 text-zinc-700 mx-auto mb-3 opacity-50" />
                    <p className="font-bold">No hay datos de flota para este periodo.</p>
                    <p className="text-xs mt-1">Los datos aparecerán cuando las tablets envíen playback events.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
