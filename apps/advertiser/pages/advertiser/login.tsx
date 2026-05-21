import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '@tad/services';
import { PORTAL_CONFIGS } from '@tad/services';
import { LogIn, Eye, EyeOff, AlertCircle, X } from 'lucide-react';
import { ErrorBoundary } from '@tad/ui';
import { toast } from 'sonner';

export default function AdvertiserLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  
  const config = PORTAL_CONFIGS.ADVERTISER;

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState('CapsLock'));
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, ingresa tu correo y contraseña.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!data.session || !data.user) throw new Error('No se pudo establecer la sesión.');

      const userRole = data.user.app_metadata?.role || data.user.role || 'GUEST';
      if (userRole !== config.role) {
        await supabase.auth.signOut();
        throw new Error(`Esta cuenta no tiene privilegios para acceder al ${config.name}.`);
      }

      if (typeof window !== 'undefined' && (window as any).umami) {
        (window as any).umami.track('auth_login_attempt', { status: 'success', portal: config.role });
      }

      const isSecure = window.location.protocol === 'https:';
      document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      localStorage.setItem(config.tokenKey, data.session.access_token);
      localStorage.setItem(config.userKey, JSON.stringify(data.user));

      toast.success('Acceso autorizado', { description: `Bienvenido al ${config.name}` });
      router.replace(config.dashboardPath);

    } catch (err: any) {
      console.error('Login Error:', err);
      let msg = err.message || 'Credenciales incorrectas.';
      if (err.message?.includes('Invalid login credentials')) {
        msg = 'Correo o contraseña incorrectos.';
      }
      setError(msg);
      
      if (typeof window !== 'undefined' && (window as any).umami) {
        (window as any).umami.track('auth_login_attempt', { status: 'error', portal: config.role });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 selection:bg-yellow-400 selection:text-black font-sans">
        <Head>
          <title>Login | {config.name}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        </Head>

        <div className="flex flex-col items-center mb-8">
          <div className="text-yellow-400 font-black text-5xl tracking-tighter select-none mb-1">
            TAD<span className="text-white text-xs tracking-widest block text-center font-normal mt-1 opacity-60">DOOH PLATFORM</span>
          </div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-2">{config.subtitle}</p>
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
                <label htmlFor="login-email" className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
                <input 
                  id="login-email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="anunciante@tad.do" 
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
        </div>
      </div>
    </ErrorBoundary>
  );
}
