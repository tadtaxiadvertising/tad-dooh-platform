'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from "@tad/services";
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { isPublicLegalPath } from '@tad/services/cookie-consent';
import { clearAuthCookies, writeAccessTokenCookie, writeSsrSessionCookie } from '@tad/services/session-cookies';

const PUBLIC_PATHS = ['/login', '/register', '/admin/login', '/admin/forgot-password', '/advertiser/login', '/advertiser/onboarding', '/driver/login', '/driver/onboarding', '/check-in'];

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

const PORTAL_BY_ROLE: Record<string, 'admin' | 'advertiser' | 'driver'> = {
  ADMIN: 'admin',
  ADVERTISER: 'advertiser',
  DRIVER: 'driver',
};

/** Derive the portal a route belongs to, or null for portal-less paths */
function portalFromPath(path: string): 'admin' | 'advertiser' | 'driver' | null {
  if (path.startsWith('/advertiser')) return 'advertiser';
  if (path.startsWith('/driver')) return 'driver';
  if (path.startsWith('/admin')) return 'admin';
  return null;
}

function roleOfSession(session: Session | null): string {
  return session?.user?.app_metadata?.role
    || session?.user?.user_metadata?.role
    || 'GUEST';
}

function dashboardRouteFor(portal: string | null): string | null {
  if (portal === 'admin') return '/admin';
  if (portal === 'advertiser') return '/advertiser/dashboard';
  if (portal === 'driver') return '/driver/dashboard';
  return null;
}

function loginRouteFor(portal: 'admin' | 'advertiser' | 'driver' | null): string {
  if (portal === 'admin') return '/admin/login';
  if (portal === 'advertiser') return '/advertiser/login';
  if (portal === 'driver') return '/driver/login';
  return '/login';
}

function clearPortalTokens(): void {
  clearAuthCookies();
  localStorage.removeItem('tad_admin_token');
  localStorage.removeItem('tad_admin_user');
  localStorage.removeItem('tad_advertiser_token');
  localStorage.removeItem('tad_advertiser_user');
  localStorage.removeItem('tad_driver_token');
  localStorage.removeItem('tad_driver_user');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function resolveSession(supabaseSession: Session | null) {
      let activeSession: Session | null = supabaseSession;

      // ALWAYS read live path at call time — router.pathname is stale in callbacks
      const getLivePath = () =>
        typeof window !== 'undefined' ? window.location.pathname : '/';
      const livePath = getLivePath();
      const isPublic = isPublicLegalPath(livePath) || PUBLIC_PATHS.includes(livePath) || livePath.startsWith('/p');

      if (!activeSession) {
        // Browse only tokens for the current portal family. Mixing scope
        // across portals (e.g. admin token on a /driver route) is the
        // cross-portal session pollution vector: once the cookie is synced,
        // every subsequent request inherits the higher-privilege session.
        if (livePath.startsWith('/driver')) {
          const s = buildSessionFromLocalToken('tad_driver_token', 'tad_driver_user');
          if (s) activeSession = s;
        } else if (livePath.startsWith('/advertiser')) {
          const s = buildSessionFromLocalToken('tad_advertiser_token', 'tad_advertiser_user');
          if (s) activeSession = s;
        } else if (livePath.startsWith('/admin')) {
          const s = buildSessionFromLocalToken('tad_admin_token', 'tad_admin_user');
          if (s) activeSession = s;
        } else {
                  // SEC-01 FIX: No fallback to all portal tokens.
                  // If we're on a non-portal path (e.g. '/', '/p/...') and have no Supabase session,
                  // we MUST NOT pick up a token from another portal. This prevents cross-portal
                  // session pollution where a driver on '/' could inherit an admin token.
                  // The role/portal guard below will redirect to the correct login.
                  activeSession = null;
                }
      }

      if (activeSession?.access_token) {
        // Sync with middleware cookie if not already set or mismatched
        const currentCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('sb-access-token='))
          ?.split('=')[1];

        if (currentCookie !== activeSession.access_token) {
          writeAccessTokenCookie(activeSession.access_token);
        }
      }

      // Role/portal guard: a session whose role does not belong to the portal
      // being rendered is foreign state (e.g. an ADMIN Supabase session left on
      // the advertiser origin by a misrouted OAuth or a stale cache). Rendering
      // those pages with a foreign identity is the "entering as admin" bug, so
      // we force a portal-local signout instead. The OAuth callback is exempt:
      // AuthCallback still needs to inspect/exchange/signOut the provisional
      // session to show the branded authorization error.
      const pathPortal = portalFromPath(livePath);
      const isOAuthCallback = livePath.endsWith('/auth/callback');
      if (activeSession && pathPortal && !isOAuthCallback) {
        const sessionRole = roleOfSession(activeSession);
        if (PORTAL_BY_ROLE[sessionRole] !== pathPortal) {
          console.warn(`🚫 [AUTH] Sesión "${sessionRole}" en ruta "${livePath}" del portal "${pathPortal}". Cerrando sesión.`);
          clearPortalTokens();
          try { void supabase.auth.signOut(); } catch { /* noop */ }
          setSession(null);
          setLoading(false);
          if (livePath !== loginRouteFor(pathPortal)) {
            router.replace(loginRouteFor(pathPortal));
          }
          return;
        }
      }

      setSession(activeSession);
      setLoading(false);

      if (!activeSession && !isPublic) {
        router.replace(loginRouteFor(pathPortal));
      }
    }

    if (supabase) {
      supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
        resolveSession(sbSession);
      });

      const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, sbSession: Session | null) => {
        if (_event === 'TOKEN_REFRESHED' && sbSession
          && PORTAL_BY_ROLE[roleOfSession(sbSession)] === portalFromPath(window.location.pathname)) {
          writeAccessTokenCookie(sbSession.access_token);
          writeSsrSessionCookie(sbSession);
          setSession(sbSession);
        }
        if (_event === 'SIGNED_IN' && sbSession) {
          // Guard with a LIVE path: reject a session whose role does not
          // belong to the portal currently being served. The onAuthStateChange
          // subscription outlives client-side navigation, so the mount-time
          // path is stale for post-login redirects (the "entered as admin"
          // vector). OAuth callbacks are exempt — AuthCallback decides routing.
          const getLivePath = () =>
            typeof window !== 'undefined' ? window.location.pathname : '/';
          const livePath = getLivePath();
          const pathPortal = portalFromPath(livePath);
          const isOAuthCallback = livePath.endsWith('/auth/callback');
          const sessionRole = roleOfSession(sbSession);
          const sessionPortal = PORTAL_BY_ROLE[sessionRole];

          if (pathPortal && !isOAuthCallback && sessionPortal !== pathPortal) {
            console.warn(`🚫 [AUTH] Sesión "${sessionRole}" en ruta "${livePath}" del portal "${pathPortal}". Cerrando sesión.`);
            clearPortalTokens();
            try { void supabase.auth.signOut(); } catch { /* noop */ }
            setSession(null);
            if (livePath !== loginRouteFor(pathPortal)) {
              router.replace(loginRouteFor(pathPortal));
            }
            return;
          }

          setSession(sbSession);
          // Route logins only to the dashboard of the portal the session
          // BELONGS to — never to a foreign portal on this origin.
          const onOwnLoginPage = sessionPortal !== null && (
            livePath === '/login' || livePath === loginRouteFor(sessionPortal)
          );
          if (onOwnLoginPage) {
            const dest = dashboardRouteFor(sessionPortal);
            if (dest) router.replace(dest);
          }
        }

        if (_event === 'SIGNED_OUT') {
          // Clear ALL portal tokens — user intentionally signed out
          clearPortalTokens();
          setSession(null);
          const getLivePath = () =>
            typeof window !== 'undefined' ? window.location.pathname : '/';
          const livePath = getLivePath();
          if (!isPublicLegalPath(livePath)) router.replace(loginRouteFor(portalFromPath(livePath)));
        }
      });

      return () => { data?.subscription?.unsubscribe(); };
    } else {
      // No Supabase configured — try local tokens only
      resolveSession(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPublicPage = isPublicLegalPath(router.pathname) || PUBLIC_PATHS.includes(router.pathname) || router.pathname.startsWith('/p');
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
