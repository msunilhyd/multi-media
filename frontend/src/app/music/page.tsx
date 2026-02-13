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
  playlist_type: string;
  created_at: string;
  updated_at: string;
  song_count: number;
  songs?: Song[];
}

// Shuffle array using Fisher-Yates algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

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

        // Shuffle songs on first load
        const shuffledSongs = shuffleArray(allSongs);
        setSongs(shuffledSongs);
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
    if (!session) return;
    
    try {
      // Fetch the full playlist with songs
      console.log(`📋 [handleSelectUserPlaylist] Loading playlist: ${playlist.title} (ID: ${playlist.id})`);
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any).accessToken || ''}`,
        },
      });
      if (response.ok) {
        const fullPlaylist = await response.json();
        console.log(`✅ [handlePlaylistSongFetched] Refreshed playlist with ${fullPlaylist.songs?.length || 0} songs`);
        setSelectedUserPlaylist(fullPlaylist);
        setActiveTab('user-playlist');
      }
    } catch (error) {
      console.error('Error loading playlist:', error);
    }
  };

  const handleRefreshDefaultPlaylist = async () => {
    console.log('🔄 [handleRefreshDefaultPlaylist] Starting playlist refresh...');
    if (!session?.user) {
      console.warn('⚠️ [handleRefreshDefaultPlaylist] No session user, skipping refresh');
      return;
    }
    try {
      // Fetch the user's default music playlist
      console.log('📡 [handleRefreshDefaultPlaylist] Fetching playlists list...');
      const response = await fetch('/api/playlists?playlist_type=music', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any).accessToken || ''}`,
        },
      });
      if (response.ok) {
        const playlists = await response.json();
        console.log('✅ [handleRefreshDefaultPlaylist] Fetched playlists:', playlists);
        const musicPlaylist = playlists.find((p: UserPlaylist) => p.playlist_type === 'music');
        if (musicPlaylist) {
          console.log('✅ [handleRefreshDefaultPlaylist] Found music playlist:', musicPlaylist);
          // Fetch full playlist with songs
          console.log(`📡 [handleRefreshDefaultPlaylist] Fetching full playlist (ID: ${musicPlaylist.id})...`);
          const playlistResponse = await fetch(`/api/playlists/${musicPlaylist.id}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(session as any).accessToken || ''}`,
            },
          });
          if (playlistResponse.ok) {
            const fullPlaylist = await playlistResponse.json();
            console.log('✅ [handleRefreshDefaultPlaylist] Fetched full playlist:', fullPlaylist);
            console.log('📊 [handleRefreshDefaultPlaylist] Total songs in playlist:', fullPlaylist.songs?.length);
            const newSongs = fullPlaylist.songs || [];
            if (newSongs.length > 0) {
              newSongs.forEach((song: Song, idx: number) => {
                console.log(`  Song ${idx + 1}: ${song.title} (ID: ${song.id}, VideoID: ${song.videoId})`);
              });
              // Get the newly added song (should be at the end)
              const newSong = newSongs[newSongs.length - 1];
              console.log('⭐ [handleRefreshDefaultPlaylist] Last song in playlist:', newSong);
              // Add the new song to the beginning of the current Linus Playlist
              setSongs(prevSongs => {
                // Check if song already exists to avoid duplicates
                if (prevSongs.some(s => s.id === newSong.id)) {
                  console.log('⚠️ [handleRefreshDefaultPlaylist] Song already in display, skipping');
                  return prevSongs;
                }
                console.log('➕ [handleRefreshDefaultPlaylist] Adding new song to display');
                const updatedSongs = [newSong, ...prevSongs];
                console.log('📝 [handleRefreshDefaultPlaylist] Updated songs count:', updatedSongs.length);
                return updatedSongs;
              });
            } else {
              console.warn('⚠️ [handleRefreshDefaultPlaylist] Playlist is empty');
            }
          } else {
            console.error('❌ [handleRefreshDefaultPlaylist] Failed to fetch full playlist:', playlistResponse.status);
          }
        } else {
          console.warn('⚠️ [handleRefreshDefaultPlaylist] No music playlist found');
        }
      } else {
        console.error('❌ [handleRefreshDefaultPlaylist] Failed to fetch playlists:', response.status);
      }
    } catch (error) {
      console.error('❌ [handleRefreshDefaultPlaylist] Error refreshing playlist:', error);
    }
  };

  const handleRefreshSelectedPlaylist = async () => {
    console.log('🔄 [handleRefreshSelectedPlaylist] Starting selected playlist refresh...');
    if (!selectedUserPlaylist) {
      console.warn('⚠️ [handleRefreshSelectedPlaylist] No selected playlist');
      return;
    }
    try {
      // Fetch the updated playlist
      console.log(`📡 [handleRefreshSelectedPlaylist] Fetching playlist (ID: ${selectedUserPlaylist.id}) with auth headers...`);
      const response = await fetch(`/api/playlists/${selectedUserPlaylist.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any).accessToken || ''}`,
        },
      });
      if (response.ok) {
        const fullPlaylist = await response.json();
        console.log('✅ [handleRefreshSelectedPlaylist] Fetched updated playlist:', fullPlaylist);
        console.log('📊 [handleRefreshSelectedPlaylist] Songs in playlist:', fullPlaylist.songs?.length);
        console.log('🎵 [handleRefreshSelectedPlaylist] Songs:', fullPlaylist.songs?.map((s: any) => `${s.title} (${s.videoId})`) || 'none');
        setSelectedUserPlaylist(fullPlaylist);
        console.log('✨ [handleRefreshSelectedPlaylist] Playlist state updated - UI should refresh with new songs');
      } else {
        console.error('❌ [handleRefreshSelectedPlaylist] Failed to fetch playlist:', response.status);
      }
    } catch (error) {
      console.error('❌ [handleRefreshSelectedPlaylist] Error refreshing user playlist:', error);
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
              title: 'Linus Playlist',
              songs: songs
            }}
            onSongSubmitted={handleRefreshDefaultPlaylist}
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
              onSongSubmitted={handleRefreshSelectedPlaylist}
              userPlaylistId={selectedUserPlaylist.id}
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
      
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
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
