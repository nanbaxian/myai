// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  trailingSlash: true,
  serverExternalPackages: [],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    config.cache = {
      type: 'memory',
    }
    return config
  },
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 5,
    pagesBufferLength: 2,
  },
}

export default nextConfig
