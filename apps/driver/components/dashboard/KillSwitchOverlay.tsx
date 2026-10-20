import React from "react";
import { ShieldAlert, MessageCircle, PhoneCall } from "lucide-react";

interface LockdownOverlayProps {
  isVisible: boolean;
}

export const KillSwitchOverlay: React.FC<LockdownOverlayProps> = ({
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col p-6 overflow-y-auto">
      <div className="flex flex-col items-center mt-12 mb-10">
        <ShieldAlert size={80} className="text-[#EF4444] mb-6" />
        <h1 className="text-white text-4xl font-black tracking-tighter text-center leading-none mb-4">
          CUOTA NO PAGADA
        </h1>
        <p className="text-neutral-400 text-center font-bold text-lg leading-snug">
          Tu cuenta ha sido bloqueada. Regulariza tu pago de{" "}
          <span className="text-white">RD$ 6,000</span> para seguir generando
          ganancias.
        </p>
      </div>

      <div className="space-y-4 mt-auto mb-8">
        <a
          href="https://wa.me/18495043872"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-3 bg-[#FFD400] text-black h-20 rounded-none font-black text-xl uppercase tracking-tighter active:bg-[#e6bf00]"
        >
          <MessageCircle size={24} />
          Pagar vía WhatsApp
        </a>

        <a
          href="tel:+18495043872"
          className="w-full flex items-center justify-center gap-3 bg-white text-black h-20 rounded-none font-black text-xl uppercase tracking-tighter active:bg-neutral-200"
        >
          <PhoneCall size={24} />
          Llamar a Soporte
        </a>

        <p className="text-neutral-600 text-[10px] text-center font-bold uppercase tracking-widest">
          Tus datos acumulados están a salvo localmente.
        </p>
      </div>
    </div>
  );
};
