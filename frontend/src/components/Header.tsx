'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Music, Home, Sparkles, Disc3 } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  return (
    <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-lg border-b border-gray-700 sticky top-0 z-[100] pointer-events-auto">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Logo / Home */}
          <Link href="/" className="group flex items-center gap-3 hover:opacity-90 transition-all pointer-events-auto">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-purple-500/30 transition-shadow">
                <Home className="w-5 h-5 text-white" />
              </div>
              <Sparkles className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse pointer-events-none" />
            </div>
            <span className="text-2xl font-[family-name:var(--font-playfair)] italic bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-bold">
              LinusPlaylists
            </span>
          </Link>
          
          {/* Navigation Links */}
          <nav className="flex items-center gap-4 pointer-events-auto">
            <Link
              href="/football"
              className={`group relative flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300 font-medium cursor-pointer pointer-events-auto ${
                isActive('/football')
                  ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-xl shadow-blue-500/40 scale-105'
                  : 'bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-600 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all pointer-events-none ${
                isActive('/football')
                  ? 'bg-white/20'
                  : 'bg-blue-500/20 group-hover:bg-blue-500/30'
              }`}>
                <Trophy className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                  isActive('/football') ? 'text-yellow-300' : 'text-blue-400'
                }`} />
              </div>
              <div className="flex flex-col items-start pointer-events-none">
                <span className="text-sm font-bold tracking-wide">Football</span>
                <span className={`text-xs ${isActive('/football') ? 'text-blue-100' : 'text-gray-400'}`}>Highlights</span>
              </div>
              {isActive('/football') && (
                <span className="absolute top-1 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse pointer-events-none"></span>
              )}
            </Link>
            
            <Link
              href="/music"
              className={`group relative flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300 font-medium cursor-pointer pointer-events-auto ${
                isActive('/music')
                  ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 text-white shadow-xl shadow-purple-500/40 scale-105'
                  : 'bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-600 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all pointer-events-none ${
                isActive('/music')
                  ? 'bg-white/20'
                  : 'bg-purple-500/20 group-hover:bg-purple-500/30'
              }`}>
                <Disc3 className={`w-5 h-5 transition-transform ${
                  isActive('/music') ? 'text-pink-200 animate-spin' : 'text-purple-400 group-hover:animate-spin'
                }`} style={{ animationDuration: '3s' }} />
              </div>
              <div className="flex flex-col items-start pointer-events-none">
                <span className="text-sm font-bold tracking-wide">Music</span>
                <span className={`text-xs ${isActive('/music') ? 'text-purple-100' : 'text-gray-400'}`}>Playlist</span>
              </div>
              {isActive('/music') && (
                <span className="absolute top-1 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse pointer-events-none"></span>
              )}
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
