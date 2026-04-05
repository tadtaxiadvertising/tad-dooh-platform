import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * TAD PLATFORM NEXT.JS MIDDLEWARE (EDGE RUNTIME)
 * 
 * Implementación de RBAC estricto para separación de portales:
 * - Admin: Acceso total o rutas prefijadas /admin
 * - Advertiser: Solo /advertiser
 * - Driver: Solo /driver
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const portalType = process.env.NEXT_PUBLIC_PORTAL_TYPE; // ADMIN, ADVERTISER, DRIVER

  // 1. Omitir archivos estáticos, API interna y rutas públicas
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('/login') ||
    pathname === '/check-in' ||
    pathname.startsWith('/p/')
  ) {
    // 🔥 LÓGICA DE AUTO-REDIRECT SI YA TIENE SESIÓN Y ESTÁ EN LOGIN
    if (pathname.includes('/login')) {
      const session = request.cookies.get('sb-access-token')?.value;
      if (session) {
        try {
          const payloadBase64 = session.split('.')[1];
          const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
          const role = decodedPayload.app_metadata?.role || 'GUEST';
          
          if (role === 'ADVERTISER') return NextResponse.redirect(new URL('/advertiser/dashboard', request.url));
          if (role === 'DRIVER') return NextResponse.redirect(new URL('/driver/dashboard', request.url));
          if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
        } catch { /* Ignorar error de parsing */ }
      }
    }
    return NextResponse.next();
  }

  // 2. Extraer Sesión
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

  try {
    const payloadBase64 = session.split('.')[1];
    const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
    
    const role = decodedPayload.app_metadata?.role || 'GUEST';
    const status = decodedPayload.status;

    // BLOQUEO: Si el portal está configurado para un rol específico, restringir acceso
    if (portalType === 'ADVERTISER' && role !== 'ADVERTISER' && role !== 'ADMIN') {
        // Un driver no puede entrar a tad-anunciante
        return NextResponse.redirect(new URL('/login', request.url));
    }
    if (portalType === 'DRIVER' && role !== 'DRIVER' && role !== 'ADMIN') {
        // Un advertiser no puede entrar a tad-driver
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // --- ADVERTISER HUB ---
    if (role === 'ADVERTISER') {
       if (pathname.startsWith('/admin') || pathname.startsWith('/driver') || pathname === '/') {
          return NextResponse.redirect(new URL('/advertiser/dashboard', request.url));
       }
    }

    // --- DRIVER PWA ---
    if (role === 'DRIVER') {
       if (pathname.startsWith('/admin') || pathname.startsWith('/advertiser') || pathname === '/') {
          return NextResponse.redirect(new URL('/driver/dashboard', request.url));
       }
    }

    // --- ADMIN / FALLBACK ---
    if (role === 'ADMIN') {
       if (pathname === '/') {
          return NextResponse.redirect(new URL('/admin', request.url));
       }
    }

    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// Configuración de rutas a interceptar
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
