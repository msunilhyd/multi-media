# Background Audio Playback & Lock Screen Controls - Implementation Guide

## ✅ What's Been Updated

### MusicPlayerScreen.tsx
1. **Imports**: Added `AppState`, `Audio`, and `trackPlayerService`
2. **playSong()**: Now uses `trackPlayerService.playSong()` for native audio playback instead of YouTube links
3. **togglePlayPause()**: Uses TrackPlayer's play/pause (works in background)
4. **useEffect(): NEW**
   - Initializes TrackPlayer on component mount
   - Registers callbacks for lock screen next/previous buttons
   - Enables background audio automatically
5. **UI Update**: Changed "Powered by YouTube" badge to "Background audio enabled • Lock screen controls"

### TrackPlayerService.ts (Already Configured)
- ✅ Media controls for: Play, Pause, Next, Previous, Stop, Seek
- ✅ Compact notification with: Play, Pause, Next, Previous
- ✅ Lock screen support
- ✅ Car Play support

## 🔧 Installation Steps

### Step 1: Install TrackPlayer Package
```bash
cd mobile
npm install react-native-track-player

# For Expo projects:
expo install react-native-track-player
```

### Step 2: Android Setup
Edit `mobile/android/app/build.gradle`:
```gradle
dependencies {
    // ... existing dependencies ...
    implementation 'com.google.android.exoplayer:exoplayer-core:2.18.0'
    implementation 'com.google.android.exoplayer:exoplayer-dash:2.18.0'
    implementation 'com.google.android.exoplayer:exoplayer-hls:2.18.0'
    implementation 'com.google.android.exoplayer:exoplayer-smoothstreaming:2.18.0'
}
```

### Step 3: iOS Setup
Edit `mobile/ios/Podfile`:
```ruby
target 'YourAppName' do
  # ... existing pods ...
  pod 'RNTrackPlayer', :path => '../node_modules/react-native-track-player'
end
```

Then run:
```bash
cd ios
pod install
cd ..
```

### Step 4: Register Playback Service
Update `mobile/index.ts`:
```typescript
import { registerPlaybackService } from './src/services/playbackService';

registerPlaybackService();
```

## 🎵 Features Now Enabled

### Background Playback
- ✅ **Audio continues playing** when screen is locked
- ✅ **Works without shuffle** - no conditional background playback
- ✅ **Independent from app state** - keeps playing in background

### Lock Screen Controls
- ✅ **Play/Pause button** on lock screen
- ✅ **Next button** on lock screen  
- ✅ **Previous button** on lock screen
- ✅ **Song title & artist** displayed
- ✅ **Album art thumbnail** (from YouTube)
- ✅ **Progress slider** for seeking

### Car Integration
- ✅ **Android Automotive** support
- ✅ **Apple Car Play** support  
- ✅ **Bluetooth remote** controls
- ✅ **Voice commands** integration (native support)

## 📄 API Changes

### Before (YouTube Links)
```typescript
// Old way - opens YouTube app
const youtubeUrl = `https://www.youtube.com/watch?v=${song.videoId}`;
await Linking.openURL(youtubeUrl);
```

### After (Native Audio)
```typescript
// New way - plays audio natively
await trackPlayerService.playSong(song);
setIsPlaying(true);
```

## 🧪 Testing

1. **Background Playback**:
   - Start playing a song
   - Lock the screen
   - Audio should continue playing ✅

2. **Lock Screen Controls**:
   - Lock device while song is playing
   - Swipe down notification center
   - Should show: previous, play/pause, next buttons ✅

3. **Next/Previous Buttons**:
   - Press next/previous on lock screen
   - Song should change without unlocking ✅

4. **Shuffle Toggle**:
   - Toggle shuffle in bottom controls
   - Next button should alternate: random vs sequential ✅

## ⚠️ Fallback Behavior

If TrackPlayer fails to initialize or play:
```typescript
catch (error) {
  console.warn('TrackPlayer failed, falling back to YouTube:', error);
  const youtubeUrl = `https://www.youtube.com/watch?v=${song.videoId}`;
  await Linking.openURL(youtubeUrl);
}
```

The app will gracefully fallback to YouTube links.

## 🔄 Shuffle Toggle Logic

The shuffle button remains functional:
- **ON**: Next song is random from the playlist
- **OFF**: Next song is sequential
- **Background playback**: Works the same in both modes ✅

## 📱 Supported Devices

- ✅ Android 5.0+ 
- ✅ iOS 11+
- ✅ iPhone & iPad
- ✅ Android Phones & Tablets
- ✅ Android Automotive (car)
- ✅ Car Play

## 🆘 Troubleshooting

### Audio Not Playing in Background
- Check App.tsx has background audio configured
- Verify App.tsx has `staysActiveInBackground: true`

### Lock Screen Controls Not Showing
- Ensure TrackPlayer is initialized
- Check `trackPlayerService.setup()` completed
- Verify song is actually playing

### Fallback to YouTube
- Check backend audio streaming URL is valid
- Verify network connectivity
- Check localStorage for audio stream permissions

---

**Status**: ✅ Ready for testing on Android & iOS devices
