import { useState, useEffect, useRef } from 'react';
import { useAuth, PortalRequestCenter } from '@tad/ui';
import { 
  Car, Wallet, ShieldAlert, Wifi, Battery, MapPin, 
  RefreshCw, Smartphone, TrendingUp, CreditCard, 
  Award, LogOut, LayoutDashboard, Zap, Activity, Users, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import api, { logout } from "@tad/services";
import Link from 'next/link';

export default function DriverDashboard() {
  const { session } = useAuth();
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tool Modal States
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [submittingSupport, setSubmittingSupport] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);

  // Stats derivation
  const performance = driverData?.performance;
  const goal = performance?.goal || 120;
  const currentHours = performance?.hours || 0;
  const progressPercent = Math.min(100, Math.max(0, (currentHours / goal) * 100));
  
  // SVG Ring calculation
  const ringRadius = 24;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (progressPercent / 100) * ringCircumference;

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
      toast.success('Solicitud enviada. TAD te contactará.');
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

  // Telemetry Engine (Batching local & Burst sending)
  useEffect(() => {
    let watchId: number;
    let locationQueue: any[] = [];
    
    // Si no estamos en el navegador o no hay PWA/Navegador con geolocalización, cancelamos
    if (typeof window === 'undefined' || !('geolocation' in navigator) || !session?.user?.id) return;

    const flushQueue = async () => {
      if (locationQueue.length === 0 || !navigator.onLine) return;
      
      const batch = [...locationQueue];
      locationQueue = []; // Clear inmediatamente para no duplicar

      try {
        await api.post('/monitoring/gps-batch', {
          driverId: session.user.id,
          deviceId: driverData?.device?.deviceId || 'PWA',
          points: batch
        });
        console.debug(`[Telemetry] Flushed ${batch.length} points.`);
      } catch (error) {
        // En caso de fallo, reencolar para enviar luego
        locationQueue = [...batch, ...locationQueue];
      }
    };

    // Auto-flush cada 60 segundos
    const flushInterval = setInterval(flushQueue, 60000);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        locationQueue.push({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed || 0,
          heading: position.coords.heading,
          timestamp: new Date(position.timestamp).toISOString()
        });

        // Forzar flush si la cola crece mucho
        if (locationQueue.length >= 20) {
          flushQueue();
        }
      },
      (error) => {
        console.warn('Telemetry error:', error);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    const handleOnline = () => flushQueue();
    window.addEventListener('online', handleOnline);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(flushInterval);
      window.removeEventListener('online', handleOnline);
    };
  }, [session?.user?.id, driverData]);

  if (loading) {
     return (
       <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
          <div className="relative border-t-2 border-tad-cyan w-10 h-10 rounded-full animate-spin"></div>
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
      sync: driverData?.device?.syncStatus || '100%',
      lastSeen: driverData?.device?.lastSeen || 'Visto ahora',
      hwId: driverData?.device?.deviceId || 'UNIT-01',
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white font-sans selection:bg-tad-cyan selection:text-black overflow-x-hidden pt-20">
      {/* Premium HUD Header */}
      <header className="fixed top-0 left-0 right-0 p-5 px-6 border-b border-white/5 flex justify-between items-center bg-[#0B0F1A]/80 backdrop-blur-3xl z-[100]">
        <div className="space-y-1">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-tad-cyan shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
             <p className="text-[10px] font-black text-tad-cyan uppercase tracking-[0.25em]">Telemetry Online</p>
           </div>
           <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
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

      <main className="p-6 space-y-6 pb-32 max-w-lg mx-auto">
        
        {/* Soft Kill-Switch & Alerts UX (Discreet) */}
        <AnimatePresence>
          {stats.subscriptionStatus !== 'ACTIVE' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-5 py-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between shadow-lg backdrop-blur-md"
            >
               <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-500">Servicio Limitado</h3>
                    <p className="text-[9px] text-rose-200 mt-0.5">Regulariza tu anualidad (RD$6k) para pagos.</p>
                  </div>
               </div>
               <button className="text-[9px] bg-rose-500 text-black px-4 py-2 rounded-lg font-black uppercase tracking-widest hover:bg-rose-400">Regularizar</button>
            </motion.div>
          )}

          {driverData?.penaltyStatus?.isAtRisk && (
            <motion.div 
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               className="px-5 py-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center gap-3 backdrop-blur-md animate-pulse"
            >
              <ShieldAlert className="w-5 h-5 text-orange-500 shrink-0" />
              <p className="text-[10px] font-bold text-orange-200 uppercase leading-relaxed">
                Faltan {goal - Math.floor(currentHours)}h para evitar penalidad del 10% en nómina.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Financial HUD & Progress Ring */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-2">
             <div className="space-y-1">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Yield Analytics</h4>
                <div className="h-1 w-12 bg-tad-cyan rounded-full" />
             </div>
             <TrendingUp className="w-4 h-4 text-tad-cyan animate-pulse" />
          </div>
          
          <div className="relative group">
            <div className="absolute top-0 -left-6 w-40 h-40 bg-tad-cyan/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 -right-6 w-40 h-40 bg-tad-purple/10 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="relative glass border-white/5 p-7 rounded-[2.5rem] space-y-7 overflow-hidden shadow-2xl">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className={clsx("w-4 h-4", 
                      driverData?.level === 'ORO' ? 'text-[#FFD700]' : 
                      driverData?.level === 'PLATA' ? 'text-zinc-300' : 'text-orange-400'
                    )} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Nivel {driverData?.level || 'BASE'}
                    </span>
                  </div>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Balance Base (Ads & Referidos)</p>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-4xl font-black tracking-tighter text-white">{stats.balance}</h2>
                  </div>
                </div>

                {/* Circular Progress Ring for 120 Hours Goal */}
                {performance && (
                   <div className="text-right flex flex-col items-center">
                      <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Meta ({goal}h)</p>
                      
                      <div className="relative w-[60px] h-[60px]">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="30" cy="30" r={ringRadius} stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="none" />
                          <circle 
                            cx="30" cy="30" r={ringRadius} 
                            stroke={currentHours >= goal ? '#10b981' : '#00e5ff'} 
                            strokeWidth="4" 
                            fill="none" 
                            strokeLinecap="round"
                            strokeDasharray={ringCircumference} 
                            strokeDashoffset={ringOffset} 
                            className="transition-all duration-1000 ease-out" 
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={clsx("text-xs font-black", currentHours >= goal ? "text-emerald-400" : "text-white")}>
                            {Math.floor(currentHours)}
                          </span>
                        </div>
                      </div>
                   </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-white/[0.02] p-4 rounded-3xl border border-white/5 space-y-1">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Bono Diario</p>
                    <p className="text-base font-black text-tad-cyan">{stats.bonus}</p>
                 </div>
                 <div className="bg-white/[0.02] p-4 rounded-3xl border border-white/5 space-y-1">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Referidos</p>
                    <p className="text-base font-black text-tad-yellow">{stats.referralEarned}</p>
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
                    toast.success('Solicitud enviada a finanzas');
                  } catch (e) {
                    toast.error('Error enviando solicitud');
                  }
                }}
                className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors shadow-lg active:scale-95"
              >
                 <CreditCard className="w-4 h-4" />
                 Solicitar Cierre de Nómina
              </button>
            </div>
          </div>
        </section>

        {/* Hardware Telemetry HUD */}
        <section className="space-y-4">
          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Fleet Link Status</h4>
          <div className="relative">
             <div className="relative bg-zinc-950 border border-white/5 p-6 rounded-[2rem]">
                <div className="flex justify-between items-center mb-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-tad-cyan/5 border border-tad-cyan/10 flex items-center justify-center relative">
                         <Smartphone className="w-5 h-5 text-tad-cyan" />
                      </div>
                      <div>
                         <p className="text-xs font-black uppercase tracking-tight text-white">{stats.tabletHealth.hwId}</p>
                         <p className="text-[8px] font-black text-tad-cyan uppercase tracking-widest mt-1">Conectado</p>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                   {[
                     { icon: Battery, val: `${stats.tabletHealth.battery}%`, label: 'Batería', color: 'text-emerald-400' },
                     { icon: RefreshCw, val: stats.tabletHealth.sync, label: 'Sync', color: 'text-tad-yellow', anim: 'animate-spin-slow' },
                     { icon: MapPin, val: 'Online', label: 'Monitor', color: 'text-tad-cyan' },
                   ].map((item, i) => (
                     <div key={i} className="bg-white/[0.02] py-4 rounded-2xl flex flex-col items-center justify-center border border-white/5">
                        <item.icon className={clsx("w-4 h-4 mb-2", item.color, item.anim)} />
                        <p className="text-[10px] font-black text-white">{item.val}</p>
                        <p className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">{item.label}</p>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </section>

        <PortalRequestCenter 
          portalType="DRIVER" 
          userId={session?.user?.id || ''} 
        />

        <div className="grid grid-cols-2 gap-3">
           <button 
             onClick={() => setShowInviteModal(true)}
             className="p-5 bg-white/[0.02] border border-white/5 rounded-[2rem] flex flex-col items-center gap-2 active:bg-white/[0.05] transition-all hover:border-white/10"
           >
              <Users className="w-6 h-6 text-tad-cyan" />
              <div className="text-center">
                <span className="block text-[9px] font-black uppercase text-white mb-0.5">Invitar Chofer</span>
                <span className="block text-[8px] font-black text-zinc-500">+RD$300</span>
              </div>
           </button>
           <button 
             onClick={() => setShowSupportModal(true)}
             className="p-5 bg-white/[0.02] border border-white/5 rounded-[2rem] flex flex-col items-center gap-2 active:bg-white/[0.05] transition-all hover:border-white/10"
           >
              <Zap className="w-6 h-6 text-tad-yellow" />
              <div className="text-center">
                <span className="block text-[9px] font-black uppercase text-white mb-0.5">Soporte técnico</span>
                <span className="block text-[8px] font-black text-zinc-500">Taller / App</span>
              </div>
           </button>
        </div>
      </main>

      {/* Tool Modals */}
      <AnimatePresence>
        {showSupportModal && (
          <div className="fixed inset-0 z-[200] flex flex-col justify-end p-4 bg-black/80 backdrop-blur-md sm:justify-center items-center">
            <motion.div 
               initial={{ opacity: 0, y: 50 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 50 }}
               className="bg-[#0B0F1A] border border-white/10 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative"
            >
               <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-1">Soporte <span className="text-[#FFD400]">Técnico</span></h3>
               <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-6">¿Problemas con el equipo? Reporta y te contactaremos.</p>
               
               <form onSubmit={handleSupportSubmit} className="space-y-4">
                 <textarea 
                   required
                   value={supportMessage}
                   onChange={e => setSupportMessage(e.target.value)}
                   className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-zinc-700 outline-none focus:border-tad-cyan/50 min-h-[100px] resize-none"
                   placeholder="Mi tablet no enciende..."
                 />
                 <div className="flex gap-2">
                   <button 
                     type="button" 
                     onClick={() => setShowSupportModal(false)}
                     className="flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white/5 text-zinc-400"
                   >Cancelar</button>
                   <button 
                     type="submit" 
                     disabled={submittingSupport}
                     className="flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest bg-tad-yellow text-black disabled:opacity-50"
                   >{submittingSupport ? 'Enviando...' : 'Enviar'}</button>
                 </div>
               </form>
            </motion.div>
          </div>
        )}

        {showInviteModal && (
           <div className="fixed inset-0 z-[200] flex flex-col justify-end p-4 bg-black/80 backdrop-blur-md sm:justify-center items-center">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-[#0B0F1A] border border-white/10 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative text-center"
            >
               <div className="w-14 h-14 rounded-full bg-tad-cyan/10 mx-auto mb-5 flex items-center justify-center border border-tad-cyan/20">
                  <Users className="w-6 h-6 text-tad-cyan" />
               </div>
               <h3 className="text-xl font-black uppercase text-white mb-2">Referidos</h3>
               <p className="text-[9px] text-zinc-400 uppercase tracking-widest mb-6 leading-relaxed">
                 Gana RD$300 por cada chofer activo que invites.
               </p>
               
               <div className="bg-black/50 border border-white/10 rounded-2xl p-4 mb-6">
                  <p className="text-[10px] text-tad-cyan font-mono break-all line-clamp-2">
                     https://tad.do/driver/onboarding?ref={session?.user?.id?.substring(0, 8) || 'tad_usr'}
                  </p>
               </div>

               <div className="flex gap-2">
                 <button onClick={() => setShowInviteModal(false)} className="flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white/5 text-white">Cerrar</button>
                 <button onClick={copyReferral} className="flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest bg-tad-cyan text-black">Copiar Enlace</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Navigator */}
      <nav className="fixed bottom-6 left-6 right-6 h-[72px] bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl flex items-center justify-between px-8 z-[100]">
         <button className="text-tad-cyan group relative flex flex-col items-center justify-center w-12 h-12">
            <LayoutDashboard className="w-5 h-5" />
            <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-tad-cyan shadow-[0_0_10px_rgba(0,229,255,1)]" />
         </button>
         <Link href="/check-in" className="w-14 h-14 bg-tad-cyan rounded-full flex items-center justify-center -mt-8 shadow-[0_0_30px_rgba(0,229,255,0.3)] border-[6px] border-[#0B0F1A] active:scale-95 transition-transform">
            <Activity className="w-6 h-6 text-black" />
         </Link>
         <Link href="/driver/wallet" className="text-zinc-500 hover:text-white transition-colors w-12 h-12 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
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






