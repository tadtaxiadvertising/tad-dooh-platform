import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function RootIndex() {
  const router = useRouter();

  useEffect(() => {
    // Basic structural redirect: / -> /admin/dashboard
    // AppWrapper and Middleware handle Auth check.
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-8">
      {/* Premium Loading Interface */}
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-1000">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-2xl">
             <div className="w-8 h-8 rounded-full border-t-2 border-tad-yellow animate-spin" />
          </div>
          <div className="absolute inset-0 bg-tad-yellow/10 blur-[40px] animate-pulse rounded-full" />
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-1">Iniciando TAD OS</p>
          <div className="flex gap-1 justify-center">
             <div className="w-1 h-1 rounded-full bg-tad-yellow/40 animate-bounce [animation-delay:-0.3s]" />
             <div className="w-1 h-1 rounded-full bg-tad-yellow/60 animate-bounce [animation-delay:-0.15s]" />
             <div className="w-1 h-1 rounded-full bg-tad-yellow animate-bounce" />
          </div>
        </div>
      </div>

      <style jsx global>{`
        body { background: #0a0a0b; margin: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}
