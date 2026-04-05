import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { 
  Plus, Search, Filter, MoreHorizontal, 
  ExternalLink, Edit2, Trash2, Calendar, 
  CheckCircle2, Clock, AlertCircle, FileVideo
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdvertiserCampaigns() {
  const { session } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/campaigns`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        });
        const data = await res.json();
        setCampaigns(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error fetching campaigns:', e);
      } finally {
        setLoading(false);
      }
    };

    if (session?.access_token) fetchCampaigns();
  }, [session]);

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="space-y-1">
           <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Gestión de Pautas</p>
           <h1 className="text-4xl font-black uppercase tracking-tighter">Mis <span className="text-[#fad400]">Campañas</span></h1>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-3 px-8 py-4 bg-[#fad400] text-black rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-[0_10px_30px_rgba(250,212,0,0.2)]"
        >
          <Plus className="w-4 h-4" />
          Nueva campaña
        </motion.button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
         <div className="flex-1 relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-[#fad400] transition-colors" />
            <input 
              type="text"
              placeholder="Buscar por nombre de campaña..."
              className="w-full bg-zinc-900/30 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm focus:outline-none focus:border-[#fad400]/40 transition-all placeholder:text-zinc-600"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>
         <button className="px-6 py-4 bg-zinc-900/30 border border-white/5 rounded-2xl flex items-center gap-3 hover:bg-zinc-800/50 transition-colors">
            <Filter className="w-4 h-4 text-zinc-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Filtros</span>
         </button>
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
           <div className="w-8 h-8 border-2 border-[#fad400] border-t-transparent rounded-full animate-spin" />
           <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Sincronizando con el servidor...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredCampaigns.map((campaign, i) => (
              <motion.div
                key={campaign.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                className="group relative bg-zinc-900/30 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden hover:bg-zinc-800/40 transition-all"
              >
                {/* Status Badge Overlay */}
                <div className="absolute top-6 right-6">
                   <div className={clsx(
                     "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2",
                     campaign.status === 'ACTIVE' 
                       ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                       : "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                   )}>
                      <div className={clsx("w-1.5 h-1.5 rounded-full", campaign.status === 'ACTIVE' ? "bg-emerald-500 animate-pulse" : "bg-orange-500")} />
                      {campaign.status}
                   </div>
                </div>

                <div className="p-8 space-y-6">
                  <div className="flex items-start gap-4">
                     <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center flex-shrink-0">
                        <FileVideo className="w-6 h-6 text-zinc-400" />
                     </div>
                     <div className="pr-16">
                        <h3 className="text-xl font-black uppercase tracking-tight line-clamp-1 group-hover:text-[#fad400] transition-colors">
                          {campaign.name}
                        </h3>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                          ID: {campaign.id.split('-')[0]}...
                        </p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-black/20 p-4 rounded-2xl border border-white/[0.02]">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                           <Calendar className="w-3 h-3" /> Inicio
                        </p>
                        <p className="text-[11px] font-bold">{format(new Date(campaign.startDate), 'dd MMM, yyyy', { locale: es })}</p>
                     </div>
                     <div className="bg-black/20 p-4 rounded-2xl border border-white/[0.02]">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                           <Clock className="w-3 h-3" /> Fin
                        </p>
                        <p className="text-[11px] font-bold">{format(new Date(campaign.endDate), 'dd MMM, yyyy', { locale: es })}</p>
                     </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                     <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                           {[1,2,3].map(n => (
                             <div key={n} className="w-6 h-6 rounded-full bg-zinc-800 border border-[#0a0a0b] flex items-center justify-center">
                                <p className="text-[8px] font-black text-zinc-500">M</p>
                             </div>
                           ))}
                        </div>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                          {campaign.mediaAssets?.length || 0} Assets
                        </p>
                     </div>

                     <div className="flex gap-2">
                        <button className="p-3 bg-zinc-800/50 hover:bg-[#fad400] hover:text-black rounded-xl transition-all">
                           <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-3 bg-zinc-800/50 hover:bg-rose-500/20 hover:text-rose-500 rounded-xl transition-all">
                           <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredCampaigns.length === 0 && !loading && (
            <div className="col-span-full py-32 text-center space-y-4">
               <AlertCircle className="w-12 h-12 text-zinc-800 mx-auto" />
               <div>
                  <p className="text-lg font-black uppercase tracking-tight">No se encontraron campañas</p>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">Intenta con otro término de búsqueda</p>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
