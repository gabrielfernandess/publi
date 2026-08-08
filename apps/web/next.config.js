/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy /api/* pra API em :3001 — evita cross-origin cookie + credentials
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3101'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
