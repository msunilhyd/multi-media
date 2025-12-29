import asyncio
import sys
sys.path.append('/Users/s0m13i5/linus/multi-media/backend')

from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text, create_engine
from app.database import SessionLocal
from app.football_api import ESPNFootballAPI
from app import models

async def fetch_upcoming_afcon_matches():
    """Fetch and store upcoming AFCON matches for next 7 days"""
    
    # Local database
    db = SessionLocal()
    football_api = ESPNFootballAPI()
    
    try:
        # Get AFCON league
        afcon_league = db.query(models.League).filter(
            models.League.name.ilike('%AFCON%')
        ).first()
        
        if not afcon_league:
            print("❌ AFCON league not found in database")
            return
            
        print(f"✅ Using AFCON league: {afcon_league.name} (ID: {afcon_league.id})")
        
        today = date.today()
        total_new_matches = 0
        
        # Check next 7 days
        for i in range(1, 8):  # Skip today (i=0), start from tomorrow
            target_date = today + timedelta(days=i)
            print(f'\n📅 Processing {target_date}...')
            
            try:
                fixtures_by_league = await football_api.get_matches_for_date(target_date)
                
                # Look for AFCON matches
                afcon_matches = []
                for league_name, matches in fixtures_by_league.items():
                    if 'AFCON' in league_name or 'African Cup of Nations' in league_name:
                        afcon_matches.extend(matches)
                        
                if not afcon_matches:
                    print(f"   No AFCON matches found")
                    continue
                    
                print(f"   Found {len(afcon_matches)} AFCON matches")
                
                # Process each match
                for match in afcon_matches:
                    home_team = match["home_team"]
                    away_team = match["away_team"]
                    
                    # Check if match already exists
                    existing_match = db.query(models.Match).filter(
                        models.Match.home_team == home_team,
                        models.Match.away_team == away_team,
                        models.Match.match_date == target_date,
                        models.Match.league_id == afcon_league.id
                    ).first()
                    
                    if existing_match:
                        print(f"     {home_team} vs {away_team} - already exists")
                        continue
                    
                    # Create new match
                    new_match = models.Match(
                        league_id=afcon_league.id,
                        home_team=home_team,
                        away_team=away_team,
                        home_score=match.get('home_score'),
                        away_score=match.get('away_score'),
                        match_date=target_date,
                        match_time=match.get('match_time'),
                        status=match.get('status', 'scheduled'),
                        espn_event_id=match.get('espn_event_id')
                    )
                    
                    db.add(new_match)
                    total_new_matches += 1
                    status = match.get('status', 'scheduled')
                    time = match.get('match_time', 'TBD')
                    print(f"     ✅ Added: {home_team} vs {away_team} | {time} | {status}")
                
                # Mark this date as fetched
                fetched_record = models.FetchedDate(fetch_date=target_date)
                db.merge(fetched_record)
                
            except Exception as e:
                print(f"   ❌ Error processing {target_date}: {e}")
                continue
        
        # Commit all changes
        db.commit()
        print(f"\n🎉 LOCAL DATABASE: Added {total_new_matches} upcoming AFCON matches!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()
    
    # Now sync to production
    print(f"\n🔄 Syncing to PRODUCTION database...")
    await sync_to_production()

async def sync_to_production():
    """Sync upcoming AFCON matches to production"""
    prod_url = "postgresql://postgres:wUXRJCcrvqKCaNLZaUiRDXEbsjdduujw@shinkansen.proxy.rlwy.net:49888/railway"
    
    # Get local data
    local_db = SessionLocal()
    football_api = ESPNFootballAPI()
    
    try:
        prod_engine = create_engine(prod_url)
        
        with prod_engine.connect() as prod_conn:
            # Get AFCON league in production
            afcon_result = prod_conn.execute(text("""
                SELECT id FROM leagues WHERE name ILIKE '%AFCON%' LIMIT 1
            """)).fetchone()
            
            if not afcon_result:
                print("❌ AFCON league not found in production")
                return
                
            afcon_league_id = afcon_result.id
            print(f"✅ Using production AFCON league ID: {afcon_league_id}")
            
            today = date.today()
            total_prod_matches = 0
            
            # Fetch and add upcoming matches to production
            for i in range(1, 8):  # Next 7 days
                target_date = today + timedelta(days=i)
                print(f'\n📅 Production sync for {target_date}...')
                
                try:
                    fixtures_by_league = await football_api.get_matches_for_date(target_date)
                    
                    # Look for AFCON matches
                    afcon_matches = []
                    for league_name, matches in fixtures_by_league.items():
                        if 'AFCON' in league_name or 'African Cup of Nations' in league_name:
                            afcon_matches.extend(matches)
                            
                    if not afcon_matches:
                        continue
                        
                    print(f"   Found {len(afcon_matches)} AFCON matches")
                    
                    # Process each match
                    for match in afcon_matches:
                        home_team = match["home_team"]
                        away_team = match["away_team"]
                        
                        # Check if match already exists in production
                        existing = prod_conn.execute(text("""
                            SELECT id FROM matches 
                            WHERE home_team = :home AND away_team = :away 
                            AND match_date = :date AND league_id = :league_id
                        """), {
                            "home": home_team,
                            "away": away_team, 
                            "date": target_date,
                            "league_id": afcon_league_id
                        }).fetchone()
                        
                        if existing:
                            continue
                        
                        # Insert new match
                        prod_conn.execute(text("""
                            INSERT INTO matches (
                                league_id, home_team, away_team, home_score, away_score,
                                match_date, match_time, status, espn_event_id, 
                                created_at, updated_at
                            ) VALUES (
                                :league_id, :home_team, :away_team, :home_score, :away_score,
                                :match_date, :match_time, :status, :espn_event_id,
                                NOW(), NOW()
                            )
                        """), {
                            "league_id": afcon_league_id,
                            "home_team": home_team,
                            "away_team": away_team,
                            "home_score": match.get('home_score'),
                            "away_score": match.get('away_score'),
                            "match_date": target_date,
                            "match_time": match.get('match_time'),
                            "status": match.get('status', 'scheduled'),
                            "espn_event_id": match.get('espn_event_id')
                        })
                        
                        total_prod_matches += 1
                        time = match.get('match_time', 'TBD')
                        status = match.get('status', 'scheduled')
                        print(f"     ✅ Added to prod: {home_team} vs {away_team} | {time} | {status}")
                    
                    # Mark date as fetched in production
                    prod_conn.execute(text("""
                        INSERT INTO fetched_dates (fetch_date, fetched_at)
                        VALUES (:date, NOW())
                        ON CONFLICT (fetch_date) DO NOTHING
                    """), {"date": target_date})
                    
                except Exception as e:
                    print(f"   ❌ Error with {target_date}: {e}")
                    continue
            
            prod_conn.commit()
            print(f"\n🎉 PRODUCTION: Added {total_prod_matches} upcoming AFCON matches!")
        
    except Exception as e:
        print(f"❌ Production sync error: {e}")
    finally:
        local_db.close()

if __name__ == "__main__":
    asyncio.run(fetch_upcoming_afcon_matches())