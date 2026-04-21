import React from 'react';
import Head from 'next/head';
import { Sidebar } from '../dashboard/Sidebar';
import { 
  ChevronRight,
  Activity
} from 'lucide-react';

interface AdvertiserLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AdvertiserLayout: React.FC<AdvertiserLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="flex bg-[#09090B] min-h-screen text-[#F4F4F5] font-sans selection:bg-[#FFD700] selection:text-black">
      <Head>
        <title>TAD | {title}</title>
      </Head>

      <Sidebar />

      <main className="flex-1 h-screen overflow-y-auto custom-scrollbar">
        <header className="h-16 border-b border-[#18181B] flex items-center justify-between px-8 bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2 text-xs font-bold text-[#F4F4F5]/40 uppercase tracking-[0.3em]">
            <span>Portal</span>
            <ChevronRight size={12} />
            <span className="text-[#FFD700]">{subtitle}</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black text-green-500 uppercase">Live Systems Engine</span>
            </div>
            
            <div className="w-8 h-8 rounded-full bg-[#18181B] border border-[#F4F4F5]/10 flex items-center justify-center">
              <Activity size={14} className="text-[#FFD700]" />
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {children}
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #09090B; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #18181B; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #FFD700; }
      `}</style>
    </div>
  );
};
