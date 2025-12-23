import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import MusicPlayerScreen from './src/screens/MusicPlayerScreen';
import FootballScreen from './src/screens/FootballScreen';

const Tab = createBottomTabNavigator();

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
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Football') {
              iconName = focused ? 'football' : 'football-outline';
            } else {
              iconName = focused ? 'musical-notes' : 'musical-notes-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: 'gray',
          headerStyle: {
            backgroundColor: '#1f2937',
          },
          headerTintColor: '#fff',
          tabBarStyle: {
            backgroundColor: '#1f2937',
            borderTopColor: '#374151',
          },
        })}
      >
        <Tab.Screen 
          name="Football" 
          component={FootballScreen}
          options={{
            title: 'Football Highlights'
          }}
        />
        <Tab.Screen 
          name="Music" 
          component={MusicPlayerScreen}
          options={{
            title: 'Music Player'
          }}
        />
      </Tab.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}
