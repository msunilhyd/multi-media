import { Audio, AVPlaybackStatus } from 'expo-av';
import { Song } from '../types/playlist';

const API_URL = 'http://192.168.0.18:8000'; // Your local backend - update if different

interface AudioStreamResponse {
  audioUrl: string;
  title: string;
  duration: number;
  videoId: string;
  startSeconds?: number;
  endSeconds?: number;
}

export class AudioService {
  private sound: Audio.Sound | null = null;
  private currentSong: Song | null = null;
  private isPlaying: boolean = false;
  private onStatusUpdate?: (status: AVPlaybackStatus) => void;

  constructor() {
    // Configure audio session for background playback
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true, // ✅ Key for background playback
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false
    });
  }

  // Get audio stream URL from your backend
  private async getAudioStreamUrl(song: Song): Promise<AudioStreamResponse> {
    const params = new URLSearchParams();
    if (song.startSeconds) params.append('start_seconds', song.startSeconds.toString());
    if (song.endSeconds) params.append('end_seconds', song.endSeconds.toString());
    
    const url = `${API_URL}/api/audio/stream/${song.videoId}${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to get audio stream: ${response.statusText}`);
    }
    
    return await response.json();
  }

  // Play a song with true background support
  async playSong(song: Song): Promise<void> {
    try {
      // Stop current song if playing
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      console.log(`Loading audio for: ${song.title}`);
      
      // Get audio stream URL from backend
      const audioData = await this.getAudioStreamUrl(song);
      
      console.log(`Got audio URL, loading...`);

      // Create and load sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioData.audioUrl },
        { 
          shouldPlay: true,
          positionMillis: song.startSeconds ? song.startSeconds * 1000 : 0,
          isLooping: false,
        },
        this.onPlaybackStatusUpdate.bind(this)
      );

      this.sound = sound;
      this.currentSong = song;
      this.isPlaying = true;
      
      console.log(`✅ Now playing: ${song.title} (Background enabled)`);

    } catch (error) {
      console.error('Error playing song:', error);
      throw error;
    }
  }

  async pauseAsync(): Promise<void> {
    if (this.sound && this.isPlaying) {
      await this.sound.pauseAsync();
      this.isPlaying = false;
    }
  }

  async resumeAsync(): Promise<void> {
    if (this.sound && !this.isPlaying) {
      await this.sound.playAsync();
      this.isPlaying = true;
    }
  }

  async stopAsync(): Promise<void> {
    if (this.sound) {
      await this.sound.stopAsync();
      this.isPlaying = false;
    }
  }

  async unloadAsync(): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
      this.currentSong = null;
      this.isPlaying = false;
    }
  }

  // Set up status listener
  setOnStatusUpdate(callback: (status: AVPlaybackStatus) => void) {
    this.onStatusUpdate = callback;
  }

  private onPlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (this.onStatusUpdate) {
      this.onStatusUpdate(status);
    }
    
    if (status.isLoaded) {
      this.isPlaying = status.isPlaying;
    }
  }

  // Getters
  getCurrentSong(): Song | null {
    return this.currentSong;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// Global instance
export const audioService = new AudioService();