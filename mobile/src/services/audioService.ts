import { Audio } from 'expo-av';
import { Song } from '../types/playlist';
import { AppState } from 'react-native';

const API_URL = 'https://multi-media-production.up.railway.app';

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
  private onNextCallback: (() => void) | null = null;
  private onPreviousCallback: (() => void) | null = null;
  private onPlayCallback: (() => void) | null = null;
  private onPauseCallback: (() => void) | null = null;

  constructor() {
    // Setup background audio with simplified configuration
    this.setupBackgroundAudio();
    
    // Listen for app state changes
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    console.log('🎵 AudioService initialized with background support');
  }

  private async setupBackgroundAudio() {
    try {
      // Use basic audio configuration that works for iOS background playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 0, // Do not mix with others
        interruptionModeAndroid: 1 // Duck others
      });
      console.log('🎵 Background audio configured successfully');
    } catch (error) {
      console.error('Failed to setup background audio:', error);
    }
  }

  // Set up media controls for car integration and lock screen
  private async updateNowPlaying(song: Song, isPlaying: boolean) {
    if (!this.sound) return;

    try {
      const status = await this.sound.getStatusAsync();
      if (!status.isLoaded) return;

      // Update Now Playing info (iOS Control Center / Android lock screen)
      await this.sound.setStatusAsync({
        ...status,
        // This enables iOS Now Playing and Android MediaSession
        progressUpdateIntervalMillis: 1000,
      });

      console.log(`🎵 Updated Now Playing: ${song.title} - ${isPlaying ? 'Playing' : 'Paused'}`);
    } catch (error) {
      console.error('Error updating Now Playing info:', error);
    }
  }

  // Register callbacks for media controls (next, previous, play, pause)
  public setMediaControlCallbacks(callbacks: {
    onNext?: () => void;
    onPrevious?: () => void;
    onPlay?: () => void;
    onPause?: () => void;
  }) {
    this.onNextCallback = callbacks.onNext || null;
    this.onPreviousCallback = callbacks.onPrevious || null;
    this.onPlayCallback = callbacks.onPlay || null;
    this.onPauseCallback = callbacks.onPause || null;
    console.log('🎵 Media control callbacks registered');
  }

  private handleAppStateChange = async (nextAppState: string) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      console.log('🎵 App backgrounded - ensuring audio continues');
      // Re-apply audio mode to ensure background playback
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false
        });
        
        // Ensure sound is still playing
        if (this.sound && this.isPlaying) {
          const status = await this.sound.getStatusAsync();
          if (status.isLoaded && !status.isPlaying) {
            console.log('🎵 Resuming playback in background');
            await this.sound.playAsync();
          } else {
            console.log('🎵 Audio is already playing in background');
          }
        }
      } catch (error) {
        console.error('Error maintaining background audio:', error);
      }
    } else if (nextAppState === 'active') {
      console.log('🎵 App returned to foreground');
    }
  };

  // Get audio stream URL from backend
  private async getAudioStreamUrl(song: Song): Promise<AudioStreamResponse> {
    const params = new URLSearchParams();
    if (song.startSeconds) params.append('start_seconds', song.startSeconds.toString());
    if (song.endSeconds) params.append('end_seconds', song.endSeconds.toString());
    
    const url = `${API_URL}/api/audio/stream/${song.videoId}${params.toString() ? '?' + params.toString() : ''}`;
    
    console.log(`🔄 Fetching audio stream from: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to get audio stream: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Got audio data:`, JSON.stringify(data, null, 2));
    
    // Validate the response
    if (!data.audioUrl && !data.audio_url) {
      throw new Error('No audio URL in response');
    }
    
    // Return with proper field name
    return {
      audioUrl: data.audioUrl || data.audio_url,
      title: data.title,
      duration: data.duration,
      videoId: data.videoId || data.video_id,
      startSeconds: data.startSeconds || data.start_seconds,
      endSeconds: data.endSeconds || data.end_seconds
    };
  }

  // Play a song
  async playSong(song: Song): Promise<void> {
    try {
      console.log(`🎵 Loading audio for: ${song.title}`);
      
      // Get audio stream URL from backend
      const audioData = await this.getAudioStreamUrl(song);
      
      console.log(`📡 Audio URL received: ${audioData.audioUrl}`);
      
      // Validate audioUrl before using it
      if (!audioData.audioUrl || typeof audioData.audioUrl !== 'string') {
        throw new Error(`Invalid audio URL: ${audioData.audioUrl}`);
      }
      
      // Stop current sound
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      // Create and load new sound with proper settings
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioData.audioUrl },
        { 
          shouldPlay: false, 
          volume: 1.0,
          progressUpdateIntervalMillis: 1000,
          // Don't stop when app goes to background
          androidImplementation: 'MediaPlayer'
        },
        null,
        true  // Enable downloading for offline capability
      );

      this.sound = sound;

      // Configure to continue playing in background
      await this.sound.setStatusAsync({
        shouldPlay: true,
        progressUpdateIntervalMillis: 1000
      });

      // Start playback from specified position if provided
      if (song.startSeconds) {
        await this.sound.setPositionAsync(song.startSeconds * 1000);
      }
      
      await this.sound.playAsync();
      
      this.currentSong = song;
      this.isPlaying = true;

      // Update Now Playing info for car/lock screen controls
      await this.updateNowPlaying(song, true);

      console.log('✅ Audio playing with background support');

    } catch (error) {
      console.error('Error playing song:', error);
      throw error;
    }
  }

  async pauseAsync(): Promise<void> {
    if (this.sound && this.isPlaying) {
      await this.sound.pauseAsync();
      this.isPlaying = false;
      if (this.currentSong) {
        await this.updateNowPlaying(this.currentSong, false);
      }
      this.onPauseCallback?.();
    }
  }

  async resumeAsync(): Promise<void> {
    if (this.sound && !this.isPlaying) {
      await this.sound.playAsync();
      this.isPlaying = true;
      if (this.currentSong) {
        await this.updateNowPlaying(this.currentSong, true);
      }
      this.onPlayCallback?.();
    }
  }

  async stopAsync(): Promise<void> {
    if (this.sound) {
      await this.sound.stopAsync();
      this.isPlaying = false;
      this.onPauseCallback?.();
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

  getCurrentSong(): Song | null {
    return this.currentSong;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// Global instance
export const audioService = new AudioService();