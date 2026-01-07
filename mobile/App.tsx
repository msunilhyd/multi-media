import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { AppState, View, Text } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import MusicPlayerScreen from './src/screens/MusicPlayerScreen';
import MusicPlaylistScreen from './src/screens/MusicPlaylistScreen';
import FootballScreen from './src/screens/FootballScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AuthScreen from './src/screens/AuthScreen';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { useFonts, PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display';

const Tab = createBottomTabNavigator();

// Custom header component with gradient text matching frontend
const CustomHeader = () => {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold_Italic,
  });

  return (
    <View style={{ 
      backgroundColor: '#1f2937', 
      paddingTop: 50, 
      paddingBottom: 14, 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'row'
    }}>
      <Text style={{ 
        fontSize: 32, 
        fontFamily: fontsLoaded ? 'PlayfairDisplay_700Bold_Italic' : 'System',
        fontWeight: fontsLoaded ? undefined : '700',
        fontStyle: fontsLoaded ? undefined : 'italic',
        textAlign: 'center',
        color: '#60a5fa',
        letterSpacing: 0.5,
      }}>
        Linus
      </Text>
      <Text style={{ 
        fontSize: 32, 
        fontFamily: fontsLoaded ? 'PlayfairDisplay_700Bold_Italic' : 'System',
        fontWeight: fontsLoaded ? undefined : '700',
        fontStyle: fontsLoaded ? undefined : 'italic',
        textAlign: 'center',
        color: '#c084fc',
        letterSpacing: 0.5,
      }}>
        Playlists
      </Text>
    </View>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

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
            } else if (route.name === 'Background Audio') {
              iconName = focused ? 'headset' : 'headset-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            } else {
              iconName = focused ? 'musical-notes' : 'musical-notes-outline';
            }

            // Set color based on route and focused state
            let activeColor = '#8b5cf6';
            if (route.name === 'Football') activeColor = '#3b82f6';
            if (route.name === 'Profile') activeColor = '#ec4899';
            
            const finalColor = focused ? activeColor : '#9ca3af';
            
            return <Ionicons name={iconName} size={size} color={finalColor} />;
          },
          tabBarActiveTintColor: 'transparent', // Not used since we handle color in tabBarIcon
          tabBarInactiveTintColor: '#9ca3af',
          tabBarLabelStyle: ({ focused }) => {
            let color = '#9ca3af';
            if (focused) {
              if (route.name === 'Football') color = '#3b82f6';
              else if (route.name === 'Profile') color = '#ec4899';
              else color = '#8b5cf6';
            }
            return { color };
          },
          headerStyle: {
            backgroundColor: '#1f2937',
          },
          headerTintColor: '#ffffff',
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
            header: () => <CustomHeader />,
            tabBarLabel: 'Football'
          }}
        />
        <Tab.Screen 
          name="Playlist" 
          component={MusicPlaylistScreen}
          options={{
            header: () => <CustomHeader />,
            tabBarLabel: 'Music'
          }}
        />
        <Tab.Screen 
          name="Background Audio" 
          component={MusicPlayerScreen}
          options={{
            header: () => <CustomHeader />,
            tabBarLabel: 'Audio'
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={isAuthenticated ? ProfileScreen : AuthScreen}
          options={{
            header: () => <CustomHeader />,
            tabBarLabel: isAuthenticated ? 'Profile' : 'Login'
          }}
        />
      </Tab.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}
