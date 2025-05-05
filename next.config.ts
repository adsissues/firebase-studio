
import type {NextConfig} from 'next';
// Correct import for ESM/TypeScript
import createNextPwa from 'next-pwa';

// Configure next-pwa
const withPWA = createNextPwa({
  dest: 'public',
  register: true, // Register the service worker
  skipWaiting: true, // Immediately activate new service worker
  disable: process.env.NODE_ENV === 'development', // Disable PWA in development for easier debugging
});

// Original Next.js configuration
const baseConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Add other existing configurations here if any
};

// Wrap the base config with PWA config
const nextConfig = withPWA(baseConfig);

export default nextConfig;
