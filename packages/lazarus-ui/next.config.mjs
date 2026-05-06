import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  // Temporarily ignore TypeScript errors during build (useful after merge conflicts)
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Suppress webpack warnings for handlebars require.extensions
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        { module: /node_modules\/handlebars\/lib\/index\.js/ },
      ]
    }
    return config
  },
  // Other existing configurations can be added here
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  tunnelRoute: '/monitoring',
});
