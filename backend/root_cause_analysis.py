"""
Deep analysis: Why was Barcelona vs Atletico Copa del Rey not fetched for 6+ days?
"""
import sys
import os
import asyncio
from datetime import date, timedelta
from sqlalchemy import func, desc

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models
from app.football_api import get_football_api

async def analyze_match_fetching():
    db = SessionLocal()
    
    print("=" * 90)
    print("ROOT CAUSE ANALYSIS: WHY WAS BARCELONA VS ATLETICO NOT FETCHED FOR 6+ DAYS?")
    print("=" * 90)
    
    # The match was on Feb 12, so it should have been fetched on Feb 6, 7, 8, 9, 10, 11, or 12
    match_date = date(2026, 2, 12)
    today = date.today()
    
    print(f"\nMatch date: {match_date}")
    print(f"Today: {today}")
    print(f"Days since match: {(today - match_date).days} days ago\n")
    
    # Check FetchedDate table for the week before the match
    print("=" * 90)
    print("SCENARIO 1: Check FetchedDate table - Was Feb 12 ever marked as fetched?")
    print("=" * 90 + "\n")
    
    fetched_dates = db.query(models.FetchedDate).filter(
        models.FetchedDate.fetch_date >= date(2026, 2, 6),
        models.FetchedDate.fetch_date <= date(2026, 2, 13)
    ).all()
    
    all_tracked = [fd.fetch_date for fd in fetched_dates]
    print(f"FetchedDate records found: {len(fetched_dates)}")
    for fd in fetched_dates:
        print(f"  • {fd.fetch_date}")
    
    if not any(fd.fetch_date == match_date for fd in fetched_dates):
        print(f"\n❌ CRITICAL: {match_date} is NOT in FetchedDate table")
        print(f"   This means prefetch never marked it as fetched")
        print(f"   POSSIBLE REASONS:")
        print(f"     1. Prefetch job failed/crashed before saving FetchedDate")
        print(f"     2. Prefetch job never ran on any of these dates")
        print(f"     3. Exception during fetch_matches_for_date() was caught and ignored")
    
    # Check what matches exist for the week of Feb 12
    print("\n" + "=" * 90)
    print("SCENARIO 2: Check database - What matches were stored during that week?")
    print("=" * 90 + "\n")
    
    for check_date in [date(2026, 2, 9), date(2026, 2, 10), date(2026, 2, 11), date(2026, 2, 12)]:
        count = db.query(models.Match).filter(models.Match.match_date == check_date).count()
        print(f"{check_date}: {count} matches")
        
        if count == 0:
            print(f"  ❌ NO MATCHES - suggests API call failed or returned empty")
    
    # Check ESPN API history - would Copa del Rey have returned a match?
    print("\n" + "=" * 90)
    print("SCENARIO 3: Check ESPN API - Does Copa del Rey return matches?")
    print("=" * 90 + "\n")
    
    football_api = get_football_api()
    
    # Test on several dates
    for test_days_back in [6, 5, 4, 3, 2, 1, 0]:
        test_date = match_date - timedelta(days=test_days_back)
        fixtures = await football_api.get_matches_for_date(test_date)
        
        if "Copa del Rey" in fixtures:
            print(f"✓ {test_date}: Copa del Rey HAS matches")
            elif_count = len(fixtures.get("Copa del Rey", []))
            print(f"  → {elif_count} matches returned")
        else:
            print(f"✗ {test_date}: Copa del Rey NOT in returned data")
    
    # Check if there's a pattern - when did matches start getting added?
    print("\n" + "=" * 90)
    print("SCENARIO 4: When was the first match added to the database?")
    print("=" * 90 + "\n")
    
    first_match = db.query(models.Match).order_by(models.Match.id).first()
    if first_match:
        print(f"First match in DB: {first_match.id}")
        print(f"  Date: {first_match.match_date}")
        print(f"  Teams: {first_match.home_team} vs {first_match.away_team}")
        print(f"  League: {first_match.league.name if first_match.league else 'Unknown'}")
    
    # Check Copa del Rey league creation
    print("\n" + "=" * 90)
    print("SCENARIO 5: When was Copa del Rey league first added?")
    print("=" * 90 + "\n")
    
    copa_league = db.query(models.League).filter(
        models.League.name == "Copa del Rey"
    ).first()
    
    if copa_league:
        print(f"Copa del Rey league exists: ID={copa_league.id}")
        copa_matches = db.query(models.Match).filter(
            models.Match.league_id == copa_league.id
        ).count()
        print(f"  Total Copa del Rey matches in DB: {copa_matches}")
        
        if copa_matches > 0:
            first_copa_match = db.query(models.Match).filter(
                models.Match.league_id == copa_league.id
            ).order_by(models.Match.id).first()
            print(f"  First Copa del Rey match in DB: {first_copa_match.match_date}")
            print(f"    {first_copa_match.home_team} vs {first_copa_match.away_team}")
    else:
        print(f"❌ Copa del Rey league NOT in database!")
    
    # The KEY question
    print("\n" + "=" * 90)
    print("KEY FINDING")
    print("=" * 90)
    
    # If Feb 12 is not in FetchedDate, but the match should have been fetched 6+ days in advance
    # Then either:
    # 1. Prefetch never ran those days
    # 2. Prefetch ran but hit an exception
    # 3. Prefetch ran but ESPN returned empty results for those specific dates
    
    if not any(fd.fetch_date == match_date for fd in fetched_dates):
        print("""
⚠️  Feb 12 is NOT marked as fetched, but:
   - Prefetch runs DAILY at 6 AM for the NEXT 7 DAYS
   - So Feb 12 match should have been fetched on: Feb 6, 7, 8, 9, 10, 11, or earlier
   
HYPOTHESIS: ESPN API must have returned ZERO matches for Feb 12 on EVERY prefetch run
            from Feb 6-11, blocking the stored matches.
            
ALTERNATIVE: A silent exception in fetch_matches_for_date() never added the match,
             and prefetch still marked the date as fetched (BUG in old code).
        """)
    
    db.close()

if __name__ == "__main__":
    asyncio.run(analyze_match_fetching())
