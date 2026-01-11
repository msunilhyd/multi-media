import TrackPlayer from 'react-native-track-player';
import { TrackPlayerService } from './trackPlayerService';

// This function is called when the app is in the background
// It handles remote control events from car, lock screen, etc.
export default async function() {
  TrackPlayerService.registerPlaybackService();
}
