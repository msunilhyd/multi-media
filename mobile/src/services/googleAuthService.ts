import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from './api';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = '472641857686-qcnd1804adma81q7j7o7t6ge9e80alkt.apps.googleusercontent.com';
const IOS_URL_SCHEME = 'com.googleusercontent.apps.472641857686-qcnd1804adma81q7j7o7t6ge9e80alkt';
const ANDROID_APP_SCHEME = 'com.msunilhyd.musicplayer';

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
    // Use platform-specific redirect scheme
    const scheme = Platform.OS === 'ios' ? IOS_URL_SCHEME : ANDROID_APP_SCHEME;
    this.redirectUri = AuthSession.makeRedirectUri({ scheme });
    console.log('📱 Google OAuth Redirect URI:', this.redirectUri);
  }

  async signInWithGoogle(): Promise<GoogleAuthResponse> {
    try {
      // Create auth request with authorization code flow
      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        redirectUri: this.redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
      });

      console.log('🔐 Starting Google OAuth flow...');
      
      // Don't use proxy since we have a custom scheme
      const result = await request.promptAsync(discovery, { useProxy: false });

      if (result.type === 'success') {
        const { code } = result.params;
        const codeVerifier = request.codeVerifier;
        console.log('✅ Google OAuth success, exchanging code with backend...');
        console.log('📤 Sending code:', code);
        console.log('📤 Using redirect URI:', this.redirectUri);

        // Exchange authorization code with backend
        const response = await axios.post<GoogleAuthResponse>(
          `${API_BASE_URL}/api/auth/google`,
          { 
            code, 
            code_verifier: codeVerifier,
            redirect_uri: this.redirectUri 
          },
          {
            headers: {
              'Content-Type': 'application/json',
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

// comment 