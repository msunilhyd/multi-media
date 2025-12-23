import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Audio } from 'expo-av';
import MusicPlayerScreen from './src/screens/MusicPlayerScreen';

export default function App() {
  useEffect(() => {
    // Initialize audio mode for iOS background playback
    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false
        });
        console.log('📱 App audio mode configured for background playback');
      } catch (error) {
        console.error('Failed to configure audio mode:', error);
      }
    };

    initAudio();

    // Handle app state changes
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('📱 App backgrounded - audio should continue playing');
      } else if (nextAppState === 'active') {
        console.log('📱 App returned to foreground');
      }
    };
    
    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <NavigationContainer>
      <MusicPlayerScreen />
      <StatusBar style="light" />
    </NavigationContainer>
  );
}
