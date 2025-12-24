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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { audioService } from '../services/audioService';
import { defaultPlaylist, Song } from '../data/playlists';

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
    // No need for status updates with expo-audio - it handles background automatically
    return () => {
      audioService.unloadAsync();
    };
  }, []);

  const playSong = async (song: Song, filteredIndex?: number) => {
    try {
      console.log(`🎵 Playing song: ${song.title} (${song.videoId})`);
      setIsLoading(true);
      await audioService.playSong(song);
      setCurrentSong(song);
      // Find the index in the full playlist
      const fullIndex = defaultPlaylist.findIndex(s => s.id === song.id);
      setCurrentIndex(fullIndex);
      setIsPlaying(true);
      console.log(`✅ Song loaded successfully`);
      
      // Scroll to show the song in filtered list
      if (filteredIndex !== undefined) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: filteredIndex,
            animated: true,
            viewPosition: 0.4,
          });
        }, 100);
      }
    } catch (error) {
      console.error('❌ Play error:', error);
      Alert.alert('Error', `Failed to play ${song.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    try {
      if (isPlaying) {
        await audioService.pauseAsync();
        setIsPlaying(false);
      } else {
        await audioService.resumeAsync();
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
        <Text style={styles.songTitle}>{item.title}</Text>
        <Text style={styles.songDetails}>
          {item.composer} • {item.language} • {item.year}
        </Text>
        <Text style={styles.movieName}>{item.movie}</Text>
      </View>
      {currentSong?.id === item.id && isPlaying && (
        <Text style={styles.playingIndicator}>♪</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Music Playlist</Text>
          <Text style={styles.subtitle}>Background Audio • {defaultPlaylist.length} songs</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.headerButton}>
            <Ionicons 
              name="filter" 
              size={24} 
              color={hasActiveFilters ? '#4ade80' : '#ffffff'} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleShuffle} style={styles.headerButton}>
            <Ionicons 
              name="shuffle" 
              size={24} 
              color={isShuffleOn ? '#4ade80' : '#ffffff'} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={scrollToTop} style={styles.headerButton}>
            <Ionicons name="arrow-up-circle" size={24} color="#ffffff" />
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

      {/* Current Song Display */}
      {currentSong && (
        <View style={styles.nowPlaying}>
          <Text style={styles.nowPlayingTitle}>Now Playing</Text>
          <Text style={styles.currentSongTitle}>{currentSong.title}</Text>
          <Text style={styles.currentSongArtist}>{currentSong.composer}</Text>
          
          {/* Progress */}
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' }
                ]} 
              />
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity 
              style={styles.navButton} 
              onPress={playPrevious}
              disabled={isLoading}
            >
              <Ionicons name="play-skip-back" size={28} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={togglePlayPause}
              disabled={isLoading}
            >
              <Ionicons 
                name={isLoading ? 'hourglass' : isPlaying ? 'pause' : 'play'} 
                size={32} 
                color="#ffffff" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navButton} 
              onPress={playNext}
              disabled={isLoading}
            >
              <Ionicons name="play-skip-forward" size={28} color="#ffffff" />
            </TouchableOpacity>
          </View>
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
          onScrollToIndexFailed={(info) => {
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
            });
          }}
        />
      )}
      
      {/* Background Play Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          🎵 This music will continue playing when you switch to other apps!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    padding: 8,
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
  nowPlaying: {
    backgroundColor: '#2a2a2a',
    margin: 20,
    padding: 20,
    borderRadius: 10,
  },
  nowPlayingTitle: {
    color: '#8B5CF6',
    fontSize: 14,
    marginBottom: 10,
  },
  currentSongTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  currentSongArtist: {
    color: '#cccccc',
    fontSize: 14,
    marginBottom: 15,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    color: '#cccccc',
    fontSize: 12,
    width: 40,
    textAlign: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#444',
    marginHorizontal: 10,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#cccccc',
    marginTop: 10,
  },
  songList: {
    flex: 1,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  currentSongItem: {
    backgroundColor: '#2a2a2a',
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
  songDetails: {
    color: '#cccccc',
    fontSize: 12,
    marginBottom: 2,
  },
  movieName: {
    color: '#8B5CF6',
    fontSize: 11,
  },
  playingIndicator: {
    color: '#8B5CF6',
    fontSize: 20,
  },
  infoBox: {
    backgroundColor: '#2a2a2a',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  infoText: {
    color: '#cccccc',
    fontSize: 12,
    textAlign: 'center',
  },
  filtersContainer: {
    backgroundColor: '#2a2a2a',
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
    backgroundColor: '#1a1a1a',
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
    color: '#666',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});