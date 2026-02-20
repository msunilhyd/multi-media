import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Football Highlights - Premier League, La Liga, Serie A | LinusPlaylists',
  description: 'Watch free football match highlights from Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and Champions League. Latest football videos and match replays updated daily.',
  keywords: 'football highlights, match highlights, premier league, la liga, serie a, champions league, football videos, soccer highlights, match replays',
  openGraph: {
    title: 'Football Highlights - Watch Latest Match Videos',
    description: 'Free football highlights from top leagues. Premier League, La Liga, Serie A and more.',
    url: 'https://www.linusplaylists.com/football',
    type: 'website',
    images: [
      {
        url: 'https://www.linusplaylists.com/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'LinusPlaylists Football',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Football Highlights - LinusPlaylists',
    description: 'Watch free football match highlights from top leagues',
  },
  alternates: {
    canonical: 'https://www.linusplaylists.com/football',
  },
};

export default function FootballLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
