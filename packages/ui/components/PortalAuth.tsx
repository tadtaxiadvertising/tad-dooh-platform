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

      // Check Role
      const userRole = data.user.app_metadata?.role || data.user.role || 'GUEST';
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
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 relative overflow-hidden font-sans text-white">
      <Head>
        <title>Login | {config.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Environment Glow (Dynamic color based on portal) */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] blur-[180px] rounded-full animate-pulse-soft opacity-10" 
          style={{ backgroundColor: config.accentColor }} 
        />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-white/[0.01] blur-[150px] rounded-full" />
      </div>

      <div className={clsx(
        "w-full max-w-[440px] transition-all duration-1000",
        mounted ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
      )}>
        {/* Brand */}
        <div className="text-center mb-12">
          <div className="relative inline-block mb-8 group">
            <div 
              className="absolute inset-0 blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity duration-1000" 
              style={{ backgroundColor: config.accentColor }} 
            />
            <div 
              className="relative w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform duration-700"
              style={{ backgroundColor: config.accentColor }} 
            >
              <ShieldCheck className="w-12 h-12 text-black" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-px bg-white/10" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">{config.subtitle}</p>
              <div className="w-10 h-px bg-white/10" />
            </div>
            <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">
              {config.name.split(' ')[0]} <span style={{ color: config.accentColor }}>{config.name.split(' ').slice(1).join(' ')}</span>
            </h1>
          </div>
        </div>

        {/* Form Card (Glassmorphism) */}
        <div className="relative group/form">
          <div 
            className="absolute -inset-1 blur-2xl opacity-0 group-hover/form:opacity-20 transition-opacity duration-1000" 
            style={{ backgroundImage: `linear-gradient(to bottom right, ${config.accentColor}, transparent)` }} 
          />

          <div className="relative bg-slate-950/60 backdrop-blur-md border border-white/[0.05] rounded-[2.5rem] p-10 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
            <div 
              className="absolute top-0 left-0 w-full h-0.5 opacity-30" 
              style={{ backgroundImage: `linear-gradient(to right, transparent, ${config.accentColor}, transparent)` }} 
            />

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
                      className="w-full bg-black/50 border border-white/5 rounded-2xl px-6 py-4 text-white text-xs font-bold uppercase tracking-widest placeholder:text-gray-700 focus:outline-none focus:bg-black/80 transition-all shadow-inner"
                      style={{ borderBottomColor: email ? config.accentColor : '' }}
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
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder={showPassword ? 'MiContraseña' : '••••••••••••'} required minLength={6}
                        className="w-full bg-black/50 border border-white/5 rounded-2xl px-6 py-4 pr-14 text-white text-xs font-bold tracking-[0.3em] placeholder:text-gray-700 focus:outline-none focus:bg-black/80 transition-all shadow-inner"
                        style={{ borderBottomColor: password ? config.accentColor : '' }}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                        className="absolute inset-y-0 right-4 flex items-center text-gray-600 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
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
                      className="w-full bg-black/50 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-white text-xs font-bold uppercase tracking-widest placeholder:text-gray-700 focus:outline-none transition-all"
                      style={{ borderBottomColor: email ? config.accentColor : '' }}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading || lockedMs > 0}
                  className="w-full text-black font-bold uppercase tracking-[0.2em] text-[10px] py-5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
                  style={{ backgroundColor: config.accentColor }}
                >
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </span>
                  ) : lockedMs > 0 ? (
                    <span className="flex items-center gap-3">
                      <Lock className="w-4 h-4" />
                      Bloqueado ({Math.ceil(lockedMs / 1000)}s)
                    </span>
                  ) : 'Enviar Instrucciones'}
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
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center opacity-40 hover:opacity-100 transition-opacity duration-700">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              TAD ZERO TRUST INFRASTRUCTURE
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="mb-6 p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-400">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed flex-1">{message}</p>
      <button onClick={onClose} type="button" className="text-rose-500/50 hover:text-rose-400 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
