import { useState, useEffect } from 'react';
import { useAuth } from '@tad/ui';
import { 
  Car, Wallet, ShieldAlert, Wifi, Battery, MapPin, 
  ChevronRight, RefreshCw, Smartphone, TrendingUp,
  CreditCard, Award, LogOut, LayoutDashboard, Zap, Activity, Users
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PortalRequestCenter } from '@tad/ui';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import api, { logout } from "@tad/services";

import { portal_requests } from '@prisma/client';
import Link from 'next/link';

function DriverDashboard() {
  const { session } = useAuth();
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tool Modal States
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [submittingSupport, setSubmittingSupport] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);

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

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setSubmittingSupport(true);
    try {
      await api.post('/portal-requests', {
        driverId: session?.user?.id,
        type: 'SUPPORT_ISSUE',
        title: 'Soporte Técnico / Taller',
        data: JSON.stringify({ issue: supportMessage }),
      });
      toast.success('Solicitud de soporte enviada correctamente. TAD te contactará pronto.');
      setShowSupportModal(false);
      setSupportMessage('');
    } catch (e) {
      toast.error('Error al enviar la solicitud.');
    } finally {
      setSubmittingSupport(false);
    }
  };

  const copyReferral = () => {
    const link = `https://tad.do/driver/onboarding?ref=${session?.user?.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Enlace de referido copiado al portapapeles');
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
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className={clsx("w-4 h-4", 
                      driverData?.level === 'ORO' ? 'text-[#FFD700]' : 
                      driverData?.level === 'PLATA' ? 'text-zinc-300' : 'text-orange-400'
                    )} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Nivel {driverData?.level || 'BASE'}
                    </span>
                  </div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Balance Total</p>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-5xl font-black tracking-tighter text-white">{stats.balance}</h2>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] mb-1" />
                  </div>
                </div>

                {driverData?.performance && (
                   <div className="text-right">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Meta Mensual</p>
                      <div className="flex flex-col items-end">
                         <span className={clsx("text-lg font-black", 
                           driverData.performance.hours >= driverData.performance.goal ? "text-emerald-400" : "text-tad-cyan"
                         )}>
                           {Math.floor(driverData.performance.hours)}h / {driverData.performance.goal}h
                         </span>
                         <div className="w-24 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-tad-cyan transition-all duration-1000" 
                              style={{ width: `${Math.min(100, (driverData.performance.hours / driverData.performance.goal) * 100)}%` }}
                            />
                         </div>
                      </div>
                   </div>
                )}
              </div>

              {driverData?.penaltyStatus?.isAtRisk && (
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center gap-4 animate-pulse">
                  <ShieldAlert className="text-orange-500 shrink-0 w-6 h-6" />
                  <p className="text-[10px] font-bold text-orange-200/80 uppercase leading-relaxed">
                    ALERTA: Te faltan {driverData.performance.goal - Math.floor(driverData.performance.hours)}h para evitar la penalización de nómina del 10%.
                  </p>
                </div>
              )}
              
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
           <PortalRequestCenter 
             portalType="DRIVER" 
             userId={session?.user?.id || ''} 
           />

        {/* Strategic Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
           <button 
             onClick={() => setShowInviteModal(true)}
             className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col items-center gap-2 active:bg-white/[0.05] transition-all hover:border-white/10 group"
           >
              <Users className="w-6 h-6 transition-transform group-hover:scale-110 text-[#00E5FF]" />
              <div className="text-center">
                <span className="block text-[10px] font-black uppercase tracking-tight text-white mb-0.5">Invitar Chofer</span>
                <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-500">+RD$300</span>
              </div>
           </button>
           <button 
             onClick={() => setShowSupportModal(true)}
             className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col items-center gap-2 active:bg-white/[0.05] transition-all hover:border-white/10 group"
           >
              <Zap className="w-6 h-6 transition-transform group-hover:scale-110 text-[#FFD400]" />
              <div className="text-center">
                <span className="block text-[10px] font-black uppercase tracking-tight text-white mb-0.5">Soporte Técnico</span>
                <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-500">Taller / App</span>
              </div>
           </button>
        </div>
      </main>

      {/* Tool Modals */}
      <AnimatePresence>
        {showSupportModal && (
          <div className="fixed inset-0 z-[200] flex flex-col justify-end p-4 bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center">
            <motion.div 
               initial={{ opacity: 0, y: 100 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 100 }}
               className="bg-[#0B0F1A] border border-white/10 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative"
            >
               <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Soporte <span className="text-[#FFD400]">Técnico</span></h3>
               <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-6 leading-relaxed">
                 ¿Tienes problemas con la pantalla, la app, o necesitas mantenimiento táctico? Escribe el detalle abajo.
               </p>
               <form onSubmit={handleSupportSubmit} className="space-y-4">
                 <textarea 
                   required
                   value={supportMessage}
                   onChange={e => setSupportMessage(e.target.value)}
                   className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFD400]/50 min-h-[120px] resize-none"
                   placeholder="Ej: La tablet no enciende desde esta mañana..."
                 />
                 <div className="flex gap-3">
                   <button 
                     type="button" 
                     onClick={() => setShowSupportModal(false)}
                     className="flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 text-zinc-400 hover:bg-white/10 transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     type="submit" 
                     disabled={submittingSupport}
                     className="flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#FFD400] text-black hover:bg-white transition-colors disabled:opacity-50"
                   >
                     {submittingSupport ? 'Enviando...' : 'Enviar Reporte'}
                   </button>
                 </div>
               </form>
            </motion.div>
          </div>
        )}

        {showInviteModal && (
           <div className="fixed inset-0 z-[200] flex flex-col justify-end p-4 bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-[#0B0F1A] border border-white/10 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative text-center"
            >
               <div className="w-16 h-16 rounded-full bg-[#00E5FF]/10 mx-auto mb-6 flex items-center justify-center border border-[#00E5FF]/20">
                  <Users className="w-8 h-8 text-[#00E5FF]" />
               </div>
               <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Programa de <span className="text-[#00E5FF]">Referidos</span></h3>
               <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-6 leading-relaxed">
                 Gana RD$300 por cada chofer activo que invites a la flota de TAD. Copia tu enlace y envíaselo por WhatsApp.
               </p>
               
               <div className="bg-black/50 border border-white/10 rounded-2xl p-4 mb-6 select-all">
                  <p className="text-xs text-[#00E5FF] font-mono break-all line-clamp-2">
                     https://tad.do/driver/onboarding?ref={session?.user?.id?.substring(0, 8) || 'tad_usr'}
                  </p>
               </div>

               <div className="flex gap-3">
                 <button 
                   type="button" 
                   onClick={() => setShowInviteModal(false)}
                   className="w-1/3 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 text-zinc-400 hover:bg-white/10 transition-colors"
                 >
                   Cerrar
                 </button>
                 <button 
                   onClick={copyReferral}
                   className="w-2/3 flex items-center justify-center gap-2 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#00E5FF] text-black hover:bg-white transition-colors"
                 >
                   Copiar Enlace
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Orbital Navigator */}
      <nav className="fixed bottom-8 left-6 right-6 h-22 bg-zinc-950/80 backdrop-blur-4xl border border-white/10 rounded-[2.5rem] shadow-[0_25px_50px_rgba(0,0,0,0.8)] flex items-center justify-around px-8 z-[100]">
         <button className="text-tad-cyan group relative flex flex-col items-center gap-1">
            <LayoutDashboard className="w-6 h-6" />
            <div className="absolute -bottom-4 w-2 h-2 rounded-full bg-tad-cyan shadow-[0_0_15px_rgba(0,229,255,1)]" />
         </button>
         <Link href="/check-in" className="w-14 h-14 bg-tad-cyan rounded-2xl flex items-center justify-center -mt-12 shadow-[0_0_40px_rgba(0,229,255,0.4)] border-4 border-[#0B0F1A] active:scale-90 transition-transform">
            <Activity className="w-6 h-6 text-black" />
         </Link>
         <Link href="/driver/wallet" className="text-zinc-500 hover:text-white transition-colors">
            <Wallet className="w-6 h-6" />
         </Link>
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

export default DriverDashboard;





