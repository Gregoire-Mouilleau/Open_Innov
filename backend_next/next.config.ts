import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build minimal auto-suffisant pour Docker/Railway (.next/standalone + server.js)
  output: "standalone",
};

export default nextConfig;
