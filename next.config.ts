import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true
  },
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: ['http://localhost:3000'],
      bodySizeLimit: '50mb'
    }
  },
  // webpack: (config, { isServer }) => {
  //   if (isServer) {
  //     config.resolve.alias['better-sqlite3-darwin'] = 'node_modules/better-sqlite3/build/Release/better_sqlite3.node';
  //   }
  //   return config;
  // }
};

export default nextConfig;
