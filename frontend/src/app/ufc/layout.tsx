import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UFC Highlights - MMA Fight Highlights & Replays | LinusPlaylists',
  description: 'Watch free UFC highlights, fight recaps, and replays from every event. Catch the best knockouts, submissions, and post-fight moments.',
  keywords: 'ufc highlights, mma highlights, ufc fight recaps, ufc replays, ufc videos, mma fight highlights',
  openGraph: {
    title: 'UFC Highlights - Watch Latest Fight Videos',
    description: 'Free UFC highlights and fight recaps from every event.',
    url: 'https://www.linusplaylists.com/ufc',
    type: 'website',
    images: [
      {
        url: 'https://www.linusplaylists.com/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'LinusPlaylists UFC',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UFC Highlights - LinusPlaylists',
    description: 'Watch free UFC fight highlights and replays',
  },
  alternates: {
    canonical: 'https://www.linusplaylists.com/ufc',
  },
};

export default function UfcLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
