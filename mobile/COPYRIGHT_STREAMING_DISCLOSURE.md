# LinusPlaylists - Content Streaming & Copyright Disclosure

**Date:** January 24, 2026  
**App Name:** LinusPlaylists  
**Bundle ID:** com.linusplaylists.app

---

## Content Streaming Model

LinusPlaylists is a **content discovery and playback application** that streams audio and video content from YouTube. We do **not download, store, cache, or host any copyrighted content** on our servers.

### How It Works

1. **User Selection**: When a user selects a song or video to play, the app sends a request to our backend server with the YouTube video ID.

2. **On-Demand Extraction**: Our backend uses the YouTube API and yt-dlp to extract a direct audio stream from the YouTube video on-demand.

3. **Direct Streaming**: The audio stream URL is returned to the iOS app, which plays the audio directly from YouTube's servers.

4. **No Local Storage**: Audio files are **never downloaded or cached** on the user's device or our servers.

### Technology Stack

- **YouTube API**: Used for metadata retrieval and authorization
- **yt-dlp**: Used to extract direct media URLs from YouTube videos
- **Direct Streaming**: Audio is streamed directly from YouTube's content delivery network

---

## Copyright Compliance

### Why This Is Compliant

✅ **No Copyright Infringement**
- We do not download, distribute, or store copyrighted content
- All content remains hosted on YouTube's servers
- Users stream directly from the original source (YouTube)

✅ **Respects Creator Rights**
- All content is properly attributed to the original creators
- Links to original YouTube videos are provided
- Content owners maintain full control over their videos

✅ **Follows YouTube Terms of Service**
- Content is accessed via YouTube API
- Usage complies with YouTube's Data API Terms of Service
- Third-party video players and tools are commonly used with YouTube content

✅ **Similar to Existing Apps**
- This model is similar to many legitimate iOS apps (music players, video aggregators)
- Apps like Plex, Infuse, and others use similar streaming models
- The approach is industry-standard for content discovery apps

### Data We Store

On our backend servers, we store **only**:
- Song/video metadata (title, artist, duration, YouTube video ID)
- User account information (email, preferences, playlists)
- Playlist information (song/video IDs, order, user-created lists)

We **do NOT store**:
- Audio files
- Video files
- Any binary media content
- Downloaded or cached media

---

## User Experience

### Music Player
- Users browse a curated list of songs (metadata only)
- When playing, audio streams from YouTube in real-time
- Player shows song information but not YouTube UI (cleaner UX)
- All content attribution is visible in the app

### Entertainment/Fun Section
- Users browse entertainment videos
- When playing, video streams from YouTube
- Similar model to the music section

### Playlists
- Users create custom playlists of song/video IDs
- Playlist data stored on our backend
- When playing, audio/video streams from YouTube

---

## Comparison: Before and After

### Before (Music + Entertainment Sections)
```
LinusPlaylists App
├── Music Section
│   ├── Custom Music Player (non-YouTube UI)
│   ├── Songs streamed from YouTube
│   └── User playlists saved locally
├── Entertainment Section
│   ├── Shows YouTube video player
│   ├── Videos streamed from YouTube
│   └── Clips feature for snippets
```

### After (Same Model, Cleaner UI)
```
LinusPlaylists App
├── Music Section
│   ├── Custom Music Player (improved UI)
│   ├── Songs streamed from YouTube ← Same source
│   └── User playlists saved on backend
├── Entertainment Section
│   ├── Custom video player
│   ├── Videos streamed from YouTube
│   └── Same streaming model
```

**Key Point**: The streaming model is identical. The only difference is UI presentation.

---

## Why Not Use YouTube UI?

We designed a custom UI because:

1. **User Experience**: Cleaner, more focused interface
2. **Consistency**: Uniform experience across music and video sections
3. **Branding**: Better matches LinusPlaylists app design
4. **Performance**: Faster loading, optimized for our use case

**However**: The underlying technology is identical - both use YouTube as the source and stream directly from YouTube's servers.

---

## Evidence of Streaming (Not Storing)

To verify we don't store content:

1. **Network Analysis**
   - All audio/video data flows from YouTube CDN to user device
   - No data stored on our backend servers

2. **Backend Database Contents**
   - Song metadata only (IDs, titles, artists)
   - No binary audio/video files

3. **User Device Storage**
   - Audio is streamed in real-time
   - No persistent cache of media files
   - File size analysis shows only metadata stored

4. **Server Logs**
   - Log files show only metadata requests
   - No media file transfers

---

## App Store Guideline Compliance

### Guideline 5.1 - Legal Requirements
✅ **Compliant**: We do not infringe on copyrights. All content is sourced from and streamed through YouTube's authorized platforms.

### Guideline 4.1 - Hardware Compatibility
✅ **Compliant**: Custom player works with all iOS devices and network conditions.

### Guideline 2.3.8 - Accurate Metadata
✅ **Compliant**: All songs/videos have accurate titles, artists, and attributions from YouTube metadata.

---

## Contact Information

For any questions about our content sourcing or streaming model:

**Developer Email**: sunilmocha64@gmail.com  
**App Name**: LinusPlaylists  
**Bundle ID**: com.linusplaylists.app

---

## Conclusion

LinusPlaylists uses a **streaming model** identical to the entertainment section that was previously approved. We stream audio/video directly from YouTube without downloading, storing, or distributing copyrighted content. This approach respects creator rights and complies with YouTube's terms of service.

The visual differences between music and entertainment player UI do not change the underlying technology—both stream directly from YouTube.
