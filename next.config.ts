
import type {NextConfig} from 'next';
// Correct import for ESM/TypeScript
import createNextPwa from 'next-pwa';

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
  experimental: {
    allowedDevOrigins: [
      'https://6000-idx-studio-1746452029838.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev',
      'https://9000-idx-studio-1746452029838.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev',
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
    // The disable flag is effectively handled by this conditional application,
    // but can be kept if there are other scenarios to disable PWA in prod.
    // disable: process.env.NODE_ENV === 'development', 
  });
  nextConfig = withPWA(baseConfig);
}

export default nextConfig;
