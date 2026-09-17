/** @type {import('next').NextConfig} */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import bundleAnalyzer from '@next/bundle-analyzer';

import redirects from './config/redirects.ts';
import rewrites from './config/rewrites.ts';
import fetchSanityRedirects from './tools/sanity/helpers/fetchSanityRedirects.ts';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true'
});

const nextConfig = {
  experimental: {
    taint: true
  },
  headers: async () => [
    {
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'X-DNS-Prefetch-Control', value: 'on' }
      ],
      source: '/(.*)'
    }
  ],
  images: {
    qualities: [75, 80],
    remotePatterns: [
      {
        hostname: 'cdn.sanity.io',
        protocol: 'https'
      },
      {
        hostname: 'cdn.shopify.com',
        protocol: 'https'
      }
    ]
  },
  poweredByHeader: false,
  reactStrictMode: true,
  redirects: async () => {
    const sanityRedirects = await fetchSanityRedirects();
    return [...redirects, ...sanityRedirects];
  },
  async rewrites() {
    return rewrites;
  },

  sassOptions: {
    additionalData: `@import "${path.join(__dirname, 'tools/sass/base/resources').replaceAll('\\', '/')}";`,
    includePaths: [path.join(__dirname, 'tools/sass/base')],
    silenceDeprecations: ['legacy-js-api', 'import']
  },

  trailingSlash: true,

  turbopack: {
    rules: {
      '*.svg': {
        as: '*.js',
        loaders: ['@svgr/webpack']
      }
    }
  },

  typescript: {
    ignoreBuildErrors: false
  }
};

export default withBundleAnalyzer(nextConfig);
