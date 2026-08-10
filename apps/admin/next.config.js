/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@tad/services', '@tad/store', '@tad/ui'],
  outputFileTracingRoot: '../../',
  async redirects() {
    return [
      {
        source: '/p/advertiser/:path*',
        destination: 'https://proyecto-ia-tad-advertiser.rewvid.easypanel.host',
        permanent: false,
      },
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
