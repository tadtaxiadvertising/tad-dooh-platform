/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@tad/services', '@tad/store', '@tad/ui'],
  outputFileTracingRoot: '../../',
  async redirects() {
 return [
 {
  source: '/',
  destination: '/login',
  permanent: false,
 },
 {
  source: '/api/v1/:path*',
  destination: '/api/proxy/:path*',
  permanent: true,
 },
 ];
 },
}

module.exports = nextConfig
