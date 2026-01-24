import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import { AppState, View, Text } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import MusicPlayerScreen from './src/screens/MusicPlayerScreen';
import PlaylistDetailScreen from './src/screens/PlaylistDetailScreen';
import FootballScreen from './src/screens/FootballScreen';
import EntertainmentScreen from './src/screens/EntertainmentScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AuthScreen from './src/screens/AuthScreen';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { useFonts, PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display';
import Analytics from './src/services/analytics';

const Tab = createBottomTabNavigator();
const AudioStack = createNativeStackNavigator();

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

// Audio Stack Navigator for nested navigation
function AudioStackNavigator() {
  return (
    <AudioStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1f2937',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <AudioStack.Screen 
        name="MusicPlayer" 
        component={MusicPlayerScreen}
        options={{
          headerShown: false,
        }}
      />
      <AudioStack.Screen 
        name="PlaylistDetail" 
        component={PlaylistDetailScreen}
        options={{
          title: 'Playlist',
          headerBackTitle: 'Back',
        }}
      />
    </AudioStack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const routeNameRef = useRef<string>();
  const navigationRef = useRef<any>();

  useEffect(() => {
    // Initialize analytics
    Analytics.initialize();
    
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
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
      }}
      onStateChange={async () => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

        if (previousRouteName !== currentRouteName) {
          // Track screen view
          await Analytics.logScreenView(currentRouteName || 'Unknown');
        }

        // Save the current route name for next comparison
        routeNameRef.current = currentRouteName;
      }}
    >
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Football') {
              iconName = focused ? 'football' : 'football-outline';
            } else if (route.name === 'Background Audio') {
              iconName = focused ? 'headset' : 'headset-outline';
            } else if (route.name === 'Entertainment') {
              iconName = focused ? 'videocam' : 'videocam-outline';
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            } else {
              iconName = focused ? 'musical-notes' : 'musical-notes-outline';
            }

            // Set color based on route and focused state
            let activeColor = '#8b5cf6';
            if (route.name === 'Football') activeColor = '#3b82f6';
            if (route.name === 'Entertainment') activeColor = '#ec4899';
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
              else if (route.name === 'Entertainment') color = '#ec4899';
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
          name="Entertainment" 
          component={EntertainmentScreen}
          options={{
            header: () => <CustomHeader />,
            tabBarLabel: 'Fun'
          }}
        />
        <Tab.Screen 
          name="Background Audio" 
          component={AudioStackNavigator}
          options={{
            headerShown: true,
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
