'use client';

import { useEffect, useState } from 'react';
import { Music } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';
import MusicPlaylist from '@/components/MusicPlaylist';
import UserPlaylists from '@/components/UserPlaylists';
import { fetchSongs } from '@/lib/api';
import type { Song } from '@/lib/api';

type Tab = 'default' | 'user-playlists' | 'user-playlist';

interface UserPlaylist {
  id: number;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  song_count: number;
  songs?: Song[];
}

export default function MusicPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('default');
  const [selectedUserPlaylist, setSelectedUserPlaylist] = useState<UserPlaylist | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    const loadSongs = async () => {
      try {
        setLoading(true);
        // Load all songs by making multiple requests
        const allSongs: Song[] = [];
        let offset = 0;
        const limit = 2000; // Updated API maximum
        let hasMoreSongs = true;

        while (hasMoreSongs) {
          const data = await fetchSongs(undefined, undefined, undefined, undefined, limit, offset);
          allSongs.push(...data);
          
          // If we get fewer songs than the limit, we've reached the end
          hasMoreSongs = data.length === limit;
          offset += limit;
        }

        setSongs(allSongs);
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

  const handleSelectUserPlaylist = async (playlist: UserPlaylist) => {
    if (!(session as any)?.accessToken) return;
    
    try {
      // Fetch the full playlist with songs
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        headers: {
          'Authorization': `Bearer ${(session as any).accessToken}`,
        },
      });
      if (response.ok) {
        const fullPlaylist = await response.json();
        setSelectedUserPlaylist(fullPlaylist);
        setActiveTab('user-playlist');
      }
    } catch (error) {
      console.error('Error loading playlist:', error);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Music className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600 dark:text-gray-400">Loading songs...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'default':
        return (
          <MusicPlaylist 
            playlist={{
              slug: 'default',
              title: 'My Music Collection',
              songs: songs
            }} 
          />
        );
      
      case 'user-playlists':
        return <UserPlaylists onSelectPlaylist={handleSelectUserPlaylist} />;
      
      case 'user-playlist':
        if (!selectedUserPlaylist) {
          setActiveTab('user-playlists');
          return null;
        }
        return (
          <div>
            <button
              onClick={() => setActiveTab('user-playlists')}
              className="mb-6 text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-2"
            >
              ← Back to My Playlists
            </button>
            <MusicPlaylist 
              playlist={{
                slug: `user-playlist-${selectedUserPlaylist.id}`,
                title: selectedUserPlaylist.title,
                songs: selectedUserPlaylist.songs || []
              }} 
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('default')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'default'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                All Songs ({songs.length})
              </button>
              <button
                onClick={() => setActiveTab('user-playlists')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'user-playlists' || activeTab === 'user-playlist'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                My Playlists
              </button>
            </nav>
          </div>
        </div>

        {renderContent()}
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
