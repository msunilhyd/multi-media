'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import type { Song } from '@/lib/api';

interface UserPlaylist {
  id: number;
  title: string;
  song_count: number;
}

interface AddToPlaylistDropdownProps {
  song: Song;
  className?: string;
}

export default function AddToPlaylistDropdown({ song, className = '' }: AddToPlaylistDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<UserPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addedToPlaylists, setAddedToPlaylists] = useState<Set<number>>(new Set());
  const { data: session } = useSession();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUserPlaylists = async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/playlists`, {
        headers: {
          'X-User-Email': session.user?.email || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserPlaylists(data);
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchUserPlaylists();
    }
  }, [isOpen, session]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddToPlaylist = async (playlistId: number) => {
    if (!session) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': session.user?.email || '',
        },
        body: JSON.stringify({
          song_id: song.id,
        }),
      });

      if (response.ok) {
        setAddedToPlaylists(prev => new Set([...prev, playlistId]));
        // Update the playlist song count
        setUserPlaylists(prev => prev.map(playlist => 
          playlist.id === playlistId 
            ? { ...playlist, song_count: playlist.song_count + 1 }
            : playlist
        ));
      } else if (response.status === 400) {
        // Song already in playlist
        setAddedToPlaylists(prev => new Set([...prev, playlistId]));
      }
    } catch (error) {
      console.error('Error adding song to playlist:', error);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 text-gray-400 hover:text-purple-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        title="Add to playlist"
      >
        <Plus className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 w-64">
          <div className="p-2 border-b border-gray-200 dark:border-gray-600">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Add to playlist</h4>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 text-center">
                <div className="h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : userPlaylists.length === 0 ? (
              <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                No playlists found. Create one first!
              </div>
            ) : (
              <div className="py-1">
                {userPlaylists.map((playlist) => {
                  const isAdded = addedToPlaylists.has(playlist.id);
                  return (
                    <button
                      key={playlist.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isAdded) {
                          handleAddToPlaylist(playlist.id);
                        }
                      }}
                      disabled={isAdded}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                        isAdded ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <div>
                        <div className="font-medium truncate">{playlist.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {playlist.song_count} {playlist.song_count === 1 ? 'song' : 'songs'}
                        </div>
                      </div>
                      {isAdded && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}