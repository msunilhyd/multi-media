/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['i.ytimg.com', 'img.youtube.com'],
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
