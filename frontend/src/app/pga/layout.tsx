import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PGA Tour Highlights - Golf Tournament Highlights | LinusPlaylists',
  description: 'Watch free PGA Tour highlights, tournament recaps, and replays. Catch the best shots, eagles, and leaderboard moments updated daily.',
  keywords: 'pga highlights, golf highlights, pga tour recaps, golf tournament highlights, golf videos, pga replays',
  openGraph: {
    title: 'PGA Tour Highlights - Watch Latest Tournament Videos',
    description: 'Free PGA Tour highlights and tournament recaps.',
    url: 'https://www.linusplaylists.com/pga',
    type: 'website',
    images: [
      {
        url: 'https://www.linusplaylists.com/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'LinusPlaylists PGA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PGA Tour Highlights - LinusPlaylists',
    description: 'Watch free PGA Tour golf highlights and replays',
  },
  alternates: {
    canonical: 'https://www.linusplaylists.com/pga',
  },
};

export default function PgaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
