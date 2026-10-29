import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NFL Highlights - Latest Game Highlights & Replays | LinusPlaylists',
  description: 'Watch free NFL highlights, game recaps, and replays from every week of the season. Catch the best plays from all 32 teams, updated daily.',
  keywords: 'nfl highlights, football highlights, nfl game recaps, nfl replays, nfl videos, american football highlights',
  openGraph: {
    title: 'NFL Highlights - Watch Latest Game Videos',
    description: 'Free NFL highlights and game recaps from every week of the season.',
    url: 'https://www.linusplaylists.com/nfl',
    type: 'website',
    images: [
      {
        url: 'https://www.linusplaylists.com/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'LinusPlaylists NFL',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NFL Highlights - LinusPlaylists',
    description: 'Watch free NFL game highlights and replays',
  },
  alternates: {
    canonical: 'https://www.linusplaylists.com/nfl',
  },
};

export default function NflLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
