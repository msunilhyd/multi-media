from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import re
from .config import get_settings

settings = get_settings()


class YouTubeQuotaExhaustedError(Exception):
    """Raised when all YouTube API keys have exceeded their quota"""
    pass


class YouTubeService:
    # Official channel uploads playlists (replace UC prefix with UU for uploads)
    OFFICIAL_CHANNELS = {
        "Premier League": "UUG5qGWdu8nIRZqJ_GgDwQ-w",      # Premier League Official
        "La Liga": "UUTv-XvfzLX3i4IGWAm4sbmA",            # LaLiga Official
        "Bundesliga": "UUGYYNGmyhZ_kwBF_lqqXdAQ",          # Bundesliga Official
        "Serie A": "UUBJeMCIeLQos7wacox4hmLQ",             # Serie A Official
        "Ligue 1": "UUFosdztTqHjV_3YcR9gGSKg",             # Ligue 1 Official
        "Champions League": "UUET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo (official UCL)
        "Europa League": "UUET00YnetHT7tOpu12v8jxg",       # CBS Sports Golazo
        "Copa del Rey": "UU6c1z7bA__85CIWZ_jpCK-Q",        # ESPN FC
        "Coupe de France": "UU0YatYmg5JRYzXJPxIdRd8g",     # Coupe de France Official
        "DFB-Pokal": "UUGYYNGmyhZ_kwBF_lqqXdAQ",           # Bundesliga Official (covers DFB Pokal)
        "Coppa Italia": "UUET00YnetHT7tOpu12v8jxg",        # CBS Sports Golazo
        "FA Cup": "UUG5qGWdu8nIRZqJ_GgDwQ-w",              # Premier League Official
        "League Cup": "UUET00YnetHT7tOpu12v8jxg",          # CBS Sports Golazo
    }
    
    # Additional channels to search for each league (fallback) - ordered by priority
    # Using uploads playlist IDs (UU prefix instead of UC)
    FALLBACK_CHANNELS = {
        "Premier League": [
            "UUG5qGWdu8nIRZqJ_GgDwQ-w",   # Premier League Official
            "UUqZQlzSHbVJrwrn5XvzrzcA",   # NBC Sports (NBCSN)
            "UUKy1dAqELo0zrOtPkf0eTMw",   # Sky Sports Football
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
            "UUET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo
        ],
        "La Liga": [
            "UUTv-XvfzLX3i4IGWAm4sbmA",   # LaLiga Official
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
            "UUET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo
        ],
        "Bundesliga": [
            "UUGYYNGmyhZ_kwBF_lqqXdAQ",   # Bundesliga Official
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Serie A": [
            "UUBJeMCIeLQos7wacox4hmLQ",   # Serie A Official
            "UUET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Ligue 1": [
            "UUFosdztTqHjV_3YcR9gGSKg",   # Ligue 1 Official
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
            "UUET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo
            "UUKy1dAqELo0zrOtPkf0eTMw",   # Sky Sports Football
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Copa del Rey": [
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
            "UUTv-XvfzLX3i4IGWAm4sbmA",   # LaLiga Official
        ],
        "Coppa Italia": [
            "UUET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo
            "UUBJeMCIeLQos7wacox4hmLQ",   # Serie A Official
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "DFB-Pokal": [
            "UUGYYNGmyhZ_kwBF_lqqXdAQ",   # Bundesliga Official
            "UU6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Coupe de France": [
            "UU0YatYmg5JRYzXJPxIdRd8g",   # Coupe de France Official
            "UUFosdztTqHjV_3YcR9gGSKg",   # Ligue 1 Official
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
    
    def search_highlights(self, home_team: str, away_team: str, league: str = None, max_results: int = 5) -> List[Dict]:
        """
        Search for match highlights using channel playlists only (no expensive search API).
        Each playlist call costs only 3 API units vs 100 units for search.
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
    
    def _search_channel_playlist(self, playlist_id: str, home_team: str, away_team: str, max_results: int = 10) -> Optional[List[Dict]]:
        """Search recent videos from official channel uploads playlist (3 units per page)
        Returns None if all API keys are exhausted, empty list if no matches found.
        """
        try:
            videos = []
            home_lower = home_team.lower()
            away_lower = away_team.lower()
            
            # Create smart partial matches - avoid common words like "City", "United", "FC"
            common_words = {'city', 'united', 'fc', 'club', 'real', 'athletic', 'sporting'}
            home_parts = [part.lower() for part in home_team.split() if len(part) > 2 and part.lower() not in common_words]
            away_parts = [part.lower() for part in away_team.split() if len(part) > 2 and part.lower() not in common_words]
            
            # Paginate through playlist to find older videos (up to 150 videos = 3 pages)
            next_page_token = None
            pages_fetched = 0
            max_pages = 3  # Fetch up to 150 videos
            
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
            
            for item in response.get('items', []):
                snippet = item['snippet']
                title_lower = snippet['title'].lower()
                desc_lower = snippet.get('description', '').lower()
                
                # Check if team is mentioned - prefer full name, fallback to unique parts
                home_match = home_lower in title_lower or (home_parts and any(part in title_lower for part in home_parts))
                away_match = away_lower in title_lower or (away_parts and any(part in title_lower for part in away_parts))
                
                # Check for highlight-related keywords
                highlight_keywords = ['highlight', 'extended', 'recap', 'goals', 'summary', 'resumen']
                has_highlight = any(kw in title_lower for kw in highlight_keywords)
                
                # For accurate matching: REQUIRE BOTH teams to be mentioned
                # This prevents "Man City vs Brentford" matching when looking for "Real Madrid vs Man City"
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
                        'is_official': True
                    })
            
            return videos[:max_results]
        except HttpError as e:
            # Check if quota exceeded
            if 'quotaExceeded' in str(e):
                if self._rotate_api_key():
                    # Retry with new key
                    return self._search_channel_playlist(playlist_id, home_team, away_team, max_results)
                # All keys exhausted
                return None
            print(f"Playlist API error: {e}")
            return []
    
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
                'duration': None
            })
        
        if video_ids:
            videos = self._enrich_video_details(videos, video_ids)
        
        return videos
    
    def _enrich_video_details(self, videos: List[Dict], video_ids: List[str]) -> List[Dict]:
        try:
            details_response = self.youtube.videos().list(
                part='statistics,contentDetails',
                id=','.join(video_ids)
            ).execute()
            
            details_map = {}
            for item in details_response.get('items', []):
                vid_id = item['id']
                stats = item.get('statistics', {})
                content = item.get('contentDetails', {})
                details_map[vid_id] = {
                    'view_count': int(stats.get('viewCount', 0)),
                    'duration': self._parse_duration(content.get('duration', ''))
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
            channel_lower = video['channel_title'].lower()
            
            is_official = any(ch in channel_lower for ch in official_channels)
            is_extended = 'extended' in title_lower or 'full' in title_lower
            
            video['is_official'] = is_official
            
            # Only keep official channels OR extended highlights
            if is_official:
                official_videos.append(video)
            elif is_extended:
                extended_videos.append(video)
        
        # Prioritize: official first, then extended
        filtered_videos = official_videos + extended_videos
        
        # If we have no official/extended, return empty (strict filtering)
        if not filtered_videos:
            return []
        
        # Score remaining videos
        def score_video(video: Dict) -> int:
            score = 0
            title_lower = video['title'].lower()
            
            if video.get('is_official'):
                score += 100
            
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
                'duration': '10:25',
                'is_official': False
            },
            {
                'video_id': f'mock_{home_team[:3]}_{away_team[:3]}_2',
                'title': f'{home_team} vs {away_team} | All Goals & Extended Highlights',
                'description': f'Extended highlights featuring all goals from the match',
                'thumbnail_url': 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                'channel_title': 'Premier League',
                'published_at': datetime.utcnow().isoformat() + 'Z',
                'view_count': 500000,
                'duration': '15:30',
                'is_official': True
            }
        ]


def get_youtube_service() -> YouTubeService:
    return YouTubeService()
