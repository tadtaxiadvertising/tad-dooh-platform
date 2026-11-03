"use client";

import React, { FormEvent, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { TadButton, TadCard, TadInput, TadProgress } from "@tad/ui";

type RegistrationStep = 1 | 2 | 3;

type RegistrationForm = {
  name: string;
  phone: string;
  vehicleModel: string;
  licensePlate: string;
  password: string;
  confirmPassword: string;
};

const INITIAL_FORM: RegistrationForm = {
  name: "",
  phone: "",
  vehicleModel: "",
  licensePlate: "",
  password: "",
  confirmPassword: "",
};

function getBackendMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string" && message.trim()) return message;
  }
  return "No se pudo completar el registro. Revisa tu conexión e inténtalo de nuevo.";
}

export function DriverRegistrationWizard() {
  const [step, setStep] = useState<RegistrationStep>(1);
  const [form, setForm] = useState<RegistrationForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = (field: keyof RegistrationForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const handleNext = () => {
    const missing =
      step === 1
        ? !form.name.trim() || !form.phone.trim()
        : !form.vehicleModel.trim() || !form.licensePlate.trim();

    if (missing) {
      setError("Completa los campos requeridos para continuar.");
      return;
    }

    setError("");
    setStep((current) => Math.min(3, current + 1) as RegistrationStep);
  };

  const handleBack = () => {
    setError("");
    setStep((current) => Math.max(1, current - 1) as RegistrationStep);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/proxy/auth/driver/register", {
        name: form.name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        vehicleModel: form.vehicleModel.trim(),
        licensePlate: form.licensePlate.trim(),
      });
      setSuccess(
        "Solicitud registrada. Tu perfil quedó pendiente de aprobación y pago.",
      );
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <TadCard
        variant="elevated"
        padding="lg"
        className="w-full max-w-lg text-center"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-2xl text-emerald-300">
          ✓
        </div>
        <h1 className="text-2xl font-black text-white">Solicitud recibida</h1>
        <p role="status" className="mt-3 text-sm leading-6 text-zinc-300">
          {success}
        </p>
        <Link
          href="/driver/login"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#FFD400] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#ffe45c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD400] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
        >
          Ir a iniciar sesión
        </Link>
      </TadCard>
    );
  }

  return (
    <TadCard variant="elevated" padding="lg" className="w-full max-w-lg">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFD400]">
          Registro de conductor
        </p>
        <h1 className="mt-2 text-2xl font-black text-white">
          Únete a la red TAD
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Completa tu solicitud en tres pasos. La cuenta queda pendiente hasta
          la aprobación administrativa.
        </p>
      </div>

      <TadProgress
        value={step}
        max={3}
        label={"Paso " + step + " de 3"}
        showValue
        className="mb-8"
      />

      <form onSubmit={handleSubmit} noValidate>
        {step === 1 && (
          <div className="space-y-4">
            <TadInput
              label="Nombre completo"
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              required
            />
            <TadInput
              label="Teléfono"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              required
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <TadInput
              label="Modelo del vehículo"
              name="vehicleModel"
              value={form.vehicleModel}
              onChange={(event) =>
                updateField("vehicleModel", event.target.value)
              }
              required
            />
            <TadInput
              label="Placa"
              name="licensePlate"
              value={form.licensePlate}
              onChange={(event) =>
                updateField("licensePlate", event.target.value)
              }
              required
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <TadInput
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              hint="Usa al menos 6 caracteres."
              required
              minLength={6}
            />
            <TadInput
              label="Confirmar contraseña"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) =>
                updateField("confirmPassword", event.target.value)
              }
              required
              minLength={6}
            />
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-zinc-400">
              Al enviar, tu solicitud queda pendiente de aprobación y pago. Esta
              pantalla es informativa y no activa una cuenta automáticamente.
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-rose-400">
            {error}
          </p>
        )}

        <div aria-live="polite" className="mt-7 flex gap-3">
          {step > 1 && (
            <TadButton
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={loading}
            >
              Atrás
            </TadButton>
          )}
          {step < 3 ? (
            <TadButton type="button" fullWidth onClick={handleNext}>
              Continuar
            </TadButton>
          ) : (
            <TadButton
              type="submit"
              fullWidth
              isLoading={loading}
              loadingText="Registrando..."
            >
              Crear cuenta
            </TadButton>
          )}
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-400">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/driver/login"
          className="font-bold text-[#FFD400] underline-offset-4 hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </TadCard>
  );
}
