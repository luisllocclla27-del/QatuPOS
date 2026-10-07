import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ['@qatu/contracts', '@qatu/domain'],
  webpack(config) {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  turbopack: {},
};

export default nextConfig;
