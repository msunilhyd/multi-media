import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NBA Highlights - Basketball Game Highlights & Replays | LinusPlaylists',
  description: 'Watch free NBA highlights, game recaps, and replays from every team in the league. Catch the best dunks, buzzer-beaters, and daily recaps.',
  keywords: 'nba highlights, basketball highlights, nba game recaps, nba replays, nba videos, basketball highlights today',
  openGraph: {
    title: 'NBA Highlights - Watch Latest Game Videos',
    description: 'Free NBA highlights and game recaps from every team in the league.',
    url: 'https://www.linusplaylists.com/nba',
    type: 'website',
    images: [
      {
        url: 'https://www.linusplaylists.com/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'LinusPlaylists NBA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NBA Highlights - LinusPlaylists',
    description: 'Watch free NBA game highlights and replays',
  },
  alternates: {
    canonical: 'https://www.linusplaylists.com/nba',
  },
};

export default function NbaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
