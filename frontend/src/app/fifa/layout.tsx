import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FIFA World Cup Highlights & Standings | LinusPlaylists',
  description: 'Watch free FIFA World Cup match highlights and follow live standings. Catch the best goals, group stage drama, and knockout round action.',
  keywords: 'fifa world cup highlights, world cup standings, world cup match highlights, fifa highlights, world cup videos',
  openGraph: {
    title: 'FIFA World Cup Highlights - Watch Latest Match Videos',
    description: 'Free FIFA World Cup highlights and live standings.',
    url: 'https://www.linusplaylists.com/fifa',
    type: 'website',
    images: [
      {
        url: 'https://www.linusplaylists.com/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'LinusPlaylists FIFA World Cup',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FIFA World Cup Highlights - LinusPlaylists',
    description: 'Watch free FIFA World Cup match highlights and standings',
  },
  alternates: {
    canonical: 'https://www.linusplaylists.com/fifa',
  },
};

export default function FifaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
