import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tennis Highlights - Grand Slam & ATP/WTA Match Highlights | LinusPlaylists',
  description: 'Watch free tennis highlights from Grand Slams, ATP, and WTA tournaments. Catch the best rallies, aces, and match recaps updated daily.',
  keywords: 'tennis highlights, grand slam highlights, atp highlights, wta highlights, tennis match recaps, tennis videos',
  openGraph: {
    title: 'Tennis Highlights - Watch Latest Match Videos',
    description: 'Free tennis highlights from Grand Slams, ATP, and WTA tournaments.',
    url: 'https://www.linusplaylists.com/tennis',
    type: 'website',
    images: [
      {
        url: 'https://www.linusplaylists.com/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'LinusPlaylists Tennis',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tennis Highlights - LinusPlaylists',
    description: 'Watch free tennis match highlights and replays',
  },
  alternates: {
    canonical: 'https://www.linusplaylists.com/tennis',
  },
};

export default function TennisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
