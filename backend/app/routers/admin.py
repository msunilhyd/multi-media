from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any
from datetime import date, timedelta
from ..database import get_db
from .. import models
from ..scheduler import fetch_highlights_for_yesterday, fetch_highlights_for_today, refresh_today_scores, reconcile_todays_matches, fetch_highlights_for_matches_missing_them

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.post("/fix-data-integrity")
def fix_data_integrity(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Fix data integrity issues - remove highlights from scheduled/live matches"""
    
    result = {
        "scheduled_matches_cleaned": 0,
        "highlights_removed": 0,
        "highlights_moved": 0,
        "details": []
    }
    
    # Find scheduled/live matches that incorrectly have highlights
    scheduled_matches = db.query(models.Match).filter(
        models.Match.status.in_(["scheduled", "live"])
    ).all()
    
    for match in scheduled_matches:
        if match.highlights:
            match_detail = {
                "match_id": match.id,
                "teams": f"{match.home_team} vs {match.away_team}",
                "date": str(match.match_date),
                "status": match.status,
                "highlights_before": len(match.highlights),
                "action": "removed_highlights"
            }
            
            # Remove highlights from scheduled matches
            for highlight in match.highlights:
                db.delete(highlight)
                result["highlights_removed"] += 1
            
            result["scheduled_matches_cleaned"] += 1
            result["details"].append(match_detail)
    
    # Commit changes
    db.commit()
    
    return result


@router.post("/fetch-highlights")
async def manual_fetch_highlights(days_back: int = 1, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Manually trigger highlights fetching for recent matches"""
    
    result = {
        "message": "Highlights fetch completed",
        "matches_processed": 0,
        "highlights_found": 0,
        "errors": []
    }
    
    try:
        # Fetch highlights for yesterday (or specified days back)
        await fetch_highlights_for_yesterday(send_notification=False)
        
        # Count highlights in database
        highlights_count = db.query(models.Highlight).count()
        result["highlights_found"] = highlights_count
        
        return result
    except Exception as e:
        result["errors"].append(str(e))
        return result


@router.post("/add-sample-highlights")
def add_sample_highlights(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Add some sample highlights data for testing purposes"""
    
    result = {
        "message": "Sample highlights added",
        "highlights_created": 0,
        "details": []
    }
    
    # Get some recent matches without highlights
    matches_without_highlights = db.query(models.Match).filter(
        ~models.Match.highlights.any()
    ).limit(5).all()
    
    sample_highlights_data = [
        {
            "title": "Best Goals & Highlights",
            "youtube_video_id": "dQw4w9WgXcQ",  # Sample ID
            "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
            "channel_title": "Official Football Highlights",
            "duration": "PT5M30S",
            "view_count": 125000,
            "description": "Match highlights featuring the best goals and moments"
        },
        {
            "title": "Extended Highlights",
            "youtube_video_id": "oHg5SJYRHA0",  # Sample ID
            "thumbnail_url": "https://i.ytimg.com/vi/oHg5SJYRHA0/maxresdefault.jpg", 
            "channel_title": "Sports Channel",
            "duration": "PT8M45S",
            "view_count": 87500,
            "description": "Extended match highlights with key moments"
        }
    ]
    
    for i, match in enumerate(matches_without_highlights):
        if i < len(sample_highlights_data):
            highlight_data = sample_highlights_data[i]
            
            highlight = models.Highlight(
                match_id=match.id,
                youtube_video_id=highlight_data["youtube_video_id"],
                title=f"{match.home_team} vs {match.away_team} - {highlight_data['title']}",
                description=highlight_data["description"],
                thumbnail_url=highlight_data["thumbnail_url"],
                channel_title=highlight_data["channel_title"],
                view_count=highlight_data["view_count"],
                duration=highlight_data["duration"],
                is_official=True
            )
            
            db.add(highlight)
            result["highlights_created"] += 1
            result["details"].append({
                "match": f"{match.home_team} vs {match.away_team}",
                "date": str(match.match_date),
                "highlight_title": highlight.title
            })
    
    db.commit()
    return result


@router.post("/refresh-scores")
async def manual_refresh_scores() -> Dict[str, Any]:
    """Manually trigger the score/status refresh for today's matches"""
    try:
        await refresh_today_scores()
        return {
            "success": True,
            "message": "Score refresh completed. Check server logs for details."
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error refreshing scores: {str(e)}"
        }


@router.post("/fetch-yesterday-highlights")
async def manual_fetch_yesterday_highlights(send_notification: bool = False) -> Dict[str, Any]:
    """Manually trigger highlights fetch for yesterday's finished matches"""
    try:
        await fetch_highlights_for_yesterday(send_notification=send_notification)
        return {
            "success": True,
            "message": "Highlights fetch completed. Check server logs for details."
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error fetching highlights: {str(e)}"
        }


@router.post("/fetch-today-highlights")
async def manual_fetch_today_highlights() -> Dict[str, Any]:
    """Manually trigger highlights fetch for today's finished matches"""
    try:
        await fetch_highlights_for_today()
        return {
            "success": True,
            "message": "Today's highlights fetch completed. Check server logs for details."
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error fetching today's highlights: {str(e)}"
        }


@router.post("/add-highlight-by-video-id")
def add_highlight_by_video_id(
    home_team: str,
    away_team: str,
    video_id: str,
    match_date: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Manually add a highlight by YouTube video ID to a specific match"""
    try:
        from datetime import datetime
        match_date_obj = datetime.strptime(match_date, "%Y-%m-%d").date()
        
        # Find the match
        match = db.query(models.Match).filter(
            models.Match.match_date == match_date_obj
        ).filter(
            (models.Match.home_team.ilike(f"%{home_team}%")) |
            (models.Match.away_team.ilike(f"%{home_team}%"))
        ).filter(
            (models.Match.home_team.ilike(f"%{away_team}%")) |
            (models.Match.away_team.ilike(f"%{away_team}%"))
        ).first()
        
        if not match:
            # Create the match if it doesn't exist
            champions_league = db.query(models.League).filter(
                models.League.slug == "champions-league"
            ).first()
            
            if not champions_league:
                return {
                    "success": False,
                    "message": "Champions League not found in database"
                }
            
            match = models.Match(
                league_id=champions_league.id,
                home_team=home_team,
                away_team=away_team,
                home_score=0,
                away_score=0,
                match_date=match_date_obj,
                match_time="20:00",
                status="finished"
            )
            db.add(match)
            db.commit()
            db.refresh(match)
        
        # Check if match already has this highlight
        existing = db.query(models.Highlight).filter(
            models.Highlight.match_id == match.id,
            models.Highlight.youtube_video_id == video_id
        ).first()
        
        if existing:
            return {
                "success": False,
                "message": "Highlight already exists for this match"
            }
        
        # Add the highlight
        highlight = models.Highlight(
            match_id=match.id,
            youtube_video_id=video_id,
            title=f"{match.home_team} vs {match.away_team} Highlights",
            description="",
            thumbnail_url=f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            channel_title="YouTube",
            view_count=0,
            duration=""
        )
        db.add(highlight)
        db.commit()
        
        return {
            "success": True,
            "message": f"Highlight added successfully to {match.home_team} vs {match.away_team}",
            "match_id": match.id,
            "highlight_id": highlight.id,
            "video_url": f"https://www.youtube.com/watch?v={video_id}"
        }
        
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "message": f"Error adding highlight: {str(e)}"
        }


@router.post("/reconcile-today")
async def trigger_reconciliation(background_tasks: BackgroundTasks):
    """
    Manually trigger the match reconciliation job.
    
    This will:
    1. Re-fetch all of today's matches from ESPN
    2. Add any missing matches to the database
    3. Update match statuses and scores
    4. Check for and fetch missing highlights
    
    Useful for debugging or recovering from scheduler failures.
    """
    background_tasks.add_task(reconcile_todays_matches)
    
    return {
        "success": True,
        "message": "Reconciliation job started in background. Check server logs for details.",
        "note": "This job re-fetches all today's matches from ESPN and ensures DB is up-to-date"
    }

@router.post("/update-league-order")
def update_league_display_order(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Update league display order to prioritize Champions League.
    Sets Champions League to display_order=1, Premier League to 2, etc.
    """
    
    result = {
        "updated_count": 0,
        "leagues": []
    }
    
    # Define the desired order
    desired_order = {
        'champions-league': 1,
        'premier-league': 2,
        'la-liga': 3,
        'serie-a': 4,
        'bundesliga': 5,
        'ligue-1': 6,
        'europa-league': 7,
        'championship': 8,
        'fa-cup': 9,
        'efl-cup': 10,
        'supercoca-de-espana': 11,
        'süper-lig': 12,
        'super-lig': 12,
        'caf-champions-league': 13,
        'afcon': 14,
        'copa-del-rey': 15,
        'coppa-italia': 16,
        'dfb-pokal': 17,
        'coupe-de-france': 18,
    }
    
    # Get all leagues
    leagues = db.query(models.League).all()
    
    # Update display orders
    for league in leagues:
        if league.slug in desired_order:
            old_order = league.display_order
            new_order = desired_order[league.slug]
            
            if old_order != new_order:
                league.display_order = new_order
                result["updated_count"] += 1
                result["leagues"].append({
                    "name": league.name,
                    "slug": league.slug,
                    "old_order": old_order,
                    "new_order": new_order
                })
    
    # Commit changes
    db.commit()
    
    # Get final order
    final_leagues = db.query(models.League).order_by(models.League.display_order).all()
    result["final_order"] = [
        {"position": league.display_order, "name": league.name, "slug": league.slug}
        for league in final_leagues
    ]
    
    return result

@router.post("/fetch-missing-highlights")
async def trigger_fetch_missing_highlights(background_tasks: BackgroundTasks):
    """
    Manually trigger highlight fetching for all finished matches without highlights.
    
    This will:
    1. Find all finished matches from the past 7 days without highlights
    2. Search YouTube for highlights for each match
    3. Add found highlights to the database
    
    Useful after reconciliation adds missing matches or when highlights are delayed.
    """
    background_tasks.add_task(fetch_highlights_for_matches_missing_them)
    
    return {
        "success": True,
        "message": "Highlight fetch job started in background. Check server logs for details.",
        "note": "This job searches for highlights for all finished matches without highlights"
    }


@router.get("/debug-youtube-keys")
def debug_youtube_keys():
    """Debug endpoint to check if YouTube API keys are loaded"""
    from ..youtube_service import get_youtube_service
    from ..config import get_settings
    
    settings = get_settings()
    keys = settings.get_youtube_keys_list()
    
    return {
        "youtube_api_keys_configured": len(keys) > 0,
        "number_of_keys": len(keys),
        "keys_preview": [f"{k[:10]}...{k[-5:]}" for k in keys] if keys else [],
        "raw_env_value": settings.youtube_api_keys[:50] + "..." if settings.youtube_api_keys else "NOT SET"
    }


@router.post("/prefetch-matches")
async def trigger_prefetch_matches(background_tasks: BackgroundTasks):
    """
    Manually trigger the prefetch_upcoming_matches job.
    This fetches matches from all sports APIs (Football, IPL, NBA, Tennis, NHL, NFL, MLB, FIFA).
    Runs in background.
    """
    from ..scheduler import prefetch_upcoming_matches
    
    background_tasks.add_task(prefetch_upcoming_matches)
    
    return {
        "success": True,
        "message": "Prefetch job started in background",
        "note": "This will fetch matches from all sports APIs (Football, IPL, NBA, Tennis, NHL, NFL, MLB, FIFA)"
    }


@router.post("/add-fifa-highlight")
def add_fifa_highlight(
    home_team: str,
    away_team: str,
    video_id: str,
    title: str = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Manually add a FIFA World Cup highlight by video ID.
    
    Args:
        home_team: Home team name
        away_team: Away team name
        video_id: YouTube video ID
        title: Optional video title (will be fetched from YouTube if not provided)
    """
    try:
        # Find the match
        fifa_league = db.query(models.League).filter(
            models.League.slug == "fifa-world-cup"
        ).first()
        
        if not fifa_league:
            return {"success": False, "error": "FIFA World Cup league not found"}
        
        match = db.query(models.Match).filter(
            models.Match.league_id == fifa_league.id,
            models.Match.home_team == home_team,
            models.Match.away_team == away_team
        ).first()
        
        if not match:
            return {"success": False, "error": f"Match not found: {home_team} vs {away_team}"}
        
        # Check if highlight already exists
        existing = db.query(models.Highlight).filter(
            models.Highlight.match_id == match.id,
            models.Highlight.youtube_video_id == video_id
        ).first()
        
        if existing:
            return {"success": False, "error": "Highlight already exists for this match"}
        
        # Create the highlight
        highlight = models.Highlight(
            match_id=match.id,
            youtube_video_id=video_id,
            title=title or f"{home_team} vs {away_team} - Extended Highlights",
            description=f"FIFA World Cup 2026: {home_team} vs {away_team}",
            thumbnail_url=f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            channel_title="FOX Sports"
        )
        
        db.add(highlight)
        db.commit()
        
        return {
            "success": True,
            "message": f"Highlight added for {home_team} vs {away_team}",
            "video_id": video_id
        }
        
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}


@router.post("/fetch-fifa-highlights")
async def fetch_fifa_highlights(background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """
    Manually trigger FIFA World Cup highlight fetching.
    Searches for "Extended Highlights" from FOX Sports and other official sources.
    """
    async def fetch_fifa_highlights_task():
        try:
            from ..youtube_service import get_youtube_service, YouTubeQuotaExhaustedError
            from datetime import datetime, timedelta
            
            youtube_service = get_youtube_service()
            db = next(get_db())
            
            # Get all FIFA World Cup matches without highlights
            fifa_league = db.query(models.League).filter(
                models.League.slug == "fifa-world-cup"
            ).first()
            
            if not fifa_league:
                print("[FIFA] FIFA World Cup league not found")
                return
            
            # Get matches from last 30 days that are finished
            thirty_days_ago = datetime.utcnow().date() - timedelta(days=30)
            matches = db.query(models.Match).filter(
                models.Match.league_id == fifa_league.id,
                models.Match.match_date >= thirty_days_ago,
                models.Match.status == "finished"
            ).all()
            
            print(f"[FIFA] Found {len(matches)} finished FIFA matches to fetch highlights for")
            
            highlights_found = 0
            for match in matches:
                # Check if match already has highlights
                existing_highlights = db.query(models.Highlight).filter(
                    models.Highlight.match_id == match.id
                ).count()
                
                if existing_highlights > 0:
                    continue
                
                try:
                    # Search for highlights with "Extended Highlights" keyword
                    query = f"{match.home_team} vs {match.away_team} Extended Highlights"
                    print(f"[FIFA] Searching: {query}")
                    
                    highlights = youtube_service.search_highlights(
                        match.home_team,
                        match.away_team,
                        league="FIFA World Cup",
                        match_date=match.match_date,
                        max_results=3
                    )
                    
                    if highlights:
                        for highlight in highlights:
                            # Check if highlight already exists
                            existing = db.query(models.Highlight).filter(
                                models.Highlight.match_id == match.id,
                                models.Highlight.youtube_video_id == highlight['video_id']
                            ).first()
                            
                            if not existing:
                                new_highlight = models.Highlight(
                                    match_id=match.id,
                                    youtube_video_id=highlight['video_id'],
                                    title=highlight['title'],
                                    description=highlight['description'],
                                    thumbnail_url=highlight.get('thumbnail_url', ''),
                                    channel_title=highlight.get('channel_title', ''),
                                    published_at=highlight.get('published_at'),
                                    view_count=highlight.get('view_count'),
                                    duration=highlight.get('duration')
                                )
                                db.add(new_highlight)
                                highlights_found += 1
                                print(f"[FIFA] ✓ Added highlight: {highlight['title'][:60]}...")
                        
                        db.commit()
                    else:
                        print(f"[FIFA] ✗ No Extended Highlights found for {match.home_team} vs {match.away_team}")
                        
                except YouTubeQuotaExhaustedError:
                    print(f"[FIFA] YouTube quota exhausted - stopping")
                    break
                except Exception as e:
                    print(f"[FIFA] Error fetching highlights for {match.home_team} vs {match.away_team}: {e}")
                    continue
            
            print(f"[FIFA] Highlight fetch complete! Found {highlights_found} new highlights")
            
        except Exception as e:
            print(f"[FIFA] Error during FIFA highlight fetch: {e}")
    
    background_tasks.add_task(fetch_fifa_highlights_task)
    
    return {
        "success": True,
        "message": "FIFA highlight fetch job started in background",
        "note": "Searching for 'Extended Highlights' from FOX Sports and other official sources"
    }


@router.post("/add-fifa-world-cup-matches")
async def add_fifa_world_cup_matches(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Add all 104 FIFA World Cup 2026 matches to the database"""
    
    result = {
        "message": "FIFA World Cup 2026 matches added",
        "matches_created": 0,
        "details": []
    }
    
    # Get or create FIFA World Cup league
    fifa_league = db.query(models.League).filter(
        models.League.slug == "fifa-world-cup"
    ).first()
    
    if not fifa_league:
        fifa_league = models.League(
            name="FIFA World Cup",
            slug="fifa-world-cup",
            country="International",
            display_order=6
        )
        db.add(fifa_league)
        db.commit()
        db.refresh(fifa_league)
    
    # All 104 FIFA World Cup 2026 matches
    fifa_matches = [
        # GROUP STAGE - Matchday 1
        {"home": "Mexico", "away": "South Africa", "date": date(2026, 6, 11), "status": "finished"},
        {"home": "South Korea", "away": "Czechia", "date": date(2026, 6, 11), "status": "finished"},
        {"home": "Canada", "away": "Bosnia and Herzegovina", "date": date(2026, 6, 12), "status": "finished"},
        {"home": "USA", "away": "Paraguay", "date": date(2026, 6, 12), "status": "finished"},
        # GROUP STAGE - Matchday 2
        {"home": "Qatar", "away": "Switzerland", "date": date(2026, 6, 13), "status": "scheduled"},
        {"home": "Brazil", "away": "Morocco", "date": date(2026, 6, 13), "status": "scheduled"},
        {"home": "Haiti", "away": "Scotland", "date": date(2026, 6, 13), "status": "scheduled"},
        {"home": "Australia", "away": "Türkiye", "date": date(2026, 6, 13), "status": "scheduled"},
        {"home": "Czechia", "away": "South Africa", "date": date(2026, 6, 14), "status": "scheduled"},
        {"home": "Switzerland", "away": "Bosnia and Herzegovina", "date": date(2026, 6, 14), "status": "scheduled"},
        {"home": "Canada", "away": "Qatar", "date": date(2026, 6, 14), "status": "scheduled"},
        {"home": "Mexico", "away": "South Korea", "date": date(2026, 6, 14), "status": "scheduled"},
        {"home": "USA", "away": "Australia", "date": date(2026, 6, 15), "status": "scheduled"},
        {"home": "Scotland", "away": "Morocco", "date": date(2026, 6, 15), "status": "scheduled"},
        {"home": "Brazil", "away": "Haiti", "date": date(2026, 6, 15), "status": "scheduled"},
        {"home": "Türkiye", "away": "Paraguay", "date": date(2026, 6, 15), "status": "scheduled"},
        # GROUP STAGE - Matchday 3
        {"home": "Germany", "away": "Curaçao", "date": date(2026, 6, 16), "status": "scheduled"},
        {"home": "Netherlands", "away": "Japan", "date": date(2026, 6, 16), "status": "scheduled"},
        {"home": "Ivory Coast", "away": "Ecuador", "date": date(2026, 6, 16), "status": "scheduled"},
        {"home": "Sweden", "away": "Tunisia", "date": date(2026, 6, 16), "status": "scheduled"},
        {"home": "Spain", "away": "Cabo Verde", "date": date(2026, 6, 17), "status": "scheduled"},
        {"home": "Belgium", "away": "Egypt", "date": date(2026, 6, 17), "status": "scheduled"},
        {"home": "Saudi Arabia", "away": "Uruguay", "date": date(2026, 6, 17), "status": "scheduled"},
        {"home": "Iran", "away": "New Zealand", "date": date(2026, 6, 17), "status": "scheduled"},
        {"home": "France", "away": "Senegal", "date": date(2026, 6, 18), "status": "scheduled"},
        {"home": "Iraq", "away": "Norway", "date": date(2026, 6, 18), "status": "scheduled"},
        {"home": "Argentina", "away": "Algeria", "date": date(2026, 6, 18), "status": "scheduled"},
        {"home": "Austria", "away": "Jordan", "date": date(2026, 6, 18), "status": "scheduled"},
        # GROUP STAGE - Matchday 4
        {"home": "Ghana", "away": "Panama", "date": date(2026, 6, 19), "status": "scheduled"},
        {"home": "England", "away": "Croatia", "date": date(2026, 6, 19), "status": "scheduled"},
        {"home": "Portugal", "away": "Congo DR", "date": date(2026, 6, 19), "status": "scheduled"},
        {"home": "Uzbekistan", "away": "Colombia", "date": date(2026, 6, 19), "status": "scheduled"},
        {"home": "Czechia", "away": "Mexico", "date": date(2026, 6, 20), "status": "scheduled"},
        {"home": "South Africa", "away": "South Korea", "date": date(2026, 6, 20), "status": "scheduled"},
        {"home": "Switzerland", "away": "Canada", "date": date(2026, 6, 20), "status": "scheduled"},
        {"home": "Bosnia and Herzegovina", "away": "Qatar", "date": date(2026, 6, 20), "status": "scheduled"},
        {"home": "Scotland", "away": "Brazil", "date": date(2026, 6, 21), "status": "scheduled"},
        {"home": "Morocco", "away": "Haiti", "date": date(2026, 6, 21), "status": "scheduled"},
        {"home": "Türkiye", "away": "Paraguay", "date": date(2026, 6, 21), "status": "scheduled"},
        {"home": "USA", "away": "Australia", "date": date(2026, 6, 21), "status": "scheduled"},
        {"home": "Germany", "away": "Ivory Coast", "date": date(2026, 6, 22), "status": "scheduled"},
        {"home": "Ecuador", "away": "Curaçao", "date": date(2026, 6, 22), "status": "scheduled"},
        {"home": "Netherlands", "away": "Sweden", "date": date(2026, 6, 22), "status": "scheduled"},
        {"home": "Tunisia", "away": "Japan", "date": date(2026, 6, 22), "status": "scheduled"},
        {"home": "Uruguay", "away": "Cabo Verde", "date": date(2026, 6, 23), "status": "scheduled"},
        {"home": "Spain", "away": "Saudi Arabia", "date": date(2026, 6, 23), "status": "scheduled"},
        {"home": "Belgium", "away": "Iran", "date": date(2026, 6, 23), "status": "scheduled"},
        {"home": "New Zealand", "away": "Egypt", "date": date(2026, 6, 23), "status": "scheduled"},
        {"home": "Norway", "away": "Senegal", "date": date(2026, 6, 24), "status": "scheduled"},
        {"home": "France", "away": "Iraq", "date": date(2026, 6, 24), "status": "scheduled"},
        {"home": "Argentina", "away": "Austria", "date": date(2026, 6, 24), "status": "scheduled"},
        {"home": "Jordan", "away": "Algeria", "date": date(2026, 6, 24), "status": "scheduled"},
        {"home": "England", "away": "Ghana", "date": date(2026, 6, 25), "status": "scheduled"},
        {"home": "Panama", "away": "Croatia", "date": date(2026, 6, 25), "status": "scheduled"},
        {"home": "Portugal", "away": "Uzbekistan", "date": date(2026, 6, 25), "status": "scheduled"},
        {"home": "Colombia", "away": "Congo DR", "date": date(2026, 6, 25), "status": "scheduled"},
        # ROUND OF 32
        {"home": "Group A Winner", "away": "Group B Runner-up", "date": date(2026, 6, 28), "status": "scheduled"},
        {"home": "Group E Winner", "away": "Group F Runner-up", "date": date(2026, 6, 29), "status": "scheduled"},
        {"home": "Group F Winner", "away": "Group E Runner-up", "date": date(2026, 6, 29), "status": "scheduled"},
        {"home": "Group C Winner", "away": "Group D Runner-up", "date": date(2026, 6, 29), "status": "scheduled"},
        {"home": "Group I Winner", "away": "Group J Runner-up", "date": date(2026, 6, 30), "status": "scheduled"},
        {"home": "Group D Winner", "away": "Group C Runner-up", "date": date(2026, 6, 30), "status": "scheduled"},
        {"home": "Group G Winner", "away": "Group H Runner-up", "date": date(2026, 6, 30), "status": "scheduled"},
        {"home": "Group B Winner", "away": "Group A Runner-up", "date": date(2026, 7, 1), "status": "scheduled"},
        {"home": "Group K Winner", "away": "Group L Runner-up", "date": date(2026, 7, 1), "status": "scheduled"},
        {"home": "Group H Winner", "away": "Group G Runner-up", "date": date(2026, 7, 1), "status": "scheduled"},
        {"home": "Group L Winner", "away": "Group K Runner-up", "date": date(2026, 7, 2), "status": "scheduled"},
        {"home": "Group J Winner", "away": "Group I Runner-up", "date": date(2026, 7, 2), "status": "scheduled"},
        # ROUND OF 16
        {"home": "Match 74 Winner", "away": "Match 77 Winner", "date": date(2026, 7, 4), "status": "scheduled"},
        {"home": "Match 73 Winner", "away": "Match 75 Winner", "date": date(2026, 7, 4), "status": "scheduled"},
        {"home": "Match 76 Winner", "away": "Match 78 Winner", "date": date(2026, 7, 5), "status": "scheduled"},
        {"home": "Match 79 Winner", "away": "Match 80 Winner", "date": date(2026, 7, 5), "status": "scheduled"},
        {"home": "Match 83 Winner", "away": "Match 84 Winner", "date": date(2026, 7, 6), "status": "scheduled"},
        {"home": "Match 81 Winner", "away": "Match 82 Winner", "date": date(2026, 7, 6), "status": "scheduled"},
        {"home": "Match 86 Winner", "away": "Match 88 Winner", "date": date(2026, 7, 7), "status": "scheduled"},
        {"home": "Match 85 Winner", "away": "Match 87 Winner", "date": date(2026, 7, 7), "status": "scheduled"},
        # QUARTER-FINALS
        {"home": "Match 89 Winner", "away": "Match 90 Winner", "date": date(2026, 7, 9), "status": "scheduled"},
        {"home": "Match 93 Winner", "away": "Match 94 Winner", "date": date(2026, 7, 10), "status": "scheduled"},
        {"home": "Match 91 Winner", "away": "Match 92 Winner", "date": date(2026, 7, 11), "status": "scheduled"},
        {"home": "Match 95 Winner", "away": "Match 96 Winner", "date": date(2026, 7, 11), "status": "scheduled"},
        # SEMI-FINALS
        {"home": "Match 97 Winner", "away": "Match 98 Winner", "date": date(2026, 7, 14), "status": "scheduled"},
        {"home": "Match 99 Winner", "away": "Match 100 Winner", "date": date(2026, 7, 15), "status": "scheduled"},
        # BRONZE FINAL
        {"home": "Match 101 Runner-up", "away": "Match 102 Runner-up", "date": date(2026, 7, 18), "status": "scheduled"},
        # FINAL
        {"home": "Match 101 Winner", "away": "Match 102 Winner", "date": date(2026, 7, 19), "status": "scheduled"},
    ]
    
    # Insert all matches
    for match_data in fifa_matches:
        # Check if match already exists
        existing = db.query(models.Match).filter(
            models.Match.league_id == fifa_league.id,
            models.Match.home_team == match_data["home"],
            models.Match.away_team == match_data["away"],
            models.Match.match_date == match_data["date"]
        ).first()
        
        if not existing:
            new_match = models.Match(
                league_id=fifa_league.id,
                home_team=match_data["home"],
                away_team=match_data["away"],
                match_date=match_data["date"],
                match_time="20:00",
                status=match_data["status"]
            )
            db.add(new_match)
            result["matches_created"] += 1
            result["details"].append({
                "match": f"{match_data['home']} vs {match_data['away']}",
                "date": str(match_data["date"]),
                "status": match_data["status"]
            })
    
    db.commit()
    return result


@router.post("/add-sample-matches")
async def add_sample_matches(db: Session = Depends(get_db), fetch_highlights: bool = True) -> Dict[str, Any]:
    """
    Add sample matches for all sports (NBA, Tennis, NHL, NFL, MLB, FIFA, PGA, UFC) for testing.
    
    Args:
        fetch_highlights: If True, immediately fetch highlights for the created matches
    """
    
    result = {
        "message": "Sample matches added for all sports",
        "matches_created": 0,
        "highlights_found": 0,
        "details": []
    }
    
    # Sample matches data for all sports
    sample_data = [
        # NBA
        {
            "league_name": "NBA",
            "league_slug": "nba",
            "matches": [
                {"home": "Los Angeles Lakers", "away": "Boston Celtics", "date": date.today() - timedelta(days=1), "status": "finished", "home_score": 110, "away_score": 105},
                {"home": "Golden State Warriors", "away": "Denver Nuggets", "date": date.today() - timedelta(days=2), "status": "finished", "home_score": 115, "away_score": 120},
            ]
        },
        # Tennis
        {
            "league_name": "Tennis",
            "league_slug": "tennis",
            "matches": [
                {"home": "Novak Djokovic", "away": "Carlos Alcaraz", "date": date.today() - timedelta(days=1), "status": "finished", "home_score": 2, "away_score": 1},
                {"home": "Rafael Nadal", "away": "Jannik Sinner", "date": date.today() - timedelta(days=2), "status": "finished", "home_score": 1, "away_score": 2},
                {"home": "Jannik Sinner", "away": "Daniil Medvedev", "date": date.today() - timedelta(days=3), "status": "finished", "home_score": 2, "away_score": 0},
                {"home": "Taylor Fritz", "away": "Tommy Paul", "date": date.today() - timedelta(days=1), "status": "finished", "home_score": 1, "away_score": 2},
            ]
        },
        # NHL
        {
            "league_name": "NHL",
            "league_slug": "nhl",
            "matches": [
                {"home": "Toronto Maple Leafs", "away": "Montreal Canadiens", "date": date.today() - timedelta(days=1), "status": "finished", "home_score": 4, "away_score": 3},
                {"home": "New York Rangers", "away": "Boston Bruins", "date": date.today() - timedelta(days=2), "status": "finished", "home_score": 3, "away_score": 2},
            ]
        },
        # NFL
        {
            "league_name": "NFL",
            "league_slug": "nfl",
            "matches": [
                {"home": "Kansas City Chiefs", "away": "Buffalo Bills", "date": date.today() - timedelta(days=1), "status": "finished", "home_score": 27, "away_score": 24},
                {"home": "Dallas Cowboys", "away": "Philadelphia Eagles", "date": date.today() - timedelta(days=2), "status": "finished", "home_score": 28, "away_score": 23},
            ]
        },
        # MLB
        {
            "league_name": "MLB",
            "league_slug": "mlb",
            "matches": [
                {"home": "New York Yankees", "away": "Boston Red Sox", "date": date.today() - timedelta(days=1), "status": "finished", "home_score": 5, "away_score": 3},
                {"home": "Los Angeles Dodgers", "away": "San Francisco Giants", "date": date.today() - timedelta(days=2), "status": "finished", "home_score": 4, "away_score": 2},
            ]
        },
        # FIFA
        {
            "league_name": "FIFA World Cup",
            "league_slug": "fifa-world-cup",
            "matches": [
                {"home": "Argentina", "away": "France", "date": date.today() - timedelta(days=1), "status": "finished", "home_score": 3, "away_score": 2},
                {"home": "England", "away": "Brazil", "date": date.today() - timedelta(days=2), "status": "finished", "home_score": 2, "away_score": 1},
            ]
        },
        # PGA
        {
            "league_name": "PGA",
            "league_slug": "pga",
            "matches": [
                {"home": "Rory McIlroy", "away": "Jon Rahm", "date": date.today() - timedelta(days=1), "status": "finished", "home_score": -12, "away_score": -10},
                {"home": "Scottie Scheffler", "away": "Collin Morikawa", "date": date.today() - timedelta(days=2), "status": "finished", "home_score": -15, "away_score": -11},
            ]
        },
        # UFC
        {
            "league_name": "UFC",
            "league_slug": "ufc",
            "matches": [
                {"home": "Conor McGregor", "away": "Dustin Poirier", "date": date.today() - timedelta(days=1), "status": "finished", "home_score": 2, "away_score": 1},
                {"home": "Israel Adesanya", "away": "Sean Strickland", "date": date.today() - timedelta(days=2), "status": "finished", "home_score": 1, "away_score": 2},
            ]
        },
    ]
    
    for sport_data in sample_data:
        league_name = sport_data["league_name"]
        league_slug = sport_data["league_slug"]
        
        # Get or create league
        db_league = db.query(models.League).filter(
            models.League.slug == league_slug
        ).first()
        
        if not db_league:
            db_league = models.League(
                name=league_name,
                slug=league_slug,
                country="International",
                display_order=0
            )
            db.add(db_league)
            db.commit()
            db.refresh(db_league)
        
        # Add matches
        for match_data in sport_data["matches"]:
            # Check if match already exists
            existing = db.query(models.Match).filter(
                models.Match.league_id == db_league.id,
                models.Match.home_team == match_data["home"],
                models.Match.away_team == match_data["away"],
                models.Match.match_date == match_data["date"]
            ).first()
            
            if not existing:
                new_match = models.Match(
                    league_id=db_league.id,
                    home_team=match_data["home"],
                    away_team=match_data["away"],
                    match_date=match_data["date"],
                    match_time="20:00",
                    status=match_data["status"],
                    home_score=match_data.get("home_score"),
                    away_score=match_data.get("away_score")
                )
                db.add(new_match)
                result["matches_created"] += 1
                result["details"].append({
                    "league": league_name,
                    "match": f"{match_data['home']} vs {match_data['away']}",
                    "date": str(match_data["date"]),
                    "status": match_data["status"]
                })
    
    db.commit()
    
    # Fetch highlights for the newly created matches if requested
    if fetch_highlights:
        print(f"[Admin] Fetching highlights for {result['matches_created']} newly created matches...")
        try:
            from ..youtube_service import get_youtube_service, YouTubeQuotaExhaustedError
            
            youtube_service = get_youtube_service()
            highlights_found = 0
            
            # Get all newly created matches without highlights
            matches_without_highlights = db.query(models.Match).filter(
                models.Match.status == 'finished',
                ~models.Match.highlights.any()
            ).all()
            
            for match in matches_without_highlights:
                league_name = match.league.name if match.league else None
                
                try:
                    print(f"[Admin] Searching highlights: {match.home_team} vs {match.away_team}")
                    
                    videos = youtube_service.search_highlights(
                        home_team=match.home_team,
                        away_team=match.away_team,
                        league=league_name,
                        match_date=match.match_date,
                        max_results=5
                    )
                    
                    if videos:
                        for video in videos:
                            highlight = models.Highlight(
                                match_id=match.id,
                                youtube_video_id=video['video_id'],
                                title=video['title'],
                                description=video.get('description', ''),
                                thumbnail_url=video.get('thumbnail_url', ''),
                                channel_title=video.get('channel_title', ''),
                                published_at=video.get('published_at'),
                                view_count=video.get('view_count', 0),
                                duration=video.get('duration', '')
                            )
                            db.add(highlight)
                        db.commit()
                        highlights_found += len(videos)
                        print(f"[Admin] ✓ Found {len(videos)} highlights for {match.home_team} vs {match.away_team}")
                    else:
                        print(f"[Admin] ✗ No highlights found for {match.home_team} vs {match.away_team}")
                        
                except YouTubeQuotaExhaustedError:
                    print(f"[Admin] YouTube quota exhausted - stopping highlight fetch")
                    break
                except Exception as e:
                    print(f"[Admin] Error fetching highlight for {match.home_team} vs {match.away_team}: {e}")
                    continue
            
            result["highlights_found"] = highlights_found
            print(f"[Admin] Highlight fetch complete! Found {highlights_found} highlights")
            
        except Exception as e:
            print(f"[Admin] Error during highlight fetch: {e}")
            result["highlight_fetch_error"] = str(e)
    
    return result


@router.post("/remove-duplicate-matches")
def remove_duplicate_matches(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Remove duplicate matches - keeps only the most recent match for each team pairing"""
    
    result = {
        "message": "Duplicate matches removed successfully",
        "duplicates_removed": 0,
        "details": []
    }
    
    try:
        from sqlalchemy import text
        
        # First, delete any orphaned highlights (with NULL match_id) using raw SQL
        db.execute(text("DELETE FROM highlights WHERE match_id IS NULL"))
        db.commit()
        
        # Get all matches grouped by league, home_team, away_team
        matches = db.query(models.Match).all()
        
        # Group by (league_id, home_team, away_team)
        match_groups = {}
        for match in matches:
            # Skip matches with empty team names
            if not match.home_team or not match.away_team:
                continue
            key = (match.league_id, match.home_team, match.away_team)
            if key not in match_groups:
                match_groups[key] = []
            match_groups[key].append(match)
        
        # For each group with duplicates, keep only the most recent one
        matches_to_delete = []
        for key, group in match_groups.items():
            if len(group) > 1:
                # Sort by match_date descending (most recent first)
                sorted_group = sorted(group, key=lambda m: m.match_date, reverse=True)
                keep_match = sorted_group[0]  # Most recent match to keep
                
                # For each duplicate match, move its highlights to the keep_match
                for match_to_delete in sorted_group[1:]:
                    # Move highlights from duplicate to the kept match
                    db.execute(text(f"UPDATE highlights SET match_id = {keep_match.id} WHERE match_id = {match_to_delete.id}"))
                    matches_to_delete.append(match_to_delete.id)
                    result["details"].append({
                        "league_id": match_to_delete.league_id,
                        "match": f"{match_to_delete.home_team} vs {match_to_delete.away_team}",
                        "date": str(match_to_delete.match_date),
                        "action": "deleted"
                    })
        
        # Delete the duplicate matches using raw SQL
        if matches_to_delete:
            placeholders = ','.join([str(m_id) for m_id in matches_to_delete])
            db.execute(text(f"DELETE FROM matches WHERE id IN ({placeholders})"))
            result["duplicates_removed"] = len(matches_to_delete)
        
        db.commit()
        result["success"] = True
    except Exception as e:
        db.rollback()
        result["success"] = False
        result["error"] = str(e)
        print(f"[Admin] Error removing duplicate matches: {e}")
    
    return result


@router.post("/remove-duplicate-highlights")
def remove_duplicate_highlights(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Remove duplicate highlights from the database"""
    
    result = {
        "duplicates_found": 0,
        "duplicates_removed": 0,
        "details": []
    }
    
    try:
        # Get all matches with highlights
        matches = db.query(models.Match).all()
        
        for match in matches:
            if not match.highlights:
                continue
            
            # Group highlights by video_id
            video_ids_seen = {}
            duplicates = []
            
            for highlight in match.highlights:
                if highlight.youtube_video_id in video_ids_seen:
                    # This is a duplicate
                    duplicates.append(highlight)
                    result["duplicates_found"] += 1
                else:
                    video_ids_seen[highlight.youtube_video_id] = highlight.id
            
            # Remove duplicates
            for duplicate in duplicates:
                db.delete(duplicate)
                result["duplicates_removed"] += 1
                result["details"].append({
                    "match": f"{match.home_team} vs {match.away_team}",
                    "video_id": duplicate.youtube_video_id,
                    "title": duplicate.title
                })
        
        db.commit()
        print(f"[Admin] Removed {result['duplicates_removed']} duplicate highlights")
        
    except Exception as e:
        db.rollback()
        print(f"[Admin] Error removing duplicates: {e}")
        result["error"] = str(e)
    
    return result
