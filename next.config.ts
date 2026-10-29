// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  trailingSlash: true,
  serverExternalPackages: [],
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
