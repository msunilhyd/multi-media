"""
YouTube RSS Feed Service - Fast, quota-free highlight discovery
Polls YouTube channel RSS feeds every 10-15 minutes for instant highlight detection
"""
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional
import re
from .config import get_settings

settings = get_settings()


class YouTubeRSSService:
    """
    YouTube RSS Feed parser for real-time highlight discovery.
    
    Each YouTube channel has an RSS feed:
    https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}
    
    Benefits:
    - FREE - No API quota used
    - FAST - Updated within seconds of video upload
    - SIMPLE - Just parse XML
    """
    
    # Same channels as YouTubeService but without UU prefix (RSS uses UC channel IDs)
    CHANNEL_IDS = {
        "Premier League": [
            "UCG5qGWdu8nIRZqJ_GgDwQ-w",   # Premier League Official
            "UCKy1dAqELo0zrOtPkf0eTMw",   # Sky Sports Football
            "UCET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo
            "UC6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "La Liga": [
            "UC6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Bundesliga": [
            "UC6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Serie A": [
            "UCET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo
        ],
        "Ligue 1": [
            "UC6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Champions League": [
            "UCET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo
        ],
        "Europa League": [
            "UCyGa1YEx9ST66rYrJTGIKOw",   # UEFA Official
            "UCET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo
            "UC6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "FA Cup": [
            "UCG5qGWdu8nIRZqJ_GgDwQ-w",   # Premier League Official
            "UCKy1dAqELo0zrOtPkf0eTMw",   # Sky Sports Football
            "UC6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "English League Cup": [
            "UCKy1dAqELo0zrOtPkf0eTMw",   # Sky Sports Football
            "UCET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo
        ],
        "EFL Cup": [
            "UCKy1dAqELo0zrOtPkf0eTMw",   # Sky Sports Football
            "UCET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo
        ],
        "Copa del Rey": [
            "UC6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Supercopa de España": [
            "UC6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Coppa Italia": [
            "UCET00YnetHT7tOpu12v8jxg",   # CBS Sports Golazo
        ],
        "DFB-Pokal": [
            "UC6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Coupe de France": [
            "UC6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
        "Indian Super League": [
            "UCSQ8md_xMUPrIxiH-lT2-xw",   # ISL Official
        ],
        "MLS": [
            "UCSZbXT5TLLW_i-5W8FZpFsg",   # Major League Soccer
        ],
        "Süper Lig": [
            "UC0YatYmg5JRYzXJPxIdRd8g",   # beIN SPORTS USA
        ],
        "AFCON": [
            "UC0YatYmg5JRYzXJPxIdRd8g",   # beIN SPORTS USA
            "UC6c1z7bA__85CIWZ_jpCK-Q",   # ESPN FC
        ],
    }
    
    # XML namespaces used in YouTube RSS feeds
    NAMESPACES = {
        'atom': 'http://www.w3.org/2005/Atom',
        'media': 'http://search.yahoo.com/mrss/',
        'yt': 'http://www.youtube.com/xml/schemas/2015'
    }
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
    
    def _extract_video_id_from_url(self, url: str) -> Optional[str]:
        """Extract video ID from YouTube URL"""
        # RSS feed video URLs are like: https://www.youtube.com/watch?v=VIDEO_ID
        if 'v=' in url:
            return url.split('v=')[1].split('&')[0]
        return None
    
    def _parse_duration(self, duration_str: Optional[str]) -> Optional[str]:
        """Parse ISO 8601 duration (PT1H2M3S) to human readable format"""
        if not duration_str:
            return None
        
        try:
            # Remove PT prefix
            duration_str = duration_str.replace('PT', '')
            
            hours = 0
            minutes = 0
            seconds = 0
            
            if 'H' in duration_str:
                hours = int(duration_str.split('H')[0])
                duration_str = duration_str.split('H')[1]
            
            if 'M' in duration_str:
                minutes = int(duration_str.split('M')[0])
                duration_str = duration_str.split('M')[1]
            
            if 'S' in duration_str:
                seconds = int(duration_str.replace('S', ''))
            
            if hours > 0:
                return f"{hours}:{minutes:02d}:{seconds:02d}"
            else:
                return f"{minutes}:{seconds:02d}"
        except:
            return None
    
    async def fetch_channel_feed(self, channel_id: str) -> List[Dict]:
        """
        Fetch and parse RSS feed for a single channel.
        Returns list of recent videos (typically last 15 videos).
        """
        rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
        
        try:
            response = await self.client.get(rss_url)
            response.raise_for_status()
            
            # Parse XML
            root = ET.fromstring(response.content)
            
            videos = []
            
            # Find all entry elements (each is a video)
            for entry in root.findall('atom:entry', self.NAMESPACES):
                try:
                    # Extract video data
                    video_id_elem = entry.find('yt:videoId', self.NAMESPACES)
                    title_elem = entry.find('atom:title', self.NAMESPACES)
                    published_elem = entry.find('atom:published', self.NAMESPACES)
                    channel_name_elem = entry.find('atom:author/atom:name', self.NAMESPACES)
                    
                    # Media group for thumbnail and description
                    media_group = entry.find('media:group', self.NAMESPACES)
                    description_elem = media_group.find('media:description', self.NAMESPACES) if media_group else None
                    thumbnail_elem = media_group.find('media:thumbnail', self.NAMESPACES) if media_group else None
                    
                    if video_id_elem is not None and title_elem is not None:
                        video = {
                            'youtube_video_id': video_id_elem.text,
                            'title': title_elem.text,
                            'description': description_elem.text if description_elem is not None else None,
                            'channel_title': channel_name_elem.text if channel_name_elem is not None else None,
                            'published_at': published_elem.text if published_elem is not None else None,
                            'thumbnail_url': thumbnail_elem.get('url') if thumbnail_elem is not None else None,
                        }
                        
                        videos.append(video)
                
                except Exception as e:
                    print(f"[RSS] Error parsing video entry: {e}")
                    continue
            
            return videos
        
        except Exception as e:
            print(f"[RSS] Error fetching feed for channel {channel_id}: {e}")
            return []
    
    def _matches_team_names(self, title: str, home_team: str, away_team: str) -> bool:
        """Check if video title contains both team names (case insensitive)"""
        title_lower = title.lower()
        home_lower = home_team.lower()
        away_lower = away_team.lower()
        
        # Check for full team names
        if home_lower in title_lower and away_lower in title_lower:
            return True
        
        # Check for common team name variations
        # E.g., "Manchester United" -> "Man United", "Man Utd"
        home_parts = home_lower.split()
        away_parts = away_lower.split()
        
        # If team name has multiple words, check if key parts are present
        if len(home_parts) > 1 and len(away_parts) > 1:
            # Check if first word of each team is in title (e.g., "Arsenal" from "Arsenal FC")
            home_key = home_parts[0]
            away_key = away_parts[0]
            
            if home_key in title_lower and away_key in title_lower:
                return True
        
        return False
    
    def _is_highlight_video(self, title: str, description: Optional[str]) -> bool:
        """Check if video is likely a highlight/recap video"""
        title_lower = title.lower()
        
        # Positive indicators
        highlight_keywords = [
            'highlight', 'highlights', 'recap', 'extended highlights',
            'full highlights', 'match highlights', 'goals', 'best moments',
            'all goals', 'résumé', 'resumen', 'zusammenfassung'
        ]
        
        # Negative indicators (not highlights)
        negative_keywords = [
            'live', 'full match', 'press conference', 'interview',
            'preview', 'prediction', 'analysis', 'reaction',
            'build-up', 'warm up', 'training'
        ]
        
        # Check for negative keywords first
        for keyword in negative_keywords:
            if keyword in title_lower:
                return False
        
        # Check for positive keywords
        for keyword in highlight_keywords:
            if keyword in title_lower:
                return True
        
        return False
    
    async def find_recent_highlights_for_match(
        self,
        home_team: str,
        away_team: str,
        league_name: str,
        match_date: date,
        hours_lookback: int = 24
    ) -> List[Dict]:
        """
        Search recent RSS feeds for highlights matching the given match.
        
        Args:
            home_team: Home team name
            away_team: Away team name
            league_name: League name to determine which channels to check
            match_date: Date of the match
            hours_lookback: How many hours back to check (default 24)
        
        Returns:
            List of matching highlight videos
        """
        # Get channels for this league
        channels = self.CHANNEL_IDS.get(league_name, [])
        if not channels:
            print(f"[RSS] No channels configured for league: {league_name}")
            return []
        
        print(f"[RSS] Searching {len(channels)} channels for {home_team} vs {away_team}")
        
        all_matches = []
        cutoff_time = datetime.now() - timedelta(hours=hours_lookback)
        
        for channel_id in channels:
            videos = await self.fetch_channel_feed(channel_id)
            
            for video in videos:
                # Check published time
                if video.get('published_at'):
                    try:
                        pub_time = datetime.fromisoformat(video['published_at'].replace('Z', '+00:00'))
                        # Convert to naive datetime for comparison
                        pub_time = pub_time.replace(tzinfo=None)
                        
                        if pub_time < cutoff_time:
                            continue  # Too old
                    except:
                        pass
                
                # Check if title matches teams and is a highlight video
                if self._matches_team_names(video['title'], home_team, away_team):
                    if self._is_highlight_video(video['title'], video.get('description')):
                        # Add is_official flag based on channel
                        video['is_official'] = True  # RSS channels are all official/verified
                        all_matches.append(video)
                        print(f"[RSS] ✓ Found: {video['title']}")
        
        return all_matches


async def get_rss_service() -> YouTubeRSSService:
    """Get RSS service instance"""
    return YouTubeRSSService()
