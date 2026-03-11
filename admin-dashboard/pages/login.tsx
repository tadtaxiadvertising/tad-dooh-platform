import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../services/supabaseClient';
import { ShieldCheck, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !data.session) {
        throw new Error(authError?.message || 'Credenciales inválidas');
      }

      // Guardar el token también en localStorage para que el interceptor
      // de Axios en api.ts pueda leerlo en todas las peticiones al backend.
      localStorage.setItem('tad_admin_token', data.session.access_token);
      localStorage.setItem('tad_admin_user', JSON.stringify({
        id: data.user?.id,
        email: data.user?.email,
        name: 'Admin',
        role: 'ADMIN',
      }));

      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-tad-yellow/10 border border-tad-yellow/30 rounded-2xl mb-4">
            <ShieldCheck className="w-8 h-8 text-tad-yellow" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
            TAD <span className="text-tad-yellow">Admin</span>
          </h1>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-2">
            Sistema de Control Central
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-zinc-950/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                Email de Acceso
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tad.do"
                required
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-tad-yellow/50 focus:ring-1 focus:ring-tad-yellow/20 transition-all font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-tad-yellow/50 focus:ring-1 focus:ring-tad-yellow/20 transition-all font-mono text-sm"
              />
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full mt-8 bg-tad-yellow hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(250,212,0,0.3)] flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">Verificando...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Acceder al Sistema
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[10px] text-zinc-700 mt-6 font-mono">
          TAD Dominicana, S.R.L. &middot; v0.1.0
        </p>
      </div>
    </div>
  );
}
