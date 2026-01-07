import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import axios from 'axios';
import { API_BASE_URL } from './api';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = '472641857686-ujas001q2e044vtaqfob0lasdpp17kha.apps.googleusercontent.com';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export interface GoogleAuthResponse {
  user: {
    id: number;
    email: string;
    name: string;
    provider: string;
    google_id?: string;
    picture_url?: string;
  };
  access_token: string;
  token_type: string;
}

class GoogleAuthService {
  private redirectUri: string;

  constructor() {
    // Use Expo's auth proxy for OAuth redirect
    // Development build uses the slug from app.json
    this.redirectUri = 'https://auth.expo.io/@anonymous/music-player';
    console.log('📱 Google OAuth Redirect URI:', this.redirectUri);
  }

  async signInWithGoogle(): Promise<GoogleAuthResponse> {
    try {
      // Create auth request
      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        redirectUri: this.redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Token,
        usePKCE: false,
      });

      console.log('🔐 Starting Google OAuth flow...');
      
      // Use Expo's auth proxy for custom URI schemes
      const result = await request.promptAsync(discovery, { useProxy: true });

      if (result.type === 'success') {
        const { access_token } = result.params;
        console.log('✅ Google OAuth success, exchanging token with backend...');

        // Exchange Google token with backend
        const response = await axios.post<GoogleAuthResponse>(
          `${API_BASE_URL}/api/auth/google`,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${access_token}`,
            },
          }
        );

        console.log('✅ Backend authentication successful');
        return response.data;
      } else if (result.type === 'cancel') {
        throw new Error('Google sign-in was cancelled');
      } else {
        throw new Error('Google sign-in failed');
      }
    } catch (error: any) {
      console.error('❌ Google sign-in error:', error);
      throw error;
    }
  }
}

export const googleAuthService = new GoogleAuthService();
