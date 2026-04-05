import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from '@/services/api';
import { Car, LogIn, AlertCircle, Wallet, Navigation, ShieldCheck, MapPin, Tablet, Zap, Phone } from 'lucide-react';
import clsx from 'clsx';
import Head from 'next/head';

export default function DriverLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
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
      // Use the dedicated Driver login endpoint (phone-based, custom JWT)
      const res = await api.post('/drivers/login', { phone, password });
      const data = res.data;

      if (!data.access_token) {
        throw new Error('No se recibió token de acceso del servidor.');
      }

      // Store driver token and user in localStorage
      localStorage.setItem('tad_driver_token', data.access_token);
      localStorage.setItem('tad_driver_user', JSON.stringify({
        id: data.driverId,
        email: data.phone || phone,
        role: 'DRIVER',
        entityId: data.driverId,
        fullName: data.fullName,
        app_metadata: { role: 'DRIVER', entityId: data.driverId }
      }));

      // Cookie for middleware — conditional Secure for http/https
      const isSecure = window.location.protocol === 'https:';
      document.cookie = `sb-access-token=${data.access_token}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;

      router.replace('/driver/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <Head>
        <title>Driver Login | TAD PLATFORM</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>

      {/* Mobile-Friendly Decor */}
      <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-tad-yellow/[0.03] to-transparent pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-tad-yellow/10 blur-[80px] rounded-full pointer-events-none animate-pulse" />

      <div className={clsx(
        "w-full max-w-[400px] z-10 transition-all duration-700",
        mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}>
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-tad-yellow rounded-[2rem] shadow-[0_15px_40px_rgba(250,212,0,0.2)] mb-6 rotate-3">
            <Car className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mb-2">
            DRIVER <span className="text-tad-yellow">APP</span>
          </h1>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.4em]">Integrated Fleet Solutions</p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 shadow-2xl relative">
          <div className="flex items-center justify-center gap-2 mb-8">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Acceso Seguro</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-[10px] font-bold uppercase tracking-wider">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="NÚMERO DE TELÉFONO"
                  required
                  className="w-full bg-black border border-white/5 rounded-2xl px-6 py-5 text-white text-base font-bold placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow transition-all shadow-inner"
                />
              </div>

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="CONTRASEÑA"
                  required
                  className="w-full bg-black border border-white/5 rounded-2xl px-6 py-5 text-white text-base tracking-[0.3em] font-bold placeholder:text-gray-700 focus:outline-none focus:border-tad-yellow transition-all shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-tad-yellow hover:bg-white text-black font-black uppercase tracking-[0.1em] text-sm py-5 rounded-2xl transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-4 group"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-3 border-black border-r-transparent rounded-full animate-spin" />
                  <span>CONECTANDO...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>INICIAR SESIÓN</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Info */}
          <div className="mt-10 grid grid-cols-3 gap-2">
            <div className="bg-black/50 p-3 rounded-2xl text-center flex flex-col items-center">
              <Wallet className="w-4 h-4 text-gray-500 mb-1" />
              <span className="text-[7px] font-bold text-gray-600 uppercase tracking-tighter">Earnings</span>
            </div>
            <div className="bg-black/50 p-3 rounded-2xl text-center flex flex-col items-center">
              <Navigation className="w-4 h-4 text-gray-500 mb-1" />
              <span className="text-[7px] font-bold text-gray-600 uppercase tracking-tighter">Map</span>
            </div>
            <div className="bg-black/50 p-3 rounded-2xl text-center flex flex-col items-center">
              <Zap className="w-4 h-4 text-gray-500 mb-1" />
              <span className="text-[7px] font-bold text-gray-600 uppercase tracking-tighter">Status</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 px-4">
          <div className="flex items-center justify-between text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-tad-yellow" />
              <span className="text-[9px] font-bold uppercase tracking-widest">SANTIAGO Pilot v2</span>
            </div>
            <div className="flex items-center gap-2">
              <Tablet className="w-3 h-3 text-tad-yellow" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Device STI0010</span>
            </div>
          </div>
          <p className="mt-6 text-center text-[8px] text-gray-700 font-bold uppercase tracking-[0.5em]">
            TAD TECHNOLOGIES © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
