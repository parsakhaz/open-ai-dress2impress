import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Ensure client reference manifest is generated correctly
    webpackBuildWorker: true,
  },
};

export default nextConfig;
