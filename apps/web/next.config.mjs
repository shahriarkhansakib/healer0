/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@healer/api', '@healer/db'],
  serverExternalPackages: ['pino', 'pino-pretty'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;
