import { useState, useEffect } from 'react';
import { Briefcase, Search, Plus, Clock, ChevronRight, Globe, Phone, Mail, DollarSign, BarChart3, CheckCircle2, XCircle, TrendingUp, Download } from 'lucide-react';
import clsx from 'clsx';
import { getAdvertisers } from '../../services/api';
import { AdvertiserModal } from '../../components/AdvertiserModal';

export default function AdvertisersPage() {
  const [advertisers, setAdvertisers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadAdvertisers();
  }, []);

  const loadAdvertisers = async () => {
    setLoading(true);
    try {
      const data = await getAdvertisers();
      setAdvertisers(data || []);
    } catch (err) {
      console.error('Error loading advertisers:', err);
      setError('Error al conectar con el CRM de anunciantes.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = advertisers.filter(a => {
    const name = a.companyName || '';
    const contact = a.contactName || '';
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || contact.toLowerCase().includes(search.toLowerCase());
    if (filter === 'active') return matchSearch && a.status === 'ACTIVE';
    if (filter === 'inactive') return matchSearch && a.status === 'INACTIVE';
    return matchSearch;
  });

  const totalRevenue = 0; // Will be calculated from real campaign data later
  const totalActiveCampaigns = 0;

  const downloadCSV = () => {
    const headers = ['Compañía', 'Contacto', 'Email', 'Teléfono', 'Estado'];
    const rows = filtered.map(a => [
      `"${a.companyName}"`,
      `"${a.contactName}"`,
      a.email,
      a.phone,
      a.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_anunciantes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Marcas y <span className="text-tad-yellow text-shadow-glow">Anunciantes</span>
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Base de datos de clientes publicitarios. Gestiona sus campañas activas, genera reportes de rendimiento y administra la facturación mensual.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={downloadCSV}
            className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:border-tad-yellow hover:text-tad-yellow text-white font-bold py-3 px-5 rounded-xl transition-all"
          >
            <Download className="w-5 h-5" />
            Reporte CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="group flex gap-2 items-center bg-tad-yellow hover:bg-yellow-400 text-black font-extrabold py-3 px-6 rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(250,212,0,0.3)]">
            <Plus className="h-5 w-5" />
            Nuevo Anunciante
          </button>
        </div>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Marcas', value: advertisers.length.toString(), icon: Briefcase, color: 'text-white' },
          { label: 'Campañas Activas', value: totalActiveCampaigns.toString(), icon: TrendingUp, color: 'text-tad-yellow' },
          { label: 'Ingresos Acumulados', value: `RD$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400' },
          { label: 'Clientes Activos', value: advertisers.filter(a => a.status === 'ACTIVE').length.toString(), icon: CheckCircle2, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <s.icon className={clsx('w-5 h-5', s.color)} />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{s.label}</span>
            </div>
            <p className={clsx('text-2xl font-black', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por marca o contacto..."
            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-tad-yellow transition-colors"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border',
                filter === f
                  ? 'bg-tad-yellow text-black border-transparent'
                  : 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/20'
              )}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>
      </div>

      {/* Advertisers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(advertiser => (
          <div key={advertiser.id} className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all group cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-tad-yellow/20 to-tad-yellow/5 rounded-xl flex items-center justify-center border border-tad-yellow/20">
                  <span className="text-lg font-black text-tad-yellow">{(advertiser.companyName || 'A').charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-tad-yellow transition-colors">{advertiser.companyName}</p>
                  <p className="text-xs text-zinc-500">{advertiser.contactName}</p>
                </div>
              </div>
              <span className={clsx(
                'text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg',
                advertiser.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
              )}>
                {advertiser.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Mail className="w-3.5 h-3.5 text-zinc-600" />
                {advertiser.email}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Phone className="w-3.5 h-3.5 text-zinc-600" />
                {advertiser.phone}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div>
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">Campañas</p>
                <p className="text-lg font-black text-white">{advertiser.campaigns?.length || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">Ingreso Total</p>
                <p className="text-lg font-black text-emerald-400">RD$0</p>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-tad-yellow transition-colors" />
            </div>
          </div>
        ))}
      </div>

      <AdvertiserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadAdvertisers}
      />
    </div>
  );
}
