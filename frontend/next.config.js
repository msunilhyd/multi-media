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
  async redirects() {
    return [
      {
        source: '/',
        destination: '/football',
        permanent: true,
      },
    ];
  },
}

module.exports = nextConfig
