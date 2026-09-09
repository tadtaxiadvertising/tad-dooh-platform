import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PORTAL_PREFIX = '/advertiser';
const LOGIN_PATH = '/advertiser/login';
const PUBLIC_PATHS = [LOGIN_PATH, '/advertiser/auth/callback', '/advertiser/onboarding', '/check-in', '/login'];

function decodeTokenRole(token: string): string {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return 'GUEST';
    const decoded = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded.app_metadata?.role || decoded.role || 'GUEST';
  } catch {
    return 'GUEST';
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('sb-access-token')?.value;

  // 1. Root landing redirect
  if (pathname === '/') {
    if (session && decodeTokenRole(session) === 'ADVERTISER') {
      return NextResponse.redirect(new URL('/advertiser/dashboard', request.url));
    }
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  // 2. Auth routes
  if (pathname === LOGIN_PATH || pathname === '/login') {
    if (session && decodeTokenRole(session) === 'ADVERTISER') {
      return NextResponse.redirect(new URL('/advertiser/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 3. Static assets bypass
  if (pathname.startsWith('/icons/') || pathname.startsWith('/_next/') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // 4. Auth Callback bypass
  if (pathname.includes('/auth/callback')) {
    return NextResponse.next();
  }

  // 5. Public paths (legal pages, onboarding)
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // 6. Protected routes - require ADVERTISER role
  if (!session || decodeTokenRole(session) !== 'ADVERTISER') {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|_next/data|favicon\\.svg|manifest\\.json|sw\\.js|service-worker\\.js|workbox-.*\\.js|icons/).*)',
  ],
};