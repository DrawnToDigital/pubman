import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    },
  },
  webpack: (config, { isServer, dev }) => {
    if (isServer && dev) {
      if (process.platform === "darwin" && process.arch === 'arm64') {
        config.resolve.alias['better-sqlite3'] = 'better-sqlite3-darwin';
      }
    }
    return config;
  }
};

export default nextConfig;
