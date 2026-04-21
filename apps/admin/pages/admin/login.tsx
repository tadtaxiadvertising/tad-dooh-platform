import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import { login as apiLogin } from '@tad/services';
import { ShieldCheck, LogIn, AlertCircle, Eye, EyeOff, Fingerprint, Lock, KeyRound, ArrowRight, CheckCircle, X, Mail } from 'lucide-react';
import clsx from 'clsx';
import Head from 'next/head';

type AuthView = 'login' | 'forgot' | 'forgot-sent';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<AuthView>('login');

  useEffect(() => { setMounted(true); }, []);

  const resetForm = () => { setError(''); setPassword(''); };
  const switchView = (v: AuthView) => { resetForm(); setView(v); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      if (data.user.role !== 'ADMIN') {
        throw new Error('Esta cuenta no tiene privilegios de administrador.');
      }
      const isSecure = window.location.protocol === 'https:';
      document.cookie = `sb-access-token=${data.access_token}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      router.replace('/admin');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Simulate — admin recovery should go through Supabase or internal IT
    setTimeout(() => { setView('forgot-sent'); setLoading(false); }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6 relative overflow-hidden selection:bg-tad-yellow selection:text-black font-sans">
      <Head>
        <title>Admin Login | TAD NODE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Environment Glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-tad-yellow/[0.04] blur-[180px] rounded-full animate-pulse-soft" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-white/[0.01] blur-[150px] rounded-full" />
      </div>

      <div className={clsx(
        "w-full max-w-[440px] transition-all duration-1000",
        mounted ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
      )}>
        {/* Brand */}
        <div className="text-center mb-12">
          <div className="relative inline-block mb-8 group">
            <div className="absolute inset-0 bg-tad-yellow blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
            <div className="relative w-24 h-24 bg-tad-yellow rounded-[2rem] flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform duration-700">
              <ShieldCheck className="w-12 h-12 text-black" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-px bg-white/10" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Integrated Core v4.5</p>
              <div className="w-10 h-px bg-white/10" />
            </div>
            <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">
              TAD <span className="text-tad-yellow">NODE</span>
            </h1>
          </div>
        </div>

        {/* Form Card */}
        <div className="relative group/form">
          <div className="absolute -inset-1 bg-gradient-to-br from-tad-yellow/20 to-transparent blur-2xl opacity-0 group-hover/form:opacity-100 transition-opacity duration-1000" />

          <div className="relative bg-zinc-900/40 backdrop-blur-3xl border border-white/[0.03] rounded-[2.5rem] p-10 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-tad-yellow/30 to-transparent" />

            {/* ─── LOGIN VIEW ─── */}
            {view === 'login' && (
              <form onSubmit={handleSubmit} className="space-y-8">
                {error && <ErrorBanner message={error} onClose={() => setError('')} />}

                <div className="space-y-6">
                  {/* Email */}
                  <div className="group/input">
                    <div className="flex justify-between items-center mb-3">
                      <label htmlFor="admin-email" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-focus-within/input:text-tad-yellow transition-colors">
                        Correo Electrónico
                      </label>
                      <Fingerprint className="w-3.5 h-3.5 text-gray-700 group-focus-within/input:text-tad-yellow transition-colors" />
                    </div>
                    <input id="admin-email" type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)} placeholder="admin@tad.do" required
                      className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-white text-xs font-bold uppercase tracking-widest placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow/50 focus:bg-zinc-900/80 transition-all shadow-inner"
                    />
                  </div>

                  {/* Password with Eye Toggle */}
                  <div className="group/input">
                    <div className="flex justify-between items-center mb-3">
                      <label htmlFor="admin-password" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-focus-within/input:text-tad-yellow transition-colors">
                        Contraseña
                      </label>
                      <Lock className="w-3.5 h-3.5 text-gray-700 group-focus-within/input:text-tad-yellow transition-colors" />
                    </div>
                    <div className="relative">
                      <input id="admin-password" type={showPassword ? 'text' : 'password'}
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder={showPassword ? 'MiContraseña' : '••••••••••••'} required minLength={6}
                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 pr-14 text-white text-xs font-bold tracking-[0.3em] placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow/50 focus:bg-zinc-900/80 transition-all shadow-inner"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                        className="absolute inset-y-0 right-4 flex items-center text-gray-600 hover:text-tad-yellow transition-colors"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Forgot link */}
                <div className="flex justify-end -mt-2">
                  <button type="button" onClick={() => switchView('forgot')}
                    className="text-[10px] font-bold text-gray-500 uppercase tracking-wider hover:text-tad-yellow transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {/* Submit */}
                <button id="login-submit" type="submit" disabled={loading}
                  className="w-full bg-tad-yellow hover:bg-white text-black font-bold uppercase tracking-[0.2em] text-[10px] py-5 rounded-2xl transition-all shadow-[0_10px_20px_rgba(250,212,0,0.1)] hover:shadow-[0_15px_30px_rgba(255,255,255,0.15)] disabled:bg-zinc-800 disabled:text-gray-500 disabled:shadow-none flex items-center justify-center gap-4 group/btn overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
                  {loading ? (
                    <span className="flex items-center gap-3 relative z-10">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Autenticando...
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
              <form onSubmit={handleForgot} className="space-y-6">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-tad-yellow/10 rounded-2xl mb-4">
                    <KeyRound className="w-8 h-8 text-tad-yellow" />
                  </div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Recuperar Acceso</h2>
                  <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                    Ingresa tu correo de administrador. Recibirás un enlace seguro para restablecer tu contraseña.
                  </p>
                </div>

                {error && <ErrorBanner message={error} onClose={() => setError('')} />}

                <div className="group/input">
                  <label htmlFor="forgot-email" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block group-focus-within/input:text-tad-yellow transition-colors">
                    Correo del Administrador
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-5 flex items-center text-gray-600 group-focus-within/input:text-tad-yellow transition-colors pointer-events-none">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input id="forgot-email" type="email" value={email}
                      onChange={e => setEmail(e.target.value)} placeholder="admin@tad.do" required
                      className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-white text-xs font-bold uppercase tracking-widest placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow/50 transition-all"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-tad-yellow hover:bg-white text-black font-bold uppercase tracking-[0.2em] text-[10px] py-5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </span>
                  ) : 'Enviar Instrucciones'}
                </button>

                <div className="text-center pt-4">
                  <button type="button" onClick={() => switchView('login')}
                    className="text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-tad-yellow transition-colors"
                  >
                    ← Volver al inicio de sesión
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
                    Si existe una cuenta de administrador con <span className="text-white font-bold">{email}</span>, recibirás un enlace seguro de restablecimiento.
                  </p>
                </div>
                <button onClick={() => switchView('login')}
                  className="inline-flex items-center gap-2 text-[11px] font-bold text-tad-yellow uppercase tracking-wider hover:text-white transition-colors"
                >
                  <ArrowRight className="w-3 h-3" />
                  Volver al inicio de sesión
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center opacity-40 hover:opacity-100 transition-opacity duration-700">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              TAD GLOBAL AUDIT NETWORK • EST. 2026
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-soft {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.05); }
        }
        .animate-pulse-soft { animation: pulse-soft 8s infinite ease-in-out; }
      `}</style>
    </div>
  );
}

// ── Admin Error Banner ──
function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="mb-6 p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-400">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed flex-1">{message}</p>
      <button onClick={onClose} className="text-rose-500/50 hover:text-rose-400 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
