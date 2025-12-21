'use client';

import Link from 'next/link';
import { Trophy, Music, Play, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4">
            Welcome to <span className="font-[family-name:var(--font-playfair)] italic bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">LinusPlaylists</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Your one-stop destination for football highlights and music playlists
          </p>
        </div>
        
        {/* Cards Section */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
      </main>
      
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            LinusPlaylists • Football Highlights & Music Playlists
          </p>
        </div>
      </footer>
    </div>
  );
}
