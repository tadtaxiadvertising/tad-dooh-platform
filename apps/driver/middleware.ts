import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
    if (session && decodeTokenRole(session) === 'DRIVER') {
      return NextResponse.redirect(new URL('/driver/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/driver/login', request.url));
  }

  // 2. Auth routes
  if (pathname === '/driver/login' || pathname === '/login') {
    if (session && decodeTokenRole(session) === 'DRIVER') {
      return NextResponse.redirect(new URL('/driver/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 3. Static assets bypass (PWA icons and other public assets)
  if (pathname.startsWith('/icons/')) {
    return NextResponse.next();
  }

  // 4. Auth Callback bypass
  if (pathname.includes('/auth/callback')) {
    return NextResponse.next();
  }

  // 5. Protected routes
  const isPublicRoute = pathname === '/driver/onboarding' || pathname === '/driver/onboarding/';

  if (!isPublicRoute && (!session || decodeTokenRole(session) !== 'DRIVER')) {
    return NextResponse.redirect(new URL('/driver/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Excluir PWA Service Worker, Workbox assets, y recursos estáticos públicos
    // para evitar redirects que rompan el registro del SW (SecurityError).
    '/((?!api|_next/static|_next/image|_next/data|favicon\\.svg|manifest\\.json|sw\\.js|service-worker\\.js|workbox-.*\\.js|icons/).*)',
  ],
};
