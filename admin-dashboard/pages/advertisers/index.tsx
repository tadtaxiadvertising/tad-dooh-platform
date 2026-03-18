import { useState, useEffect, useCallback } from 'react';
import { Search, Phone, Mail, DollarSign, TrendingUp, Building2, Activity, UserPlus, FileSpreadsheet, Zap, Shield, Briefcase, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { getAdvertisers } from '../../services/api';
import { AdvertiserModal } from '../../components/AdvertiserModal';
import { useTabSync } from '../../hooks/useTabSync';
import { notifyChange } from '../../lib/sync-channel';

export default function AdvertisersPage() {
  const [advertisers, setAdvertisers] = useState<{ 
    id: string; 
    companyName: string; 
    contactName?: string; 
    email?: string; 
    phone?: string; 
    status: string; 
    campaigns?: { id: string; status: string; budget?: number }[] 
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadAdvertisers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdvertisers();
      setAdvertisers(data || []);
    } catch (err) {
      console.error('Error loading advertisers:', err);
      setError('ERROR DE ENLACE CON EL CRM DE SOCIOS COMERCIALES.');
    } finally {
      setLoading(false);
    }
  }, []);

  useTabSync('ADVERTISERS', loadAdvertisers);
  useTabSync('CAMPAIGNS', loadAdvertisers);

  useEffect(() => {
    loadAdvertisers();
  }, [loadAdvertisers]);

  const filtered = advertisers.filter(a => {
    const name = a.companyName || '';
    const contact = a.contactName || '';
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || contact.toLowerCase().includes(search.toLowerCase());
    if (filter === 'active') return matchSearch && a.status === 'ACTIVE';
    if (filter === 'inactive') return matchSearch && a.status === 'INACTIVE';
    return matchSearch;
  });

  const totalRevenue = advertisers.reduce((sum, a) => {
    const campaignRevenue = (a.campaigns)?.reduce((s, c) => s + (c.budget || 0), 0) || 0;
    return sum + campaignRevenue;
  }, 0);
  
  const totalActiveCampaigns = advertisers.reduce((sum, a) => {
    return sum + ((a.campaigns)?.filter(c => c.status === 'ACTIVE').length || 0);
  }, 0);

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
    link.setAttribute("download", `CRM_TAD_EXPORT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                <Briefcase className="w-7 h-7 text-black" />
             </div>
             <div>
                <div className="flex items-center gap-3 mb-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow shadow-[0_0_8px_rgba(255,212,0,0.8)] animate-pulse" />
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Integrated Partner Network v4.2</p>
                </div>
                <h1 className="text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none font-display">
                  Strategic <span className="text-tad-yellow transition-all duration-700 hover:text-white cursor-default italic">Partners</span>
                </h1>
             </div>
          </div>
          <p className="text-zinc-500 max-w-2xl text-[12px] font-bold uppercase tracking-widest leading-relaxed">
            Manage <span className="text-white">corporate accounts</span> and advertising assets.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-900/10 backdrop-blur-3xl p-1.5 rounded-full border border-white/5">
           <button 
             onClick={downloadCSV}
             className="btn-pill px-8 border border-white/5 text-zinc-400 hover:bg-white/5 flex items-center gap-3"
           >
             <FileSpreadsheet className="h-4 w-4" />
             Export_CRM
           </button>
           <button 
             onClick={() => setIsModalOpen(true)}
             className="btn-primary px-10 h-14 flex items-center gap-4"
           >
             <UserPlus className="h-6 w-6" />
             Add_Socio
           </button>
        </div>
      </div>

      {error && (
        <div className="mb-12 p-8 bg-rose-500/10 border border-rose-500/30 rounded-[3rem] flex items-center gap-6 text-rose-500 animate-in zoom-in duration-700 shadow-3xl">
           <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center animate-pulse">
              <Activity className="w-6 h-6" />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-1 italic">Protocolo de Error Detectado</p>
              <p className="text-sm font-black uppercase tracking-tight italic">{error}</p>
           </div>
        </div>
      )}

      {/* Fiscal Metrics Cluster */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        {[
          { label: 'Cartera de Marcas', value: advertisers.length, icon: Building2, color: 'text-white', sub: 'Registros Únicos' },
          { label: 'Pauta Activa', value: totalActiveCampaigns, icon: TrendingUp, color: 'text-tad-yellow', sub: 'Campañas en Vivo' },
          { label: 'Inversión Retenida', value: `RD$ ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500', sub: 'Valor Total Bruto' },
          { label: 'Lifetime Value', value: advertisers.length > 0 ? `RD$ ${(totalRevenue / advertisers.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '0', icon: Zap, color: 'text-blue-500', sub: 'Promedio por Cuenta' },
        ].map((stat, i) => (
          <div 
            key={i} 
            className={clsx(
              "bg-zinc-950/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem] group hover:border-white/10 transition-all duration-700 relative overflow-hidden flex flex-col justify-between h-full shadow-2xl animate-in fade-in slide-in-from-bottom-6 fill-mode-both",
              `[animation-delay:${i * 100}ms]`
            )}
          >
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.01] blur-[100px] -z-10 group-hover:bg-white/[0.02] transition-colors" />
              <div className="flex justify-between items-start mb-8">
                 <div className={clsx("p-5 rounded-2xl border border-white/5 bg-white/[0.02] transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-3xl", stat.color)}>
                    <stat.icon className="w-7 h-7" />
                 </div>
                 <div className="h-3 w-3 rounded-full bg-zinc-800" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em] mb-2 italic">{stat.label}</p>
                 <h3 className={clsx("text-4xl font-black italic tracking-tighter leading-none transition-colors", stat.color)}>{stat.value}</h3>
                 <p className="text-[9px] font-black text-zinc-800 uppercase tracking-widest mt-4 italic">{stat.sub}</p>
              </div>
          </div>
        ))}
      </div>

      {/* Search & Filtration Nexus */}
      <div className="relative mb-16 group animate-in slide-in-from-top-12 duration-1000">
          <div className="absolute inset-0 bg-tad-yellow/5 blur-[120px] opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex flex-col xl:flex-row gap-8 p-2 bg-zinc-900/10 border border-white/5 backdrop-blur-3xl rounded-full shadow-3xl">
            <div className="relative flex-1 group">
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-tad-yellow transition-colors" />
              <input 
                type="text" 
                placeholder="PROBE PARTNER MANIFEST..."
                className="w-full bg-transparent border-none py-6 pl-16 pr-8 text-[11px] font-black uppercase tracking-[0.3em] text-white outline-none placeholder:text-zinc-800 italic"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex p-1 bg-zinc-900/40 rounded-full border border-white/5 shadow-22xl">
              {(['all', 'active', 'inactive'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx(
                    "px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all italic",
                    filter === f 
                      ? "bg-tad-yellow text-black shadow-3xl shadow-tad-yellow/10 scale-105" 
                      : "text-zinc-600 hover:text-white hover:bg-white/5"
                  )}
                >
                  {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Legacy'}
                </button>
              ))}
            </div>
          </div>
      </div>

      {/* Advertisers Grid Surface */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
        {loading ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="h-96 bg-zinc-900/10 backdrop-blur-3xl animate-pulse rounded-[4rem] border border-white/5" />)
        ) : filtered.length > 0 ? (
          filtered.map((advertiser, idx) => {
            const totalSpend = (advertiser.campaigns)?.reduce((s, c) => s + (c.budget || 0), 0) || 0;
            const activeCount = (advertiser.campaigns)?.filter(c => c.status === 'ACTIVE').length || 0;

            return (
              <div 
                key={advertiser.id} 
                className={clsx(
                  "group relative bg-zinc-950/60 backdrop-blur-3xl border border-white/5 rounded-[4rem] p-12 hover:border-tad-yellow/40 transition-all duration-1000 hover:shadow-3xl flex flex-col animate-in fade-in slide-in-from-bottom-12 fill-mode-both",
                  `[animation-delay:${idx * 50}ms]`
                )}
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-tad-yellow/[0.02] blur-[120px] -z-10 group-hover:bg-tad-yellow/[0.08] transition-all duration-1000" />
                
                <div className="flex items-start justify-between mb-10">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-tad-yellow/20 to-black rounded-[2rem] flex items-center justify-center border border-tad-yellow/10 shadow-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 relative overflow-hidden">
                       <div className="absolute inset-0 bg-tad-yellow/5 animate-pulse" />
                       <span className="text-3xl font-black text-tad-yellow italic relative z-10">{(advertiser.companyName || 'A').charAt(0)}</span>
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none mb-3 group-hover:text-tad-yellow transition-colors">{advertiser.companyName}</h4>
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-black/40 rounded-full border border-white/5">
                         <Shield className="w-3.5 h-3.5 text-zinc-700" />
                         <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em] italic">REG_ACCOUNT_v4</p>
                      </div>
                    </div>
                  </div>
                  <div className={clsx(
                    "px-5 py-2 rounded-2xl border text-[9px] font-black uppercase italic tracking-[0.3em] transition-all shadow-3xl",
                    advertiser.status === 'ACTIVE' 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5' 
                      : 'bg-zinc-950 text-zinc-700 border-white/5'
                  )}>
                    {advertiser.status === 'ACTIVE' ? 'Operativo' : 'Legacy'}
                  </div>
                </div>

                <div className="space-y-6 mb-12 bg-black/40 p-8 rounded-[3rem] border border-white/5 group-hover:bg-black/60 transition-colors">
                  {[
                    { icon: Mail, value: advertiser.email || 'VOID_ENTRY' },
                    { icon: Phone, value: advertiser.phone || 'VOID_ENTRY' },
                    { icon: TrendingUp, value: advertiser.contactName || 'UNNAMED_CONTACT' }
                  ].map((info, ii) => (
                    <div key={ii} className="flex items-center gap-5 text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] italic group-hover:text-zinc-400 transition-colors">
                      <info.icon className="w-4 h-4 text-tad-yellow shrink-0" />
                      <span className="truncate">{info.value}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-8 pt-10 border-t border-white/5 mt-auto relative items-center">
                  <div>
                    <p className="text-[9px] text-zinc-800 font-black uppercase tracking-[0.4em] mb-3 italic">Pautas Cluster</p>
                    <div className="flex items-center gap-4">
                       <h5 className="text-3xl font-black text-white italic leading-none">{advertiser.campaigns?.length || 0}</h5>
                       {activeCount > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_#10b981]" />}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-zinc-800 font-black uppercase tracking-[0.4em] mb-3 italic">Fiscal Val.</p>
                    <h5 className="text-2xl font-black text-emerald-500 italic leading-none truncate">RD$ {totalSpend.toLocaleString()}</h5>
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-[1.25rem] bg-zinc-950 border border-white/5 flex items-center justify-center group-hover:bg-tad-yellow group-hover:text-black transition-all duration-500 shadow-3xl hover:scale-110">
                     <ChevronRight className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-48 border-2 border-dashed border-white/5 rounded-[5rem] bg-zinc-950/20 flex flex-col items-center justify-center text-center animate-in fade-in duration-1000">
             <div className="w-28 h-28 bg-zinc-900 rounded-[3rem] flex items-center justify-center mb-12 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <Briefcase className="w-14 h-14 text-zinc-800" />
             </div>
             <h3 className="text-4xl font-black text-zinc-800 uppercase italic tracking-[0.3em] leading-none mb-6">Cámara de CRM Vacía</h3>
             <p className="text-zinc-900 font-bold uppercase tracking-[0.3em] text-[11px] max-w-sm leading-relaxed mb-12 italic">
                La red de anunciantes no registra nodos activos. Inicie el protocolo de anexión corporativa para poblar el clúster regional.
             </p>
             <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-white/5 hover:bg-tad-yellow hover:text-black text-zinc-500 px-16 py-6 rounded-[2.5rem] border border-white/10 hover:border-transparent text-[11px] font-black uppercase tracking-[0.5em] transition-all italic shadow-2xl overflow-hidden group/btn"
             >
                <span className="relative z-10">AUTHORIZE_NEW_PARTNER</span>
             </button>
          </div>
        )}
      </div>

      <AdvertiserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadAdvertisers();
          notifyChange('ADVERTISERS');
        }}
      />
      
      <style jsx global>{`
        .text-shadow-glow {
          text-shadow: 0 0 40px rgba(250, 212, 0, 0.4);
        }
      `}</style>
    </div>
  );
}
