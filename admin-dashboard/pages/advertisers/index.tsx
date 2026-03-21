import { useState, useEffect, useCallback } from 'react';
import { Search, Phone, Mail, DollarSign, TrendingUp, Building2, Activity, UserPlus, FileSpreadsheet, Zap, Shield, Briefcase, ChevronRight, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { getAdvertisers, deleteAdvertiser } from '../../services/api';
import { AdvertiserModal } from '../../components/AdvertiserModal';
import { useTabSync } from '../../hooks/useTabSync';
import { notifyChange } from '../../lib/sync-channel';
import { AntigravityButton } from '../../components/ui/AntigravityButton';

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
         <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-tad-yellow/[0.04] blur-[150px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[0%] right-[-5%] w-[40%] h-[40%] bg-white/[0.01] blur-[120px] rounded-full" />
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10 pt-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-tad-yellow rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(255,212,0,0.15)] shrink-0">
                <Briefcase className="w-6 h-6 text-black" />
             </div>
             <div>
                <div className="flex items-center gap-2 mb-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow shadow-[0_0_8px_rgba(255,212,0,0.8)]" />
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Network 4.5</p>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tight leading-none">
                  Strategic <span className="text-tad-yellow cursor-default">Partners</span>
                </h1>
             </div>
          </div>
          <p className="text-gray-400 max-w-2xl text-sm font-medium leading-relaxed pl-16">
            Gestiona cuentas corporativas y activos de marca.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-gray-800/40 backdrop-blur-xl p-1.5 rounded-2xl border border-gray-700/50 shadow-lg shrink-0">
           <button 
             onClick={downloadCSV}
             className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-gray-700/50 flex items-center gap-2 transition-all"
           >
             <FileSpreadsheet className="h-4 w-4" />
             Exportar CRM
           </button>
           <button 
             onClick={() => setIsModalOpen(true)}
             className="bg-tad-yellow text-black px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-yellow-400 transition-all shadow-md"
           >
             <UserPlus className="h-4 w-4" />
             Nueva Cuenta
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Cartera de Marcas', value: advertisers.length, icon: Building2, color: 'text-white', bgColor: 'bg-zinc-800/80', border: 'border-white/10' },
          { label: 'Pauta Activa', value: totalActiveCampaigns, icon: TrendingUp, color: 'text-tad-yellow', bgColor: 'bg-tad-yellow/10', border: 'border-tad-yellow/20' },
          { label: 'Inversión Retenida', value: `RD$ ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Ticket Promedio', value: advertisers.length > 0 ? `RD$ ${(totalRevenue / advertisers.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '0', icon: Zap, color: 'text-white', bgColor: 'bg-zinc-800/80', border: 'border-white/10' },
        ].map((s, i) => (
          <div 
            key={i} 
              className={clsx(
                "bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-3xl group hover:border-gray-500 transition-all duration-300 relative flex flex-col justify-between shadow-sm hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8 fill-mode-both",
                i === 0 ? 'delay-0' : i === 1 ? 'delay-50' : i === 2 ? 'delay-100' : 'delay-150'
              )}
          >
              <div className="flex justify-between items-start mb-6">
                 <div className={clsx("p-3 rounded-2xl border transition-all duration-300 shadow-sm", s.bgColor, s.border, s.color)}>
                    <s.icon className="w-5 h-5" />
                 </div>
                 <div className="h-1.5 w-1.5 rounded-full bg-gray-600 group-hover:bg-tad-yellow transition-colors shadow-[0_0_8px_#fad400]" />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                 <h3 className={clsx("text-3xl lg:text-4xl font-bold tracking-tight leading-none mt-1", s.color)}>{s.value}</h3>
              </div>
          </div>
        ))}
      </div>

      {/* Search & Filtration Nexus */}
      <div className="relative mb-10 animate-in slide-in-from-top-10 duration-700 fill-mode-both">
          <div className="relative flex flex-col lg:flex-row gap-4 p-2 bg-gray-800/40 border border-gray-700/50 backdrop-blur-xl rounded-2xl shadow-md">
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-tad-yellow transition-colors" />
              <input 
                type="text" 
                placeholder="BUSCAR MARCAS O CREADORES..."
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl py-4 pl-14 pr-6 text-xs font-bold uppercase tracking-widest text-white outline-none focus:border-tad-yellow/50 transition-all placeholder:text-gray-600 shadow-inner"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex p-1 bg-gray-900/50 rounded-xl border border-gray-700/50 shadow-inner overflow-x-auto">
              {(['all', 'active', 'inactive'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx(
                    "px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    filter === f 
                      ? "bg-gray-700 text-white shadow-sm" 
                      : "text-gray-500 hover:text-white hover:bg-gray-800"
                  )}
                >
                  {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>
          </div>
      </div>

      {/* Advertisers Grid Surface */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="h-[400px] bg-gray-800/40 backdrop-blur-xl animate-pulse rounded-3xl border border-gray-700/50" />)
        ) : filtered.length > 0 ? (
          filtered.map((advertiser, idx) => {
            const totalSpend = (advertiser.campaigns)?.reduce((s, c) => s + (c.budget || 0), 0) || 0;
            const activeCount = (advertiser.campaigns)?.filter(c => c.status === 'ACTIVE').length || 0;

            return (
              <div 
                key={advertiser.id} 
                className={clsx(
                  "group relative bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 hover:border-gray-500 transition-all duration-500 hover:shadow-lg flex flex-col animate-in fade-in slide-in-from-bottom-8 fill-mode-both",
                  idx === 0 ? 'delay-0' : idx === 1 ? 'delay-50' : idx === 2 ? 'delay-100' : idx === 3 ? 'delay-150' : idx === 4 ? 'delay-200' : 'delay-250'
                )}
              >
                
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-700/50 to-gray-900 rounded-2xl flex items-center justify-center border border-gray-700/50 shadow-md group-hover:rotate-3 transition-all">
                       <span className="text-2xl font-bold text-gray-300 relative z-10">{(advertiser.companyName || 'A').charAt(0)}</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white tracking-tight uppercase leading-none mb-2 group-hover:text-tad-yellow transition-colors">{advertiser.companyName}</h4>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-900/50 rounded-lg border border-gray-700/50 w-fit">
                         <Shield className="w-3 h-3 text-gray-500" />
                         <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Cuenta Activa</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className={clsx(
                      "px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm",
                      advertiser.status === 'ACTIVE' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-gray-900 text-gray-500 border-gray-700/50'
                    )}>
                      {advertiser.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                    </div>
                    <AntigravityButton
                      variant="danger"
                      actionName="delete_advertiser"
                      critical={true}
                      className="w-8 h-8 p-0 rounded-lg"
                      confirmMessage={`¿Eliminar la cuenta de "${advertiser.companyName}" y todos sus vínculos?`}
                      onAsyncClick={async () => await deleteAdvertiser(advertiser.id)}
                      onSuccess={() => {
                        loadAdvertisers();
                        notifyChange('ADVERTISERS');
                      }}
                    >
                       <Trash2 className="w-3.5 h-3.5" />
                    </AntigravityButton>
                  </div>
                </div>

                <div className="space-y-4 mb-8 bg-gray-900/50 p-6 rounded-2xl border border-gray-700/50">
                  {[
                    { icon: Mail, value: advertiser.email || 'SIN DATOS' },
                    { icon: Phone, value: advertiser.phone || 'SIN DATOS' },
                    { icon: TrendingUp, value: advertiser.contactName || 'SIN CONTACTO' }
                  ].map((info, ii) => (
                    <div key={ii} className="flex items-center gap-4 text-xs text-gray-400 font-bold tracking-widest uppercase">
                      <info.icon className="w-4 h-4 text-tad-yellow shrink-0" />
                      <span className="truncate">{info.value}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-700/50 mt-auto relative items-center">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Campañas Mág.</p>
                    <div className="flex items-center gap-2">
                       <h5 className="text-2xl font-bold text-white leading-none">{advertiser.campaigns?.length || 0}</h5>
                       {activeCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Inversión (RD$)</p>
                    <h5 className="text-xl font-bold text-emerald-500 leading-none truncate">{totalSpend.toLocaleString()}</h5>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-32 border border-dashed border-gray-700/50 rounded-3xl bg-gray-800/20 flex flex-col items-center justify-center text-center animate-in fade-in duration-1000">
             <div className="w-20 h-20 bg-gray-900/50 rounded-2xl flex items-center justify-center mb-8 shadow-sm border border-gray-700/50">
                <Briefcase className="w-10 h-10 text-gray-600" />
             </div>
             <h3 className="text-2xl font-bold text-gray-400 uppercase tracking-widest leading-none mb-4">No Hay Registros</h3>
             <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] max-w-sm leading-relaxed mb-8">
                El sistema no registra cuentas corporativas.
             </p>
             <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-gray-800/50 hover:bg-tad-yellow hover:text-black text-gray-400 px-10 py-4 rounded-xl border border-gray-700/50 hover:border-transparent text-xs font-bold uppercase tracking-widest transition-all shadow-md"
             >
                <span className="relative z-10">Nuevo Registro</span>
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
