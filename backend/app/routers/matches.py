from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date, timedelta, datetime
from ..database import get_db
from .. import models, schemas
from ..football_api import get_football_api
from ..youtube_service import get_youtube_service, YouTubeQuotaExhaustedError
from ..config import match_has_team_of_interest

router = APIRouter(prefix="/api/matches", tags=["matches"])


@router.get("", response_model=List[schemas.MatchWithHighlights])
def get_matches(
    match_date: Optional[date] = Query(default=None),
    league_slug: Optional[str] = Query(default=None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Match).options(
        joinedload(models.Match.league),
        joinedload(models.Match.highlights)
    )
    
    if match_date:
        query = query.filter(models.Match.match_date == match_date)
    
    if league_slug:
        query = query.join(models.League).filter(models.League.slug == league_slug)
    
    matches = query.order_by(models.Match.match_date.desc(), models.Match.match_time).all()
    return matches


def get_yesterday() -> date:
    return date.today() - timedelta(days=1)


def get_date_label(target_date: date) -> str:
    """Get a human-readable label for a date"""
    today = date.today()
    tomorrow = today + timedelta(days=1)
    
    if target_date == today:
        return "Today"
    elif target_date == tomorrow:
        return "Tomorrow"
    else:
        # Return day name (e.g., "Monday", "Tuesday")
        return target_date.strftime("%A, %b %d")


async def _fetch_and_store_matches_for_date(target_date: date, db: Session) -> List[schemas.UpcomingMatch]:
    """Fetch matches from ESPN API and store in database, return upcoming matches"""
    football_api = get_football_api()
    upcoming_matches = []
    
    try:
        fixtures_by_league = await football_api.get_matches_for_date(target_date)
        
        for league_name, matches in fixtures_by_league.items():
            # Get or create league
            league_info = models.LEAGUE_MAPPINGS.get(league_name, {
                "slug": league_name.lower().replace(" ", "-"),
                "country": "Unknown"
            })
            
            db_league = db.query(models.League).filter(
                models.League.slug == league_info["slug"]
            ).first()
            
            if not db_league:
                db_league = models.League(
                    name=league_name,
                    slug=league_info["slug"],
                    country=league_info.get("country"),
                    display_order=0
                )
                db.add(db_league)
                db.commit()
                db.refresh(db_league)
            
            for match in matches:
                # Check if match already exists
                existing = db.query(models.Match).filter(
                    models.Match.espn_event_id == match.get("espn_event_id")
                ).first() if match.get("espn_event_id") else None
                
                if not existing:
                    # Also check by teams and date
                    existing = db.query(models.Match).filter(
                        models.Match.home_team == match["home_team"],
                        models.Match.away_team == match["away_team"],
                        models.Match.match_date == target_date
                    ).first()
                
                if existing:
                    # Update status if changed
                    if existing.status != match["status"]:
                        existing.status = match["status"]
                        existing.home_score = match.get("home_score")
                        existing.away_score = match.get("away_score")
                        db.commit()
                else:
                    # Create new match
                    new_match = models.Match(
                        league_id=db_league.id,
                        home_team=match["home_team"],
                        away_team=match["away_team"],
                        home_score=match.get("home_score"),
                        away_score=match.get("away_score"),
                        match_date=target_date,
                        match_time=match.get("match_time"),
                        status=match["status"],
                        espn_event_id=match.get("espn_event_id")
                    )
                    db.add(new_match)
                    db.commit()
                
                # Filter by teams of interest for upcoming display
                if match_has_team_of_interest(match["home_team"], match["away_team"], league_name):
                    # For today: include all matches. For future: only scheduled/live
                    is_today = target_date == date.today()
                    if is_today or match["status"] in ["scheduled", "live"]:
                        upcoming_matches.append(schemas.UpcomingMatch(
                            home_team=match["home_team"],
                            away_team=match["away_team"],
                            home_score=match.get("home_score"),
                            away_score=match.get("away_score"),
                            match_date=match["match_date"],
                            match_time=match["match_time"],
                            league_name=league_name,
                            status=match["status"]
                        ))
    except Exception as e:
        print(f"Error fetching matches for {target_date}: {e}")
    
    # Mark this date as fetched (even if no matches)
    fetched_record = models.FetchedDate(fetch_date=target_date)
    db.merge(fetched_record)
    try:
        db.commit()
    except:
        db.rollback()  # Date already exists
    
    return upcoming_matches


@router.get("/upcoming", response_model=List[schemas.UpcomingMatchesByDate])
async def get_upcoming_matches(
    days: int = Query(default=7, ge=1, le=14),
    db: Session = Depends(get_db),
):
    """Get upcoming matches of interest for the next N days (from DB, fetches from ESPN if needed)"""
    today = date.today()
    result = []
    
    for i in range(days):
        target_date = today + timedelta(days=i)
        
        # Check if we've already fetched this date
        already_fetched = db.query(models.FetchedDate).filter(
            models.FetchedDate.fetch_date == target_date
        ).first()
        
        if already_fetched:
            # Use cached data from DB
            db_matches = db.query(models.Match).filter(
                models.Match.match_date == target_date
            ).all()
            
            upcoming_matches = []
            for match in db_matches:
                league_name = match.league.name if match.league else "Unknown"
                if match_has_team_of_interest(match.home_team, match.away_team, league_name):
                    # For today: include all matches (scheduled, live, finished)
                    # For future dates: only scheduled and live
                    is_today = target_date == today
                    if is_today or match.status in ["scheduled", "live"]:
                        upcoming_matches.append(schemas.UpcomingMatch(
                            home_team=match.home_team,
                            away_team=match.away_team,
                            home_score=match.home_score,
                            away_score=match.away_score,
                            match_date=match.match_date,
                            match_time=match.match_time,
                            league_name=league_name,
                            status=match.status
                        ))
        else:
            # Fetch from ESPN API and store in DB
            upcoming_matches = await _fetch_and_store_matches_for_date(target_date, db)
        
        if upcoming_matches:
            # Sort by time
            upcoming_matches.sort(key=lambda x: x.match_time or "99:99")
            result.append(schemas.UpcomingMatchesByDate(
                date=target_date,
                date_label=get_date_label(target_date),
                matches=upcoming_matches
            ))
    
    return result


@router.get("/dates", response_model=List[str])
def get_available_dates(db: Session = Depends(get_db)):
    """Get list of dates that have matches in the database"""
    from sqlalchemy import func
    dates = db.query(func.distinct(models.Match.match_date)).order_by(models.Match.match_date.desc()).all()
    return [str(d[0]) for d in dates if d[0]]


@router.get("/scrape", response_model=schemas.ScrapeResponse)
async def scrape_matches(
    target_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db)
):
    """Fetch matches for a specific date from football-data.org API (defaults to yesterday)"""
    try:
        scrape_date = target_date or get_yesterday()
        
        football_api = get_football_api()
        fixtures_by_league = await football_api.get_matches_for_date(scrape_date)
        
        matches_count = 0
        leagues_count = 0
        
        for league_name, matches in fixtures_by_league.items():
            league_info = models.LEAGUE_MAPPINGS.get(league_name, {
                "slug": league_name.lower().replace(" ", "-"),
                "country": "Unknown"
            })
            
            db_league = db.query(models.League).filter(
                models.League.slug == league_info["slug"]
            ).first()
            
            if not db_league:
                db_league = models.League(
                    name=league_name,
                    slug=league_info["slug"],
                    country=league_info.get("country"),
                    display_order=leagues_count
                )
                db.add(db_league)
                db.commit()
                db.refresh(db_league)
            leagues_count += 1
            
            for match_data in matches:
                # Skip matches that don't involve teams of interest
                if not match_has_team_of_interest(
                    match_data["home_team"], 
                    match_data["away_team"],
                    league_name
                ):
                    continue
                
                existing = None
                if match_data.get("espn_event_id"):
                    existing = db.query(models.Match).filter(
                        models.Match.espn_event_id == match_data["espn_event_id"]
                    ).first()
                
                if not existing:
                    existing = db.query(models.Match).filter(
                        models.Match.home_team == match_data["home_team"],
                        models.Match.away_team == match_data["away_team"],
                        models.Match.match_date == match_data["match_date"]
                    ).first()
                
                if existing:
                    existing.home_score = match_data.get("home_score")
                    existing.away_score = match_data.get("away_score")
                    existing.status = match_data.get("status", "scheduled")
                else:
                    db_match = models.Match(
                        league_id=db_league.id,
                        home_team=match_data["home_team"],
                        away_team=match_data["away_team"],
                        home_score=match_data.get("home_score"),
                        away_score=match_data.get("away_score"),
                        match_date=match_data["match_date"],
                        match_time=match_data.get("match_time"),
                        status=match_data.get("status", "scheduled"),
                        espn_event_id=match_data.get("espn_event_id")
                    )
                    db.add(db_match)
                matches_count += 1  # Count all matches processed (new or updated)
            
            db.commit()
        
        return schemas.ScrapeResponse(
            success=True,
            message=f"Loaded {matches_count} matches from {leagues_count} leagues",
            matches_found=matches_count,
            leagues_found=leagues_count
        )
    
    except Exception as e:
        return schemas.ScrapeResponse(
            success=False,
            message=f"Error scraping fixtures: {str(e)}",
            matches_found=0,
            leagues_found=0
        )


@router.get("/scrape-range", response_model=schemas.ScrapeResponse)
async def scrape_matches_for_range(
    days: int = Query(default=4, ge=1, le=30),
    direction: str = Query(default="future", regex="^(future|past)$"),
    db: Session = Depends(get_db)
):
    """Fetch matches for the next/past N days from ESPN API
    
    Args:
        days: Number of days to fetch (1-30)
        direction: 'future' for upcoming matches, 'past' for previous matches
    """
    try:
        today = date.today()
        football_api = get_football_api()
        
        all_fixtures = {}
        
        for i in range(days):
            if direction == "past":
                target_date = today - timedelta(days=i+1)  # Start from yesterday
            else:
                target_date = today + timedelta(days=i)
            
            fixtures = await football_api.get_matches_for_date(target_date)
            if fixtures:
                all_fixtures[target_date] = fixtures
        
        total_matches = 0
        total_leagues = 0
        
        for target_date, fixtures_by_league in all_fixtures.items():
            matches_count, leagues_count = await _store_fixtures(db, fixtures_by_league)
            total_matches += matches_count
            total_leagues += leagues_count
        
        direction_text = "past" if direction == "past" else "upcoming"
        return schemas.ScrapeResponse(
            success=True,
            message=f"Fetched {direction_text} fixtures for {days} days ({total_matches} matches)",
            matches_found=total_matches,
            leagues_found=total_leagues
        )
    except Exception as e:
        return schemas.ScrapeResponse(
            success=False,
            message=f"Error: {str(e)}",
            matches_found=0,
            leagues_found=0
        )


@router.get("/yesterday-highlights/preview", response_model=schemas.YouTubeCostEstimate)
def preview_yesterday_highlights(db: Session = Depends(get_db)):
    """Preview the cost of fetching YouTube highlights for yesterday's matches (teams of interest only)"""
    yesterday = get_yesterday()
    
    matches = db.query(models.Match).options(
        joinedload(models.Match.league)
    ).filter(
        models.Match.match_date == yesterday,
        models.Match.status == "finished"
    ).all()
    
    matches_to_process = []
    matches_skipped = 0
    
    for match in matches:
        league_name = match.league.name if match.league else "Unknown"
        
        # Skip matches that don't involve teams of interest
        if not match_has_team_of_interest(match.home_team, match.away_team, league_name):
            matches_skipped += 1
            continue
        
        # Skip if already has highlights
        existing_count = db.query(models.Highlight).filter(
            models.Highlight.match_id == match.id
        ).count()
        if existing_count > 0:
            continue
        
        matches_to_process.append(schemas.MatchForHighlights(
            id=match.id,
            home_team=match.home_team,
            away_team=match.away_team,
            league_name=league_name
        ))
    
    # Cost estimation:
    # - Playlist API (for known leagues): 3 units per request
    # - Search API (fallback): 100 units per request
    # Best case: all use playlist API = 3 units each
    # Worst case: all use search API = 100 units each
    num_matches = len(matches_to_process)
    estimated_units_min = num_matches * 3   # Best case: all playlist
    estimated_units_max = num_matches * 100  # Worst case: all search
    estimated_units = num_matches * 50  # Average estimate
    
    return schemas.YouTubeCostEstimate(
        matches_to_process=num_matches,
        matches_skipped=matches_skipped,
        estimated_units=estimated_units,
        estimated_units_min=estimated_units_min,
        estimated_units_max=estimated_units_max,
        daily_quota=10000,
        matches=matches_to_process,
        message=f"Found {num_matches} matches to fetch highlights for ({matches_skipped} skipped - not teams of interest)"
    )


@router.post("/yesterday-highlights/confirm", response_model=schemas.YouTubeSearchResponse)
def confirm_yesterday_highlights(db: Session = Depends(get_db)):
    """Confirm and fetch YouTube highlights for yesterday's matches (only teams of interest)"""
    yesterday = get_yesterday()
    
    matches = db.query(models.Match).options(
        joinedload(models.Match.league)
    ).filter(
        models.Match.match_date == yesterday,
        models.Match.status == "finished"
    ).all()
    
    if not matches:
        return schemas.YouTubeSearchResponse(
            success=True,
            message="No finished matches found for yesterday",
            highlights_found=0
        )
    
    youtube_service = get_youtube_service()
    total_highlights = 0
    matches_processed = 0
    matches_skipped = 0
    
    for match in matches:
        league_name = match.league.name if match.league else None
        
        # Skip matches that don't involve teams of interest
        if not match_has_team_of_interest(match.home_team, match.away_team, league_name):
            matches_skipped += 1
            continue
        
        # Skip if already has highlights
        existing_count = db.query(models.Highlight).filter(
            models.Highlight.match_id == match.id
        ).count()
        if existing_count > 0:
            continue
        
        matches_processed += 1
        
        # Pass league name to use cheaper playlist API (3 units vs 100)
        try:
            videos = youtube_service.search_highlights(match.home_team, match.away_team, league=league_name)
        except YouTubeQuotaExhaustedError as e:
            return schemas.YouTubeSearchResponse(
                success=False,
                message=str(e),
                highlights_found=total_highlights
            )
        
        # Only take the first (best) video - one highlight per match
        if videos:
            video = videos[0]
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
        message=f"Fetched highlights for {matches_processed} matches ({matches_skipped} skipped - not teams of interest)",
        highlights_found=total_highlights
    )


@router.get("/yesterday-highlights", response_model=schemas.YouTubeSearchResponse)
def fetch_yesterday_highlights(db: Session = Depends(get_db)):
    """Fetch YouTube highlights for all finished matches from yesterday (only teams of interest)"""
    yesterday = get_yesterday()
    
    matches = db.query(models.Match).options(
        joinedload(models.Match.league)
    ).filter(
        models.Match.match_date == yesterday,
        models.Match.status == "finished"
    ).all()
    
    if not matches:
        return schemas.YouTubeSearchResponse(
            success=True,
            message="No finished matches found for yesterday",
            highlights_found=0
        )
    
    youtube_service = get_youtube_service()
    total_highlights = 0
    matches_processed = 0
    matches_skipped = 0
    
    for match in matches:
        league_name = match.league.name if match.league else None
        
        # Skip matches that don't involve teams of interest
        if not match_has_team_of_interest(match.home_team, match.away_team, league_name):
            matches_skipped += 1
            continue
        
        # Skip if already has highlights
        existing_count = db.query(models.Highlight).filter(
            models.Highlight.match_id == match.id
        ).count()
        if existing_count > 0:
            continue
        
        matches_processed += 1
        
        # Pass league name to use cheaper playlist API (3 units vs 100)
        try:
            videos = youtube_service.search_highlights(match.home_team, match.away_team, league=league_name)
        except YouTubeQuotaExhaustedError as e:
            return schemas.YouTubeSearchResponse(
                success=False,
                message=str(e),
                highlights_found=total_highlights
            )
        
        # Only take the first (best) video - one highlight per match
        if videos:
            video = videos[0]
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
        message=f"Fetched highlights for {matches_processed} matches ({matches_skipped} skipped - not teams of interest)",
        highlights_found=total_highlights
    )


async def _store_fixtures(db: Session, fixtures_by_league: dict) -> tuple:
    """Helper to store fixtures in database"""
    matches_count = 0
    leagues_count = 0
    
    for league_name, matches in fixtures_by_league.items():
        league_info = models.LEAGUE_MAPPINGS.get(league_name, {
            "slug": league_name.lower().replace(" ", "-"),
            "country": "Unknown"
        })
        
        db_league = db.query(models.League).filter(
            models.League.slug == league_info["slug"]
        ).first()
        
        if not db_league:
            db_league = models.League(
                name=league_name,
                slug=league_info["slug"],
                country=league_info.get("country"),
                display_order=leagues_count
            )
            db.add(db_league)
            db.commit()
            db.refresh(db_league)
            leagues_count += 1
        
        for match_data in matches:
            existing = None
            if match_data.get("espn_event_id"):
                existing = db.query(models.Match).filter(
                    models.Match.espn_event_id == match_data["espn_event_id"]
                ).first()
            
            if not existing:
                existing = db.query(models.Match).filter(
                    models.Match.home_team == match_data["home_team"],
                    models.Match.away_team == match_data["away_team"],
                    models.Match.match_date == match_data["match_date"]
                ).first()
            
            if existing:
                existing.home_score = match_data.get("home_score")
                existing.away_score = match_data.get("away_score")
                existing.status = match_data.get("status", "scheduled")
            else:
                db_match = models.Match(
                    league_id=db_league.id,
                    home_team=match_data["home_team"],
                    away_team=match_data["away_team"],
                    home_score=match_data.get("home_score"),
                    away_score=match_data.get("away_score"),
                    match_date=match_data["match_date"],
                    match_time=match_data.get("match_time"),
                    status=match_data.get("status", "scheduled"),
                    espn_event_id=match_data.get("espn_event_id")
                )
                db.add(db_match)
                matches_count += 1
        
        db.commit()
    
    return matches_count, leagues_count


# These routes with path parameters must come AFTER specific routes
@router.get("/{match_id}", response_model=schemas.MatchWithHighlights)
def get_match(match_id: int, db: Session = Depends(get_db)):
    match = db.query(models.Match).options(
        joinedload(models.Match.league),
        joinedload(models.Match.highlights)
    ).filter(models.Match.id == match_id).first()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.post("/{match_id}/fetch-highlights", response_model=schemas.YouTubeSearchResponse)
def fetch_highlights_for_match(match_id: int, db: Session = Depends(get_db)):
    match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    youtube_service = get_youtube_service()
    try:
        videos = youtube_service.search_highlights(match.home_team, match.away_team)
    except YouTubeQuotaExhaustedError as e:
        return schemas.YouTubeSearchResponse(
            success=False,
            message=str(e),
            highlights_found=0
        )
    
    highlights_added = 0
    # Only take the first (best) video - one highlight per match
    if videos:
        video = videos[0]
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
            highlights_added += 1
    
    db.commit()
    
    return schemas.YouTubeSearchResponse(
        success=True,
        message=f"Found highlights for {match.home_team} vs {match.away_team}",
        highlights_found=highlights_added
    )
