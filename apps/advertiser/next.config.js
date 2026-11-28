const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ['@tad/services', '@tad/store', '@tad/ui', '@tad/impact-calculator'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
  async redirects() {
    return [
      // Preserve already-shared driver QR links (/register?ref=...).
      // Next forwards the original ref query string to the real onboarding route.
      {
        source: '/register',
        destination: '/advertiser/onboarding',
        permanent: false,
      },
      {
        source: '/p/advertiser/:path*',
        destination: '/advertiser/login',
        permanent: false,
      },
      {
        source: '/api/v1/:path*',
        destination: '/api/proxy/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
