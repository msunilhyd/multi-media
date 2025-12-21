'use client';

import { Music } from 'lucide-react';
import Header from '@/components/Header';
import MusicPlaylist from '@/components/MusicPlaylist';
import { playlistKi } from '@/data/playlists';

export default function MusicPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <MusicPlaylist playlist={playlistKi} />
      </main>
      
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            Music Playlist Player • Powered by YouTube
          </p>
        </div>
      </footer>
    </div>
  );
}
