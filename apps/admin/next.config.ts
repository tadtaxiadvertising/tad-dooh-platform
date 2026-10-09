import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

// IMPORTANTE: En EasyPanel Free, las variables NEXT_PUBLIC_* deben estar
// configuradas como Build Args, NO solo como Environment Variables.

const BACKEND_INTERNAL = process.env.BACKEND_INTERNAL_URL
  || process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")
  || "https://tad.api.ibusiness.com.do";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@tad/services", "@tad/ui", "@tad/store", "@tad/logging"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  outputFileTracingRoot: path.join(process.cwd(), "../../"),
  experimental: {
    webpackBuildWorker: true,
    parallelServerCompiles: false,
  },
  webpack(config) {
    config.infrastructureLogging = {
      ...config.infrastructureLogging,
      level: "error",
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, './'),
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${BACKEND_INTERNAL}/api/v1/:path*`,
      },
    ];
  },
  async redirects() {
      return [
        {
          source: "/p/advertiser/:path*",
          destination: "https://tad.anunciante.ibusiness.com.do",
          permanent: false,
        },
      { source: "/", destination: "/login", permanent: false },
      { source: "/dashboard", destination: "/admin", permanent: false },
      { source: "/campaigns/:path*", destination: "/admin/campaigns/:path*", permanent: false },
      { source: "/campaigns", destination: "/admin/campaigns", permanent: false },
      { source: "/finance/:path*", destination: "/admin/finance/:path*", permanent: false },
      { source: "/finance", destination: "/admin/finance", permanent: false },
      { source: "/analytics/:path*", destination: "/admin/analytics/:path*", permanent: false },
      { source: "/analytics", destination: "/admin/analytics", permanent: false },
      { source: "/advertisers/:path*", destination: "/admin/advertisers/:path*", permanent: false },
      { source: "/advertisers", destination: "/admin/advertisers", permanent: false },
      { source: "/media/:path*", destination: "/admin/media/:path*", permanent: false },
      { source: "/media", destination: "/admin/media", permanent: false },
      { source: "/fleet/:path*", destination: "/admin/fleet/:path*", permanent: false },
            { source: "/fleet", destination: "/admin/fleet", permanent: false },
            { source: "/bi/:path*", destination: "/admin/bi/:path*", permanent: false },
            { source: "/bi", destination: "/admin/bi", permanent: false },
            { source: "/devices/:path*", destination: "/admin/devices/:path*", permanent: false },
            { source: "/devices", destination: "/admin/devices", permanent: false },
            { source: "/drivers/:path*", destination: "/admin/drivers/:path*", permanent: false },
            { source: "/drivers", destination: "/admin/drivers", permanent: false },
            { source: "/settings", destination: "/admin/settings", permanent: false },
            { source: "/profile", destination: "/admin/profile", permanent: false },
            { source: "/monitoring/:path*", destination: "/admin/monitoring/:path*", permanent: false },
            { source: "/monitoring", destination: "/admin/monitoring", permanent: false },
          ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "o4511114332143616",
  project: "admin-dashboard",
  sentryUrl: "https://sentry.io/",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
