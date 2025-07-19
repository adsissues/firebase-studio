
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

let nextConfig: NextConfig = baseConfig;

// Only apply PWA configuration in production
if (process.env.NODE_ENV === 'production') {
  const withPWA = createNextPwa({
    dest: 'public',
    register: true, // Register the service worker
    skipWaiting: true, // Immediately activate new service worker
    // The disable flag is effectively handled by this conditional application.
  });
  nextConfig = withPWA(baseConfig);
}

export default nextConfig;
