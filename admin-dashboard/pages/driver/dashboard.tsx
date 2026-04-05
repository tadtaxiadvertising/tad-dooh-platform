import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { 
  Car, Wallet, ShieldAlert, Wifi, Battery, MapPin, 
  ChevronRight, RefreshCw, Smartphone, TrendingUp,
  CreditCard, Award, LogOut, LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import api, { logout } from '@/services/api';

function DriverDashboard() {
  const { session } = useAuth();
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await api.get('/drivers/me/hub');
        setDriverData(response.data);
      } catch (error) {
        console.error('Failed to load driver data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
     return (
       <div className="min-h-screen bg-black flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-[#fad400] animate-spin" />
       </div>
     );
  }

  const stats = {
    balance: `RD$${(driverData?.balance || 0).toLocaleString()}`,
    bonus: `RD$${(driverData?.bonus || 0).toLocaleString()}`,
    referralEarned: `RD$${(driverData?.referralEarned || 0).toLocaleString()}`,
    subscriptionStatus: driverData?.subscriptionStatus || 'ACTIVE',
    tabletHealth: {
      battery: driverData?.device?.batteryLevel || 100,
      gps: driverData?.device?.lastLocation || 'N/A',
      sync: driverData?.device?.syncStatus || '100%',
      lastSeen: driverData?.device?.lastSeen || 'Desconocido',
      hwId: driverData?.device?.deviceId || 'TAD-DRIVER'
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-sans selection:bg-[#fad400] selection:text-black">
      {/* Mobile-First Header */}
      <header className="p-6 pb-2 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-3xl sticky top-0 z-50">
        <div className="space-y-1">
           <p className="text-[10px] font-black text-[#fad400] uppercase tracking-[0.3em]">TAD Driver v2.1</p>
           <h1 className="text-2xl font-black uppercase tracking-tighter">Mi <span className="text-[#fad400]">Panel</span></h1>
        </div>
        <button 
          onClick={logout}
          className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-rose-500/10 transition-colors"
        >
           <LogOut className="w-5 h-5 text-rose-500" />
        </button>
      </header>

      <main className="p-6 space-y-8 pb-32">
        {/* Subscription Lock Warning (402 Simulation) */}
        {stats.subscriptionStatus !== 'ACTIVE' && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-start gap-5"
          >
             <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center flex-shrink-0 animate-pulse">
                <ShieldAlert className="w-6 h-6 text-black" />
             </div>
             <div className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-tight text-rose-500">Suscripción Inactiva</h3>
                <p className="text-[11px] text-rose-500/70 leading-relaxed font-bold uppercase tracking-wide">
                  Tu bono de RD$500 está bloqueado. Paga tu anualidad de RD$6,000 para continuar operando.
                </p>
                <button className="text-[10px] bg-rose-500 text-black px-4 py-2 rounded-xl font-black uppercase tracking-widest mt-2 hover:scale-105 transition-transform active:scale-95">Pagar Ahora</button>
             </div>
          </motion.div>
        )}

        {/* Financial Overview Card */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
             <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Estado Financiero</h4>
             <TrendingUp className="w-4 h-4 text-emerald-500/40" />
          </div>
          
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#fad400]/20 to-emerald-500/20 blur-2xl opacity-40 rounded-[2.5rem]" />
            <div className="relative bg-zinc-900/60 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] space-y-6">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Balance Disponible</p>
                <h2 className="text-4xl font-black tracking-tight">{stats.balance}</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Bono Disponibilidad</p>
                    <p className="text-sm font-black text-emerald-500">{stats.bonus}</p>
                 </div>
                 <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Referidos</p>
                    <p className="text-sm font-black text-[#fad400]">{stats.referralEarned}</p>
                 </div>
              </div>

              <button className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:translate-y-[-2px] transition-transform shadow-xl">
                 <CreditCard className="w-4 h-4" />
                 Solicitar Liquidación
              </button>
            </div>
          </div>
        </section>

        {/* Tablet Status (Real-time Fleet Sync) */}
        <section className="space-y-4">
          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Estado de la Tablet</h4>
          <div className="grid grid-cols-1 gap-4">
             <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-3xl space-y-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center">
                         <Smartphone className="w-6 h-6 text-[#fad400]" />
                      </div>
                      <div>
                         <p className="text-xs font-black uppercase tracking-tighter">{stats.tabletHealth.hwId}</p>
                         <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{stats.tabletHealth.lastSeen}</p>
                      </div>
                   </div>
                   <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                         <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Conectado (4G)</span>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                   <div className="bg-black/20 p-4 rounded-2xl border border-white/[0.03] space-y-2 flex flex-col items-center">
                      <Battery className="w-4 h-4 text-emerald-500" />
                      <p className="text-[10px] font-bold uppercase">{stats.tabletHealth.battery}%</p>
                   </div>
                   <div className="bg-black/20 p-4 rounded-2xl border border-white/[0.03] space-y-2 flex flex-col items-center">
                      <RefreshCw className="w-4 h-4 text-[#fad400] animate-spin-slow" />
                      <p className="text-[10px] font-bold uppercase">{stats.tabletHealth.sync}</p>
                   </div>
                   <div className="bg-black/20 p-4 rounded-2xl border border-white/[0.03] space-y-2 flex flex-col items-center">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <p className="text-[8px] font-bold uppercase text-center leading-none">GPS OK</p>
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* Quick Menu */}
        <div className="grid grid-cols-2 gap-4">
           {[
             { label: 'Referir Anunciante', icon: Award, color: '#fad400' },
             { label: 'Soporte 24/7', icon: Wifi, color: '#fff' }
           ].map((item) => (
             <button key={item.label} className="p-6 bg-zinc-900/30 border border-white/5 rounded-3xl flex flex-col items-center gap-3 active:bg-zinc-800 transition-colors">
                <item.icon className="w-6 h-6" style={{ color: item.color }} />
                <span className="text-[10px] font-black uppercase tracking-tight text-zinc-400">{item.label}</span>
             </button>
           ))}
        </div>
      </main>

      {/* Floating Navigator */}
      <nav className="fixed bottom-8 left-6 right-6 h-20 bg-zinc-900/80 backdrop-blur-4xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-around px-8 z-50">
         <button className="text-[#fad400] group relative flex flex-col items-center gap-1">
            <LayoutDashboard className="w-6 h-6" />
            <div className="absolute -bottom-3 w-1.5 h-1.5 rounded-full bg-[#fad400]" />
         </button>
         <button className="text-zinc-500 hover:text-white transition-colors">
            <Wallet className="w-6 h-6" />
         </button>
         <button className="text-zinc-500 hover:text-white transition-colors">
            <Car className="w-6 h-6" />
         </button>
      </nav>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default DriverDashboard;
