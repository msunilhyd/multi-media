from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

# Import user-related models
from .models_users import User, UserFavoriteTeam, NotificationPreference, Notification


class League(Base):
    __tablename__ = "leagues"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    country = Column(String(100), nullable=True)
    logo_url = Column(String(500), nullable=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    
    matches = relationship("Match", back_populates="league")


class Match(Base):
    __tablename__ = "matches"
    
    id = Column(Integer, primary_key=True, index=True)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=False)
    home_team = Column(String(200), nullable=False)
    away_team = Column(String(200), nullable=False)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    match_date = Column(Date, nullable=False, index=True)
    match_time = Column(String(10), nullable=True)
    status = Column(String(50), default="scheduled")  # scheduled, live, finished
    espn_event_id = Column(String(100), nullable=True, unique=True)
    highlight_fetch_attempts = Column(Integer, default=0)  # Track retry attempts
    last_highlight_fetch_attempt = Column(DateTime, nullable=True)  # Last attempt timestamp
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    league = relationship("League", back_populates="matches")
    highlights = relationship("Highlight", back_populates="match")


class Highlight(Base):
    __tablename__ = "highlights"
    
    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    youtube_video_id = Column(String(50), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    channel_title = Column(String(200), nullable=True)
    published_at = Column(DateTime, nullable=True)
    view_count = Column(Integer, nullable=True)
    duration = Column(String(20), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    match = relationship("Match", back_populates="highlights")


class FetchedDate(Base):
    """Track which dates have been fetched from ESPN API"""
    __tablename__ = "fetched_dates"
    
    id = Column(Integer, primary_key=True, index=True)
    fetch_date = Column(Date, nullable=False, unique=True, index=True)
    fetched_at = Column(DateTime, server_default=func.now())


LEAGUE_MAPPINGS = {
    "Premier League": {"slug": "premier-league", "country": "England"},
    "English Premier League": {"slug": "premier-league", "country": "England"},
    "EPL": {"slug": "premier-league", "country": "England"},
    "Champions League": {"slug": "champions-league", "country": "Europe"},
    "UEFA Champions League": {"slug": "champions-league", "country": "Europe"},
    "Europa League": {"slug": "europa-league", "country": "Europe"},
    "UEFA Europa League": {"slug": "europa-league", "country": "Europe"},
    "La Liga": {"slug": "la-liga", "country": "Spain"},
    "Serie A": {"slug": "serie-a", "country": "Italy"},
    "Bundesliga": {"slug": "bundesliga", "country": "Germany"},
    "Ligue 1": {"slug": "ligue-1", "country": "France"},
    "EFL Championship": {"slug": "championship", "country": "England"},
    "Championship": {"slug": "championship", "country": "England"},
    "FA Cup": {"slug": "fa-cup", "country": "England"},
    "EFL Cup": {"slug": "efl-cup", "country": "England"},
    "League Cup": {"slug": "efl-cup", "country": "England"},
    "Scottish Premiership": {"slug": "scottish-premiership", "country": "Scotland"},
    "MLS": {"slug": "mls", "country": "USA"},
    "World Cup": {"slug": "world-cup", "country": "International"},
    "Euro": {"slug": "euro", "country": "Europe"},
    "AFCON": {"slug": "afcon", "country": "Africa"},
    "African Cup of Nations": {"slug": "afcon", "country": "Africa"},
    "Africa Cup of Nations": {"slug": "afcon", "country": "Africa"},
    "CAF Africa Cup of Nations": {"slug": "afcon", "country": "Africa"},
    "CAF African Cup of Nations": {"slug": "afcon", "country": "Africa"},
}
