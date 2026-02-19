import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: {
    BRIDGE_URL: process.env.BRIDGE_URL ?? 'http://localhost:8199',
  },
}

export default nextConfig
