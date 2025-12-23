import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator
} from 'react-native';
import { AVPlaybackStatus } from 'expo-av';
import { audioService } from '../services/audioService';
import { Song, samplePlaylist } from '../types/playlist';

export default function MusicPlayerScreen() {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // Listen to playback status
    audioService.setOnStatusUpdate((status: AVPlaybackStatus) => {
      if (status.isLoaded) {
        setIsPlaying(status.isPlaying);
        setPosition(status.positionMillis || 0);
        setDuration(status.durationMillis || 0);
      }
    });

    return () => {
      audioService.unloadAsync();
    };
  }, []);

  const playSong = async (song: Song) => {
    try {
      setIsLoading(true);
      await audioService.playSong(song);
      setCurrentSong(song);
    } catch (error) {
      Alert.alert('Error', `Failed to play ${song.title}`);
      console.error('Play error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    try {
      if (isPlaying) {
        await audioService.pauseAsync();
      } else {
        await audioService.resumeAsync();
      }
    } catch (error) {
      console.error('Toggle play/pause error:', error);
    }
  };

  const formatTime = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderSongItem = ({ item }: { item: Song }) => (
    <TouchableOpacity
      style={[
        styles.songItem,
        currentSong?.id === item.id && styles.currentSongItem
      ]}
      onPress={() => playSong(item)}
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
        <Text style={styles.title}>{samplePlaylist.title}</Text>
        <Text style={styles.subtitle}>Background Audio Streaming</Text>
      </View>

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
              style={styles.controlButton} 
              onPress={togglePlayPause}
              disabled={isLoading}
            >
              <Text style={styles.controlButtonText}>
                {isLoading ? '...' : isPlaying ? '⏸️' : '▶️'}
              </Text>
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
      <FlatList
        data={samplePlaylist.songs}
        renderItem={renderSongItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.songList}
      />
      
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
    padding: 20,
    alignItems: 'center',
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
    alignItems: 'center',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 20,
    color: '#ffffff',
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
});