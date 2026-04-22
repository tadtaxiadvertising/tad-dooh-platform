import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Decodifica el rol del usuario desde el JWT token
 * @param token - Token JWT de Supabase
 * @returns El rol del usuario (ADMIN, DRIVER, ADVERTISER, etc.)
 */
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

/**
 * Middleware de TAD Admin Console
 * 
 * Responsabilidades:
 * 1. Redirigir / → /admin/dashboard o /admin/login (según autenticación)
 * 2. Proteger rutas autenticadas (requiere token válido)
 * 3. Redirigir usuarios autenticados fuera del login
 * 
 * 🚀 OPTIMIZACIÓN: Redireccionamiento en el servidor (middleware)
 *    evita renderizar splash screens en el cliente
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('sb-access-token')?.value;
  const userRole = session ? decodeTokenRole(session) : 'GUEST';

  // 1️⃣ ROOT REDIRECT: Lleva inmediatamente al dashboard o login
  //    ⚠️ NUNCA renderiza pages/index.tsx con splash screen
  if (pathname === '/') {
    if (session && userRole === 'ADMIN') {
      // Usuario autenticado → Dashboard
      return NextResponse.redirect(new URL('/admin/dashboard', request.url), {
        status: 307, // Temporary redirect (preserva método POST)
      });
    }
    // Usuario NO autenticado → Login
    return NextResponse.redirect(new URL('/admin/login', request.url), {
      status: 307,
    });
  }

  // 2️⃣ AUTH ROUTES: Login page
  if (pathname === '/admin/login' || pathname === '/login') {
    // Si ya está autenticado, redirige al dashboard
    if (session && userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url), {
        status: 307,
      });
    }
    // Permite acceso a login page
    return NextResponse.next();
  }

  // 3️⃣ PROTECTED ROUTES: Requieren autenticación
  // Cualquier ruta que empiece con /admin
  if (!session || userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/admin/login', request.url), {
      status: 307,
    });
  }

  // ✅ Usuario autenticado → permite acceso
  return NextResponse.next();
}

/**
 * Configuración de routes que activarán el middleware
 * matcher define qué rutas ejecutan este middleware
 */
export const config = {
  matcher: [
    '/admin/:path*',      // Cualquier ruta bajo /admin
    '/login',             // Login page
    '/',                  // Root path (redirige inmediatamente)
  ],
};



