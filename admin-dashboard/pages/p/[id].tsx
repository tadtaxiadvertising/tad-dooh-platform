import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Smartphone, Globe, Instagram, Facebook, MessageCircle, ShoppingBag, ArrowRight, ExternalLink, Activity, Sparkles } from 'lucide-react';
import axios from 'axios';
import Head from 'next/head';
import Link from 'next/link';

import { getAdvertiserPublicProfile } from '../../services/api';

export default function PublicProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const [advertiser, setAdvertiser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      try {
        const data = await getAdvertiserPublicProfile(id as string);
        setAdvertiser(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="w-12 h-12 border-4 border-tad-yellow border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-xs font-black uppercase tracking-[0.3em]">Conectando con TAD NEXUS...</p>
    </div>
  );

  if (error || !advertiser) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8 text-center">
      <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter">Perfil no disponible</h1>
      <p className="text-gray-500 mb-8 max-w-xs">El enlace que has escaneado ya no está activo o es inválido.</p>
      <a href="https://tad.do" className="bg-tad-yellow text-black px-8 py-3 rounded-full font-black uppercase text-xs">Ir a TAD Home</a>
    </div>
  );

  const products = advertiser.productsData ? JSON.parse(advertiser.productsData) : [];

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-tad-yellow selection:text-black font-sans pb-20 overflow-x-hidden">
      <Head>
        <title>{advertiser.companyName} | TAD DOOH Profile</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>

      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] bg-tad-yellow/[0.05] blur-[120px] rounded-full" />
        <div className="absolute bottom-[0%] right-[-20%] w-[60%] h-[40%] bg-white/[0.02] blur-[100px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-lg mx-auto px-6 pt-8">
        {/* Navigation */}
        <div className="flex justify-between items-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
           <Link href="/p" className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-all">
              <ArrowRight className="w-4 h-4 rotate-180 text-tad-yellow" />
              <span className="text-[10px] font-black uppercase tracking-widest">Catálogo</span>
           </Link>
           <button 
             onClick={() => {
               navigator.share?.({ title: advertiser.companyName, url: window.location.href }).catch(() => {
                 navigator.clipboard.writeText(window.location.href);
                 alert('Enlace copiado al portapapeles');
               });
             }}
             className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
             title="Compartir enlace"
           >
              <ExternalLink className="w-4 h-4 text-zinc-400" />
           </button>
        </div>

        {/* Header Profile */}
        <section className="text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
           <div className="w-24 h-24 bg-gradient-to-br from-tad-yellow to-yellow-600 rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-tad-yellow/10 rotate-3 group">
              <span className="text-4xl font-black text-black group-hover:scale-110 transition-transform">{advertiser.companyName.charAt(0)}</span>
           </div>
           <h1 className="text-4xl font-black tracking-tighter uppercase mb-2 italic">
             {advertiser.companyName}
           </h1>
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Negocio Verificado</span>
           </div>
        </section>

        {/* Primary Action Hub */}
        <div className="grid grid-cols-2 gap-4 mb-4 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-100 fill-mode-both">
           {advertiser.whatsapp && (
             <a 
               href={`https://wa.me/${advertiser.whatsapp}`}
               target="_blank"
               rel="noopener noreferrer"
               className="bg-[#25D366] hover:bg-[#20ba59] p-5 rounded-[2rem] flex flex-col items-center justify-center gap-2 shadow-xl shadow-emerald-500/10 transition-all active:scale-95"
             >
                <MessageCircle className="w-7 h-7 text-white" />
                <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp</span>
             </a>
           )}
           {advertiser.websiteUrl && (
             <a 
               href={advertiser.websiteUrl}
               target="_blank"
               rel="noopener noreferrer"
               className="bg-white hover:bg-zinc-100 p-5 rounded-[2rem] flex flex-col items-center justify-center gap-2 shadow-xl transition-all active:scale-95 text-black"
             >
                <Globe className="w-7 h-7" />
                <span className="text-[10px] font-black uppercase tracking-widest">Sitio Web</span>
             </a>
           )}
        </div>

        {/* Delivery / Secondary Actions */}
        {(advertiser.pedidosYaUrl || advertiser.uberEatsUrl) && (
          <div className="grid grid-cols-2 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200 fill-mode-both">
             {advertiser.pedidosYaUrl && (
               <a 
                 href={advertiser.pedidosYaUrl}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="bg-[#D0011B] hover:bg-[#b00117] p-4 rounded-3xl flex flex-col items-center justify-center gap-2 shadow-xl shadow-red-500/10 transition-all active:scale-95 text-white"
               >
                  <ShoppingBag className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">PedidosYa</span>
               </a>
             )}
             {advertiser.uberEatsUrl && (
               <a 
                 href={advertiser.uberEatsUrl}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="bg-[#06C167] hover:bg-[#05a558] p-4 rounded-3xl flex flex-col items-center justify-center gap-2 shadow-xl shadow-emerald-500/10 transition-all active:scale-95 text-white"
               >
                  <Activity className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">Uber Eats</span>
               </a>
             )}
          </div>
        )}

        {/* Social Ecosystem */}
        <div className="grid grid-cols-2 gap-4 mb-12 animate-in fade-in duration-1000 delay-300 fill-mode-both">
              {advertiser.instagram && (
                <a href={`https://instagram.com/${advertiser.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500 group-hover:text-white transition-all">
                    <Instagram className="w-5 h-5 text-pink-500 group-hover:text-inherit" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Instagram</span>
                </a>
              )}
              {advertiser.facebook && (
                <a href={advertiser.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <Facebook className="w-5 h-5 text-blue-500 group-hover:text-inherit" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Facebook</span>
                </a>
              )}
        </div>

        {/* Products Grid */}
        {products.length > 0 && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-16 duration-700 delay-500 fill-mode-both">
             <div className="flex justify-between items-center px-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                   <Sparkles className="w-4 h-4 text-tad-yellow" /> Destacados
                </h3>
             </div>
             
             <div className="grid grid-cols-1 gap-4">
                {products.map((p: any, i: number) => (
                  <div key={i} className="bg-zinc-900/50 border border-white/5 p-4 rounded-[2.5rem] flex items-center gap-5 group hover:border-tad-yellow/30 transition-all">
                     <div className="w-20 h-20 bg-zinc-800 rounded-3xl overflow-hidden shrink-0 border border-white/5">
                        {p.img ? (
                          <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-20"><ShoppingBag className="w-8 h-8" /></div>
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-base text-white truncate">{p.name}</h4>
                        <p className="text-tad-yellow font-black text-xl mt-0.5">{p.price ? `$${p.price}` : 'Consultar'}</p>
                        {p.link && (
                          <a href={p.link} className="inline-flex items-center gap-2 px-3 py-1.5 bg-tad-yellow/10 rounded-full text-[8px] font-black uppercase tracking-widest text-tad-yellow mt-2 hover:bg-tad-yellow hover:text-black transition-all">
                             Adquirir <ArrowRight className="w-3 h-3" />
                          </a>
                        )}
                     </div>
                  </div>
                ))}
             </div>
          </section>
        )}

        {/* Footer Ecosystem */}
        <footer className="mt-24 pt-12 border-t border-white/5 text-center space-y-6 opacity-40">
           <div className="flex items-center justify-center gap-4 grayscale">
              <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-xs font-black">T</div>
              <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-xs font-black">A</div>
              <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-xs font-black">D</div>
           </div>
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">
             TAD Taxi Advertising Dominicana &copy; 2026
           </p>
        </footer>
      </main>
    </div>
  );
}
