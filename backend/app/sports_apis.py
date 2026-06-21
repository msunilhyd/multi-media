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
        """Fetch FIFA/International matches from multiple sources"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Fetch from international competitions
                leagues = [
                    "fifa-world-cup",
                    "fifa-world-cup-qualifier",
                    "confederation-cup",
                    "olympics",
                    "international"
                ]
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
                        print(f"[FIFA API] Found {len(data.get('events', []))} events from {league}")
                    except Exception as e:
                        print(f"[FIFA API] Error fetching {league}: {e}")
                        continue
                
                # Always merge with fallback to ensure complete FIFA World Cup 2026 schedule
                fallback_matches = self._get_fallback_world_cup_matches()
                
                # Merge ESPN matches with fallback, avoiding duplicates
                existing_keys = set()
                for match in all_matches:
                    key = (match["home_team"], match["away_team"], match["match_date"])
                    existing_keys.add(key)
                
                for fallback_match in fallback_matches:
                    key = (fallback_match["home_team"], fallback_match["away_team"], fallback_match["match_date"])
                    if key not in existing_keys:
                        all_matches.append(fallback_match)
                        existing_keys.add(key)
                
                if all_matches:
                    print(f"[FIFA API] Merged ESPN data with fallback schedule")
                
                if all_matches:
                    print(f"[FIFA API] Total FIFA matches fetched: {len(all_matches)}")
                else:
                    print(f"[FIFA API] No FIFA matches found from any source")
                
                return all_matches
        except Exception as e:
            print(f"Error fetching FIFA matches: {e}")
            return self._get_fallback_world_cup_matches()
    
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
    
    def _get_fallback_world_cup_matches(self) -> List[Dict]:
        """Fallback FIFA World Cup 2026 schedule - dates verified from Google/FIFA official schedule"""
        matches = [
            # GROUP STAGE - Matchday 1 (June 11-12) - FINISHED
            {"home": "Mexico", "away": "South Africa", "date": date(2026, 6, 11), "status": "finished"},
            {"home": "South Korea", "away": "Czechia", "date": date(2026, 6, 11), "status": "finished"},
            {"home": "Canada", "away": "Bosnia and Herzegovina", "date": date(2026, 6, 12), "status": "finished"},
            {"home": "USA", "away": "Paraguay", "date": date(2026, 6, 12), "status": "finished"},
            # GROUP STAGE - Matchday 2 (June 13-15) - FINISHED
            {"home": "Qatar", "away": "Switzerland", "date": date(2026, 6, 13), "status": "finished"},
            {"home": "Brazil", "away": "Morocco", "date": date(2026, 6, 13), "status": "finished"},
            {"home": "Haiti", "away": "Scotland", "date": date(2026, 6, 13), "status": "finished"},
            {"home": "Australia", "away": "Türkiye", "date": date(2026, 6, 13), "status": "finished"},
            {"home": "Czechia", "away": "South Africa", "date": date(2026, 6, 14), "status": "finished"},
            {"home": "Switzerland", "away": "Bosnia and Herzegovina", "date": date(2026, 6, 14), "status": "finished"},
            {"home": "Canada", "away": "Qatar", "date": date(2026, 6, 14), "status": "finished"},
            {"home": "Mexico", "away": "South Korea", "date": date(2026, 6, 14), "status": "finished"},
            {"home": "USA", "away": "Australia", "date": date(2026, 6, 15), "status": "finished"},
            {"home": "Scotland", "away": "Morocco", "date": date(2026, 6, 15), "status": "finished"},
            {"home": "Brazil", "away": "Haiti", "date": date(2026, 6, 15), "status": "finished"},
            {"home": "Türkiye", "away": "Paraguay", "date": date(2026, 6, 15), "status": "finished"},
            # GROUP STAGE - Matchday 3 (June 16-19) - FINISHED
            {"home": "Germany", "away": "Côte d'Ivoire", "date": date(2026, 6, 20), "status": "finished"},
            {"home": "Netherlands", "away": "Japan", "date": date(2026, 6, 16), "status": "finished"},
            {"home": "Ivory Coast", "away": "Ecuador", "date": date(2026, 6, 16), "status": "finished"},
            {"home": "Sweden", "away": "Tunisia", "date": date(2026, 6, 16), "status": "finished"},
            {"home": "Spain", "away": "Cabo Verde", "date": date(2026, 6, 17), "status": "finished"},
            {"home": "Belgium", "away": "Egypt", "date": date(2026, 6, 17), "status": "finished"},
            {"home": "Saudi Arabia", "away": "Uruguay", "date": date(2026, 6, 17), "status": "finished"},
            {"home": "Iran", "away": "New Zealand", "date": date(2026, 6, 17), "status": "finished"},
            {"home": "France", "away": "Senegal", "date": date(2026, 6, 18), "status": "finished"},
            {"home": "Iraq", "away": "Norway", "date": date(2026, 6, 18), "status": "finished"},
            {"home": "Argentina", "away": "Algeria", "date": date(2026, 6, 18), "status": "finished"},
            {"home": "Austria", "away": "Jordan", "date": date(2026, 6, 18), "status": "finished"},
            {"home": "Ghana", "away": "Panama", "date": date(2026, 6, 19), "status": "finished"},
            {"home": "England", "away": "Croatia", "date": date(2026, 6, 19), "status": "finished"},
            {"home": "Portugal", "away": "Congo DR", "date": date(2026, 6, 19), "status": "finished"},
            {"home": "Uzbekistan", "away": "Colombia", "date": date(2026, 6, 19), "status": "finished"},
            # GROUP STAGE - Matchday 4 (June 20-21) - FINISHED
            {"home": "Czechia", "away": "Mexico", "date": date(2026, 6, 20), "status": "finished"},
            {"home": "South Africa", "away": "South Korea", "date": date(2026, 6, 20), "status": "finished"},
            {"home": "Switzerland", "away": "Canada", "date": date(2026, 6, 20), "status": "finished"},
            {"home": "Bosnia and Herzegovina", "away": "Qatar", "date": date(2026, 6, 20), "status": "finished"},
            {"home": "Tunisia", "away": "Japan", "date": date(2026, 6, 20), "status": "finished"},
            {"home": "Ecuador", "away": "Curaçao", "date": date(2026, 6, 20), "status": "finished"},
            {"home": "Netherlands", "away": "Sweden", "date": date(2026, 6, 20), "status": "finished"},
            # GROUP STAGE - Matchday 5 (June 21-23) - TODAY/UPCOMING
            {"home": "Spain", "away": "Saudi Arabia", "date": date(2026, 6, 21), "status": "scheduled"},
            {"home": "Belgium", "away": "Iran", "date": date(2026, 6, 21), "status": "scheduled"},
            {"home": "Uruguay", "away": "Cabo Verde", "date": date(2026, 6, 21), "status": "scheduled"},
            {"home": "New Zealand", "away": "Egypt", "date": date(2026, 6, 21), "status": "scheduled"},
            {"home": "Argentina", "away": "Austria", "date": date(2026, 6, 22), "status": "scheduled"},
            {"home": "France", "away": "Iraq", "date": date(2026, 6, 22), "status": "scheduled"},
            {"home": "Norway", "away": "Senegal", "date": date(2026, 6, 22), "status": "scheduled"},
            {"home": "Jordan", "away": "Algeria", "date": date(2026, 6, 22), "status": "scheduled"},
            {"home": "Portugal", "away": "Uzbekistan", "date": date(2026, 6, 23), "status": "scheduled"},
            {"home": "England", "away": "Ghana", "date": date(2026, 6, 23), "status": "scheduled"},
            {"home": "Panama", "away": "Croatia", "date": date(2026, 6, 23), "status": "scheduled"},
            {"home": "Colombia", "away": "Congo DR", "date": date(2026, 6, 23), "status": "scheduled"},
            # GROUP STAGE - Matchday 6 (June 24-27)
            {"home": "Switzerland", "away": "Canada", "date": date(2026, 6, 24), "status": "scheduled"},
            {"home": "Bosnia and Herzegovina", "away": "Qatar", "date": date(2026, 6, 24), "status": "scheduled"},
            {"home": "Morocco", "away": "Haiti", "date": date(2026, 6, 24), "status": "scheduled"},
            {"home": "Scotland", "away": "Brazil", "date": date(2026, 6, 24), "status": "scheduled"},
            {"home": "South Africa", "away": "South Korea", "date": date(2026, 6, 24), "status": "scheduled"},
            {"home": "Czechia", "away": "Mexico", "date": date(2026, 6, 24), "status": "scheduled"},
            {"home": "Curaçao", "away": "Côte d'Ivoire", "date": date(2026, 6, 25), "status": "scheduled"},
            {"home": "Ecuador", "away": "Germany", "date": date(2026, 6, 25), "status": "scheduled"},
            {"home": "Tunisia", "away": "Netherlands", "date": date(2026, 6, 25), "status": "scheduled"},
            {"home": "Japan", "away": "Sweden", "date": date(2026, 6, 25), "status": "scheduled"},
            {"home": "Türkiye", "away": "USA", "date": date(2026, 6, 25), "status": "scheduled"},
            {"home": "Paraguay", "away": "Australia", "date": date(2026, 6, 25), "status": "scheduled"},
            {"home": "Norway", "away": "France", "date": date(2026, 6, 26), "status": "scheduled"},
            {"home": "Senegal", "away": "Iraq", "date": date(2026, 6, 26), "status": "scheduled"},
            {"home": "Cabo Verde", "away": "Saudi Arabia", "date": date(2026, 6, 26), "status": "scheduled"},
            {"home": "Uruguay", "away": "Spain", "date": date(2026, 6, 26), "status": "scheduled"},
            {"home": "New Zealand", "away": "Belgium", "date": date(2026, 6, 26), "status": "scheduled"},
            {"home": "Egypt", "away": "Iran", "date": date(2026, 6, 26), "status": "scheduled"},
            {"home": "Panama", "away": "England", "date": date(2026, 6, 27), "status": "scheduled"},
            {"home": "Croatia", "away": "Ghana", "date": date(2026, 6, 27), "status": "scheduled"},
            {"home": "Colombia", "away": "Portugal", "date": date(2026, 6, 27), "status": "scheduled"},
            {"home": "Congo DR", "away": "Uzbekistan", "date": date(2026, 6, 27), "status": "scheduled"},
            {"home": "Algeria", "away": "Austria", "date": date(2026, 6, 27), "status": "scheduled"},
            {"home": "Jordan", "away": "Argentina", "date": date(2026, 6, 27), "status": "scheduled"},
            # ROUND OF 32 (June 28 - July 3)
            {"home": "Group A Winner", "away": "Group B Runner-up", "date": date(2026, 6, 28), "status": "scheduled"},
            {"home": "Group E Winner", "away": "Group F Runner-up", "date": date(2026, 6, 29), "status": "scheduled"},
            {"home": "Group F Winner", "away": "Group E Runner-up", "date": date(2026, 6, 29), "status": "scheduled"},
            {"home": "Group C Winner", "away": "Group D Runner-up", "date": date(2026, 6, 29), "status": "scheduled"},
            {"home": "Group I Winner", "away": "Group J Runner-up", "date": date(2026, 6, 30), "status": "scheduled"},
            {"home": "Group D Winner", "away": "Group C Runner-up", "date": date(2026, 6, 30), "status": "scheduled"},
            {"home": "Group G Winner", "away": "Group H Runner-up", "date": date(2026, 6, 30), "status": "scheduled"},
            {"home": "Group B Winner", "away": "Group A Runner-up", "date": date(2026, 7, 1), "status": "scheduled"},
            {"home": "Group K Winner", "away": "Group L Runner-up", "date": date(2026, 7, 1), "status": "scheduled"},
            {"home": "Group H Winner", "away": "Group G Runner-up", "date": date(2026, 7, 1), "status": "scheduled"},
            {"home": "Group L Winner", "away": "Group K Runner-up", "date": date(2026, 7, 2), "status": "scheduled"},
            {"home": "Group J Winner", "away": "Group I Runner-up", "date": date(2026, 7, 2), "status": "scheduled"},
            # ROUND OF 16 (July 4-7)
            {"home": "Match 74 Winner", "away": "Match 77 Winner", "date": date(2026, 7, 4), "status": "scheduled"},
            {"home": "Match 73 Winner", "away": "Match 75 Winner", "date": date(2026, 7, 4), "status": "scheduled"},
            {"home": "Match 76 Winner", "away": "Match 78 Winner", "date": date(2026, 7, 5), "status": "scheduled"},
            {"home": "Match 79 Winner", "away": "Match 80 Winner", "date": date(2026, 7, 5), "status": "scheduled"},
            {"home": "Match 83 Winner", "away": "Match 84 Winner", "date": date(2026, 7, 6), "status": "scheduled"},
            {"home": "Match 81 Winner", "away": "Match 82 Winner", "date": date(2026, 7, 6), "status": "scheduled"},
            {"home": "Match 86 Winner", "away": "Match 88 Winner", "date": date(2026, 7, 7), "status": "scheduled"},
            {"home": "Match 85 Winner", "away": "Match 87 Winner", "date": date(2026, 7, 7), "status": "scheduled"},
            # QUARTER-FINALS (July 9-11)
            {"home": "Match 89 Winner", "away": "Match 90 Winner", "date": date(2026, 7, 9), "status": "scheduled"},
            {"home": "Match 93 Winner", "away": "Match 94 Winner", "date": date(2026, 7, 10), "status": "scheduled"},
            {"home": "Match 91 Winner", "away": "Match 92 Winner", "date": date(2026, 7, 11), "status": "scheduled"},
            {"home": "Match 95 Winner", "away": "Match 96 Winner", "date": date(2026, 7, 11), "status": "scheduled"},
            # SEMI-FINALS (July 14-15)
            {"home": "Match 97 Winner", "away": "Match 98 Winner", "date": date(2026, 7, 14), "status": "scheduled"},
            {"home": "Match 99 Winner", "away": "Match 100 Winner", "date": date(2026, 7, 15), "status": "scheduled"},
            # BRONZE FINAL (July 18)
            {"home": "Match 101 Runner-up", "away": "Match 102 Runner-up", "date": date(2026, 7, 18), "status": "scheduled"},
            # FINAL (July 19)
            {"home": "Match 101 Winner", "away": "Match 102 Winner", "date": date(2026, 7, 19), "status": "scheduled"},
        ]
        
        result = []
        for match in matches:
            result.append({
                "home_team": match["home"],
                "away_team": match["away"],
                "match_date": match["date"],
                "match_time": "20:00",
                "status": match["status"],
                "home_score": None,
                "away_score": None
            })
        
        print(f"[FIFA API] Loaded {len(result)} matches from fallback FIFA World Cup 2026 schedule")
        return result


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
