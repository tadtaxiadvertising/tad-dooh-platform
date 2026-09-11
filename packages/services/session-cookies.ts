import type { Session } from '@supabase/supabase-js';

/**
 * SSR cookie helpers for the Pages Router OAuth flow.
 *
 * The Google OAuth redirect delivers tokens in the URL fragment, which is
 * never sent to the server (implicit flow). To let SSR middleware
 * (`createServerClient` from @supabase/ssr) validate and refresh the session
 * we mirror it into the canonical `sb-<ref>-auth-token` cookie, base64url
 * encoded as GoTrue expects. Tradeoff: the cookie is not HttpOnly because the
 * server can only ever see what the client writes.
 */

/** Project ref of the configured Supabase instance (host segment). */
export function extractSupabaseRef(): string | null {
  const url =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    (typeof globalThis !== 'undefined' &&
      (globalThis as any).__TAD_SUPABASE_URL);
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const ref = host.split('.')[0];
    return ref || null;
  } catch {
    return null;
  }
}

/** base64url (URL-safe, no padding) — same encoding used by @supabase/ssr. */
export function encodeBase64Url(value: string): string {
  return btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Compose the canonical @supabase/ssr cookie name for a given project ref. */
export function ssrSessionCookieName(ref: string): string {
  return `sb-${ref}-auth-token`;
}

/**
 * Persist a session into the canonical @supabase/ssr cookie
 * (sb-<ref>-auth-token). No-op when no session or no project ref is present.
 */
export function writeSsrSessionCookie(session: Session | null): void {
  if (typeof window === 'undefined') return;
  if (!session?.access_token) return;
  const ref = extractSupabaseRef();
  if (!ref) return;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at ?? (session.expires_in ?? 3600) + nowSeconds;
  const expiresIn = Math.max(0, expiresAt - nowSeconds);

  const payload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token || '',
    expires_at: expiresAt,
    expires_in: expiresIn,
    token_type: session.token_type ?? 'bearer',
    user: session.user,
  };

  const encoded = encodeBase64Url(JSON.stringify(payload));
  const isSecure = window.location.protocol === 'https:';
  document.cookie = `${ssrSessionCookieName(ref)}=${encoded}; path=/; max-age=604800; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}

/** Clear the canonical @supabase/ssr cookie, if any. */
export function clearSsrSessionCookie(): void {
  if (typeof window === 'undefined') return;
  const ref = extractSupabaseRef();
  if (!ref) return;
  document.cookie = `${ssrSessionCookieName(ref)}=; path=/; max-age=0; SameSite=Lax`;
}