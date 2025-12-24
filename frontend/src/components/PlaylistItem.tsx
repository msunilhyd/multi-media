'use client';

import { Play, Pause } from 'lucide-react';
import type { Song } from '@/lib/api';

interface PlaylistItemProps {
  song: Song;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onSelect: () => void;
}

export default function PlaylistItem({
  song,
  index,
  isActive,
  isPlaying,
  onSelect,
}: PlaylistItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 ${
        isActive
          ? 'bg-purple-50 dark:bg-purple-900/30'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
    >
      {/* Index / Play Icon */}
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
        {isActive ? (
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white ml-0.5" />
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-sm font-medium">{index + 1}</span>
        )}
      </div>
      
      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-medium truncate ${
          isActive ? 'text-purple-700 dark:text-purple-400' : 'text-gray-800 dark:text-gray-200'
        }`}>
          {song.title}
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {song.composer}
        </p>
      </div>
      
      {/* Language Badge */}
      <div className="flex-shrink-0">
        <span className={`text-xs px-2 py-1 rounded ${
          isActive
            ? 'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
        }`}>
          {song.language}
        </span>
      </div>
    </div>
  );
}
