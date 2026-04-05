import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

const PUBLIC_PATHS = ['/login', '/admin/login', '/advertiser/login', '/driver/login', '/check-in'];

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true });

export const useAuth = () => useContext(AuthContext);

/** Decode a JWT token payload without verifying signature */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    const padded = base64.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/** Build a synthetic Session from a custom portal JWT stored in localStorage */
function buildSessionFromLocalToken(tokenKey: string, userKey: string): Session | null {
  try {
    const token = localStorage.getItem(tokenKey);
    const userRaw = localStorage.getItem(userKey);
    if (!token || !userRaw) return null;

    // Decode claims directly from JWT — this is the source of truth
    const claims = decodeJwtPayload(token);
    if (!claims) return null;

    // Check token expiry
    if (claims.exp && claims.exp * 1000 < Date.now()) {
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(userKey);
      return null;
    }

    let storedUser: Record<string, any> = {};
    try { storedUser = JSON.parse(userRaw); } catch { /* noop */ }

    // Extract role and entityId from JWT claims first (most reliable)
    const role = claims.app_metadata?.role || claims.role || storedUser.role || 'GUEST';
    const entityId = claims.app_metadata?.entityId || claims.sub || storedUser.entityId || storedUser.id || null;

    const syntheticUser = {
      id: claims.sub || storedUser.id || '',
      email: claims.email || storedUser.email || '',
      role: role,
      app_metadata: { role, entityId },
      user_metadata: {},
      aud: 'authenticated',
      created_at: storedUser.created_at || '',
    };

    return {
      access_token: token,
      token_type: 'bearer',
      expires_in: claims.exp ? Math.max(0, claims.exp - Math.floor(Date.now() / 1000)) : 3600,
      refresh_token: '',
      user: syntheticUser,
    } as unknown as Session;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentPath = router.pathname;
    const isPublic = PUBLIC_PATHS.includes(currentPath) || currentPath.startsWith('/p');

    function resolveSession(supabaseSession: Session | null) {
      let activeSession: Session | null = supabaseSession;

      if (!activeSession) {
        // Try each portal's token in priority order based on current path
        const portals: [string, string][] = [];

        if (currentPath.startsWith('/advertiser')) {
          portals.push(['tad_advertiser_token', 'tad_advertiser_user']);
          portals.push(['tad_admin_token', 'tad_admin_user']);
        } else if (currentPath.startsWith('/driver')) {
          portals.push(['tad_driver_token', 'tad_driver_user']);
          portals.push(['tad_admin_token', 'tad_admin_user']);
        } else {
          portals.push(['tad_admin_token', 'tad_admin_user']);
          portals.push(['tad_advertiser_token', 'tad_advertiser_user']);
          portals.push(['tad_driver_token', 'tad_driver_user']);
        }

        for (const [tokenKey, userKey] of portals) {
          const s = buildSessionFromLocalToken(tokenKey, userKey);
          if (s) {
            activeSession = s;
            break;
          }
        }
      }

      setSession(activeSession);
      setLoading(false);

      if (!activeSession && !isPublic) {
        let loginTarget = '/login';
        if (currentPath.startsWith('/advertiser')) loginTarget = '/advertiser/login';
        else if (currentPath.startsWith('/driver')) loginTarget = '/driver/login';
        else if (currentPath.startsWith('/admin')) loginTarget = '/admin/login';
        router.replace(loginTarget);
      }
    }

    if (supabase) {
      supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
        resolveSession(sbSession);
      });

      const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, sbSession: Session | null) => {
        if (_event === 'SIGNED_IN' && sbSession) {
          setSession(sbSession);
          if (currentPath === '/login' || currentPath === '/admin/login') {
            router.replace('/admin');
          }
        }

        if (_event === 'SIGNED_OUT') {
          // Only clear ADMIN (Supabase) tokens — leave advertiser/driver tokens intact
          localStorage.removeItem('tad_admin_token');
          localStorage.removeItem('tad_admin_user');
          // Re-check if there's a portal session still valid
          const s = buildSessionFromLocalToken('tad_advertiser_token', 'tad_advertiser_user')
            || buildSessionFromLocalToken('tad_driver_token', 'tad_driver_user');
          setSession(s);
          if (!s) {
            router.replace('/login');
          }
        }
      });

      return () => { data?.subscription?.unsubscribe(); };
    } else {
      // No Supabase configured — try local tokens only
      resolveSession(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPublicPage = PUBLIC_PATHS.includes(router.pathname) || router.pathname.startsWith('/p');
  if (loading && !isPublicPage) {
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
