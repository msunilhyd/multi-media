import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NHL Highlights - Hockey Game Highlights & Replays | LinusPlaylists',
  description: 'Watch free NHL highlights, game recaps, and replays from every team in the league. Catch the best goals, saves, and daily recaps all season long.',
  keywords: 'nhl highlights, hockey highlights, nhl game recaps, nhl replays, nhl videos, hockey highlights today',
  openGraph: {
    title: 'NHL Highlights - Watch Latest Game Videos',
    description: 'Free NHL highlights and game recaps from every team in the league.',
    url: 'https://www.linusplaylists.com/nhl',
    type: 'website',
    images: [
      {
        url: 'https://www.linusplaylists.com/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'LinusPlaylists NHL',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NHL Highlights - LinusPlaylists',
    description: 'Watch free NHL game highlights and replays',
  },
  alternates: {
    canonical: 'https://www.linusplaylists.com/nhl',
  },
};

export default function NhlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
