/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@tad/services', '@tad/store', '@tad/ui'],
  outputFileTracingRoot: '../../',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/admin/dashboard/realtime',
        permanent: false,
      },
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
