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
