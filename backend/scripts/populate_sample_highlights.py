#!/usr/bin/env python3
"""
Script to populate sample highlights for all sports leagues.
Run this to add test data to the database.
"""

import sys
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
sys.path.insert(0, '/Users/s0m13i5/linus/multi-media/backend')

from app.models import League, Match, Highlight
from app.config import get_settings

settings = get_settings()
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def populate_highlights():
    db = SessionLocal()
    
    try:
        # Sample data for each sport
        sample_data = {
            'premier-league': {
                'league_slug': 'premier-league',
                'matches': [
                    {'home': 'Manchester United', 'away': 'Liverpool', 'date': '2026-06-06'},
                    {'home': 'Arsenal', 'away': 'Chelsea', 'date': '2026-06-07'},
                    {'home': 'Manchester City', 'away': 'Tottenham', 'date': '2026-06-08'},
                ]
            },
            'fifa': {
                'league_slug': 'fifa',
                'matches': [
                    {'home': 'Argentina', 'away': 'France', 'date': '2026-06-06'},
                    {'home': 'Brazil', 'away': 'Germany', 'date': '2026-06-07'},
                    {'home': 'Spain', 'away': 'England', 'date': '2026-06-08'},
                ]
            },
            'ipl': {
                'league_slug': 'ipl',
                'matches': [
                    {'home': 'Mumbai Indians', 'away': 'Chennai Super Kings', 'date': '2026-06-06'},
                    {'home': 'Kolkata Knight Riders', 'away': 'Delhi Capitals', 'date': '2026-06-07'},
                    {'home': 'Royal Challengers Bangalore', 'away': 'Rajasthan Royals', 'date': '2026-06-08'},
                ]
            },
            'nba': {
                'league_slug': 'nba',
                'matches': [
                    {'home': 'Los Angeles Lakers', 'away': 'Boston Celtics', 'date': '2026-06-06'},
                    {'home': 'Golden State Warriors', 'away': 'Miami Heat', 'date': '2026-06-07'},
                    {'home': 'Denver Nuggets', 'away': 'Phoenix Suns', 'date': '2026-06-08'},
                ]
            },
            'tennis': {
                'league_slug': 'tennis',
                'matches': [
                    {'home': 'Novak Djokovic', 'away': 'Carlos Alcaraz', 'date': '2026-06-06'},
                    {'home': 'Jannik Sinner', 'away': 'Daniil Medvedev', 'date': '2026-06-07'},
                    {'home': 'Iga Swiatek', 'away': 'Aryna Sabalenka', 'date': '2026-06-08'},
                ]
            },
            'nhl': {
                'league_slug': 'nhl',
                'matches': [
                    {'home': 'Toronto Maple Leafs', 'away': 'Montreal Canadiens', 'date': '2026-06-06'},
                    {'home': 'New York Rangers', 'away': 'Boston Bruins', 'date': '2026-06-07'},
                    {'home': 'Los Angeles Kings', 'away': 'Vegas Golden Knights', 'date': '2026-06-08'},
                ]
            },
        }
        
        # Popular YouTube highlight video IDs (real videos)
        youtube_videos = [
            'dQw4w9WgXcQ',  # Placeholder IDs - replace with real ones
            'jNQXAC9IVRw',
            '9bZkp7q19f0',
            'oHg5SJYRHA0',
            'kffacxfA7g4',
        ]
        
        for sport_key, sport_data in sample_data.items():
            league = db.query(League).filter(League.slug == sport_data['league_slug']).first()
            
            if not league:
                print(f"⚠️  League {sport_data['league_slug']} not found in database")
                continue
            
            print(f"\n📊 Adding matches for {league.name}...")
            
            for idx, match_data in enumerate(sport_data['matches']):
                # Check if match already exists
                existing = db.query(Match).filter(
                    Match.league_id == league.id,
                    Match.home_team == match_data['home'],
                    Match.away_team == match_data['away'],
                    Match.match_date == match_data['date']
                ).first()
                
                if existing:
                    print(f"  ✓ {match_data['home']} vs {match_data['away']} (already exists)")
                    continue
                
                # Create match
                match = Match(
                    league_id=league.id,
                    home_team=match_data['home'],
                    away_team=match_data['away'],
                    match_date=match_data['date'],
                    match_time='19:30',
                    status='completed',
                    home_score=2,
                    away_score=1,
                )
                db.add(match)
                db.flush()
                
                # Add sample highlights
                for vid_idx, video_id in enumerate(youtube_videos[:2]):
                    highlight = Highlight(
                        match_id=match.id,
                        youtube_video_id=video_id,
                        title=f"{match_data['home']} vs {match_data['away']} - Highlights",
                        description=f"Full match highlights from {league.name}",
                        thumbnail_url=f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
                        channel_title=league.name,
                        view_count=100000 + (idx * 10000),
                        duration='PT10M30S',
                        published_at=datetime.now(),
                    )
                    db.add(highlight)
                
                print(f"  ✓ {match_data['home']} vs {match_data['away']} (added with highlights)")
        
        db.commit()
        print("\n✅ Sample data populated successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == '__main__':
    populate_highlights()
