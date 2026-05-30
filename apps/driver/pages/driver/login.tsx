import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
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

      const payload = response.data || {};
      const accessToken = payload.access_token || payload.token;

      if (accessToken || response.status === 200) {
        if (!accessToken) {
          throw new Error('El servidor no devolvió un token de acceso válido.');
        }
        const isSecure = window.location.protocol === 'https:';
        const storedUser = {
          id: payload.driverId || payload.entityId || payload.user?.id || '',
          email: payload.email || phone,
          role: payload.role || 'DRIVER',
          entityId: payload.entityId || payload.driverId || payload.user?.entityId || payload.user?.id || '',
          name: payload.name || payload.fullName || phone,
          deviceId: payload.deviceId || null,
          contractAccepted: Boolean(payload.contractAccepted),
          agreementVersion: payload.agreementVersion || null,
          onboardingStatus: payload.onboardingStatus || 'UNKNOWN',
          bankAccountConfigured: Boolean(payload.bankAccountConfigured),
        };

        document.cookie = `sb-access-token=${accessToken}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        localStorage.setItem('tad_driver_token', accessToken);
        localStorage.setItem('tad_driver_user', JSON.stringify(storedUser));

        if (!storedUser.contractAccepted || !storedUser.bankAccountConfigured) {
          sessionStorage.setItem('tad_driver_force_onboarding', '1');
        } else {
          sessionStorage.removeItem('tad_driver_force_onboarding');
        }

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
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 selection:bg-yellow-400 selection:text-black font-sans">
        <Head>
          <title>Login | TAD DRIVER</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        </Head>

        <div className="flex flex-col items-center mb-8">
          <div className="text-yellow-400 font-black text-5xl tracking-tighter select-none mb-1">
            TAD<span className="text-white text-xs tracking-widest block text-center font-normal mt-1 opacity-60">DOOH PLATFORM</span>
          </div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-2">Portal del Conductor</p>
        </div>

        <div className="w-full max-w-md bg-zinc-950/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-950/50 border border-red-500 rounded-lg flex items-center gap-4 text-red-200 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                <p className="font-medium flex-1">{error}</p>
                <button onClick={() => setError('')} type="button" className="text-red-400 hover:text-red-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="login-phone" className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Teléfono</label>
                <input 
                  id="login-phone" 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="809-555-5555" 
                  required
                  className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10 transition-all text-sm"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Contraseña</label>
                <div className="relative">
                  <input 
                    id="login-password" 
                    type={showPassword ? 'text' : 'password'}
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    onKeyUp={handleKeyUp}
                    placeholder="••••••••••••" 
                    required 
                    minLength={6}
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10 transition-all text-sm pr-12"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} className="absolute inset-y-0 right-4 flex items-center text-zinc-400 hover:text-yellow-400 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {capsLock && <p className="text-yellow-400 text-xs mt-2">⚠️ Bloqueo de mayúsculas activado</p>}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-yellow-400/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>
          <p className="text-center text-sm text-zinc-400 mt-5">
            ¿Quieres unirte a la red TAD?{' '}
            <Link href="/driver/onboarding" className="text-yellow-400 hover:text-yellow-300 font-semibold">
              Ir al onboarding
            </Link>
          </p>
        </div>
      </div>
    </ErrorBoundary>
  );
}
