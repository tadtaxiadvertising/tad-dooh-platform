/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@tad/services', '@tad/store', '@tad/ui'],
  outputFileTracingRoot: '../../',
  async redirects() {
    return [
      // NOTE: / root redirect is handled by middleware (auth-aware)
      // Only keep dashboard-level shortcuts for authenticated users
      {
        source: '/admin',
        destination: '/admin/dashboard/realtime',
        permanent: false,
      },
      {
        source: '/admin/dashboard',
        destination: '/admin/dashboard/realtime',
        permanent: false,
      },
    ];
  },
}

module.exports = nextConfig