import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// In production Caddy routes /api/* to the api container on both hosts.
// In dev (or when API_ORIGIN is set at build time) proxy /api/* to the api.
const apiOrigin =
  process.env.API_ORIGIN ??
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : undefined);

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: ['@fit/shared'],
  allowedDevOrigins: ['admin.localhost'],
  async rewrites() {
    if (!apiOrigin) return [];
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
};

export default withNextIntl(nextConfig);
