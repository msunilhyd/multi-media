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
            "league_name": "ATP",
            "league_slug": "atp",
            "matches": [
                {"home": "Novak Djokovic", "away": "Carlos Alcaraz", "date": date.today() - timedelta(days=1), "status": "finished", "home_score": 2, "away_score": 1},
                {"home": "Rafael Nadal", "away": "Jannik Sinner", "date": date.today() - timedelta(days=2), "status": "finished", "home_score": 1, "away_score": 2},
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
