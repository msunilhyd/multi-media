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
        # Top 5 European leagues
        "eng.1": "Premier League",
        "esp.1": "La Liga", 
        "ger.1": "Bundesliga",
        "ita.1": "Serie A",
        "fra.1": "Ligue 1",
        # Other European leagues
        "ned.1": "Eredivisie",
        "por.1": "Primeira Liga",
        "sco.1": "Scottish Premiership",
        "bel.1": "Belgian Pro League",
        "tur.1": "Süper Lig",
        "aut.1": "Austrian Bundesliga",
        "sui.1": "Swiss Super League",
        "gre.1": "Greek Super League",
        "rus.1": "Russian Premier League",
        "cze.1": "Czech First League",
        "den.1": "Danish Superliga",
        "nor.1": "Norwegian Eliteserien",
        "swe.1": "Swedish Allsvenskan",
        "isr.1": "Israeli Premier League",
        # Americas
        "usa.1": "MLS",
        "mex.1": "Liga MX",
        "arg.1": "Argentine Liga",
        "bra.1": "Brazilian Serie A",
        "chi.1": "Chilean Primera",
        "col.1": "Colombian Primera A",
        "uru.1": "Uruguayan Primera",
        "par.1": "Paraguayan Primera",
        "ecu.1": "Ecuadorian Serie A",
        "ven.1": "Venezuelan Primera",
        "per.1": "Peruvian Liga 1",
        "crc.1": "Costa Rican Primera",
        # Asia & Oceania
        "ind.1": "Indian Super League",
        "jpn.1": "J.League",
        "chn.1": "Chinese Super League",
        "aus.1": "A-League Men",
        # Africa
        "rsa.1": "South African Premiership",
        # European club competitions
        "uefa.champions": "Champions League",
        "uefa.europa": "Europa League",
        # Continental competitions
        "conmebol.libertadores": "Copa Libertadores",
        "conmebol.sudamericana": "Copa Sudamericana",
        "concacaf.champions": "Concacaf Champions Cup",
        # International tournaments
        "fifa.world": "FIFA World Cup",
        "uefa.euro": "European Championship",
        "conmebol.america": "Copa América",
        # World Cup Qualifiers
        "fifa.worldq.uefa": "WC Qualifying UEFA",
        "fifa.worldq.conmebol": "WC Qualifying CONMEBOL",
        "fifa.worldq.caf": "WC Qualifying CAF",
        "fifa.worldq.afc": "WC Qualifying AFC",
        "fifa.worldq.concacaf": "WC Qualifying CONCACAF",
        "fifa.worldq.ofc": "WC Qualifying OFC",
        # Domestic cups
        "eng.fa": "FA Cup",
        "eng.league_cup": "League Cup",
        "esp.copa_del_rey": "Copa del Rey",
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


def get_football_api() -> ESPNFootballAPI:
    return ESPNFootballAPI()
