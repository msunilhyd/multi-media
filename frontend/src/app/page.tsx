'use client';

import Link from 'next/link';
import { Trophy, Music, Play, ChevronRight, Zap } from 'lucide-react';
import Script from 'next/script';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Home() {
  // Enhanced homepage structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'LinusPlaylists',
    alternateName: 'Linus Playlists',
    url: 'https://www.linusplaylists.com',
    description: 'Watch football match highlights from top leagues (Premier League, La Liga, Serie A) and stream curated music playlists. Free football highlights and music app.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.linusplaylists.com/music?search={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    },
    publisher: {
      '@type': 'Organization',
      name: 'LinusPlaylists',
      url: 'https://www.linusplaylists.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.linusplaylists.com/icon-512x512.png',
        width: 512,
        height: 512
      },
      sameAs: [
        'https://twitter.com/linusplaylists'
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Script
        id="homepage-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Header />
      
      <main className="container mx-auto px-3 sm:px-4 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-3 sm:mb-4">
            Welcome to <span className="font-[family-name:var(--font-playfair)] italic bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">LinusPlaylists</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-2">
            Your one-stop destination for football highlights, music playlists, and fun entertainment
          </p>
        </div>
        
        {/* Cards Section */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 max-w-6xl mx-auto">
          {/* Football Card */}
          <Link href="/football" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transition-transform group-hover:scale-[1.02]">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8">
                <Trophy className="w-16 h-16 text-white mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  Football Highlights
                </h2>
                <p className="text-blue-100">
                  Watch the latest match highlights from top leagues worldwide
                </p>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Play className="w-5 h-5" />
                  <span>Premier League, La Liga, Serie A & more</span>
                </div>
                <ChevronRight className="w-6 h-6 text-blue-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* NFL Card */}
          <Link href="/nfl" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transition-transform group-hover:scale-[1.02]">
              <div className="bg-gradient-to-br from-red-600 to-red-700 p-8">
                <Zap className="w-16 h-16 text-white mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  NFL Highlights
                </h2>
                <p className="text-red-100">
                  Watch the latest American football game highlights and replays
                </p>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Play className="w-5 h-5" />
                  <span>All NFL Teams & Playoffs</span>
                </div>
                <ChevronRight className="w-6 h-6 text-red-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* MLB Card */}
          <Link href="/mlb" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transition-transform group-hover:scale-[1.02]">
              <div className="bg-gradient-to-br from-green-600 to-green-700 p-8">
                <Trophy className="w-16 h-16 text-white mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  MLB Highlights
                </h2>
                <p className="text-green-100">
                  Watch the latest baseball game highlights and match replays
                </p>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Play className="w-5 h-5" />
                  <span>All MLB Teams & Playoffs</span>
                </div>
                <ChevronRight className="w-6 h-6 text-green-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
          
          {/* Music Card */}
          <Link href="/music" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transition-transform group-hover:scale-[1.02]">
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-8">
                <Music className="w-16 h-16 text-white mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  Music Playlist
                </h2>
                <p className="text-purple-100">
                  Listen to curated music from various languages and genres
                </p>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Play className="w-5 h-5" />
                  <span>Hindi, Tamil, Telugu, English & more</span>
                </div>
                <ChevronRight className="w-6 h-6 text-purple-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
          
          {/* Fun Card */}
          <Link href="/fun" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transition-transform group-hover:scale-[1.02]">
              <div className="bg-gradient-to-br from-orange-600 to-orange-700 p-8">
                <Play className="w-16 h-16 text-white mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  Fun Videos
                </h2>
                <p className="text-orange-100">
                  Enjoy entertaining video segments and funny moments
                </p>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Play className="w-5 h-5" />
                  <span>Comedy, Entertainment & More</span>
                </div>
                <ChevronRight className="w-6 h-6 text-orange-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
        
        {/* Features Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-8">
            Features
          </h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Match Highlights</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Watch highlights from Premier League, La Liga, Bundesliga, and more
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Music className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Music Streaming</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enjoy curated playlists with continuous playback
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Fun Entertainment</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Watch entertaining video segments and funny moments
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Auto-Play</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Seamless playback with automatic video advancement
              </p>
            </div>
          </div>
        </div>

        {/* SEO Content Section */}
        <div className="mt-16 max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 text-center">
            About LinusPlaylists
          </h2>
          <div className="text-gray-600 dark:text-gray-400 space-y-4 text-sm sm:text-base">
            <p>
              <strong className="text-gray-800 dark:text-white">LinusPlaylists</strong> (also known as Linus Playlists) is your premier destination for free football highlights, music streaming, and entertainment videos. Whether you're searching for <strong>linusplaylists.com</strong>, <strong>linus playlists</strong>, or <strong>Linus Playlists</strong>, you've found the right place for all your entertainment needs.
            </p>
            <p>
              Watch the latest <strong>football match highlights</strong> from top leagues including Premier League, La Liga, Serie A, Bundesliga, and more. Stream curated <strong>music playlists</strong> featuring Hindi songs, Tamil music, Telugu songs, Bollywood hits, and English tracks. Enjoy <strong>fun entertainment videos</strong> including comedy skits, short films, and viral content.
            </p>
            <p>
              <strong>LinusPlaylists.com</strong> offers seamless playback, automatic video advancement, and a user-friendly interface across all devices. Create custom playlists, save your favorites, and enjoy uninterrupted entertainment streaming. Join thousands of users who trust LinusPlaylists for their daily dose of football action and music entertainment.
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
