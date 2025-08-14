import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Ensure client reference manifest is generated correctly
    webpackBuildWorker: false, // Temporarily disable to fix Docker build issues
  },
  eslint: {
    // Temporarily ignore ESLint errors during builds; enforce later in Phase 5
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Enforce TypeScript type safety during builds
    ignoreBuildErrors: false,
  },
  // Disable static optimization for problematic pages during build
  ...(process.env.NODE_ENV === 'production' && {
    output: 'standalone',
  }),
};

export default nextConfig;
