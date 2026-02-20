import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Music Playlists - Bollywood, Tamil, Telugu Songs | LinusPlaylists',
  description: 'Stream free music playlists featuring Bollywood hits, Tamil songs, Telugu music, and international tracks. Curated playlists with A.R. Rahman, Pritam, Anirudh, and more.',
  keywords: 'music playlists, bollywood songs, tamil music, telugu songs, hindi music, music streaming, indian music, playlist online, free music',
  openGraph: {
    title: 'Music Playlists - Stream Free Songs',
    description: 'Curated music playlists featuring Bollywood, Tamil, Telugu, and international hits.',
    url: 'https://www.linusplaylists.com/music',
    type: 'website',
    images: [
      {
        url: 'https://www.linusplaylists.com/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'LinusPlaylists Music',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Music Playlists - LinusPlaylists',
    description: 'Stream free curated music playlists',
  },
  alternates: {
    canonical: 'https://www.linusplaylists.com/music',
  },
};

export default function MusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
