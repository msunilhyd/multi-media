import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MLB Highlights - Baseball Game Highlights & Replays | LinusPlaylists',
  description: 'Watch free MLB highlights, game recaps, and replays from every team in the league. Catch home runs, big plays, and daily recaps all season long.',
  keywords: 'mlb highlights, baseball highlights, mlb game recaps, mlb replays, mlb videos, baseball highlights today',
  openGraph: {
    title: 'MLB Highlights - Watch Latest Game Videos',
    description: 'Free MLB highlights and game recaps from every team in the league.',
    url: 'https://www.linusplaylists.com/mlb',
    type: 'website',
    images: [
      {
        url: 'https://www.linusplaylists.com/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'LinusPlaylists MLB',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MLB Highlights - LinusPlaylists',
    description: 'Watch free MLB game highlights and replays',
  },
  alternates: {
    canonical: 'https://www.linusplaylists.com/mlb',
  },
};

export default function MlbLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
