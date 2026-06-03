/** @type {import('next').NextConfig} */
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://parking-marketplace-production.up.railway.app'
    : 'http://localhost:3000');

const nextConfig = {
  async rewrites() {
    return [
      // API proxy → Railway en producción, localhost en desarrollo
      {
        source: '/api/v1/:path*',
        destination: `${API_URL}/api/v1/:path*`,
      },
      // Admin SPA: /op sin trailing slash → index.html
      {
        source: '/op',
        destination: '/op/index.html',
      },
    ];
  },
};

module.exports = nextConfig;
