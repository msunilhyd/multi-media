import httpx
from datetime import date, datetime, timedelta
from typing import List, Dict, Optional


class ESPNFootballAPI:
    """
    Client for ESPN API - FREE, no API key required!
    Covers major leagues with real match data
    """
    BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer"
    
    # ESPN league slugs
    LEAGUES = {
        # Top leagues
        "eng.1": "Premier League",
        "esp.1": "La Liga", 
        "ger.1": "Bundesliga",
        "ita.1": "Serie A",
        "fra.1": "Ligue 1",
        "ind.1": "Indian Super League",
        "usa.1": "MLS",
        "tur.1": "Süper Lig",
        # European competitions
        "uefa.champions": "Champions League",
        "uefa.europa": "Europa League",
        # African competitions
        "caf.nations": "AFCON",
        "caf.champions": "CAF Champions League",
        # Domestic cups
        "eng.fa": "FA Cup",
        "eng.league_cup": "League Cup",
        "esp.copa_del_rey": "Copa del Rey",
        "esp.supercopa": "Supercopa de España",
        "fra.coupe_de_france": "Coupe de France",
        "ger.dfb_pokal": "DFB-Pokal",
        "ita.coppa_italia": "Coppa Italia",
    }
    
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        }
    
    async def get_matches_for_date(self, target_date: date) -> Dict[str, List[Dict]]:
        """Fetch all matches for a specific date across all major leagues"""
        date_str = target_date.strftime("%Y%m%d")
        all_fixtures = {}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            for league_slug, league_name in self.LEAGUES.items():
                try:
                    response = await client.get(
                        f"{self.BASE_URL}/{league_slug}/scoreboard",
                        headers=self.headers,
                        params={"dates": date_str}
                    )
                    
                    if response.status_code != 200:
                        continue
                    
                    data = response.json()
                    events = data.get("events", [])
                    
                    if events:
                        matches = []
                        for event in events:
                            parsed = self._parse_espn_event(event, target_date)
                            if parsed:
                                matches.append(parsed)
                        if matches:
                            all_fixtures[league_name] = matches
                
                except Exception as e:
                    print(f"ESPN API error for {league_name}: {e}")
                    continue
        
        return all_fixtures
    
    async def get_matches_for_date_range(self, start_date: date, days: int = 4) -> Dict[date, Dict[str, List[Dict]]]:
        """Fetch matches for a range of dates"""
        all_fixtures = {}
        
        for i in range(days):
            target_date = start_date + timedelta(days=i)
            fixtures = await self.get_matches_for_date(target_date)
            if fixtures:
                all_fixtures[target_date] = fixtures
        
        return all_fixtures
    
    async def get_finished_matches(self, target_date: date) -> Dict[str, List[Dict]]:
        """Get only finished matches for a date (for highlights)"""
        matches = await self.get_matches_for_date(target_date)
        
        finished = {}
        for league, league_matches in matches.items():
            finished_matches = [m for m in league_matches if m["status"] == "finished"]
            if finished_matches:
                finished[league] = finished_matches
        
        return finished
    
    def _parse_espn_event(self, event: Dict, match_date: date) -> Optional[Dict]:
        """Parse a single ESPN event into our match format"""
        try:
            competitions = event.get("competitions", [{}])
            if not competitions:
                return None
            
            competition = competitions[0]
            competitors = competition.get("competitors", [])
            
            if len(competitors) < 2:
                return None
            
            # ESPN lists away team first, home team second
            home = next((c for c in competitors if c.get("homeAway") == "home"), competitors[1])
            away = next((c for c in competitors if c.get("homeAway") == "away"), competitors[0])
            
            home_team = home.get("team", {}).get("displayName", "Unknown")
            away_team = away.get("team", {}).get("displayName", "Unknown")
            home_score = int(home.get("score", 0)) if home.get("score") else None
            away_score = int(away.get("score", 0)) if away.get("score") else None
            
            # Determine status
            status_type = event.get("status", {}).get("type", {})
            status_name = status_type.get("name", "")
            
            if "FULL_TIME" in status_name or status_name == "STATUS_FINAL":
                status = "finished"
            elif "IN_PROGRESS" in status_name or "HALFTIME" in status_name:
                status = "live"
            else:
                status = "scheduled"
            
            # Extract time
            event_date = event.get("date", "")
            match_time = None
            if event_date:
                try:
                    dt = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
                    match_time = dt.strftime("%H:%M")
                except:
                    pass
            
            return {
                "home_team": home_team,
                "away_team": away_team,
                "home_score": home_score,
                "away_score": away_score,
                "match_date": match_date,
                "match_time": match_time,
                "status": status,
                "espn_event_id": str(event.get("id", ""))
            }
        except Exception as e:
            print(f"Error parsing ESPN event: {e}")
            return None


    async def get_standings(self, league_slug: str) -> Optional[Dict]:
        """Fetch standings for a specific league"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"https://site.api.espn.com/apis/v2/sports/soccer/{league_slug}/standings",
                    headers=self.headers
                )
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                
                # Navigate to the standings entries
                if not data.get("children"):
                    return None
                
                season_data = data["children"][0]
                standings_data = season_data.get("standings")
                
                if not standings_data:
                    return None
                
                entries = standings_data.get("entries", [])
                
                # Parse standings
                standings = []
                for entry in entries:
                    team = entry.get("team", {})
                    stats = entry.get("stats", [])
                    note = entry.get("note", {})
                    
                    # Extract stats by name
                    stats_dict = {stat["name"]: stat for stat in stats}
                    
                    standings.append({
                        "position": len(standings) + 1,
                        "team": team.get("displayName", ""),
                        "team_id": team.get("id", ""),
                        "logo": team.get("logos", [{}])[0].get("href") if team.get("logos") else None,
                        "games_played": int(stats_dict.get("gamesPlayed", {}).get("value", 0)),
                        "wins": int(stats_dict.get("wins", {}).get("value", 0)),
                        "draws": int(stats_dict.get("ties", {}).get("value", 0)),
                        "losses": int(stats_dict.get("losses", {}).get("value", 0)),
                        "goals_for": int(stats_dict.get("pointsFor", {}).get("value", 0)),
                        "goals_against": int(stats_dict.get("pointsAgainst", {}).get("value", 0)),
                        "goal_difference": int(stats_dict.get("pointDifferential", {}).get("value", 0)),
                        "points": int(stats_dict.get("points", {}).get("value", 0)),
                        "form": stats_dict.get("streak", {}).get("displayValue", ""),
                        "qualification": note.get("description"),
                        "qualification_color": note.get("color")
                    })
                
                return {
                    "league_name": data.get("name", ""),
                    "season": standings_data.get("seasonDisplayName", ""),
                    "standings": standings
                }
        
        except Exception as e:
            print(f"Error fetching standings for {league_slug}: {e}")
            return None


def get_football_api() -> ESPNFootballAPI:
    return ESPNFootballAPI()
