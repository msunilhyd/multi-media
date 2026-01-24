import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { fetchEntertainment, type Entertainment } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PLAYER_HEIGHT = SCREEN_WIDTH * 9 / 16; // 16:9 aspect ratio

export default function EntertainmentScreen() {
  const { token } = useAuth();
  const playerRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const isFocusedRef = useRef(true);
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isManualPauseRef = useRef(false);
  const [entertainmentItems, setEntertainmentItems] = useState<Entertainment[]>([]);
  const [currentItem, setCurrentItem] = useState<Entertainment | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true); // Start as true to autoplay
  const [isReady, setIsReady] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'default' | 'user-playlists'>('default');

  useEffect(() => {
    loadEntertainment();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }
      if (timeCheckIntervalRef.current) {
        clearInterval(timeCheckIntervalRef.current);
      }
    };
  }, []);

  // Pause YouTube when navigating away from Fun tab
  useFocusEffect(
    React.useCallback(() => {
      // Screen is focused
      console.log('🎬 Fun tab focused');
      isFocusedRef.current = true;
      return () => {
        // Screen is unfocused - stop playback completely
        console.log('🎬 Fun tab unfocused - stopping YouTube playback');
        isFocusedRef.current = false;
        
        // Stop playing immediately
        setIsPlaying(false);
        setIsReady(false);
        
        // Clear any pending timeouts
        if (playbackTimeoutRef.current) {
          clearTimeout(playbackTimeoutRef.current);
          playbackTimeoutRef.current = null;
        }
        
        // Force pause the player through ref
        setTimeout(() => {
          if (playerRef.current) {
            try {
              console.log('🎬 Calling pauseVideo on player ref');
              // Try multiple methods to stop the video
              if (typeof playerRef.current.pauseVideo === 'function') {
                playerRef.current.pauseVideo();
              }
              if (typeof playerRef.current.stopVideo === 'function') {
                playerRef.current.stopVideo();
              }
              if (typeof playerRef.current.seekTo === 'function') {
                playerRef.current.seekTo(0);
              }
            } catch (error) {
              console.log('Error stopping video:', error);
            }
          }
        }, 100);
      };
    }, [])
  );

  const loadEntertainment = async () => {
    try {
      setLoading(true);
      const data = await fetchEntertainment();
      console.log('Loaded entertainment items:', data?.length || 0);
      
      if (!data || !Array.isArray(data)) {
        console.error('Invalid data format from API');
        setEntertainmentItems([]);
        setCurrentItem(null);
        return;
      }
      
      // Filter out any invalid items
      const validData = data.filter(item => 
        item && 
        item.id && 
        item.youtube_video_id && 
        typeof item.youtube_video_id === 'string'
      );
      
      setEntertainmentItems(validData);
      if (validData.length > 0) {
        setCurrentItem(validData[0]);
        setCurrentIndex(0);
      } else {
        setCurrentItem(null);
      }
    } catch (error) {
      console.error('Failed to load entertainment:', error);
      setEntertainmentItems([]);
      setCurrentItem(null);
      Alert.alert('Error', 'Failed to load entertainment content. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const togglePlayPause = () => {
    console.log('Toggle play/pause, current state:', isPlaying);
    isManualPauseRef.current = !isPlaying; // Set to true if pausing
    setIsPlaying(!isPlaying);
  };

  const playItem = (item: Entertainment, index: number) => {
    setCurrentItem(item);
    setCurrentIndex(index);
    setIsReady(false);
    setIsPlaying(true);
    setHasStartedPlaying(false);
    
    // Clear any existing timeout
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
    }
    
    // Set timeout to skip to next video if it doesn't start playing within 10 seconds
    playbackTimeoutRef.current = setTimeout(() => {
      console.log('⏱️ Video timeout - skipping to next video');
      playNext();
    }, 10000);
    
    // Safely scroll to index with error handling for iPad
    setTimeout(() => {
      try {
        if (flatListRef.current && entertainmentItems.length > 0 && index >= 0 && index < entertainmentItems.length) {
          // Ensure layout is calculated before scrolling
          flatListRef.current.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.5,
          });
        }
      } catch (error) {
        console.log('Scroll to index failed:', error);
        // Fallback to scrollToOffset - safer for varying screen sizes
        try {
          if (flatListRef.current) {
            flatListRef.current.scrollToOffset({
              offset: index * 88, // Approximate item height
              animated: true,
            });
          }
        } catch (fallbackError) {
          console.log('Scroll fallback also failed, ignoring');
        }
      }
    }, 200);
  };

  const playNext = () => {
    if (entertainmentItems.length === 0) return;
    const nextIndex = (currentIndex + 1) % entertainmentItems.length;
    playItem(entertainmentItems[nextIndex], nextIndex);
  };

  const playPrevious = () => {
    if (entertainmentItems.length === 0) return;
    const prevIndex = currentIndex === 0 ? entertainmentItems.length - 1 : currentIndex - 1;
    playItem(entertainmentItems[prevIndex], prevIndex);
  };

  const renderTabNavigation = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'default' && styles.activeTab]}
        onPress={() => setActiveTab('default')}
      >
        <Text style={[styles.tabText, activeTab === 'default' && styles.activeTabText]}>
          All Videos ({entertainmentItems.length})
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
  );

  const renderItem = ({ item, index }: { item: Entertainment; index: number }) => {
    const isCurrentItem = currentItem?.id === item.id;
    
    return (
      <TouchableOpacity
        style={[styles.songCard, isCurrentItem && styles.currentSongCard]}
        onPress={() => playItem(item, index)}
      >
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        {isCurrentItem && isPlaying && (
          <Ionicons name="volume-high" size={20} color="#3b82f6" />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading entertainment...</Text>
      </View>
    );
  }

  if (activeTab === 'user-playlists') {
    return (
      <View style={styles.container}>
        {renderTabNavigation()}
        <View style={styles.centerContainer}>
          <Ionicons name="list" size={48} color="#64748b" />
          <Text style={styles.comingSoonText}>User Playlists</Text>
          <Text style={styles.comingSoonSubtext}>
            Create and manage your entertainment playlists
          </Text>
        </View>
      </View>
    );
  }

  // Show empty state if no entertainment items
  if (entertainmentItems.length === 0) {
    return (
      <View style={styles.container}>
        {renderTabNavigation()}
        <View style={styles.centerContainer}>
          <Ionicons name="videocam-off" size={64} color="#64748b" />
          <Text style={styles.comingSoonText}>No Videos Available</Text>
          <Text style={styles.comingSoonSubtext}>
            Entertainment videos will appear here when available
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadEntertainment}
          >
            <Ionicons name="refresh" size={20} color="#ffffff" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderTabNavigation()}
      
      {/* Video Player */}
      {currentItem && currentItem.youtube_video_id && (
        <>
          <YoutubePlayer
            key={currentItem.id}
            ref={playerRef}
            height={PLAYER_HEIGHT}
            play={isPlaying}
            videoId={currentItem.youtube_video_id}
            initialPlayerParams={{
              start: currentItem.start_seconds || undefined,
              end: currentItem.end_seconds || undefined,
              controls: true,
              modestbranding: false,
            }}
            onChangeState={(state: string) => {
              console.log('Entertainment player state:', state);
              if (!currentItem) {
                console.log('No current item, skipping state change');
                return;
              }
              console.log('Current item:', currentItem.title);
              console.log('Has end_seconds:', currentItem.end_seconds);
              console.log('Has started playing:', hasStartedPlaying);
              
              if (state === 'ended') {
                console.log('🎬 Video ended - auto-playing next video');
                setTimeout(() => {
                  playNext();
                }, 500);
              } else if (state === 'paused' && hasStartedPlaying && currentItem.end_seconds) {
                // When video has end_seconds, YouTube pauses at that time instead of firing 'ended'
                console.log('🎬 Video paused at end_seconds - auto-playing next video');
                setTimeout(() => {
                  playNext();
                }, 500);
              } else if (state === 'playing') {
                setIsPlaying(true);
                setHasStartedPlaying(true);
                if (playbackTimeoutRef.current) {
                  clearTimeout(playbackTimeoutRef.current);
                  playbackTimeoutRef.current = null;
                }
              }
            }}
            onReady={() => {
              if (!currentItem) {
                console.log('No current item on ready');
                return;
              }
              console.log('Entertainment player ready for:', currentItem.title);
              setIsReady(true);
              // Seek to start time if specified, or seek to 0 to trigger playback
              setTimeout(() => {
                try {
                  const startTime = currentItem.start_seconds || 0;
                  console.log('Seeking to:', startTime);
                  playerRef.current?.seekTo(startTime);
                } catch (error) {
                  console.log('Error seeking:', error);
                }
              }, 100);
            }}
            onError={(error: string) => {
              console.log('❌ Entertainment player error');
              console.log('Error details:', error);
              if (currentItem) {
                console.log('Current item:', currentItem.title);
                console.log('Video ID:', currentItem.youtube_video_id);
              }
              // Clear any existing timeout
              if (playbackTimeoutRef.current) {
                clearTimeout(playbackTimeoutRef.current);
                playbackTimeoutRef.current = null;
              }
              // Skip to next video immediately if video is unavailable or any error occurs
              console.log('⏭️ Skipping to next video due to error');
              playNext();
            }}
            webViewProps={{
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false,
            }}
          />

          <View style={styles.nowPlaying}>
            <Text style={styles.nowPlayingLabel}>NOW PLAYING</Text>
            <Text style={styles.nowPlayingTitle} numberOfLines={2}>
              {currentItem.title}
            </Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity onPress={playPrevious} style={styles.controlButton}>
              <Ionicons name="play-skip-back" size={32} color="#e2e8f0" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={togglePlayPause}
              style={[styles.controlButton, styles.playButton]}
              disabled={!isReady}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={36}
                color="#ffffff"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={playNext} style={styles.controlButton}>
              <Ionicons name="play-skip-forward" size={32} color="#e2e8f0" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Playlist */}
      <View style={styles.playlistSection}>
        <View style={styles.playlistHeader}>
          <Text style={styles.playlistTitle}>
            Entertainment Videos ({entertainmentItems.length})
          </Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={entertainmentItems}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          onScrollToIndexFailed={(info) => {
            console.log('Scroll to index failed:', info);
            // Wait a bit and try scrolling to the offset instead
            setTimeout(() => {
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            }, 100);
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: '#94a3b8',
    fontSize: 16,
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
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  playerSection: {
    backgroundColor: '#1e293b',
    paddingBottom: 20,
    width: '100%',
  },
  playerContainer: {
    width: '100%',
    backgroundColor: '#000',
  },
  nowPlaying: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: '#1e293b',
    width: '100%',
  },
  nowPlayingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 4,
  },
  nowPlayingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 24,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 32,
    backgroundColor: '#1e293b',
    width: '100%',
  },
  controlButton: {
    padding: 12,
  },
  playButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 40,
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistSection: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  playlistHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  playlistTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 12,
  },
  currentSongCard: {
    backgroundColor: '#1e3a8a',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  songInfo: {
    flex: 1,
    marginRight: 12,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 20,
  },
  comingSoonText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  comingSoonSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
