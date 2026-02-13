"""
Enhancement Plan: Background Audio Playback + Lock Screen Controls
==============================================================

ISSUE:
- Songs only continue playing with screen locked when shuffle is ON
- No next/previous controls on lock screen
- Depends on YouTube app behavior

SOLUTION:
Use react-native-track-player for native audio playback
- Plays audio directly (not via YouTube)
- Continues in background always (not conditional on shuffle)
- Shows next/previous/play/pause on lock screen
- Works with Car Play, Android Automotive, Bluetooth controls

IMPLEMENTATION STEPS:

1. Install dependencies:
   npm install react-native-track-player

2. Update App.tsx:
   - Initialize TrackPlayer service on app launch
   - Register playback service for background controls

3. Update MusicPlayerScreen.tsx:
   - Use TrackPlayer.playSong() instead of Linking.openURL()
   - Remove shuffle toggle from affecting background playback
   - Update button handlers to use TrackPlayer

4. Configure Android files:
   - android/app/build.gradle: Add TrackPlayer dependency
   - android/settings.gradle: Link the module

5. Configure iOS files:
   - ios/Podfile: Add pod 'RNTrackPlayer'
   - ios/[AppName]/Info.plist: Add AVAudioSession.Category

BENEFITS:
✅ Background audio plays always (no shuffle requirement)
✅ Lock screen shows: play/pause, next, previous buttons
✅ Car display integration (Car Play)
✅ Bluetooth remote control support
✅ Native progress slider on lock screen
✅ Song artwork on lock screen
""