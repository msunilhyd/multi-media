from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List, Dict, Set


class Settings(BaseSettings):
    app_name: str = "Football Highlights API"
    database_url: str = "postgresql://localhost:5432/football_highlights"
    youtube_api_keys: str = ""  # Comma-separated list - optional for audio streaming
    football_api_key: str = ""  # football-data.org API key
    
    # Email notification settings (for missing highlights alerts)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""  # Your email address
    smtp_password: str = ""  # App password (not regular password)
    notification_email: str = ""  # Email to receive notifications
    
    class Config:
        env_file = ".env"
    
    def get_youtube_keys_list(self) -> List[str]:
        """Parse comma-separated YouTube API keys"""
        return [key.strip() for key in self.youtube_api_keys.split(',') if key.strip()]
    
    def email_configured(self) -> bool:
        """Check if email notifications are properly configured"""
        return bool(self.smtp_user and self.smtp_password and self.notification_email)


# Teams of interest by league - only fetch highlights for matches involving these teams
TEAMS_OF_INTEREST: Dict[str, Set[str]] = {
    "Premier League": {
        "Arsenal",
        "Chelsea",
        "Liverpool",
        "Manchester City",
        "Manchester United",
        "Tottenham Hotspur",
    },
    "La Liga": {
        "Real Madrid",
        "Barcelona",
        "Atlético Madrid",
        "Villarreal",
    },
    "Ligue 1": {
        "Paris Saint-Germain",
    },
    "Bundesliga": {
        "Bayern Munich",
        "Borussia Dortmund",
        "Bayer Leverkusen",
    },
    "Serie A": {
        "Juventus",
        "Inter Milan",
        "AC Milan",
        "AS Roma",
        "Napoli",
    },
}

# Leagues where we want ALL matches (no team filtering)
LEAGUES_ALL_MATCHES: Set[str] = {
    "Champions League",
}

# European competitions that should filter by ALL teams of interest across all leagues
EUROPEAN_COMPETITIONS_FILTERED: Set[str] = {
    "Europa League",
}

# Map domestic cups to their corresponding league for team filtering
CUP_TO_LEAGUE_MAPPING: Dict[str, str] = {
    "FA Cup": "Premier League",
    "League Cup": "Premier League",
    "Copa del Rey": "La Liga",
    "Coupe de France": "Ligue 1",
    "DFB-Pokal": "Bundesliga",
    "Coppa Italia": "Serie A",
}

# DEV MODE: Set to True to only process configured leagues (block all others)
DEV_MODE_STRICT = False


def get_all_teams_of_interest() -> Set[str]:
    """Get all teams of interest across all leagues"""
    all_teams = set()
    for teams in TEAMS_OF_INTEREST.values():
        all_teams.update(teams)
    return all_teams


def is_team_of_interest(team_name: str, league_name: str) -> bool:
    """Check if a team is in our list of teams of interest for its league"""
    # For Champions League, allow all teams
    if league_name in LEAGUES_ALL_MATCHES:
        return True
    
    # For Europa League, check against ALL teams of interest from all leagues
    if league_name in EUROPEAN_COMPETITIONS_FILTERED:
        all_teams = get_all_teams_of_interest()
        for team in all_teams:
            if team.lower() in team_name.lower() or team_name.lower() in team.lower():
                return True
        return False
    
    # For domestic cups, use the corresponding league's teams of interest
    check_league = CUP_TO_LEAGUE_MAPPING.get(league_name, league_name)
    
    if check_league not in TEAMS_OF_INTEREST:
        # DEV MODE: If strict, block unconfigured leagues
        if DEV_MODE_STRICT:
            return False
        # If league not configured, allow all teams
        return True
    
    teams = TEAMS_OF_INTEREST[check_league]
    # Check for exact match or partial match (handles variations like "Manchester United FC")
    for team in teams:
        if team.lower() in team_name.lower() or team_name.lower() in team.lower():
            return True
    return False


def match_has_team_of_interest(home_team: str, away_team: str, league_name: str) -> bool:
    """Check if either team in the match is a team of interest"""
    return is_team_of_interest(home_team, league_name) or is_team_of_interest(away_team, league_name)


@lru_cache()
def get_settings():
    return Settings()
