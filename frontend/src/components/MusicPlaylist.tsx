'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Shuffle, ArrowUp, Filter, X } from 'lucide-react';
import type { Song } from '@/lib/api';
import PlaylistItem from './PlaylistItem';

interface Playlist {
  slug: string;
  title: string;
  songs: Song[];
}

interface MusicPlaylistProps {
  playlist: Playlist;
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
  destroy: () => void;
  getPlayerState: () => number;
  setPlaybackQuality: (quality: string) => void;
  getAvailableQualityLevels: () => string[];
}

export default function MusicPlaylist({ playlist }: MusicPlaylistProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(playlist.songs[0] || null);
  const [isReady, setIsReady] = useState(false);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [composerFilter, setComposerFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
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
      if (!isEntertainmentContent && languageFilter && normalizeLanguage(song.language) !== languageFilter) return false;
      if (composerFilter && song.composer !== composerFilter) return false;
      if (yearFilter && song.year !== yearFilter) return false;
      return true;
    });
  }, [playlist.songs, languageFilter, composerFilter, yearFilter, isEntertainmentContent]);
  
  const hasActiveFilters = (!isEntertainmentContent && languageFilter) || composerFilter || yearFilter;
  
  const clearFilters = () => {
    setLanguageFilter('');
    setComposerFilter('');
    setYearFilter('');
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

  const handleNext = useCallback(() => {
    const songs = filteredSongsRef.current;
    console.log('HandleNext called - Current songs array:', songs.map(s => s.title));
    console.log('HandleNext called - Current index:', currentIndexRef.current);
    
    if (songs.length === 0) return;
    
    // Debounce multiple rapid calls
    if (nextCallTimeoutRef.current) {
      console.log('Debouncing rapid handleNext call');
      return;
    }
    
    nextCallTimeoutRef.current = setTimeout(() => {
      nextCallTimeoutRef.current = null;
    }, 1000); // Prevent rapid calls within 1 second
    
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

      const firstSong = playlist.songs[0];
      if (!firstSong) return;

      try {
        // Create player using the DOM element directly
        playerRef.current = new window.YT.Player(container as unknown as string, {
          height: '100%',
          width: '100%',
          videoId: firstSong.videoId,
          playerVars: {
            autoplay: 0,
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
              }
              
              switch (event.data) {
                case window.YT.PlayerState.PLAYING:
                  setIsPlaying(true);
                  break;
                case window.YT.PlayerState.PAUSED:
                  setIsPlaying(false);
                  break;
                case window.YT.PlayerState.ENDED:
                  console.log('VIDEO ENDED - calling handleNext from onStateChange');
                  handleNext();
                  break;
              }
            },
            onError: (event) => {
              console.log('VIDEO ERROR - calling handleNext from onError, error code:', event.data);
              handleNext();
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
    }
  }, [currentIndex]);

  // Media Session API for better mobile experience and background control
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && currentSong) {
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

      navigator.mediaSession.setActionHandler('play', () => {
        if (playerRef.current) {
          playerRef.current.playVideo();
        }
      });
      
      navigator.mediaSession.setActionHandler('pause', () => {
        if (playerRef.current) {
          playerRef.current.pauseVideo();
        }
      });
      
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevious);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);

      // Update playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [currentSong, playlist.title, isPlaying, handlePrevious, handleNext]);

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
                    onClick={handleNext}
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
    </div>
  );
}
