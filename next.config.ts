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
  // Server-side code (e.g. src/app/lib/makerworldServer.js) imports 'electron' directly so it
  // can reach session/cookie APIs without going through the renderer's IPC bridge. Without this,
  // webpack bundles node_modules/electron/index.js's dev-time "find the electron binary" shim
  // straight into the compiled route - which throws ("Electron failed to install correctly")
  // because that shim only makes sense invoked from a plain `electron .` launch, not from inside
  // a bundled server chunk. Marking it external leaves a real `require("electron")`/
  // `import("electron")` in the output for Node's module resolution to handle at actual runtime,
  // which inside the packaged app is intercepted natively by Electron itself.
  serverExternalPackages: ["electron"],
};

export default nextConfig;
