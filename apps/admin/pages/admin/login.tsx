import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import { Shield, Lock, Eye, EyeOff, AlertCircle, X, LogIn } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        '/api/proxy/admin/login',
        { email, password },
        { withCredentials: true }
      );

      const payload = response.data || {};
      const accessToken = payload.access_token || payload.token;

      if (!accessToken) {
        throw new Error('El servidor no devolvió un token de acceso válido.');
      }

      const isSecure = window.location.protocol === 'https:';
      const storedUser = {
        id: payload.adminId || payload.entityId || payload.user?.id || '',
        email: payload.email || email,
        role: payload.role || 'ADMIN',
        entityId: payload.entityId || payload.adminId || payload.user?.entityId || '',
        name: payload.name || payload.fullName || email,
        app_metadata: { role: 'ADMIN', entityId: payload.adminId || payload.entityId },
      };

      document.cookie = `sb-access-token=${accessToken}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      localStorage.setItem('tad_admin_token', accessToken);
      localStorage.setItem('tad_admin_user', JSON.stringify(storedUser));

      router.replace('/admin/dashboard/realtime');
    } catch (err: any) {
      console.error('Admin Login Error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Correo o contraseña incorrectos.');
      } else if (err.response?.status === 402) {
        setError('Suscripción Pendiente. Contacta a soporte: 809-800-1234');
      } else {
        setError('Error de conexión con el servidor. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 font-sans transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <Head>
        <title>Login | TAD ADMIN</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-emerald-600/8 blur-[120px] rounded-full translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-yellow-400/5 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4" />
      </div>

      {/* Brand */}
      <div className="text-center mb-10 z-10">
        <div className="inline-flex items-center justify-center p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl mb-6 shadow-2xl">
          <Shield className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight uppercase mb-2">
          TAD <span className="text-emerald-400">ADMIN</span>
        </h1>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em]">Console de Operaciones</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden z-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-wider flex-1">{error}</p>
              <button onClick={() => setError('')} type="button" className="text-red-500/60 hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label htmlFor="admin-email" className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-5 flex items-center text-gray-600 pointer-events-none">
                  <Shield className="w-4 h-4" />
                </div>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tad.com.do"
                  required
                  className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-emerald-400/40 focus:bg-black/60 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-5 flex items-center text-gray-600 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  minLength={6}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-14 py-4 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-emerald-400/40 focus:bg-black/60 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                  className="absolute inset-y-0 right-4 flex items-center text-gray-600 hover:text-emerald-400 transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-400 hover:bg-white text-black font-black uppercase tracking-[0.2em] text-xs py-5 rounded-2xl transition-all shadow-xl hover:shadow-emerald-400/20 flex items-center justify-center gap-3 disabled:opacity-50 group/btn overflow-hidden relative active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
            {loading ? (
              <span className="flex items-center gap-3 relative z-10">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Autenticando...
              </span>
            ) : (
              <span className="flex items-center gap-3 relative z-10">
                <LogIn className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                Iniciar Sesión
              </span>
            )}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.4em]">
            © 2026 TAD ADVERTISING SOLUTIONS
          </p>
        </div>
      </div>
    </div>
  );
}