import type { NextConfig } from 'next';

// When building with OpenNext (npm run build:opennext), standalone output is
// incompatible with OpenNext's bundling. For Docker builds, standalone output
// is still used (BUILD_TARGET is unset, so output: 'standalone' applies).
const isOpenNext = process.env.BUILD_TARGET === 'opennext';

const nextConfig: NextConfig = {
  ...(isOpenNext ? {} : { output: 'standalone' }),
  serverExternalPackages: ['postgres'],
};

export default nextConfig;
