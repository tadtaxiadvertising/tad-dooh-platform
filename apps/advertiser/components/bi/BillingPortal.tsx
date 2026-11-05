import React from "react";
import { CreditCard } from "lucide-react";

interface BillingPortalProps {
  data?: {
    balance?: number;
    financials?: { latestInvoice?: { date?: string } };
  };
}

export function BillingPortal({ data }: BillingPortalProps) {
  return (
    <section
      aria-label="Billing & Finance"
      className="rounded-3xl border border-white/[0.12] bg-white/[0.08] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop-blur-md transition-all duration-300 hover:scale-[1.005]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-black/30">
            <CreditCard
              className="animate-float h-4 w-4 text-[#FFD400]"
              style={{ filter: "drop-shadow(0 0 8px rgba(255,212,0,0.5))" }}
            />
          </span>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-300">
            Billing & Finance
          </h3>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          </span>
          Live sync
        </span>
      </div>

      <p className="mt-4 font-mono text-4xl font-black leading-none tracking-tighter text-white md:text-5xl">
        RD$ {data?.balance?.toLocaleString("es-DO") || "0.00"}
      </p>
      <p className="mt-1 text-xs text-zinc-400">
        Balance disponible para campañas activas y programadas
      </p>

      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.15] bg-black/20 p-4 transition-colors duration-300 hover:border-emerald-500/30">
          <p className="text-[10px] uppercase tracking-wider text-zinc-400">
            Next Invoice
          </p>
          <p
            className="text-xl font-black text-emerald-400"
            style={{ textShadow: "0 0 18px rgba(16,185,129,0.25)" }}
          >
            Al Día
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.15] bg-black/20 p-4 transition-colors duration-300 hover:border-[#FFD400]/30">
          <p className="text-[10px] uppercase tracking-wider text-zinc-400">
            Último Pago
          </p>
          <p className="truncate text-xl font-black text-white">
            {data?.financials?.latestInvoice?.date || "Sin registros"}
          </p>
        </div>
      </div>

      <p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-neutral-600">
        Full billing portal module pending implementation
      </p>
    </section>
  );
}
