import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true
  },
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: ['http://localhost:3000', 'http://pubman.lan:3000'],
      bodySizeLimit: '50mb'
    }
  }
};

export default nextConfig;
