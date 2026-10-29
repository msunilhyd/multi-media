import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'IPL Highlights - Indian Premier League Cricket Highlights | LinusPlaylists',
  description: 'Watch free IPL highlights, match recaps, and replays from the Indian Premier League. Catch every six, wicket, and match summary updated daily.',
  keywords: 'ipl highlights, indian premier league highlights, cricket highlights, ipl match recaps, ipl videos, ipl replays',
  openGraph: {
    title: 'IPL Highlights - Watch Latest Match Videos',
    description: 'Free IPL highlights and match recaps from the Indian Premier League.',
    url: 'https://www.linusplaylists.com/ipl',
    type: 'website',
    images: [
      {
        url: 'https://www.linusplaylists.com/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'LinusPlaylists IPL',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IPL Highlights - LinusPlaylists',
    description: 'Watch free IPL cricket match highlights and replays',
  },
  alternates: {
    canonical: 'https://www.linusplaylists.com/ipl',
  },
};

export default function IplLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
