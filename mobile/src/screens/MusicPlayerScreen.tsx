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
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { audioService } from '../services/audioService';
import { trackPlayerService } from '../services/trackPlayerService';
import { defaultPlaylist, Song } from '../data/playlists';
import { useAuth } from '../contexts/AuthContext';

// Flag to switch between audio services
const USE_TRACK_PLAYER = true; // Set to true to enable car controls

interface Playlist {
  id: number;
  title: string;
  description?: string;
  song_count: number;
}

export default function MusicPlayerScreen() {
  const navigation = useNavigation<any>();
  const { token } = useAuth();
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
  
  // Playlist state
  const [activeTab, setActiveTab] = useState<'songs' | 'playlists'>('songs');
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

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

  // Fetch user's playlists
  const fetchPlaylists = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/playlists/?playlist_type=music`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPlaylists(data);
      } else {
        console.error('Failed to fetch playlists:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  };

  // Create new playlist
  const createPlaylist = async () => {
    if (!token || !newPlaylistName.trim()) return;
    
    setIsCreatingPlaylist(true);
    try {
      const response = await fetch(`http://localhost:8000/api/playlists/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newPlaylistName.trim(),
          playlist_type: 'music',
        }),
      });
      
      if (response.ok) {
        const newPlaylist = await response.json();
        setPlaylists([newPlaylist, ...playlists]);
        setNewPlaylistName('');
        Alert.alert('Success', `Playlist "${newPlaylist.title}" created!`);
      }
    } catch (error) {
      console.error('Failed to create playlist:', error);
      Alert.alert('Error', 'Failed to create playlist');
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  // Add current song to selected playlist
  const addToPlaylist = async (playlistId: number) => {
    if (!token || !currentSong) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          song_id: currentSong.id,
          content_type: 'song',
        }),
      });
      
      if (response.ok) {
        const playlist = playlists.find(p => p.id === playlistId);
        Alert.alert('Success', `Added "${currentSong.title}" to "${playlist?.title}"!`);
        setShowPlaylistModal(false);
        fetchPlaylists(); // Refresh to update song counts
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to add song to playlist');
      }
    } catch (error) {
      console.error('Failed to add to playlist:', error);
      Alert.alert('Error', 'Failed to add song to playlist');
    }
  };

  const openPlaylistModal = () => {
    if (!token) {
      Alert.alert('Login Required', 'Please login to create playlists');
      return;
    }
    fetchPlaylists();
    setShowPlaylistModal(true);
  };

  // Delete a playlist
  const deletePlaylist = async (playlistId: number, playlistTitle: string) => {
    if (!token) return;
    
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlistTitle}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`http://localhost:8000/api/playlists/${playlistId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              
              if (response.ok) {
                Alert.alert('Success', 'Playlist deleted');
                fetchPlaylists(); // Refresh the list
              } else {
                const error = await response.json();
                Alert.alert('Error', error.detail || 'Failed to delete playlist');
              }
            } catch (error) {
              console.error('Failed to delete playlist:', error);
              Alert.alert('Error', 'Failed to delete playlist');
            }
          },
        },
      ]
    );
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
      
      // Stop any previous playback before starting new song
      try {
        await audioService.pauseAsync();
      } catch (e) {
        // Ignore error if no song was playing
      }
      
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
          {token && (
            <TouchableOpacity
              style={styles.addToPlaylistButton}
              onPress={() => openPlaylistModal()}
              disabled={!currentSong}
            >
              <Ionicons
                name="add-circle"
                size={24}
                color={currentSong ? "#8B5CF6" : "#666"}
              />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'songs' && styles.activeTab]}
          onPress={() => setActiveTab('songs')}
        >
          <Text style={[styles.tabText, activeTab === 'songs' && styles.activeTabText]}>
            All Songs
          </Text>
        </TouchableOpacity>
        {token && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'playlists' && styles.activeTab]}
            onPress={() => {
              setActiveTab('playlists');
              fetchPlaylists();
            }}
          >
            <Text style={[styles.tabText, activeTab === 'playlists' && styles.activeTabText]}>
              My Playlists
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'songs' ? (
        <>
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
          {/* YouTube Attribution */}
          <View style={styles.youtubeAttributionBadge}>
            <Ionicons name="logo-youtube" size={14} color="#ef4444" />
            <Text style={styles.youtubeAttributionText}>Powered by YouTube</Text>
          </View>
          
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
        </>
      ) : (
        /* My Playlists Tab */
        <View style={styles.playlistsTab}>
          {!token ? (
            <View style={styles.centerContainer}>
              <Ionicons name="log-in-outline" size={48} color="#64748b" />
              <Text style={styles.emptyText}>Please login to create playlists</Text>
            </View>
          ) : (
            <>
              {/* Create New Playlist Section */}
              <View style={styles.createPlaylistCard}>
                <Text style={styles.createPlaylistTitle}>Create New Playlist</Text>
                <View style={styles.createPlaylistSection}>
                  <TextInput
                    style={styles.playlistInput}
                    placeholder="Playlist name"
                    placeholderTextColor="#6b7280"
                    value={newPlaylistName}
                    onChangeText={setNewPlaylistName}
                  />
                  <TouchableOpacity
                    style={[styles.createButton, !newPlaylistName.trim() && styles.createButtonDisabled]}
                    onPress={createPlaylist}
                    disabled={!newPlaylistName.trim() || isCreatingPlaylist}
                  >
                    {isCreatingPlaylist ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="add" size={20} color="#ffffff" />
                        <Text style={styles.createButtonText}>Create</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* User's Playlists */}
              <ScrollView style={styles.playlistsScrollView}>
                {playlists.length === 0 ? (
                  <View style={styles.centerContainer}>
                    <Ionicons name="musical-notes-outline" size={48} color="#64748b" />
                    <Text style={styles.emptyText}>No playlists yet</Text>
                    <Text style={styles.emptySubtext}>Create your first playlist above!</Text>
                  </View>
                ) : (
                  playlists.map(playlist => (
                    <View key={playlist.id} style={styles.playlistCardContainer}>
                      <TouchableOpacity
                        style={styles.playlistCard}
                        onPress={() => {
                          navigation.navigate('PlaylistDetail', {
                            playlistId: playlist.id,
                            playlistTitle: playlist.title,
                          });
                        }}
                      >
                        <View style={styles.playlistCardIcon}>
                          <Ionicons name="musical-notes" size={24} color="#8b5cf6" />
                        </View>
                        <View style={styles.playlistCardInfo}>
                          <Text style={styles.playlistCardTitle}>{playlist.title}</Text>
                          {playlist.description && (
                            <Text style={styles.playlistCardDescription} numberOfLines={1}>
                              {playlist.description}
                            </Text>
                          )}
                          <Text style={styles.playlistCardCount}>
                            {playlist.song_count} {playlist.song_count === 1 ? 'song' : 'songs'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deletePlaylistButton}
                        onPress={() => deletePlaylist(playlist.id, playlist.title)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            </>
          )}
        </View>
      )}

      {/* Playlist Modal */}
      <Modal
        visible={showPlaylistModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPlaylistModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Playlist</Text>
              <TouchableOpacity onPress={() => setShowPlaylistModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {currentSong && (
              <Text style={styles.modalSubtitle}>
                Adding: {currentSong.title}
              </Text>
            )}

            {/* Create New Playlist */}
            <View style={styles.createPlaylistSection}>
              <TextInput
                style={styles.playlistInput}
                placeholder="New playlist name"
                placeholderTextColor="#6b7280"
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
              />
              <TouchableOpacity
                style={[styles.createButton, !newPlaylistName.trim() && styles.createButtonDisabled]}
                onPress={createPlaylist}
                disabled={!newPlaylistName.trim() || isCreatingPlaylist}
              >
                {isCreatingPlaylist ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="add" size={20} color="#ffffff" />
                    <Text style={styles.createButtonText}>Create</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Existing Playlists */}
            <Text style={styles.playlistsLabel}>Your Playlists</Text>
            <ScrollView style={styles.playlistsList}>
              {playlists.length === 0 ? (
                <Text style={styles.emptyText}>No playlists yet. Create one above!</Text>
              ) : (
                playlists.map(playlist => (
                  <TouchableOpacity
                    key={playlist.id}
                    style={styles.playlistItem}
                    onPress={() => addToPlaylist(playlist.id)}
                  >
                    <View style={styles.playlistIcon}>
                      <Ionicons name="musical-notes" size={20} color="#8b5cf6" />
                    </View>
                    <View style={styles.playlistInfo}>
                      <Text style={styles.playlistTitle}>{playlist.title}</Text>
                      <Text style={styles.playlistCount}>
                        {playlist.song_count} {playlist.song_count === 1 ? 'song' : 'songs'}
                      </Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={24} color="#8b5cf6" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  youtubeAttributionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
    paddingVertical: 6,
  },
  youtubeAttributionText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  addToPlaylistButton: {
    padding: 0,
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
  // Tab styles
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
  // Playlists tab styles
  playlistsTab: {
    flex: 1,
    backgroundColor: '#111827',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptySubtext: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  createPlaylistCard: {
    backgroundColor: '#1f2937',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  createPlaylistTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  playlistsScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  playlistCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  playlistCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  playlistCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistCardInfo: {
    flex: 1,
  },
  playlistCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  playlistCardDescription: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
  playlistCardCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  deletePlaylistButton: {
    padding: 12,
    marginLeft: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 20,
  },
  createPlaylistSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  playlistInput: {
    flex: 1,
    backgroundColor: '#374151',
    color: '#ffffff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  playlistsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  playlistsList: {
    maxHeight: 300,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  playlistIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  playlistCount: {
    color: '#9ca3af',
    fontSize: 12,
  },
});