import type { NextConfig } from "next";

// IMPORTANTE: En EasyPanel Free, las variables NEXT_PUBLIC_* deben estar
// configuradas como Build Args, NO solo como Environment Variables.
// Si no están en Build Args, el rewrite queda vacío y retorna 502.
//
// SOLUCIÓN: El frontend usa /api/proxy/* (API Route, corre en runtime)
// en lugar de /backend-api/* (rewrite, depende de build-time).
// El rewrite se mantiene solo como fallback para requests SSR.

const BACKEND_INTERNAL = process.env.BACKEND_INTERNAL_URL   // ej: http://api:3000  (red interna EasyPanel)
  || process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')    // fallback env var
  || 'https://proyecto-ia-tad-api.rewvid.easypanel.host';    // fallback hardcoded SOLO si todo lo demás falla

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // El rewrite usa BACKEND_INTERNAL que se evalúa en runtime del servidor Next.js
  // (no en build-time), por lo que funciona con EasyPanel env vars normales.
  async rewrites() {
    return [
      {
        source: '/backend-api/:path*',
        destination: `${BACKEND_INTERNAL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
