import asyncio
import sys
sys.path.append('/Users/s0m13i5/linus/multi-media/backend')

from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import IntegrityError
from app.football_api import ESPNFootballAPI
from app.youtube_service import YouTubeService
from app import models

# Production database connection
PRODUCTION_DATABASE_URL = "postgresql://postgres:wUXRJCcrvqKCaNLZaUiRDXEbsjdduujw@shinkansen.proxy.rlwy.net:49888/railway"

async def sync_afcon_to_production():
    """Sync AFCON matches and highlights to production database"""
    
    # Create production database connection
    prod_engine = create_engine(PRODUCTION_DATABASE_URL)
    ProductionSession = sessionmaker(bind=prod_engine)
    
    prod_db = ProductionSession()
    football_api = ESPNFootballAPI()
    youtube_service = YouTubeService()
    
    try:
        print("🔄 Syncing AFCON data to production database...")
        
        # Dates with AFCON matches
        target_dates = [
            date(2025, 12, 24),  # 4 matches
            date(2025, 12, 26),  # 4 matches (today)
        ]
        
        total_matches_synced = 0
        total_highlights_synced = 0
        
        # Get or create AFCON league in production
        afcon_league = prod_db.query(models.League).filter(
            models.League.name.ilike('%AFCON%')
        ).first()
        
        if not afcon_league:
            # Create AFCON league in production
            try:
                afcon_league = models.League(
                    name='AFCON',
                    slug='afcon', 
                    country='Africa',
                    display_order=5
                )
                prod_db.add(afcon_league)
                prod_db.commit()
                prod_db.refresh(afcon_league)
                print('✅ Created AFCON league in production')
            except IntegrityError as e:
                print(f'⚠️ AFCON league creation failed: {str(e)[:100]}...')
                prod_db.rollback()
                # Try to find it again
                afcon_league = prod_db.query(models.League).filter(
                    models.League.name.ilike('%AFCON%')
                ).first()
                if afcon_league:
                    print(f'✅ Found existing AFCON league in production: {afcon_league.name}')
        else:
            print(f'✅ Found existing AFCON league in production: {afcon_league.name} (ID: {afcon_league.id})')
        
        if not afcon_league:
            print('❌ Could not create or find AFCON league in production')
            return
        
        for target_date in target_dates:
            print(f'\n🔍 Syncing AFCON matches for {target_date}...')
            
            # Fetch matches for this date from ESPN
            fixtures_by_league = await football_api.get_matches_for_date(target_date)
            
            # Look specifically for AFCON matches
            afcon_matches = []
            for league_name, matches in fixtures_by_league.items():
                if 'AFCON' in league_name or 'African Cup of Nations' in league_name:
                    afcon_matches.extend(matches)
                    print(f'✅ Found {len(matches)} AFCON matches in {league_name}')
            
            if not afcon_matches:
                print(f'❌ No AFCON matches found for {target_date}')
                continue
            
            # Process each AFCON match
            for match in afcon_matches:
                print(f'\n⚽ Syncing: {match["home_team"]} vs {match["away_team"]}')
                
                # Check if match already exists in production
                existing_match = prod_db.query(models.Match).filter(
                    models.Match.home_team == match['home_team'],
                    models.Match.away_team == match['away_team'],
                    models.Match.match_date == target_date,
                    models.Match.league_id == afcon_league.id
                ).first()
                
                # Also check by ESPN event ID if available
                if not existing_match and match.get('espn_event_id'):
                    existing_match = prod_db.query(models.Match).filter(
                        models.Match.espn_event_id == match['espn_event_id']
                    ).first()
                
                if not existing_match:
                    # Create new match in production
                    try:
                        new_match = models.Match(
                            league_id=afcon_league.id,
                            home_team=match['home_team'],
                            away_team=match['away_team'], 
                            home_score=match.get('home_score'),
                            away_score=match.get('away_score'),
                            match_date=target_date,
                            match_time=match.get('match_time'),
                            status=match.get('status', 'finished'),
                            espn_event_id=match.get('espn_event_id')
                        )
                        prod_db.add(new_match)
                        prod_db.commit()
                        prod_db.refresh(new_match)
                        existing_match = new_match
                        total_matches_synced += 1
                        print('✅ Created new match in production')
                    except IntegrityError as e:
                        print(f'⚠️ Match creation failed in production: {str(e)[:100]}...')
                        prod_db.rollback()
                        # Try to find the existing match
                        existing_match = prod_db.query(models.Match).filter(
                            models.Match.home_team == match['home_team'],
                            models.Match.away_team == match['away_team'],
                            models.Match.match_date == target_date
                        ).first()
                        if existing_match:
                            print(f'✅ Found existing match in production')
                        else:
                            print('❌ Could not find or create match in production')
                            continue
                else:
                    print('✅ Match already exists in production')
                
                # Sync highlights if match exists and is finished
                if existing_match and existing_match.status == 'finished':
                    existing_highlights_count = len(existing_match.highlights or [])
                    
                    if existing_highlights_count == 0:
                        print('🔎 Searching for highlights for production...')
                        
                        try:
                            highlights = youtube_service.search_highlights(
                                home_team=match['home_team'],
                                away_team=match['away_team'],
                                league='AFCON',
                                match_date=target_date,
                                max_results=3
                            )
                            
                            for highlight_data in highlights:
                                # Check if highlight already exists in production
                                existing_highlight = prod_db.query(models.Highlight).filter(
                                    models.Highlight.youtube_video_id == highlight_data['video_id']
                                ).first()
                                
                                if not existing_highlight:
                                    try:
                                        new_highlight = models.Highlight(
                                            match_id=existing_match.id,
                                            youtube_video_id=highlight_data['video_id'],
                                            title=highlight_data['title'],
                                            description=highlight_data.get('description'),
                                            thumbnail_url=highlight_data.get('thumbnail_url'),
                                            channel_title=highlight_data.get('channel_title'),
                                            view_count=highlight_data.get('view_count'),
                                            duration=highlight_data.get('duration')
                                        )
                                        prod_db.add(new_highlight)
                                        prod_db.commit()
                                        total_highlights_synced += 1
                                        print(f'✅ Added highlight to production: {highlight_data["title"][:50]}...')
                                    except IntegrityError as e:
                                        print(f'⚠️ Highlight already exists in production: {highlight_data["title"][:30]}...')
                                        prod_db.rollback()
                                else:
                                    print(f'⚠️ Highlight already exists in production: {highlight_data["title"][:30]}...')
                            
                        except Exception as e:
                            print(f'❌ Error searching highlights for production: {e}')
                            continue
                    else:
                        print(f'✅ Match already has {existing_highlights_count} highlights in production')
        
        print(f'\n🎉 Production Sync Complete!')
        print(f'📊 Total matches synced to production: {total_matches_synced}')
        print(f'🎥 Total highlights synced to production: {total_highlights_synced}')
        
        # Show production summary
        all_afcon_matches_prod = prod_db.query(models.Match).filter(
            models.Match.league_id == afcon_league.id
        ).all()
        
        print(f'\n📋 Production AFCON Database Summary:')
        print(f'   Total AFCON matches in production: {len(all_afcon_matches_prod)}')
        
        total_highlights_prod = 0
        for match in all_afcon_matches_prod:
            total_highlights_prod += len(match.highlights or [])
        
        print(f'   Total highlights in production: {total_highlights_prod}')
        
    except Exception as e:
        print(f'❌ Production sync error: {e}')
        import traceback
        traceback.print_exc()
        prod_db.rollback()
    finally:
        prod_db.close()

if __name__ == "__main__":
    asyncio.run(sync_afcon_to_production())