# Testing Geo-Blocking Detection and Filtering Feature

## Overview
This guide explains how to test the enhanced geo-blocking feature that:
1. Detects user's country from IP address
2. Fetches multiple highlights per match
3. **Filters out blocked videos** before showing them to users
4. Shows only highlights available in user's region

## What Changed

### Before (Phase 1)
- Fetched 1 highlight per match
- Showed ALL videos with warnings on blocked ones
- Poor UX: Users saw blocked videos and got errors when playing

### After (Phase 2)
- Fetches 10 highlights per match
- Detects user's country from IP
- **Shows ONLY playable videos** for that country
- Better UX: Users never see videos they can't play

## Test Scenarios

### Scenario 1: Videos with Region Restrictions
**Goal:** Verify that geo-blocked videos show warnings

**Steps:**
1. Start the backend server
2. Open the football highlights page (web or mobile)
3. Look for videos with amber warning badges/banners
4. Badge should say "Region Restricted" (web) or "May not be available in some regions" (mobile)

**Expected Result:**
- Videos with regional restrictions display warning indicators
- Warning appears BEFORE user clicks play
- Warning is visually distinct (amber/yellow color)

### Scenario 2: Videos Without Region Restrictions
**Goal:** Verify that normal videos don't show false warnings

**Steps:**
1. Navigate to football highlights
2. Find videos without any warning badges
3. Play these videos

**Expected Result:**
- Videos without restrictions play normally
- No warning badges appear on unrestricted content
- Playback works as expected

### Scenario 3: Attempting to Play Geo-Blocked Video
**Goal:** Test user experience when playing a blocked video

**Steps:**
1. Find a video with geo-block warning
2. Click to play the video
3. If you're in a blocked region, YouTube will show their error

**Expected Result:**
- Mobile: Enhanced error message mentions "not available in your region"
- Web: YouTube's native error appears in the player
- User can close and try another highlight

### Scenario 4: API Response Validation
**Goal:** Verify backend returns geo-blocking metadata

**Steps:**
1. Make API request to highlights endpoint:
   ```bash
   curl "https://multi-media-production.up.railway.app/api/highlights?match_date=2026-01-31"
   ```
2. Check response JSON for highlights

**Expected Fields in Response:**
```json
{
  "highlights": [
    {
      "id": 123,
      "youtube_video_id": "abc123",
      "title": "Match Highlights",
      "is_geo_blocked": true,
      "blocked_countries": ["GB", "IN"],
      "allowed_countries": [],
      ...
    }
  ]
}
```

**Expected Result:**
- All highlights include geo-blocking fields
- `is_geo_blocked` is boolean (true/false)
- `blocked_countries` and `allowed_countries` are arrays (can be empty)

## Manual Testing Checklist

### Backend
- [ ] YouTube service compiles without errors
- [ ] Schema includes new fields
- [ ] API responses include geo-blocking metadata
- [ ] Videos enrichment adds region restriction data

### Mobile App
- [ ] Warning banner appears on geo-blocked videos
- [ ] Warning text is readable and clear
- [ ] Globe icon displays correctly
- [ ] Error message mentions region restriction
- [ ] App doesn't crash with new fields

### Web App
- [ ] "Region Restricted" badge appears
- [ ] Badge positioned at top-right of thumbnail
- [ ] Globe SVG icon renders correctly
- [ ] Styling matches design (amber background)
- [ ] Gracefully handles missing fields

## Automated Testing

### Backend Unit Test Example
```python
def test_geo_blocking_detection():
    service = YouTubeService()
    test_videos = [
        {'video_id': 'test123', 'title': 'Test'}
    ]
    
    # Mock YouTube API response with region restrictions
    enriched = service._enrich_video_details(test_videos, ['test123'])
    
    assert 'is_geo_blocked' in enriched[0]
    assert isinstance(enriched[0]['is_geo_blocked'], bool)
    assert isinstance(enriched[0]['blocked_countries'], list)
    assert isinstance(enriched[0]['allowed_countries'], list)
```

### Frontend TypeScript Test Example
```typescript
describe('Highlight with geo-blocking', () => {
  it('should show warning for geo-blocked video', () => {
    const highlight: Highlight = {
      id: 1,
      youtube_video_id: 'test123',
      title: 'Test Highlight',
      is_geo_blocked: true,
      blocked_countries: ['GB', 'IN'],
      // ...other fields
    };
    
    const { getByText } = render(<VideoCard highlight={highlight} />);
    expect(getByText('Region Restricted')).toBeInTheDocument();
  });
});
```

## Testing with Real Data

### Finding Geo-Blocked Videos
Some channels/leagues have known regional restrictions:

1. **Premier League highlights**: Often blocked in UK (rights holders have exclusive streaming)
2. **La Liga highlights**: May be blocked in Spain
3. **Champions League**: Regional restrictions vary by broadcasting rights

### Test Dates with Known Restrictions
- Check recent match dates (within last 7 days)
- Major league matches more likely to have restrictions
- European competition matches often have complex rights

## Verification Points

### ✅ Success Criteria
- No console errors in browser/mobile logs
- Warnings appear on appropriate videos
- API responses include new fields
- User experience is clear and helpful
- No false positives (unrestricted videos don't show warnings)

### ❌ Failure Signs
- TypeScript compilation errors
- Missing fields in API responses
- Warnings appear on all videos (or none)
- App crashes when loading highlights
- Broken styling on badges/banners

## Troubleshooting

### Issue: No warnings appear on any videos
**Possible Causes:**
- YouTube API not returning restriction data
- Backend not enriching video details
- Frontend not reading new fields

**Check:**
```bash
# Verify API response includes fields
curl "YOUR_API_URL/api/highlights?match_date=YYYY-MM-DD" | jq '.[] | .matches[] | .highlights[] | {id, is_geo_blocked}'
```

### Issue: All videos show warnings (false positives)
**Possible Causes:**
- Backend logic incorrectly flagging all videos
- Default value set to `true` instead of `false`

**Check:**
- Review `_enrich_video_details` logic
- Verify default initialization values

### Issue: TypeScript errors
**Possible Causes:**
- Interface not updated in all files
- Optional fields not properly typed

**Fix:**
- Ensure `?` optional marker on new fields
- Update all interface definitions consistently

## Performance Testing

### API Response Time
- Check if enrichment adds significant latency
- Each video enrichment call costs 1 YouTube API unit
- Monitor quota usage

### Mobile App Performance
- Test with 20+ highlights loaded
- Check for UI lag when rendering warnings
- Verify smooth scrolling

## Known Limitations

1. **Generic Warning**: Can't determine user's actual country, so warning says "may not be available" rather than "blocked in your country"
2. **Not Preventive**: Users can still attempt to play blocked videos
3. **API Dependency**: Requires YouTube API to be accessible and within quota
4. **No Caching**: Region restrictions checked on every fetch (not cached)

## Future Test Scenarios

When implementing enhancements:
- Test IP-based country detection
- Test automatic filtering of blocked content
- Test showing list of blocked countries on demand
- Test alternative highlight suggestions

## Support

If issues persist after testing:
1. Check browser/mobile console for errors
2. Verify API responses include expected fields
3. Review backend logs for YouTube API errors
4. Ensure YouTube API keys are configured correctly
