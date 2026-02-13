'use client';

export default function JsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'LinusPlaylists',
    alternateName: ['Linus Playlists', 'Linus Music'],
    description: 'Stream football highlights and music playlists',
    url: 'https://www.linusplaylists.com',
    applicationCategory: 'MultimediaApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Person',
      name: 'Linus',
    },
    image: 'https://www.linusplaylists.com/icon-512x512.png',
    screenshot: 'https://www.linusplaylists.com/screenshot-540x720.png',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '100',
      bestRating: '5',
      worstRating: '1',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
