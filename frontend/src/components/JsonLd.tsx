export default function JsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'LinusPlaylists',
    alternateName: ['Linus Playlists', 'Linus Music', 'Linus Football'],
    description: 'Watch free football match highlights from top leagues and stream curated music playlists. Your one-stop entertainment destination.',
    url: 'https://www.linusplaylists.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.linusplaylists.com/music?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'LinusPlaylists',
      url: 'https://www.linusplaylists.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.linusplaylists.com/icon-512x512.png',
        width: 512,
        height: 512,
      },
    },
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'LinusPlaylists',
    url: 'https://www.linusplaylists.com',
    logo: 'https://www.linusplaylists.com/icon-512x512.png',
    sameAs: [
      'https://twitter.com/linusplaylists',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      url: 'https://www.linusplaylists.com/contact',
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.linusplaylists.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Football Highlights',
        item: 'https://www.linusplaylists.com/football',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Music Playlists',
        item: 'https://www.linusplaylists.com/music',
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: 'Fun Videos',
        item: 'https://www.linusplaylists.com/fun',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        suppressHydrationWarning
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        suppressHydrationWarning
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        suppressHydrationWarning
      />
    </>
  );
}
