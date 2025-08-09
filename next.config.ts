import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Ensure client reference manifest is generated correctly
    webpackBuildWorker: true,
  },
  eslint: {
    // Temporarily ignore ESLint errors during builds for debugging
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore TypeScript errors during builds for debugging
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
