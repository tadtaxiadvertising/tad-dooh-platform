/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@tad/services', '@tad/store', '@tad/ui'],
  experimental: {
    outputFileTracingRoot: '../../',
  },
}

module.exports = nextConfig
