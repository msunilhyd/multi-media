import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us - Get in Touch | LinusPlaylists',
  description: 'Contact LinusPlaylists for feedback, suggestions, or questions about football highlights and music playlists. We\'d love to hear from you!',
  keywords: 'contact, feedback, support, suggestions, get in touch, customer service',
  openGraph: {
    title: 'Contact Us - LinusPlaylists',
    description: 'Get in touch with us for feedback and suggestions.',
    url: 'https://www.linusplaylists.com/contact',
    type: 'website',
    images: [
      {
        url: 'https://www.linusplaylists.com/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'LinusPlaylists Contact',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Contact Us - LinusPlaylists',
    description: 'Get in touch with us',
  },
  alternates: {
    canonical: 'https://www.linusplaylists.com/contact',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
