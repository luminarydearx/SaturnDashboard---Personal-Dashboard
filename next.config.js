/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Images ─────────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  // ── Next.js 15/16: external packages for Server Components ─────────────
  serverExternalPackages: ['bcryptjs'],

  turbopack: {},

  // ── Performance ─────────────────────────────────────────────────────────
  experimental: {
    optimizePackageImports: ['react-icons', 'framer-motion', 'date-fns'],
  },

  // ── Production compiler ─────────────────────────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  poweredByHeader: false,

  // ── Vercel: standalone output ───────────────────────────────────────────
  output: process.env.VERCEL ? 'standalone' : undefined,
};

module.exports = nextConfig;
