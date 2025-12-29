#!/usr/bin/env python3
"""
Simple script to add AFCON matches one by one to avoid duplicate key issues
"""

import sys
sys.path.append('.')

from app.database import get_db
from app import models
from datetime import date, timedelta
import requests


def add_afcon_matches_individually():
    """Add AFCON matches one by one"""
    
    # Initialize ESPN API
    BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/caf.nations/scoreboard"
    
    db = next(get_db())
    try:
        # Get AFCON league
        afcon_league = db.query(models.League).filter(
            models.League.name == "AFCON"
        ).first()
        
        if not afcon_league:
            print("❌ AFCON league not found")
            return
            
        print(f"✅ Using AFCON league: {afcon_league.name} (ID: {afcon_league.id})")
        
        total_matches = 0
        today = date.today()
        
        # Process next 6 days (skip today since it already has matches)
        for i in range(1, 7):
            target_date = today + timedelta(days=i)
            date_str = target_date.strftime("%Y%m%d")
            
            print(f"\n📅 Processing {target_date}...")
            
            # Fetch data from ESPN
            url = f"{BASE_URL}?dates={date_str}"
            response = requests.get(url)
            
            if response.status_code != 200:
                print(f"   ❌ Failed to fetch data: {response.status_code}")
                continue
                
            data = response.json()
            events = data.get("events", [])
            
            if not events:
                print("   No AFCON matches found")
                continue
                
            print(f"   Found {len(events)} AFCON matches")
            
            for event in events:
                try:
                    # Extract match details
                    home_team = event["competitions"][0]["competitors"][0]["team"]["name"]
                    away_team = event["competitions"][0]["competitors"][1]["team"]["name"]
                    status_text = event["status"]["type"]["name"]
                    
                    # Map ESPN status to our status
                    status = "scheduled"
                    if status_text.lower() == "final":
                        status = "finished"
                    elif status_text.lower() in ["in progress", "halftime"]:
                        status = "live"
                    
                    # Get time
                    match_time = None
                    if "date" in event:
                        from datetime import datetime
                        match_datetime = datetime.fromisoformat(event["date"].replace('Z', '+00:00'))
                        match_time = match_datetime.strftime("%H:%M")
                    
                    # Check if match already exists
                    existing_match = db.query(models.Match).filter(
                        models.Match.home_team == home_team,
                        models.Match.away_team == away_team,
                        models.Match.match_date == target_date,
                        models.Match.league_id == afcon_league.id
                    ).first()
                    
                    if existing_match:
                        print(f"     ↳ Already exists: {home_team} vs {away_team}")
                        continue
                    
                    # Add new match
                    new_match = models.Match(
                        home_team=home_team,
                        away_team=away_team,
                        match_date=target_date,
                        match_time=match_time,
                        status=status,
                        league_id=afcon_league.id,
                        espn_event_id=event.get("id", "")
                    )
                    
                    db.add(new_match)
                    db.commit()  # Commit each match individually
                    total_matches += 1
                    print(f"     ✅ Added: {home_team} vs {away_team} | {match_time} | {status}")
                    
                except Exception as e:
                    print(f"     ❌ Error adding match: {e}")
                    db.rollback()
        
        print(f"\n🎉 LOCAL: Added {total_matches} upcoming AFCON matches!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    add_afcon_matches_individually()