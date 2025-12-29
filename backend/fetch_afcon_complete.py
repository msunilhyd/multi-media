import asyncio
import sys
sys.path.append('/Users/s0m13i5/linus/multi-media/backend')

from datetime import date
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.football_api import ESPNFootballAPI
from app.youtube_service import YouTubeService
from app import models

async def fetch_afcon_available_matches():
    """Fetch AFCON matches for available dates (Dec 24, 26, 2025)"""
    
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
        
        # Get or create AFCON league first
        afcon_league = db.query(models.League).filter(
            models.League.slug == 'afcon'
        ).first()
        
        if not afcon_league:
            # Check if there's already an AFCON-like league with a different name or slug
            existing_afcon = db.query(models.League).filter(
                models.League.name.ilike('%AFCON%')
            ).first()
            
            if existing_afcon:
                afcon_league = existing_afcon
                print(f'✅ Using existing AFCON league: {existing_afcon.name} (ID: {existing_afcon.id})')
            else:
                try:
                    afcon_league = models.League(
                        name='AFCON',
                        slug='afcon', 
                        country='Africa',
                        display_order=5
                    )
                    db.add(afcon_league)
                    db.commit()
                    db.refresh(afcon_league)
                    print('✅ Created AFCON league')
                except Exception as e:
                    print(f'❌ Error creating league: {e}')
                    # Try to find it again, maybe it was created by another process
                    db.rollback()
                    afcon_league = db.query(models.League).filter(
                        models.League.slug == 'afcon'
                    ).first()
                    if not afcon_league:
                        # Find any league with AFCON in the name
                        afcon_league = db.query(models.League).filter(
                            models.League.name.ilike('%AFCON%')
                        ).first()
                    
                    if afcon_league:
                        print(f'✅ Found existing AFCON league after error: {afcon_league.name}')
                    else:
                        print('❌ Could not create or find AFCON league')
                        return
        else:
            print(f'✅ Using existing AFCON league: {afcon_league.name} (ID: {afcon_league.id})')
        
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
                
                # Check if match already exists
                existing_match = db.query(models.Match).filter(
                    models.Match.home_team == match['home_team'],
                    models.Match.away_team == match['away_team'],
                    models.Match.match_date == target_date
                ).first()
                
                if not existing_match:
                    # Create new match
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
                else:
                    print('✅ Match already exists in database')
                
                # Search for highlights if match is finished and doesn't have highlights yet
                highlights_needed = existing_match.status == 'finished' and not existing_match.highlights
                
                if highlights_needed:
                    print('🔎 Searching for highlights...')
                    
                    try:
                        highlights = youtube_service.search_highlights(
                            home_team=match['home_team'],
                            away_team=match['away_team'],
                            league='AFCON',
                            match_date=target_date,
                            max_results=5
                        )
                        
                        for highlight_data in highlights:
                            # Check if highlight already exists
                            existing_highlight = db.query(models.Highlight).filter(
                                models.Highlight.youtube_video_id == highlight_data['video_id']
                            ).first()
                            
                            if not existing_highlight:
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
                                total_highlights_found += 1
                                print(f'✅ Added highlight: {highlight_data["title"][:50]}...')
                            else:
                                print(f'⚠️ Highlight already exists: {highlight_data["title"][:30]}...')
                        
                        db.commit()
                        
                    except Exception as e:
                        print(f'❌ Error searching highlights: {e}')
                        continue
                elif existing_match.highlights:
                    print(f'✅ Match already has {len(existing_match.highlights)} highlights')
                else:
                    print(f'⚠️ Match status: {existing_match.status} - no highlights search needed')
        
        print(f'\n🎉 AFCON Highlights Fetch Complete!')
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
            total_highlights += len(match.highlights)
        
        print(f'   Total highlights in database: {total_highlights}')
        
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(fetch_afcon_available_matches())