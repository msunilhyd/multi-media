import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'

const inter = Inter({ subsets: ['latin'] })
const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: 'LinusPlaylists - Football Highlights & Music',
  description: 'Watch football match highlights and listen to curated music playlists',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} ${playfair.variable} bg-gray-900 text-white`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
