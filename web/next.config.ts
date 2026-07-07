import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The engine ships as TypeScript source (main = src/index.ts). Next transpiles
  // it in-tree, so V1 needs no separate build step. When the engine later moves
  // behind an HTTP boundary (Python/FastAPI), this line simply goes away.
  transpilePackages: ["@athena/engine"],
  // Both routes are fully client/static, so we export a static site — deployable
  // to any static host (Vercel/Netlify/GitHub Pages) with zero server runtime.
  output: "export",
};

export default nextConfig;
