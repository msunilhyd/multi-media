'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Shuffle, ArrowUp, Filter, X, Search, Plus } from 'lucide-react';
import type { Song } from '@/lib/api';
import PlaylistItem from './PlaylistItem';
import SubmitSongModal from './SubmitSongModal';
import AddFromLinusPlaylistModal from './AddFromLinusPlaylistModal';
import { useSession } from 'next-auth/react';

interface Playlist {
  slug: string;
  title: string;
  songs: Song[];
}

interface MusicPlaylistProps {
  playlist: Playlist;
  onSongSubmitted?: (songName: string, playlistName: string) => void;
  userPlaylistId?: number; // If provided, this is a user playlist and should add directly
}

// YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          height: string;
          width: string;
          videoId: string;
          playerVars?: Record<string, number | string | undefined>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

// Wake Lock API types
interface WakeLockSentinel extends EventTarget {
  readonly released: boolean;
  readonly type: 'screen';
  release(): Promise<void>;
  addEventListener(type: 'release', listener: (ev: Event) => void): void;
}

interface Navigator {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinel>;
  };
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  loadVideoById: (options: { videoId: string; startSeconds?: number; endSeconds?: number }) => void;
  cueVideoById: (options: { videoId: string; startSeconds?: number; endSeconds?: number }) => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  destroy: () => void;
  getPlayerState: () => number;
  setPlaybackQuality: (quality: string) => void;
  getAvailableQualityLevels: () => string[];
  getCurrentTime: () => number;
  getDuration: () => number;
}

export default function MusicPlaylist({ playlist, onSongSubmitted, userPlaylistId }: MusicPlaylistProps) {
  const { data: session } = useSession();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [composerFilter, setComposerFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showAddFromLinusModal, setShowAddFromLinusModal] = useState(false);
  const [showEmptyPlaylistMessage, setShowEmptyPlaylistMessage] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playlistRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const nextCallTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Helper to normalize language (trim whitespace and uppercase)
  const normalizeLanguage = (lang: string) => lang?.trim().toUpperCase() || '';
  
  // Check if this is entertainment content (fun section)
  const isEntertainmentContent = playlist.slug.includes('funny') || playlist.slug.includes('feel-good') || playlist.slug.includes('party') || playlist.title.toLowerCase().includes('comedy') || playlist.title.toLowerCase().includes('fun');
  
  // Extract unique values for filters (normalized), but skip for entertainment content
  const languages = useMemo(() => 
    isEntertainmentContent ? [] : Array.from(new Set(playlist.songs.map(s => normalizeLanguage(s.language)))).filter(l => l && l !== '-').sort(),
    [playlist.songs, isEntertainmentContent]
  );
  
  const composers = useMemo(() => 
    Array.from(new Set(playlist.songs.map(s => s.composer))).filter(c => c && c !== '-').sort(),
    [playlist.songs]
  );
  
  const years = useMemo(() => 
    Array.from(new Set(playlist.songs.map(s => s.year))).filter((y): y is string => y !== null && y !== undefined && y !== '-').sort((a, b) => b.localeCompare(a)),
    [playlist.songs]
  );
  
  // Filter songs based on selected filters (using normalized language comparison), skip language for entertainment
  const filteredSongs = useMemo(() => {
    return playlist.songs.filter(song => {
      // Search filter - checks title, composer, movie, and language
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          song.title.toLowerCase().includes(query) ||
          song.composer.toLowerCase().includes(query) ||
          (song.movie && song.movie !== '-' && song.movie.toLowerCase().includes(query)) ||
          (song.language && song.language.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      
      // Other filters
      if (!isEntertainmentContent && languageFilter && normalizeLanguage(song.language) !== languageFilter) return false;
      if (composerFilter && song.composer !== composerFilter) return false;
      if (yearFilter && song.year !== yearFilter) return false;
      return true;
    });
  }, [playlist.songs, languageFilter, composerFilter, yearFilter, searchQuery, isEntertainmentContent]);
  
  // Initialize currentSong with the first song from the unfiltered list
  const [currentSong, setCurrentSong] = useState<Song | null>(playlist.songs[0] || null);
  
  const hasActiveFilters = (!isEntertainmentContent && languageFilter) || composerFilter || yearFilter || searchQuery;
  
  const clearFilters = () => {
    setLanguageFilter('');
    setComposerFilter('');
    setYearFilter('');
    setSearchQuery('');
  };
  
  // Use refs to access current state values in callbacks without causing re-renders
  const isShuffleOnRef = useRef(isShuffleOn);
  const currentIndexRef = useRef(currentIndex);
  const filteredSongsRef = useRef(filteredSongs);
  
  // Keep refs in sync with state
  useEffect(() => {
    isShuffleOnRef.current = isShuffleOn;
    currentIndexRef.current = currentIndex;
    filteredSongsRef.current = filteredSongs;
  }, [isShuffleOn, currentIndex, filteredSongs]);
  
  // Set mounted state on client
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  
  // Show empty playlist message when appropriate
  useEffect(() => {
    if (isMounted && session?.user && filteredSongs.length === 0 && !isEntertainmentContent) {
      setShowEmptyPlaylistMessage(true);
      const timer = setTimeout(() => {
        setShowEmptyPlaylistMessage(false);
      }, 8000); // Hide after 8 seconds
      return () => clearTimeout(timer);
    }
  }, [isMounted, session?.user, filteredSongs.length, isEntertainmentContent]);
  
  // Track previous playlist length to detect new songs added
  const prevPlaylistLengthRef = useRef(playlist.songs.length);

  // Detect when the playlist prop changes (new songs added from submission)
  useEffect(() => {
    console.log(`🎵 [MusicPlaylist] Playlist changed - Previous: ${prevPlaylistLengthRef.current}, Current: ${playlist.songs.length}`);
    if (playlist.songs.length > prevPlaylistLengthRef.current) {
      console.log('✨ [MusicPlaylist] New songs detected! Refreshing display...');
      // Trigger a refresh by resetting current song to first in filtered list
      prevPlaylistLengthRef.current = playlist.songs.length;
    }
  }, [playlist.songs.length]);
  
  // Initialize currentSong from filteredSongs on mount
  useEffect(() => {
    // On initial load, sync currentSong with the first filtered song
    if (filteredSongs.length > 0) {
      const firstFilteredSong = filteredSongs[0];
      // Only update if currentSong is different from first filtered song
      if (!currentSong || currentSong.videoId !== firstFilteredSong.videoId) {
        console.log(`🎵 [MusicPlaylist] Setting currentSong to: ${firstFilteredSong.title}`);
        setCurrentSong(firstFilteredSong);
        setCurrentIndex(0);
      }
    }
  }, [filteredSongs]);  // eslint-disable-line react-hooks/exhaustive-deps
  // Removed currentSong from dependencies to avoid infinite loops
  
  // Keep refs in sync with state
  useEffect(() => {
    isShuffleOnRef.current = isShuffleOn;
  }, [isShuffleOn]);
  
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  
  useEffect(() => {
    filteredSongsRef.current = filteredSongs;
  }, [filteredSongs]);
  
  // Reset to first song when filters change
  useEffect(() => {
    if (filteredSongs.length > 0 && currentSong) {
      // Check if current song is still in filtered list
      const currentSongInFiltered = filteredSongs.find(s => s.id === currentSong.id);
      if (!currentSongInFiltered) {
        // Current song not in filtered list, switch to first filtered song
        const firstSong = filteredSongs[0];
        setCurrentIndex(0);
        setCurrentSong(firstSong);
        
        if (playerRef.current && isReady && typeof playerRef.current.loadVideoById === 'function') {
          playerRef.current.loadVideoById({
            videoId: firstSong.videoId,
            startSeconds: firstSong.startSeconds ?? undefined,
            endSeconds: firstSong.endSeconds ?? undefined,
          });
        }
      }
    }
  }, [filteredSongs, currentSong, isReady]);
  
  // Auto-scroll playlist to show current song in center
  useEffect(() => {
    if (playlistRef.current && currentIndex >= 0 && filteredSongs.length > 0) {
      // Small delay to ensure DOM has updated after filtering
      const scrollTimer = setTimeout(() => {
        const playlistContainer = playlistRef.current;
        if (!playlistContainer) return;
        
        const songElements = playlistContainer.children;
        
        // Ensure we have the right number of elements matching filtered songs
        if (songElements.length !== filteredSongs.length) return;
        
        if (songElements[currentIndex] && currentIndex < filteredSongs.length) {
          const songElement = songElements[currentIndex] as HTMLElement;
          const containerHeight = playlistContainer.clientHeight;
          const songHeight = songElement.offsetHeight;
          const songTop = songElement.offsetTop;
          
          // Calculate scroll position to center the song with 3 songs below middle
          // Position the song 3 song heights below the center
          const songCenter = songTop + (songHeight / 2);
          const containerCenter = containerHeight / 2;
          const offsetFromCenter = songHeight * 3; // 3 songs below center
          const scrollPosition = songCenter - containerCenter - offsetFromCenter;
          
          // Smooth scroll to the song
          playlistContainer.scrollTo({
            top: Math.max(0, scrollPosition), // Prevent negative scroll
            behavior: 'smooth'
          });
        }
      }, 100); // Small delay to ensure DOM is ready
      
      return () => clearTimeout(scrollTimer);
    }
  }, [currentIndex, filteredSongs]);

  const handleNext = useCallback((isAutomatic: boolean = false) => {
    const songs = filteredSongsRef.current;
    console.log('HandleNext called - Current songs array:', songs.map(s => s.title));
    console.log('HandleNext called - Current index:', currentIndexRef.current);
    
    if (songs.length === 0) return;
    
    // Only debounce manual clicks, not automatic ENDED events
    if (!isAutomatic) {
      if (nextCallTimeoutRef.current) {
        console.log('Debouncing rapid handleNext call');
        return;
      }
      
      nextCallTimeoutRef.current = setTimeout(() => {
        nextCallTimeoutRef.current = null;
      }, 1000); // Prevent rapid calls within 1 second
    }
    
    const prevIndex = currentIndexRef.current;
    let nextIndex: number;
    
    if (isShuffleOnRef.current) {
      // Get a random index different from current
      do {
        nextIndex = Math.floor(Math.random() * songs.length);
      } while (nextIndex === prevIndex && songs.length > 1);
    } else {
      nextIndex = (prevIndex + 1) % songs.length;
    }
    
    console.log(`Moving from index ${prevIndex} to ${nextIndex}, song: ${songs[nextIndex].title}`);
    
    const nextSong = songs[nextIndex];
    
    setCurrentIndex(nextIndex);
    setCurrentSong(nextSong);
    
    if (playerRef.current && nextSong && typeof playerRef.current.loadVideoById === 'function') {
      playerRef.current.loadVideoById({
        videoId: nextSong.videoId,
        startSeconds: nextSong.startSeconds ?? undefined,
        endSeconds: nextSong.endSeconds ?? undefined,
      });
      // Auto-play the next song after loading
      // Use shorter timeout for automatic events to ensure smooth background playback
      const autoplayDelay = isAutomatic ? 300 : 500;
      setTimeout(() => {
        if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
          console.log('▶️ Auto-playing next song for background playback');
        }
      }, autoplayDelay);
    }
  }, []);

  // Load YouTube IFrame API
  useEffect(() => {
    // Don't run until component is mounted on client
    if (!isMounted) return;
    
    let isActive = true;
    let retryTimer: NodeJS.Timeout | null = null;

    const initPlayer = () => {
      if (!isActive) return;
      if (playerRef.current) return;
      
      // Check if container ref is available
      const container = containerRef.current;
      if (!container) {
        retryTimer = setTimeout(initPlayer, 100);
        return;
      }
      
      // Check if YT API is ready
      if (!window.YT || !window.YT.Player) {
        retryTimer = setTimeout(initPlayer, 100);
        return;
      }

      const firstSong = filteredSongs[0] || playlist.songs[0];
      if (!firstSong) return;

      try {
        // Create player using the DOM element directly
        playerRef.current = new window.YT.Player(container as unknown as string, {
          height: '100%',
          width: '100%',
          videoId: firstSong.videoId,
          playerVars: {
            autoplay: 1,
            rel: 0,
            modestbranding: 1,
            start: firstSong.startSeconds ?? undefined,
            end: firstSong.endSeconds ?? undefined,
            vq: 'hd1080', // Request 1080p quality by default
          },
          events: {
            onReady: (event) => {
              if (!isActive) return;
              setIsReady(true);
              try {
                // Set to highest available quality
                const qualities = event.target.getAvailableQualityLevels();
                if (qualities && qualities.length > 0) {
                  // Quality levels: highres, hd1080, hd720, large, medium, small
                  if (qualities.includes('hd1080')) {
                    event.target.setPlaybackQuality('hd1080');
                  } else if (qualities.includes('highres')) {
                    event.target.setPlaybackQuality('highres');
                  } else {
                    event.target.setPlaybackQuality(qualities[0]);
                  }
                }
              } catch (e) {
                // Quality setting not supported
              }
            },
            onStateChange: (event) => {
              if (!isActive) return;
              if (event.data === window.YT.PlayerState.PLAYING) {
                try {
                  const availableQualities = event.target.getAvailableQualityLevels();
                  if (availableQualities?.includes('hd1080')) {
                    event.target.setPlaybackQuality('hd1080');
                  } else if (availableQualities?.includes('hd720')) {
                    event.target.setPlaybackQuality('hd720');
                  }
                } catch (e) {
                  // Quality setting not supported
                }
                // Update playing state for MediaSession
                setIsPlaying(true);
              }
              
              switch (event.data) {
                case window.YT.PlayerState.PLAYING:
                  setIsPlaying(true);
                  break;
                case window.YT.PlayerState.PAUSED:
                  setIsPlaying(false);
                  break;
                case window.YT.PlayerState.ENDED:
                  console.log('VIDEO ENDED - calling handleNext from onStateChange for background playback');
                  // Pass true for isAutomatic to bypass debounce and play faster
                  handleNext(true);
                  break;
              }
            },
            onError: (event) => {
              const errorCodes: { [key: number]: string } = {
                2: 'Invalid parameter',
                5: 'HTML5 player error',
                100: 'Video not found (removed or private)',
                101: 'Video owner does not allow embedding',
                150: 'Same as 101 (hidden for some reason)',
              };
              const errorMsg = errorCodes[event.data] || `Unknown error (code: ${event.data})`;
              console.log('❌ VIDEO ERROR:', errorMsg, '- skipping to next song');
              // Skip to next song on any error and auto-play
              setIsPlaying(true);
              handleNext(false);
            },
          },
        });
      } catch (e) {
        console.error('Failed to create YouTube player:', e);
        retryTimer = setTimeout(initPlayer, 500);
      }
    };

    const loadYouTubeAPI = () => {
      // Check if script tag already exists
      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      
      // Store original callback
      const originalCallback = window.onYouTubeIframeAPIReady;
      
      window.onYouTubeIframeAPIReady = () => {
        if (originalCallback) originalCallback();
        initPlayer();
      };
      
      // Also poll in case callback already fired
      retryTimer = setTimeout(initPlayer, 200);
    };

    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      loadYouTubeAPI();
    }

    return () => {
      isActive = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Player destroy error
        }
        playerRef.current = null;
      }
    };
  }, [isMounted, playlist.songs, handleNext]);

  const handlePrevious = useCallback(() => {
    const songs = filteredSongsRef.current;
    if (songs.length === 0) return;
    
    const prevIndex = currentIndex === 0 ? songs.length - 1 : currentIndex - 1;
    const prevSong = songs[prevIndex];
    
    setCurrentIndex(prevIndex);
    setCurrentSong(prevSong);
    
    if (playerRef.current && prevSong && typeof playerRef.current.loadVideoById === 'function') {
      playerRef.current.loadVideoById({
        videoId: prevSong.videoId,
        startSeconds: prevSong.startSeconds ?? undefined,
        endSeconds: prevSong.endSeconds ?? undefined,
      });
      // Auto-play the previous song for continuous background playback
      setTimeout(() => {
        if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
          console.log('▶️ Auto-playing previous song for background playback');
        }
      }, 300);
    }
  }, [currentIndex]);

  // Media Session API for better mobile experience and background control
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && currentSong) {
      try {
        // Set metadata with song info
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title,
          artist: currentSong.composer,
          album: playlist.title,
          artwork: [
            { src: 'https://via.placeholder.com/96x96/8B5CF6/FFFFFF?text=♪', sizes: '96x96', type: 'image/png' },
            { src: 'https://via.placeholder.com/128x128/8B5CF6/FFFFFF?text=♪', sizes: '128x128', type: 'image/png' },
            { src: 'https://via.placeholder.com/192x192/8B5CF6/FFFFFF?text=♪', sizes: '192x192', type: 'image/png' },
            { src: 'https://via.placeholder.com/256x256/8B5CF6/FFFFFF?text=♪', sizes: '256x256', type: 'image/png' },
          ]
        });

        console.log('🎵 [MediaSession] Setting up:', currentSong.title);

        // Play action handler
        navigator.mediaSession.setActionHandler('play', () => {
          console.log('▶️ [MediaSession] Play triggered from lock screen');
          if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
            playerRef.current.playVideo();
            setIsPlaying(true);
          }
        });
        
        // Pause action handler
        navigator.mediaSession.setActionHandler('pause', () => {
          console.log('⏸️ [MediaSession] Pause triggered from lock screen');
          if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
            playerRef.current.pauseVideo();
            setIsPlaying(false);
          }
        });
        
        // Previous track action handler - FOR LOCK SCREEN BUTTONS
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          console.log('⏪ [MediaSession] PREVIOUS button pressed on lock screen');
          handlePrevious();
        });
        
        // Next track action handler - FOR LOCK SCREEN BUTTONS
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          console.log('⏩ [MediaSession] NEXT button pressed on lock screen');
          handleNext(false);
        });

        // Seek backward
        navigator.mediaSession.setActionHandler('seekbackward', ({ seekOffset = 15 }) => {
          console.log('⏮️ [MediaSession] Seek backward:', seekOffset, 'seconds');
          if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && typeof playerRef.current.seekTo === 'function') {
            const currentTime = playerRef.current.getCurrentTime();
            playerRef.current.seekTo(Math.max(0, currentTime - seekOffset));
          }
        });

        // Seek forward
        navigator.mediaSession.setActionHandler('seekforward', ({ seekOffset = 15 }) => {
          console.log('⏭️ [MediaSession] Seek forward:', seekOffset, 'seconds');
          if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && typeof playerRef.current.seekTo === 'function') {
            const currentTime = playerRef.current.getCurrentTime();
            playerRef.current.seekTo(currentTime + seekOffset);
          }
        });

        // Update playback state
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        console.log('📱 [MediaSession] Playback state:', isPlaying ? 'playing' : 'paused');
        
        // Update position state frequently for lock screen progress bar
        const updatePositionState = () => {
          try {
            if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
              const currentTime = playerRef.current.getCurrentTime() || 0;
              const duration = playerRef.current.getDuration?.() || 0;
              
              if (navigator.mediaSession.setPositionState && duration > 0) {
                navigator.mediaSession.setPositionState({
                  duration: duration,
                  playbackRate: 1,
                  position: Math.max(0, currentTime)
                });
              }
            }
          } catch (e) {
            // Position state not supported silently
          }
        };

        // Update position immediately and every 500ms while playing
        updatePositionState();
        let positionInterval: NodeJS.Timeout | null = null;
        
        if (isPlaying) {
          positionInterval = setInterval(updatePositionState, 500);
          console.log('🔄 [MediaSession] Position updates enabled (500ms interval)');
        }

        return () => {
          if (positionInterval) {
            clearInterval(positionInterval);
            console.log('🔄 [MediaSession] Position updates stopped');
          }
        };
        
      } catch (e) {
        console.error('❌ [MediaSession] Setup error:', e);
      }
    }
  }, [currentSong, playlist.title, isPlaying, handlePrevious, handleNext]);

  // Keyboard controls and hardware media button support
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Media keys: MediaPlayPause, MediaNextTrack, MediaPreviousTrack
      if (e.code === 'MediaPlayPause' || e.key === ' ') {
        e.preventDefault();
        console.log('⌨️ Keyboard: Play/Pause pressed');
        handlePlayPause();
      } else if (e.code === 'MediaNextTrack' || e.code === 'MediaTrackNext') {
        e.preventDefault();
        console.log('⌨️ Keyboard: Next track pressed');
        handleNext(false);
      } else if (e.code === 'MediaPreviousTrack' || e.code === 'MediaTrackPrevious') {
        e.preventDefault();
        console.log('⌨️ Keyboard: Previous track pressed');
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleNext, handlePrevious]);

  // Wake Lock API to keep screen active during playback
  useEffect(() => {
    const requestWakeLock = async () => {
      if (isPlaying && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock!.request('screen');
          console.log('Wake lock active');
        } catch (err) {
          console.log('Wake lock request failed:', err);
        }
      } else if (wakeLockRef.current && !isPlaying) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake lock released');
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [isPlaying]);

  const handlePlayPause = () => {
    if (!playerRef.current || !isReady) return;
    
    if (isPlaying) {
      if (typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }
    } else {
      if (typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
      }
    }
  };

  const handleSongSelect = (index: number) => {
    const song = filteredSongs[index];
    if (!song) return;
    
    setCurrentIndex(index);
    setCurrentSong(song);
    
    if (playerRef.current && isReady && typeof playerRef.current.loadVideoById === 'function') {
      playerRef.current.loadVideoById({
        videoId: song.videoId,
        startSeconds: song.startSeconds ?? undefined,
        endSeconds: song.endSeconds ?? undefined,
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player Section */}
        <div className="lg:col-span-2">
          <div className="bg-black rounded-lg overflow-hidden shadow-xl">
            {/* YouTube Player */}
            <div className="aspect-video bg-gray-900">
              <div ref={containerRef} className="w-full h-full" />
            </div>
            
            {/* Now Playing Info */}
            {currentSong && (
              <div className="bg-gradient-to-r from-purple-900 to-purple-800 p-4">
                {/* Background Audio & Lock Screen Indicator */}
                <div className="flex items-center gap-2 mb-3 text-xs text-green-300 bg-green-500/10 px-3 py-2 rounded-full w-fit">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  <span>Background audio • Lock screen controls enabled</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg truncate">
                      {currentSong.title}
                    </h3>
                    <p className="text-purple-300 text-sm truncate">
                      {currentSong.composer} • {currentSong.movie !== '-' ? currentSong.movie : 'Single'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    {!isEntertainmentContent && currentSong.language && (
                      <span className="px-2 py-1 bg-purple-700 rounded text-xs text-purple-200">
                        {currentSong.language}
                      </span>
                    )}
                    {currentSong.year !== '-' && (
                      <span className="px-2 py-1 bg-purple-700 rounded text-xs text-purple-200">
                        {currentSong.year}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Controls */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <button
                    onClick={() => setIsShuffleOn(!isShuffleOn)}
                    className={`p-2 transition-colors ${
                      isShuffleOn 
                        ? 'text-green-400 hover:text-green-300' 
                        : 'text-white/50 hover:text-white'
                    }`}
                    title={isShuffleOn ? 'Shuffle On' : 'Shuffle Off'}
                  >
                    <Shuffle className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handlePrevious}
                    className="p-2 text-white hover:text-purple-300 transition-colors"
                    disabled={!isReady}
                  >
                    <SkipBack className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handlePlayPause}
                    className="p-3 bg-white rounded-full text-purple-900 hover:bg-purple-100 transition-colors disabled:opacity-50"
                    disabled={!isReady}
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8" />
                    ) : (
                      <Play className="w-8 h-8 ml-1" />
                    )}
                  </button>
                  <button
                    onClick={() => handleNext(false)}
                    className="p-2 text-white hover:text-purple-300 transition-colors"
                    disabled={!isReady}
                  >
                    <SkipForward className="w-6 h-6" />
                  </button>
                  <div className="w-5" /> {/* Spacer for symmetry */}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Playlist Section */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-700 to-purple-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  {!isEntertainmentContent && (
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                      <Volume2 className="w-5 h-5" />
                      {playlist.title}
                    </h2>
                  )}
                  <p className="text-purple-200 text-sm">
                    {hasActiveFilters ? `${filteredSongs.length} of ${playlist.songs.length} songs` : `${playlist.songs.length} songs`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isEntertainmentContent && (
                    <button
                      onClick={() => setShowSubmitModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white text-sm font-medium"
                      title="Add songs from YouTube"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  )}
                  {!isEntertainmentContent && (
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`p-2 rounded-full transition-colors text-white ${
                        showFilters || hasActiveFilters ? 'bg-white/30' : 'bg-white/20 hover:bg-white/30'
                      }`}
                      title="Filter songs"
                    >
                      <Filter className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => playlistRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white"
                    title="Scroll to top"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="mt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                  <input
                    type="text"
                    placeholder="Search songs, composers, movies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 text-sm bg-white/20 text-white placeholder-white/60 rounded border border-white/30 focus:outline-none focus:border-white/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Filter Panel */}
              {!isEntertainmentContent && showFilters && (
                <div className="mt-3 pt-3 border-t border-white/20">
                  <div className="grid grid-cols-1 gap-2">
                    {/* Language Filter - Hidden for entertainment content */}
                    {!isEntertainmentContent && languages.length > 0 && (
                      <select
                        value={languageFilter}
                        onChange={(e) => setLanguageFilter(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-white/20 text-white rounded border border-white/30 focus:outline-none focus:border-white/50"
                      >
                        <option value="" className="text-gray-900">All Languages</option>
                        {languages.map(lang => (
                          <option key={lang} value={lang} className="text-gray-900">{lang}</option>
                        ))}
                      </select>
                    )}
                    
                    <select
                      value={composerFilter}
                      onChange={(e) => setComposerFilter(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white/20 text-white rounded border border-white/30 focus:outline-none focus:border-white/50"
                    >
                      <option value="" className="text-gray-900">All Composers</option>
                      {composers.map(comp => (
                        <option key={comp} value={comp} className="text-gray-900">{comp}</option>
                      ))}
                    </select>
                    
                    <select
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white/20 text-white rounded border border-white/30 focus:outline-none focus:border-white/50"
                    >
                      <option value="" className="text-gray-900">All Years</option>
                      {years.map(year => (
                        <option key={year} value={year} className="text-gray-900">{year}</option>
                      ))}
                    </select>
                  </div>
                  
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-1.5 text-sm bg-red-500/30 hover:bg-red-500/40 text-white rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div ref={playlistRef} className="max-h-[500px] overflow-y-auto">
              {filteredSongs.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <p>No songs match your filters</p>
                  <button
                    onClick={clearFilters}
                    className="mt-2 text-purple-600 hover:text-purple-700 text-sm"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                filteredSongs.map((song, index) => {
                  return (
                    <PlaylistItem
                      key={song.id}
                      song={song}
                      index={index}
                      isActive={index === currentIndex}
                      isPlaying={index === currentIndex && isPlaying}
                      onSelect={() => handleSongSelect(index)}
                      hideLanguage={isEntertainmentContent}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Empty Playlist Toast Message */}
      {showEmptyPlaylistMessage && (
        <div className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:max-w-md bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-lg p-4 animate-fade-in-up">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="font-semibold text-sm">Add songs to your playlist</p>
              <p className="text-xs text-white/80 mt-1">Click the + button to submit YouTube songs</p>
            </div>
            <button
              onClick={() => setShowEmptyPlaylistMessage(false)}
              className="text-white/60 hover:text-white transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Submit Song Modal */}
      <SubmitSongModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onSongSubmitted={(songName, playlistName) => {
          console.log(`🎵 [MusicPlaylist] onSongSubmitted callback triggered - Song: ${songName}, Playlist: ${playlistName}`);
          setShowSubmitModal(false);
          if (onSongSubmitted) {
            console.log('📢 [MusicPlaylist] Calling parent onSongSubmitted callback...');
            onSongSubmitted(songName, playlistName);
          } else {
            console.warn('⚠️ [MusicPlaylist] No onSongSubmitted callback provided by parent');
          }
        }}
        userPlaylistId={userPlaylistId}
        playlistTitle={userPlaylistId ? playlist.title : undefined}
      />
      
      {/* Add From Linus Playlist Modal */}
      <AddFromLinusPlaylistModal
        isOpen={showAddFromLinusModal}
        onClose={() => setShowAddFromLinusModal(false)}
        songs={playlist.songs}
      />
    </div>
  );
}
