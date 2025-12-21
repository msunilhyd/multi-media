from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date
from ..database import get_db
from .. import models, schemas
from ..youtube_service import get_youtube_service, YouTubeQuotaExhaustedError

router = APIRouter(prefix="/api/highlights", tags=["highlights"])


@router.get("", response_model=List[schemas.HighlightsGroupedByLeague])
def get_highlights_grouped(
    match_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db)
):
    target_date = match_date or date.today()
    
    leagues = db.query(models.League).options(
        joinedload(models.League.matches).joinedload(models.Match.highlights)
    ).order_by(models.League.display_order).all()
    
    result = []
    for league in leagues:
        matches_with_highlights = [
            m for m in league.matches 
            if m.match_date == target_date and len(m.highlights) > 0
        ]
        
        if matches_with_highlights:
            total_highlights = sum(len(m.highlights) for m in matches_with_highlights)
            result.append(schemas.HighlightsGroupedByLeague(
                league=league,
                matches=matches_with_highlights,
                total_highlights=total_highlights
            ))
    
    return result


@router.get("/all", response_model=List[schemas.HighlightsGroupedByLeague])
def get_all_highlights_grouped(
    match_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db)
):
    """Get all highlights grouped by league. If match_date is provided, filter by that date."""
    leagues = db.query(models.League).options(
        joinedload(models.League.matches).joinedload(models.Match.highlights)
    ).order_by(models.League.display_order).all()
    
    result = []
    for league in leagues:
        if match_date:
            matches_with_highlights = [
                m for m in league.matches 
                if len(m.highlights) > 0 and m.match_date == match_date
            ]
        else:
            matches_with_highlights = [
                m for m in league.matches if len(m.highlights) > 0
            ]
        
        if matches_with_highlights:
            matches_with_highlights.sort(key=lambda x: x.match_date, reverse=True)
            total_highlights = sum(len(m.highlights) for m in matches_with_highlights)
            result.append(schemas.HighlightsGroupedByLeague(
                league=league,
                matches=matches_with_highlights,
                total_highlights=total_highlights
            ))
    
    return result


@router.get("/fetch-all", response_model=schemas.YouTubeSearchResponse)
def fetch_all_highlights(
    match_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db)
):
    target_date = match_date or date.today()
    
    matches = db.query(models.Match).filter(
        models.Match.match_date == target_date,
        models.Match.status == "finished"
    ).all()
    
    if not matches:
        return schemas.YouTubeSearchResponse(
            success=True,
            message="No finished matches found for today",
            highlights_found=0
        )
    
    youtube_service = get_youtube_service()
    total_highlights = 0
    
    for match in matches:
        existing_count = db.query(models.Highlight).filter(
            models.Highlight.match_id == match.id
        ).count()
        
        if existing_count > 0:
            continue
        
        try:
            videos = youtube_service.search_highlights(match.home_team, match.away_team)
        except YouTubeQuotaExhaustedError as e:
            return schemas.YouTubeSearchResponse(
                success=False,
                message=str(e),
                highlights_found=total_highlights
            )
        
        for video in videos:
            existing = db.query(models.Highlight).filter(
                models.Highlight.youtube_video_id == video['video_id']
            ).first()
            
            if not existing:
                highlight = models.Highlight(
                    match_id=match.id,
                    youtube_video_id=video['video_id'],
                    title=video['title'],
                    description=video.get('description'),
                    thumbnail_url=video.get('thumbnail_url'),
                    channel_title=video.get('channel_title'),
                    view_count=video.get('view_count'),
                    duration=video.get('duration'),
                    is_official=video.get('is_official', False)
                )
                db.add(highlight)
                total_highlights += 1
    
    db.commit()
    
    return schemas.YouTubeSearchResponse(
        success=True,
        message=f"Fetched highlights for {len(matches)} matches",
        highlights_found=total_highlights
    )


@router.get("/{league_slug}", response_model=schemas.HighlightsGroupedByLeague)
def get_highlights_by_league(
    league_slug: str,
    match_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db)
):
    league = db.query(models.League).options(
        joinedload(models.League.matches).joinedload(models.Match.highlights)
    ).filter(models.League.slug == league_slug).first()
    
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    
    if match_date:
        matches_with_highlights = [
            m for m in league.matches 
            if m.match_date == match_date and len(m.highlights) > 0
        ]
    else:
        matches_with_highlights = [
            m for m in league.matches if len(m.highlights) > 0
        ]
    
    matches_with_highlights.sort(key=lambda x: x.match_date, reverse=True)
    total_highlights = sum(len(m.highlights) for m in matches_with_highlights)
    
    return schemas.HighlightsGroupedByLeague(
        league=league,
        matches=matches_with_highlights,
        total_highlights=total_highlights
    )
