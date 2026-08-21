/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@tad/services', '@tad/store', '@tad/ui'],
  outputFileTracingRoot: '../../',
  async redirects() {
 return [
 {
  source: '/advertiser/login',
  destination: '/login',
  permanent: true,
 },
 {
  source: '/p/advertiser/:path*',
  destination: '/login',
  permanent: false,
 },
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
