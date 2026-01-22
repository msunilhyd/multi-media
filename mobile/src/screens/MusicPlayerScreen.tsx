import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { audioService } from '../services/audioService';
import { trackPlayerService } from '../services/trackPlayerService';
import { defaultPlaylist, Song } from '../data/playlists';

// Flag to switch between audio services
const USE_TRACK_PLAYER = true; // Set to true to enable car controls

export default function MusicPlayerScreen() {
  const flatListRef = useRef<FlatList>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [composerFilter, setComposerFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const fadeAnim = useRef(new Animated.Value(1)).current;

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

  useEffect(() => {
    // Setup track player and register callbacks for car controls
    if (USE_TRACK_PLAYER) {
      trackPlayerService.setup().then(() => {
        // Register next/previous callbacks for car steering wheel controls
        trackPlayerService.setNavigationCallbacks(playNext, playPrevious);
        console.log('🎵 TrackPlayer ready with car controls');
      }).catch(error => {
        console.error('Failed to setup TrackPlayer:', error);
      });
    }
    
    return () => {
      if (USE_TRACK_PLAYER) {
        trackPlayerService.stop().catch(console.error);
      } else {
        audioService.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    // Auto-hide the ephemeral message after 5 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }, 5000);

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  // Pause audio when navigating away from this screen
  useFocusEffect(
    useCallback(() => {
      // Screen is focused - do nothing, let user control playback
      console.log('🎵 Audio tab focused');
      return () => {
        // Screen is unfocused - pause the audio
        console.log('🎵 Audio tab unfocused - pausing audio');
        if (isPlaying) {
          if (USE_TRACK_PLAYER) {
            trackPlayerService.pause();
          } else {
            audioService.pauseAsync();
          }
          setIsPlaying(false);
          console.log('🎵 Audio paused - navigated away from Background Audio');
        }
      };
    }, [isPlaying])
  );

  const playSong = async (song: Song, filteredIndex?: number) => {
    try {
      console.log(`🎵 Playing song: ${song.title} (${song.videoId})`);
      setIsLoading(true);
      
      if (USE_TRACK_PLAYER) {
        await trackPlayerService.playSong(song);
      } else {
        await audioService.playSong(song);
      }
      
      setCurrentSong(song);
      // Find the index in the full playlist
      const fullIndex = defaultPlaylist.findIndex(s => s.id === song.id);
      setCurrentIndex(fullIndex);
      setIsPlaying(true);
      console.log(`✅ Song loaded successfully`);
      
      // Scroll to show the song centered in filtered list
      if (filteredIndex !== undefined && filteredIndex >= 0) {
        setTimeout(() => {
          const itemHeight = 80;
          // Simple calculation: position song at 250px from top of visible area
          const targetPosition = Math.max(0, (filteredIndex * itemHeight) - 700);
          
          flatListRef.current?.scrollToOffset({
            offset: targetPosition,
            animated: true
          });
          console.log(`Scrolled to offset ${targetPosition} for index ${filteredIndex}`);
        }, 300);
      }
    } catch (error) {
      console.error('❌ Play error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // If it's a stream error, automatically skip to next song
      if (errorMessage.includes('Failed to get audio stream') || errorMessage.includes('404')) {
        console.log('⏭️ Stream failed, skipping to next song...');
        setTimeout(() => playNext(), 500);
      } else {
        Alert.alert('Error', `Failed to play ${song.title}: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    try {
      if (isPlaying) {
        if (USE_TRACK_PLAYER) {
          await trackPlayerService.pause();
        } else {
          await audioService.pauseAsync();
        }
        setIsPlaying(false);
      } else {
        if (USE_TRACK_PLAYER) {
          await trackPlayerService.play();
        } else {
          await audioService.resumeAsync();
        }
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Toggle play/pause error:', error);
    }
  };

  const playNext = useCallback(async () => {
    let nextIndex: number;
    
    if (isShuffleOn) {
      do {
        nextIndex = Math.floor(Math.random() * defaultPlaylist.length);
      } while (nextIndex === currentIndex && defaultPlaylist.length > 1);
    } else {
      nextIndex = (currentIndex + 1) % defaultPlaylist.length;
    }
    
    const nextSong = defaultPlaylist[nextIndex];
    // Find the song in filtered list for scroll position
    const filteredIndex = filteredSongs.findIndex(s => s.id === nextSong.id);
    await playSong(nextSong, filteredIndex >= 0 ? filteredIndex : undefined);
  }, [currentIndex, isShuffleOn, filteredSongs]);

  const playPrevious = async () => {
    const prevIndex = currentIndex === 0 ? defaultPlaylist.length - 1 : currentIndex - 1;
    const prevSong = defaultPlaylist[prevIndex];
    // Find the song in filtered list for scroll position
    const filteredIndex = filteredSongs.findIndex(s => s.id === prevSong.id);
    await playSong(prevSong, filteredIndex >= 0 ? filteredIndex : undefined);
  };

  const toggleShuffle = () => {
    setIsShuffleOn(!isShuffleOn);
  };

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const formatTime = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderSongItem = ({ item, index }: { item: Song; index: number }) => (
    <TouchableOpacity
      style={[
        styles.songItem,
        currentSong?.id === item.id && styles.currentSongItem
      ]}
      onPress={() => playSong(item, index)}
    >
      <View style={styles.songInfo}>
        <Text style={[styles.songTitle, currentSong?.id === item.id && styles.currentSongTitle]}>
          {item.title}
        </Text>
        <Text style={styles.songDetails}>
          {item.composer} • {item.language} • {item.year}
        </Text>
      </View>
      {currentSong?.id === item.id && (
        <View style={styles.playingIconContainer}>
          <Ionicons 
            name={isPlaying ? 'volume-high' : 'pause'} 
            size={24} 
            color="#8B5CF6" 
          />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
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

      {/* Filters Section */}
      {showFilters && (
        <View style={styles.filtersContainer}>
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

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading audio stream...</Text>
        </View>
      )}

      {/* Song List */}
      {filteredSongs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No songs match your filters</Text>
          <TouchableOpacity style={styles.clearFiltersButtonEmpty} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredSongs}
          renderItem={renderSongItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.songList}
          contentContainerStyle={{ paddingBottom: 120 }}
          getItemLayout={(data, index) => ({
            length: 80,
            offset: 80 * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({ 
                index: info.index, 
                animated: true,
                viewOffset: 200
              });-3
            });
          }}
        />
      )}

      {/* Bottom Player */}
      {currentSong && (
        <View style={styles.bottomPlayer}>
          <View style={styles.bottomControls}>
            <TouchableOpacity 
              onPress={toggleShuffle} 
              style={styles.bottomNavButton}
            >
              <Ionicons 
                name="shuffle" 
                size={20} 
                color={isShuffleOn ? '#22c55e' : '#9ca3af'} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.bottomNavButton} 
              onPress={playPrevious}
              disabled={isLoading}
            >
              <Ionicons name="play-skip-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.bottomPlayButton} 
              onPress={togglePlayPause}
              disabled={isLoading}
            >
              <Ionicons 
                name={isLoading ? 'hourglass' : isPlaying ? 'pause' : 'play'} 
                size={28} 
                color="#ffffff" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.bottomNavButton} 
              onPress={playNext}
              disabled={isLoading}
            >
              <Ionicons name="play-skip-forward" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <View style={styles.spacer} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    paddingTop: 0,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B5CF6',
  },
  ephemeralInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 10,
  },
  ephemeralText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  bottomPlayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1f2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
  },
  bottomPlayButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomNavButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 10,
  },
  songList: {
    flex: 1,
    marginBottom: 90,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  currentSongItem: {
    backgroundColor: '#1f2937',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  currentSongTitle: {
    color: '#8B5CF6',
  },
  songDetails: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 2,
  },
  movieName: {
    color: '#8B5CF6',
    fontSize: 11,
  },
  playingIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    backgroundColor: '#1f2937',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
  },
  filterRow: {
    marginBottom: 15,
  },
  filterLabel: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 5,
    fontWeight: '600',
  },
  picker: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    borderRadius: 8,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 5,
  },
  clearFiltersButtonEmpty: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
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
    padding: 40,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  spacer: {
    width: 45,
  },
});