import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import YoutubePlayer from 'react-native-youtube-iframe';
import { defaultPlaylist, Song } from '../data/playlists';
import { useAuth } from '../contexts/AuthContext';

export default function MusicPlaylistScreen() {
  const { token } = useAuth();
  const playerRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVideoIdRef = useRef<string>('');
  const [currentSong, setCurrentSong] = useState<Song | null>(defaultPlaylist[0] || null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [composerFilter, setComposerFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'default' | 'user-playlists'>('default');

  // Helper to normalize language
  const normalizeLanguage = (lang: string) => lang?.trim().toUpperCase() || '';

  // Extract unique values for filters
  const languages = useMemo(() => 
    Array.from(new Set(defaultPlaylist.map(s => normalizeLanguage(s.language)))).filter(l => l && l !== '-').sort(),
    []
  );

  const composers = useMemo(() => 
    Array.from(new Set(defaultPlaylist.map(s => s.composer))).filter(c => c && c !== '-').sort(),
    []
  );

  const years = useMemo(() => 
    Array.from(new Set(defaultPlaylist.map(s => s.year))).filter(y => y && y !== '-').sort((a, b) => b.localeCompare(a)),
    []
  );

  // Filter songs
  const filteredSongs = useMemo(() => {
    return defaultPlaylist.filter(song => {
      if (languageFilter && normalizeLanguage(song.language) !== languageFilter) return false;
      if (composerFilter && song.composer !== composerFilter) return false;
      if (yearFilter && song.year !== yearFilter) return false;
      return true;
    });
  }, [languageFilter, composerFilter, yearFilter]);

  const hasActiveFilters = languageFilter || composerFilter || yearFilter;

  const clearFilters = () => {
    setLanguageFilter('');
    setComposerFilter('');
    setYearFilter('');
  };

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const playSong = (song: Song, index: number) => {
    setCurrentSong(song);
    setCurrentIndex(index);
    setIsPlaying(true);
    setHasStartedPlaying(false);
    
    // Clear any existing timeout
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
    }
    
    // Set timeout to skip to next song if video doesn't start playing within 10 seconds
    playbackTimeoutRef.current = setTimeout(() => {
      console.log('⏱️ Video timeout - skipping to next song');
      playNext();
    }, 10000);
    
    // Scroll to show the song in the filtered list
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    }, 100);
  };

  const playNext = useCallback(() => {
    const playlist = hasActiveFilters ? filteredSongs : defaultPlaylist;
    let nextIndex: number;
    
    if (isShuffleOn) {
      do {
        nextIndex = Math.floor(Math.random() * playlist.length);
      } while (nextIndex === currentIndex && playlist.length > 1);
    } else {
      nextIndex = (currentIndex + 1) % playlist.length;
    }
    
    const nextSong = playlist[nextIndex];
    setCurrentIndex(nextIndex);
    setCurrentSong(nextSong);
    setIsPlaying(true);
    setHasStartedPlaying(false);
    
    // Clear any existing timeout
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
    }
    
    // Set timeout for next song
    playbackTimeoutRef.current = setTimeout(() => {
      console.log('⏱️ Video timeout - skipping to next song');
      playNext();
    }, 10000);
    
    // Scroll to show the song
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }, 100);
  }, [currentIndex, isShuffleOn, filteredSongs, hasActiveFilters]);

  const playPrevious = () => {
    const playlist = hasActiveFilters ? filteredSongs : defaultPlaylist;
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    const prevSong = playlist[prevIndex];
    setCurrentIndex(prevIndex);
    setCurrentSong(prevSong);
    setIsPlaying(true);
    setHasStartedPlaying(false);
    
    // Clear any existing timeout
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
    }
    
    // Set timeout for previous song
    playbackTimeoutRef.current = setTimeout(() => {
      console.log('⏱️ Video timeout - skipping to next song');
      playNext();
    }, 10000);
    
    // Scroll to show the song
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: prevIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }, 100);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }
    };
  }, []);

  const renderSongItem = ({ item, index }: { item: Song; index: number }) => {
    const isActive = currentSong?.id === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.songItem,
          isActive && styles.songItemActive,
        ]}
        onPress={() => playSong(item, index)}
      >
        {isActive && (
          <View style={styles.playingIndicator}>
            <Ionicons name="musical-note" size={16} color="#8b5cf6" />
          </View>
        )}
        <View style={styles.songInfo}>
          <Text style={[styles.songTitle, isActive && styles.songTitleActive]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.songDetails}>
            {item.composer} • {item.year} • {item.language}
          </Text>
        </View>
        {isActive && isPlaying && (
          <Ionicons name="volume-high" size={20} color="#3b82f6" />
        )}
        {isActive && !isPlaying && (
          <Ionicons name="pause-circle" size={20} color="#9ca3af" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'default' && styles.activeTab]}
          onPress={() => setActiveTab('default')}
        >
          <Text style={[styles.tabText, activeTab === 'default' && styles.activeTabText]}>
            All Songs ({defaultPlaylist.length})
          </Text>
        </TouchableOpacity>
        {token && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'user-playlists' && styles.activeTab]}
            onPress={() => setActiveTab('user-playlists')}
          >
            <Text style={[styles.tabText, activeTab === 'user-playlists' && styles.activeTabText]}>
              My Playlists
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'user-playlists' ? (
        <View style={styles.comingSoonContainer}>
          <Ionicons name="list" size={48} color="#64748b" />
          <Text style={styles.comingSoonTitle}>User Playlists</Text>
          <Text style={styles.comingSoonText}>
            Create and manage your music playlists
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>
                {hasActiveFilters ? `${filteredSongs.length} of ${defaultPlaylist.length}` : `${defaultPlaylist.length} songs`}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={[styles.headerButton, (showFilters || hasActiveFilters) && styles.headerButtonActive]} 
                onPress={() => setShowFilters(!showFilters)}
              >
                <Ionicons name="filter" size={20} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={scrollToTop}>
                <Ionicons name="arrow-up" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

      {/* Player at the top */}
      <View style={styles.playerContainer}>
        <View style={styles.playerWrapper}>
          <YoutubePlayer
            ref={playerRef}
            height={200}
            play={isPlaying}
            videoId={currentSong?.videoId || defaultPlaylist[0]?.videoId}
            initialPlayerParams={{
              controls: true,
              modestbranding: false,
            }}
            onChangeState={(state) => {
              console.log('Player state:', state);
              if (state === 'ended') {
                playNext();
              } else if (state === 'playing') {
                // Video started playing successfully - clear timeout
                setHasStartedPlaying(true);
                if (playbackTimeoutRef.current) {
                  clearTimeout(playbackTimeoutRef.current);
                  playbackTimeoutRef.current = null;
                }
              } else if (state === 'buffering' && hasStartedPlaying) {
                // Video is buffering after it started playing - this is normal
                // Don't reset timeout
              }
            }}
            onReady={() => {
              console.log('Player ready');
              setIsReady(true);
            }}
            onError={(error: string) => {
              console.log('Player error:', error);
              // Skip to next song if playback is disabled or any error occurs
              playNext();
            }}
            webViewProps={{
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false,
            }}
          />
        </View>

        <View style={styles.controls}>
          <TouchableOpacity 
            onPress={() => setIsShuffleOn(!isShuffleOn)} 
            style={styles.controlButton}
          >
            <Ionicons 
              name="shuffle" 
              size={24} 
              color={isShuffleOn ? '#22c55e' : '#9ca3af'} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={playPrevious} style={styles.controlButton}>
            <Ionicons name="play-skip-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={playNext} style={styles.controlButton}>
            <Ionicons name="play-skip-forward" size={28} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.spacer} />
        </View>
      </View>

      {showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Language:</Text>
            <Picker
              selectedValue={languageFilter}
              onValueChange={setLanguageFilter}
              style={styles.picker}
            >
              <Picker.Item label="All Languages" value="" />
              {languages.map(lang => (
                <Picker.Item key={lang} label={lang} value={lang} />
              ))}
            </Picker>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Composer:</Text>
            <Picker
              selectedValue={composerFilter}
              onValueChange={setComposerFilter}
              style={styles.picker}
            >
              <Picker.Item label="All Composers" value="" />
              {composers.map(comp => (
                <Picker.Item key={comp} label={comp} value={comp} />
              ))}
            </Picker>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Year:</Text>
            <Picker
              selectedValue={yearFilter}
              onValueChange={setYearFilter}
              style={styles.picker}
            >
              <Picker.Item label="All Years" value="" />
              {years.map(year => (
                <Picker.Item key={year} label={year} value={year} />
              ))}
            </Picker>
          </View>

          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Ionicons name="close-circle" size={18} color="#ffffff" />
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {filteredSongs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No songs match your filters</Text>
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearLink}>Clear filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredSongs}
          renderItem={renderSongItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.5,
              });
            }, 500);
          }}
        />
      )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  activeTabText: {
    color: '#8b5cf6',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterPanel: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  filterRow: {
    marginBottom: 8,
  },
  filterLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  picker: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    height: 40,
    borderRadius: 6,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 10,
    borderRadius: 6,
    marginTop: 4,
  },
  clearFiltersText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
    marginBottom: 8,
  },
  clearLink: {
    color: '#8b5cf6',
    fontSize: 14,
  },
  listContent: {
    padding: 8,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#1f2937',
    borderRadius: 6,
    marginBottom: 6,
  },
  songItemActive: {
    backgroundColor: '#374151',
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  playingIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  songTitleActive: {
    color: '#8b5cf6',
  },
  songDetails: {
    fontSize: 11,
    color: '#9ca3af',
  },
  playerContainer: {
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  playerWrapper: {
    width: '100%',
    backgroundColor: '#000000',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 16,
    backgroundColor: '#1f2937',
  },
  controlButton: {
    padding: 8,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    width: 24,
  },
});
