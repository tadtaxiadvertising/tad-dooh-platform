import { AUTH_COOKIE_MAX_AGE } from "@tad/services/session-cookies";
import { isPublicLegalPath } from "@tad/services/cookie-consent";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const LOGIN_PATH = "/advertiser/login";
const DASHBOARD_PATH = "/advertiser/dashboard";
const PENDING_REVIEW_PATH = "/advertiser/pending-review";
const OAUTH_PROFILE_PATH = "/advertiser/oauth/complete-profile";
const EXPECTED_ROLE = "ADVERTISER";
const PUBLIC_PATHS = new Set([
  LOGIN_PATH,
  "/advertiser/auth/callback",
  "/advertiser/onboarding",
  "/check-in",
  "/login",
  "/register", // legacy referral URL redirected by next.config.js
  "/qr-passenger-journey.svg", // exact public landing illustration, not a route wildcard
  "/robots.txt",
  "/sitemap.xml",
]);

interface TrustedAdvertiserSession {
  role: "ADVERTISER";
  status: string;
}

/**
 * The URL is configured server-side, never derived from a request header.
 * Mirrors the API proxy's backend selection so legacy login remains usable.
 */
function advertiserSessionVerificationUrl(): string | null {
  const configured =
    process.env.INTERNAL_BACKEND_URL ||
    process.env.BACKEND_INTERNAL_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://proyecto-ia-tad-api.rewvid.easypanel.host";
  try {
    const url = new URL(configured);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    )
      return null;
    const basePath = url.pathname
      .replace(/\/api\/v1\/?$/, "")
      .replace(/\/api\/?$/, "")
      .replace(/\/$/, "");
    url.pathname = basePath + "/api/v1/advertisers/session";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Server-to-server check of CURRENT business status for a verified OAuth user.
 * Identity verification occurs again in the API's global SupabaseAuthGuard.
 * Never authorize based on app_metadata.status (may be absent or stale).
 */
async function verifyOAuthAdvertiserStatus(
  accessToken: string,
): Promise<TrustedAdvertiserSession | null> {
  if (!accessToken || accessToken.length > 8192) return null;
  const base = advertiserSessionVerificationUrl();
  if (!base) return null;
  const url = base + "/status";
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: "Bearer " + accessToken },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (
      !data ||
      typeof data !== "object" ||
      !("role" in data) ||
      data.role !== EXPECTED_ROLE ||
      !("status" in data) ||
      !["ACTIVE", "PENDING_REVIEW", "PENDING_ONBOARDING"].includes(
        String(data.status),
      ) ||
      !("advertiserId" in data) ||
      typeof data.advertiserId !== "string" ||
      !data.advertiserId
    )
      return null;
    return { role: EXPECTED_ROLE, status: String(data.status) };
  } catch {
    return null;
  }
}

/**
 * The legacy password login issues a signed API JWT (not a Supabase session).
 * Only the API has the signing secret; the advertiser app must not decode the
 * token and trust its role. Ask the issuer to verify signature, expiry,
 * identity, and current account status. Any network error denies access.
 */
async function verifyLegacyAdvertiserToken(
  token: string,
): Promise<TrustedAdvertiserSession | null> {
  if (!token || token.length > 8192) return null;
  const target = advertiserSessionVerificationUrl();
  if (!target) return null;
  try {
    const res = await fetch(target, {
      method: "GET",
      headers: { Authorization: "Bearer " + token },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (
      !data ||
      typeof data !== "object" ||
      !("role" in data) ||
      data.role !== EXPECTED_ROLE ||
      !("status" in data) ||
      typeof data.status !== "string" ||
      !("advertiserId" in data) ||
      typeof data.advertiserId !== "string"
    )
      return null;
    return { role: EXPECTED_ROLE, status: data.status };
  } catch {
    return null;
  }
}

/** Resolve both session issuers, never falling back to unsigned JWT claims. */
async function verifiedSession(request: NextRequest): Promise<{
  session: TrustedAdvertiserSession | null;
  response: NextResponse;
}> {
  const cookies = request.cookies.getAll();
  let response = NextResponse.next({ request: { headers: request.headers } });

  // Supabase SSR can verify OAuth sessions only when its canonical cookie
  // exists. Browser-created legacy sb-access-token is not such a session.
  const canonical = cookies.some((cookie) =>
    /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name),
  );
  if (canonical) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value),
              );
              response = NextResponse.next({
                request: { headers: request.headers },
              });
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, {
                  ...options,
                  maxAge: value ? AUTH_COOKIE_MAX_AGE : 0,
                  sameSite: "lax",
                  secure:
                    process.env.NODE_ENV === "production" ||
                    request.nextUrl.protocol === "https:",
                }),
              );
            },
          },
        });
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user?.app_metadata?.role === EXPECTED_ROLE) {
          // getUser verifies the Supabase identity. getSession provides the
          // bearer token; the API independently verifies it and checks the
          // current advertiser row before returning a commercial status.
          // getSession alone is NOT an authentication or authorization check.
          const { data: currentSession, error: sessionError } =
            await supabase.auth.getSession();
          const token = currentSession?.session?.access_token;
          if (!sessionError && typeof token === "string" && token) {
            const trusted = await verifyOAuthAdvertiserStatus(token);
            if (trusted) return { session: trusted, response };
          }
        }
      } catch {
        // Offline or invalid Supabase session: do NOT trust its JWT payload.
      }
    }
  }

  // Legacy password sessions are verified by the same API that issued them.
  // Never send a canonical-only OAuth token to a potentially stale legacy API.
  const legacyToken = cookies.find(
    (cookie) => cookie.name === "sb-access-token",
  )?.value;
  const session = legacyToken
    ? await verifyLegacyAdvertiserToken(legacyToken)
    : null;
  return { session, response };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicLegalPath(pathname)) return NextResponse.next();

  // Preserve public onboarding, exact auth callback and static routes.
  if (
    PUBLIC_PATHS.has(pathname) &&
    pathname !== LOGIN_PATH &&
    pathname !== "/login"
  )
    return NextResponse.next();
  if (
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  )
    return NextResponse.next();

  const isLogin = pathname === LOGIN_PATH || pathname === "/login";
  const isLanding = pathname === "/";
  const hasSessionCookie = request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name === "sb-access-token" ||
        /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name),
    );

  if (!hasSessionCookie) {
    if (isLogin || isLanding) return NextResponse.next();
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  const { session, response } = await verifiedSession(request);
  if (!session) {
    // Public landing/login remain accessible when identity providers fail.
    if (isLanding || isLogin) return NextResponse.next();
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  // A valid JWT does not authorize access to suspended or unknown states.
  if (
    !["ACTIVE", "PENDING_REVIEW", "PENDING_ONBOARDING"].includes(session.status)
  ) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  if (session.status === "PENDING_ONBOARDING") {
    // Identity exists through Supabase Google OAuth. Complete that existing
    // profile with a protected API update; never return to public signup.
    if (pathname === OAUTH_PROFILE_PATH) return response;
    return NextResponse.redirect(new URL(OAUTH_PROFILE_PATH, request.url));
  }

  if (session.status === "PENDING_REVIEW") {
    // This account already exists. Never redirect it to the PUBLIC
    // registration form, which would attempt to create it a second time.
    if (isLanding || pathname === PENDING_REVIEW_PATH) return response;
    return NextResponse.redirect(new URL(PENDING_REVIEW_PATH, request.url));
  }

  // A newly approved advertiser should not remain on the pending screen.
  if (pathname === PENDING_REVIEW_PATH || pathname === OAUTH_PROFILE_PATH) {
    return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
  }

  if (isLanding || isLogin) {
    return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Exclude API, service worker and static assets. This middleware must
    // never block the public quote route or a service worker's offline cache.
    "/((?!api|_next/static|_next/image|_next/data|favicon\\.svg|manifest\\.json|sw\\.js|service-worker\\.js|workbox-.*\\.js|icons/).*)",
  ],
};
