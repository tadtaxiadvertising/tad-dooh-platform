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

  // 1. Omitir archivos estáticos, API interna y rutas públicas
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('/login') || // Captura /login, /admin/login, /advertiser/login, etc.
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
          if (role === 'ADMIN') return NextResponse.redirect(new URL('/dashboard', request.url));
        } catch { /* Ignorar error de parsing y seguir al login */ }
      }
    }
    return NextResponse.next();
  }

  // 2. Extraer Sesión
  const session = request.cookies.get('sb-access-token')?.value;

  if (!session) {
    // Si no hay sesión y no es pública, redirigir al login correspondiente o genérico
    let loginTarget = '/login';
    if (pathname.startsWith('/advertiser')) loginTarget = '/advertiser/login';
    if (pathname.startsWith('/driver')) loginTarget = '/driver/login';
    if (pathname.startsWith('/admin')) loginTarget = '/admin/login';
    
    return NextResponse.redirect(new URL(loginTarget, request.url));
  }

  try {
    // 3. Decodificar JWT (Paylod es la parte 2)
    const payloadBase64 = session.split('.')[1];
    const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
    
    const role = decodedPayload.app_metadata?.role || 'GUEST';
    const status = decodedPayload.status; // Para bloqueo 402

    // 4. Lógica de Redirección por Roles
    
    // --- ADVERTISER HUB ---
    if (role === 'ADVERTISER') {
       if (pathname.startsWith('/admin') || pathname.startsWith('/driver') || pathname === '/') {
          return NextResponse.redirect(new URL('/advertiser/dashboard', request.url));
       }
    }

    // --- DRIVER PWA ---
    if (role === 'DRIVER') {
       // Bloqueo de suscripción (REGLA FASE 3)
       // Si el estatus en el token (inyectado por backend) no es ACTIVE, redirigir a zona de pago
       if (status && status !== 'ACTIVE' && pathname !== '/driver/billing') {
          // El usuario pide mostrar Alerta 402, en web redirigimos a una página de pago
          // return NextResponse.redirect(new URL('/driver/billing?reason=subscription_required', request.url));
       }

       if (pathname.startsWith('/admin') || pathname.startsWith('/advertiser') || pathname === '/') {
          return NextResponse.redirect(new URL('/driver/dashboard', request.url));
       }
    }

    // --- ADMIN / FALLBACK ---
    if (role === 'ADMIN') {
       // El admin puede navegar, pero si entra a raíz, lo mandamos al dashboard principal
       if (pathname === '/') {
          return NextResponse.redirect(new URL('/dashboard', request.url));
       }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('❌ Middleware Auth Error:', error);
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
