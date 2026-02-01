from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List


class LeagueBase(BaseModel):
    name: str
    slug: str
    country: Optional[str] = None
    logo_url: Optional[str] = None


class LeagueCreate(LeagueBase):
    pass


class League(LeagueBase):
    id: int
    display_order: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class HighlightBase(BaseModel):
    youtube_video_id: str
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    channel_title: Optional[str] = None
    view_count: Optional[int] = None
    duration: Optional[str] = None
    is_geo_blocked: Optional[bool] = False
    blocked_countries: Optional[List[str]] = []
    allowed_countries: Optional[List[str]] = []


class HighlightCreate(HighlightBase):
    match_id: int


class Highlight(HighlightBase):
    id: int
    match_id: int
    published_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class MatchBase(BaseModel):
    home_team: str
    away_team: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    match_date: date
    match_time: Optional[str] = None
    status: str = "scheduled"


class MatchCreate(MatchBase):
    league_id: int
    espn_event_id: Optional[str] = None


class Match(MatchBase):
    id: int
    league_id: int
    espn_event_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class MatchWithHighlights(Match):
    highlights: List[Highlight] = []
    league: Optional[League] = None


class LeagueWithMatches(League):
    matches: List[MatchWithHighlights] = []


class HighlightsGroupedByLeague(BaseModel):
    league: League
    matches: List[MatchWithHighlights]
    total_highlights: int


class ScrapeResponse(BaseModel):
    success: bool
    message: str
    matches_found: int
    leagues_found: int


class YouTubeSearchResponse(BaseModel):
    success: bool
    message: str
    highlights_found: int


class MatchForHighlights(BaseModel):
    """Match info for the cost estimation preview"""
    id: int
    home_team: str
    away_team: str
    league_name: str
    
    class Config:
        from_attributes = True


class YouTubeCostEstimate(BaseModel):
    """Cost estimate before fetching YouTube highlights"""
    matches_to_process: int
    matches_skipped: int
    estimated_units: int
    estimated_units_min: int
    estimated_units_max: int
    daily_quota: int
    matches: List[MatchForHighlights]
    message: str


class UpcomingMatch(BaseModel):
    """Upcoming match (coming soon)"""
    home_team: str
    away_team: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    match_date: date
    match_time: Optional[str] = None
    league_name: str
    status: str = "scheduled"


class UpcomingMatchesByDate(BaseModel):
    """Upcoming matches grouped by date"""
    date: date
    date_label: str  # "Tomorrow", "Monday", etc.
    matches: List[UpcomingMatch]
