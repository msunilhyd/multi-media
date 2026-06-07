"""
Multi-sport API integrations for NBA, Tennis, NHL, NFL, MLB, FIFA
Uses free/public APIs for match data fetching
"""
import httpx
from datetime import date, datetime, timedelta
from typing import List, Dict, Optional


class NBAApi:
    """NBA matches from ESPN API"""
    BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
    
    async def get_matches(self, target_date: Optional[date] = None) -> List[Dict]:
        """Fetch NBA matches for a specific date"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.BASE_URL}/scoreboard")
                response.raise_for_status()
                data = response.json()
                
                matches = []
                if data.get("events"):
                    for event in data["events"]:
                        parsed = self._parse_event(event)
                        if parsed:
                            matches.append(parsed)
                
                return matches
        except Exception as e:
            print(f"Error fetching NBA matches: {e}")
            return []
    
    def _parse_event(self, event: Dict) -> Optional[Dict]:
        """Parse NBA event into match format"""
        try:
            competitions = event.get("competitions", [{}])
            if not competitions:
                return None
            
            comp = competitions[0]
            competitors = comp.get("competitors", [])
            
            if len(competitors) < 2:
                return None
            
            home = next((c for c in competitors if c.get("homeAway") == "home"), competitors[1])
            away = next((c for c in competitors if c.get("homeAway") == "away"), competitors[0])
            
            match_date_str = event.get("date", "")
            match_date = datetime.fromisoformat(match_date_str.replace("Z", "+00:00")).date() if match_date_str else date.today()
            
            status = comp.get("status", {}).get("type", "")
            status_map = {"pre": "scheduled", "in": "live", "post": "finished"}
            
            home_score = comp.get("competitors", [{}])[1].get("score") if len(competitors) > 1 else None
            away_score = comp.get("competitors", [{}])[0].get("score") if len(competitors) > 0 else None
            
            return {
                "home_team": home.get("team", {}).get("displayName", ""),
                "away_team": away.get("team", {}).get("displayName", ""),
                "match_date": match_date,
                "match_time": match_date_str.split("T")[1][:5] if "T" in match_date_str else "20:00",
                "status": status_map.get(status, "scheduled"),
                "home_score": home_score,
                "away_score": away_score
            }
        except Exception as e:
            print(f"Error parsing NBA event: {e}")
            return None


class TennisApi:
    """Tennis matches from ATP/WTA data"""
    BASE_URL = "https://www.tennis-explorer.com"
    
    async def get_matches(self, target_date: Optional[date] = None) -> List[Dict]:
        """Fetch Tennis matches - using public tournament data"""
        try:
            # For now, return empty - Tennis API requires scraping
            # In production, use dedicated tennis API or scraping
            return []
        except Exception as e:
            print(f"Error fetching Tennis matches: {e}")
            return []


class NHLApi:
    """NHL matches from ESPN API"""
    BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl"
    
    async def get_matches(self, target_date: Optional[date] = None) -> List[Dict]:
        """Fetch NHL matches for a specific date"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.BASE_URL}/scoreboard")
                response.raise_for_status()
                data = response.json()
                
                matches = []
                if data.get("events"):
                    for event in data["events"]:
                        parsed = self._parse_event(event)
                        if parsed:
                            matches.append(parsed)
                
                return matches
        except Exception as e:
            print(f"Error fetching NHL matches: {e}")
            return []
    
    def _parse_event(self, event: Dict) -> Optional[Dict]:
        """Parse NHL event into match format"""
        try:
            competitions = event.get("competitions", [{}])
            if not competitions:
                return None
            
            comp = competitions[0]
            competitors = comp.get("competitors", [])
            
            if len(competitors) < 2:
                return None
            
            home = next((c for c in competitors if c.get("homeAway") == "home"), competitors[1])
            away = next((c for c in competitors if c.get("homeAway") == "away"), competitors[0])
            
            match_date_str = event.get("date", "")
            match_date = datetime.fromisoformat(match_date_str.replace("Z", "+00:00")).date() if match_date_str else date.today()
            
            status = comp.get("status", {}).get("type", "")
            status_map = {"pre": "scheduled", "in": "live", "post": "finished"}
            
            home_score = comp.get("competitors", [{}])[1].get("score") if len(competitors) > 1 else None
            away_score = comp.get("competitors", [{}])[0].get("score") if len(competitors) > 0 else None
            
            return {
                "home_team": home.get("team", {}).get("displayName", ""),
                "away_team": away.get("team", {}).get("displayName", ""),
                "match_date": match_date,
                "match_time": match_date_str.split("T")[1][:5] if "T" in match_date_str else "20:00",
                "status": status_map.get(status, "scheduled"),
                "home_score": home_score,
                "away_score": away_score
            }
        except Exception as e:
            print(f"Error parsing NHL event: {e}")
            return None


class NFLApi:
    """NFL matches from ESPN API"""
    BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl"
    
    async def get_matches(self, target_date: Optional[date] = None) -> List[Dict]:
        """Fetch NFL matches for a specific date"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.BASE_URL}/scoreboard")
                response.raise_for_status()
                data = response.json()
                
                matches = []
                if data.get("events"):
                    for event in data["events"]:
                        parsed = self._parse_event(event)
                        if parsed:
                            matches.append(parsed)
                
                return matches
        except Exception as e:
            print(f"Error fetching NFL matches: {e}")
            return []
    
    def _parse_event(self, event: Dict) -> Optional[Dict]:
        """Parse NFL event into match format"""
        try:
            competitions = event.get("competitions", [{}])
            if not competitions:
                return None
            
            comp = competitions[0]
            competitors = comp.get("competitors", [])
            
            if len(competitors) < 2:
                return None
            
            home = next((c for c in competitors if c.get("homeAway") == "home"), competitors[1])
            away = next((c for c in competitors if c.get("homeAway") == "away"), competitors[0])
            
            match_date_str = event.get("date", "")
            match_date = datetime.fromisoformat(match_date_str.replace("Z", "+00:00")).date() if match_date_str else date.today()
            
            status = comp.get("status", {}).get("type", "")
            status_map = {"pre": "scheduled", "in": "live", "post": "finished"}
            
            home_score = comp.get("competitors", [{}])[1].get("score") if len(competitors) > 1 else None
            away_score = comp.get("competitors", [{}])[0].get("score") if len(competitors) > 0 else None
            
            return {
                "home_team": home.get("team", {}).get("displayName", ""),
                "away_team": away.get("team", {}).get("displayName", ""),
                "match_date": match_date,
                "match_time": match_date_str.split("T")[1][:5] if "T" in match_date_str else "20:00",
                "status": status_map.get(status, "scheduled"),
                "home_score": home_score,
                "away_score": away_score
            }
        except Exception as e:
            print(f"Error parsing NFL event: {e}")
            return None


class MLBApi:
    """MLB matches from ESPN API"""
    BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb"
    
    async def get_matches(self, target_date: Optional[date] = None) -> List[Dict]:
        """Fetch MLB matches for a specific date"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.BASE_URL}/scoreboard")
                response.raise_for_status()
                data = response.json()
                
                matches = []
                if data.get("events"):
                    for event in data["events"]:
                        parsed = self._parse_event(event)
                        if parsed:
                            matches.append(parsed)
                
                return matches
        except Exception as e:
            print(f"Error fetching MLB matches: {e}")
            return []
    
    def _parse_event(self, event: Dict) -> Optional[Dict]:
        """Parse MLB event into match format"""
        try:
            competitions = event.get("competitions", [{}])
            if not competitions:
                return None
            
            comp = competitions[0]
            competitors = comp.get("competitors", [])
            
            if len(competitors) < 2:
                return None
            
            home = next((c for c in competitors if c.get("homeAway") == "home"), competitors[1])
            away = next((c for c in competitors if c.get("homeAway") == "away"), competitors[0])
            
            match_date_str = event.get("date", "")
            match_date = datetime.fromisoformat(match_date_str.replace("Z", "+00:00")).date() if match_date_str else date.today()
            
            status = comp.get("status", {}).get("type", "")
            status_map = {"pre": "scheduled", "in": "live", "post": "finished"}
            
            home_score = comp.get("competitors", [{}])[1].get("score") if len(competitors) > 1 else None
            away_score = comp.get("competitors", [{}])[0].get("score") if len(competitors) > 0 else None
            
            return {
                "home_team": home.get("team", {}).get("displayName", ""),
                "away_team": away.get("team", {}).get("displayName", ""),
                "match_date": match_date,
                "match_time": match_date_str.split("T")[1][:5] if "T" in match_date_str else "20:00",
                "status": status_map.get(status, "scheduled"),
                "home_score": home_score,
                "away_score": away_score
            }
        except Exception as e:
            print(f"Error parsing MLB event: {e}")
            return None


class FIFAApi:
    """FIFA/International football matches"""
    BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer"
    
    async def get_matches(self, target_date: Optional[date] = None) -> List[Dict]:
        """Fetch FIFA/International matches"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Fetch from international competitions
                leagues = ["fifa-world-cup", "confederation-cup", "olympics"]
                all_matches = []
                
                for league in leagues:
                    try:
                        response = await client.get(f"{self.BASE_URL}/{league}/scoreboard")
                        response.raise_for_status()
                        data = response.json()
                        
                        if data.get("events"):
                            for event in data["events"]:
                                parsed = self._parse_event(event)
                                if parsed:
                                    all_matches.append(parsed)
                    except:
                        continue
                
                return all_matches
        except Exception as e:
            print(f"Error fetching FIFA matches: {e}")
            return []
    
    def _parse_event(self, event: Dict) -> Optional[Dict]:
        """Parse FIFA event into match format"""
        try:
            competitions = event.get("competitions", [{}])
            if not competitions:
                return None
            
            comp = competitions[0]
            competitors = comp.get("competitors", [])
            
            if len(competitors) < 2:
                return None
            
            home = next((c for c in competitors if c.get("homeAway") == "home"), competitors[1])
            away = next((c for c in competitors if c.get("homeAway") == "away"), competitors[0])
            
            match_date_str = event.get("date", "")
            match_date = datetime.fromisoformat(match_date_str.replace("Z", "+00:00")).date() if match_date_str else date.today()
            
            status = comp.get("status", {}).get("type", "")
            status_map = {"pre": "scheduled", "in": "live", "post": "finished"}
            
            home_score = comp.get("competitors", [{}])[1].get("score") if len(competitors) > 1 else None
            away_score = comp.get("competitors", [{}])[0].get("score") if len(competitors) > 0 else None
            
            return {
                "home_team": home.get("team", {}).get("displayName", ""),
                "away_team": away.get("team", {}).get("displayName", ""),
                "match_date": match_date,
                "match_time": match_date_str.split("T")[1][:5] if "T" in match_date_str else "20:00",
                "status": status_map.get(status, "scheduled"),
                "home_score": home_score,
                "away_score": away_score
            }
        except Exception as e:
            print(f"Error parsing FIFA event: {e}")
            return None


# Factory functions
def get_nba_api() -> NBAApi:
    return NBAApi()

def get_tennis_api() -> TennisApi:
    return TennisApi()

def get_nhl_api() -> NHLApi:
    return NHLApi()

def get_nfl_api() -> NFLApi:
    return NFLApi()

def get_mlb_api() -> MLBApi:
    return MLBApi()

def get_fifa_api() -> FIFAApi:
    return FIFAApi()
