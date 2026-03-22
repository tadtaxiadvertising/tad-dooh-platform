import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Smartphone, Globe, Instagram, Facebook, MessageCircle, ShoppingBag, ArrowRight, ExternalLink, Activity } from 'lucide-react';
import axios from 'axios';
import Head from 'next/head';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://proyecto-ia-tad-api.rewvid.easypanel.host/api';

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
        const res = await axios.get(`${API_URL}/campaigns/advertiser/${id}/profile`);
        setAdvertiser(res.data);
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

      <main className="relative z-10 max-w-lg mx-auto px-6 pt-16">
        {/* Header Profile */}
        <section className="text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
           <div className="w-24 h-24 bg-gradient-to-br from-tad-yellow to-yellow-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl rotate-3">
              <span className="text-4xl font-black text-black">{advertiser.companyName.charAt(0)}</span>
           </div>
           <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">{advertiser.companyName}</h1>
           <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.4em] flex items-center justify-center gap-2">
             <Activity className="w-3 h-3 text-tad-yellow" /> Socio Comercial Certificado
           </p>
        </section>

        {/* Action Buttons Cluster */}
        <div className="grid grid-cols-2 gap-4 mb-10 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-100 fill-mode-both">
           {advertiser.whatsapp && (
             <a 
               href={`https://wa.me/${advertiser.whatsapp}`}
               target="_blank"
               rel="noopener noreferrer"
               className="bg-[#25D366] p-4 rounded-3xl flex flex-col items-center justify-center gap-2 shadow-xl hover:scale-105 transition-transform"
             >
                <MessageCircle className="w-6 h-6 text-white" />
                <span className="text-[10px] font-black uppercase">WhatsApp</span>
             </a>
           )}
           {advertiser.websiteUrl && (
             <a 
               href={advertiser.websiteUrl}
               target="_blank"
               rel="noopener noreferrer"
               className="bg-white p-4 rounded-3xl flex flex-col items-center justify-center gap-2 shadow-xl hover:scale-105 transition-transform text-black"
             >
                <Globe className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase">Sitio Web</span>
             </a>
           )}
        </div>

        {/* Social Links Bar */}
        <div className="flex justify-center gap-8 mb-12 animate-in fade-in duration-1000 delay-300 fill-mode-both">
              {advertiser.instagram && (
                <a href={`https://instagram.com/${advertiser.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" title="Instagram" className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-tad-yellow hover:text-black transition-all">
                  <Instagram className="w-6 h-6" />
                </a>
              )}
              {advertiser.facebook && (
                <a href={advertiser.facebook} target="_blank" rel="noopener noreferrer" title="Facebook" className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-tad-yellow hover:text-black transition-all">
                  <Facebook className="w-6 h-6" />
                </a>
              )}
        </div>

        {/* Products Showcase */}
        {products.length > 0 && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-16 duration-700 delay-500 fill-mode-both">
             <div className="flex justify-between items-center px-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Servicios & Productos</h3>
                <ShoppingBag className="w-4 h-4 text-tad-yellow" />
             </div>
             
             <div className="space-y-4">
                {products.map((p: any, i: number) => (
                  <div key={i} className="bg-[#111] border border-white/[0.05] p-1.5 rounded-[2rem] flex items-center gap-5 hover:border-tad-yellow/30 transition-all group shadow-sm">
                     <div className="w-20 h-20 bg-gray-800 rounded-2xl overflow-hidden shrink-0">
                        {p.img && <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />}
                     </div>
                     <div className="flex-1 min-w-0 pr-4">
                        <h4 className="font-bold text-sm text-white truncate">{p.name}</h4>
                        <p className="text-tad-yellow font-black text-lg mt-0.5">{p.price ? `$${p.price}` : '--'}</p>
                        {p.link && (
                          <a href={p.link} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-500 mt-1">
                             Pedir Ahora <ArrowRight className="w-3 h-3" />
                          </a>
                        )}
                     </div>
                  </div>
                ))}
             </div>
          </section>
        )}

        {/* Footer Brand */}
        <footer className="mt-20 text-center opacity-40">
           <p className="text-[9px] font-black uppercase tracking-[0.5em] mb-4">Powered By</p>
           <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 bg-tad-yellow rounded-lg flex items-center justify-center text-black font-black text-xs">T</div>
              <span className="text-xs font-black tracking-tighter uppercase">TAD DOOH NETWORK</span>
           </div>
        </footer>
      </main>
    </div>
  );
}
