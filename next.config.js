/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Image domains ─────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/dg3awuzug/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  // ── Experimental (Next.js 14 compatible) ─────────────────────
  experimental: {
    // Faster package imports — avoids full barrel-file traversal
    optimizePackageImports: [
      'react-icons',
      'framer-motion',
      'date-fns',
      'lucide-react',
    ],
    // Fix bcryptjs in Server Components (Next.js 14 key)
    serverComponentsExternalPackages: ['bcryptjs'],
  },

  // ── Webpack tweaks ────────────────────────────────────────────
  webpack: (config, { dev, isServer }) => {
    // Silence node built-in warnings
    config.externals = [...(config.externals || []), { 'node:fs': 'commonjs fs' }];

    // In production builds, minimize client bundle further
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }

    return config;
  },

  // ── Compiler tweaks ───────────────────────────────────────────
  compiler: {
    // Strip console.* in production
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // ── Output & poweredBy ────────────────────────────────────────
  poweredByHeader: false,
};

module.exports = nextConfig;
