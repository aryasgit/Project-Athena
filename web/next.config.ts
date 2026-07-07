import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The engine ships as TypeScript source (main = src/index.ts). Next transpiles
  // it in-tree, so V1 needs no separate build step. When the engine later moves
  // behind an HTTP boundary (Python/FastAPI), this line simply goes away.
  transpilePackages: ["@athena/engine"],
};

export default nextConfig;
