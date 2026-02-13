'use client';

import { useState, useEffect } from 'react';
import { X, Music, Search } from 'lucide-react';
import type { Song } from '@/lib/api';
import AddToPlaylistDropdown from './AddToPlaylistDropdown';

interface AddFromLinusPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  songs: Song[];
}

export default function AddFromLinusPlaylistModal({ isOpen, onClose, songs }: AddFromLinusPlaylistModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = songs.filter(song =>
        song.title.toLowerCase().includes(query) ||
        song.composer.toLowerCase().includes(query) ||
        (song.movie && song.movie !== '-' && song.movie.toLowerCase().includes(query))
      );
      setFilteredSongs(filtered);
    } else {
      setFilteredSongs(songs);
    }
  }, [searchQuery, songs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full border border-gray-700 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Linus Playlist</h2>
              <p className="text-sm text-gray-400">{filteredSongs.length} songs available</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search songs, composers, movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Song List */}
        <div className="flex-1 overflow-y-auto">
          {filteredSongs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No songs found matching your search</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredSongs.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-gray-800/50 transition-colors group"
                >
                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate group-hover:text-purple-400 transition-colors">
                      {song.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-gray-400 truncate">
                        {song.composer}
                      </p>
                      {song.movie && song.movie !== '-' && (
                        <>
                          <span className="text-gray-600">•</span>
                          <p className="text-sm text-gray-400 truncate">{song.movie}</p>
                        </>
                      )}
                      {song.year && song.year !== '-' && (
                        <>
                          <span className="text-gray-600">•</span>
                          <p className="text-sm text-gray-400">{song.year}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Add to Playlist */}
                  <div className="flex-shrink-0">
                    <AddToPlaylistDropdown song={song} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
