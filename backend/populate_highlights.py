#!/usr/bin/env python3
"""
Script to populate the database with highlights from the last 7 days
Run this script to fetch matches and highlights for the past week
"""
import sys
import os
from datetime import datetime, timedelta
import asyncio

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from app.database import engine, SessionLocal
from app import models
from app.youtube_service import get_youtube_service
from sqlalchemy.orm import Session
from sqlalchemy import and_

def get_date_range(days: int = 7):
    """Get date range for the past N days"""
    today = datetime.now().date()
    start_date = today - timedelta(days=days)
    return start_date, today

def get_matches_without_highlights(db: Session, start_date, end_date):
    """Get all matches in date range that don't have highlights yet"""
    matches = db.query(models.Match).filter(
        and_(
            models.Match.match_date >= start_date,
            models.Match.match_date <= end_date
        )
    ).all()
    
    # Filter to only matches without highlights
    matches_without_highlights = [m for m in matches if len(m.highlights) == 0]
    return matches_without_highlights

def fetch_highlights_for_match(db: Session, match: models.Match, youtube_service):
    """Fetch and store highlights for a single match"""
    try:
        league = db.query(models.League).filter(models.League.id == match.league_id).first()
        if not league:
            print(f"  ⚠️  League not found for match {match.id}")
            return False
        
        # Search for highlights
        search_query = f"{match.home_team} vs {match.away_team} {league.name} highlights"
        print(f"  🔍 Searching: {search_query}")
        
        highlights = youtube_service.search_highlights(
            search_query,
            league_name=league.name,
            match_date=match.match_date
        )
        
        if highlights:
            # Store highlights in database
            for highlight_data in highlights:
                existing = db.query(models.Highlight).filter(
                    models.Highlight.youtube_video_id == highlight_data['youtube_video_id']
                ).first()
                
                if not existing:
                    highlight = models.Highlight(
                        match_id=match.id,
                        youtube_video_id=highlight_data['youtube_video_id'],
                        title=highlight_data['title'],
                        description=highlight_data.get('description'),
                        thumbnail_url=highlight_data.get('thumbnail_url'),
                        channel_title=highlight_data.get('channel_title'),
                        published_at=highlight_data.get('published_at'),
                        view_count=highlight_data.get('view_count'),
                        duration=highlight_data.get('duration')
                    )
                    db.add(highlight)
            
            db.commit()
            print(f"  ✅ Added {len(highlights)} highlight(s)")
            return True
        else:
            print(f"  ❌ No highlights found")
            return False
            
    except Exception as e:
        print(f"  ⚠️  Error fetching highlights: {e}")
        db.rollback()
        return False

def populate_highlights(days: int = 7):
    """Main function to populate highlights for the past N days"""
    print(f"\n🎬 Starting highlight population for the past {days} days...\n")
    
    start_date, end_date = get_date_range(days)
    print(f"📅 Date range: {start_date} to {end_date}\n")
    
    db = SessionLocal()
    youtube_service = get_youtube_service()
    
    try:
        # Get matches without highlights
        matches = get_matches_without_highlights(db, start_date, end_date)
        
        if not matches:
            print("✅ All matches already have highlights!")
            return
        
        print(f"📊 Found {len(matches)} matches without highlights\n")
        
        # Fetch highlights for each match
        successful = 0
        failed = 0
        
        for i, match in enumerate(matches, 1):
            league = db.query(models.League).filter(models.League.id == match.league_id).first()
            league_name = league.name if league else "Unknown"
            
            print(f"[{i}/{len(matches)}] {match.home_team} vs {match.away_team} ({league_name}) - {match.match_date}")
            
            if fetch_highlights_for_match(db, match, youtube_service):
                successful += 1
            else:
                failed += 1
        
        print(f"\n📈 Summary:")
        print(f"  ✅ Successful: {successful}")
        print(f"  ❌ Failed: {failed}")
        print(f"  📊 Total: {successful + failed}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    populate_highlights(days)
