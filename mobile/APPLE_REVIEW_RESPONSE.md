# Response to Apple App Review - Guideline 5.2.3

Dear App Review Team,

LinusPlaylists only uses authorized YouTube content via official YouTube APIs. We do not host, download, or cache any audio/video. All playback is handled by YouTube’s official player, which enforces all restrictions, ads, and copyright protections.

**Legal & Technical Compliance:**
- Uses YouTube Data API v3 and IFrame Player API (Google)
- Only embeds public videos from official broadcasters (NBC Sports, ESPN FC, CBS Sports, beIN SPORTS, Sky Sports, official league channels) and public music videos
- Uses `react-native-youtube-iframe` and `googleapiclient` (official libraries)
- No content is re-hosted, downloaded, or cached
- No ads or copyright are bypassed
- All YouTube branding, controls, and monetization are preserved

**Similar Apps:**
YouTube, YMusic, and many sports/news apps use the same approach—embedding YouTube videos via official APIs.

**Code & Evidence:**
- Code: https://github.com/msunilhyd/multi-media
- Backend: `/backend/app/youtube_service.py` (official channels only)
- Mobile: `/mobile/src/screens/` (`react-native-youtube-iframe`)

We certify full compliance with YouTube API Terms and do not interfere with monetization or copyright. All content is public and rights-holding broadcasters are credited.

**Test Account:**
Email: test@linusplaylists.com
Password: TestApple2026!

Please verify:
- All playback uses YouTube’s official player/branding
- Ads (if any) are shown
- Copyright-restricted videos are blocked by YouTube

**Contact:**
Developer: Sunil Kumar Mocharla
Email: sunilmocha64@gmail.com

Thank you for your consideration.

References:
1. https://developers.google.com/youtube/terms/api-services-terms-of-service
2. https://developers.google.com/youtube/iframe_api_reference
3. https://www.npmjs.com/package/react-native-youtube-iframe
4. https://developer.apple.com/app-store/review/guidelines/#intellectual-property
