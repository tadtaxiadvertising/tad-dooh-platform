import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface KillSwitchOverlayProps {
  isVisible: boolean;
}

export const KillSwitchOverlay: React.FC<KillSwitchOverlayProps> = ({ isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="flex flex-col items-center max-w-sm"
          >
            <div className="w-24 h-24 bg-[#FFD400]/10 rounded-full flex items-center justify-center mb-8">
              <ShieldAlert size={48} className="text-[#FFD400]" />
            </div>

            <h1 className="text-white text-3xl font-bold mb-4 tracking-tight">
              Suscripción Pendiente
            </h1>

            <p className="text-neutral-400 text-lg leading-relaxed mb-10">
              Para seguir generando ganancias con TAD, por favor regulariza el pago de tu suscripción (RD$ 6,000). Tu app se reactivará automáticamente.
            </p>

            <button className="w-full py-5 bg-[#FFD400] text-black font-black text-lg rounded-2xl shadow-[0_0_40px_rgba(255,212,0,0.3)] active:scale-95 transition-transform">
              PAGAR SUSCRIPCIÓN
            </button>
            
            <button className="mt-6 text-neutral-500 font-bold text-sm uppercase tracking-widest hover:text-white transition-colors">
              Reportar un problema
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
