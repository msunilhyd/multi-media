# Song Submission Not Appearing in Playlist - Debugging Guide

## Issue Summary
When a user submits a song from YouTube through the "Add Songs" > "From YouTube" modal:
- The song IS being added to the database
- The song IS being added to the `user_playlist_songs` table
- **BUT** the song is NOT appearing in the user's playlist view

## Root Cause Analysis

The issue is likely one of the following:

### 1. **Frontend Not Refreshing Properly**
When a song is submitted, the `onSongSubmitted` callback should trigger a playlist refresh, but this might be failing silently.

### 2. **API Not Returning User-Submitted Songs**
The backend API endpoint `/api/playlists/{id}` should include user-submitted songs, but there might be an issue retrieving them.

### 3. **Incorrect Content Type Handling**
User-submitted songs use `content_type='submitted_song'`, but the retrieval logic might not be properly handling this type.

## How to Debug

### Step 1: Check Frontend Console Logs
Open browser DevTools (F12) and submit a song. You should see logs like:

```
🎵 [MusicPlaylist] onSongSubmitted callback triggered
📢 [MusicPlaylist] Calling parent onSongSubmitted callback...
🔄 [handleRefreshDefaultPlaylist] Starting playlist refresh...
📡 [handleRefreshDefaultPlaylist] Fetching playlists list...
✅ [handleRefreshDefaultPlaylist] Fetched playlists: [...]
✅ [handleRefreshDefaultPlaylist] Found music playlist: {...}
📡 [handleRefreshDefaultPlaylist] Fetching full playlist (ID: X)...
✅ [handleRefreshDefaultPlaylist] Fetched full playlist: {...}
📊 [handleRefreshDefaultPlaylist] Total songs in playlist: N
  Song 1: Title 1 (ID: X, VideoID: abc123)
  Song 2: ... [your submitted song here]
⭐ [handleRefreshDefaultPlaylist] Last song in playlist: {...}
➕ [handleRefreshDefaultPlaylist] Adding new song to display
```

### Step 2: Check Backend Logs
When you submit a song, you should see logs like:

```
✅ User 123 submitting song: Song Title
✅ Extracted video ID: abc123
✅ Created submitted song record: 456
📋 Found existing playlist with ID: 789
➕ Adding submitted song 456 to playlist 789
✅ Successfully added song to playlist. PlaylistSong ID: 999, Position: 5
```

### Step 3: Verify Database Records

Check if the records exist:

```sql
-- Check if submitted song was created
SELECT id, user_id, title, youtube_video_id FROM user_submitted_songs 
WHERE user_id = <USER_ID> 
ORDER BY created_at DESC LIMIT 1;

-- Check if it was added to playlist
SELECT id, playlist_id, item_id, content_type, position FROM user_playlist_songs 
WHERE playlist_id = <PLAYLIST_ID> AND content_type = 'submitted_song' 
ORDER BY position DESC LIMIT 1;

-- Check user's playlists
SELECT id, title, playlist_type FROM user_playlists 
WHERE user_id = <USER_ID>;
```

### Step 4: Test the API Directly

Use curl or Postman to test:

```bash
# Get user's playlists
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:8000/api/playlists?playlist_type=music"

# Get full playlist with songs
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:8000/api/playlists/<PLAYLIST_ID>"
```

The response should include songs with:
```json
{
  "songs": [
    {
      "id": 456,
      "title": "Song Title",
      "videoId": "abc123",
      "language": "User Submission",
      "position": 5
    }
  ]
}
```

## Likely Issues & Fixes

### Issue A: Song Added to Wrong Playlist
**Symptom:** Song appears in backend but not in frontend
**Cause:** User might be on wrong tab (All Songs vs My Playlists)
**Fix:** Check both tabs after submitting

### Issue B: API Query Bug
**Symptom:** Database has the record but API doesn't return it
**Cause:** Query in `get_playlist` endpoint might not be including 'submitted_song' content type
**Fix:** Verify the SQL query in `/backend/app/routers/playlists.py` line 206-240

### Issue C: Duplicate Check Error
**Symptom:** "Song already submitted" error even for new songs
**Cause:** Duplicate detection in `/backend/app/routers/user_songs.py` line 81-87 might have a bug
**Fix:** Check video ID extraction and comparison logic

### Issue D: Request Timing Issue
**Symptom:** Song appears after page refresh but not immediately
**Cause:** Database might not have committed before frontend queries
**Fix:** Added logging should reveal this - check the order of logs

## Next Steps

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Submit a song again** while watching browser console
3. **Share the console output** showing the flow
4. **Check backend logs** for corresponding entries
5. **Test the API directly** to see what it returns

## Files Modified for Debugging

- `/frontend/src/components/SubmitSongModal.tsx` - Added submission logging
- `/frontend/src/app/music/page.tsx` - Added refresh handler logging  
- `/frontend/src/components/MusicPlaylist.tsx` - Added callback logging
- `/backend/app/routers/user_songs.py` - Added submission logging
