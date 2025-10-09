/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // Enable new CSS features
    optimizeCss: true,
    // Enable server actions
    serverActions: true,
    // Enable modern bundling
    esmExternals: true,
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Webpack configuration for performance
  webpack: (config, { isServer, dev }) => {
    // Advanced code splitting for better performance
    if (!isServer && !dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Vendor chunk for stable dependencies
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
          // Customer-specific chunk
          customer: {
            test: /[\\/]components[\\/]customer[\\/]/,
            name: 'customer',
            priority: 12,
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
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  // Output configuration for different deployment targets
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  
  // Enable static export for Firebase Hosting
  trailingSlash: true,
  
  // Image domains for production
  images: {
    domains: ['localhost', 'your-backend-domain.run.app'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    unoptimized: process.env.NEXT_EXPORT === 'true',
  },
  // Enable TypeScript checking
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },
  // Enable ESLint checking
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
