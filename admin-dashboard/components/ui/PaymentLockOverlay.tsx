import React from 'react';
import { Lock, CreditCard, AlertTriangle, ExternalLink } from 'lucide-react';
import { usePaymentStore } from '../../store/usePaymentStore';

export const PaymentLockOverlay: React.FC = () => {
  const { isLocked, message } = usePaymentStore();

  if (!isLocked) return null;

  return (
    <div className="payment-lock-overlay fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md bg-black/80 p-6 animate-in fade-in duration-500">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-red-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden">
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-tad-yellow/5 blur-3xl rounded-full -ml-16 -mb-16" />

        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/50 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
             <Lock className="w-10 h-10 text-red-500" />
          </div>

          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
             Acceso Restringido
          </h2>
          
          <div className="px-4 py-1.5 bg-red-500/20 border border-red-500/50 rounded-full mb-6">
             <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">
                Regla de Negocio 402: Morosidad Detectada
             </p>
          </div>

          <p className="text-gray-400 text-sm font-medium mb-8 leading-relaxed max-w-sm">
             {message || 'Se ha detectado una suscripción pendiente de RD$6,000. El acceso al panel administrativo ha sido suspendido temporalmente.'}
          </p>

          <div className="w-full space-y-4">
             <button 
               className="w-full flex items-center justify-center gap-3 bg-tad-yellow hover:bg-yellow-400 text-black py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-tad-yellow/10"
               onClick={() => window.open('https://tad.do/pagos', '_blank')}
             >
                <CreditCard className="w-4 h-4" />
                Regularizar Suscripción
             </button>

             <button 
               className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white/60 py-4 px-6 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all border border-white/5"
               onClick={() => window.location.reload()}
             >
                <AlertTriangle className="w-4 h-4" />
                Reintentar Verificación
             </button>
          </div>

          <p className="mt-8 text-[9px] font-bold text-gray-600 uppercase tracking-[0.4em]">
             TAD_SECURITY_STALEMATE_PROTOCOL
          </p>
        </div>
      </div>
    </div>
  );
};
