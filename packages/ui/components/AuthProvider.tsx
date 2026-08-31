'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from "@tad/services";
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

const PUBLIC_PATHS = ['/login', '/admin/login', '/advertiser/login', '/advertiser/onboarding', '/driver/login', '/driver/onboarding', '/check-in'];

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
        // Browse only tokens for the current portal family. Mixing scope
        // across portals (e.g. admin token on a /driver route) is the
        // cross-portal session pollution vector: once the cookie is synced,
        // every subsequent request inherits the higher-privilege session.
        if (currentPath.startsWith('/driver')) {
          const s = buildSessionFromLocalToken('tad_driver_token', 'tad_driver_user');
          if (s) activeSession = s;
        } else if (currentPath.startsWith('/advertiser')) {
          const s = buildSessionFromLocalToken('tad_advertiser_token', 'tad_advertiser_user');
          if (s) activeSession = s;
        } else if (currentPath.startsWith('/admin')) {
          const s = buildSessionFromLocalToken('tad_admin_token', 'tad_admin_user');
          if (s) activeSession = s;
        } else {
          const portals: [string, string][] = [
            ['tad_admin_token', 'tad_admin_user'],
            ['tad_advertiser_token', 'tad_advertiser_user'],
            ['tad_driver_token', 'tad_driver_user'],
          ];
          for (const [tokenKey, userKey] of portals) {
            const s = buildSessionFromLocalToken(tokenKey, userKey);
            if (s) {
              activeSession = s;
              break;
            }
          }
        }
      }

      if (activeSession?.access_token) {
        // Sync with middleware cookie if not already set or mismatched
        const currentCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('sb-access-token='))
          ?.split('=')[1];

        if (currentCookie !== activeSession.access_token) {
          const isSecure = window.location.protocol === 'https:';
          document.cookie = `sb-access-token=${activeSession.access_token}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
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
          // Redirect from login pages to role-specific dashboards
          const userRole = sbSession.user?.app_metadata?.role
          || sbSession.user?.user_metadata?.role
          || 'GUEST';
          if (currentPath === '/login' || currentPath === '/admin/login') {
            router.replace('/admin');
          } else if (currentPath === '/advertiser/login') {
            router.replace('/advertiser/dashboard');
          } else if (currentPath === '/driver/login') {
            router.replace('/driver/dashboard');
          }
        }

        if (_event === 'SIGNED_OUT') {
          // Clear ALL portal tokens — user intentionally signed out
          localStorage.removeItem('tad_admin_token');
          localStorage.removeItem('tad_admin_user');
          localStorage.removeItem('tad_advertiser_token');
          localStorage.removeItem('tad_advertiser_user');
          localStorage.removeItem('tad_driver_token');
          localStorage.removeItem('tad_driver_user');
          setSession(null);
          let loginTarget = '/login';
          if (currentPath.startsWith('/advertiser')) loginTarget = '/advertiser/login';
          else if (currentPath.startsWith('/driver')) loginTarget = '/driver/login';
          else if (currentPath.startsWith('/admin')) loginTarget = '/admin/login';
          router.replace(loginTarget);
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



