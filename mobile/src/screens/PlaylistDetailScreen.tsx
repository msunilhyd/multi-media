import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../services/api';

interface Song {
  id: number;
  title: string;
  language: string;
  year: string | null;
  composer: string;
  videoId: string;
  movie: string | null;
  startSeconds: number | null;
  endSeconds: number | null;
  position: number;
}

interface PlaylistDetail {
  id: number;
  title: string;
  description: string | null;
  is_public: boolean;
  playlist_type: string;
  created_at: string;
  updated_at: string;
  song_count: number;
  songs: Song[];
}

export default function PlaylistDetailScreen({ route, navigation }: any) {
  const { playlistId, playlistTitle } = route.params;
  const { token } = useAuth();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffleOn, setIsShuffleOn] = useState(false);

  const deletePlaylist = () => {
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
              const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              
              if (!response.ok) {
                throw new Error('Failed to delete playlist');
              }
              
              Alert.alert('Success', 'Playlist deleted', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error: any) {
              console.error('Error deleting playlist:', error);
              Alert.alert('Error', 'Failed to delete playlist');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    navigation.setOptions({
      title: playlistTitle,
      headerRight: () => (
        <TouchableOpacity
          onPress={deletePlaylist}
          style={{ marginRight: 16 }}
        >
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      ),
    });
  }, [playlistTitle, navigation]);

  const fetchPlaylistDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch playlist');
      }
      
      const data = await response.json();
      setPlaylist(data);
    } catch (error: any) {
      console.error('Error fetching playlist details:', error);
      Alert.alert('Error', 'Failed to load playlist');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (token) {
        fetchPlaylistDetails();
      }
      
      // Cleanup when screen loses focus (user navigates away)
      return () => {
        // Optional: Stop playback when leaving the playlist detail screen
        // Uncomment if you want to stop music when navigating away
        // audioService.pauseAsync();
      };
    }, [playlistId, token])
  );

  const playSong = async (song: Song, index: number) => {
    try {
      setCurrentSong(song);
      setCurrentIndex(index);
      setIsPlaying(false);
      
      // Open YouTube official app/web for the song
      const youtubeUrl = `https://www.youtube.com/watch?v=${song.videoId}`;
      Alert.alert(
        'Opening YouTube',
        `Now playing: ${song.title}\n\nOpening YouTube to play this song.`,
        [{ text: 'OK', onPress: async () => await Linking.openURL(youtubeUrl) }]
      );
    } catch (error) {
      console.error('Error opening YouTube:', error);
      Alert.alert('Error', 'Unable to open YouTube');
    }
  };

  const togglePlayPause = async () => {
    if (currentSong) {
      const youtubeUrl = `https://www.youtube.com/watch?v=${currentSong.videoId}`;
      try {
        await Linking.openURL(youtubeUrl);
      } catch (error) {
        console.error('Error opening YouTube:', error);
        Alert.alert('Error', 'Unable to open YouTube');
      }
    }
  };

  const playNext = async () => {
    if (!playlist || playlist.songs.length === 0) return;
    
    let nextIndex: number;
    
    if (isShuffleOn) {
      do {
        nextIndex = Math.floor(Math.random() * playlist.songs.length);
      } while (nextIndex === currentIndex && playlist.songs.length > 1);
    } else {
      nextIndex = (currentIndex + 1) % playlist.songs.length;
    }
    
    const nextSong = playlist.songs[nextIndex];
    await playSong(nextSong, nextIndex);
  };

  const playPrevious = async () => {
    if (!playlist || playlist.songs.length === 0) return;
    
    const prevIndex = currentIndex === 0 
      ? playlist.songs.length - 1 
      : currentIndex - 1;
    
    const prevSong = playlist.songs[prevIndex];
    await playSong(prevSong, prevIndex);
  };

  const toggleShuffle = () => {
    setIsShuffleOn(!isShuffleOn);
  };

  const removeSongFromPlaylist = async (songId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/songs/${songId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove song');
      }
      
      Alert.alert('Success', 'Song removed from playlist');
      fetchPlaylistDetails(); // Refresh the list
    } catch (error: any) {
      console.error('Error removing song:', error);
      Alert.alert('Error', 'Failed to remove song');
    }
  };

  const confirmRemoveSong = (songId: number, songTitle: string) => {
    Alert.alert(
      'Remove Song',
      `Remove "${songTitle}" from this playlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeSongFromPlaylist(songId) },
      ]
    );
  };

  const renderSongItem = ({ item }: { item: Song }) => (
    <View style={styles.songItemContainer}>
      <TouchableOpacity
        style={[
          styles.songItem,
          currentSong?.id === item.id && styles.currentSongItem,
        ]}
        onPress={() => playSong(item, item.position)}
      >
        <View style={styles.songInfo}>
          <Text
            style={[
              styles.songTitle,
              currentSong?.id === item.id && styles.currentSongTitle,
            ]}
          >
            {item.title}
          </Text>
          <Text style={styles.songDetails}>
            {item.composer} • {item.language}
            {item.year && ` • ${item.year}`}
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
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => confirmRemoveSong(item.id, item.title)}
      >
        <Ionicons name="trash-outline" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading playlist...</Text>
      </View>
    );
  }

  if (!playlist) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="musical-notes-outline" size={64} color="#666" />
        <Text style={styles.emptyText}>Playlist not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Playlist Header */}
      <View style={styles.header}>
        <Text style={styles.playlistTitle}>{playlist.title}</Text>
        {playlist.description && (
          <Text style={styles.playlistDescription}>{playlist.description}</Text>
        )}
        <Text style={styles.songCount}>
          {playlist.song_count} {playlist.song_count === 1 ? 'song' : 'songs'}
        </Text>
      </View>

      {/* Song List */}
      {playlist.songs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No songs in this playlist</Text>
          <Text style={styles.emptySubtext}>
            Add songs from the Audio section
          </Text>
        </View>
      ) : (
        <FlatList
          data={playlist.songs}
          renderItem={renderSongItem}
          keyExtractor={(item) => `${item.id}-${item.position}`}
          style={styles.songList}
          contentContainerStyle={{ paddingBottom: currentSong ? 100 : 20 }}
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
            >
              <Ionicons name="play-skip-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.bottomPlayButton} 
              onPress={togglePlayPause}
            >
              <Ionicons 
                name="play" 
                size={28} 
                color="#ffffff" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.bottomNavButton} 
              onPress={playNext}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  loadingText: {
    marginTop: 10,
    color: '#9ca3af',
    fontSize: 14,
  },
  header: {
    padding: 20,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  playlistTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  playlistDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  songCount: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  songList: {
    flex: 1,
  },
  songItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 8,
  },
  songItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  currentSongItem: {
    backgroundColor: '#2d1f47',
  },
  songInfo: {
    flex: 1,
    marginRight: 10,
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
  },
  playingIconContainer: {
    padding: 8,
  },
  deleteButton: {
    padding: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
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
    flexDirection: 'column',
    alignItems: 'center',
  },
  youtubeAttributionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
    paddingVertical: 4,
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
    width: '100%',
  },
  bottomNavButton: {
    padding: 10,
  },
  bottomPlayButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    width: 20,
  },
});
