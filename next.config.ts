import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
    useTypeScriptCli: false,
  },
};

export default nextConfig;
