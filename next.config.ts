import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Ensure API routes work correctly in production
  experimental: {
    // Enable any experimental features needed
  },
  
  // Environment variable validation will be done at runtime
  // Ensure NEXT_PUBLIC_API_URL is set in production
};

export default nextConfig;
