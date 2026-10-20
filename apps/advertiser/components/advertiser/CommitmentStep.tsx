import React, { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  FileText,
  User,
  Building2,
  Mail,
  Phone,
  Lock,
} from "lucide-react";

export interface CommitmentForm {
  rnc: string;
  repName: string;
  companyName: string;
  email: string;
  phone: string;
  password: string;
}

export interface CommitmentAgreements {
  representative: boolean;
  terms: boolean;
}

interface CommitmentStepProps {
  form: CommitmentForm;
  onFormChange: (patch: Partial<CommitmentForm>) => void;
  agreements: CommitmentAgreements;
  onAgreementsChange: (patch: Partial<CommitmentAgreements>) => void;
  campaignSummary: { screens: number; months: number; budget: number };
  onSubmit: () => void;
  onPrev: () => void;
  isLoading: boolean;
  error: string;
}

const inputClass =
  "w-full min-h-[48px] bg-black/60 border border-white/10 rounded-xl px-4 text-sm font-bold text-white placeholder:text-white/25 focus:outline-none focus:border-[#FDCB01]/70 transition-colors";

function Field({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="group">
      <label
        htmlFor={id}
        className="block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 text-[#AAAAAA] group-focus-within:text-[#FDCB01] transition-colors"
      >
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-3.5 flex items-center text-white/25 group-focus-within:text-[#FDCB01] transition-colors pointer-events-none">
          <Icon className="w-4 h-4" />
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CommitmentStep({
  form,
  onFormChange,
  agreements,
  onAgreementsChange,
  campaignSummary,
  onSubmit,
  onPrev,
  isLoading,
  error,
}: CommitmentStepProps) {
  const [showPassword, setShowPassword] = useState(false);

  const checkboxRow = (
    key: keyof CommitmentAgreements,
    label: React.ReactNode,
  ) => (
    <label className="flex items-start gap-3 cursor-pointer group/check p-3 -mx-3 rounded-xl hover:bg-white/[0.03] transition-colors">
      <input
        type="checkbox"
        checked={agreements[key]}
        onChange={(e) =>
          onAgreementsChange({
            [key]: e.target.checked,
          } as Partial<CommitmentAgreements>)
        }
        className="mt-0.5 w-5 h-5 shrink-0 accent-[#FDCB01]"
      />
      <span className="text-[11px] text-[#AAAAAA] leading-relaxed group-hover/check:text-white/80 transition-colors">
        {label}
      </span>
    </label>
  );

  return (
    <div className="animate-step-in flex flex-col flex-1">
      <div className="text-center pt-5 pb-6">
        <h1 className="text-[26px] sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.05] mb-2">
          Asegura tu campaña
        </h1>
        <p className="text-xs text-[#AAAAAA] font-bold uppercase tracking-wider">
          Tu plan simulado:{" "}
          <span className="text-[#22C55E]">
            {campaignSummary.screens} pantallas · {campaignSummary.months} mes
            {campaignSummary.months > 1 ? "es" : ""} · RD$
            {campaignSummary.budget.toLocaleString()}
          </span>
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        noValidate
        className="bg-[#121212]/80 border border-white/10 rounded-xl p-5 sm:p-8 space-y-4"
      >
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg flex items-center gap-2 text-red-400 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-[11px] font-bold">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="ob-rnc" label="RNC / Cédula del negocio" icon={FileText}>
            <input
              id="ob-rnc"
              type="text"
              value={form.rnc}
              onChange={(e) => onFormChange({ rnc: e.target.value })}
              placeholder="1-31-00000-1"
              autoComplete="off"
              className={`${inputClass} pl-11`}
            />
          </Field>

          <Field id="ob-rep" label="Representante autorizado" icon={User}>
            <input
              id="ob-rep"
              type="text"
              value={form.repName}
              onChange={(e) => onFormChange({ repName: e.target.value })}
              placeholder="Nombre completo"
              autoComplete="name"
              className={`${inputClass} pl-11`}
            />
          </Field>
        </div>

        <Field
          id="ob-company"
          label="Nombre del negocio / Marca"
          icon={Building2}
        >
          <input
            id="ob-company"
            type="text"
            value={form.companyName}
            onChange={(e) => onFormChange({ companyName: e.target.value })}
            placeholder="Tu marca"
            autoComplete="organization"
            className={`${inputClass} pl-11`}
          />
        </Field>

        <Field id="ob-email" label="Correo corporativo" icon={Mail}>
          <input
            id="ob-email"
            type="email"
            value={form.email}
            onChange={(e) => onFormChange({ email: e.target.value })}
            placeholder="contacto@tuempresa.com"
            autoComplete="email"
            className={`${inputClass} pl-11`}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="ob-phone" label="Teléfono de contacto" icon={Phone}>
            <input
              id="ob-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => onFormChange({ phone: e.target.value })}
              placeholder="809-555-0000"
              autoComplete="tel"
              className={`${inputClass} pl-11`}
            />
          </Field>

          <div className="group relative">
            <Field id="ob-pass" label="Contraseña" icon={Lock}>
              <input
                id="ob-pass"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => onFormChange({ password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className={`${inputClass} pl-11 pr-11`}
              />
            </Field>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={
                showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              className="absolute right-3.5 bottom-[13px] text-white/30 hover:text-[#FDCB01] transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-2 space-y-1 border-t border-white/[0.06] mt-2">
          {checkboxRow(
            "representative",
            "Confirmo que soy el representante autorizado del negocio.",
          )}
          {checkboxRow(
            "terms",
            <>
              Acepto los{" "}
              <span className="text-[#FDCB01] font-bold">
                términos de servicio
              </span>{" "}
              y la{" "}
              <span className="text-[#FDCB01] font-bold">
                política de contenido publicitario
              </span>{" "}
              de TAD.
            </>,
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={isLoading}
            className="order-2 sm:order-1 w-full min-h-[48px] py-3 bg-white/[0.04] border border-white/10 text-[#AAAAAA] hover:text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Ajustar simulación
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="order-1 sm:order-2 w-full min-h-[52px] bg-[#FDCB01] hover:bg-white disabled:opacity-60 text-black font-black uppercase tracking-[0.12em] text-sm py-4 rounded-xl transition-all active:scale-[0.98] shadow-[0_0_44px_rgba(253,203,1,0.28)] flex items-center justify-center gap-2.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Asegurando...</span>
              </>
            ) : (
              <>
                <BadgeCheck className="w-5 h-5" />
                <span>Asegurar mi campaña</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
