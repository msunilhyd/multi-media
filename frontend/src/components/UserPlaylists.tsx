'use client';

import { useState, useEffect } from 'react';
import { Music, Plus, Trash2, Calendar, Lock, Globe } from 'lucide-react';
import { useSession } from 'next-auth/react';
import CreatePlaylistModal from './CreatePlaylistModal';

interface UserPlaylist {
  id: number;
  title: string;
  description: string | null;
  is_public: boolean;
  playlist_type: string;
  created_at: string;
  updated_at: string;
  song_count: number;
}

interface UserPlaylistsProps {
  onSelectPlaylist: (playlist: UserPlaylist) => void;
  playlistType?: 'music' | 'entertainment';
}

export default function UserPlaylists({ onSelectPlaylist, playlistType = 'music' }: UserPlaylistsProps) {
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: session } = useSession();

  const fetchPlaylists = async () => {
    if (!session) return;

    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/playlists`);
      if (playlistType) {
        url.searchParams.append('playlist_type', playlistType);
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlaylists(data);
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPlaylists();
  }, [session]);

  const handleDeletePlaylist = async (playlistId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this playlist?')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`,
        },
      });

      if (response.ok) {
        setPlaylists(playlists.filter(p => p.id !== playlistId));
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!session) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-8 text-center">
        <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Sign In to Create Playlists</h3>
        <p className="text-gray-400">Create your own custom playlists by signing in to your account.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-900 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">My Playlists</h2>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New Playlist
          </button>
        </div>

        <div className="p-6">
          {playlists.length === 0 ? (
            <div className="text-center py-8">
              <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No playlists yet</h3>
              <p className="text-gray-400 mb-4">Create your first playlist to get started!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium mx-auto"
              >
                <Plus className="h-4 w-4" />
                Create Playlist
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  onClick={() => onSelectPlaylist(playlist)}
                  className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg p-4 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium truncate">{playlist.title}</h3>
                        {playlist.is_public ? (
                          <span title="Public playlist">
                            <Globe className="h-4 w-4 text-green-400 flex-shrink-0" />
                          </span>
                        ) : (
                          <span title="Private playlist">
                            <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          </span>
                        )}
                      </div>
                      
                      {playlist.description && (
                        <p className="text-gray-400 text-sm mb-2 line-clamp-2">{playlist.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{playlist.song_count} {playlist.song_count === 1 ? 'song' : 'songs'}</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Created {formatDate(playlist.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => handleDeletePlaylist(playlist.id, e)}
                      className="ml-4 p-2 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete playlist"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        playlistType={playlistType}
        onPlaylistCreated={(newPlaylist) => {
          setPlaylists([newPlaylist, ...playlists]);
        }}
      />
    </>
  );
}