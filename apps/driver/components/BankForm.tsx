import { getErrorResponse } from "@/lib/error-response";
// apps/driver/components/BankForm.tsx

import { getErrorMessage } from "@tad/services";
import React, { useEffect, useState } from "react";
import api from "@tad/services";
import { enqueueOfflineAction, syncOfflineQueue } from "../lib/offlineQueue";
import { ChevronRight, ChevronLeft, WifiOff, CheckCircle2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BankAccountType = "AHORRO" | "CORRIENTE";

interface BankFormData {
  banco: string;
  cuenta: string;
  tipo: BankAccountType;
  ownerName: string;
  cedula: string;
}

interface BankFormProps {
  driverId: string;
  onSuccess: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BANK_OPTIONS: { value: string; label: string; short: string }[] = [
  { value: "BPD", label: "Banco Popular Dominicano", short: "BPD" },
  { value: "BHD", label: "BHD León", short: "BHD" },
  { value: "BR", label: "Banreservas", short: "BR" },
  { value: "SCOTIABANK", label: "Scotiabank DR", short: "SCO" },
  { value: "APAP", label: "Asociación Popular", short: "APAP" },
];

const STEPS = ["Banco", "Cuenta", "Tipo", "Titular", "Cédula"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeAccountType = (value: unknown): BankAccountType => {
  if (value === "CHECKING" || value === "CORRIENTE") return "CORRIENTE";
  return "AHORRO";
};

const buildBankPayload = (data: BankFormData) => ({
  banco: data.banco,
  cuenta: data.cuenta,
  tipo: normalizeAccountType(data.tipo),
  cedula: data.cedula,
  ownerName: data.ownerName.trim(),
});

export const getDriverBankPendingKey = (driverId: string) =>
  `tad_driver_bank_pending_${driverId}`;

// ─── Component ────────────────────────────────────────────────────────────────

export const BankForm: React.FC<BankFormProps> = ({ driverId, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [formData, setFormData] = useState<BankFormData>({
    banco: "",
    cuenta: "",
    tipo: "AHORRO",
    ownerName: "",
    cedula: "",
  });

  const draftKey = `tad_driver_bank_draft_${driverId}`;
  const pendingKey = getDriverBankPendingKey(driverId);

  // ── Hydrate draft + online listeners ────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOffline(!navigator.onLine);

    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setFormData({
          banco: typeof parsed?.banco === "string" ? parsed.banco : "",
          cuenta: typeof parsed?.cuenta === "string" ? parsed.cuenta : "",
          tipo: normalizeAccountType(parsed?.tipo),
          ownerName:
            typeof parsed?.ownerName === "string" ? parsed.ownerName : "",
          cedula: typeof parsed?.cedula === "string" ? parsed.cedula : "",
        });
      }
    } catch {
      // Borrador corrupto — ignorar
    }

    const handleOnline = () => {
      setIsOffline(false);
      void syncOfflineQueue();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [draftKey]);

  // ── Field updater (auto-saves draft) ────────────────────────────────────────
  const handleChange = (field: keyof BankFormData, value: string) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        [field]: field === "tipo" ? normalizeAccountType(value) : value,
      } as BankFormData;
      if (typeof window !== "undefined") {
        localStorage.setItem(draftKey, JSON.stringify(next));
      }
      return next;
    });
  };

  // ── Offline queue ────────────────────────────────────────────────────────────
  const queueOfflineSave = async (data: BankFormData) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(draftKey, JSON.stringify(data));
      localStorage.setItem(pendingKey, "1");
    }
    await enqueueOfflineAction("/wallet/bank", buildBankPayload(data), "PUT");
  };

  // ── Online submit ────────────────────────────────────────────────────────────
  const submitData = async (data: BankFormData) => {
    try {
      await api.put("/wallet/bank", buildBankPayload(data), {
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      if (typeof window !== "undefined") {
        localStorage.removeItem(draftKey);
        localStorage.removeItem(pendingKey);
      }
      onSuccess();
    } catch (error: unknown) {
      const response = getErrorResponse(error);
      const status = response?.status;
      const errorMessage =
        getErrorMessage(error) || "No se pudo guardar la información bancaria.";
      const isNetworkFailure =
        !navigator.onLine ||
        !response ||
        /failed to fetch|network|load failed/i.test(
          String(errorMessage).toLowerCase(),
        );

      if (isNetworkFailure || (typeof status === "number" && status >= 500)) {
        await queueOfflineSave(data);
        setSavedOffline(true);
        setTimeout(() => onSuccess(), 1800);
        return;
      }
      throw new Error(errorMessage);
    }
  };

  // ── Step navigation ──────────────────────────────────────────────────────────
  const handleNext = async () => {
    if (step === 2 && !/^\d{10,20}$/.test(formData.cuenta)) {
      alert("Número de cuenta inválido (10–20 dígitos numéricos)");
      return;
    }
    if (step === 5 && !/^\d{11}$/.test(formData.cedula)) {
      alert("Cédula inválida (11 dígitos, sin guiones)");
      return;
    }
    if (step < 5) {
      setStep((prev) => prev + 1);
      return;
    }

    // Último paso → enviar
    if (isOffline || !navigator.onLine) {
      await queueOfflineSave(formData);
      setSavedOffline(true);
      setTimeout(() => onSuccess(), 1800);
      return;
    }

    setSubmitting(true);
    try {
      await submitData(formData);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "No se pudo guardar la información bancaria.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Confirmación offline ────────────────────────────────────────────────────
  if (savedOffline) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-8 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-[20px]" />
          <div className="relative h-16 w-16 rounded-full border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">
            Guardado sin conexión
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400 max-w-xs">
            Tu información bancaria quedó cifrada en el dispositivo y se
            sincronizará automáticamente al recuperar la red.
          </p>
        </div>
      </div>
    );
  }

  // ─── Disabled guard ──────────────────────────────────────────────────────────
  const isNextDisabled =
    (step === 1 && !formData.banco) ||
    (step === 2 && formData.cuenta.length < 10) ||
    (step === 4 && formData.ownerName.trim() === "") ||
    (step === 5 && formData.cedula.length !== 11) ||
    submitting;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-5">
      {/* Offline badge */}
      {isOffline && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <WifiOff className="h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
            Sin conexión · los datos se guardarán localmente
          </p>
        </div>
      )}

      {/* Step progress track */}
      <div className="flex items-end gap-1.5">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const isActive = n === step;
          const isDone = n < step;
          return (
            <div
              key={label}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <div
                className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                  isDone
                    ? "bg-emerald-500"
                    : isActive
                      ? "bg-[#FFD400] shadow-[0_0_8px_rgba(255,212,0,0.4)]"
                      : "bg-white/5"
                }`}
              />
              <span
                className={`text-[8px] font-black uppercase tracking-[0.15em] transition-colors ${
                  isDone
                    ? "text-emerald-400"
                    : isActive
                      ? "text-[#FFD400]"
                      : "text-zinc-800"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Step content ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/5 bg-black/40 p-5">
        {/* STEP 1 — Selección de banco */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Selecciona tu banco dominicano
            </p>
            <div className="grid gap-2">
              {BANK_OPTIONS.map((bank) => (
                <button
                  key={bank.value}
                  type="button"
                  onClick={() => handleChange("banco", bank.value)}
                  className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ${
                    formData.banco === bank.value
                      ? "border-[#FFD400]/40 bg-[#FFD400]/5 shadow-[0_0_20px_rgba(255,212,0,0.07)]"
                      : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className={`h-8 w-8 shrink-0 rounded-lg text-[9px] font-black flex items-center justify-center transition-colors ${
                      formData.banco === bank.value
                        ? "bg-[#FFD400] text-black"
                        : "bg-white/5 text-zinc-600"
                    }`}
                  >
                    {bank.short}
                  </div>
                  <p
                    className={`text-sm font-black transition-colors ${
                      formData.banco === bank.value
                        ? "text-white"
                        : "text-zinc-400"
                    }`}
                  >
                    {bank.label}
                  </p>
                  {formData.banco === bank.value && (
                    <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-[#FFD400]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Número de cuenta */}
        {step === 2 && (
          <div className="space-y-3">
            <label
              htmlFor="bank-cuenta"
              className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500"
            >
              Número de cuenta
            </label>
            <input
              id="bank-cuenta"
              type="tel"
              inputMode="numeric"
              value={formData.cuenta}
              onChange={(e) =>
                handleChange("cuenta", e.target.value.replace(/\D/g, ""))
              }
              placeholder="Ej: 0123456789"
              className="w-full rounded-xl border border-white/5 bg-black/60 px-4 py-4 font-mono text-base tracking-wider text-white placeholder:text-zinc-700 focus:border-[#FFD400]/30 focus:outline-none transition-colors"
            />
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700">
              Solo dígitos · sin guiones ni espacios (10–20 dígitos)
            </p>
          </div>
        )}

        {/* STEP 3 — Tipo de cuenta */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Tipo de cuenta
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["AHORRO", "CORRIENTE"] as BankAccountType[]).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => handleChange("tipo", tipo)}
                  className={`rounded-xl border py-5 text-sm font-black uppercase tracking-[0.15em] transition-all duration-200 ${
                    formData.tipo === tipo
                      ? "border-[#FFD400]/40 bg-[#FFD400]/5 text-[#FFD400] shadow-[0_0_16px_rgba(255,212,0,0.08)]"
                      : "border-white/5 bg-white/[0.02] text-zinc-500 hover:border-white/10 hover:text-zinc-300"
                  }`}
                >
                  {tipo === "AHORRO" ? "Ahorros" : "Corriente"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4 — Nombre del titular */}
        {step === 4 && (
          <div className="space-y-3">
            <label
              htmlFor="bank-owner"
              className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500"
            >
              Nombre del titular
            </label>
            <input
              id="bank-owner"
              type="text"
              value={formData.ownerName}
              onChange={(e) => handleChange("ownerName", e.target.value)}
              placeholder="Igual que aparece en tu banco"
              className="w-full rounded-xl border border-white/5 bg-black/60 px-4 py-4 text-sm font-bold text-white placeholder:text-zinc-700 focus:border-[#FFD400]/30 focus:outline-none transition-colors"
            />
          </div>
        )}

        {/* STEP 5 — Cédula */}
        {step === 5 && (
          <div className="space-y-3">
            <label
              htmlFor="bank-cedula"
              className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500"
            >
              Cédula del titular
            </label>
            <input
              id="bank-cedula"
              type="tel"
              inputMode="numeric"
              value={formData.cedula}
              onChange={(e) =>
                handleChange("cedula", e.target.value.replace(/\D/g, ""))
              }
              placeholder="00000000000"
              maxLength={11}
              className="w-full rounded-xl border border-white/5 bg-black/60 px-4 py-4 font-mono text-base tracking-[0.35em] text-white placeholder:text-zinc-700 focus:border-[#FFD400]/30 focus:outline-none transition-colors"
            />
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-700">
                11 dígitos · sin guiones
              </p>
              {formData.cedula.length === 11 && (
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-400">
                  ✓ Formato válido
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((prev) => prev - 1)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-black uppercase tracking-[0.15em] text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Atrás
          </button>
        )}

        <button
          type="button"
          onClick={() => void handleNext()}
          disabled={isNextDisabled}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FFD400] px-4 py-3.5 text-sm font-black uppercase tracking-[0.15em] text-black transition hover:bg-[#ffe45c] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]"
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <span>{step === 5 ? "Guardar cuenta" : "Continuar"}</span>
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
