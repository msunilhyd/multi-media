import httpx
from datetime import date, datetime, timedelta
from typing import List, Dict, Optional


class CricketAPI:
    """
    Client for Cricket Data API - FREE, no API key required!
    Covers IPL and other cricket leagues with real match data
    """
    BASE_URL = "https://api.cricapi.com/v1"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or "test"  # Free tier available
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        }
    
    async def get_ipl_matches(self, target_date: Optional[date] = None) -> List[Dict]:
        """Fetch IPL matches for a specific date or upcoming matches"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Get upcoming matches
                url = f"{self.BASE_URL}/matches"
                params = {
                    "apikey": self.api_key,
                    "type": "upcoming"
                }
                
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                # Filter for IPL matches
                ipl_matches = []
                if data.get("data"):
                    for match in data["data"]:
                        if "IPL" in match.get("series", ""):
                            ipl_matches.append(self._parse_match(match))
                
                return ipl_matches
        except Exception as e:
            print(f"Error fetching IPL matches: {e}")
            return []
    
    async def get_ipl_match_details(self, match_id: str) -> Optional[Dict]:
        """Fetch detailed information about a specific IPL match"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                url = f"{self.BASE_URL}/match_info"
                params = {
                    "apikey": self.api_key,
                    "id": match_id
                }
                
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                if data.get("data"):
                    return self._parse_match_details(data["data"])
                return None
        except Exception as e:
            print(f"Error fetching match details: {e}")
            return None
    
    def _parse_match(self, match_data: Dict) -> Dict:
        """Parse match data from API response"""
        return {
            "id": match_data.get("id"),
            "series": match_data.get("series"),
            "team1": match_data.get("t1"),
            "team2": match_data.get("t2"),
            "match_date": match_data.get("dateTimeGMT"),
            "status": match_data.get("status"),
            "venue": match_data.get("venue"),
            "format": match_data.get("format"),
        }
    
    def _parse_match_details(self, match_data: Dict) -> Dict:
        """Parse detailed match data"""
        return {
            "id": match_data.get("id"),
            "series": match_data.get("series"),
            "team1": match_data.get("t1"),
            "team2": match_data.get("t2"),
            "match_date": match_data.get("dateTimeGMT"),
            "status": match_data.get("status"),
            "venue": match_data.get("venue"),
            "format": match_data.get("format"),
            "toss": match_data.get("toss"),
            "score": match_data.get("score"),
        }


class IPLDataFetcher:
    """
    Fetches IPL match data from multiple sources
    Provides fallback options if primary API fails
    """
    
    def __init__(self):
        self.cricket_api = CricketAPI()
    
    async def get_upcoming_ipl_matches(self) -> List[Dict]:
        """Get upcoming IPL matches"""
        return await self.cricket_api.get_ipl_matches()
    
    async def get_ipl_match_by_date(self, target_date: date) -> List[Dict]:
        """Get IPL matches for a specific date"""
        matches = await self.cricket_api.get_ipl_matches(target_date)
        return matches
    
    def get_ipl_teams(self) -> List[Dict]:
        """Get list of all IPL teams"""
        return [
            {"name": "Mumbai Indians", "short_name": "MI", "logo": ""},
            {"name": "Chennai Super Kings", "short_name": "CSK", "logo": ""},
            {"name": "Delhi Capitals", "short_name": "DC", "logo": ""},
            {"name": "Kolkata Knight Riders", "short_name": "KKR", "logo": ""},
            {"name": "Rajasthan Royals", "short_name": "RR", "logo": ""},
            {"name": "Royal Challengers Bangalore", "short_name": "RCB", "logo": ""},
            {"name": "Sunrisers Hyderabad", "short_name": "SRH", "logo": ""},
            {"name": "Punjab Kings", "short_name": "PBKS", "logo": ""},
            {"name": "Lucknow Super Giants", "short_name": "LSG", "logo": ""},
            {"name": "Gujarat Titans", "short_name": "GT", "logo": ""},
        ]
