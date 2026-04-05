import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import { login as apiLogin } from '@/services/api';
import { ShieldCheck, LogIn, AlertCircle, Fingerprint, Lock, Shield, Cpu, Activity, Globe } from 'lucide-react';
import clsx from 'clsx';
import Head from 'next/head';

export default function AdminLoginPage() {
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
      // 🚀 USAR API GATEWAY PARA INYECTAR RBAC Y METADATA
      const data = await apiLogin(email, password);
      
      if (data.user.role !== 'ADMIN') {
        throw new Error('Esta cuenta no tiene privilegios de administrador.');
      }

      // Inyectar Cookie (para el Middleware en el Edge Runtime)
      const isSecure = window.location.protocol === 'https:';
      document.cookie = `sb-access-token=${data.access_token}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;

      // Redirección a Dashboard base
      router.replace('/admin');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6 relative overflow-hidden selection:bg-tad-yellow selection:text-black font-sans">
      {/* Dynamic Environmental Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
         <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-tad-yellow/[0.04] blur-[180px] rounded-full animate-pulse-soft" />
         <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-white/[0.01] blur-[150px] rounded-full" />
      </div>

      <div className={clsx(
        "w-full max-w-[440px] transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) transform",
        mounted ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
      )}>
        {/* Superior Brand Identity */}
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

        {/* High-Security Terminal Container */}
        <div className="relative group/form">
            <div className="absolute -inset-1 bg-gradient-to-br from-tad-yellow/20 to-transparent blur-2xl opacity-0 group-hover/form:opacity-100 transition-opacity duration-1000" />
            <form 
              onSubmit={handleSubmit} 
              className="relative bg-zinc-900/40 backdrop-blur-3xl border border-white-[0.03] rounded-[2.5rem] p-10 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            >
              {error && (
                <div className="mb-10 p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-500 animate-in zoom-in duration-300">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 animate-pulse" />
                  <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">{error}</p>
                </div>
              )}

              <div className="space-y-8">
                <div className="group/input">
                  <div className="flex justify-between items-center mb-3">
                    <label htmlFor="login-email" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest transition-colors group-focus-within/input:text-tad-yellow">
                      Email_Credential
                    </label>
                    <Fingerprint className="w-3.5 h-3.5 text-gray-700 group-focus-within/input:text-tad-yellow transition-colors" />
                  </div>
                  <div className="relative">
                     <input
                       id="login-email"
                       type="email"
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       placeholder="ADMIN_ACCESS@TAD.DO"
                       required
                       className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-white text-xs font-bold uppercase tracking-widest placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow/50 focus:bg-zinc-900/80 transition-all shadow-inner"
                     />
                  </div>
                </div>

                <div className="group/input">
                  <div className="flex justify-between items-center mb-3">
                    <label htmlFor="login-password" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest transition-colors group-focus-within/input:text-tad-yellow">
                      Secure_Vault
                    </label>
                    <Lock className="w-3.5 h-3.5 text-gray-700 group-focus-within/input:text-tad-yellow transition-colors" />
                  </div>
                  <div className="relative">
                     <input
                       id="login-password"
                       type="password"
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       placeholder="••••••••••••"
                       required
                       minLength={6}
                       className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-white text-xs font-bold tracking-[0.5em] placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow/50 focus:bg-zinc-900/80 transition-all shadow-inner"
                     />
                  </div>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full mt-12 bg-tad-yellow hover:bg-white text-black font-bold uppercase tracking-[0.2em] text-[10px] py-5 rounded-2xl transition-all shadow-[0_10px_20px_rgba(250,212,0,0.1)] hover:shadow-[0_15px_30px_rgba(255,255,255,0.15)] disabled:bg-zinc-800 disabled:text-gray-500 disabled:shadow-none flex items-center justify-center gap-4 group/btn overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
                {loading ? (
                  <div className="flex items-center gap-3 relative z-10">
                     <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                     <span>Decrypting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 relative z-10">
                    <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    <span>Iniciar Sesión</span>
                  </div>
                )}
              </button>
            </form>
        </div>

        {/* Global Footer Consensus */}
        <div className="mt-16 text-center opacity-40 hover:opacity-100 transition-opacity duration-700">
           <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                TAD GLOBAL AUDIT NETWORK • EST. 2026
              </p>
           </div>
           <div className="flex items-center justify-center gap-8">
              {['Nexus', 'Cipher', 'Vortex'].map((link) => (
                <span key={link} className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.3em] cursor-pointer hover:text-tad-yellow transition-colors">{link}</span>
              ))}
           </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-soft {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.05); }
        }
        .animate-pulse-soft {
          animation: pulse-soft 8s infinite ease-in-out;
        }
        .border-white-\[0\.03\] { border-color: rgba(255, 255, 255, 0.03); }
      `}</style>
    </div>
  );
}

