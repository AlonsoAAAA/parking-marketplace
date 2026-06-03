/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // API proxy
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:3000/api/v1/:path*',
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
