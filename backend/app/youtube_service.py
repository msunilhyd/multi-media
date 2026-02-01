from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from typing import List, Dict, Optional
from datetime import datetime, timedelta, date
import re
from .config import get_settings

settings = get_settings()


class YouTubeQuotaExhaustedError(Exception):
    """Raised when all YouTube API keys have exceeded their quota"""
    pass


class YouTubeService:
    # Official channel uploads playlists (replace UC prefix with UU for uploads)
    # Using official US broadcasters for each league
    OFFICIAL_CHANNELS = {
        "Premier League": "UUqZQlzSHbVJrwrn5XvzrzcA",      # NBC Sports (US broadcaster)
        "La Liga": "UU6c1z7bA__85CIWZ_jpCK-Q",             # ESPN FC (US broadcaster)
        "Bundesliga": "UU6c1z7bA__85CIWZ_jpCK-Q",          # ESPN FC (US broadcaster)
        "Serie A": "UUET00YnetHT7tOpu12v8jxg",             # CBS Sports Golazo / Paramount+ (US broadcaster)
        "Ligue 1": "UU6c1z7bA__85CIWZ_jpCK-Q",             # ESPN FC (US broadcaster)
        "Champions League": "UUET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo / Paramount+
        "Europa League": "UUET00YnetHT7tOpu12v8jxg",       # CBS Sports Golazo / Paramount+
        "AFCON": "UU0YatYmg5JRYzXJPxIdRd8g",               # beIN SPORTS USA (Official AFCON broadcaster)
        "CAF Champions League": "UU0YatYmg5JRYzXJPxIdRd8g", # beIN SPORTS USA
        "Copa del Rey": "UU6c1z7bA__85CIWZ_jpCK-Q",        # ESPN FC
        "Supercopa de España": "UU6c1z7bA__85CIWZ_jpCK-Q",  # ESPN FC (US broadcaster)
        "Coupe de France": "UU6c1z7bA__85CIWZ_jpCK-Q",     # ESPN FC (US broadcaster)
        "DFB-Pokal": "UU6c1z7bA__85CIWZ_jpCK-Q",           # ESPN FC (US broadcaster)
        "Coppa Italia": "UUET00YnetHT7tOpu12v8jxg",        # CBS Sports Golazo / Paramount+
        "FA Cup": "UUqZQlzSHbVJrwrn5XvzrzcA",              # NBC Sports
        "League Cup": "UUKy1dAqELo0zrOtPkf0eTMw",          # Sky Sports Football (UK broadcaster)
        "EFL Cup": "UUKy1dAqELo0zrOtPkf0eTMw",             # Sky Sports Football
        "Indian Super League": "UUSQ8md_xMUPrIxiH-lT2-xw",       # Indian Super League Official
        "MLS": "UUSZbXT5TLLW_i-5W8FZpFsg",                   # Major League Soccer Official
        "Süper Lig": "UU0YatYmg5JRYzXJPxIdRd8g",              # beIN SPORTS USA (Türkiye coverage)
    }
    
    # Additional channels to search for each league (fallback) - ordered by priority
    # Using uploads playlist IDs (UU prefix instead of UC)
    # Only US broadcasters allowed
    FALLBACK_CHANNELS = {
        "Premier League": [
            "UUqZQlzSHbVJrwrn5XvzrzcA",   # NBC Sports
        ],
        "La Liga": [
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Bundesliga": [
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Serie A": [
            "UUET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo / Paramount+
        ],
        "Ligue 1": [
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Champions League": [
            "UUET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo (primary)
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
            "UUKy1dAqELo0zrOtPkf0eTMw",   # Sky Sports Football
            "UUqZQlzSHbVJrwrn5XvzrzcA",   # NBC Sports
        ],
        "Europa League": [
            "UUET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
            "UUKy1dAqELo0zrOtPkf0eTMw",   # Sky Sports Football
        ],
        "FA Cup": [
            "UUG5qGWdu8nIRZqJ_GgDwQ-w",   # Premier League Official
            "UUKy1dAqELo0zrOtPkf0eTMw",   # Sky Sports Football
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "League Cup": [
            "UUKy1dAqELo0zrOtPkf0eTMw",   # Sky Sports Football (primary for EFL Cup)
            "UUET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "EFL Cup": [
            "UUKy1dAqELo0zrOtPkf0eTMw",   # Sky Sports Football (primary for EFL Cup)
            "UUET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Copa del Rey": [
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Supercopa de España": [
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Coppa Italia": [
            "UUET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo / Paramount+
        ],
        "DFB-Pokal": [
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Coupe de France": [
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Indian Super League": [
            "UUSQ8md_xMUPrIxiH-lT2-xw",   # ISL Official
        ],
        "MLS": [
            "UUSZbXT5TLLW_i-5W8FZpFsg",   # Major League Soccer Official
        ],
        "Süper Lig": [
            "UUJukok5AzIaF26bIRZ3Kxlw",   # beIN SPORTS Türkiye
        ],
        "AFCON": [
            "UU0YatYmg5JRYzXJPxIdRd8g",   # beIN SPORTS USA (Official AFCON broadcaster)
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC (backup)
            "UUKy1dAqELo0zrOtPkf0eTMw",   # Sky Sports Football
        ],
        "CAF Champions League": [
            "UU0YatYmg5JRYzXJPxIdRd8g",   # beIN SPORTS USA
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
            "UUKy1dAqELo0zrOtPkf0eTMw",   # Sky Sports Football
        ],
    }
    
    def __init__(self):
        self.api_keys = settings.get_youtube_keys_list()
        self.current_key_index = 0
        self.youtube = None
        if self.api_keys:
            self.youtube = build('youtube', 'v3', developerKey=self.api_keys[0])
    
    def _rotate_api_key(self):
        """Switch to next API key when current one is exhausted"""
        self.current_key_index += 1
        if self.current_key_index < len(self.api_keys):
            new_key = self.api_keys[self.current_key_index]
            self.youtube = build('youtube', 'v3', developerKey=new_key)
            print(f"Switched to YouTube API key #{self.current_key_index + 1}")
            return True
        return False
    
    def search_highlights(self, home_team: str, away_team: str, league: str = None, match_date: date = None, max_results: int = 5) -> List[Dict]:
        """
        Search for match highlights using channel playlists only (no expensive search API).
        Each playlist call costs only 3 API units vs 100 units for search.
        
        Args:
            match_date: Date of the match to search highlights for. Helps filter videos by publish date.
        """
        if not self.youtube:
            raise YouTubeQuotaExhaustedError("No YouTube API keys configured")
        
        videos = []
        channels_tried = set()
        
        # Try official channel first (3 units)
        if league and league in self.OFFICIAL_CHANNELS:
            primary_channel = self.OFFICIAL_CHANNELS[league]
            channels_tried.add(primary_channel)
            
            videos = self._search_channel_playlist(
                primary_channel, 
                home_team, 
                away_team,
                match_date=match_date,
                max_results=10
            )
            # None means all API keys exhausted
            if videos is None:
                raise YouTubeQuotaExhaustedError("All YouTube API keys have exceeded their daily quota. Please try again tomorrow or add new API keys.")
            
            if videos:
                videos = self._rank_videos(videos, home_team, away_team)
                return videos[:max_results]
        
        # Try all fallback channels if primary didn't return results
        if league and league in self.FALLBACK_CHANNELS:
            for fallback_playlist in self.FALLBACK_CHANNELS[league]:
                if fallback_playlist in channels_tried:
                    continue  # Skip already tried channels
                    
                channels_tried.add(fallback_playlist)
                fallback_videos = self._search_channel_playlist(
                    fallback_playlist, 
                    home_team, 
                    away_team,
                    match_date=match_date,
                    max_results=10
                )
                if fallback_videos is None:
                    raise YouTubeQuotaExhaustedError("All YouTube API keys have exceeded their daily quota.")
                if fallback_videos:
                    videos = self._rank_videos(fallback_videos, home_team, away_team)
                    return videos[:max_results]
        
        # No highlights found in any channel - return empty (no expensive search fallback)
        print(f"No highlights found for {home_team} vs {away_team} in {len(channels_tried)} channels")
        return []
    
    def _search_channel_playlist(self, playlist_id: str, home_team: str, away_team: str, match_date: date = None, max_results: int = 10) -> Optional[List[Dict]]:
        """Search recent videos from official channel uploads playlist (3 units per page)
        Returns None if all API keys are exhausted, empty list if no matches found.
        
        STRICT MATCHING: Only returns videos where BOTH team names clearly appear.
        Better to return empty than wrong highlights.
        
        Args:
            match_date: Date of the match. Videos published 2 days before to 7 days after are considered.
        """
        try:
            videos = []
            
            # Normalize team names for matching
            home_lower = home_team.lower()
            away_lower = away_team.lower()
            
            # Get the most unique/identifying part of each team name
            # e.g., "Atlético Madrid" -> "atlético" (not "madrid" which is ambiguous)
            home_unique = self._get_unique_team_identifier(home_team)
            away_unique = self._get_unique_team_identifier(away_team)
            
            # Date filtering: highlights usually uploaded within 24-48 hours after match
            # Keep tight window (1-2 days) to avoid showing old videos as highlights
            earliest_date = None
            latest_date = None
            if match_date:
                # Always use tight window: 1 day before to 2 days after match
                # This ensures we only show fresh highlights, never 30-day-old videos
                earliest_date = match_date - timedelta(days=1)
                latest_date = match_date + timedelta(days=2)
                
                print(f"[YouTube] Searching {playlist_id} for videos between {earliest_date} and {latest_date}")
            
            # Paginate through playlist to find videos (up to 150 videos = 3 pages)
            # With tight 1-2 day window, 3 pages should be sufficient
            next_page_token = None
            pages_fetched = 0
            max_pages = 3
            
            while pages_fetched < max_pages:
                request_params = {
                    'part': 'snippet',
                    'playlistId': playlist_id,
                    'maxResults': 50
                }
                if next_page_token:
                    request_params['pageToken'] = next_page_token
                    
                response = self.youtube.playlistItems().list(**request_params).execute()
                pages_fetched += 1
                
                # Process items from this page
                for item in response.get('items', []):
                    snippet = item['snippet']
                    title_lower = snippet['title'].lower()
                    published_at = snippet.get('publishedAt', '')
                    
                    # DATE FILTERING: Skip videos outside the date range
                    if match_date and published_at:
                        try:
                            # Parse ISO 8601 date (e.g., "2025-12-23T14:40:13Z")
                            video_date = datetime.fromisoformat(published_at.replace('Z', '+00:00')).date()
                            
                            # Skip if video is too old or too new
                            if video_date < earliest_date or video_date > latest_date:
                                continue
                            
                            # Stop searching if we've gone too far back in time
                            if video_date < earliest_date:
                                print(f"[YouTube] Reached videos older than {earliest_date}, stopping search")
                                next_page_token = None  # Stop pagination
                                break
                        except (ValueError, AttributeError) as e:
                            # If date parsing fails, include the video (don't filter)
                            pass
                    
                    # STRICT MATCHING: Check if BOTH teams are clearly mentioned
                    home_match = self._team_matches_title(home_team, home_unique, title_lower)
                    away_match = self._team_matches_title(away_team, away_unique, title_lower)
                    
                    # Check for highlight-related keywords
                    highlight_keywords = ['highlight', 'extended', 'recap', 'goals', 'summary', 'resumen']
                    has_highlight = any(kw in title_lower for kw in highlight_keywords)
                    
                    # REQUIRE BOTH teams AND highlight keyword
                    if home_match and away_match and has_highlight:
                        videos.append({
                            'video_id': snippet['resourceId']['videoId'],
                            'title': snippet['title'],
                            'description': snippet.get('description', ''),
                            'thumbnail_url': snippet['thumbnails'].get('high', {}).get('url') or
                                            snippet['thumbnails'].get('medium', {}).get('url'),
                            'channel_title': snippet['channelTitle'],
                            'published_at': snippet['publishedAt'],
                            'view_count': None,
                            'duration': None,
                            'is_geo_blocked': False,
                            'blocked_countries': [],
                            'allowed_countries': []
                        })
                
                # Get next page token, break if no more pages
                next_page_token = response.get('nextPageToken')
                if not next_page_token:
                    break
            
            # Sort videos by publish date (newest first) to prefer recent uploads
            if videos:
                videos.sort(key=lambda v: v.get('published_at', ''), reverse=True)
                # Enrich with region restriction details
                video_ids = [v['video_id'] for v in videos]
                if video_ids:
                    videos = self._enrich_video_details(videos, video_ids)
            
            return videos[:max_results]
        except HttpError as e:
            # Check if quota exceeded
            if 'quotaExceeded' in str(e):
                if self._rotate_api_key():
                    # Retry with new key
                    return self._search_channel_playlist(playlist_id, home_team, away_team, match_date, max_results)
                # All keys exhausted
                return None
            print(f"Playlist API error: {e}")
            return []
    
    def _normalize_text(self, text: str) -> str:
        """Normalize text by removing accents and converting to lowercase.
        This helps match 'Atlético' with 'Atletico', etc.
        """
        import unicodedata
        # Normalize unicode characters and remove accents
        normalized = unicodedata.normalize('NFD', text.lower())
        # Remove combining diacritical marks (accents)
        return ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')
    
    def _get_unique_team_identifier(self, team_name: str) -> str:
        """Extract the most unique/identifying part of a team name.
        
        Examples:
        - 'Atlético Madrid' -> 'atletico madrid' (normalized, not 'madrid' which matches Real Madrid)
        - 'Real Madrid' -> 'real madrid' (need both words)
        - 'Manchester United' -> 'manchester' (unique enough)
        - 'Manchester City' -> 'manchester city' (need both to distinguish from United)
        - 'Aston Villa' -> 'aston villa' (need both words)
        - 'West Ham' -> 'west ham' (need both words)
        - 'Fatih Karagümrük' -> 'karagumruk' (normalized, unique identifier)
        """
        team_normalized = self._normalize_text(team_name)
        
        # Teams that need FULL name to be unique (ambiguous otherwise)
        # Use normalized (no accents) versions
        full_name_required = [
            'real madrid', 'atletico madrid',
            'manchester united', 'manchester city',
            'aston villa', 'west ham',
            'inter milan', 'ac milan',
            'real sociedad', 'real betis',
            'sporting', 'athletic',
            # Turkish teams with potentially ambiguous names
            'istanbul basaksehir', 'caykur rizespor',
        ]
        
        for full_name in full_name_required:
            if full_name in team_normalized:
                return full_name
        
        # For other teams, the first distinctive word is usually enough
        # But remove common suffixes
        common_suffixes = {'fc', 'cf', 'sc', 'afc', 'united', 'city'}
        parts = [p for p in team_normalized.split() if p not in common_suffixes and len(p) > 2]
        
        if parts:
            return parts[0]
        
        return team_normalized
    
    def _team_matches_title(self, team_full: str, team_unique: str, title: str) -> bool:
        """Check if a team is mentioned in the video title.
        
        Uses strict matching to avoid false positives like:
        - 'Atlético Madrid' matching 'Real Madrid' (both have 'Madrid')
        - 'Aston Villa' matching 'West Ham vs Aston Villa' for wrong match
        
        Normalizes accents so 'Atlético' matches 'Atletico', 'Karagümrük' matches 'Karagumruk'.
        """
        title_normalized = self._normalize_text(title)
        team_normalized = self._normalize_text(team_full)
        
        # Alternate spellings for teams (especially Turkish teams with special chars)
        # Maps normalized team name -> list of acceptable variations in video titles
        alternate_names = {
            'f.c. kopenhavn': ['f.c. københavn', 'fc kopenhavn', 'kobenhavn', 'copenhagen'],
            'barcelona': ['barcelona', 'barca', 'barça'],
            'fatih karagumruk': ['karagumruk', 'karagümrük', 'f. karagumruk'],
            'caykur rizespor': ['rizespor', 'caykur', 'çaykur'],
            'istanbul basaksehir': ['basaksehir', 'başakşehir', 'i. basaksehir'],
            'besiktas': ['besiktas', 'beşiktaş', 'bjk'],
            'fenerbahce': ['fenerbahce', 'fenerbahçe', 'fener', 'fb'],
            'galatasaray': ['galatasaray', 'gala', 'gs'],
            # Italian teams - handle "Inter Milan" vs "Inter"
            'inter milan': ['inter', 'inter milan', 'internazionale'],
            'ac milan': ['milan', 'ac milan'],
            # English teams
            'manchester united': ['man united', 'man utd', 'manchester united'],
            'manchester city': ['man city', 'manchester city'],
            'tottenham hotspur': ['tottenham', 'spurs'],
            'newcastle united': ['newcastle'],
            'west ham united': ['west ham'],
            'aston villa': ['villa', 'aston villa'],
        }
        
        # Best case: full team name appears (normalized)
        if team_normalized in title_normalized:
            return True
        
        # Check for alternate names
        for main_name, alternates in alternate_names.items():
            if main_name in team_normalized:
                for alt in alternates:
                    alt_normalized = self._normalize_text(alt)
                    if alt_normalized in title_normalized:
                        return True
        
        # Check for unique identifier (stricter matching)
        # team_unique is already normalized from _get_unique_team_identifier
        if team_unique and team_unique in title_normalized:
            # Extra validation: make sure it's not a partial match of different team
            # e.g., "atletico" should not match if title has "Athletic Club"
            if team_unique == 'atletico madrid':
                # Must not be "Athletic Club" or "Athletic Bilbao" without atletico
                if 'athletic' in title_normalized and 'atletico' not in title_normalized:
                    return False
            return True
        
        return False
    
    def _search_youtube(self, query: str, max_results: int = 5) -> List[Dict]:
        published_after = (datetime.utcnow() - timedelta(days=7)).isoformat() + 'Z'
        
        search_response = self.youtube.search().list(
            q=query,
            part='id,snippet',
            type='video',
            maxResults=max_results,
            order='relevance',
            publishedAfter=published_after,
            videoDuration='medium',
            relevanceLanguage='en'
        ).execute()
        
        videos = []
        video_ids = []
        
        for item in search_response.get('items', []):
            video_id = item['id']['videoId']
            video_ids.append(video_id)
            
            snippet = item['snippet']
            videos.append({
                'video_id': video_id,
                'title': snippet['title'],
                'description': snippet.get('description', ''),
                'thumbnail_url': snippet['thumbnails'].get('high', {}).get('url') or 
                                snippet['thumbnails'].get('medium', {}).get('url') or
                                snippet['thumbnails'].get('default', {}).get('url'),
                'channel_title': snippet['channelTitle'],
                'published_at': snippet['publishedAt'],
                'view_count': None,
                'duration': None,
                'is_geo_blocked': False,
                'blocked_countries': [],
                'allowed_countries': []
            })
        
        if video_ids:
            videos = self._enrich_video_details(videos, video_ids)
        
        return videos
    
    def _enrich_video_details(self, videos: List[Dict], video_ids: List[str]) -> List[Dict]:
        try:
            details_response = self.youtube.videos().list(
                part='statistics,contentDetails,status',
                id=','.join(video_ids)
            ).execute()
            
            details_map = {}
            for item in details_response.get('items', []):
                vid_id = item['id']
                stats = item.get('statistics', {})
                content = item.get('contentDetails', {})
                status = item.get('status', {})
                
                # Check for region restrictions
                region_restriction = content.get('regionRestriction', {})
                blocked_countries = region_restriction.get('blocked', [])
                allowed_countries = region_restriction.get('allowed', [])
                
                # Determine if video is geo-blocked
                is_geo_blocked = len(blocked_countries) > 0 or (len(allowed_countries) > 0)
                
                details_map[vid_id] = {
                    'view_count': int(stats.get('viewCount', 0)),
                    'duration': self._parse_duration(content.get('duration', '')),
                    'is_geo_blocked': is_geo_blocked,
                    'blocked_countries': blocked_countries,
                    'allowed_countries': allowed_countries,
                }
            
            for video in videos:
                if video['video_id'] in details_map:
                    video.update(details_map[video['video_id']])
            
        except HttpError:
            pass
        
        return videos
    
    def _parse_duration(self, duration: str) -> str:
        match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration)
        if match:
            hours = int(match.group(1) or 0)
            minutes = int(match.group(2) or 0)
            seconds = int(match.group(3) or 0)
            
            if hours > 0:
                return f"{hours}:{minutes:02d}:{seconds:02d}"
            else:
                return f"{minutes}:{seconds:02d}"
        return duration
    
    def _rank_videos(self, videos: List[Dict], home_team: str, away_team: str) -> List[Dict]:
        # Official league and broadcaster channels
        official_channels = [
            'premier league', 'la liga', 'laliga', 'serie a', 'bundesliga', 'ligue 1',
            'uefa', 'champions league', 'espn', 'sky sports', 'bt sport',
            'bein sports', 'nbc sports', 'cbs sports', 'cbs sports golazo', 'fox sports',
            'liga mx', 'eredivisie', 'primeira liga', 'süper lig',
            'dazn', 'paramount+', 'amazon prime', 'tnt sports'
        ]
        
        # Filter and categorize videos
        official_videos = []
        extended_videos = []
        
        for video in videos:
            title_lower = video['title'].lower()
            
            is_extended = 'extended' in title_lower or 'full' in title_lower
            
            # Categorize videos
            if is_extended:
                extended_videos.append(video)
            else:
                official_videos.append(video)
        
        # Prioritize: official first, then extended
        filtered_videos = official_videos + extended_videos
        
        # If we have no official/extended, return empty (strict filtering)
        if not filtered_videos:
            return []
        
        # Score remaining videos
        def score_video(video: Dict) -> int:
            score = 0
            title_lower = video['title'].lower()
            
            if 'extended' in title_lower:
                score += 50
            if 'highlights' in title_lower:
                score += 40
            if 'goals' in title_lower:
                score += 30
            
            if home_team.lower() in title_lower:
                score += 25
            if away_team.lower() in title_lower:
                score += 25
            
            if video.get('view_count'):
                if video['view_count'] > 1000000:
                    score += 40
                elif video['view_count'] > 100000:
                    score += 30
                elif video['view_count'] > 10000:
                    score += 20
            
            # Geo-diversity bonus: prioritize videos with wider availability
            blocked_countries = video.get('blocked_countries', [])
            allowed_countries = video.get('allowed_countries', [])
            
            if blocked_countries:
                # Penalize based on number of blocked countries
                blocked_count = len(blocked_countries)
                if blocked_count == 0:
                    score += 100  # Worldwide available = highest priority
                elif blocked_count < 5:
                    score += 60   # Minimally restricted (e.g., blocked in 1-4 countries)
                elif blocked_count < 20:
                    score += 30   # Moderately restricted
                elif blocked_count < 50:
                    score += 10   # Significantly restricted
                # else: heavily restricted (50+ countries), no bonus
            elif allowed_countries:
                # Has allowlist - only available in specific countries
                allowed_count = len(allowed_countries)
                if allowed_count > 100:
                    score += 80   # Available in many countries
                elif allowed_count > 50:
                    score += 50   # Available in moderate number of countries
                elif allowed_count > 20:
                    score += 30   # Available in some countries
                else:
                    score += 10   # Limited availability (20 or fewer countries)
            else:
                # No geo restrictions at all = best case
                score += 100
            
            return score
        
        for video in filtered_videos:
            video['_score'] = score_video(video)
        
        filtered_videos.sort(key=lambda x: x['_score'], reverse=True)
        
        for video in filtered_videos:
            video.pop('_score', None)
        
        return filtered_videos
    
    def _get_mock_highlights(self, home_team: str, away_team: str) -> List[Dict]:
        return [
            {
                'video_id': f'mock_{home_team[:3]}_{away_team[:3]}_1',
                'title': f'{home_team} vs {away_team} - Full Match Highlights',
                'description': f'Watch the full highlights from {home_team} vs {away_team}',
                'thumbnail_url': 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                'channel_title': 'Football Highlights HD',
                'published_at': datetime.utcnow().isoformat() + 'Z',
                'view_count': 150000,
                'duration': '10:25'
            },
            {
                'video_id': f'mock_{home_team[:3]}_{away_team[:3]}_2',
                'title': f'{home_team} vs {away_team} | All Goals & Extended Highlights',
                'description': f'Extended highlights featuring all goals from the match',
                'thumbnail_url': 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                'channel_title': 'Premier League',
                'published_at': datetime.utcnow().isoformat() + 'Z',
                'view_count': 500000,
                'duration': '15:30'
            }
        ]


def get_youtube_service() -> YouTubeService:
    return YouTubeService()
