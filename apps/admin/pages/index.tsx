/**
 * Root Index Page (/index.tsx)
 * 
 * ⚠️ IMPORTANTE: Esta página es manejada por:
 * 1. Middleware (apps/admin/middleware.ts) - Redirección inmediata del servidor
 * 2. No debe renderizar nada visible al usuario
 * 
 * Flujo correcto:
 * GET / → Middleware redirige a /admin/dashboard o /admin/login
 * Este archivo NUNCA se debería renderizar
 */

export default function RootIndex() {
  // Esta página no debería ser visible nunca (manejada por middleware)
  // Si llega aquí, devolvemos null para evitar splash screen
  return null;
}
