import type { Metadata } from 'next';

// This route serves admin/staging playlist content and is not meant to be
// publicly indexed. It is not linked from site navigation. Keeping it
// noindex prevents Google from flagging it as a thin/soft-404 page.
export const metadata: Metadata = {
  title: 'Admin Staging | LinusPlaylists',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: 'https://www.linusplaylists.com/tamil-movies',
  },
};

export default function TamilMoviesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
