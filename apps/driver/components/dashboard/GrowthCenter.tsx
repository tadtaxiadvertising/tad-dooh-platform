import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface GrowthCenterProps {
  referralUrl: string;
  referralCode: string;
  onShare: () => void;
}

export function GrowthCenter({ referralUrl, referralCode, onShare }: GrowthCenterProps) {
  return (
    <section className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md p-5 shadow-[0_10px_40px_rgba(0,0,0,0.25)] transition-all duration-300 hover:scale-[1.02]">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300">Growth Center</p>
      <h3 className="mt-2 text-xl font-black text-white">Invita y escala tus ingresos</h3>

      <div className="mt-4 rounded-3xl border border-white/20 bg-black/25 p-4 flex flex-col items-center gap-3">
        <QRCodeSVG value={referralUrl} size={150} bgColor="transparent" fgColor="#ffffff" level="M" includeMargin />
        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Código: {referralCode}</p>
      </div>

      <button
        type="button"
        onClick={onShare}
        className="mt-4 w-full rounded-2xl bg-[#FFD400] px-4 py-3 text-sm font-black uppercase tracking-[0.15em] text-black transition-all duration-300 hover:scale-[1.02]"
      >
        Compartir referido
      </button>
    </section>
  );
}
