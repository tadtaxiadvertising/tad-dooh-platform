'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Zap, ArrowRight, Truck, ShieldCheck, Calendar, MapPin } from 'lucide-react';

interface SuccessStepProps {
  onContinue: () => void;
  driverData?: {
    fullName: string;
    taxiPlate: string;
  };
}

export default function SuccessStep({ onContinue, driverData }: SuccessStepProps) {
  return (
    <motion.div
      className="flex-1 flex flex-col items-center justify-center text-center py-10"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Pulsing Circle */}
      <motion.div className="relative mb-8">
        <motion.div
          className="absolute inset-0 w-32 h-32 border-2 border-[#FDCB01]/20 rounded-full"
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-0 w-32 h-32 border border-[#FDCB01]/10 rounded-full scale-125"
          animate={{ scale: [1.25, 1.5, 1.25], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: 0.5 }}
        />
        <motion.div
          className="w-32 h-32 bg-[#FDCB01]/10 rounded-full flex items-center justify-center"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, duration: 0.8, type: 'spring', stiffness: 180, damping: 15 }}
        >
          <CheckCircle2 className="w-16 h-16 text-[#FDCB01]" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <h1 className="text-[28px] font-black text-white uppercase tracking-tight leading-tight mb-3">
          ¡Tu registro{' '}
          <br />
          se completó!
        </h1>
        <p className="text-sm text-gray-400 max-w-[300px] leading-relaxed mb-8">
          Hemos recibido tus datos con éxito. En breve nos comunicaremos contigo para programar la entrega e instalación de la pantalla en tu vehículo.
        </p>
      </motion.div>

      {/* Status Card */}
      <motion.div
        className="w-full bg-black/60 rounded-2xl p-5 border border-white/5 text-left font-mono space-y-2 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <motion.div
          className="flex items-center gap-3 p-3 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-xl"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <ShieldCheck className="w-5 h-5 text-[#22C55E] shrink-0" />
          <div>
            <p className="text-[10px] font-black text-[#22C55E] uppercase tracking-wider">Cuenta de socio conductor activa</p>
            <p className="text-[9px] text-gray-500">{driverData?.fullName || 'Conductor registrado'}</p>
          </div>
        </motion.div>

        <motion.div
          className="flex items-center gap-3 p-3 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-xl"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <Truck className="w-5 h-5 text-[#22C55E] shrink-0" />
          <div>
            <p className="text-[10px] font-black text-[#22C55E] uppercase tracking-wider">Datos del taxi registrados</p>
            <p className="text-[9px] text-gray-500">Placa: {driverData?.taxiPlate || 'T-XXX'}</p>
          </div>
        </motion.div>

        <motion.div
          className="flex items-center gap-3 p-3 bg-[#FDCB01]/10 border border-[#FDCB01]/20 rounded-xl"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9, duration: 0.4 }}
        >
          <Calendar className="w-5 h-5 text-[#FDCB01] shrink-0" />
          <div>
            <p className="text-[10px] font-black text-[#FDCB01] uppercase tracking-wider animate-pulse">Coordinando fecha de entrega</p>
            <p className="text-[9px] text-gray-500">Instalación en 3-5 días hábiles</p>
          </div>
        </motion.div>

        <motion.div
          className="flex items-center gap-3 p-3 bg-[#FF8C00]/10 border border-[#FF8C00]/20 rounded-xl"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.0, duration: 0.4 }}
        >
          <MapPin className="w-5 h-5 text-[#FF8C00] shrink-0" />
          <div>
            <p className="text-[10px] font-black text-[#FF8C00] uppercase tracking-wider">Zona de cobertura asignada</p>
            <p className="text-[9px] text-gray-500">Santo Domingo Metro - Rutas prioritarias</p>
          </div>
        </motion.div>

        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <Zap className="w-3 h-3 text-[#FDCB01]" />
          <span className="text-[9px] font-black text-white uppercase tracking-widest font-sans">TAD Flota Dominicana</span>
        </div>
      </motion.div>

      {/* Next Steps Preview */}
      <motion.div
        className="w-full max-w-xs bg-zinc-900/40 border border-white/5 rounded-2xl p-5 mb-8 text-left"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.5 }}
      >
        <p className="text-[10px] font-black text-[#FDCB01] uppercase tracking-widest mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          Próximos pasos
        </p>
        <div className="space-y-3 text-[11px] text-gray-300">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#FDCB01] text-black flex items-center justify-center text-[10px] font-black shrink-0">1</div>
            <span>Llamada de confirmación en <span className="font-bold text-white">24h</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-white/10 text-gray-400 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
            <span>Agendar instalación <span className="font-bold text-white">(3-5 días)</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-white/10 text-gray-400 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
            <span>Activación de pantalla y <span className="font-bold text-[#22C55E]">primeros RD$500</span></span>
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.button
        onClick={onContinue}
        className="w-full bg-[#FDCB01] hover:bg-white text-black font-black uppercase tracking-[0.15em] text-sm py-5 rounded-2xl transition-all shadow-[0_10px_40px_rgba(253,203,1,0.15)] active:scale-[0.97] flex items-center justify-center gap-3"
        whileHover={{ scale: 1.02, boxShadow: '0 15px 50px rgba(253,203,1,0.25)' }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <span>IR A INICIAR SESIÓN</span>
        <ArrowRight className="w-5 h-5" />
      </motion.button>
    </motion.div>
  );
}