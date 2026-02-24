import Link from 'next/link';
import { Trophy, Music, Smile, Mail, Home } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 text-white py-8 mt-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
          {/* About Section */}
          <div>
            <h3 className="text-lg font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              LinusPlaylists
            </h3>
            <p className="text-gray-400 text-sm">
              Your destination for football highlights, music playlists, and fun entertainment.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-md font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/" 
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm"
                >
                  <Home className="w-4 h-4" />
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  href="/football" 
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm"
                >
                  <Trophy className="w-4 h-4" />
                  Football Highlights
                </Link>
              </li>
              <li>
                <Link 
                  href="/music" 
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm"
                >
                  <Music className="w-4 h-4" />
                  Music Playlists
                </Link>
              </li>
            </ul>
          </div>

          {/* More Links */}
          <div>
            <h4 className="text-md font-semibold mb-4">Explore</h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/fun" 
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm"
                >
                  <Smile className="w-4 h-4" />
                  Fun Videos
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm"
                >
                  <Mail className="w-4 h-4" />
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-md font-semibold mb-4">Categories</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Premier League</li>
              <li>La Liga</li>
              <li>Serie A</li>
              <li>Bollywood Music</li>
              <li>Tamil Songs</li>
              <li>Comedy Videos</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 pt-6 text-center">
          <p className="text-gray-400 text-sm">
            © {currentYear} LinusPlaylists. All rights reserved.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Football highlights, music streaming, and entertainment videos.
          </p>
        </div>
      </div>
    </footer>
  );
}
