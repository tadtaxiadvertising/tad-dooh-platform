import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@tad/services';
import { LogIn, AlertCircle, Eye, EyeOff, Lock, ArrowRight, CheckCircle, X, Mail, ServerCrash } from 'lucide-react';
import clsx from 'clsx';
import Head from 'next/head';
import { toast } from 'sonner';

import {
  LoginSchema,
  RecoverySchema,
  PortalConfig,
  getAuthCircuitBreaker,
  recordFailedAttempt,
  checkRateLimit,
  clearRateLimit,
} from '@tad/services';

type AuthView = 'login' | 'forgot' | 'forgot-sent';

interface PortalAuthProps {
  config: PortalConfig;
}

export function PortalAuth({ config }: PortalAuthProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [view, setView] = useState<AuthView>('login');

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

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState('CapsLock')) {
      setCapsLock(true);
    } else {
      setCapsLock(false);
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (lockedMs > 0) return;

    setError('');

    // Zod Validation
    const result = LoginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const circuitBreaker = getAuthCircuitBreaker();

    try {
      // Execute through Circuit Breaker to prevent Silent Fails
      const { data, error: authError } = await circuitBreaker.execute(() =>
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
      if (typeof window !== 'undefined' && (window as any).umami) {
        (window as any).umami.track('auth_login_attempt', { status: 'success', portal: config.role });
      }

      // Save Local Tokens
      const isSecure = window.location.protocol === 'https:';
      document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
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

      if (typeof window !== 'undefined' && (window as any).umami) {
        (window as any).umami.track('auth_login_attempt', { status: 'error', portal: config.role });
      }
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
      setError(result.error.errors[0].message);
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
      if (typeof window !== 'undefined' && (window as any).umami) {
        (window as any).umami.track('auth_recovery_requested', { portal: config.role });
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

      {/* Single subtle ambient glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] blur-[140px] rounded-full opacity-[0.05]"
          style={{ backgroundColor: config.accentColor }}
        />
      </div>

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
                  onClick={() => switchView('login')}
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
                onClick={() => switchView('login')}
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
