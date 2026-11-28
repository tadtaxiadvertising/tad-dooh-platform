'use client';
import { hasCookieConsent, trackAnalyticsEvent } from '@tad/services/cookie-consent';
import { writeAccessTokenCookie } from '@tad/services/session-cookies';
import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@tad/services';
import { LogIn, AlertCircle, Eye, EyeOff, Lock, ArrowRight, CheckCircle, X, Mail, ServerCrash, Building2, User, Phone } from 'lucide-react';
import clsx from 'clsx';
import Head from 'next/head';
import { toast } from 'sonner';

import {
  LoginSchema,
  PublicCredentialsSchema,
  RecoverySchema,
  PortalConfig,
  getAuthCircuitBreaker,
  recordFailedAttempt,
  checkRateLimit,
  clearRateLimit,
} from '@tad/services';

import { GoogleSignInButton } from './GoogleSignInButton';

type AuthView = 'login' | 'register' | 'forgot' | 'forgot-sent';

/** Optional credential-login against the TAD API (NestJS JWT) instead of direct Supabase. */
export interface PortalApiLogin {
  /** Proxy path, e.g. '/api/proxy/advertisers/login' */
  endpoint: string;
}

/** Optional self-registration view ("Registrar Empresa") rendered via a sliding toggle. */
export interface PortalRegistration {
  /** Proxy path, e.g. '/api/proxy/advertisers' */
  endpoint: string;
  /** Referral code captured from the entry URL (?ref=) — attached to the payload when present */
  referralCode?: string | null;
  /** Called after a 201 Created response */
  onCreated?: (created: unknown) => void;
}

interface PortalAuthProps {
  config: PortalConfig;
  /** Public recovery routes can open the existing recovery form directly. */
  initialView?: 'login' | 'forgot';
  apiLogin?: PortalApiLogin;
  registration?: PortalRegistration;
  /** Capa ambiental del portal (p.ej. malla urbana TAD). Sustituye al glow por defecto. */
  background?: React.ReactNode;
}

export function PortalAuth({ config, apiLogin, registration, background, initialView = 'login' }: PortalAuthProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [view, setView] = useState<AuthView>(initialView);

  // Registration fields
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');

  // Resiliency States
  const [isOffline, setIsOffline] = useState(false);
  const [lockedMs, setLockedMs] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  // Rate Limiting Timer Check
  useEffect(() => {
    if (!email) return;
    const interval = setInterval(() => {
      const state = checkRateLimit(email);
      setLockedMs(state.remainingMs);
    }, 1000);
    return () => clearInterval(interval);
  }, [email]);

  const resetForm = () => { setError(''); setPassword(''); };
  const switchView = (v: AuthView) => { resetForm(); setView(v); };
  const returnToLogin = () => {
    if (initialView === 'forgot') {
      void router.push(config.loginPath);
      return;
    }
    switchView('login');
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState('CapsLock')) {
      setCapsLock(true);
    } else {
      setCapsLock(false);
    }
  };

  /** Persist session for portals that authenticate via the TAD API (NestJS JWT). */
  const persistApiSession = (payload: any, fallbackEmail: string) => {
    const accessToken = payload?.access_token || payload?.token;
    if (!accessToken) throw new Error('El servidor no devolvió un token de acceso válido.');

    const user = {
      id: payload.advertiserId || payload.driverId || payload.entityId || payload.user?.id || '',
      email: payload.email || payload.user?.email || fallbackEmail,
      role: payload.role || payload.user?.role || config.role,
      entityId: payload.entityId || payload.advertiserId || payload.user?.entityId || null,
    };

    writeAccessTokenCookie(accessToken);
    localStorage.setItem(config.tokenKey, accessToken);
    localStorage.setItem(config.userKey, JSON.stringify(user));

    return user;
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (lockedMs > 0) return;

    setError('');

    // Zod Validation — API-managed portals accept any email domain (public registration)
    const result = (apiLogin ? PublicCredentialsSchema : LoginSchema).safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);

    try {
      if (apiLogin) {
        // ── API MODE — NestJS JWT (works for self-registered accounts) ──
        const res = await fetch(apiLogin.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: result.data.email, password: result.data.password }),
        });

        const text = await res.text().catch(() => '');
        let payload: any = {};
        try { payload = JSON.parse(text); } catch { /* noop */ }

        if (!res.ok) {
          throw new Error(payload?.message || 'Credenciales incorrectas.');
        }

        persistApiSession(payload, result.data.email);
        clearRateLimit(result.data.email);

        if (hasCookieConsent('analytics')) {
          trackAnalyticsEvent('auth_login_attempt', { status: 'success', portal: config.role });
        }

        toast.success('Acceso autorizado', { description: `Bienvenido al ${config.name}` });
        // Full page navigation: AuthProvider resolves its session once on mount,
        // so a client-side push would leave the dashboard with a stale null session.
        window.location.assign(config.dashboardPath);
        return;
      }

      // ── SUPABASE MODE ──
      const circuitBreaker = getAuthCircuitBreaker();

      // Execute through Circuit Breaker to prevent Silent Fails
      const { data, error: authError } = await circuitBreaker.execute<{
        data: { session: any; user: any };
        error: Error | null;
      }>(() =>
        supabase.auth.signInWithPassword({
          email: result.data.email,
          password: result.data.password,
        })
      );

      if (authError) throw authError;
      if (!data.session || !data.user) throw new Error('No se pudo establecer la sesión.');

      // Check Role — Supabase data.user.role is always 'authenticated', not a custom role.
      // The authoritative role source is app_metadata.role (set via Supabase dashboard or trigger).
      // As a fallback, also check user_metadata.role for accounts created via the NestJS API.
      const userRole = data.user.app_metadata?.role
        || data.user.user_metadata?.role
        || 'GUEST';
      if (userRole !== config.role) {
        // Clear session immediately if wrong role
        await supabase.auth.signOut();
        throw new Error(`Esta cuenta no tiene privilegios para acceder al ${config.name}.`);
      }

      // Success
      clearRateLimit(result.data.email);

      // Umami Analytics Tracking
      if (hasCookieConsent('analytics')) {
        trackAnalyticsEvent('auth_login_attempt', { status: 'success', portal: config.role });
      }

      // Save Local Tokens
      writeAccessTokenCookie(data.session.access_token);
      localStorage.setItem(config.tokenKey, data.session.access_token);
      localStorage.setItem(config.userKey, JSON.stringify(data.user));

      toast.success('Acceso autorizado', { description: `Bienvenido al ${config.name}` });
      router.replace(config.dashboardPath);

    } catch (err: any) {
      const isCircuitOpen = err.name === 'CircuitBreakerOpenError';

      if (isCircuitOpen) {
        setIsOffline(true);
        setError(err.message);
      } else {
        // Handle invalid credentials
        const limitState = recordFailedAttempt(result.data.email);
        setLockedMs(limitState.remainingMs);

        let msg = err.message || 'Credenciales incorrectas.';
        if (err.message?.includes('Invalid login credentials')) {
          msg = 'Correo o contraseña incorrectos.';
        }

        setError(limitState.isLocked
          ? `Demasiados intentos. Intenta nuevamente en ${Math.ceil(limitState.remainingMs / 1000)}s.`
          : msg);
      }

      if (hasCookieConsent('analytics')) {
        trackAnalyticsEvent('auth_login_attempt', { status: 'error', portal: config.role });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!registration) return;

    setError('');

    if (!companyName.trim() || !contactName.trim()) {
      setError('El nombre de la empresa y el contacto son obligatorios.');
      return;
    }

    // Public registration accepts any email domain (businesses use their own)
    const result = (apiLogin ? PublicCredentialsSchema : LoginSchema).safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);

    try {
      // REGLA DE REFERIDOS: adjuntar referralCode capturado de la URL de entrada (?ref=)
      const referralCode = registration.referralCode?.trim() || undefined;

      const res = await fetch(registration.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          email: result.data.email,
          password: result.data.password,
          phone: phone.trim() || undefined,
          ...(referralCode ? { referralCode } : {}),
        }),
      });

      const text = await res.text().catch(() => '');
      let payload: any = {};
      try { payload = JSON.parse(text); } catch { /* noop */ }

      if (!res.ok) {
        throw new Error(payload?.message || 'No se pudo completar el registro.');
      }

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('tad_adv_referral_code');
      }

      if (hasCookieConsent('analytics')) {
        trackAnalyticsEvent('advertiser_registered', { portal: config.role, referred: Boolean(referralCode) });
      }

      registration.onCreated?.(payload);

      toast.success('Empresa registrada', { description: 'Inicia sesión para continuar con tu bienvenida.' });
      setCompanyName('');
      setContactName('');
      setPhone('');
      setEmail(result.data.email);
      setPassword('');
      setView('login');

    } catch (err: any) {
      setError(err.message || 'Error al registrar la empresa.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (lockedMs > 0) return;

    setError('');

    // Zod Validation
    const result = RecoverySchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    const circuitBreaker = getAuthCircuitBreaker();

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      const { error: authError } = await circuitBreaker.execute(() =>
        supabase.auth.resetPasswordForEmail(result.data.email, {
          redirectTo: `${origin}${config.callbackPath}?next=${encodeURIComponent(config.updatePasswordPath)}`,
        })
      );

      if (authError) throw authError;

      // Umami Analytics Tracking
      if (hasCookieConsent('analytics')) {
        trackAnalyticsEvent('auth_recovery_requested', { portal: config.role });
      }

      setView('forgot-sent');

    } catch (err: any) {
      const isCircuitOpen = err.name === 'CircuitBreakerOpenError';
      if (isCircuitOpen) {
        setIsOffline(true);
        setError(err.message);
      } else {
        const limitState = recordFailedAttempt(result.data.email);
        setLockedMs(limitState.remainingMs);
        setError(limitState.isLocked
          ? `Demasiados intentos. Intenta nuevamente en ${Math.ceil(limitState.remainingMs / 1000)}s.`
          : err.message || 'Error al solicitar recuperación.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090a] flex items-center justify-center p-4 relative overflow-hidden font-sans text-[#f7f8f8]">
      <Head>
        <title>Login | {config.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {background || (
        /* Single subtle ambient glow — default */
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] blur-[140px] rounded-full opacity-[0.05]"
            style={{ backgroundColor: config.accentColor }}
          />
        </div>
      )}

      {/* Compact centered container */}
      <div className={clsx(
        "w-full max-w-[340px] transition-all duration-500",
        mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}>
        {/* Logo — centered, compact */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-yellow-400">
            <span className="text-base font-bold text-black tracking-tight">T</span>
          </div>
          <h1 className="text-xl font-semibold text-[#f7f8f8] tracking-tight">{config.name}</h1>
          <p className="text-[13px] text-[#8a8f98] mt-0.5">{config.subtitle}</p>
        </div>

        {/* Card — Linear-style translucent surface */}
        <div className="relative bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-lg p-5 backdrop-blur-sm">

          {/* Offline overlay */}
          {isOffline && (
            <div className="absolute inset-0 z-50 bg-[#08090a]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center rounded-lg">
              <ServerCrash className="w-8 h-8 text-rose-500 mb-3" />
              <h3 className="text-sm font-semibold text-[#f7f8f8] mb-1.5">Sistemas Offline</h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed mb-4">
                Autenticación no disponible. Intente más tarde.
              </p>
              <button
                onClick={() => setIsOffline(false)}
                className="bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] text-[#f7f8f8] text-xs font-medium py-2 px-4 rounded-md transition-colors"
              >
                Volver
              </button>
            </div>
          )}

          {/* ─── SLIDING MODE SELECTOR ─── */}
          {registration && (
            <div className="relative flex bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-md p-1 mb-4" role="tablist" aria-label="Modo de acceso">
              <div
                aria-hidden="true"
                className={clsx(
                  'absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-[5px] bg-[#FFD400] transition-transform duration-300 ease-out',
                  view === 'register' ? 'translate-x-full' : 'translate-x-0'
                )}
              />
              <button
                type="button"
                role="tab"
                aria-selected={view !== 'register'}
                onClick={() => switchView('login')}
                className={clsx(
                  'relative z-10 flex-1 py-1.5 text-[11px] font-semibold rounded-[5px] transition-colors duration-300',
                  view !== 'register' ? 'text-black' : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                )}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'register'}
                onClick={() => switchView('register')}
                className={clsx(
                  'relative z-10 flex-1 py-1.5 text-[11px] font-semibold rounded-[5px] transition-colors duration-300',
                  view === 'register' ? 'text-black' : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                )}
              >
                Registrar Empresa
              </button>
            </div>
          )}

          {/* ─── LOGIN VIEW ─── */}
          {view === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {error && <ErrorBanner message={error} onClose={() => setError('')} />}

              {/* Email — compact */}
              <div>
                <label htmlFor="login-email" className="block text-[12px] font-medium text-[#8a8f98] mb-1.5">
                  Correo
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@tad.do"
                  required
                  className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2.5 text-[13px] text-[#f7f8f8] placeholder:text-[#62666d] focus:outline-none focus:border-[rgba(255,255,255,0.15)] focus:ring-1 focus:ring-[rgba(255,255,255,0.1)] transition-all"
                />
              </div>

              {/* Password — compact, inline label + forgot link */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="text-[12px] font-medium text-[#8a8f98]">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => switchView('forgot')}
                    className="text-[11px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={handleKeyUp}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2.5 pr-10 text-[13px] text-[#f7f8f8] placeholder:text-[#62666d] focus:outline-none focus:border-[rgba(255,255,255,0.15)] focus:ring-1 focus:ring-[rgba(255,255,255,0.1)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-2.5 flex items-center text-[#62666d] hover:text-[#8a8f98] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {capsLock && (
                  <p className="text-amber-400 text-[11px] mt-1.5">Bloqueo de mayúsculas activado</p>
                )}
              </div>

              {/* Submit — high contrast, clearly legible */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading || lockedMs > 0}
                className="w-full bg-[#f7f8f8] text-[#08090a] font-semibold text-[13px] py-2.5 rounded-md transition-all hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#08090a]/30 border-t-transparent rounded-full animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : lockedMs > 0 ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Bloqueado ({Math.ceil(lockedMs / 1000)}s)</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Iniciar sesión</span>
                  </>
                )}
              </button>

              {/* ─── OAUTH DIVIDER + GOOGLE SIGN-IN ─── */}
              {config.role !== 'DRIVER' && (
                <>
                  <div className="flex items-center gap-3 pt-1" aria-hidden="true">
                    <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
                    <span className="text-[10px] uppercase tracking-widest text-[#62666d] font-semibold">o</span>
                    <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
                  </div>

                  <GoogleSignInButton
                    config={config}
                    disabled={loading || lockedMs > 0}
                  />
                </>
              )}
            </form>
          )}

          {/* ─── REGISTER VIEW ─── */}
          {view === 'register' && registration && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="text-center mb-1">
                <h2 className="text-base font-semibold text-[#f7f8f8] mb-1">Registrar Empresa</h2>
                <p className="text-[12px] text-[#8a8f98] leading-relaxed">
                  Crea tu cuenta y lanza tu primera campaña DOOH en minutos.
                </p>
              </div>

              {error && <ErrorBanner message={error} onClose={() => setError('')} />}

              {registration.referralCode ? (
                <div className="flex items-center gap-2 p-2 bg-[#FFD400]/10 border border-[#FFD400]/25 rounded-md text-[11px] text-[#FFD400]">
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Código de referido aplicado: <strong>{registration.referralCode}</strong></span>
                </div>
              ) : null}

              <div>
                <label htmlFor="register-company" className="block text-[12px] font-medium text-[#8a8f98] mb-1.5">
                  Empresa
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-2.5 flex items-center text-[#62666d] pointer-events-none">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="register-company"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Mi Empresa S.R.L."
                    required
                    maxLength={120}
                    className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-md pl-9 pr-3 py-2.5 text-[13px] text-[#f7f8f8] placeholder:text-[#62666d] focus:outline-none focus:border-[rgba(255,255,255,0.15)] focus:ring-1 focus:ring-[rgba(255,255,255,0.1)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-contact" className="block text-[12px] font-medium text-[#8a8f98] mb-1.5">
                  Nombre de contacto
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-2.5 flex items-center text-[#62666d] pointer-events-none">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="register-contact"
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Juan Pérez"
                    required
                    maxLength={120}
                    className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-md pl-9 pr-3 py-2.5 text-[13px] text-[#f7f8f8] placeholder:text-[#62666d] focus:outline-none focus:border-[rgba(255,255,255,0.15)] focus:ring-1 focus:ring-[rgba(255,255,255,0.1)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-email" className="block text-[12px] font-medium text-[#8a8f98] mb-1.5">
                  Correo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-2.5 flex items-center text-[#62666d] pointer-events-none">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="empresa@correo.com"
                    required
                    className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-md pl-9 pr-3 py-2.5 text-[13px] text-[#f7f8f8] placeholder:text-[#62666d] focus:outline-none focus:border-[rgba(255,255,255,0.15)] focus:ring-1 focus:ring-[rgba(255,255,255,0.1)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-phone" className="block text-[12px] font-medium text-[#8a8f98] mb-1.5">
                  Teléfono <span className="text-[#62666d]">(opcional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-2.5 flex items-center text-[#62666d] pointer-events-none">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="register-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="809-555-5555"
                    maxLength={20}
                    className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-md pl-9 pr-3 py-2.5 text-[13px] text-[#f7f8f8] placeholder:text-[#62666d] focus:outline-none focus:border-[rgba(255,255,255,0.15)] focus:ring-1 focus:ring-[rgba(255,255,255,0.1)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-password" className="block text-[12px] font-medium text-[#8a8f98] mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={handleKeyUp}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2.5 pr-10 text-[13px] text-[#f7f8f8] placeholder:text-[#62666d] focus:outline-none focus:border-[rgba(255,255,255,0.15)] focus:ring-1 focus:ring-[rgba(255,255,255,0.1)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-2.5 flex items-center text-[#62666d] hover:text-[#8a8f98] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {capsLock && (
                  <p className="text-amber-400 text-[11px] mt-1.5">Bloqueo de mayúsculas activado</p>
                )}
              </div>

              <button
                id="register-submit"
                type="submit"
                disabled={loading || lockedMs > 0}
                className="w-full bg-[#FFD400] text-black font-semibold text-[13px] py-2.5 rounded-md transition-all hover:bg-[#ffdd33] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-transparent rounded-full animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Crear cuenta empresarial</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ─── FORGOT VIEW ─── */}
          {view === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="text-center mb-1">
                <h2 className="text-base font-semibold text-[#f7f8f8] mb-1">Recuperar acceso</h2>
                <p className="text-[12px] text-[#8a8f98] leading-relaxed">
                  Te enviaremos un enlace seguro para restablecer tu contraseña.
                </p>
              </div>

              {error && <ErrorBanner message={error} onClose={() => setError('')} />}

              <div>
                <label htmlFor="forgot-email" className="block text-[12px] font-medium text-[#8a8f98] mb-1.5">
                  Correo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-2.5 flex items-center text-[#62666d] pointer-events-none">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@tad.do"
                    required
                    className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-md pl-9 pr-3 py-2.5 text-[13px] text-[#f7f8f8] placeholder:text-[#62666d] focus:outline-none focus:border-[rgba(255,255,255,0.15)] focus:ring-1 focus:ring-[rgba(255,255,255,0.1)] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || lockedMs > 0}
                className="w-full bg-[#f7f8f8] text-[#08090a] font-semibold text-[13px] py-2.5 rounded-md transition-all hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#08090a]/30 border-t-transparent rounded-full animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : lockedMs > 0 ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Bloqueado ({Math.ceil(lockedMs / 1000)}s)</span>
                  </>
                ) : (
                  <span>Enviar instrucciones</span>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={returnToLogin}
                  className="text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
                >
                  ← Volver
                </button>
              </div>
            </form>
          )}

          {/* ─── FORGOT SENT ─── */}
          {view === 'forgot-sent' && (
            <div className="text-center py-4 space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-emerald-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#f7f8f8] mb-1">Enlace enviado</h2>
                <p className="text-[12px] text-[#8a8f98] leading-relaxed max-w-[260px] mx-auto">
                  Si existe una cuenta asociada a <span className="text-[#f7f8f8] font-medium">{email}</span>, recibirás un enlace seguro.
                </p>
              </div>
              <button
                onClick={returnToLogin}
                className="inline-flex items-center gap-1 text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
              >
                <ArrowRight className="w-3 h-3" />
                Volver al inicio
              </button>
            </div>
          )}
        </div>

        {/* Footer — minimal */}
        <p className="text-center text-[11px] text-[#62666d] mt-5">
          TAD Taxi Advertising S.R.L.
        </p>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="flex items-start gap-2.5 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-md text-[12px] text-rose-200">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-400 mt-0.5" />
      <p className="flex-1 leading-relaxed">{message}</p>
      <button onClick={onClose} type="button" className="text-rose-400/60 hover:text-rose-400 transition-colors flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
