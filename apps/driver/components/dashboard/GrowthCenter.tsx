import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface GrowthCenterProps {
  referralUrl: string;
  referralCode: string;
  onShare: () => void;
  advertiserReferrals: {
    advertisers: Array<{
      id: string;
      companyName: string;
      createdAt: string;
      _count: { campaigns: number };
      referrer?: { fullName: string } | null;
    }>;
    totalBonus: number;
    count: number;
  } | null;
  advertiserReferralsLoading: boolean;
}

export function GrowthCenter({
  referralUrl,
  referralCode,
  onShare,
  advertiserReferrals,
  advertiserReferralsLoading,
}: GrowthCenterProps) {
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

      {/* Anunciantes referidos */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-400">Anunciantes referidos</p>
          {advertiserReferralsLoading ? (
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-[#FFD400] animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-[#FFD400] animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 rounded-full bg-[#FFD400] animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          ) : advertiserReferrals && advertiserReferrals.count > 0 ? (
            <span className="text-xs font-bold text-emerald-400">
              {advertiserReferrals.count} registrado{advertiserReferrals.count !== 1 ? 's' : ''} · RD${advertiserReferrals.totalBonus.toLocaleString('es-DO')} ganado
            </span>
          ) : null}
        </div>

        {advertiserReferralsLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-700 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 rounded bg-zinc-700 animate-pulse" />
                  <div className="h-2.5 w-1/2 rounded bg-zinc-800 animate-pulse" />
                </div>
                <div className="h-3 w-12 rounded bg-zinc-700 animate-pulse" />
              </div>
            ))}
          </div>
        ) : !advertiserReferrals || advertiserReferrals.count === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col items-center justify-center gap-2 text-center">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-xs font-medium text-zinc-400 max-w-[200px]">
              Aún no tienes anunciantes referidos. Comparte tu enlace con empresas locales.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 max-h-60 overflow-y-auto">
            {advertiserReferrals.advertisers.slice(0, 5).map((adv) => (
              <div key={adv.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-colors">
                <div className="w-8 h-8 rounded-full bg-[#FFD400]/20 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{adv.companyName}</p>
                  <p className="text-[10px] text-zinc-500">
                    {adv._count.campaigns > 0
                      ? `Campaña activa${adv._count.campaigns > 1 ? 's' : ''} · Desde ${new Date(adv.createdAt).toLocaleDateString('es-DO')}`
                      : `Registrado ${new Date(adv.createdAt).toLocaleDateString('es-DO')}`}
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-400 whitespace-nowrap">
                  +RD$500
                </span>
              </div>
            ))}
            {advertiserReferrals.count > 5 && (
              <p className="text-[10px] text-zinc-600 text-center pt-1">
                +{advertiserReferrals.count - 5} más
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
