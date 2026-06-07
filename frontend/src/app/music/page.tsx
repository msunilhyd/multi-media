'use client';

import { useEffect, useState } from 'react';
import { Music } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';
import MusicPlaylist from '@/components/MusicPlaylist';
import UserPlaylists from '@/components/UserPlaylists';
import Toast from '@/components/Toast';
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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

        // Load songs without shuffling - shuffle only when user clicks shuffle button
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

  const handleSongSubmitted = async (songName: string, playlistName: string) => {
    console.log(`🎉 [handleSongSubmitted] Song "${songName}" added to "${playlistName}"`);
    // Show toast message
    setToastMessage(`✅ "${songName}" added to ${playlistName}`);
    
    // Refresh the playlist
    console.log('🔄 [handleSongSubmitted] Refreshing playlist...');
    await handleRefreshDefaultPlaylist();
  };

  const handleSongSubmittedUserPlaylist = async (songName: string, playlistName: string) => {
    console.log(`🎉 [handleSongSubmittedUserPlaylist] Song "${songName}" added to "${playlistName}"`);
    // Show toast message
    setToastMessage(`✅ "${songName}" added to ${playlistName}`);
    
    // Refresh the selected playlist
    console.log('🔄 [handleSongSubmittedUserPlaylist] Refreshing user playlist...');
    await handleRefreshSelectedPlaylist();
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
          <div className="text-center max-w-2xl mx-auto px-4">
            <Music className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Music Player Temporarily Unavailable
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We're having trouble loading the music playlist right now. Please try again in a few moments.
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-red-700 dark:text-red-400 font-mono">{error}</p>
            </div>
            <div className="bg-gray-200 dark:bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-3">
                Available Music Features:
              </h3>
              <ul className="text-left text-gray-600 dark:text-gray-400 space-y-2">
                <li>• Stream over 1000+ curated songs</li>
                <li>• Bollywood, Tamil, Telugu, Hindi, and English music</li>
                <li>• Songs from top composers: A.R. Rahman, Pritam, Anirudh, Yuvan Shankar Raja</li>
                <li>• Create and save custom playlists</li>
                <li>• Discover new music from various movies and albums</li>
              </ul>
            </div>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                // Re-trigger the loadSongs effect by unmounting via key trick is not available here,
                // so we call the load function directly
                const loadSongs = async () => {
                  try {
                    const allSongs: Song[] = [];
                    let offset = 0;
                    const limit = 2000;
                    let hasMoreSongs = true;
                    while (hasMoreSongs) {
                      const data = await fetchSongs(undefined, undefined, undefined, undefined, limit, offset);
                      allSongs.push(...data);
                      hasMoreSongs = data.length === limit;
                      offset += limit;
                    }
                    setSongs(allSongs);
                    setError(null);
                  } catch (err: any) {
                    console.error('Error loading songs:', err);
                    setError(err?.message || 'Failed to load songs. Please try again later.');
                  } finally {
                    setLoading(false);
                  }
                };
                loadSongs();
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Try Again
            </button>
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
            onSongSubmitted={handleSongSubmitted}
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
              onSongSubmitted={handleSongSubmittedUserPlaylist}
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
        {/* SEO Content - Always Visible */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4">
            Music Playlists
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-4">
            Stream curated music playlists featuring Bollywood hits, Tamil songs, Telugu music, and international tracks. 
            Discover songs from legendary composers like A.R. Rahman, Pritam, Anirudh Ravichander, Yuvan Shankar Raja, and more.
          </p>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-500">
            Free music streaming • Create custom playlists • Discover new songs • Available on web and mobile
          </p>
        </div>

        {/* Feature Highlight Banner */}
        {session?.user && (
          <div className="mb-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 sm:p-6 text-white shadow-lg">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Music className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base sm:text-lg mb-1">Add Your Own Songs from YouTube! 🎵</h3>
                <p className="text-sm sm:text-base text-white/90">
                  Click the <span className="font-semibold">"+ Add"</span> button in any playlist to submit your favorite YouTube songs. 
                  Build your personalized music collection!
                </p>
              </div>
            </div>
          </div>
        )}

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

      {/* Toast Notification */}
      {toastMessage && (
        <Toast 
          message={toastMessage}
          duration={3000}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
