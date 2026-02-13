import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import PWAInstaller from '@/components/PWAInstaller'
import JsonLd from '@/components/JsonLd'

const inter = Inter({ subsets: ['latin'] })
const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: 'LinusPlaylists - Football Highlights & Music Streaming',
  description: 'Watch football match highlights from top leagues (Premier League, La Liga, Serie A) and stream curated music playlists. Free football highlights and music app.',
  keywords: 'football highlights, music streaming, football clips, live football, music playlists, youtube streaming, football videos',
  manifest: '/manifest.json',
  robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
  openGraph: {
    type: 'website',
    url: 'https://www.linusplaylists.com',
    title: 'LinusPlaylists - Football Highlights & Music',
    description: 'Watch football match highlights and stream music playlists',
    siteName: 'LinusPlaylists',
    images: [
      {
        url: 'https://www.linusplaylists.com/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'LinusPlaylists logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@linusplaylists',
    creator: '@linusplaylists',
    title: 'LinusPlaylists - Football Highlights & Music',
    description: 'Watch football highlights and stream music playlists',
    images: ['https://www.linusplaylists.com/icon-512x512.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LinusPlaylists',
  },
  formatDetection: {
    telephone: false,
  },
  verification: {
    google: 'YOUR_GOOGLE_VERIFICATION_CODE_HERE', // Add after setting up Google Search Console
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#9333EA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="theme-color" content="#9333EA" />
        <meta name="mobile-web-app-capable" content="yes" />
        <JsonLd />
      </head>
      <body className={`${inter.className} ${playfair.variable} bg-gray-900 text-white`}>
        <GoogleAnalytics />
        <PWAInstaller />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
