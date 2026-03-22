import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getAdvertiserHub } from '../../services/api';
import { 
  ShoppingBag, 
  Utensils, 
  Sparkles, 
  Briefcase, 
  ExternalLink, 
  MessageCircle, 
  Instagram,
  ChevronRight,
  Search,
  ArrowRight,
  Activity
} from 'lucide-react';
import clsx from 'clsx';

interface Advertiser {
  id: string;
  companyName: string;
  category: string;
  whatsapp?: string;
  instagram?: string;
  websiteUrl?: string;
  pedidosYaUrl?: string;
  uberEatsUrl?: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  'Gastronomía': Utensils,
  'Retail': ShoppingBag,
  'Servicios': Briefcase,
  'Entretenimiento': Sparkles,
  'General': Sparkles
};

export default function AdvertiserHub() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    getAdvertiserHub()
      .then(setAdvertisers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(advertisers.map(a => a.category || 'General')));
    return cats.sort();
  }, [advertisers]);

  const filtered = useMemo(() => {
    return advertisers.filter(a => {
      const matchesSearch = a.companyName.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory ? a.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [advertisers, search, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-tad-yellow selection:text-black">
      <Head>
        <title>TAD Nexus | Catálogo de Marcas</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-tad-yellow/10 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-tad-yellow">Nexus v4.5 Live</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">
            Catálogo <br /> <span className="text-tad-yellow">Premium</span>
          </h1>
          <p className="text-zinc-400 text-sm font-medium leading-relaxed">
            Descubre ofertas exclusivas de nuestros aliados. Escanea, conecta y disfruta beneficios directos en tu viaje.
          </p>
        </div>
      </section>

      {/* Controls */}
      <div className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-y border-white/5 px-6 py-4">
        <div className="max-w-xl mx-auto space-y-4">
          {/* Search Bar */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-tad-yellow transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar marcas o servicios..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm outline-none focus:border-tad-yellow/50 transition-all font-medium"
            />
          </div>

          {/* Categories Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button 
              onClick={() => setSelectedCategory(null)}
              className={clsx(
                "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                !selectedCategory ? "bg-tad-yellow border-tad-yellow text-black" : "bg-white/5 border-white/10 text-zinc-400"
              )}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                  "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                  selectedCategory === cat ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-zinc-400"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <main className="px-6 py-10 max-w-xl mx-auto">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-tad-yellow/20 border-t-tad-yellow rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Sincronizando Nexus...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center space-y-4">
             <Search className="w-12 h-12 text-zinc-800 mx-auto" />
             <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No se encontraron marcas en esta categoría.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((adv) => {
              const Icon = CATEGORY_ICONS[adv.category || 'General'] || Sparkles;
              return (
                <div 
                  key={adv.id}
                  className="bg-zinc-900/40 border border-white/5 rounded-3xl p-5 group hover:border-tad-yellow/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center border border-white/5 shrink-0 group-hover:scale-110 transition-transform">
                        <Icon className="w-7 h-7 text-tad-yellow" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-tad-yellow uppercase tracking-widest mb-1">{adv.category || 'General'}</p>
                        <h3 className="text-lg font-black tracking-tight">{adv.companyName}</h3>
                      </div>
                    </div>
                    <Link href={`/p/${adv.id}`} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors">
                      <ChevronRight className="w-5 h-5 text-white" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {adv.whatsapp && (
                      <a 
                        href={`https://wa.me/${adv.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 p-2.5 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-xl transition-all"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/80">WS</span>
                      </a>
                    )}
                    {adv.pedidosYaUrl && (
                      <a 
                        href={adv.pedidosYaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 p-2.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl transition-all"
                      >
                        <ShoppingBag className="w-4 h-4 text-red-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-red-500/80">PY</span>
                      </a>
                    )}
                    {adv.uberEatsUrl && (
                      <a 
                        href={adv.uberEatsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 p-2.5 bg-emerald-400/5 hover:bg-emerald-400/10 border border-emerald-400/10 rounded-xl transition-all"
                      >
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400/80">Uber</span>
                      </a>
                    )}
                    {adv.instagram && (
                      <a 
                        href={`https://instagram.com/${adv.instagram.replace('@','')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 p-2.5 bg-pink-500/5 hover:bg-pink-500/10 border border-pink-500/10 rounded-xl transition-all"
                      >
                        <Instagram className="w-4 h-4 text-pink-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-pink-500/80">IG</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer / CTA */}
      <footer className="px-6 py-12 border-t border-white/5 text-center space-y-6">
        <div className="text-tad-yellow opacity-40">•••</div>
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            TAD Taxi Advertising <br /> Dominicana &copy; 2026
        </p>
      </footer>
    </div>
  );
}
