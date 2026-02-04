import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  // This creates a minimal production bundle (~150MB vs ~1GB)
  output: 'standalone',
  // Tell Turbopack to look one directory up for node_modules
  // Required for npm workspaces where dependencies are hoisted to the root
  turbopack: {
    root: '..',
  },
};

export default nextConfig;
