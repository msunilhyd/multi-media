import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { fetchEntertainment, type Entertainment } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function EntertainmentScreen() {
  const { token } = useAuth();
  const playerRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const shouldAutoplayRef = useRef(false);
  const [entertainmentItems, setEntertainmentItems] = useState<Entertainment[]>([]);
  const [currentItem, setCurrentItem] = useState<Entertainment | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'default' | 'user-playlists'>('default');

  useEffect(() => {
    loadEntertainment();
  }, []);

  const loadEntertainment = async () => {
    try {
      setLoading(true);
      const data = await fetchEntertainment();
      setEntertainmentItems(data);
      if (data.length > 0) {
        setCurrentItem(data[0]);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Failed to load entertainment:', error);
      Alert.alert('Error', 'Failed to load entertainment content');
    } finally {
      setLoading(false);
    }
  };

  const togglePlayPause = () => {
    console.log('Toggle play/pause, current state:', isPlaying);
    setIsPlaying(!isPlaying);
  };

  const playItem = (item: Entertainment, index: number) => {
    setCurrentItem(item);
    setCurrentIndex(index);
    setIsReady(false);
    setIsPlaying(true);
    
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    }, 100);
  };

  const playNext = () => {
    const nextIndex = (currentIndex + 1) % entertainmentItems.length;
    playItem(entertainmentItems[nextIndex], nextIndex);
  };

  const playPrevious = () => {
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

  return (
    <View style={styles.container}>
      {renderTabNavigation()}
      
      {/* Video Player */}
      {currentItem && (
        <View style={styles.playerSection}>
          <View style={styles.playerContainer}>
            <YoutubePlayer
              ref={playerRef}
              height={220}
              play={isPlaying}
              videoId={currentItem.youtube_video_id}
              onReady={() => {
                console.log('Entertainment player ready for:', currentItem.title);
                setIsReady(true);
              }}
              onChangeState={(state: string) => {
                console.log('Entertainment player state:', state);
                if (state === 'ended') {
                  playNext();
                } else if (state === 'playing') {
                  setIsPlaying(true);
                } else if (state === 'paused') {
                  setIsPlaying(false);
                }
              }}
              webViewProps={{
                androidLayerType: 'hardware',
              }}
            />
              onChangeState={(state: string) => {
                console.log('Entertainment player state:', state);
                if (state === 'ended') {
                  playNext();
                } else if (state === 'playing') {
                  setIsPlaying(true);
                } else if (state === 'paused') {
                  setIsPlaying(false);
                }
              }}
              webViewProps={{
                androidLayerType: 'hardware',
              }}
            />
          </View>

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
        </View>
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
  },
  playerContainer: {
    width: '100%',
    backgroundColor: '#000',
  },
  nowPlaying: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
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
    gap: 32,
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
});
