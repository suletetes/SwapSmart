import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /\/api\/v1\/stations/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'stations',
        expiration: { maxEntries: 50, maxAgeSeconds: 300 },
      },
    },
    {
      urlPattern: /\/api\/v1\/reservations\/active/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'reservation',
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /\/api\/v1\/wallet/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'wallet',
        networkTimeoutSeconds: 5,
      },
    },
    {
      urlPattern: /\/tiles\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'map-tiles',
        expiration: { maxEntries: 500, maxAgeSeconds: 86400 },
      },
    },
    {
      urlPattern: /\/_next\/static/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 200, maxAgeSeconds: 86400 * 30 },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
};

export default withPWA(nextConfig);
