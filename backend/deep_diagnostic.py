"""
Deep diagnostic for Barcelona vs Atletico match and FetchedDate tracking
"""
import sys
import os
import asyncio
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models
from app.football_api import get_football_api
from sqlalchemy.orm import joinedload

async def main():
    db = SessionLocal()
    
    print("=" * 80)
    print("DEEP DIAGNOSTIC: BARCELONA vs ATLETICO MATCH MISSING")
    print("=" * 80)
    
    yesterday = date(2026, 2, 12)
    
    # Check FetchedDate tracking
    print(f"\n📋 FetchedDate Tracking (Feb 9-12):\n")
    
    for day_offset in range(-3, 1):
        check_date = yesterday + timedelta(days=day_offset)
        fetched_record = db.query(models.FetchedDate).filter(
            models.FetchedDate.fetch_date == check_date
        ).first()
        
        status = "✓ MARKED FETCHED" if fetched_record else "✗ NOT MARKED"
        print(f"  {check_date}: {status}")
    
    # Count matches in DB for Feb 12
    print(f"\n📊 Matches in Database for {yesterday}:\n")
    
    matches_feb12 = db.query(models.Match).filter(
        models.Match.match_date == yesterday
    ).all()
    
    if matches_feb12:
        print(f"  Total: {len(matches_feb12)} matches")
        for match in matches_feb12:
            print(f"    • {match.home_team} vs {match.away_team} ({match.league.name})")
    else:
        print(f"  ❌ ZERO matches in database!")
    
    # Check ESPN API for ALL competitions on Feb 12
    print(f"\n🔍 ESPN API Results for {yesterday}:\n")
    
    football_api = get_football_api()
    fixtures = await football_api.get_matches_for_date(yesterday)
    
    if fixtures:
        total_espn_matches = 0
        for league_name, league_matches in fixtures.items():
            print(f"  {league_name}: {len(league_matches)} matches")
            for match in league_matches:
                total_espn_matches += 1
                is_barcelona = 'barcelona' in match['home_team'].lower() or 'barcelona' in match['away_team'].lower()
                marker = "⭐ BARCELONA" if is_barcelona else ""
                print(f"    • {match['home_team']} vs {match['away_team']} {marker}")
        
        print(f"\n  Total ESPN matches: {total_espn_matches}")
    else:
        print(f"  ❌ ESPN API returned NO matches!")
    
    # Check league configuration
    print(f"\n⚙️  Configuration Check:\n")
    
    from app.config import TEAMS_OF_INTEREST, CUP_TO_LEAGUE_MAPPING, match_has_team_of_interest
    
    print(f"  Barcelona in TEAMS_OF_INTEREST['La Liga']? {('Barcelona' in TEAMS_OF_INTEREST['La Liga'])}")
    print(f"  Copa del Rey mapped to: {CUP_TO_LEAGUE_MAPPING.get('Copa del Rey', 'NOT MAPPED')}")
    print(f"  match_has_team_of_interest('Barcelona', 'Atletico Madrid', 'Copa del Rey')? {match_has_team_of_interest('Barcelona', 'Atletico Madrid', 'Copa del Rey')}")
    
    # Database stats
    print(f"\n📈 Database Summary:\n")
    
    total_matches = db.query(models.Match).count()
    total_leagues = db.query(models.League).count()
    
    print(f"  Total matches in DB: {total_matches}")
    print(f"  Total leagues in DB: {total_leagues}")
    
    # List Feb 12 matches by league
    print(f"\n📅 Matches by League on {yesterday}:\n")
    
    by_league = db.query(models.League.name, models.Match.home_team, models.Match.away_team, models.Match.status).join(
        models.Match, models.Match.league_id == models.League.id
    ).filter(models.Match.match_date == yesterday).all()
    
    if by_league:
        leagues_seen = set()
        for league, home, away, status in by_league:
            if league not in leagues_seen:
                print(f"  {league}:")
                leagues_seen.add(league)
            print(f"    • {home} vs {away} ({status})")
    else:
        print(f"  No matches found!")
    
    print("\n" + "=" * 80)
    print("ROOT CAUSE ANALYSIS")
    print("=" * 80)
    
    # Determine the issue
    is_marked_fetched = db.query(models.FetchedDate).filter(
        models.FetchedDate.fetch_date == yesterday
    ).first() is not None
    
    espn_has_match = any(
        l for l, matches in fixtures.items() 
        for m in matches 
        if ('barcelona' in m['home_team'].lower() or 'barcelona' in m['away_team'].lower())
    )
    
    db_has_match = any(m for m in matches_feb12 if 'barcelona' in m.home_team.lower() or 'barcelona' in m.away_team.lower())
    
    print(f"\nScenario Analysis:")
    print(f"  1. Is Feb 12 marked as 'fetched'? {is_marked_fetched}")
    print(f"  2. Does ESPN API have the match? {espn_has_match}")
    print(f"  3. Does DB have the match? {db_has_match}")
    
    if not db_has_match and espn_has_match:
        if is_marked_fetched:
            print(f"\n⚠️  ROOT CAUSE: FetchedDate protection prevented re-fetch")
            print(f"    Feb 12 was marked as 'fetched' on first attempt")
            print(f"    But the match was not saved (API issue/timeout/error)")
            print(f"    Scheduler won't refetch marked dates")
        else:
            print(f"\n⚠️  ROOT CAUSE: Unknown - match not in DB but Feb 12 not marked fetched")
            print(f"    This shouldn't happen - scheduler should have fetched it")
    
    print(f"\nSolution:")
    print(f"  1. Implement forced refetch for dates with 0 matches")
    print(f"  2. Add match to DB now with fix_match_video.py or direct SQL")
    print(f"  3. Set scheduler to refetch after unexpected failures")
    
    db.close()

if __name__ == "__main__":
    asyncio.run(main())
