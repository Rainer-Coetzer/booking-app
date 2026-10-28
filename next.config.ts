import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // Ship the SQL migrations with the standalone server build.
  outputFileTracingIncludes: { '/**': ['./drizzle/**/*'] },
};

export default nextConfig;
