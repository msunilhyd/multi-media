import asyncio
import sys
sys.path.append('/Users/s0m13i5/linus/multi-media/backend')

from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.football_api import ESPNFootballAPI
from app.youtube_service import YouTubeService
from app import models

async def fetch_afcon_highlights_for_days(days_back=3):
    """Fetch AFCON matches and highlights for the previous days"""
    
    db = SessionLocal()
    football_api = ESPNFootballAPI()
    youtube_service = YouTubeService()
    
    try:
        total_matches_found = 0
        total_highlights_found = 0
        
        for i in range(1, days_back + 1):
            target_date = date.today() - timedelta(days=i)
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
            
            # Get or create AFCON league
            afcon_league = db.query(models.League).filter(
                models.League.slug == 'afcon'
            ).first()
            
            if not afcon_league:
                # Check if there's already an AFCON-like league with a different name
                existing_afcon = db.query(models.League).filter(
                    models.League.name.ilike('%AFCON%')
                ).first()
                
                if existing_afcon:
                    afcon_league = existing_afcon
                    print(f'✅ Using existing AFCON league: {existing_afcon.name}')
                else:
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
            
            # Process each AFCON match
            for match in afcon_matches:
                print(f'⚽ Processing: {match["home_team"]} vs {match["away_team"]}')
                
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
                
                # Search for highlights if match is finished and doesn't have highlights yet
                if existing_match.status == 'finished' and not existing_match.highlights:
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
                                print(f'✅ Added highlight: {highlight_data["title"]}')
                        
                        db.commit()
                        
                    except Exception as e:
                        print(f'❌ Error searching highlights: {e}')
                        continue
        
        print(f'\n🎉 AFCON Highlights Fetch Complete!')
        print(f'📊 Total AFCON matches found: {total_matches_found}')
        print(f'🎥 Total highlights added: {total_highlights_found}')
        
    except Exception as e:
        print(f'❌ Error: {e}')
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Run the async function
    asyncio.run(fetch_afcon_highlights_for_days(3))