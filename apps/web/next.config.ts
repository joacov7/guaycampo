import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile workspace packages
  transpilePackages: ['@guaycampo/shared-types'],

  // Experimental features for Next.js 15
  experimental: {
    // Enable React 19 features
    reactCompiler: false,
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_APP_NAME: 'GuayCampo',
    NEXT_PUBLIC_APP_VERSION: '0.1.0',
  },

  // Image configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
    ],
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
