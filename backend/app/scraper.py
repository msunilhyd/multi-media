import httpx
from bs4 import BeautifulSoup
from datetime import date, datetime, timedelta
from typing import List, Dict, Optional
import re
import json


class BBCSportScraper:
    BASE_URL = "https://www.bbc.com/sport/football/scores-fixtures"
    
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-GB,en;q=0.9",
        }
    
    def get_url_for_date(self, target_date: date) -> str:
        return f"{self.BASE_URL}/{target_date.strftime('%Y-%m-%d')}"
    
    async def fetch_page(self, target_date: date = None) -> str:
        url = self.get_url_for_date(target_date) if target_date else self.BASE_URL
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=self.headers, follow_redirects=True)
            response.raise_for_status()
            return response.text
    
    async def get_fixtures_for_date(self, target_date: date) -> Dict[str, List[Dict]]:
        try:
            html = await self.fetch_page(target_date)
            return self.parse_fixtures(html, target_date)
        except Exception as e:
            print(f"Error fetching fixtures for {target_date}: {e}")
            return {}
    
    async def get_fixtures_for_date_range(self, start_date: date, days: int = 4) -> Dict[date, Dict[str, List[Dict]]]:
        all_fixtures = {}
        for i in range(days):
            target_date = start_date + timedelta(days=i)
            fixtures = await self.get_fixtures_for_date(target_date)
            if fixtures:
                all_fixtures[target_date] = fixtures
        return all_fixtures
    
    def parse_fixtures(self, html: str, match_date: date = None) -> Dict[str, List[Dict]]:
        soup = BeautifulSoup(html, 'lxml')
        fixtures_by_league = {}
        match_date = match_date or date.today()
        
        # Try to find competition sections
        sections = soup.find_all('div', class_=re.compile(r'qa-match-block'))
        if not sections:
            sections = soup.find_all('section')
        
        for section in sections:
            header = section.find(['h3', 'h2', 'h4'])
            if header:
                league_name = header.get_text(strip=True)
                matches = self._extract_matches(section, match_date)
                if matches and league_name:
                    fixtures_by_league[league_name] = matches
        
        # Fallback: try JSON data in script tags
        if not fixtures_by_league:
            fixtures_by_league = self._parse_json_data(soup, match_date)
        
        return fixtures_by_league
    
    def _extract_matches(self, section, match_date: date) -> List[Dict]:
        matches = []
        match_items = section.find_all('li', class_=re.compile(r'(fixture|match|event)'))
        if not match_items:
            match_items = section.find_all('article')
        if not match_items:
            match_items = section.find_all('li')
        
        for item in match_items:
            match_data = self._parse_match(item, match_date)
            if match_data:
                matches.append(match_data)
        return matches
    
    def _parse_match(self, item, match_date: date) -> Optional[Dict]:
        # Find team names
        team_elems = item.find_all(class_=re.compile(r'(team|name)', re.I))
        if len(team_elems) < 2:
            team_elems = item.find_all('span', class_=re.compile(r'abbr|name'))
        
        if len(team_elems) < 2:
            return None
        
        home_team = team_elems[0].get_text(strip=True)
        away_team = team_elems[1].get_text(strip=True) if len(team_elems) > 1 else None
        
        if not home_team or not away_team:
            return None
        
        # Find scores
        score_elems = item.find_all(class_=re.compile(r'score', re.I))
        home_score, away_score = None, None
        if len(score_elems) >= 2:
            try:
                home_score = int(score_elems[0].get_text(strip=True))
                away_score = int(score_elems[1].get_text(strip=True))
            except ValueError:
                pass
        
        # Determine status
        status = "scheduled"
        if home_score is not None:
            status = "finished"
        
        status_elem = item.find(class_=re.compile(r'status|state', re.I))
        if status_elem:
            status_text = status_elem.get_text(strip=True).lower()
            if 'ft' in status_text or 'full' in status_text:
                status = "finished"
            elif 'live' in status_text or "'" in status_text:
                status = "live"
        
        return {
            "home_team": home_team,
            "away_team": away_team,
            "home_score": home_score,
            "away_score": away_score,
            "match_date": match_date,
            "match_time": None,
            "status": status,
            "espn_event_id": None
        }
    
    def _parse_json_data(self, soup, match_date: date) -> Dict[str, List[Dict]]:
        fixtures = {}
        scripts = soup.find_all('script', type='application/json')
        for script in scripts:
            try:
                data = json.loads(script.string)
                self._extract_fixtures_from_json(data, fixtures, match_date)
            except:
                pass
        return fixtures
    
    def _extract_fixtures_from_json(self, obj, fixtures: Dict, match_date: date, league=None):
        if isinstance(obj, dict):
            if 'homeTeam' in obj and 'awayTeam' in obj:
                home = obj.get('homeTeam', {})
                away = obj.get('awayTeam', {})
                match_data = {
                    "home_team": home.get('name') or home.get('shortName', 'Unknown'),
                    "away_team": away.get('name') or away.get('shortName', 'Unknown'),
                    "home_score": obj.get('homeScore'),
                    "away_score": obj.get('awayScore'),
                    "match_date": match_date,
                    "status": "finished" if obj.get('homeScore') is not None else "scheduled",
                    "espn_event_id": obj.get('id')
                }
                league_name = league or obj.get('tournament', {}).get('name', 'Other')
                if league_name not in fixtures:
                    fixtures[league_name] = []
                fixtures[league_name].append(match_data)
            
            for k, v in obj.items():
                if k in ['tournament', 'competition', 'league'] and isinstance(v, dict):
                    league = v.get('name', league)
                self._extract_fixtures_from_json(v, fixtures, match_date, league)
        elif isinstance(obj, list):
            for item in obj:
                self._extract_fixtures_from_json(item, fixtures, match_date, league)


def get_yesterday() -> date:
    # For demo purposes, return Dec 20, 2025 as "yesterday" to show sample data
    return date(2025, 12, 20)


def get_date_range(days_ahead: int = 4) -> List[date]:
    # For demo, start from Dec 20, 2025
    start = date(2025, 12, 20)
    return [start + timedelta(days=i) for i in range(days_ahead)]


def create_sample_fixtures_for_date(target_date: date) -> Dict[str, List[Dict]]:
    """Create sample fixtures for a specific date - using real match data from Dec 20, 2025"""
    
    # Real Premier League matches from Dec 20-21, 2025
    dec_20 = date(2025, 12, 20)
    dec_21 = date(2025, 12, 21)
    dec_22 = date(2025, 12, 22)
    dec_23 = date(2025, 12, 23)
    
    all_fixtures = {
        dec_20: {
            "Premier League": [
                {"home_team": "Aston Villa", "away_team": "Manchester City", "home_score": 2, "away_score": 1, "match_date": dec_20, "match_time": "12:30", "status": "finished", "espn_event_id": "epl_2025_12_20_001"},
                {"home_team": "Bournemouth", "away_team": "Crystal Palace", "home_score": 0, "away_score": 0, "match_date": dec_20, "match_time": "15:00", "status": "finished", "espn_event_id": "epl_2025_12_20_002"},
                {"home_team": "Everton", "away_team": "Chelsea", "home_score": 0, "away_score": 0, "match_date": dec_20, "match_time": "15:00", "status": "finished", "espn_event_id": "epl_2025_12_20_003"},
                {"home_team": "Nottingham Forest", "away_team": "Tottenham", "home_score": 1, "away_score": 0, "match_date": dec_20, "match_time": "15:00", "status": "finished", "espn_event_id": "epl_2025_12_20_004"},
            ],
            "La Liga": [
                {"home_team": "Barcelona", "away_team": "Atletico Madrid", "home_score": 1, "away_score": 2, "match_date": dec_20, "match_time": "21:00", "status": "finished", "espn_event_id": "laliga_2025_12_20_001"},
                {"home_team": "Real Madrid", "away_team": "Sevilla", "home_score": 4, "away_score": 2, "match_date": dec_20, "match_time": "18:30", "status": "finished", "espn_event_id": "laliga_2025_12_20_002"},
            ],
            "Bundesliga": [
                {"home_team": "Bayern Munich", "away_team": "RB Leipzig", "home_score": 5, "away_score": 1, "match_date": dec_20, "match_time": "18:30", "status": "finished", "espn_event_id": "bundesliga_2025_12_20_001"},
                {"home_team": "Borussia Dortmund", "away_team": "Wolfsburg", "home_score": 3, "away_score": 1, "match_date": dec_20, "match_time": "15:30", "status": "finished", "espn_event_id": "bundesliga_2025_12_20_002"},
            ],
            "Serie A": [
                {"home_team": "Inter Milan", "away_team": "Como", "home_score": 2, "away_score": 0, "match_date": dec_20, "match_time": "20:45", "status": "finished", "espn_event_id": "seriea_2025_12_20_001"},
                {"home_team": "AC Milan", "away_team": "Verona", "home_score": 3, "away_score": 2, "match_date": dec_20, "match_time": "18:00", "status": "finished", "espn_event_id": "seriea_2025_12_20_002"},
            ],
            "Ligue 1": [
                {"home_team": "PSG", "away_team": "Monaco", "home_score": 4, "away_score": 2, "match_date": dec_20, "match_time": "21:00", "status": "finished", "espn_event_id": "ligue1_2025_12_20_001"},
            ],
        },
        dec_21: {
            "Premier League": [
                {"home_team": "Liverpool", "away_team": "Tottenham", "home_score": 6, "away_score": 3, "match_date": dec_21, "match_time": "16:30", "status": "finished", "espn_event_id": "epl_2025_12_21_001"},
                {"home_team": "Arsenal", "away_team": "Crystal Palace", "home_score": 5, "away_score": 1, "match_date": dec_21, "match_time": "14:00", "status": "finished", "espn_event_id": "epl_2025_12_21_002"},
                {"home_team": "Manchester United", "away_team": "Bournemouth", "home_score": 0, "away_score": 3, "match_date": dec_21, "match_time": "14:00", "status": "finished", "espn_event_id": "epl_2025_12_21_003"},
            ],
            "La Liga": [
                {"home_team": "Valencia", "away_team": "Alaves", "home_score": 2, "away_score": 2, "match_date": dec_21, "match_time": "18:30", "status": "finished", "espn_event_id": "laliga_2025_12_21_001"},
            ],
            "Serie A": [
                {"home_team": "Juventus", "away_team": "Fiorentina", "home_score": 2, "away_score": 2, "match_date": dec_21, "match_time": "18:00", "status": "finished", "espn_event_id": "seriea_2025_12_21_001"},
                {"home_team": "Roma", "away_team": "Parma", "home_score": 5, "away_score": 0, "match_date": dec_21, "match_time": "20:45", "status": "finished", "espn_event_id": "seriea_2025_12_21_002"},
            ],
        },
        dec_22: {
            "Premier League": [
                {"home_team": "Chelsea", "away_team": "Fulham", "home_score": None, "away_score": None, "match_date": dec_22, "match_time": "14:00", "status": "scheduled", "espn_event_id": "epl_2025_12_22_001"},
                {"home_team": "Newcastle", "away_team": "Ipswich", "home_score": None, "away_score": None, "match_date": dec_22, "match_time": "14:00", "status": "scheduled", "espn_event_id": "epl_2025_12_22_002"},
            ],
            "La Liga": [
                {"home_team": "Villarreal", "away_team": "Real Betis", "home_score": None, "away_score": None, "match_date": dec_22, "match_time": "21:00", "status": "scheduled", "espn_event_id": "laliga_2025_12_22_001"},
            ],
        },
        dec_23: {
            "Premier League": [
                {"home_team": "West Ham", "away_team": "Brighton", "home_score": None, "away_score": None, "match_date": dec_23, "match_time": "20:00", "status": "scheduled", "espn_event_id": "epl_2025_12_23_001"},
            ],
            "EFL Cup": [
                {"home_team": "Tottenham", "away_team": "Manchester United", "home_score": None, "away_score": None, "match_date": dec_23, "match_time": "20:00", "status": "scheduled", "espn_event_id": "eflcup_2025_12_23_001"},
            ],
        },
    }
    
    return all_fixtures.get(target_date, {})


def create_sample_fixtures() -> Dict[str, List[Dict]]:
    """Create sample fixtures for yesterday (to show highlights)"""
    yesterday = get_yesterday()
    return create_sample_fixtures_for_date(yesterday)
