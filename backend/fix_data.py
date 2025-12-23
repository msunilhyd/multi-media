#!/usr/bin/env python3
"""
Fix data integrity issues in the database
"""
import requests
import sys
from app.database import get_db
from app import models
from datetime import date

def main():
    print("=== Data Integrity Fix ===")
    
    # Get database session
    db = next(get_db())
    
    print("\n1. Finding misassigned highlights...")
    
    # Find highlights assigned to scheduled matches (matches that haven't finished)
    scheduled_matches_with_highlights = db.query(models.Match).filter(
        models.Match.status == "scheduled"
    ).all()
    
    for match in scheduled_matches_with_highlights:
        if len(match.highlights) > 0:
            print(f"❌ Match {match.id}: {match.home_team} vs {match.away_team} ({match.match_date})")
            print(f"   Status: {match.status} but has {len(match.highlights)} highlights")
            
            for highlight in match.highlights:
                print(f"   - Highlight: {highlight.title[:50]}...")
                print(f"   - YouTube ID: {highlight.youtube_video_id}")
                
                # Try to find a better match for this highlight based on team names in title
                title_lower = highlight.title.lower()
                
                # Look for finished matches that match the teams in the title
                finished_matches = db.query(models.Match).filter(
                    models.Match.status == "finished"
                ).all()
                
                best_match = None
                for finished_match in finished_matches:
                    home_in_title = finished_match.home_team.lower() in title_lower
                    away_in_title = finished_match.away_team.lower() in title_lower
                    
                    if home_in_title and away_in_title:
                        # Check if this match already has the same highlight
                        existing = db.query(models.Highlight).filter(
                            models.Highlight.match_id == finished_match.id,
                            models.Highlight.youtube_video_id == highlight.youtube_video_id
                        ).first()
                        
                        if not existing:
                            best_match = finished_match
                            break
                
                if best_match:
                    print(f"   ✅ Moving to match {best_match.id}: {best_match.home_team} vs {best_match.away_team} ({best_match.match_date})")
                    highlight.match_id = best_match.id
                else:
                    print(f"   ❌ No suitable finished match found - removing highlight")
                    db.delete(highlight)
    
    print("\n2. Removing highlights from scheduled matches...")
    
    # Alternative approach: Remove all highlights from scheduled matches
    scheduled_matches = db.query(models.Match).filter(
        models.Match.status.in_(["scheduled", "live"])
    ).all()
    
    for match in scheduled_matches:
        if match.highlights:
            print(f"Removing {len(match.highlights)} highlights from scheduled match: {match.home_team} vs {match.away_team}")
            for highlight in match.highlights:
                db.delete(highlight)
    
    # Commit changes
    db.commit()
    print("\n✅ Data integrity fix completed!")

if __name__ == "__main__":
    main()