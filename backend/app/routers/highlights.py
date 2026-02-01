from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date
from ..database import get_db
from .. import models, schemas
from ..youtube_service import get_youtube_service, YouTubeQuotaExhaustedError
from ..models_users import User, UserFavoriteTeam
from .auth import get_current_user
from ..geo_service import get_geo_service, GeoService

router = APIRouter(prefix="/api/highlights", tags=["highlights"])


@router.get("", response_model=List[schemas.HighlightsGroupedByLeague])
async def get_highlights_grouped(
    request: Request,
    match_date: Optional[date] = Query(default=None),
    teams: Optional[str] = Query(default=None, description="Comma-separated list of team names to filter"),
    db: Session = Depends(get_db)
):
    """Get highlights grouped by league with optional team filtering and geo-filtering"""
    target_date = match_date or date.today()
    
    # Detect user's country from IP
    client_ip = request.client.host if request.client else None
    country_code = None
    if client_ip:
        geo_service = get_geo_service()
        country_code = await geo_service.get_country_from_ip(client_ip)
        if country_code:
            print(f"[Highlights] Detected user country: {country_code} from IP: {client_ip}")
    
    # Parse team names if provided
    team_filter = None
    if teams:
        team_filter = set(t.strip() for t in teams.split(",") if t.strip())
    
    leagues = db.query(models.League).options(
        joinedload(models.League.matches).joinedload(models.Match.highlights)
    ).order_by(models.League.display_order).all()
    
    result = []
    for league in leagues:
        matches_with_highlights = []
        for m in league.matches:
            # Only include matches that have highlights AND match the date
            if m.match_date == target_date and len(m.highlights) > 0:
                # If team filter is provided, only include matches with those teams
                if team_filter:
                    if m.home_team in team_filter or m.away_team in team_filter:
                        # Filter highlights by country availability
                        if country_code:
                            m = _filter_match_highlights_by_country(m, country_code)
                        if len(m.highlights) > 0:  # Only add if has available highlights
                            matches_with_highlights.append(m)
                else:
                    # Filter highlights by country availability
                    if country_code:
                        m = _filter_match_highlights_by_country(m, country_code)
                    if len(m.highlights) > 0:  # Only add if has available highlights
                        matches_with_highlights.append(m)
        
        if matches_with_highlights:
            total_highlights = sum(len(m.highlights) for m in matches_with_highlights)
            result.append(schemas.HighlightsGroupedByLeague(
                league=league,
                matches=matches_with_highlights,
                total_highlights=total_highlights
            ))
    
    return result


def _filter_match_highlights_by_country(match: models.Match, country_code: str) -> models.Match:
    """Filter highlights for a match to show only those available in the user's country"""
    geo_service = get_geo_service()
    
    available_highlights = []
    for highlight in match.highlights:
        # Convert to dict format for geo service
        highlight_dict = {
            'blocked_countries': [],
            'allowed_countries': []
        }
        
        # Check if video is available in user's country
        is_available = geo_service.is_video_available_in_country(
            country_code,
            highlight_dict['blocked_countries'],
            highlight_dict['allowed_countries']
        )
        
        if is_available:
            available_highlights.append(highlight)
    
    # Replace match highlights with filtered list
    match.highlights = available_highlights
    return match





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


@router.post("/refresh/{match_id}", response_model=schemas.YouTubeSearchResponse)
def refresh_match_highlights(
    match_id: int,
    db: Session = Depends(get_db)
):
    """Delete existing highlights for a match and fetch fresh ones from YouTube"""
    match = db.query(models.Match).options(
        joinedload(models.Match.league)
    ).filter(models.Match.id == match_id).first()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Delete existing highlights for this match
    db.query(models.Highlight).filter(models.Highlight.match_id == match_id).delete()
    db.commit()
    
    # Fetch fresh highlights
    youtube_service = get_youtube_service()
    try:
        videos = youtube_service.search_highlights(
            match.home_team, 
            match.away_team,
            league=match.league.name if match.league else None
        )
    except YouTubeQuotaExhaustedError as e:
        return schemas.YouTubeSearchResponse(
            success=False,
            message=str(e),
            highlights_found=0
        )
    
    total_highlights = 0
    for video in videos:
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
        message=f"Refreshed highlights for {match.home_team} vs {match.away_team}",
        highlights_found=total_highlights
    )


@router.put("/{highlight_id}", response_model=schemas.Highlight)
def update_highlight(
    highlight_id: int,
    youtube_video_id: str = Query(..., description="New YouTube video ID"),
    db: Session = Depends(get_db)
):
    """Manually update a highlight with a correct YouTube video ID"""
    highlight = db.query(models.Highlight).filter(models.Highlight.id == highlight_id).first()
    
    if not highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    
    # Fetch video details from YouTube
    youtube_service = get_youtube_service()
    try:
        # Get video details
        response = youtube_service.youtube.videos().list(
            part='snippet,statistics,contentDetails',
            id=youtube_video_id
        ).execute()
        
        if not response.get('items'):
            raise HTTPException(status_code=404, detail="YouTube video not found")
        
        video = response['items'][0]
        snippet = video['snippet']
        stats = video.get('statistics', {})
        content = video.get('contentDetails', {})
        
        # Update highlight
        highlight.youtube_video_id = youtube_video_id
        highlight.title = snippet['title']
        highlight.description = snippet.get('description', '')
        highlight.thumbnail_url = snippet['thumbnails'].get('high', {}).get('url')
        highlight.channel_title = snippet['channelTitle']
        highlight.view_count = int(stats.get('viewCount', 0)) if stats.get('viewCount') else None
        highlight.duration = youtube_service._parse_duration(content.get('duration', ''))
        
        db.commit()
        db.refresh(highlight)
        
        return highlight
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching video details: {str(e)}")



# New optimized endpoint for recent highlights by league with limit
@router.get("/{league_slug}/recent", response_model=schemas.HighlightsGroupedByLeague)
def get_recent_highlights_by_league(
    league_slug: str,
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get recent highlights for a league, ordered by match date (desc), limited by 'limit' param."""
    league = db.query(models.League).options(
        joinedload(models.League.matches).joinedload(models.Match.highlights)
    ).filter(models.League.slug == league_slug).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    # Only matches with highlights
    matches_with_highlights = [
        m for m in league.matches if len(m.highlights) > 0
    ]
    matches_with_highlights.sort(key=lambda x: x.match_date, reverse=True)
    # Limit the number of matches returned
    matches_with_highlights = matches_with_highlights[:limit]
    total_highlights = sum(len(m.highlights) for m in matches_with_highlights)
    return schemas.HighlightsGroupedByLeague(
        league=league,
        matches=matches_with_highlights,
        total_highlights=total_highlights
    )
