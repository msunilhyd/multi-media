from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any
from datetime import date, timedelta
from ..database import get_db
from .. import models
from ..scheduler import fetch_highlights_for_yesterday, fetch_highlights_for_today, refresh_today_scores, reconcile_todays_matches

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
