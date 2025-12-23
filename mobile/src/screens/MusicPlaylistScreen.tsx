import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { defaultPlaylist, Song } from '../data/playlists';

export default function MusicPlaylistScreen() {
  const [currentSong, setCurrentSong] = useState<Song | null>(defaultPlaylist[0] || null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const playSong = (song: Song, index: number) => {
    setCurrentSong(song);
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  const playNext = () => {
    const nextIndex = (currentIndex + 1) % defaultPlaylist.length;
    const nextSong = defaultPlaylist[nextIndex];
    setCurrentIndex(nextIndex);
    setCurrentSong(nextSong);
    setIsPlaying(true);
  };

  const playPrevious = () => {
    const prevIndex = currentIndex === 0 ? defaultPlaylist.length - 1 : currentIndex - 1;
    const prevSong = defaultPlaylist[prevIndex];
    setCurrentIndex(prevIndex);
    setCurrentSong(prevSong);
    setIsPlaying(true);
  };

  const renderSongItem = ({ item, index }: { item: Song; index: number }) => (
    <TouchableOpacity
      style={[
        styles.songItem,
        currentSong?.id === item.id && styles.songItemActive,
      ]}
      onPress={() => playSong(item, index)}
    >
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.songDetails}>
          {item.composer} • {item.year} • {item.language}
        </Text>
      </View>
      {currentSong?.id === item.id && isPlaying && (
        <Ionicons name="volume-high" size={20} color="#3b82f6" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="musical-notes" size={32} color="#3b82f6" />
        <Text style={styles.headerTitle}>Music Playlist</Text>
      </View>

      <FlatList
        data={defaultPlaylist}
        renderItem={renderSongItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 280 }
        ]}
      />

      <View style={styles.playerContainer}>
        <View style={styles.playerWrapper}>
          <YoutubePlayer
            height={150}
            play={isPlaying}
            videoId={currentSong?.videoId || defaultPlaylist[0]?.videoId}
            onChangeState={(state) => {
              if (state === 'ended') {
                playNext();
              }
            }}
            webViewStyle={{ opacity: 0.99 }}
            webViewProps={{
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false,
            }}
          />
        </View>

        <View style={styles.songInfoContainer}>
          <Text style={styles.modalSongTitle} numberOfLines={1}>
            {currentSong?.title || 'Select a song'}
          </Text>
          <Text style={styles.modalSongDetails} numberOfLines={1}>
            {currentSong ? `${currentSong.composer} • ${currentSong.movie}` : 'No song playing'}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity onPress={playPrevious} style={styles.controlButton}>
            <Ionicons name="play-skip-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setIsPlaying(!isPlaying)}
            style={styles.playButton}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color="#ffffff"
            />
          </TouchableOpacity>
            
          <TouchableOpacity onPress={playNext} style={styles.controlButton}>
            <Ionicons name="play-skip-forward" size={28} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1f2937',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
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
    borderLeftColor: '#3b82f6',
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
  songDetails: {
    fontSize: 11,
    color: '#9ca3af',
  },
  playerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1f2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  playerWrapper: {
    width: '100%',
    backgroundColor: '#000000',
  },
  songInfoContainer: {
    padding: 8,
    alignItems: 'center',
  },
  modalSongTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 2,
  },
  modalSongDetails: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: 32,
    gap: 32,
  },
  controlButton: {
    padding: 4,
  },
  playButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 28,
    padding: 10,
  },
});
