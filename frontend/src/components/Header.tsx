'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { Trophy, Music, Home, Sparkles, Disc3, User, LogOut, Settings, Smile, Mail, ChevronDown } from 'lucide-react';
import AuthModal from './AuthModal';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSportsMenu, setShowSportsMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const sportsMenuRef = useRef<HTMLDivElement>(null);
  
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

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (sportsMenuRef.current && !sportsMenuRef.current.contains(event.target as Node)) {
        setShowSportsMenu(false);
      }
    };

    if (showUserMenu || showSportsMenu) {
      document.addEventListener('mousedown', handleClickOutside as EventListener);
      document.addEventListener('touchstart', handleClickOutside as EventListener);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside as EventListener);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
    };
  }, [showUserMenu, showSportsMenu]);

  return (
    <header 
      className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-lg border-b border-gray-700 sticky top-0 z-[100] pointer-events-auto"
      style={{
        paddingTop: `var(--safe-area-inset-top)`,
      }}
    >
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-4" style={{
        paddingLeft: `calc(0.75rem + var(--safe-area-inset-left))`,
        paddingRight: `calc(0.75rem + var(--safe-area-inset-right))`,
      }}>
        {/* Top row - Logo and Auth */}
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-0">
          {/* Logo / Home */}
          <Link href="/" className="group flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-all pointer-events-auto min-w-0 p-2 -m-2 sm:p-0 sm:m-0">
            <div className="relative">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-purple-500/30 transition-shadow flex-shrink-0">
                <Home className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse pointer-events-none" />
            </div>
            <span className="text-lg sm:text-2xl font-[family-name:var(--font-playfair)] italic bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-bold hidden sm:block">
              LinusPlaylists
            </span>
          </Link>
          
          {/* User Auth - stays on top row */}
          <div className="flex items-center gap-1 sm:gap-4 pointer-events-auto p-2 -m-2 sm:p-0 sm:m-0">
            {status === 'loading' ? (
              <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse"></div>
            ) : session ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2 bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-600 hover:border-blue-500/50 rounded-xl transition-all text-xs sm:text-sm"
                >
                  {session.user?.image ? (
                    <img 
                      src={session.user.image} 
                      alt={session.user?.name || 'User'}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  )}
                  <span className="font-medium hidden sm:inline truncate">{session.user?.name || session.user?.email}</span>
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
              <div className="flex items-center gap-1 sm:gap-3">
                <button
                  onClick={() => handleAuthClick('signin')}
                  className="px-3 sm:px-4 py-2 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg text-xs sm:text-sm"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleAuthClick('signup')}
                  className="px-3 sm:px-4 py-2 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg text-xs sm:text-sm"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Navigation Links - Compact design with dropdown for sports */}
        <nav className="flex items-center gap-2 sm:gap-3 justify-center flex-wrap pointer-events-auto">
          {/* Sports Dropdown Menu */}
          <div className="relative" ref={sportsMenuRef}>
            <button
              onClick={() => setShowSportsMenu(!showSportsMenu)}
              className={`group relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl transition-all duration-300 font-medium cursor-pointer pointer-events-auto text-xs sm:text-sm ${
                showSportsMenu || ['football', 'nfl', 'mlb', 'fifa', 'ipl', 'nba', 'tennis', 'nhl', 'pga', 'ufc'].some(sport => isActive(`/${sport}`))
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white shadow-xl shadow-purple-500/40'
                  : 'bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-600 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20'
              }`}
              title="All Sports"
            >
              <Trophy className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${showSportsMenu ? 'scale-110' : ''}`} />
              <span className="font-bold tracking-wide hidden sm:inline">Sports</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showSportsMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showSportsMenu && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="grid grid-cols-2 gap-1 p-2">
                  {[
                    { name: 'Football', path: '/football', color: 'blue' },
                    { name: 'NFL', path: '/nfl', color: 'red' },
                    { name: 'MLB', path: '/mlb', color: 'green' },
                    { name: 'FIFA', path: '/fifa', color: 'amber' },
                    { name: 'IPL', path: '/ipl', color: 'indigo' },
                    { name: 'NBA', path: '/nba', color: 'orange' },
                    { name: 'Tennis', path: '/tennis', color: 'green' },
                    { name: 'NHL', path: '/nhl', color: 'cyan' },
                    { name: 'PGA', path: '/pga', color: 'amber' },
                    { name: 'UFC', path: '/ufc', color: 'red' },
                  ].map((sport) => (
                    <Link
                      key={sport.path}
                      href={sport.path}
                      onClick={() => setShowSportsMenu(false)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-center ${
                        isActive(sport.path)
                          ? `bg-${sport.color}-600 text-white`
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {sport.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <Link
            href="/music"
            className={`group relative flex flex-col sm:flex-row items-center gap-1 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 rounded-2xl transition-all duration-300 font-medium cursor-pointer pointer-events-auto text-xs sm:text-sm flex-shrink-0 sm:flex-shrink ${
              isActive('/music')
                ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 text-white shadow-xl shadow-purple-500/40'
                : 'bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-600 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20'
            }`}
            title="Music Playlist"
          >
            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all pointer-events-none flex-shrink-0 ${
              isActive('/music')
                ? 'bg-white/20'
                : 'bg-purple-500/20 group-hover:bg-purple-500/30'
            }`}>
              <Disc3 className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${
                isActive('/music') ? 'text-pink-200 animate-spin' : 'text-purple-400 group-hover:animate-spin'
              }`} style={{ animationDuration: '3s' }} />
            </div>
            <span className="font-bold tracking-wide text-center sm:text-left">Music</span>
            {isActive('/music') && (
              <span className="absolute top-1 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse pointer-events-none"></span>
            )}
          </Link>
          
          <Link
            href="/tamil-movies"
            className={`group relative flex flex-col sm:flex-row items-center gap-1 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 rounded-2xl transition-all duration-300 font-medium cursor-pointer pointer-events-auto text-xs sm:text-sm flex-shrink-0 sm:flex-shrink ${
              isActive('/tamil-movies')
                ? 'bg-gradient-to-r from-orange-600 via-red-500 to-pink-500 text-white shadow-xl shadow-orange-500/40'
                : 'bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-600 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/20'
            }`}
            title="Tamil Movie Soundtracks"
          >
            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all pointer-events-none flex-shrink-0 ${
              isActive('/tamil-movies')
                ? 'bg-white/20'
                : 'bg-orange-500/20 group-hover:bg-orange-500/30'
            }`}>
              <Music className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${
                isActive('/tamil-movies') ? 'text-orange-200' : 'text-orange-400 group-hover:scale-110'
              }`} />
            </div>
            <span className="font-bold tracking-wide text-center sm:text-left">Tamil</span>
            {isActive('/tamil-movies') && (
              <span className="absolute top-1 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse pointer-events-none"></span>
            )}
          </Link>
          
          <Link
            href="/fun"
            className={`group relative flex flex-col sm:flex-row items-center gap-1 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 rounded-2xl transition-all duration-300 font-medium cursor-pointer pointer-events-auto text-xs sm:text-sm flex-shrink-0 sm:flex-shrink ${
              isActive('/fun')
                ? 'bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 text-white shadow-xl shadow-green-500/40'
                : 'bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-600 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/20'
            }`}
            title="Fun Entertainment"
          >
            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all pointer-events-none flex-shrink-0 ${
              isActive('/fun')
                ? 'bg-white/20'
                : 'bg-green-500/20 group-hover:bg-green-500/30'
            }`}>
              <Smile className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-110 ${
                isActive('/fun') ? 'text-yellow-300' : 'text-green-400'
              }`} />
            </div>
            <span className="font-bold tracking-wide text-center sm:text-left">Fun</span>
            {isActive('/fun') && (
              <span className="absolute top-1 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse pointer-events-none"></span>
            )}
          </Link>

          <Link
            href="/contact"
            className={`group relative flex flex-col sm:flex-row items-center gap-1 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 rounded-2xl transition-all duration-300 font-medium cursor-pointer pointer-events-auto text-xs sm:text-sm flex-shrink-0 sm:flex-shrink ${
              isActive('/contact')
                ? 'bg-gradient-to-r from-orange-600 via-red-500 to-pink-500 text-white shadow-xl shadow-orange-500/40'
                : 'bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-600 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/20'
            }`}
            title="Contact Us"
          >
            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all pointer-events-none flex-shrink-0 ${
              isActive('/contact')
                ? 'bg-white/20'
                : 'bg-orange-500/20 group-hover:bg-orange-500/30'
            }`}>
              <Mail className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-110 ${
                isActive('/contact') ? 'text-yellow-300' : 'text-orange-400'
              }`} />
            </div>
            <span className="font-bold tracking-wide text-center sm:text-left">Contact</span>
            {isActive('/contact') && (
              <span className="absolute top-1 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse pointer-events-none"></span>
            )}
          </Link>
        </nav>
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
