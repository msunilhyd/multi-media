import TrackPlayer, {
  Event,
  State,
  Capability,
  RepeatMode,
  Track,
} from 'react-native-track-player';
import { Song } from '../types/playlist';

const API_URL = 'https://multi-media-production.up.railway.app';

interface AudioStreamResponse {
  audioUrl: string;
  title: string;
  duration: number;
  videoId: string;
  startSeconds?: number;
  endSeconds?: number;
}

export class TrackPlayerService {
  private static instance: TrackPlayerService;
  private isSetup = false;
  private onNextCallback: (() => void) | null = null;
  private onPreviousCallback: (() => void) | null = null;

  private constructor() {}

  static getInstance(): TrackPlayerService {
    if (!TrackPlayerService.instance) {
      TrackPlayerService.instance = new TrackPlayerService();
    }
    return TrackPlayerService.instance;
  }

  async setup(): Promise<void> {
    if (this.isSetup) return;

    try {
      // Check if already initialized
      const state = await TrackPlayer.getState().catch(() => null);
      if (state !== null) {
        this.isSetup = true;
        console.log('🎵 TrackPlayer already initialized');
        return;
      }

      await TrackPlayer.setupPlayer({
        waitForBuffer: true,
      });

      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.Stop,
          Capability.SeekTo,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        progressUpdateEventInterval: 1,
      });

      this.isSetup = true;
      console.log('🎵 TrackPlayer setup complete with car controls');
    } catch (error) {
      console.error('Failed to setup TrackPlayer:', error);
      // Don't throw - allow app to continue with fallback audio
      this.isSetup = false;
    }
  }

  // Register service handler for remote controls
  static async registerPlaybackService() {
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
    
    TrackPlayer.addEventListener(Event.RemoteNext, () => {
      const instance = TrackPlayerService.getInstance();
      if (instance.onNextCallback) {
        console.log('🎵 Car Next button pressed');
        instance.onNextCallback();
      }
    });
    
    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
      const instance = TrackPlayerService.getInstance();
      if (instance.onPreviousCallback) {
        console.log('🎵 Car Previous button pressed');
        instance.onPreviousCallback();
      }
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
      await TrackPlayer.seekTo(event.position);
    });

    console.log('🎵 Playback service registered for car controls');
  }

  // Set callbacks for next/previous buttons
  setNavigationCallbacks(onNext: () => void, onPrevious: () => void) {
    this.onNextCallback = onNext;
    this.onPreviousCallback = onPrevious;
    console.log('🎵 Navigation callbacks set for car controls');
  }

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
    console.log(`✅ Got audio data for track player`);
    
    if (!data.audioUrl && !data.audio_url) {
      throw new Error('No audio URL in response');
    }
    
    return {
      audioUrl: data.audioUrl || data.audio_url,
      title: data.title,
      duration: data.duration,
      videoId: data.videoId || data.video_id,
      startSeconds: data.startSeconds || data.start_seconds,
      endSeconds: data.endSeconds || data.end_seconds
    };
  }

  async playSong(song: Song): Promise<void> {
    try {
      if (!this.isSetup) {
        await this.setup();
      }

      console.log(`🎵 Loading song for TrackPlayer: ${song.title}`);
      
      // Get audio stream URL
      const audioData = await this.getAudioStreamUrl(song);
      
      // Create track object
      const track: Track = {
        url: audioData.audioUrl,
        title: song.title,
        artist: song.composer || 'Unknown Artist',
        artwork: `https://img.youtube.com/vi/${song.videoId}/maxresdefault.jpg`,
        duration: audioData.duration,
      };

      // Reset queue and add track
      await TrackPlayer.reset();
      await TrackPlayer.add(track);
      
      // Start playback
      if (song.startSeconds) {
        await TrackPlayer.seekTo(song.startSeconds);
      }
      
      await TrackPlayer.play();
      
      console.log('✅ TrackPlayer now playing with car controls enabled');
    } catch (error) {
      console.error('Error playing song with TrackPlayer:', error);
      throw error;
    }
  }

  async play(): Promise<void> {
    await TrackPlayer.play();
  }

  async pause(): Promise<void> {
    await TrackPlayer.pause();
  }

  async stop(): Promise<void> {
    await TrackPlayer.stop();
  }

  async getState(): Promise<State> {
    return await TrackPlayer.getState();
  }

  async getPosition(): Promise<number> {
    return await TrackPlayer.getPosition();
  }

  async getDuration(): Promise<number> {
    return await TrackPlayer.getDuration();
  }

  async seekTo(position: number): Promise<void> {
    await TrackPlayer.seekTo(position);
  }
}

// Export singleton instance
export const trackPlayerService = TrackPlayerService.getInstance();
