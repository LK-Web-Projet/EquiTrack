import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Requis par infra/Dockerfile : le build Docker copie .next/standalone.
  output: "standalone",
};

export default nextConfig;
