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
};

export default nextConfig;
