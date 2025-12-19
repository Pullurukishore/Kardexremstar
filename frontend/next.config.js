/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Performance optimizations for development
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // Modular imports for better tree-shaking
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
  },

  // Webpack configuration for performance
  webpack: (config, { isServer, dev }) => {
    // Skip complex optimizations in development
    if (dev) {
      return config;
    }

    // Remove console logs in production only
    config.optimization.minimizer = config.optimization.minimizer || [];
    const TerserPlugin = require('terser-webpack-plugin');
    config.optimization.minimizer.push(
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: process.env.NEXT_PUBLIC_ENABLE_LOGS !== 'true',
          },
        },
      })
    );

    // Advanced code splitting for better performance (PRODUCTION ONLY)
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          // Framework chunk (React, Next.js core)
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
            name: 'framework',
            priority: 40,
            chunks: 'all',
            enforce: true,
          },
          // Icons chunk (lucide-react is typically large)
          icons: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'icons',
            priority: 35,
            chunks: 'all',
          },
          // Date utilities
          dateutils: {
            test: /[\\/]node_modules[\\/]date-fns[\\/]/,
            name: 'dateutils',
            priority: 35,
            chunks: 'all',
          },
          // Radix UI components
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix',
            priority: 35,
            chunks: 'all',
          },
          // Charts (if using recharts or similar)
          charts: {
            test: /[\\/]node_modules[\\/](recharts|d3|victory)[\\/]/,
            name: 'charts',
            priority: 35,
            chunks: 'all',
          },
          // Other vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 20,
            chunks: 'all',
          },
          // Common chunk for shared components
          common: {
            name: 'common',
            minChunks: 2,
            priority: 10,
            chunks: 'all',
            reuseExistingChunk: true,
          },
          // UI components chunk
          ui: {
            test: /[\\/]components[\\/]ui[\\/]/,
            name: 'ui',
            priority: 15,
            chunks: 'all',
          },
        },
      };
    }

    // Tree shaking for lucide-react icons
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'lucide-react': require.resolve('lucide-react/dist/esm/icons'),
      };
    }

    // Add asset loaders
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      type: 'asset/resource',
    });

    // Handle undefined module errors
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      module: false,
      net: false,
      dns: false,
      child_process: false,
      tls: false,
    };

    return config;
  },

  // Enable CSS source maps in development
  productionBrowserSourceMaps: process.env.NODE_ENV === 'development',
  // Enable styled-components support
  compiler: {
    styledComponents: true,
  },
  // Add environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003',
  },

  // Output configuration for different deployment targets
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,

  // Disable trailing slash for proper routing
  trailingSlash: false,

  // Image domains for production
  images: {
    domains: ['localhost', 'your-backend-domain.run.app'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    unoptimized: process.env.NEXT_EXPORT === 'true',
  },

  // Enable TypeScript checking
  typescript: {
    ignoreBuildErrors: false,
  },

  // Enable ESLint checking
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Development optimizations
  devIndicators: {
    buildActivityPosition: 'bottom-right',
  },

  // Add headers for Google Fonts optimization (disabled since we use system fonts)
  // async headers() {
  //   return [
  //     {
  //       source: '/:path*',
  //       headers: [
  //         {
  //           key: 'Link',
  //           value: '<https://fonts.googleapis.com>; rel=preconnect; crossorigin',
  //         },
  //         {
  //           key: 'X-DNS-Prefetch-Control',
  //           value: 'on',
  //         },
  //       ],
  //     },
  //   ];
  // },
}

module.exports = nextConfig
