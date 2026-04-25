import React from 'react';
import Head from 'next/head';
import { Sidebar } from '../dashboard/Sidebar';
import { 
  ChevronRight,
  Activity,
  Search,
  User,
  Bell,
  ChevronDown,
  ShieldCheck,
  LogIn
} from 'lucide-react';
import { NotificationCenter, useAuth } from '@tad/ui';
import { useRouter } from 'next/router';
import { supabase } from '@tad/services';
import clsx from 'clsx';

interface AdvertiserLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AdvertiserLayout: React.FC<AdvertiserLayoutProps> = ({ children, title, subtitle }) => {
  const router = useRouter();
  const { session } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  
  const role = session?.user?.app_metadata?.role as string || 'ADVERTISER';
  const userEmail = session?.user?.email || 'Anunciante';

  // Global Shortcut: CTRL + K to focus search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem('tad_advertiser_token');
    localStorage.removeItem('tad_advertiser_user');
    document.cookie = 'sb-access-token=; path=/; max-age=0';
    router.push('/advertiser/login');
  };

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
            {/* Search Bar */}
            <div className="hidden md:flex items-center relative group">
              <Search size={14} className="absolute left-3 text-zinc-500 group-focus-within:text-[#FFD700] transition-colors" />
              <input 
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="BUSCAR..."
                className="bg-[#18181B] border border-white/10 rounded-xl py-1.5 pl-9 pr-12 text-[10px] font-bold outline-none focus:ring-1 focus:ring-[#FFD700]/30 focus:border-[#FFD700]/30 transition-all w-40 focus:w-64 placeholder:text-zinc-600 uppercase tracking-widest"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery) {
                    console.log('Searching Advertiser Portal:', searchQuery);
                  }
                }}
              />
              <div className="absolute right-2 flex items-center gap-1 opacity-30 pointer-events-none">
                 <kbd className="bg-zinc-800 text-[8px] px-1 rounded">CTRL</kbd>
                 <span className="text-[8px] text-zinc-600">+</span>
                 <kbd className="bg-zinc-800 text-[8px] px-1 rounded">K</kbd>
              </div>
            </div>

            <NotificationCenter />
            
            <div className="h-6 w-px bg-white/10 mx-2" />

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-black text-green-500 uppercase">Live Systems Engine</span>
                </div>
              </div>
              
              <div className="relative">
                <div 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 cursor-pointer group select-none"
                >
                  <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/5 group-hover:border-[#FFD700]/30 group-hover:ring-4 group-hover:ring-[#FFD700]/10 transition-all duration-300 flex items-center justify-center relative shadow-sm">
                    <span className="text-[11px] font-bold text-white tracking-widest">{userEmail.slice(0, 2).toUpperCase()}</span>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#09090B] animate-pulse shadow-[0_0_8px_#10b981]" />
                  </div>
                  <ChevronDown className={clsx("w-4 h-4 text-zinc-500 group-hover:text-white transition-all", isUserMenuOpen && "rotate-180")} />
                </div>

                {isUserMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-4 w-56 bg-zinc-900/95 border border-white/5 backdrop-blur-3xl rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                      <div className="p-4 border-b border-white/5 bg-black/50">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest truncate">{userEmail}</p>
                        <p className="text-[8px] text-zinc-500 font-bold uppercase mt-1 tracking-tight">{role}</p>
                      </div>
                      <div className="p-2">
                        <button 
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            router.push('/advertiser/profile');
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase tracking-wider"
                        >
                          <User className="w-4 h-4" />
                          Mi Perfil
                        </button>
                        <div className="h-px bg-white/5 my-2" />
                        <button 
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all uppercase tracking-wider"
                        >
                          <LogIn className="w-4 h-4 rotate-180" />
                          Desconectar
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
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
