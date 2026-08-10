import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: false,
  reloadOnOnline: true,
  buildExcludes: [
    /middleware-manifest\.json$/,
    /app-build-manifest\.json$/,
    /dynamic-css-manifest\.json$/,
    /_next\/data\/.+\/.+\.json$/,
    /_next\/.*manifest.*\.json$/,
  ],
  workboxOptions: {
    skipWaiting: true,
    disableDevLogs: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: ({ url, request }: { url: URL; request: any }) =>
          request.method === 'GET' &&
          (
            url.pathname.startsWith('/driver/dashboard') ||
            url.pathname.startsWith('/_next/static/') ||
            request.destination === 'script' ||
            request.destination === 'style' ||
            request.destination === 'image' ||
            request.destination === 'font'
          ),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'tad-driver-dashboard-assets',
          expiration: {
            maxEntries: 160,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@tad/services", "@tad/ui", "@tad/store", "@tad/logging"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingRoot: require('path').join(process.cwd(), '../../'),
  // TAREA C: Optimización de Memoria para EasyPanel (512MB RAM)
  experimental: {
    // Reduce el uso de RAM sacando el build de webpack a un proceso separado
    webpackBuildWorker: true,
    // Desactiva compilaciones paralelas para no saturar la CPU/RAM del VPS
    parallelServerCompiles: false,
  },
  // Importante: NO reescribir /api/proxy/* hacia el backend.
  // Esa ruta la atiende pages/api/proxy/[...path].ts para preservar
  // fallback, auth forwarding y diagnóstico (_proxy_health).
  // NOTA: No definir redirect de '/' aquí. El middleware de la app
  // driver redirige '/' -> '/driver/login' (y a '/driver/dashboard'
  // si ya hay sesión DRIVER). Los redirects de next.config se ejecutan
  // ANTES que el middleware y rompen el flujo del portal driver.
  async redirects() {
    return [
      {
        source: '/p/advertiser/:path*',
        destination: 'https://proyecto-ia-tad-advertiser.rewvid.easypanel.host',
        permanent: false,
      },
    ];
  },
};

export default withSentryConfig(withPWA(nextConfig), {
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

  // Route browser requests to Sentry through a dedicated Next.js API route.
  // IMPORTANT: Do NOT use '/monitoring' here — that conflicts with the Auditoría page.
  // tunnelRoute: "/api/sentry-tunnel",

  // Removes uploaded source maps from the production bundle to reduce bundle size
  sourcemaps: {
     deleteSourcemapsAfterUpload: true,
  },
});
