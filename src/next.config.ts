
import type {NextConfig} from 'next';
// Correct import for ESM/TypeScript
import createNextPwa from 'next-pwa';

// Original Next.js configuration
const baseConfig: NextConfig = {
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
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
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

// Conditionally wrap the config with next-pwa only in production
const withPWA = createNextPwa({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Explicitly disable in development
});

const nextConfig = process.env.NODE_ENV === 'production' ? withPWA(baseConfig) : baseConfig;

export default nextConfig;
