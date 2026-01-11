# Car Integration / Media Controls Implementation

## Current Status
Your mobile app currently uses `expo-av` which has **limited support** for external media controls (car steering wheel buttons, Bluetooth headphone controls, etc.).

## What Works Now
- ✅ Background audio playback
- ✅ Audio continues when phone is locked
- ✅ Basic play/pause from lock screen

## What Doesn't Work
- ❌ Car steering wheel "next" button
- ❌ Car steering wheel "previous" button  
- ❌ Full media session integration
- ❌ Now Playing display in car screen

## Solution: Add react-native-track-player

### Step 1: Install the library
```bash
cd /Users/s0m13i5/linus/multi-media/mobile
npm install react-native-track-player
npx pod-install ios  # For iOS
```

### Step 2: Update app.json

Add to `ios.infoPlist`:
```json
"UIBackgroundModes": ["audio"],
"NSAppleMusicUsageDescription": "This app plays music"
```

Add to `android`:
```json
"permissions": [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.WAKE_LOCK"
]
```

### Step 3: Benefits
- ✅ Full car integration (USB/Bluetooth/CarPlay/Android Auto)
- ✅ Steering wheel controls (next, previous, play, pause)
- ✅ Lock screen controls
- ✅ Headphone button controls
- ✅ Now Playing info on car display
- ✅ Better background playback

### Alternative: Expo Audio (expo-audio)
If you want to stay with Expo ecosystem:
```bash
npx expo install expo-audio
```

This is newer than expo-av and has better media control support, but still not as complete as react-native-track-player for car integration.

## Recommendation
For **full car integration** with steering wheel controls, use **react-native-track-player**. It's the industry standard for React Native music apps and fully supports:
- CarPlay (iOS)
- Android Auto
- Bluetooth controls
- USB car connections
- All media buttons

Would you like me to implement this?
