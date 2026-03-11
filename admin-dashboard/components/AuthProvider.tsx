import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../services/supabaseClient';
import type { Session } from '@supabase/supabase-js';

const PUBLIC_PATHS = ['/login'];

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // ── 1. Leer sesión inicial desde el storage (síncrono en el SDK de Supabase)
    if (!supabase) return; // Safely exit if Supabase couldn't be initialized (SSR)

    supabase.auth.getSession().then((response: any) => {
      const session = response?.data?.session || null;
      setSession(session);
      setLoading(false);

      // Solo redirigir al login si NO estamos ya en él
      if (!session && !PUBLIC_PATHS.includes(router.pathname)) {
        router.replace('/login');
      }
    });

    // ── 2. Subscribirse a cambios de sesión (login, logout, refresh de token)
    const { data } = supabase.auth.onAuthStateChange(
      (_event: any, session: any) => {
        setSession(session);

        if (_event === 'SIGNED_OUT') {
          // Limpiar también el token legado de localStorage por compatibilidad
          if (typeof window !== 'undefined') {
            localStorage.removeItem('tad_admin_token');
            localStorage.removeItem('tad_admin_user');
          }
          router.replace('/login');
        }

        if (_event === 'SIGNED_IN' && router.pathname === '/login') {
          router.replace('/');
        }
      }
    );

    return () => {
      data?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 3. Pantalla de carga premium (bloquea renders que dispararían kick-outs)
  if (loading && !PUBLIC_PATHS.includes(router.pathname)) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-black gap-4">
        <div className="relative">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-800 border-t-[#fad400]" />
          <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full border border-[#fad400]/20" />
        </div>
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] animate-pulse">
          Verificando Sesión...
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
