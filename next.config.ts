import type { NextConfig } from "next";

// Parse allowed origins from environment variable (comma-separated list)
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || "localhost:3000,localhost:3001,*.github.dev";
const allowedOrigins = allowedOriginsEnv.split(",").map((origin) => origin.trim());

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      // Trust forwarded headers in proxy environments (like GitHub Codespaces)
      trustHostHeader: true,
      // Allow multiple origins for forwarded requests
      allowedOrigins,
    },
  },
};

export default nextConfig;
