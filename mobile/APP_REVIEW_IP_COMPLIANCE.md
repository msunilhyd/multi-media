# App Review - Intellectual Property Compliance Statement

Date: January 27, 2026
App: LinusPlaylists (iOS)
Version: 1.0 (Build 6)

## Summary
- The app **does not cache, host, download, or convert** third-party audio/video.
- On iOS, **audio playback opens the official YouTube URL** in the default browser/app (no stream extraction).
- Video content is displayed via a **YouTube player component** that embeds YouTube’s official playback UI; no downloading or saving is supported.
- The app shows **clear attribution** ("Powered by YouTube") wherever content is played.
- The app is a **content discovery and playlist** interface which links to official sources.

## Details by Guideline

### 5.2.1 – Generally
- We do not use protected third-party material without permission.
- All brand names are used in a descriptive, nominative manner only (e.g., "YouTube") and with attribution.
- The developer entity is the rightful owner of the app and UI/UX.

### 5.2.2 – Third-Party Sites/Services
- The app accesses public content via YouTube embeds and standard links.
- We do **not** bypass, scrape, or circumvent access controls; we rely on YouTube’s public playback experience.
- Authorization is provided upon request via our usage pattern: **no downloading**, **no conversion**, **no caching**, **no monetization of third-party streams**. Content plays on YouTube’s official surfaces.

### 5.2.3 – Audio/Video Downloading
- The iOS app **does not** include the ability to save, convert, or download media from third-party sources.
- Audio tap-to-play now **opens YouTube** (`https://www.youtube.com/watch?v=<videoId>`) instead of direct streaming.
- Video is played in an in-app YouTube player component with **no save/download** features.

### 5.2.5 – Apple Products and Data
- The app does not mimic Apple products/interfaces and does not misuse Apple-provided data.

## Technical Measures Implemented
- iOS platform check in `mobile/src/screens/PlaylistDetailScreen.tsx`:
  - Tap-to-play on songs calls `Linking.openURL("https://www.youtube.com/watch?v=<videoId>")`.
  - Prevents direct streaming and resolves prior unresponsive behavior.
- Visible attribution in video and audio screens (e.g., "Powered by YouTube").
- No caching/storage of third-party media in the app; no background download tasks.

## Contact & Takedown
- If a rights holder contacts us, we will **remove** the linked/embedded content promptly.
- Contact: support@linusplaylists.com

## References
- YouTube Terms of Service: https://www.youtube.com/t/terms
- Apple App Store Review Guidelines – Section 5.2

We believe these measures fully align the iOS app with Apple’s IP guidelines and YouTube policies.
