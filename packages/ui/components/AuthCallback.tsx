'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { PortalConfig, getPortalConfig, supabase } from '@tad/services';

interface AuthCallbackProps {
  config?: PortalConfig;
}

type CallbackStatus = 'pending' | 'exchanging' | 'success' | 'error';

/**
 * AuthCallback — Handles post-authentication redirects.
 *
 * Three flows converge here:
 *   1. PKCE / magic link / password recovery — Supabase has already exchanged
 *      the hash into a session; just redirect.
 *   2. Google OAuth — exchange the Supabase access_token with our backend
 *      (POST /auth/oauth/exchange) so role claims get injected into
 *      app_metadata before redirecting. This is the only safe way to handle
 *      OAuth without letting the frontend self-claim a role.
 *   3. Error — upstream error in the hash (expired link, denied consent, etc.).
 */
export function AuthCallback({ config: externalConfig }: AuthCallbackProps) {
  const router = useRouter();
  const ranRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (ranRef.current) return;
    ranRef.current = true;

    const config = externalConfig || getPortalConfig(window.location.pathname);
    const { hash, search } = window.location;
    const urlParams = new URLSearchParams(search);
    const nextPath = urlParams.get('next') || config.dashboardPath;
    const provider = urlParams.get('provider') || 'pkce';

    // Surface upstream errors (invalid/expired link, denied OAuth consent, etc.)
    const hashParams = new URLSearchParams(hash.substring(1));
    const upstreamError = hashParams.get('error');
    if (upstreamError) {
      const description =
        hashParams.get('error_description') ||
        (provider === 'google'
          ? 'No pudimos completar el inicio de sesión con Google. Intenta nuevamente.'
          : 'El enlace es inválido o ha expirado.');
      console.error('[AuthCallback] upstream error:', description);
      router.replace(`${config.loginPath}?error=${encodeURIComponent(description)}`);
      return;
    }

    if (provider === 'google') {
      exchangeWithBackend(config, nextPath, router);
      return;
    }

    // PKCE / magic link / recovery — Supabase has already exchanged the hash
    const timer = setTimeout(() => router.replace(nextPath), 1500);
    return () => clearTimeout(timer);
  }, [router, externalConfig]);

  const config = externalConfig || getPortalConfig(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const isError = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('error');

  if (isError) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 relative overflow-hidden font-sans text-white">
        <div className="w-full max-w-sm text-center">
          <div className="relative inline-block mb-8">
            <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl bg-rose-500/20">
              <AlertTriangle className="w-10 h-10 text-rose-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight mb-4">
            No se pudo verificar el acceso
          </h1>
          <p className="text-sm text-gray-400 mb-6">Serás redirigido al inicio de sesión.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 relative overflow-hidden font-sans text-white">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] blur-[180px] rounded-full animate-pulse-soft opacity-10"
          style={{ backgroundColor: config.accentColor }}
        />
      </div>

      <div className="w-full max-w-sm text-center">
        <div className="relative inline-block mb-8 animate-pulse">
          <div
            className="absolute inset-0 blur-[30px] opacity-20"
            style={{ backgroundColor: config.accentColor }}
          />
          <div
            className="relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl"
            style={{ backgroundColor: config.accentColor }}
          >
            <ShieldCheck className="w-10 h-10 text-black" />
          </div>
        </div>

        <h1 className="text-2xl font-black uppercase tracking-tight mb-4">Verificando Acceso</h1>

        <div className="flex items-center justify-center gap-3 text-gray-400 text-sm font-bold tracking-widest uppercase">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Procesando Código</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Exchange the Supabase session (issued by Google OAuth) with our backend so
 * the user's role gets validated against the local DB and injected into
 * app_metadata. The backend returns a portal-shaped session payload identical
 * to /auth/login, which we persist into localStorage.
 */
async function exchangeWithBackend(
  config: PortalConfig,
  nextPath: string,
  router: ReturnType<typeof useRouter>,
) {
  try {
    // Wait one tick so supabase-js finishes writing the session to storage
    await new Promise((r) => setTimeout(r, 500));

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Supabase no devolvió sesión tras OAuth.');
    }

    const apiBase =
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
      'https://proyecto-ia-tad-api.rewvid.easypanel.host/api/v1';

    const res = await fetch(`${apiBase}/auth/oauth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token || '',
        intended_role: config.role,
      }),
    });

    if (!res.ok) {
      let msg = 'No se pudo validar tu cuenta.';
      try {
        const body = await res.json();
        if (body?.message) msg = body.message;
      } catch { /* ignore parse errors */ }
      throw new Error(msg);
    }

    const data = await res.json();
    const token = data.access_token as string;
    const refresh = (data.refresh_token as string) || '';
    const user = data.user ?? {
      id: session.user.id,
      email: session.user.email,
      role: config.role,
      entityId: null,
    };

    const isSecure = window.location.protocol === 'https:';
    document.cookie = `sb-access-token=${token}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
    localStorage.setItem(config.tokenKey, token);
    localStorage.setItem(config.userKey, JSON.stringify(user));
    if (refresh) {
      localStorage.setItem(`${config.tokenKey}_refresh`, refresh);
    }

    // Track success for analytics
    if (typeof window !== 'undefined' && (window as any).umami) {
      (window as any).umami.track('auth_login_attempt', {
        status: 'success',
        portal: config.role,
        method: 'google',
      });
    }

    router.replace(nextPath);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido.';
    console.error('[AuthCallback] OAuth exchange failed:', message);
    // Clean any partial Supabase session
    try { await supabase.auth.signOut(); } catch { /* noop */ }
    router.replace(`${config.loginPath}?error=${encodeURIComponent(message)}`);
  }
}

// Silence unused-status hint while keeping the import surface narrow.
type _CallbackStatus = CallbackStatus;
