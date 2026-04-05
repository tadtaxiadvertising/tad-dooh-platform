import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * TAD PLATFORM NEXT.JS MIDDLEWARE (EDGE RUNTIME)
 *
 * Implementación de RBAC estricto para separación de portales.
 * Soporta tanto Supabase JWT (app_metadata.role) como custom portal JWT (role en raíz).
 */

function decodeTokenRole(token: string): string {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return 'GUEST';
    const padded = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(padded));
    // Support both Supabase format (app_metadata.role) and custom JWT (root .role)
    return decoded.app_metadata?.role || decoded.role || 'GUEST';
  } catch {
    return 'GUEST';
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const portalType = process.env.NEXT_PUBLIC_PORTAL_TYPE; // ADMIN, ADVERTISER, DRIVER

  // 1. Omitir archivos estáticos, API interna y rutas públicas
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/check-in' ||
    pathname.startsWith('/p/')
  ) {
    return NextResponse.next();
  }

  // 2. Handle login pages — redirect away if already authenticated
  if (pathname.includes('/login')) {
    const session = request.cookies.get('sb-access-token')?.value;
    if (session) {
      const role = decodeTokenRole(session);
      if (role === 'ADVERTISER') return NextResponse.redirect(new URL('/advertiser/dashboard', request.url));
      if (role === 'DRIVER') return NextResponse.redirect(new URL('/driver/dashboard', request.url));
      if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // 3. Extraer Sesión
  const session = request.cookies.get('sb-access-token')?.value;

  if (!session) {
    // Lógica de Redirección Inteligente al Login
    if (pathname === '/') {
      if (portalType === 'ADVERTISER') return NextResponse.redirect(new URL('/advertiser/login', request.url));
      if (portalType === 'DRIVER') return NextResponse.redirect(new URL('/driver/login', request.url));
      if (portalType === 'ADMIN') return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    let loginTarget = '/login';
    if (pathname.startsWith('/advertiser')) loginTarget = '/advertiser/login';
    if (pathname.startsWith('/driver')) loginTarget = '/driver/login';
    if (pathname.startsWith('/admin')) loginTarget = '/admin/login';

    return NextResponse.redirect(new URL(loginTarget, request.url));
  }

  const role = decodeTokenRole(session);

  // BLOQUEO: Si el portal está configurado para un rol específico, restringir acceso
  if (portalType === 'ADVERTISER' && role !== 'ADVERTISER' && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/advertiser/login', request.url));
  }
  if (portalType === 'DRIVER' && role !== 'DRIVER' && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/driver/login', request.url));
  }

  // --- ADVERTISER HUB ---
  if (role === 'ADVERTISER') {
    if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/driver') || pathname === '/') {
      return NextResponse.redirect(new URL('/advertiser/dashboard', request.url));
    }
  }

  // --- DRIVER PWA ---
  if (role === 'DRIVER') {
    if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/advertiser') || pathname === '/') {
      return NextResponse.redirect(new URL('/driver/dashboard', request.url));
    }
  }

  // --- ADMIN / FALLBACK ---
  if (role === 'ADMIN') {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    // Permite que el ADMIN acceda a todo (admin, advertiser, driver)
    return NextResponse.next();
  }

  return NextResponse.next();
}

// Configuración de rutas a interceptar
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
