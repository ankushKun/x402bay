import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  transpilePackages: ['@rainbow-me/rainbowkit'],
  serverExternalPackages: [
    'pino',
    'pino-pretty',
    'thread-stream',
    'lokijs',
    'encoding',
  ],
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
