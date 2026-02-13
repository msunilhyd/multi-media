'use client';

import { useState, useEffect } from 'react';
import { Music, X, Loader } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface UserPlaylist {
  id: number;
  title: string;
  description: string | null;
  is_public: boolean;
  song_count: number;
}

interface SelectPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlaylist: (playlistId: number | null, playlistTitle?: string) => void;
  songTitle: string;
}

export default function SelectPlaylistModal({ isOpen, onClose, onSelectPlaylist, songTitle }: SelectPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (isOpen && session) {
      fetchPlaylists();
    }
  }, [isOpen, session]);

  const fetchPlaylists = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/playlists?playlist_type=music');
      if (response.ok) {
        let data = await response.json();
        
        // Sort playlists: Default first, then by name
        data.sort((a: UserPlaylist, b: UserPlaylist) => {
          const aIsDefault = a.title.toLowerCase().includes('default') || a.title.toLowerCase().includes('my music');
          const bIsDefault = b.title.toLowerCase().includes('default') || b.title.toLowerCase().includes('my music');
          
          if (aIsDefault && !bIsDefault) return -1;
          if (!aIsDefault && bIsDefault) return 1;
          return a.title.localeCompare(b.title);
        });
        
        setPlaylists(data);
        console.log(`📋 [SelectPlaylistModal] Loaded ${data.length} playlists`);
        
        // Auto-select first (default) playlist
        if (data.length > 0) {
          setSelectedPlaylistId(data[0].id);
          console.log(`🎯 [SelectPlaylistModal] Auto-selected: ${data[0].title}`);
        }
      } else {
        console.error(`[SelectPlaylistModal] Failed to fetch playlists: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ [SelectPlaylistModal] Error fetching playlists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlaylist = () => {
    if (selectedPlaylistId !== null) {
      const selected = playlists.find(p => p.id === selectedPlaylistId);
      console.log(`✅ [SelectPlaylistModal] Selected playlist: ${selected?.title} (ID: ${selectedPlaylistId})`);
      onSelectPlaylist(selectedPlaylistId, selected?.title);
    } else if (playlists.length === 0) {
      // No playlists - add to default
      console.log('ℹ️ [SelectPlaylistModal] No playlists available, adding to default');
      onSelectPlaylist(null, 'Default Playlist');
    }
    onClose();
  };

  const handleAddToDefault = () => {
    console.log('✅ [SelectPlaylistModal] Adding to default music playlist (no playlist_id sent)');
    onSelectPlaylist(null, 'Default Playlist');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Add to Playlist</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Song Info */}
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <p className="text-xs text-purple-300 font-medium mb-1">Song</p>
            <p className="text-sm text-white font-semibold truncate">{songTitle}</p>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-5 h-5 text-purple-400 animate-spin" />
            </div>
          ) : playlists.length > 0 ? (
            <>
              {/* Playlist List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {playlists.map(playlist => (
                  <button
                    key={playlist.id}
                    onClick={() => setSelectedPlaylistId(playlist.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedPlaylistId === playlist.id
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 bg-gray-800 hover:border-purple-400 hover:bg-gray-750'
                    }`}
                  >
                    <p className="text-white font-medium truncate">{playlist.title}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {playlist.song_count} {playlist.song_count === 1 ? 'song' : 'songs'}
                    </p>
                  </button>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSelectPlaylist}
                  disabled={selectedPlaylistId === null}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Song
                </button>
              </div>
            </>
          ) : (
            <>
              {/* No Playlists */}
              <div className="text-center py-8">
                <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Playlists Yet</h3>
                <p className="text-gray-400 text-sm mb-6">
                  We'll add this song to your default music playlist.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToDefault}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                >
                  Add to Default
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
