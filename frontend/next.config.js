/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'i.ytimg.com', 
      'img.youtube.com',
      'a.espncdn.com',
      'media.api.espn.com',
      'espncdn.com'
    ],
  },
  eslint: {
    // We're using img tags in some places for performance reasons, these warnings can be ignored
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [];
  },
}

module.exports = nextConfig
