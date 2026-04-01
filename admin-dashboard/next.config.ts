import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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
  // TAREA C: Optimización de Memoria para EasyPanel (512MB RAM)
  experimental: {
    // Reduce el uso de RAM sacando el build de webpack a un proceso separado
    webpackBuildWorker: true,
    // Desactiva compilaciones paralelas para no saturar la CPU/RAM del VPS
    parallelServerCompiles: false,
  },
  // El rewrite usa BACKEND_INTERNAL que se evalúa en runtime del servidor Next.js
  // (no en build-time), por lo que funciona con EasyPanel env vars normales.
  async rewrites() {
    return [
      {
        source: '/backend-api/:path*',
        destination: `${BACKEND_INTERNAL}/api/v1/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  org: "o4511114332143616",
  project: "admin-dashboard",
  sentryUrl: "https://sentry.io/",
  
  // Provide the auth token for source maps upload
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only print logs for uploading source maps in CI
  silent: true,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: true,
  },

  // Route browser requests to Sentry through a dedicated Next.js API route.
  // IMPORTANT: Do NOT use '/monitoring' here — that conflicts with the Auditoría page.
  // tunnelRoute: "/api/sentry-tunnel",

  // Removes uploaded source maps from the production bundle to reduce bundle size
  sourcemaps: {
     deleteSourcemapsAfterUpload: true,
  },

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
});
