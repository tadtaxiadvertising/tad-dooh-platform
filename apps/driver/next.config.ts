import path from 'path';
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
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
        urlPattern: ({ url, request }: { url: URL; request: Request }) =>
          request.method === 'GET' &&
          (url.pathname.startsWith('/driver/dashboard') ||
            url.pathname.startsWith('/_next/static/') ||
            request.destination === 'script' ||
            request.destination === 'style' ||
            request.destination === 'image' ||
            request.destination === 'font'),
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
  output: 'standalone',
  transpilePackages: ['@tad/services', '@tad/ui', '@tad/store', '@tad/logging'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingRoot: path.join(process.cwd(), '../../'),
  experimental: {
    webpackBuildWorker: true,
    parallelServerCompiles: false,
  },
  // Importante: NO reescribir /api/proxy/* hacia el backend.
  // Esa ruta la atiende pages/api/proxy/[...path].ts para preservar
  // fallback, auth forwarding y diagnóstico (_proxy_health).
  async redirects() {
    return [
      {
        source: '/',
        destination: '/driver/login',
        permanent: false,
      },
      {
        source: '/driver',
        destination: '/driver/dashboard',
        permanent: false,
      },
      {
        source: '/dashboard',
        destination: '/driver/dashboard',
        permanent: false,
      },
    ];
  },
};

export default withSentryConfig(withPWA(nextConfig), {
  org: 'o4511114332143616',
  project: 'admin-dashboard',
  sentryUrl: 'https://sentry.io/',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
