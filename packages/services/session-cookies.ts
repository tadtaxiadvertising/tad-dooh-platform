import type { Session } from '@supabase/supabase-js';
import { createChunks, stringToBase64URL, stringFromBase64URL, isChunkLike } from '@supabase/ssr';

export const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
const cookieAttributes = (maxAge: number) => `; path=/; max-age=${maxAge}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
function browserCookieNames(): string[] {
  return document.cookie.split(';').map(pair => pair.trim().split('=')[0]).filter(Boolean);
}

/** Host-only: never share a portal session with sibling subdomains. */
export function writeAccessTokenCookie(token: string): void {
  if (typeof window === 'undefined' || !token) return;
  document.cookie = `sb-access-token=${encodeURIComponent(token)}${cookieAttributes(AUTH_COOKIE_MAX_AGE)}`;
}

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
  return stringToBase64URL(value);
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

  const name = ssrSessionCookieName(ref);
  const chunks = createChunks(name, `base64-${encodeBase64Url(JSON.stringify(payload))}`);
  const retained = new Set(chunks.map(chunk => chunk.name));
  browserCookieNames().filter(key => isChunkLike(key, name) && !retained.has(key)).forEach(key => {
    document.cookie = `${key}=${cookieAttributes(0)}`;
  });
  chunks.forEach(chunk => { document.cookie = `${chunk.name}=${chunk.value}${cookieAttributes(AUTH_COOKIE_MAX_AGE)}`; });
}

/** Clear the canonical @supabase/ssr cookie, if any. */
export function clearSsrSessionCookie(): void {
  if (typeof window === 'undefined') return;
  const ref = extractSupabaseRef();
  if (!ref) return;
  const name = ssrSessionCookieName(ref);
  new Set([name, ...browserCookieNames().filter(key => isChunkLike(key, name))]).forEach(key => {
    document.cookie = `${key}=${cookieAttributes(0)}`;
  });
}

/** Remove auth only; preserve consent and offline queues. */
export function clearAuthCookies(): void {
  if (typeof window === 'undefined') return;
  document.cookie = `sb-access-token=${cookieAttributes(0)}`;
  clearSsrSessionCookie();
  const ref = extractSupabaseRef();
  if (ref) {
    const verifier = `${ssrSessionCookieName(ref)}-code-verifier`;
    browserCookieNames().filter(key => isChunkLike(key, verifier)).forEach(key => {
      document.cookie = `${key}=${cookieAttributes(0)}`;
    });
  }
}

/** Read old unprefixed cookies and current SDK base64/chunk format. */
export function readAccessTokenCookie(cookies: { name: string; value: string }[]): string | null {
  const ref = extractSupabaseRef();
  const name = ref ? ssrSessionCookieName(ref) : cookies.find(c => /^sb-.+-auth-token(?:\.0)?$/.test(c.name))?.name.replace(/\.0$/, '');
  if (name) {
    let value = cookies.find(c => c.name === name)?.value;
    if (!value) {
      const parts: string[] = [];
      for (let i = 0; i < cookies.length; i++) {
        const part = cookies.find(c => c.name === `${name}.${i}`)?.value;
        if (!part) break;
        parts.push(part);
      }
      value = parts.join('');
    }
    if (value) try {
      const payload = JSON.parse(stringFromBase64URL(value.startsWith('base64-') ? value.slice(7) : value));
      if (typeof payload.access_token === 'string' && payload.access_token) return payload.access_token;
    } catch { /* Existing local JWT flows use the legacy cookie. */ }
  }
  return cookies.find(c => c.name === 'sb-access-token')?.value ?? null;
}
