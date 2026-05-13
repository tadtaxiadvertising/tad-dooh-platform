/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // CRÍTICO PARA EASYPANEL/DOCKER EN VPS:
  // Reduce drásticamente el tamaño del despliegue y el uso de RAM
  output: 'standalone',
  // Desactivamos telemetría para ahorrar ciclos de CPU
  telemetryMode: 'system',
  experimental: {
    // Optimizaciones de React 19
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
};

export default nextConfig;
