import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Activity } from 'lucide-react';

export default function AdvertiserPortalRedirect() {
  const router = useRouter();
  const { id } = router.query;
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      const adminToken = localStorage.getItem('tad_admin_token');
      
      if (!adminToken) {
        setError('Acceso denegado. No eres administrador.');
        setTimeout(() => {
          router.replace('/p/advertiser/login');
        }, 2000);
        return;
      }

      // REDIRECT TO SaaS PORTAL WITH GOD MODE PARAMS
      // We assume the advertiser portal is at https://proyecto-ia-tad-advertiser.rewvid.easypanel.host
      // Or we could read from NEXT_PUBLIC_ADVERTISER_URL
      const advertiserUrl = process.env.NEXT_PUBLIC_ADVERTISER_URL || 'https://proyecto-ia-tad-advertiser.rewvid.easypanel.host';
      
      const target = `${advertiserUrl}/advertiser/dashboard?viewAsAdmin=true&advId=${id}`;
      window.location.href = target;
    }
  }, [id, router]);

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
      <Head>
        <title>TAD | Redirigiendo a Portal Unificado</title>
      </Head>
      {error ? (
        <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-2xl text-center">
          <p className="text-rose-500 font-black uppercase tracking-widest">{error}</p>
        </div>
      ) : (
        <>
          <div className="relative">
            <div className="w-16 h-16 border-r-2 border-[#FFD700] rounded-full animate-spin" />
            <Activity className="absolute inset-0 m-auto w-6 h-6 text-[#FFD700]/40 animate-pulse" />
          </div>
          <p className="mt-8 text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 animate-pulse">Transfiriendo al Portal SaaS...</p>
          <p className="mt-2 text-xs text-zinc-500">Conectando Nexus God Mode</p>
        </>
      )}
    </div>
  );
}






