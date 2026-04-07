import { useState, useEffect } from 'react';
import { useAuth } from '@tad/ui';
import { 
  Car, Wallet, ShieldAlert, Wifi, Battery, MapPin, 
  ChevronRight, RefreshCw, Smartphone, TrendingUp,
  CreditCard, Award, LogOut, LayoutDashboard, Zap, Activity
} from 'lucide-react';
import { PortalRequestCenter } from '@tad/ui';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import api, { logout } from "@tad/services";

function DriverDashboard() {
  const { session } = useAuth();
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const response = await api.get('/drivers/me/hub');
      setDriverData(response.data);
    } catch (error) {
      console.error('Failed to load driver data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
     return (
       <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <RefreshCw className="w-10 h-10 text-tad-cyan animate-spin" />
            <div className="absolute inset-0 blur-xl bg-tad-cyan/40 animate-pulse" />
          </div>
          <p className="text-[10px] font-black text-tad-cyan uppercase tracking-[0.4em]">Iniciando Hub...</p>
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
      lastSeen: driverData?.device?.lastSeen || 'Visto ahora',
      hwId: driverData?.device?.deviceId || 'UNIT-01',
      isOnline: driverData?.device?.isOnline ?? true
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white font-sans selection:bg-tad-cyan selection:text-black overflow-x-hidden">
      {/* Premium HUD Header */}
      <header className="p-6 pb-4 border-b border-white/5 flex justify-between items-center bg-zinc-950/40 backdrop-blur-3xl sticky top-0 z-[100]">
        <div className="space-y-1">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-tad-cyan shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
             <p className="text-[10px] font-black text-tad-cyan uppercase tracking-[0.25em]">Network Online</p>
           </div>
           <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
             TAD <span className="text-tad-yellow">DRIVER</span>
           </h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadData}
            disabled={refreshing}
            className={clsx(
              "w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center transition-all active:scale-95",
              refreshing && "opacity-50"
            )}
          >
             <RefreshCw className={clsx("w-4 h-4 text-zinc-400", refreshing && "animate-spin")} />
          </button>
          <button 
            onClick={logout}
            className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500/20 transition-colors"
          >
             <LogOut className="w-4 h-4 text-rose-500" />
          </button>
        </div>
      </header>

      <main className="p-6 space-y-10 pb-32 max-w-lg mx-auto">
        {/* Alerts Section */}
        <AnimatePresence>
          {stats.subscriptionStatus !== 'ACTIVE' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex items-start gap-5 relative overflow-hidden group"
            >
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <ShieldAlert className="w-24 h-24 text-rose-500 -mr-8 -mt-8 rotate-12" />
               </div>
               <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/20">
                  <Activity className="w-6 h-6 text-black" />
               </div>
               <div className="space-y-2 relative z-10">
                  <h3 className="text-xs font-black uppercase tracking-widest text-rose-500">Service Interrupted</h3>
                  <p className="text-[11px] text-rose-100/70 leading-relaxed font-bold uppercase tracking-wide">
                    Tu acceso a bonos está suspendido. Regulariza tu anualidad (RD$6,000) para desbloquear pagos.
                  </p>
                  <button className="text-[10px] bg-rose-500 text-black px-6 py-2.5 rounded-xl font-black uppercase tracking-widest mt-3 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all active:scale-95">Pagar RD$6,000</button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Financial HUD */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-2">
             <div className="space-y-1">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Yield Analytics</h4>
                <div className="h-1 w-12 bg-tad-cyan rounded-full" />
             </div>
             <TrendingUp className="w-4 h-4 text-tad-cyan animate-pulse" />
          </div>
          
          <div className="relative group">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 -left-4 w-32 h-32 bg-tad-cyan/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 -right-4 w-32 h-32 bg-tad-purple/10 blur-[60px] rounded-full pointer-events-none" />
            
            <div className="relative glass border-white/5 p-8 rounded-[2.5rem] space-y-8 overflow-hidden">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Balance Total</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-5xl font-black tracking-tighter text-white">{stats.balance}</h2>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] mb-1" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 space-y-1 group/stat transition-all hover:bg-white/[0.05]">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Bono Diario</p>
                    <p className="text-lg font-black text-tad-cyan">{stats.bonus}</p>
                 </div>
                 <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 space-y-1 group/stat transition-all hover:bg-white/[0.05]">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Referidos</p>
                    <p className="text-lg font-black text-tad-yellow">{stats.referralEarned}</p>
                 </div>
              </div>

              <button 
                onClick={async () => {
                  try {
                    await api.post('/portal-requests', {
                      driverId: session?.user?.id,
                      type: 'PAYOUT',
                      title: 'Payout Request',
                      data: JSON.stringify({ amount: stats.balance }),
                    });
                    toast.success('Solicitud de liquidación enviada');
                  } catch (e) {
                    toast.error('Error enviando solicitud');
                  }
                }}
                className="w-full bg-white text-black py-4.5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:translate-y-[-2px] transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] active:scale-[0.98]"
              >
                 <CreditCard className="w-4 h-4" />
                 Transferir a mi cuenta
              </button>
            </div>
          </div>
        </section>

        {/* Hardware Telemetry HUD */}
        <section className="space-y-4">
          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Fleet Deployment Telemetry</h4>
          <div className="relative">
             <div className="absolute inset-0 bg-tad-cyan/[0.01] rounded-[2.5rem] border border-tad-cyan/5" />
             <div className="relative glass-cyan border-tad-cyan/10 p-7 rounded-[2.5rem] space-y-8">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-tad-cyan/10 border border-tad-cyan/20 flex items-center justify-center relative">
                         <Smartphone className="w-7 h-7 text-tad-cyan" />
                         <div className="absolute inset-0 bg-tad-cyan/10 animate-ping rounded-2xl opacity-20" />
                      </div>
                      <div>
                         <p className="text-sm font-black uppercase tracking-tight text-white mb-0.5">{stats.tabletHealth.hwId}</p>
                         <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-tad-cyan shadow-[0_0_5px_rgba(0,229,255,0.8)]" />
                           <p className="text-[9px] font-black text-tad-cyan uppercase tracking-widest">Active Link</p>
                         </div>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-zinc-500 mb-0.5">Last Sync</p>
                      <p className="text-[11px] font-black text-white uppercase">{stats.tabletHealth.lastSeen}</p>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                   {[
                     { icon: Battery, val: `${stats.tabletHealth.battery}%`, label: 'Battery', color: 'text-emerald-400' },
                     { icon: RefreshCw, val: stats.tabletHealth.sync, label: 'Sync', color: 'text-tad-yellow', anim: 'animate-spin-slow' },
                     { icon: MapPin, val: 'Online', label: 'GPS', color: 'text-tad-cyan' },
                   ].map((item, i) => (
                     <div key={i} className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2 flex flex-col items-center">
                        <item.icon className={clsx("w-4 h-4", item.color, item.anim)} />
                        <div className="text-center">
                           <p className="text-[10px] font-black text-white">{item.val}</p>
                           <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{item.label}</p>
                        </div>
                     </div>
                   ))}
                </div>

                <div className="pt-2">
                  <div className="w-full h-1 bg-white/[0.03] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2 }}
                      className="h-full bg-gradient-to-r from-tad-cyan to-tad-purple" 
                    />
                  </div>
                </div>
             </div>
          </div>
        </section>

        {/* Requests Center */}
        <section>
           <PortalRequestCenter 
             portalType="DRIVER" 
             userId={session?.user?.id} 
           />
        </section>

        {/* Strategic Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
           {[
             { label: 'Invite Driver', icon: Users, color: '#00E5FF', sub: '+RD$300' },
             { label: 'Support HUD', icon: Zap, color: '#FFD400', sub: 'Instant' }
           ].map((item) => (
             <button key={item.label} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col items-center gap-2 active:bg-white/[0.05] transition-all hover:border-white/10 group">
                <item.icon className="w-6 h-6 transition-transform group-hover:scale-110" style={{ color: item.color }} />
                <div className="text-center">
                  <span className="block text-[10px] font-black uppercase tracking-tight text-white mb-0.5">{item.label}</span>
                  <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-500">{item.sub}</span>
                </div>
             </button>
           ))}
        </div>
      </main>

      {/* Floating Orbital Navigator */}
      <nav className="fixed bottom-8 left-6 right-6 h-22 bg-zinc-950/80 backdrop-blur-4xl border border-white/10 rounded-[2.5rem] shadow-[0_25px_50px_rgba(0,0,0,0.8)] flex items-center justify-around px-8 z-[100]">
         <button className="text-tad-cyan group relative flex flex-col items-center gap-1">
            <LayoutDashboard className="w-6 h-6" />
            <div className="absolute -bottom-4 w-2 h-2 rounded-full bg-tad-cyan shadow-[0_0_15px_rgba(0,229,255,1)]" />
         </button>
         <button className="w-14 h-14 bg-tad-cyan rounded-2xl flex items-center justify-center -mt-12 shadow-[0_0_40px_rgba(0,229,255,0.4)] border-4 border-[#0B0F1A] active:scale-90 transition-transform">
            <Activity className="w-6 h-6 text-black" />
         </button>
         <button className="text-zinc-500 hover:text-white transition-colors">
            <Wallet className="w-6 h-6" />
         </button>
      </nav>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default DriverDashboard;ard;





