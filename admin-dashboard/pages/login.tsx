import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Shield, BarChart3, Car, ChevronRight, LayoutDashboard } from 'lucide-react';
import clsx from 'clsx';

export default function LoginGateway() {
  const router = useRouter();

  useEffect(() => {
    const portalType = process.env.NEXT_PUBLIC_PORTAL_TYPE;
    if (portalType === 'ADVERTISER') router.replace('/advertiser/login');
    if (portalType === 'DRIVER') router.replace('/driver/login');
    if (portalType === 'ADMIN') router.replace('/admin/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <Head>
        <title>TAD | Selecciona tu Portal</title>
      </Head>

      {/* Decorative background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-tad-yellow/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-blue-500/5 blur-[150px] rounded-full" />
      </div>

      <div className="z-10 w-full max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-black text-white tracking-widest uppercase mb-4">
            TAD <span className="text-tad-yellow">PLATFORM</span>
          </h1>
          <p className="text-gray-500 font-bold uppercase tracking-[0.5em] text-xs">Access Management Gateway</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PortalCard 
            title="Administrador"
            subtitle="Central Command & Fleet Controls"
            icon={<Shield className="w-8 h-8 text-black" />}
            bgColor="bg-tad-yellow"
            onClick={() => router.push('/admin/login')}
            delay="delay-0"
          />
          
          <PortalCard 
            title="Anunciante"
            subtitle="Campaign Performance & Insights"
            icon={<BarChart3 className="w-8 h-8 text-white" />}
            bgColor="bg-zinc-800"
            onClick={() => router.push('/advertiser/login')}
            delay="delay-75"
          />

          <PortalCard 
            title="Conductor"
            subtitle="Earnings & Device Status PWA"
            icon={<Car className="w-8 h-8 text-white" />}
            bgColor="bg-zinc-900"
            onClick={() => router.push('/driver/login')}
            delay="delay-150"
          />
        </div>

        <div className="mt-20 text-center opacity-30 hover:opacity-100 transition-opacity">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.8em]">
            TAD TECHNOLOGIES © SANTIAGO PILOT v2
          </p>
        </div>
      </div>
    </div>
  );
}

function PortalCard({ title, subtitle, icon, bgColor, onClick, delay }: any) {
  return (
    <button 
      onClick={onClick}
      className={clsx(
        "group p-1 rounded-[2.5rem] bg-white/5 border border-white/5 transition-all duration-500 hover:scale-[1.02] active:scale-95 text-left h-full",
        delay
      )}
    >
      <div className="bg-zinc-900/50 backdrop-blur-3xl p-8 rounded-[2.3rem] h-full flex flex-col justify-between border border-transparent group-hover:border-white/10 transition-colors">
        <div>
          <div className={clsx("w-16 h-16 rounded-3xl flex items-center justify-center mb-10 shadow-2xl group-hover:rotate-6 transition-transform duration-500", bgColor)}>
            {icon}
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-3 group-hover:text-tad-yellow transition-colors">{title}</h2>
          <p className="text-gray-500 text-xs font-bold leading-relaxed">{subtitle}</p>
        </div>
        
        <div className="mt-12 flex items-center gap-3 opacity-30 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Enter Portal</span>
          <ChevronRight className="w-4 h-4 text-tad-yellow" />
        </div>
      </div>
    </button>
  );
}
