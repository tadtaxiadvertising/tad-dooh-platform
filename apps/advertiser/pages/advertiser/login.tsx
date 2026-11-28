import { writeAccessTokenCookie } from "@tad/services/session-cookies";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  TrendingUp,
} from "lucide-react";
import CityMapBackdrop from "../../components/advertiser/CityMapBackdrop";
import {
  captureReferralCode,
  clearReferralCode,
} from "../../components/advertiser/referral";
import { GoogleSignInButton } from "@tad/ui";
import { PORTAL_CONFIGS } from "@tad/services";

export { captureReferralCode, clearReferralCode };

type GatewayView = "login" | "forgot";

interface AdvertiserSessionPayload {
  access_token?: string;
  token?: string;
  session?: { access_token?: string };
  advertiserId?: string;
  email?: string;
  name?: string;
  companyName?: string;
  status?: string;
  category?: string | null;
  phone?: string | null;
  user?: { id?: string; email?: string; entityId?: string | null };
}

function persistSession(
  payload: AdvertiserSessionPayload,
  fallbackEmail: string,
): void {
  const accessToken =
    payload?.access_token || payload?.token || payload?.session?.access_token;
  if (!accessToken)
    throw new Error("El servidor no devolvió un token de acceso válido.");

  const user = {
    id: payload?.advertiserId || payload?.user?.id || "",
    email: payload?.email || payload?.user?.email || fallbackEmail,
    role: "ADVERTISER",
    entityId: payload?.advertiserId || payload?.user?.entityId || null,
    name: payload?.name || payload?.companyName || fallbackEmail,
    // NUEVO: campos del backend para UX de onboarding/estados
    status: payload?.status || "ACTIVE",
    category: payload?.category || null,
    phone: payload?.phone || null,
  };

  writeAccessTokenCookie(accessToken);
  // A7: NO guardar refresh token en localStorage. Access token en memoria via context.
  localStorage.setItem("tad_advertiser_token", accessToken);
  localStorage.setItem("tad_advertiser_user", JSON.stringify(user));
}

export default function AdvertiserLoginPage() {
  const router = useRouter();
  const [view, setView] = useState<GatewayView>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    captureReferralCode();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Ingresa tu correo corporativo y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/proxy/advertisers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.message ||
            "Credenciales inválidas. Verifica e intenta de nuevo.",
        );
      }

      persistSession(data, email.trim());
      router.replace("/advertiser/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error inesperado.",
      );
      setLoading(false);
    }
  };

  const inputClass =
    "w-full min-h-[48px] bg-black/60 border border-white/10 rounded-xl pl-11 pr-4 text-sm font-bold text-white placeholder:text-white/25 focus:outline-none focus:border-[#FDCB01]/70 transition-colors";

  return (
    <div className="relative min-h-screen bg-black overflow-x-hidden font-sans selection:bg-[#FDCB01] selection:text-black">
      <Head>
        <title>Portal de Anunciantes | TAD Ad</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="TAD Ad — Publicidad DOOH geolocalizada en la flota de taxis de República Dominicana."
        />
      </Head>

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[80vw] h-[40vh] bg-[#FDCB01]/[0.05] blur-[130px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[50vw] h-[50vh] bg-blue-600/[0.04] blur-[110px] rounded-full" />
        <CityMapBackdrop position="fixed" />
      </div>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-10 sm:px-8 sm:py-16">
        <div className="w-full max-w-md lg:w-[40%] lg:max-w-[480px] flex flex-col items-center">
          <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
            <div className="w-14 h-14 sm:w-[72px] sm:h-[72px] bg-[#FDCB01] rounded-xl grid place-items-center shadow-[0_0_50px_rgba(253,203,1,0.25)] mb-5">
              <span className="text-black font-black tracking-tighter text-xl sm:text-2xl">
                TAD
              </span>
            </div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.35em] text-[#AAAAAA] mb-2">
              Portal de Anunciantes
            </p>
            <h1 className="text-[8.5vw] sm:text-5xl leading-[1.02] font-black uppercase tracking-tight text-white">
              Potencia tu <span className="text-[#FDCB01]">marca</span>
            </h1>
          </div>

          {view === "login" ? (
            <div className="w-[95%] sm:w-full mx-auto bg-[#121212]/90 border border-white/10 rounded-xl p-6 sm:p-8 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
              <form onSubmit={handleLogin} noValidate>
                {error && (
                  <div
                    role="alert"
                    className="mb-4 p-3 bg-red-500/10 border border-red-500/25 rounded-lg flex items-center gap-2 text-red-400 animate-shake"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="text-[11px] font-bold">{error}</p>
                  </div>
                )}

                <label
                  htmlFor="adv-email"
                  className="block text-[10px] font-black text-[#AAAAAA] uppercase tracking-widest mb-1.5 ml-1"
                >
                  Correo
                </label>
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-3.5 flex items-center text-white/30 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="adv-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@empresa.com"
                    className={inputClass}
                  />
                </div>

                <label
                  htmlFor="adv-password"
                  className="block text-[10px] font-black text-[#AAAAAA] uppercase tracking-widest mb-1.5 ml-1"
                >
                  Password
                </label>
                <div className="relative mb-6">
                  <div className="absolute inset-y-0 left-3.5 flex items-center text-white/30 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="adv-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3.5 flex items-center text-white/30 hover:text-[#FDCB01] transition-colors"
                    aria-label={
                      showPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[52px] bg-[#FDCB01] hover:bg-white disabled:opacity-60 text-black font-black uppercase tracking-[0.12em] text-sm py-4 rounded-xl transition-all active:scale-[0.98] shadow-[0_0_44px_rgba(253,203,1,0.28)] flex items-center justify-center gap-2.5"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Entrar al portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* ─── OAuth Divider + Google Sign-In ─── */}
                <div
                  className="flex items-center gap-3 pt-1"
                  aria-hidden="true"
                >
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] uppercase tracking-widest text-[#AAAAAA] font-semibold">
                    o
                  </span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <GoogleSignInButton
                  config={PORTAL_CONFIGS.ADVERTISER}
                  disabled={loading}
                />

                <p className="mt-4 text-center text-[11px] text-[#AAAAAA] leading-relaxed">
                  Cada día sin presencia en la calle es alcance que captura
                  tu competencia.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPassword("");
                    setView("forgot");
                    setError("");
                  }}
                  className="block mx-auto mt-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white/40 hover:text-[#FDCB01] transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>

              </form>
            </div>
          ) : (
            <div className="w-[95%] sm:w-full mx-auto bg-[#121212]/90 border border-white/10 rounded-xl p-8 sm:p-10 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#FDCB01]/10 border border-[#FDCB01]/25 grid place-items-center">
                <AlertCircle
                  aria-hidden="true"
                  className="w-7 h-7 text-[#FDCB01]"
                />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white mb-2">
                Recuperar acceso
              </h2>
              <p
                role="status"
                className="text-sm text-[#AAAAAA] leading-relaxed mb-6"
              >
                La recuperación automática de contraseña del portal no está
                disponible. No se ha enviado ningún correo. Contacta al equipo
                de soporte de TAD para verificar tu identidad y recuperar el
                acceso. No compartas tu contraseña ni vuelvas a registrar tu
                empresa.
              </p>
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setError("");
                }}
                className="w-full min-h-[48px] bg-[#FDCB01] hover:bg-white text-black font-black uppercase tracking-[0.12em] text-sm py-4 rounded-xl transition-all active:scale-[0.98]"
              >
                Volver al portal
              </button>
            </div>
          )}

          {view === "login" && (
            <a
              href="/advertiser/onboarding"
              className="group mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#FDCB01]/40 transition-all"
            >
              <TrendingUp className="w-4 h-4 text-[#FDCB01]" />
              <span className="text-[11px] font-black uppercase tracking-widest text-white group-hover:text-[#FDCB01] transition-colors">
                Aún no tienes cuenta · Simula tu campaña gratis
              </span>
              <ArrowRight className="w-4 h-4 text-[#FDCB01] transition-transform group-hover:translate-x-0.5" />
            </a>
          )}
        </div>

        <footer className="absolute bottom-4 left-0 right-0 z-10 text-center text-[10px] font-medium tracking-wide text-white/25 px-4">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span>
              © {new Date().getFullYear()} TAD Taxi Advertising S.R.L. · Red
              DOOH República Dominicana
            </span>
            <span className="hidden sm:inline">·</span>
            <a
              href="/politica-de-privacidad"
              className="hover:text-[#FDCB01] transition-colors"
            >
              Privacidad
            </a>
            <a
              href="/terminos-de-servicio"
              className="hover:text-[#FDCB01] transition-colors"
            >
              Términos
            </a>
            <a
              href="/politica-de-cookies"
              className="hover:text-[#FDCB01] transition-colors"
            >
              Cookies
            </a>
            <a
              href="/aviso-legal"
              className="hover:text-[#FDCB01] transition-colors"
            >
              Aviso Legal
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
