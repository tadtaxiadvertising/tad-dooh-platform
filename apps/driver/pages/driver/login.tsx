import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import { Phone, Lock, Eye, EyeOff, AlertCircle, X, CheckCircle, ArrowRight, LogIn } from 'lucide-react';
import { ErrorBoundary } from '@tad/ui';

export default function DriverLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState('CapsLock')) {
      setCapsLock(true);
    } else {
      setCapsLock(false);
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      setError('Por favor, ingresa tu número de teléfono y contraseña.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Uso del Proxy Contract para DriversService.login()
      const response = await axios.post(
        '/api/proxy/drivers/login',
        { phone, password },
        { withCredentials: true }
      );

      if (response.data?.token || response.status === 200) {
        // Redirigir al dashboard tras un login exitoso
        router.replace('/driver/dashboard');
      }
    } catch (err: any) {
      console.error('Login Error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Teléfono o contraseña incorrectos.');
      } else if (err.response?.status === 402) {
        setError('Suscripción Pendiente. Contacta a soporte.');
      } else {
        setError('Error de conexión con el servidor. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden font-sans text-white">
        <Head>
          <title>Login | TAD DRIVER</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        </Head>

        {/* Environment Glow */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] blur-[180px] rounded-full animate-pulse-soft opacity-10 bg-yellow-400" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-white/[0.01] blur-[150px] rounded-full" />
        </div>

        <div className={`w-full max-w-[440px] transition-all duration-1000 ${mounted ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"}`}>
          {/* Brand */}
          <div className="text-center mb-12">
            <div className="relative inline-block mb-8 group">
              <div className="absolute inset-0 blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity duration-1000 bg-yellow-400" />
              <div className="relative w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform duration-700 bg-yellow-400">
                <span className="text-3xl font-black text-black tracking-tighter">TAD</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-px bg-white/10" />
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.4em]">Portal del Conductor</p>
                <div className="w-10 h-px bg-white/10" />
              </div>
              <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">
                TAD <span className="text-yellow-400">DRIVER</span>
              </h1>
            </div>
          </div>

          {/* Form Card */}
          <div className="relative group/form">
            <div className="absolute -inset-1 blur-2xl opacity-0 group-hover/form:opacity-20 transition-opacity duration-1000 bg-gradient-to-br from-yellow-400 to-transparent" />

            <div className="relative bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-[2.5rem] p-10 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 opacity-30 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />

              <form onSubmit={handleLoginSubmit} className="space-y-8">
                {error && (
                  <div className="mb-6 p-3 bg-red-950/50 border border-red-500 rounded-lg flex items-center gap-4 text-red-200 text-sm animate-fade-in">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                    <p className="font-medium leading-relaxed flex-1">{error}</p>
                    <button onClick={() => setError('')} type="button" className="text-red-400/50 hover:text-red-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Phone */}
                  <div className="group/input">
                    <div className="flex justify-between items-center mb-3">
                      <label htmlFor="login-phone" className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${phone ? 'text-yellow-400' : 'text-zinc-400'}`}>
                        Teléfono
                      </label>
                      <Phone className={`w-3.5 h-3.5 transition-colors ${phone ? 'text-yellow-400' : 'text-zinc-600'}`} />
                    </div>
                    <input id="login-phone" type="tel" value={phone}
                      onChange={(e) => setPhone(e.target.value)} placeholder="809-555-5555" required
                      className="w-full bg-black/50 border border-white/5 rounded-2xl px-6 py-4 text-white text-xs font-bold uppercase tracking-widest placeholder:text-zinc-600 focus:outline-none focus:bg-black/80 focus:ring-1 focus:ring-yellow-500 transition-all shadow-inner"
                      style={{ borderBottomColor: phone ? '#facc15' : '' }}
                    />
                  </div>

                  {/* Password */}
                  <div className="group/input">
                    <div className="flex justify-between items-center mb-3">
                      <label htmlFor="login-password" className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${password ? 'text-yellow-400' : 'text-zinc-400'}`}>
                        Contraseña
                      </label>
                      <Lock className={`w-3.5 h-3.5 transition-colors ${password ? 'text-yellow-400' : 'text-zinc-600'}`} />
                    </div>
                    <div className="relative">
                      <input id="login-password" type={showPassword ? 'text' : 'password'}
                        value={password} onChange={(e) => setPassword(e.target.value)} onKeyUp={handleKeyUp}
                        placeholder={showPassword ? 'MiContraseña' : '••••••••••••'} required minLength={6}
                        className="w-full bg-black/50 border border-white/5 rounded-2xl px-6 py-4 pr-14 text-white text-xs font-bold tracking-[0.3em] placeholder:text-zinc-600 focus:outline-none focus:bg-black/80 focus:ring-1 focus:ring-yellow-500 transition-all shadow-inner"
                        style={{ borderBottomColor: password ? '#facc15' : '' }}
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

                {/* Submit */}
                <button type="submit" disabled={loading}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold uppercase tracking-[0.2em] text-[10px] py-5 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-4 group/btn relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-black"
                >
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
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 text-center opacity-40 hover:opacity-100 transition-opacity duration-700">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                TAD ZERO TRUST INFRASTRUCTURE
              </p>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
