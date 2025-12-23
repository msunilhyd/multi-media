import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import MusicPlayerScreen from './src/screens/MusicPlayerScreen';

export default function App() {
  return (
    <NavigationContainer>
      <MusicPlayerScreen />
      <StatusBar style="light" />
    </NavigationContainer>
  );
}
