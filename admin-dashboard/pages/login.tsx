import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../services/supabaseClient';
import { ShieldCheck, LogIn, AlertCircle, Fingerprint, Lock, Shield, Cpu, Activity, Globe } from 'lucide-react';
import clsx from 'clsx';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!supabase) {
        throw new Error('Supabase client no pudo ser inicializado. Falta entorno.');
      }
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !data.session) {
        throw new Error(authError?.message || 'Credenciales inválidas');
      }

      localStorage.setItem('tad_admin_token', data.session.access_token);
      localStorage.setItem('tad_admin_user', JSON.stringify({
        id: data.user?.id,
        email: data.user?.email,
        name: 'Admin',
        role: 'ADMIN',
      }));

      router.replace('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden selection:bg-tad-yellow selection:text-black font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-15%] right-[-10%] w-[70%] h-[70%] bg-tad-yellow/5 blur-[180px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-white/[0.02] blur-[160px] rounded-full opacity-60" />
      </div>

      <div className={clsx(
        "w-full max-w-[480px] transition-all duration-1000 transform",
        mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      )}>
        {/* Brand Header */}
        <div className="text-center mb-16">
          <div className="relative inline-block mb-10">
             <div className="w-24 h-24 bg-tad-yellow rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_60px_rgba(255,212,0,0.15)] group-hover:scale-105 transition-all duration-700">
                <ShieldCheck className="w-12 h-12 text-black" />
             </div>
          </div>
          
          <div className="space-y-4">
             <div className="flex items-center justify-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-tad-yellow animate-pulse" />
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] font-sans">Unified Auth Gateway</p>
             </div>
             <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none font-display">
               TAD<span className="text-tad-yellow">CORE</span>
             </h1>
             <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-[0.15em] max-w-xs mx-auto leading-relaxed">
               Secure regional operations and intelligent <br/> network control terminal
             </p>
          </div>
        </div>

        {/* Login Form Container */}
        <div className="relative">
            <form 
              onSubmit={handleSubmit} 
              className="relative bg-zinc-900/30 backdrop-blur-3xl border border-white/5 rounded-[3.5rem] p-12 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              {error && (
                <div className="mb-10 p-6 bg-rose-500/5 border border-rose-500/20 rounded-[2rem] flex items-center gap-5 text-rose-500 animate-in zoom-in duration-500">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  <p className="text-[11px] font-black uppercase tracking-widest">{error}</p>
                </div>
              )}

              <div className="space-y-10">
                <div className="group/input">
                  <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 ml-6 transition-colors group-focus-within/input:text-tad-yellow">
                    Identity Protocol
                  </label>
                  <div className="relative">
                     <Fingerprint className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700 group-focus-within/input:text-tad-yellow transition-all duration-300" />
                     <input
                       id="login-email"
                       type="email"
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       placeholder="user@tad.do"
                       required
                       className="w-full bg-black/40 border border-white/5 rounded-full pl-16 pr-8 py-6 text-white text-sm font-bold placeholder:text-zinc-800 focus:outline-none focus:border-tad-yellow/40 focus:bg-black/60 transition-all font-sans"
                     />
                  </div>
                </div>

                <div className="group/input">
                  <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 ml-6 transition-colors group-focus-within/input:text-tad-yellow">
                    TLS Secure Link
                  </label>
                  <div className="relative">
                     <Lock className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700 group-focus-within/input:text-tad-yellow transition-all duration-300" />
                     <input
                       id="login-password"
                       type="password"
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       placeholder="••••••••••••"
                       required
                       minLength={6}
                       className="w-full bg-black/40 border border-white/5 rounded-full pl-16 pr-8 py-6 text-white text-sm font-bold placeholder:text-zinc-800 focus:outline-none focus:border-tad-yellow/40 focus:bg-black/60 transition-all font-sans"
                     />
                  </div>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full mt-14 bg-tad-yellow hover:bg-white text-black font-black uppercase tracking-[0.4em] text-[11px] py-6 rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(255,212,0,0.1)] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none flex items-center justify-center gap-4 italic"
              >
                {loading ? (
                  <div className="flex items-center gap-4">
                     <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                     <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <LogIn className="w-5 h-5" />
                    Secure Handshake
                  </div>
                )}
              </button>

              <div className="mt-12 flex items-center justify-center gap-8 opacity-20 filter grayscale group-hover:grayscale-0 transition-all duration-700">
                 <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                 <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                 <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              </div>
            </form>
        </div>

        <div className="mt-16 text-center space-y-4 opacity-40 hover:opacity-100 transition-opacity duration-700">
           <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.5em] italic">
             Core Cluster v4.5 &middot; Tad Dominicana
           </p>
           <div className="flex items-center justify-center gap-6">
              <span className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">Privacy</span>
              <span className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">Compliance</span>
              <span className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">Status</span>
           </div>
        </div>
      </div>
    </div>
  );
}

