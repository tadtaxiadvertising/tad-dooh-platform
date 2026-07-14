'use client';

import { useState, FormEvent } from 'react';
import Head from 'next/head';
import { BarChart3, Mail, Lock, EyeOff, Eye } from 'lucide-react';

export default function AdvertiserLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('advertiser@tad.do');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log('Advertiser login submitted', { email });
  };

  return (
    <div className="min-h-screen bg-black font-sans text-white relative overflow-hidden">
      <Head>
        <title>TAD ADVERTISER | Panel de Anunciantes</title>
      </Head>

      {/* Scene background: subtle street grid + active vehicle nodes */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="street-grid" width="120" height="120" patternUnits="userSpaceOnUse">
            <rect width="120" height="120" fill="none" />
            <path d="M0 60 L120 60 M60 0 L60 120" stroke="#1f1f1f" strokeWidth="0.5" />
          </pattern>
          <pattern id="avenues" width="240" height="240" patternUnits="userSpaceOnUse">
            <rect width="240" height="240" fill="none" />
            <path d="M0 120 L240 120 M120 0 L120 240" stroke="#2a2a2a" strokeWidth="1" />
          </pattern>
          <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#eab308" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#eab308" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#street-grid)" />
        <rect width="100%" height="100%" fill="url(#avenues)" />

        <circle cx="18%" cy="22%" r="2.4" fill="url(#node-glow)" className="animate-pulse-soft" />
        <circle cx="34%" cy="18%" r="2.4" fill="url(#node-glow)" className="animate-pulse-soft" style={{ animationDelay: '0.6s' }} />
        <circle cx="52%" cy="27%" r="2.4" fill="url(#node-glow)" className="animate-pulse-soft" style={{ animationDelay: '1.2s' }} />
        <circle cx="71%" cy="19%" r="2.4" fill="url(#node-glow)" className="animate-pulse-soft" style={{ animationDelay: '0.3s' }} />
        <circle cx="84%" cy="34%" r="2.4" fill="url(#node-glow)" className="animate-pulse-soft" style={{ animationDelay: '0.9s' }} />
        <circle cx="27%" cy="68%" r="2.4" fill="url(#node-glow)" className="animate-pulse-soft" style={{ animationDelay: '1.5s' }} />
        <circle cx="45%" cy="74%" r="2.4" fill="url(#node-glow)" className="animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
        <circle cx="66%" cy="62%" r="2.4" fill="url(#node-glow)" className="animate-pulse-soft" style={{ animationDelay: '1.1s' }} />
        <circle cx="78%" cy="73%" r="2.4" fill="url(#node-glow)" className="animate-pulse-soft" style={{ animationDelay: '0.7s' }} />
        <circle cx="15%" cy="88%" r="2.4" fill="url(#node-glow)" className="animate-pulse-soft" style={{ animationDelay: '1.3s' }} />
        <circle cx="88%" cy="85%" r="2.4" fill="url(#node-glow)" className="animate-pulse-soft" style={{ animationDelay: '0.2s' }} />
        <circle cx="59%" cy="46%" r="2.4" fill="url(#node-glow)" className="animate-pulse-soft" style={{ animationDelay: '1s' }} />
      </svg>

      {/* Login card */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[24px] bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.03)]">
          <div className="px-8 py-10">
            {/* Icon medallion */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_40px_rgba(255,255,255,0.05)]">
              <BarChart3 className="h-8 w-8 text-[#eab308]" aria-hidden="true" />
            </div>

            {/* Titles */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white uppercase tracking-wider">TAD ADVERTISER</h1>
              <p className="mt-1 text-sm font-light text-gray-300">Panel de Control de Campañas</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="adv-email" className="mb-1 block text-xs font-semibold text-gray-400">Correo</label>
                <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.03] transition-colors focus-within:border-[#eab308] focus-within:shadow-[0_0_0_1px_rgba(234,179,8,0.35)]">
                  <span className="pl-3 text-gray-500"><Mail className="h-4 w-4" aria-hidden="true" /></span>
                  <input
                    id="adv-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="advertiser@tad.do"
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-white placeholder-white outline-none"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="adv-password" className="mb-1 block text-xs font-semibold text-gray-400">Contraseña</label>
                <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.03] transition-colors focus-within:border-[#eab308] focus-within:shadow-[0_0_0_1px_rgba(234,179,8,0.35)]">
                  <span className="pl-3 text-gray-500"><Lock className="h-4 w-4" aria-hidden="true" /></span>
                  <input
                    id="adv-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-white outline-none"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="mr-3 text-[#eab308] transition-colors hover:text-[#fad400]"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="text-right">
                <a href="#" className="text-xs font-medium text-white transition-colors hover:text-[#eab308]">¿Olvidaste tu contraseña?</a>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#eab308] to-[#fad400] py-2.5 text-sm font-bold text-black shadow-[0_0_30px_rgba(234,179,8,0.25)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Iniciar sesión
              </button>

              {/* Security badge */}
              <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-gray-400">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Verified Access</span>
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer className="absolute bottom-4 left-0 right-0 z-10 text-center text-[11px] text-gray-600">TAD Taxi Advertising S.R.L.</footer>
    </div>
  );
}
