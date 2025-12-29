'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { Trophy, Music, Home, Sparkles, Disc3, User, LogOut, Settings, Smile } from 'lucide-react';
import AuthModal from './AuthModal';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  const handleAuthClick = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleSwitchAuthMode = () => {
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
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
            
            <Link
              href="/fun"
              className={`group relative flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300 font-medium cursor-pointer pointer-events-auto ${
                isActive('/fun')
                  ? 'bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 text-white shadow-xl shadow-green-500/40 scale-105'
                  : 'bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-600 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/20'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all pointer-events-none ${
                isActive('/fun')
                  ? 'bg-white/20'
                  : 'bg-green-500/20 group-hover:bg-green-500/30'
              }`}>
                <Smile className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                  isActive('/fun') ? 'text-yellow-300' : 'text-green-400'
                }`} />
              </div>
              <div className="flex flex-col items-start pointer-events-none">
                <span className="text-sm font-bold tracking-wide">Fun</span>
                <span className={`text-xs ${isActive('/fun') ? 'text-green-100' : 'text-gray-400'}`}>Entertainment</span>
              </div>
              {isActive('/fun') && (
                <span className="absolute top-1 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse pointer-events-none"></span>
              )}
            </Link>
            
            {/* User Authentication */}
            <div className="flex items-center gap-4 pointer-events-auto">
              {status === 'loading' ? (
                <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse"></div>
              ) : session ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-600 hover:border-blue-500/50 rounded-xl transition-all"
                  >
                    {session.user?.image ? (
                      <img 
                        src={session.user.image} 
                        alt={session.user?.name || 'User'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <span className="font-medium">{session.user?.name || session.user?.email}</span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 top-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-2 w-48 z-50">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                        {session.user?.image ? (
                          <img 
                            src={session.user.image} 
                            alt={session.user?.name || 'User'}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{session.user?.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session.user?.email}</p>
                        </div>
                      </div>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="w-4 h-4 inline mr-2" />
                        Profile & Settings
                      </Link>
                      <button
                        onClick={async () => {
                          setShowUserMenu(false);
                          await signOut({ redirect: false });
                          router.push('/');
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="w-4 h-4 inline mr-2" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAuthClick('signin')}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors font-medium"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => handleAuthClick('signup')}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onSwitchMode={handleSwitchAuthMode}
      />
    </header>
  );
}
