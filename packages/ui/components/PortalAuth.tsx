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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans text-white">
      <Head>
        <title>Login | {config.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Subtle ambient glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] blur-[120px] rounded-full opacity-[0.07]"
          style={{ backgroundColor: config.accentColor }}
        />
      </div>

      {/* Main container */}
      <div className={clsx(
        "w-full max-w-[400px] transition-all duration-700",
        mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      )}>
        {/* Logo + title */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5 bg-yellow-400 shadow-lg"
          >
            <span className="text-lg font-bold text-black tracking-tight">T</span>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">
            {config.name}
          </h1>
          <p className="text-sm text-zinc-500">
            {config.subtitle}
          </p>
        </div>

        {/* Card */}
        <div className="relative bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">

          {/* Offline overlay */}
          {isOffline && (
            <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center rounded-2xl">
              <ServerCrash className="w-10 h-10 text-rose-500 mb-4" />
              <h3 className="text-base font-semibold text-white mb-2">Sistemas Offline</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-5">
                El sistema de autenticación no está disponible. Intente más tarde.
              </p>
              <button
                onClick={() => setIsOffline(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium py-2.5 px-5 rounded-lg transition-colors"
              >
                Volver
              </button>
            </div>
          )}

          {/* ─── LOGIN VIEW ─── */}
          {view === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              {error && <ErrorBanner message={error} onClose={() => setError('')} />}

              {/* Email */}
              <div>
                <label htmlFor="login-email" className="block text-xs font-medium text-zinc-400 mb-2">
                  Correo electrónico
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@tad.do"
                  required
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="login-password" className="block text-xs font-medium text-zinc-400">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => switchView('forgot')}
                    className="text-xs text-zinc-500 hover:text-white transition-colors"
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
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-3 pr-11 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {capsLock && (
                  <p className="text-amber-400 text-xs mt-2">
                    Bloqueo de mayúsculas activado
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading || lockedMs > 0}
                className="w-full bg-white text-zinc-950 font-medium text-sm py-3 rounded-lg transition-all hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : lockedMs > 0 ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Bloqueado ({Math.ceil(lockedMs / 1000)}s)</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Iniciar sesión</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ─── FORGOT VIEW ─── */}
          {view === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-5">
              <div className="text-center mb-2">
                <h2 className="text-lg font-semibold text-white mb-1">Recuperar acceso</h2>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Te enviaremos un enlace seguro para restablecer tu contraseña.
                </p>
              </div>

              {error && <ErrorBanner message={error} onClose={() => setError('')} />}

              <div>
                <label htmlFor="forgot-email" className="block text-xs font-medium text-zinc-400 mb-2">
                  Correo electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center text-zinc-600 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@tad.do"
                    required
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || lockedMs > 0}
                className="w-full bg-white text-zinc-950 font-medium text-sm py-3 rounded-lg transition-all hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : lockedMs > 0 ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Bloqueado ({Math.ceil(lockedMs / 1000)}s)</span>
                  </>
                ) : (
                  <span>Enviar instrucciones</span>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="text-xs text-zinc-500 hover:text-white transition-colors"
                >
                  ← Volver al inicio
                </button>
              </div>
            </form>
          )}

          {/* ─── FORGOT SENT ─── */}
          {view === 'forgot-sent' && (
            <div className="text-center py-6 space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/10 rounded-xl">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">Enlace enviado</h2>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-[280px] mx-auto">
                  Si existe una cuenta asociada a <span className="text-white font-medium">{email}</span>, recibirás un enlace seguro.
                </p>
              </div>
              <button
                onClick={() => switchView('login')}
                className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Volver al inicio
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          TAD Taxi Advertising S.R.L.
        </p>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-200">
      <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
      <p className="flex-1 leading-relaxed">{message}</p>
      <button onClick={onClose} type="button" className="text-rose-400/60 hover:text-rose-400 transition-colors flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
