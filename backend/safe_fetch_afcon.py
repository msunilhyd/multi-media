import asyncio
import sys
sys.path.append('/Users/s0m13i5/linus/multi-media/backend')

from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import SessionLocal
from app.football_api import ESPNFootballAPI
from app.youtube_service import YouTubeService
from app import models

async def safe_fetch_afcon_matches():
    """Safely fetch AFCON matches, handling existing data properly"""
    
    db = SessionLocal()
    football_api = ESPNFootballAPI()
    youtube_service = YouTubeService()
    
    try:
        # Dates with AFCON matches
        target_dates = [
            date(2025, 12, 24),  # 4 matches
            date(2025, 12, 26),  # 4 matches (today)
        ]
        
        total_matches_found = 0
        total_highlights_found = 0
        
        # Find existing AFCON league
        afcon_league = db.query(models.League).filter(
            models.League.name.ilike('%AFCON%')
        ).first()
        
        if afcon_league:
            print(f'✅ Found existing AFCON league: {afcon_league.name} (ID: {afcon_league.id})')
        else:
            print('❌ No AFCON league found in database')
            return
        
        for target_date in target_dates:
            print(f'\n🔍 Fetching AFCON matches for {target_date}...')
            
            # Fetch matches for this date
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
            
            total_matches_found += len(afcon_matches)
            
            # Process each AFCON match
            for match in afcon_matches:
                print(f'\n⚽ Processing: {match["home_team"]} vs {match["away_team"]}')
                
                # Check if match already exists (more comprehensive check)
                existing_match = db.query(models.Match).filter(
                    models.Match.home_team == match['home_team'],
                    models.Match.away_team == match['away_team'],
                    models.Match.match_date == target_date,
                    models.Match.league_id == afcon_league.id
                ).first()
                
                # Also check by ESPN event ID if available
                if not existing_match and match.get('espn_event_id'):
                    existing_match = db.query(models.Match).filter(
                        models.Match.espn_event_id == match['espn_event_id']
                    ).first()
                
                if not existing_match:
                    # Try to create new match
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
                        db.add(new_match)
                        db.commit()
                        db.refresh(new_match)
                        existing_match = new_match
                        print('✅ Created new match record')
                    except IntegrityError as e:
                        print(f'⚠️ Match creation failed (likely duplicate): {str(e)[:100]}...')
                        db.rollback()
                        # Try to find the existing match again
                        existing_match = db.query(models.Match).filter(
                            models.Match.home_team == match['home_team'],
                            models.Match.away_team == match['away_team'],
                            models.Match.match_date == target_date
                        ).first()
                        if existing_match:
                            print(f'✅ Found existing match after rollback')
                        else:
                            print('❌ Could not find or create match')
                            continue
                else:
                    print('✅ Match already exists in database')
                
                # Search for highlights if match exists and is finished
                if existing_match and existing_match.status == 'finished':
                    existing_highlights_count = len(existing_match.highlights or [])
                    
                    if existing_highlights_count == 0:
                        print('🔎 Searching for highlights...')
                        
                        try:
                            highlights = youtube_service.search_highlights(
                                home_team=match['home_team'],
                                away_team=match['away_team'],
                                league='AFCON',
                                match_date=target_date,
                                max_results=3
                            )
                            
                            for highlight_data in highlights:
                                # Check if highlight already exists
                                existing_highlight = db.query(models.Highlight).filter(
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
                                        db.add(new_highlight)
                                        db.commit()
                                        total_highlights_found += 1
                                        print(f'✅ Added highlight: {highlight_data["title"][:50]}...')
                                    except IntegrityError as e:
                                        print(f'⚠️ Highlight already exists: {highlight_data["title"][:30]}...')
                                        db.rollback()
                                else:
                                    print(f'⚠️ Highlight already exists: {highlight_data["title"][:30]}...')
                            
                        except Exception as e:
                            print(f'❌ Error searching highlights: {e}')
                            continue
                    else:
                        print(f'✅ Match already has {existing_highlights_count} highlights')
                
        print(f'\n🎉 AFCON Safe Fetch Complete!')
        print(f'📊 Total AFCON matches processed: {total_matches_found}')
        print(f'🎥 Total new highlights added: {total_highlights_found}')
        
        # Show summary of what's in the database now
        all_afcon_matches = db.query(models.Match).filter(
            models.Match.league_id == afcon_league.id
        ).all()
        
        print(f'\n📋 AFCON Database Summary:')
        print(f'   Total AFCON matches in database: {len(all_afcon_matches)}')
        
        total_highlights = 0
        for match in all_afcon_matches:
            total_highlights += len(match.highlights or [])
        
        print(f'   Total highlights in database: {total_highlights}')
        
        # Show recent matches
        print(f'\n📅 Recent AFCON matches:')
        recent_matches = db.query(models.Match).filter(
            models.Match.league_id == afcon_league.id
        ).order_by(models.Match.match_date.desc()).limit(10).all()
        
        for match in recent_matches:
            highlights_count = len(match.highlights or [])
            print(f'   {match.match_date}: {match.home_team} vs {match.away_team} ({highlights_count} highlights)')
        
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(safe_fetch_afcon_matches())