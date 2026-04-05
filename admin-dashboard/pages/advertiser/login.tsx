import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import { login as apiLogin } from '@/services/api';
import { BarChart3, LogIn, AlertCircle, TrendingUp, Target, Rocket, Briefcase, Globe, Shield } from 'lucide-react';
import clsx from 'clsx';
import Head from 'next/head';

export default function AdvertiserLoginPage() {
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
      const data = await apiLogin(email, password);
      
      if (data.user.role !== 'ADVERTISER' && data.user.role !== 'ADMIN') {
        throw new Error('Esta cuenta no tiene acceso al portal de anunciantes.');
      }

      // El interceptor de API ya guarda token y user, pero aseguramos la cookie para el middleware
      document.cookie = `sb-access-token=${data.access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;

      router.replace('/advertiser/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <Head>
        <title>Advertiser Login | TAD DOOH</title>
      </Head>

      {/* Luxury Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-tad-yellow/5 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20" />
      </div>

      <div className={clsx(
        "w-full max-w-[480px] z-10 transition-all duration-1000",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      )}>
        {/* Brand Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl mb-6 shadow-2xl">
            <BarChart3 className="w-8 h-8 text-tad-yellow" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase mb-2">
            ADVERTISER <span className="text-tad-yellow">HUB</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em]">Campaign Management Suite</p>
        </div>

        {/* Login Form */}
        <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-tad-yellow/50 to-transparent" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-[11px] font-bold uppercase tracking-wider">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              <div className="group">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-tad-yellow transition-colors">
                  Business Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-5 flex items-center text-gray-600 group-focus-within:text-tad-yellow transition-colors pointer-events-none">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="manager@company.com"
                    required
                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow/40 transition-all"
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-tad-yellow transition-colors">
                  Access Key
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-5 flex items-center text-gray-600 group-focus-within:text-tad-yellow transition-colors pointer-events-none">
                    <Shield className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-white text-sm tracking-widest placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow/40 transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-tad-yellow hover:bg-white text-black font-black uppercase tracking-[0.2em] text-xs py-5 rounded-2xl transition-all shadow-xl hover:shadow-tad-yellow/20 flex items-center justify-center gap-3 disabled:opacity-50 group/btn overflow-hidden relative"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <span>Enter Dashboard</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-3 gap-4">
            <div className="text-center">
              <TrendingUp className="w-5 h-5 text-gray-600 mx-auto mb-2" />
              <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">Real-time stats</p>
            </div>
            <div className="text-center">
              <Target className="w-5 h-5 text-gray-600 mx-auto mb-2" />
              <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">Geo Targeting</p>
            </div>
            <div className="text-center">
              <Rocket className="w-5 h-5 text-gray-600 mx-auto mb-2" />
              <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">Fast Deployment</p>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.4em]">
            © 2026 TAD ADVERTISING SOLUTIONS
          </p>
        </div>
      </div>
    </div>
  );
}
