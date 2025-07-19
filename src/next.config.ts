
import type {NextConfig} from 'next';
// Correct import for ESM/TypeScript
import createNextPwa from 'next-pwa';

// Base Next.js configuration for all environments
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
  // Add other configurations that apply to both dev and prod here
};

// PWA configuration is wrapped and applied only for production
const withPWA = createNextPwa({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Explicitly disable for development
});

// Export the final configuration
const nextConfig: NextConfig = withPWA(baseConfig);

export default nextConfig;
