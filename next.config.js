/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  serverExternalPackages: ['bcryptjs'],
  turbopack: {
    // Fix: silence "multiple lockfiles" warning by explicitly setting root
    root: process.cwd(),
  },
  experimental: {
    optimizePackageImports: ['react-icons', 'framer-motion', 'date-fns'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  poweredByHeader: false,
  output: process.env.VERCEL ? 'standalone' : undefined,
};
module.exports = nextConfig;
