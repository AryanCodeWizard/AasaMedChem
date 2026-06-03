import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Help Turbopack correctly locate the workspace root when multiple lockfiles exist
  turbopack: {
    root: './',
  },
};

export default nextConfig;
