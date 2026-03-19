import type { NextConfig } from "next";

const BACKEND = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')
  || 'https://proyecto-ia-tad-api.rewvid.easypanel.host';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Proxy transparente: /backend-api/* → NestJS API
  // Usa rewrites (nivel servidor) para evitar que EasyPanel intercepte la ruta
  async rewrites() {
    return [
      {
        source: '/backend-api/:path*',
        destination: `${BACKEND}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
