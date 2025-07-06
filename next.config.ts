
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
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
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'meilrubywkatojcnwwux.supabase.co', // Added your Supabase hostname
        port: '',
        pathname: '/storage/v1/object/public/**', // Allows images from all public buckets
      },
    ],
  },
};

export default nextConfig;
