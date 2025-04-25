import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./main/main.ts", "./main/preload.ts"],
  splitting: false,
  sourcemap: false,
  clean: true,
  cjsInterop: true,
  skipNodeModulesBundle: true,
  treeshake: true,
  outDir: "build",
  external: ["main"],
  format: ["cjs"],
  bundle: true,
});