import { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { getAdvertiserHub } from "@tad/services";
import type { Advertiser } from "@tad/types";
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
  Activity,
  Zap,
  LayoutGrid,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import type { GetServerSideProps } from "next";
// Force dynamic rendering — prevents "No QueryClient set" SSR errors
export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

const CATEGORY_ICONS: Record<string, any> = {
  Gastronomía: Utensils,
  Retail: ShoppingBag,
  Servicios: Briefcase,
  Entretenimiento: Sparkles,
  General: Zap,
};

export default function AdvertiserHub() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    getAdvertiserHub()
      .then(setAdvertisers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(advertisers.map((a) => a.category || "General")),
    );
    return cats.sort();
  }, [advertisers]);

  const filtered = useMemo(() => {
    return advertisers.filter((a) => {
      const matchesSearch = a.companyName
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory = selectedCategory
        ? a.category === selectedCategory
        : true;
      return matchesSearch && matchesCategory;
    });
  }, [advertisers, search, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-100 font-sans selection:bg-tad-cyan selection:text-black overflow-x-hidden">
      <Head>
        <title>TAD NEXUS | High-Traffic Brand Ecosystem</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"
        />
      </Head>

      {/* Hero Section: High-End Visuals */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-tad-cyan/10 blur-[140px] rounded-full -z-10 animate-pulse" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-tad-purple/5 blur-[120px] rounded-full -z-10" />

        <div className="max-w-xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md"
          >
            <div className="w-2 h-2 rounded-full bg-tad-cyan shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-tad-cyan">
              Nexus System v4.5 Active
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-5xl font-black tracking-tighter uppercase italic leading-[0.9]"
          >
            Brand <br /> <span className="text-white">Universe</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-sm font-bold uppercase tracking-tight max-w-sm mx-auto leading-relaxed"
          >
            Conecta con los aliados de la red. <br /> Beneficios exclusivos en
            tiempo real.
          </motion.p>
        </div>
      </section>

      {/* Controls HUD */}
      <div className="sticky top-0 z-[100] bg-[#0B0F1A]/60 backdrop-blur-3xl border-y border-white/5 py-5 px-6">
        <div className="max-w-xl mx-auto space-y-5">
          {/* Holographic Search */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-tad-cyan/0 via-tad-cyan/20 to-tad-cyan/0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity blur-md" />
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-tad-cyan transition-colors" />
              <input
                type="text"
                placeholder="Search premium network..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm outline-none focus:border-tad-cyan/30 focus:shadow-[inset_0_0_20px_rgba(0,229,255,0.03)] transition-all font-bold placeholder:text-slate-700"
              />
            </div>
          </div>

          {/* Premium Filter Ticker */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={clsx(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                !selectedCategory
                  ? "bg-tad-cyan border-tad-cyan text-black shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                  : "bg-white/[0.03] border-white/5 text-slate-500 hover:text-slate-200",
              )}
            >
              All Brands
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                  selectedCategory === cat
                    ? "bg-white text-black border-white shadow-xl"
                    : "bg-white/[0.03] border-white/5 text-slate-500 hover:text-slate-200",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Brand Cloud */}
      <main className="px-6 py-12 max-w-xl mx-auto">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-24 flex flex-col items-center gap-6"
            >
              <div className="relative">
                <div className="w-12 h-12 border-4 border-tad-cyan/10 border-t-tad-cyan rounded-full animate-spin" />
                <div className="absolute inset-0 bg-tad-cyan/20 blur-2xl animate-pulse rounded-full" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-tad-cyan animate-pulse">
                Initializing Nexus...
              </p>
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-24 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-white/[0.02] border border-white/5 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-10 h-10 text-slate-800" />
              </div>
              <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] leading-relaxed">
                Null results detected. <br /> Try adjusting your targeting
                filters.
              </p>
            </motion.div>
          ) : (
            <motion.div layout className="space-y-6">
              {filtered.map((adv) => {
                const Icon = CATEGORY_ICONS[adv.category || "General"] || Zap;
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={adv.id}
                    className="glass border-white/5 rounded-[2.5rem] p-7 group hover:border-tad-cyan/30 transition-all relative overflow-hidden active:scale-[0.98]"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                      <Icon className="w-32 h-32 text-tad-cyan -mr-12 -mt-12 rotate-12" />
                    </div>

                    <div className="flex items-start justify-between gap-6 mb-8 relative z-10">
                      <div className="flex gap-5">
                        <div className="w-16 h-16 bg-zinc-950/80 rounded-2xl flex items-center justify-center border border-white/5 shrink-0 group-hover:scale-105 transition-transform shadow-2xl">
                          <Icon className="w-8 h-8 text-tad-cyan shadow-[0_0_20px_rgba(0,229,255,0.4)]" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-3 bg-tad-cyan rounded-full" />
                            <p className="text-[10px] font-black text-tad-cyan uppercase tracking-[0.2em]">
                              {adv.category || "Partner"}
                            </p>
                          </div>
                          <h3 className="text-xl font-black tracking-tight text-white">
                            {adv.companyName}
                          </h3>
                        </div>
                      </div>
                      <Link
                        href={`/p/${adv.id}`}
                        className="w-12 h-12 bg-white/[0.03] hover:bg-tad-cyan border border-white/5 hover:border-tad-cyan rounded-2xl transition-all flex items-center justify-center group/btn"
                      >
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover/btn:text-black transition-colors" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-3 relative z-10">
                      {adv.whatsapp && (
                        <a
                          href={`https://wa.me/${adv.whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-3 py-3 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-2xl transition-all"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">
                            Contact
                          </span>
                        </a>
                      )}
                      {adv.instagram && (
                        <a
                          href={`https://instagram.com/${adv.instagram.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-3 py-3 bg-pink-500/5 hover:bg-pink-500/10 border border-pink-500/10 rounded-2xl transition-all"
                        >
                          <Instagram className="w-4 h-4 text-pink-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-pink-500">
                            IG Live
                          </span>
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Footer */}
      <footer className="px-6 py-16 border-t border-white/5 text-center space-y-8 bg-zinc-950/20">
        <div className="flex items-center justify-center gap-1.5">
          <LayoutGrid className="w-4 h-4 text-tad-cyan" />
          <span className="text-[10px] font-black text-white uppercase tracking-[0.5em]">
            TAD NEXUS
          </span>
        </div>
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-loose">
          TAD Taxi Advertising Dominicana <br />
          Digital Out-of-Home Network &copy; 2026 <br />
          <span className="text-slate-800 mt-2 block">
            Santiago • Santo Domingo
          </span>
        </p>
      </footer>
    </div>
  );
}
