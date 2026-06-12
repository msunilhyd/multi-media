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
    """Tennis matches from ATP/WTA using free public APIs"""
    
    async def get_matches(self, target_date: Optional[date] = None) -> List[Dict]:
        """Fetch Tennis matches from multiple reliable sources"""
        try:
            all_matches = []
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Source 1: ESPN Tennis API (most reliable)
                try:
                    response = await client.get(
                        "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard",
                        timeout=15.0
                    )
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("events"):
                            for event in data["events"]:
                                parsed = self._parse_espn_tennis_match(event)
                                if parsed:
                                    all_matches.append(parsed)
                            print(f"[Tennis API] Found {len(all_matches)} ATP matches from ESPN")
                except Exception as e:
                    print(f"[Tennis API] ESPN Tennis API error: {e}")
                
                # Source 2: ESPN WTA API
                try:
                    response = await client.get(
                        "https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard",
                        timeout=15.0
                    )
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("events"):
                            wta_matches = []
                            for event in data["events"]:
                                parsed = self._parse_espn_tennis_match(event)
                                if parsed:
                                    wta_matches.append(parsed)
                            all_matches.extend(wta_matches)
                            print(f"[Tennis API] Found {len(wta_matches)} WTA matches from ESPN")
                except Exception as e:
                    print(f"[Tennis API] ESPN WTA API error: {e}")
            
            if all_matches:
                print(f"[Tennis API] Found {len(all_matches)} total tennis matches")
            else:
                print(f"[Tennis API] No live data available from any source")
            
            return all_matches
            
        except Exception as e:
            print(f"Error fetching Tennis matches: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return []
    
    def _parse_match(self, match: Dict) -> Optional[Dict]:
        """Parse Tennis Data API match format"""
        try:
            match_date_str = match.get("date", "") or match.get("match_date", "")
            if match_date_str:
                match_date = datetime.fromisoformat(match_date_str.replace("Z", "+00:00")).date()
            else:
                match_date = date.today()
            
            status = match.get("status", "scheduled")
            status_map = {
                "scheduled": "scheduled",
                "live": "live", 
                "completed": "finished",
                "finished": "finished"
            }
            
            return {
                "home_team": match.get("player1", "") or match.get("home_player", ""),
                "away_team": match.get("player2", "") or match.get("away_player", ""),
                "match_date": match_date,
                "match_time": match.get("time", "20:00"),
                "status": status_map.get(status, "scheduled"),
                "home_score": match.get("score1") or match.get("home_score"),
                "away_score": match.get("score2") or match.get("away_score")
            }
        except Exception as e:
            print(f"Error parsing Tennis match: {e}")
            return None
    
    def _parse_rapid_api_match(self, match: Dict) -> Optional[Dict]:
        """Parse Rapid API Tennis match format"""
        try:
            match_date_str = match.get("match_date", "")
            if match_date_str:
                match_date = datetime.fromisoformat(match_date_str).date()
            else:
                match_date = date.today()
            
            return {
                "home_team": match.get("player1", ""),
                "away_team": match.get("player2", ""),
                "match_date": match_date,
                "match_time": match.get("match_time", "20:00"),
                "status": "finished" if match.get("status") == "Finished" else "scheduled",
                "home_score": match.get("score1"),
                "away_score": match.get("score2")
            }
        except Exception as e:
            print(f"Error parsing Rapid API Tennis match: {e}")
            return None
    
    def _parse_espn_tennis_match(self, event: Dict) -> Optional[Dict]:
        """Parse ESPN Tennis match format"""
        try:
            competitions = event.get("competitions", [{}])
            if not competitions:
                return None
            
            comp = competitions[0]
            competitors = comp.get("competitors", [])
            
            if len(competitors) < 2:
                return None
            
            match_date_str = event.get("date", "")
            match_date = datetime.fromisoformat(match_date_str.replace("Z", "+00:00")).date() if match_date_str else date.today()
            
            status = comp.get("status", {}).get("type", "")
            status_map = {"pre": "scheduled", "in": "live", "post": "finished"}
            
            return {
                "home_team": competitors[0].get("athlete", [{}])[0].get("displayName", "") if competitors[0].get("athlete") else competitors[0].get("displayName", ""),
                "away_team": competitors[1].get("athlete", [{}])[0].get("displayName", "") if competitors[1].get("athlete") else competitors[1].get("displayName", ""),
                "match_date": match_date,
                "match_time": match_date_str.split("T")[1][:5] if "T" in match_date_str else "20:00",
                "status": status_map.get(status, "scheduled"),
                "home_score": competitors[0].get("score"),
                "away_score": competitors[1].get("score")
            }
        except Exception as e:
            print(f"Error parsing ESPN Tennis match: {e}")
            return None


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


class PGAApi:
    """PGA Golf tournaments from ESPN API"""
    BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/golf/pga"
    
    async def get_matches(self, target_date: Optional[date] = None) -> List[Dict]:
        """Fetch PGA tournaments and rounds"""
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
            print(f"Error fetching PGA matches: {e}")
            return []
    
    def _parse_event(self, event: Dict) -> Optional[Dict]:
        """Parse PGA tournament into match format"""
        try:
            # PGA tournaments are multi-day events, we'll represent them as single matches
            tournament_name = event.get("name", "")
            
            competitions = event.get("competitions", [{}])
            if not competitions:
                return None
            
            comp = competitions[0]
            competitors = comp.get("competitors", [])
            
            if len(competitors) < 2:
                return None
            
            # For golf, we'll use top 2 leaders as "competitors"
            leader1 = competitors[0] if len(competitors) > 0 else {}
            leader2 = competitors[1] if len(competitors) > 1 else {}
            
            match_date_str = event.get("date", "")
            match_date = datetime.fromisoformat(match_date_str.replace("Z", "+00:00")).date() if match_date_str else date.today()
            
            status = comp.get("status", {}).get("type", "")
            status_map = {"pre": "scheduled", "in": "live", "post": "finished"}
            
            return {
                "home_team": leader1.get("athlete", {}).get("displayName", "Player 1"),
                "away_team": leader2.get("athlete", {}).get("displayName", "Player 2"),
                "match_date": match_date,
                "match_time": match_date_str.split("T")[1][:5] if "T" in match_date_str else "09:00",
                "status": status_map.get(status, "scheduled"),
                "home_score": leader1.get("score"),
                "away_score": leader2.get("score")
            }
        except Exception as e:
            print(f"Error parsing PGA event: {e}")
            return None


class UFCApi:
    """UFC fights from ESPN API"""
    BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/mma/ufc"
    
    async def get_matches(self, target_date: Optional[date] = None) -> List[Dict]:
        """Fetch UFC fights"""
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
            print(f"Error fetching UFC matches: {e}")
            return []
    
    def _parse_event(self, event: Dict) -> Optional[Dict]:
        """Parse UFC fight into match format"""
        try:
            competitions = event.get("competitions", [{}])
            if not competitions:
                return None
            
            comp = competitions[0]
            competitors = comp.get("competitors", [])
            
            if len(competitors) < 2:
                return None
            
            fighter1 = competitors[0]
            fighter2 = competitors[1]
            
            match_date_str = event.get("date", "")
            match_date = datetime.fromisoformat(match_date_str.replace("Z", "+00:00")).date() if match_date_str else date.today()
            
            status = comp.get("status", {}).get("type", "")
            status_map = {"pre": "scheduled", "in": "live", "post": "finished"}
            
            fighter1_score = fighter1.get("score")
            fighter2_score = fighter2.get("score")
            
            return {
                "home_team": fighter1.get("athlete", {}).get("displayName", "Fighter 1"),
                "away_team": fighter2.get("athlete", {}).get("displayName", "Fighter 2"),
                "match_date": match_date,
                "match_time": match_date_str.split("T")[1][:5] if "T" in match_date_str else "19:00",
                "status": status_map.get(status, "scheduled"),
                "home_score": fighter1_score,
                "away_score": fighter2_score
            }
        except Exception as e:
            print(f"Error parsing UFC event: {e}")
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

def get_pga_api() -> PGAApi:
    return PGAApi()

def get_ufc_api() -> UFCApi:
    return UFCApi()
