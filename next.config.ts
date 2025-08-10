import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Ensure client reference manifest is generated correctly
    webpackBuildWorker: true,
  },
  eslint: {
    // Temporarily ignore ESLint errors during builds; enforce later in Phase 5
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Enforce TypeScript type safety during builds
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
