import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['mundanemag.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mundanemag.com',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
