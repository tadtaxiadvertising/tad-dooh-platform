"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Zap, ArrowRight } from "lucide-react";

interface SuccessStepProps {
  onContinue: () => void;
  campaignData?: {
    companyName: string;
    screens: number;
    months: number;
    budget: number | null;
    impressions: number;
  };
}

export default function SuccessStep({
  onContinue,
  campaignData,
}: SuccessStepProps) {
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
          className="absolute inset-0 w-28 h-28 border-2 border-[#FDCB01]/25 rounded-full"
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-0 w-28 h-28 border border-[#FDCB01]/15 rounded-full scale-125"
          animate={{ scale: [1.25, 1.5, 1.25], opacity: [0.3, 0, 0.3] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
            delay: 0.5,
          }}
        />
        <motion.div
          className="w-28 h-28 bg-[#FDCB01]/10 rounded-full grid place-items-center"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            type: "spring",
            stiffness: 180,
            damping: 15,
          }}
        >
          <CheckCircle2 className="w-14 h-14 text-[#FDCB01]" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <h1 className="text-[26px] sm:text-4xl font-black text-white uppercase tracking-tight leading-tight mb-3">
          Tu solicitud <br />
          <span className="text-[#FDCB01]">fue registrada</span>
        </h1>
        <p className="text-sm text-[#AAAAAA] max-w-[320px] leading-relaxed mb-8">
          Registramos tu solicitud. Tu cuenta está pendiente de revisión y tu
          campaña permanecerá inactiva hasta completar las aprobaciones y el
          pago correspondiente.
        </p>
      </motion.div>

      {/* Campaign Summary Card */}
      <motion.div
        className="w-full bg-black/60 rounded-xl p-5 sm:p-6 border border-white/10 text-left space-y-2 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <motion.div
          className="flex justify-between items-center mb-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40">
            Resumen de registro
          </span>
          <motion.span
            className="bg-[#FDCB01]/10 text-[#FDCB01] text-[9px] px-2 py-1 rounded-full font-bold uppercase tracking-wider"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.8,
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
          >
            Pendiente de revisión y pago
          </motion.span>
        </motion.div>

        <motion.p
          className="text-white font-bold text-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          {campaignData?.companyName || "Empresa registrada"}
        </motion.p>

        <motion.p
          className="text-xs text-[#AAAAAA]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.4 }}
        >
          {campaignData?.screens || 0} pantallas · {campaignData?.months || 0}{" "}
          mes{campaignData?.months !== 1 ? "es" : ""} ·{" "}
          {campaignData?.impressions?.toLocaleString() || "0"} impactos
          estimados
        </motion.p>

        <motion.div
          className="mt-3 pt-3 border-t border-white/[0.06] flex justify-between items-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.4 }}
        >
          <span className="text-xs text-[#AAAAAA]">
            Subtotal registrado (sin ITBIS):
          </span>
          {campaignData?.budget != null ? (
            <span className="text-xl font-black text-white tabular-nums">
              RD$ {campaignData.budget.toLocaleString("es-DO")}
            </span>
          ) : (
            <span className="text-sm font-semibold text-[#FDCB01] text-right">
              Pendiente de confirmación
            </span>
          )}
        </motion.div>

        <motion.div
          className="flex items-center gap-2 pt-3 border-t border-white/[0.06]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.4 }}
        >
          <Zap className="w-3 h-3 text-[#FDCB01]" />
          <span className="text-[9px] font-black text-white uppercase tracking-widest">
            Red DOOH · Flota Dominicana
          </span>
        </motion.div>
      </motion.div>

      {campaignData?.budget == null && (
        <p role="status" className="mb-6 text-sm text-[#AAAAAA]">
          No pudimos confirmar el importe en la respuesta del registro. Consulta
          el estado de tu solicitud en el portal sin volver a registrarte.
        </p>
      )}

      {/* Next Steps */}
      <motion.div
        className="w-full max-w-xs bg-zinc-900/40 border border-white/5 rounded-2xl p-5 mb-8 text-left"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.5 }}
      >
        <p className="text-[10px] font-black text-[#FDCB01] uppercase tracking-widest mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          Próximos pasos
        </p>
        <div className="space-y-3 text-[11px] text-gray-300">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#FDCB01] text-black flex items-center justify-center text-[10px] font-black shrink-0">
              1
            </div>
            <span>Revisión de la solicitud por el equipo TAD</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-white/10 text-gray-400 flex items-center justify-center text-[10px] font-black shrink-0">
              2
            </div>
            <span>Validación de creatividades y confirmación de pago</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-white/10 text-gray-400 flex items-center justify-center text-[10px] font-black shrink-0">
              3
            </div>
            <span>
              Activación en{" "}
              <span className="font-bold text-[#22C55E]">
                pantallas en ruta
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-white/10 text-gray-400 flex items-center justify-center text-[10px] font-black shrink-0">
              4
            </div>
            <span>
              Primer reporte de{" "}
              <span className="font-bold text-[#FDCB01]">
                impresiones reales
              </span>
            </span>
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.button
        onClick={onContinue}
        className="w-full min-h-[52px] bg-[#FDCB01] hover:bg-white text-black font-black uppercase tracking-[0.12em] text-sm py-4 rounded-xl transition-all active:scale-[0.98] shadow-[0_0_44px_rgba(253,203,1,0.28)] flex items-center justify-center gap-3"
        whileHover={{
          scale: 1.02,
          boxShadow: "0 10px 50px rgba(253,203,1,0.4)",
        }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.5 }}
      >
        <span>Ir a iniciar sesión</span>
        <ArrowRight className="w-5 h-5" />
      </motion.button>
    </motion.div>
  );
}
