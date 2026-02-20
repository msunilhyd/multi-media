import { NextResponse } from 'next/server';

export async function GET() {
  const robots = `# robots.txt for LinusPlaylists
# Allow search engines to crawl all pages

User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

# Sitemaps
Sitemap: https://www.linusplaylists.com/sitemap.xml

# Crawl delay (be nice to servers)
Crawl-delay: 1
`;

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
