"use client";
import { getErrorMessage } from "@tad/services";

import { useState, FormEvent } from "react";
import Head from "next/head";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/advertiser/update-password`,
      });

      if (error) throw error;
      setStatus("sent");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(
        getErrorMessage(err) ||
          "No se pudo enviar el correo. Intenta de nuevo.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-black font-sans text-white relative overflow-hidden">
      <Head>
        <title>Recuperar Contraseña | TAD ADVERTISER</title>
      </Head>

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="street-grid"
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
          >
            <rect width="120" height="120" fill="none" />
            <path
              d="M0 60 L120 60 M60 0 L60 120"
              stroke="#1f1f1f"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#street-grid)" />
      </svg>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[24px] bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.03)]">
          <div className="px-8 py-10">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al login
            </Link>

            {status === "sent" ? (
              <div className="text-center space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    Correo enviado
                  </h1>
                  <p className="mt-2 text-sm text-gray-400">
                    Revisa{" "}
                    <span className="font-semibold text-white">{email}</span>{" "}
                    para restablecer tu contraseña.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#eab308] to-[#fad400] px-6 py-2.5 text-sm font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Volver al login
                </Link>
              </div>
            ) : (
              <>
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Mail className="h-7 w-7 text-[#eab308]" />
                </div>

                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-white">
                    Recuperar contraseña
                  </h1>
                  <p className="mt-1 text-sm text-gray-400">
                    Ingresa tu correo y te enviaremos las instrucciones.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="forgot-email"
                      className="mb-1 block text-xs font-semibold text-gray-400"
                    >
                      Correo
                    </label>
                    <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.03] transition-colors focus-within:border-[#eab308] focus-within:shadow-[0_0_0_1px_rgba(234,179,8,0.35)]">
                      <span className="pl-3 text-gray-500">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <input
                        id="forgot-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tucorreo@ejemplo.com"
                        className="w-full bg-transparent px-3 py-2.5 text-sm text-white placeholder-white outline-none"
                        autoComplete="email"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {status === "error" && (
                    <p className="text-xs text-red-400">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#eab308] to-[#fad400] py-2.5 text-sm font-bold text-black shadow-[0_0_30px_rgba(234,179,8,0.25)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar instrucciones"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="absolute bottom-4 left-0 right-0 z-10 text-center text-[11px] text-gray-600">
        TAD Taxi Advertising S.R.L.
      </footer>
    </div>
  );
}
