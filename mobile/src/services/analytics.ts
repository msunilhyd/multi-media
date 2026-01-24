import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GA_MEASUREMENT_ID = 'G-XTKRGES7D8';
const GA_API_SECRET = 'YOUR_API_SECRET'; // Get this from Google Analytics Admin -> Data Streams -> Measurement Protocol API secrets

interface AnalyticsEvent {
  name: string;
  params?: Record<string, any>;
}

class AnalyticsService {
  private clientId: string | null = null;
  private sessionId: string | null = null;

  async initialize() {
    // Get or create a unique client ID
    let storedClientId = await AsyncStorage.getItem('analytics_client_id');
    if (!storedClientId) {
      storedClientId = this.generateUUID();
      await AsyncStorage.setItem('analytics_client_id', storedClientId);
    }
    this.clientId = storedClientId;
    this.sessionId = this.generateUUID();
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async logEvent(eventName: string, params: Record<string, any> = {}) {
    if (!this.clientId) {
      await this.initialize();
    }

    try {
      // Send to Google Analytics Measurement Protocol
      const payload = {
        client_id: this.clientId,
        events: [
          {
            name: eventName,
            params: {
              ...params,
              session_id: this.sessionId,
              engagement_time_msec: '100',
            },
          },
        ],
      };

      // Note: This requires API_SECRET which you need to get from GA4
      // For now, just log to console in development
      if (__DEV__) {
        console.log('Analytics Event:', eventName, params);
      }

      // Uncomment when you have the API_SECRET
      /*
      await axios.post(
        `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
        payload
      );
      */
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  async logScreenView(screenName: string, screenClass?: string) {
    await this.logEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  }

  async logSongPlay(songId: number, title: string, artist: string) {
    await this.logEvent('play_song', {
      song_id: songId,
      song_title: title,
      artist_name: artist,
    });
  }

  async logVideoPlay(videoId: string, title: string) {
    await this.logEvent('play_video', {
      video_id: videoId,
      video_title: title,
    });
  }

  async logSearch(searchTerm: string, resultCount: number) {
    await this.logEvent('search', {
      search_term: searchTerm,
      result_count: resultCount,
    });
  }

  async logUserSignIn(method: string) {
    await this.logEvent('login', {
      method: method, // 'apple', 'google', 'email'
    });
  }

  async logUserSignUp(method: string) {
    await this.logEvent('sign_up', {
      method: method,
    });
  }
}

export default new AnalyticsService();
