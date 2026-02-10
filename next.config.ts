import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      // Trust forwarded headers in proxy environments (like GitHub Codespaces)
      trustHostHeader: true,
      // Allow multiple origins for forwarded requests
      allowedOrigins: ["localhost:3000", "localhost:3001", "*.github.dev"],
    },
  },
};

export default nextConfig;
