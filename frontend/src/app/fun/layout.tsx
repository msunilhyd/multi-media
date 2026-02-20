import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fun Videos - Comedy Skits, Short Films & Entertainment | LinusPlaylists',
  description: 'Watch entertaining videos including comedy skits, short films, funny clips, and viral content. Free entertainment videos updated regularly.',
  keywords: 'funny videos, comedy skits, short films, entertainment, viral videos, fun clips, comedy videos, humor',
  openGraph: {
    title: 'Fun Videos - Comedy & Entertainment',
    description: 'Watch comedy skits, short films, and entertaining videos.',
    url: 'https://www.linusplaylists.com/fun',
    type: 'website',
    images: [
      {
        url: 'https://www.linusplaylists.com/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'LinusPlaylists Fun',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fun Videos - LinusPlaylists',
    description: 'Comedy skits and entertaining videos',
  },
  alternates: {
    canonical: 'https://www.linusplaylists.com/fun',
  },
};

export default function FunLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
