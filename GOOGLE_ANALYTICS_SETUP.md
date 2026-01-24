# Google Analytics Setup Guide

## Overview
Google Analytics (G-XTKRGES7D8) has been integrated into both the frontend web app and mobile app.

## Frontend (Web App) ✅ COMPLETE

The frontend integration is complete and ready to track:
- Page views automatically
- User sessions
- All standard GA4 events

**Files added:**
- `frontend/src/components/GoogleAnalytics.tsx` - GA script loader
- `frontend/src/lib/analytics.ts` - Helper functions for custom events
- Updated `frontend/src/app/layout.tsx` - Integrated GA component

**Custom event tracking (optional):**
```typescript
import { event } from '@/lib/analytics';

event({
  action: 'play_song',
  category: 'Music',
  label: song.title,
  value: 1
});
```

## Mobile App ✅ ANALYTICS SERVICE CREATED

A custom analytics service has been created that will work immediately in development mode (console logging).

**Files added:**
- `mobile/src/services/analytics.ts` - Analytics service with all tracking methods
- Updated `mobile/App.tsx` - Initialized analytics and screen tracking
- Updated `mobile/src/screens/MusicPlaylistScreen.tsx` - Song play tracking

**Current status:**
- ✅ Service initialized
- ✅ Screen view tracking enabled
- ✅ Song play tracking enabled
- ⏸️ API calls commented out (requires API secret)

### To Enable Full Mobile Analytics:

1. **Get API Secret from Google Analytics:**
   - Go to: Admin → Data Streams → Select your iOS/Android stream
   - Click "Measurement Protocol API secrets"
   - Create a new secret
   - Copy the secret value

2. **Update the analytics service:**
   - Open `mobile/src/services/analytics.ts`
   - Replace `YOUR_API_SECRET` with your actual API secret
   - Uncomment the axios.post call (lines marked with comments)

3. **Available tracking methods:**
   ```typescript
   import Analytics from '../services/analytics';

   // Screen views (auto-tracked on navigation)
   Analytics.logScreenView('ScreenName');

   // Song plays (already integrated)
   Analytics.logSongPlay(songId, title, artist);

   // Video plays
   Analytics.logVideoPlay(videoId, title);

   // User authentication
   Analytics.logUserSignIn('apple'); // or 'google', 'email'
   Analytics.logUserSignUp('apple');

   // Search
   Analytics.logSearch(searchTerm, resultCount);

   // Custom events
   Analytics.logEvent('event_name', { param1: 'value' });
   ```

## What's Being Tracked

### Frontend (Active):
- Page views on all routes
- Session duration
- User navigation patterns
- Geographic location
- Device/browser information

### Mobile (Ready to activate):
- Screen views
- Song plays (title, artist, song ID)
- Video plays
- User authentication events
- Search queries
- Custom events

## Testing

### Frontend:
- Deploy the frontend and visit your site
- Open Google Analytics Real-Time report
- You should see active users and page views

### Mobile:
- Currently logs to console in development: `console.log('Analytics Event:', ...)`
- After adding API secret, events will appear in GA4 Real-Time report
- Test with: `Analytics.logEvent('test_event', { test: 'value' })`

## Next Steps

1. ✅ Frontend is live and tracking
2. 🔄 Get GA4 Measurement Protocol API secret
3. 🔄 Update mobile analytics service with API secret
4. 🔄 Test mobile analytics in development
5. 🔄 Deploy mobile app update

## Resources

- [GA4 Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4)
- [GA4 Events Reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [GA4 Real-Time Reports](https://support.google.com/analytics/answer/9271392)
