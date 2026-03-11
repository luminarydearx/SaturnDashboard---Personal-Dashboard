/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Images ─────────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/dg3awuzug/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  // ── Next.js 15/16: external packages for Server Components ─────────────
  serverExternalPackages: ['bcryptjs'],

  // ── Turbopack (Next.js 16 default bundler) ──────────────────────────────
  // Empty object = let Turbopack auto-configure everything
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

  // ── Vercel: standalone output preserves /data folder access ────────────
  // NOTE: On Vercel, fs writes go to /tmp (ephemeral). For persistent data,
  // use a database (Vercel Postgres, PlanetScale, etc).
  // For local/Electron use: data/ folder works normally.
  output: process.env.VERCEL ? 'standalone' : undefined,
};

module.exports = nextConfig;