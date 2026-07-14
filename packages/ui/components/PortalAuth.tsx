import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@tad/services';
import { ShieldCheck, LogIn, AlertCircle, Eye, EyeOff, Fingerprint, Lock, KeyRound, ArrowRight, CheckCircle, X, Mail, ServerCrash } from 'lucide-react';
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
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans text-white">
      <Head>
        <title>Login | {config.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* ── Grid Pattern Background ── */}
      <div
        className="fixed inset-0 -z-20 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(${config.accentColor} 1px, transparent 1px), linear-gradient(90deg, ${config.accentColor} 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Environment Glow (Dynamic accent color) */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] blur-[180px] rounded-full animate-pulse-soft opacity-25"
          style={{ backgroundColor: config.accentColor }}
        />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/[0.02] blur-[150px] rounded-full" />
      </div>

      {/* ── Split Layout Container ── */}
      <div className={clsx(
        "w-full max-w-5xl transition-all duration-1000",
        mounted ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
      )}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-0 rounded-[2.5rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.6)] border border-white/5">

          {/* ═══ LEFT: Branding Panel ═══ */}
          <div
            className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-zinc-900 to-black"
            style={{ borderRight: `1px solid ${config.accentColor}15` }}
          >
            {/* Accent glow blob */}
            <div
              className="absolute -top-32 -right-32 w-80 h-80 blur-[100px] rounded-full opacity-20 animate-pulse-soft"
              style={{ backgroundColor: config.accentColor }}
            />
            {/* Grid overlay */}
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(${config.accentColor} 1px, transparent 1px), linear-gradient(90deg, ${config.accentColor} 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
              }}
            />

            {/* Logo + Portal name */}
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl bg-yellow-400">
                  <span className="text-xl font-black text-black tracking-tighter">TAD</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.4em] mb-1">{config.subtitle}</p>
                  <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                    {config.name.split(' ')[0]} <span style={{ color: config.accentColor }}>{config.name.split(' ').slice(1).join(' ')}</span>
                  </h1>
                </div>
              </div>
            </div>

            {/* Feature highlights */}
            <div className="relative z-10 space-y-6 py-8">
              <FeatureLine icon={<ShieldCheck className="w-4 h-4" style={{ color: config.accentColor }} />} accentColor={config.accentColor}
                title="Zero Trust Architecture" desc="Autenticación Supabase + Circuit Breaker" />
              <FeatureLine icon={<Lock className="w-4 h-4" style={{ color: config.accentColor }} />} accentColor={config.accentColor}
                title="Protección PKCE" desc="Rate limiting + detección de fuerza bruta" />
              <FeatureLine icon={<Fingerprint className="w-4 h-4" style={{ color: config.accentColor }} />} accentColor={config.accentColor}
                title="Validación Estricta" desc="Zod schemas con anti-inyección SQL" />
            </div>

            {/* Footer badge */}
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">TAD ZERO TRUST INFRASTRUCTURE</p>
            </div>
          </div>

          {/* ═══ RIGHT: Form Card ═══ */}
          <div className="relative bg-zinc-900/70 backdrop-blur-xl overflow-hidden">
            {/* Animated glow border — always visible */}
            <div
              className="absolute top-0 left-0 w-full h-0.5 opacity-60 animate-pulse-soft"
              style={{ backgroundImage: `linear-gradient(to right, transparent, ${config.accentColor}, transparent)` }}
            />
            {/* Specular highlight — top reflection */}
            <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

            {/* Mobile brand header (visible only on mobile) */}
            <div className="lg:hidden text-center pt-10 px-8">
              <div className="inline-block mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl mx-auto bg-yellow-400">
                  <span className="text-2xl font-black text-black tracking-tighter">TAD</span>
                </div>
              </div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.4em] mb-2">{config.subtitle}</p>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                {config.name.split(' ')[0]} <span style={{ color: config.accentColor }}>{config.name.split(' ').slice(1).join(' ')}</span>
              </h1>
            </div>

            {/* Offline Circuit Breaker State */}
            {isOffline && (
              <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
                <ServerCrash className="w-16 h-16 text-rose-500 mb-6 animate-pulse" />
                <h3 className="text-xl font-black uppercase tracking-tight mb-3">Sistemas Offline</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-6">
                  El sistema de autenticación no está disponible en este momento debido a un problema de red. Por favor intente más tarde.
                </p>
                <button
                  onClick={() => setIsOffline(false)}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-[0.2em] text-[10px] py-3 px-6 rounded-xl transition-all"
                >
                  Volver
                </button>
              </div>
            )}

            {/* Form padding container */}
            <div className="relative p-8 sm:p-10 lg:p-12">

              {/* ─── LOGIN VIEW ─── */}
              {view === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-8">
                  {error && <ErrorBanner message={error} onClose={() => setError('')} />}

                  <div className="space-y-6">
                    {/* Email */}
                    <div className="group/input">
                      <div className="flex justify-between items-center mb-3">
                        <label htmlFor="login-email" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest transition-colors" style={{ color: email ? config.accentColor : '' }}>
                          Correo Electrónico
                        </label>
                        <Fingerprint className="w-3.5 h-3.5 text-gray-700 transition-colors" style={{ color: email ? config.accentColor : '' }} />
                      </div>
                      <input id="login-email" type="email" value={email}
                        onChange={(e) => setEmail(e.target.value)} placeholder="usuario@tad.do" required
                        className="w-full bg-black/50 border border-white/5 rounded-2xl px-6 py-4 text-white text-xs font-bold uppercase tracking-widest placeholder:text-gray-700 focus:outline-none focus:bg-black/80 transition-all shadow-inner focus:ring-2"
                        style={{
                          borderBottomColor: email ? config.accentColor : '',
                          '--tw-ring-color': config.accentColor + '20',
                        } as React.CSSProperties}
                      />
                    </div>

                    {/* Password */}
                    <div className="group/input">
                      <div className="flex justify-between items-center mb-3">
                        <label htmlFor="login-password" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest transition-colors" style={{ color: password ? config.accentColor : '' }}>
                          Contraseña
                        </label>
                        <Lock className="w-3.5 h-3.5 text-gray-700 transition-colors" style={{ color: password ? config.accentColor : '' }} />
                      </div>
                      <div className="relative">
                        <input id="login-password" type={showPassword ? 'text' : 'password'}
                          value={password} onChange={(e) => setPassword(e.target.value)} onKeyUp={handleKeyUp}
                          placeholder={showPassword ? 'MiContraseña' : '••••••••••••'} required minLength={6}
                          className="w-full bg-black/50 border border-white/5 rounded-2xl px-6 py-4 pr-14 text-white text-xs font-bold tracking-[0.3em] placeholder:text-zinc-600 focus:outline-none focus:bg-black/80 focus:ring-1 transition-all shadow-inner"
                          style={{
                            borderBottomColor: password ? config.accentColor : '',
                            '--tw-ring-color': config.accentColor + '40',
                          } as React.CSSProperties}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                          className="absolute inset-y-0 right-4 flex items-center text-zinc-400 hover:text-yellow-400 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {capsLock && (
                        <p className="text-yellow-400 text-xs mt-2 animate-pulse">
                          ⚠️ Bloqueo de mayúsculas activado
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Forgot link */}
                  <div className="flex justify-end -mt-2">
                    <button type="button" onClick={() => switchView('forgot')}
                      className="text-[10px] font-bold text-gray-500 uppercase tracking-wider hover:text-white transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  {/* Submit */}
                  <button id="login-submit" type="submit" disabled={loading || lockedMs > 0}
                    className="w-full text-black font-bold uppercase tracking-[0.2em] text-[10px] py-5 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-4 group/btn relative overflow-hidden"
                    style={{ backgroundColor: config.accentColor }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 pointer-events-none" />
                    {loading ? (
                      <span className="flex items-center gap-3 relative z-10">
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Autenticando...
                      </span>
                    ) : lockedMs > 0 ? (
                      <span className="flex items-center gap-3 relative z-10">
                        <Lock className="w-4 h-4" />
                        Bloqueado ({Math.ceil(lockedMs / 1000)}s)
                      </span>
                    ) : (
                      <span className="flex items-center gap-3 relative z-10">
                        <LogIn className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        Iniciar Sesión
                      </span>
                    )}
                  </button>
                </form>
              )}

              {/* ─── FORGOT VIEW ─── */}
              {view === 'forgot' && (
                <form onSubmit={handleForgotSubmit} className="space-y-6">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ backgroundColor: `${config.accentColor}20` }}>
                      <KeyRound className="w-8 h-8" style={{ color: config.accentColor }} />
                    </div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight">Recuperar Acceso</h2>
                    <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                      Recibirás un enlace seguro de uso único para restablecer tu contraseña con protección PKCE.
                    </p>
                  </div>

                  {error && <ErrorBanner message={error} onClose={() => setError('')} />}

                  <div className="group/input">
                    <label htmlFor="forgot-email" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block transition-colors" style={{ color: email ? config.accentColor : '' }}>
                      Correo de Usuario
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-5 flex items-center text-gray-600 pointer-events-none">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input id="forgot-email" type="email" value={email}
                        onChange={e => setEmail(e.target.value)} placeholder="usuario@tad.do" required
                        className="w-full bg-black/50 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-white text-xs font-bold uppercase tracking-widest placeholder:text-gray-700 focus:outline-none focus:bg-black/80 focus:ring-2 transition-all shadow-inner"
                        style={{
                          borderBottomColor: email ? config.accentColor : '',
                          '--tw-ring-color': config.accentColor + '20',
                        } as React.CSSProperties}
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={loading || lockedMs > 0}
                    className="w-full text-black font-bold uppercase tracking-[0.2em] text-[10px] py-5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 relative overflow-hidden group/forgot-btn"
                    style={{ backgroundColor: config.accentColor }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/forgot-btn:translate-x-full transition-transform duration-1000 pointer-events-none" />
                    {loading ? (
                      <span className="flex items-center gap-3 relative z-10">
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Enviando...
                      </span>
                    ) : lockedMs > 0 ? (
                      <span className="flex items-center gap-3 relative z-10">
                        <Lock className="w-4 h-4" />
                        Bloqueado ({Math.ceil(lockedMs / 1000)}s)
                      </span>
                    ) : <span className="relative z-10">Enviar Instrucciones</span>}
                  </button>

                  <div className="text-center pt-4">
                    <button type="button" onClick={() => switchView('login')}
                      className="text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-white transition-colors"
                    >
                      ← Volver al inicio
                    </button>
                  </div>
                </form>
              )}

              {/* ─── FORGOT SENT ─── */}
              {view === 'forgot-sent' && (
                <div className="text-center py-8 space-y-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-3xl">
                    <CheckCircle className="w-10 h-10 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight mb-3">Enlace Enviado</h2>
                    <p className="text-[12px] text-gray-400 leading-relaxed max-w-[300px] mx-auto">
                      Si existe una cuenta asociada a <span className="text-white font-bold">{email}</span>, recibirás un enlace seguro.
                    </p>
                  </div>
                  <button onClick={() => switchView('login')}
                    className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider hover:text-white transition-colors"
                    style={{ color: config.accentColor }}
                  >
                    <ArrowRight className="w-3 h-3" />
                    Volver al inicio
                  </button>
                </div>
              )}

            </div>{/* end form padding container */}
          </div>{/* end right panel */}
        </div>{/* end split grid */}
      </div>
    </div>
  );
}

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="mb-6 p-3 bg-red-950/50 border border-red-500 rounded-lg flex items-center gap-4 text-red-200 text-sm animate-fade-in">
      <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
      <p className="font-medium leading-relaxed flex-1">{message}</p>
      <button onClick={onClose} type="button" className="text-red-400/50 hover:text-red-400 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function FeatureLine({ icon, title, desc, accentColor }: { icon: React.ReactNode; title: string; desc: string; accentColor: string }) {
  return (
    <div className="flex items-start gap-4 group/feature">
      <div
        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border transition-all group-hover/feature:scale-110"
        style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}20` }}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-white mb-1">{title}</p>
        <p className="text-[11px] text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
