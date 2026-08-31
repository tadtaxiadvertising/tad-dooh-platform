'use client';
import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@tad/services';
import { ShieldCheck, Lock, CheckCircle, AlertCircle, Eye, EyeOff, Save, KeyRound } from 'lucide-react';
import clsx from 'clsx';
import Head from 'next/head';
import { toast } from 'sonner';

import {
  UpdatePasswordSchema,
  PortalConfig,
  getAuthCircuitBreaker,
  getPortalConfig
} from '@tad/services';

interface UpdatePasswordProps {
  config?: PortalConfig;
}

export function UpdatePassword({ config: externalConfig }: UpdatePasswordProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const config = externalConfig || getPortalConfig(router.pathname);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Zod Validation
    const result = UpdatePasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const circuitBreaker = getAuthCircuitBreaker();

    try {
      const { error: authError } = await circuitBreaker.execute(() => 
        supabase.auth.updateUser({ password: result.data.password })
      );

      if (authError) throw authError;

      setSuccess(true);
      toast.success('Contraseña actualizada con éxito');
      
      // Clear all cached tokens to force re-login or fresh session
      localStorage.removeItem(config.tokenKey);
      localStorage.removeItem(config.userKey);

      setTimeout(() => {
        router.replace(config.loginPath);
      }, 3000);

    } catch (err: any) {
      const isCircuitOpen = err.name === 'CircuitBreakerOpenError';
      setError(isCircuitOpen ? err.message : err.message || 'Error al actualizar contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 relative overflow-hidden font-sans text-white">
      <Head>
        <title>Restablecer Contraseña | {config.name}</title>
      </Head>

      {/* Environment Glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] blur-[180px] rounded-full animate-pulse-soft opacity-10" 
          style={{ backgroundColor: config.accentColor }} 
        />
      </div>

      <div className={clsx(
        "w-full max-w-[440px] transition-all duration-1000",
        mounted ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
      )}>
        {/* Brand */}
        <div className="text-center mb-12">
          <div className="relative inline-block mb-8 group">
            <div 
              className="absolute inset-0 blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity duration-1000" 
              style={{ backgroundColor: config.accentColor }} 
            />
            <div 
              className="relative w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform duration-700"
              style={{ backgroundColor: config.accentColor }} 
            >
              <KeyRound className="w-12 h-12 text-black" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
              Actualizar <span style={{ color: config.accentColor }}>Contraseña</span>
            </h1>
          </div>
        </div>

        {/* Form Card */}
        <div className="relative group/form">
          <div className="relative bg-slate-950/60 backdrop-blur-md border border-white/[0.05] rounded-[2.5rem] p-10 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
            <div 
              className="absolute top-0 left-0 w-full h-0.5 opacity-30" 
              style={{ backgroundImage: `linear-gradient(to right, transparent, ${config.accentColor}, transparent)` }} 
            />

            {success ? (
              <div className="text-center py-8 space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-3xl">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight mb-3">Contraseña Actualizada</h2>
                  <p className="text-[12px] text-gray-400 leading-relaxed max-w-[300px] mx-auto">
                    Tu contraseña ha sido actualizada correctamente de forma segura. Serás redirigido al inicio de sesión.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                  <div className="mb-6 p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed flex-1">{error}</p>
                  </div>
                )}

                <div className="space-y-6">
                  {/* New Password */}
                  <div className="group/input">
                    <div className="flex justify-between items-center mb-3">
                      <label htmlFor="new-password" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest transition-colors" style={{ color: password ? config.accentColor : '' }}>
                        Nueva Contraseña
                      </label>
                      <Lock className="w-3.5 h-3.5 text-gray-700 transition-colors" style={{ color: password ? config.accentColor : '' }} />
                    </div>
                    <div className="relative">
                      <input id="new-password" type={showPassword ? 'text' : 'password'}
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••" required
                        className="w-full bg-black/50 border border-white/5 rounded-2xl px-6 py-4 pr-14 text-white text-xs font-bold tracking-[0.3em] placeholder:text-gray-700 focus:outline-none focus:bg-black/80 transition-all"
                        style={{ borderBottomColor: password ? config.accentColor : '' }}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                        className="absolute inset-y-0 right-4 flex items-center text-gray-600 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="group/input">
                    <div className="flex justify-between items-center mb-3">
                      <label htmlFor="confirm-password" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest transition-colors" style={{ color: confirmPassword ? config.accentColor : '' }}>
                        Confirmar Contraseña
                      </label>
                      <ShieldCheck className="w-3.5 h-3.5 text-gray-700 transition-colors" style={{ color: confirmPassword ? config.accentColor : '' }} />
                    </div>
                    <div className="relative">
                      <input id="confirm-password" type={showPassword ? 'text' : 'password'}
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••" required
                        className="w-full bg-black/50 border border-white/5 rounded-2xl px-6 py-4 pr-14 text-white text-xs font-bold tracking-[0.3em] placeholder:text-gray-700 focus:outline-none focus:bg-black/80 transition-all"
                        style={{ borderBottomColor: confirmPassword ? config.accentColor : '' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading}
                  className="w-full text-black font-bold uppercase tracking-[0.2em] text-[10px] py-5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
                  style={{ backgroundColor: config.accentColor }}
                >
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Actualizando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      <Save className="w-4 h-4" />
                      Guardar Contraseña
                    </span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
