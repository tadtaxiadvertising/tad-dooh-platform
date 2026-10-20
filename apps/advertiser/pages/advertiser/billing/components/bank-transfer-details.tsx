"use client";

import { useState } from "react";
import type { PaymentRequestPayload } from "@/lib/payment-types";

export interface BankTransferDetailsProps {
  accountId: string;
  totalRD: number;
  onBack: () => void;
}

export default function BankTransferDetails({
  accountId,
  totalRD,
  onBack,
}: BankTransferDetailsProps) {
  const [copied, setCopied] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submit = async () => {
    (await {
      accountId,
      amountRD: totalRD,
      method: "bank_transfer",
      currency: "DOP",
      items: [
        { id: "sub_annual", name: "Suscripción Anual TAD", amountRD: 6000 },
      ],
    }) as PaymentRequestPayload;
    // handled by parent after user returns with transfer proof
  };

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h2 className="text-2xl font-black uppercase italic mb-2">
          Transferencia Bancaria
        </h2>
        <p className="text-zinc-500 text-sm">
          Realiza la transferencia y sube el comprobante para habilitar tu
          suscripción.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
              Beneficiario
            </p>
            <p className="text-sm font-bold text-white">
              TAD Taxi Advertising SRL
            </p>
          </div>
          <button
            onClick={() => copy("TAD Taxi Advertising SRL")}
            className="text-xs text-zinc-500 hover:text-[#FFD700] uppercase tracking-widest flex items-center gap-1"
          >
            {copied ? "¡Copiado!" : "Copiar"}
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
        <div className="h-px bg-white/5" />
        <div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
            Banco
          </p>
          <p className="text-sm font-bold text-white">Banco Popular</p>
        </div>
        <div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
            Número de cuenta
          </p>
          <div className="flex items-center gap-3">
            <code className="text-[#FFD700] text-sm font-mono bg-black/40 px-3 py-1 rounded">
              ****802
            </code>
            <button
              onClick={() => copy("802XXXXXXX")}
              className="text-xs text-zinc-500 hover:text-[#FFD700]"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
            Referencia
          </p>
          <code className="text-zinc-300 text-sm font-mono">{accountId}</code>
        </div>
        <div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
            Monto a transferir
          </p>
          <p className="text-xl font-black text-[#FFD700]">
            RD$ {totalRD.toLocaleString("es-DO")}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">Incluye ITBIS 18%</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-tad-yellow/10 border border-tad-yellow/20">
        <p className="text-xs font-black text-tad-yellow uppercase tracking-widest mb-2">
          Importante
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Una vez realizada la transferencia, envía el comprobante por WhatsApp
          al soporte de TAD para agregar tu pago.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest
                     text-zinc-400 hover:bg-white/10 transition-all"
        >
          Atrás
        </button>
        <button
          onClick={submit}
          className="flex-1 py-4 bg-[#FFD700] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest
                     hover:bg-[#FFE033] transition-all"
        >
          Ya realicé la transferencia
        </button>
      </div>
    </div>
  );
}
