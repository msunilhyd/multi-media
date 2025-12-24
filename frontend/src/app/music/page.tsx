'use client';

import { useEffect, useState } from 'react';
import { Music } from 'lucide-react';
import Header from '@/components/Header';
import MusicPlaylist from '@/components/MusicPlaylist';
import { fetchSongs } from '@/lib/api';
import type { Song } from '@/lib/api';

export default function MusicPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSongs = async () => {
      try {
        setLoading(true);
        const data = await fetchSongs(undefined, undefined, undefined, undefined, 500);
        setSongs(data);
        setError(null);
      } catch (err) {
        console.error('Error loading songs:', err);
        setError('Failed to load songs. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadSongs();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Music className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-gray-600 dark:text-gray-400">Loading songs...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        ) : (
          <MusicPlaylist 
            playlist={{
              slug: 'default',
              title: 'My Music Collection',
              songs: songs
            }} 
          />
        )}
      </main>
      
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            Music Playlist Player • Powered by YouTube • {songs.length} songs
          </p>
        </div>
      </footer>
    </div>
  );
}
