'use client';

import { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  song: {
    title: string;
    composer: string;
    audioUrl: string;
    artwork?: string;
  };
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function AudioPlayer({
  song,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Sync audio playback with player state
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play().catch(err => console.error('Play error:', err));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Load new song
  useEffect(() => {
    if (!audioRef.current) return;
    
    audioRef.current.src = song.audioUrl;
    audioRef.current.load();
    
    if (isPlaying) {
      audioRef.current.play().catch(err => console.error('Play error:', err));
    }
  }, [song.audioUrl]);

  // Setup MediaSession API for lock screen controls
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.composer,
        artwork: song.artwork ? [
          { src: song.artwork, sizes: '256x256', type: 'image/jpeg' }
        ] : undefined,
      });

      navigator.mediaSession.setActionHandler('play', () => {
        if (!isPlaying) onPlayPause();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (isPlaying) onPlayPause();
      });

      navigator.mediaSession.setActionHandler('nexttrack', onNext);
      navigator.mediaSession.setActionHandler('previoustrack', onPrevious);

      // Update playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      
      console.log('✅ MediaSession API configured for lock screen controls');
    } catch (error) {
      console.warn('⚠️ MediaSession not fully supported:', error);
    }
  }, [song.title, song.composer, song.artwork, isPlaying, onPlayPause, onNext, onPrevious]);

  // Keep screen awake during playback (Wake Lock API)
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      if (isPlaying && 'wakeLock' in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('🔒 Screen wake lock active');
        } catch (err) {
          console.warn('Wake lock unavailable:', err);
        }
      }
    };

    if (isPlaying) {
      requestWakeLock();
    }

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    onNext();
  };

  const formatTime = (time: number) => {
    if (!time) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-4 shadow-lg">
      {/* Hidden audio element - handles background playback */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        style={{ display: 'none' }}
      />

      {/* Song Info */}
      <div className="mb-4">
        <h3 className="text-white font-bold text-lg truncate">{song.title}</h3>
        <p className="text-purple-300 text-sm truncate">{song.composer}</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={(e) => {
            if (audioRef.current) {
              audioRef.current.currentTime = Number(e.target.value);
            }
          }}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-300 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Previous */}
        <button
          onClick={onPrevious}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
          title="Previous"
        >
          <SkipBack size={20} />
        </button>

        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition text-white shadow-lg"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
        </button>

        {/* Next */}
        <button
          onClick={onNext}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
          title="Next"
        >
          <SkipForward size={20} />
        </button>

        {/* Volume */}
        <div className="ml-auto flex items-center gap-2">
          <Volume2 size={16} className="text-gray-400" />
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="70"
            onChange={(e) => {
              if (audioRef.current) {
                audioRef.current.volume = Number(e.target.value) / 100;
              }
            }}
            className="w-24"
          />
        </div>
      </div>

      {/* Status Badge */}
      <div className="mt-3 flex items-center gap-2 text-xs text-green-300 bg-green-500/10 px-3 py-1 rounded-full w-fit">
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
        <span>Background audio & lock screen controls enabled</span>
      </div>
    </div>
  );
}
