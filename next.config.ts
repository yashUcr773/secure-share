import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
      {
        // API routes with CORS
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com'
              : '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
    ];
  },

  // Rewrites for clean URLs
  async rewrites() {
    return [];
  },

  // External packages for server components
  serverExternalPackages: ['jsonwebtoken'],

  // Production optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['recharts', 'lucide-react'],
  },

  // Compression and optimization
  compress: true,

  // Image optimization configuration
  images: {
    domains: [], // Add allowed image domains here
    dangerouslyAllowSVG: false,
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Bundle analyzer for production optimization
  ...(process.env.ANALYZE === 'true' && {
    experimental: {
      bundlePagesRouterDependencies: true,
    },
  }),

  // Disable x-powered-by header
  poweredByHeader: false,

  // Output configuration for production
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Webpack optimizations
  webpack: (config, { isServer, dev }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
        minimize: true,
        sideEffects: false,
      };

      // Bundle splitting for better caching
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            chunks: 'all',
          },
          recharts: {
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            name: 'recharts',
            priority: 20,
            chunks: 'all',
          },
        },
      };
    }

    return config;
  },
};

export default nextConfig;
