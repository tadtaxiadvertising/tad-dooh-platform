import {
  AUTH_COOKIE_MAX_AGE,
  readAccessTokenCookie,
} from "@tad/services/session-cookies";
import { isPublicLegalPath } from "@tad/services/cookie-consent";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const LOGIN_PATH = "/admin/login";
const DASHBOARD_PATH = "/admin/dashboard";
const EXPECTED_ROLE = "ADMIN";
const PUBLIC_PATHS = [
  LOGIN_PATH,
  "/admin/forgot-password",
  "/admin/auth/callback",
  "/check-in",
  "/login",
];

function decodeTokenRole(token: string): string {
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return "GUEST";
    const decoded = JSON.parse(
      atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/")),
    );
    return decoded.app_metadata?.role || decoded.role || "GUEST";
  } catch {
    return "GUEST";
  }
}

/**
 * Read the access token from the canonical @supabase/ssr cookie
 * (sb-<ref>-auth-token, base64url JSON) first, then the legacy sb-access-token.
 */
function extractAccessToken(request: NextRequest): string | null {
  return readAccessTokenCookie(request.cookies.getAll());
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicLegalPath(pathname)) return NextResponse.next();
  const sessionToken = extractAccessToken(request);
  const quickRole = sessionToken ? decodeTokenRole(sessionToken) : "GUEST";

  // 1. Root landing redirect
  if (pathname === "/") {
    if (quickRole === EXPECTED_ROLE) {
      return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
    }
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  // 2. Auth routes
  if (pathname === LOGIN_PATH || pathname === "/login") {
    if (quickRole === EXPECTED_ROLE) {
      return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
    }
    return NextResponse.next();
  }

  // 3. Static assets bypass
  if (
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 4. Auth Callback bypass
  if (pathname.includes("/auth/callback")) {
    return NextResponse.next();
  }

  // 5. Public paths (legal pages, etc.)
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return NextResponse.next();
  }

  // 6. Protected routes — authoritative check with @supabase/ssr.
  //    getUser() validates the signature and refreshes the tokens (the
  //    refreshed cookies are written into `response`). If the network is
  //    unavailable or the canonical cookie is missing, fall back to the local
  //    decode (cloud-free path, preserved from the legacy middleware).
  let response = NextResponse.next({ request: { headers: request.headers } });
  let role = quickRole;

  if (sessionToken) {
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
        if (!error && data?.user) {
          role = data.user.app_metadata?.role || data.user.role || "GUEST";
        }
      } catch {
        // Network failure (offline driver, Supabase hiccup) → local decode
        role = quickRole;
      }
    }
  }

  if (role !== EXPECTED_ROLE) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Excluir PWA Service Worker, Workbox assets, y recursos estáticos públicos
    // para evitar redirects que rompan el registro del SW (SecurityError).
    "/((?!api|_next/static|_next/image|_next/data|favicon\\.svg|manifest\\.json|sw\\.js|service-worker\\.js|workbox-.*\\.js|icons/).*)",
  ],
};
