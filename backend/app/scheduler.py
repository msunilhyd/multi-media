"""
Scheduled jobs for the Football Highlights API.
Runs daily to pre-fetch upcoming matches for the next 7 days.
"""
import asyncio
from datetime import date, timedelta, datetime
from typing import List
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from .database import SessionLocal
from . import models
from .football_api import get_football_api
from .cricket_api import CricketAPI
from .sports_apis import (
    get_nba_api, get_tennis_api, get_nhl_api, 
    get_nfl_api, get_mlb_api, get_fifa_api,
    get_pga_api, get_ufc_api
)
from .youtube_service import get_youtube_service, YouTubeQuotaExhaustedError
from .youtube_rss_service import get_rss_service
from .email_service import send_missing_highlights_notification
from .config import match_has_team_of_interest, get_settings

settings = get_settings()

# Create scheduler instance
scheduler = AsyncIOScheduler()


async def fetch_matches_for_date(target_date: date, db: Session) -> int:
    """
    Fetch matches from ESPN API for a specific date and store in database.
    Returns the number of matches stored.
    """
    football_api = get_football_api()
    match_count = 0
    
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
                # Check if match already exists by ESPN ID
                existing = None
                if match.get("espn_event_id"):
                    existing = db.query(models.Match).filter(
                        models.Match.espn_event_id == match.get("espn_event_id")
                    ).first()
                
                if not existing:
                    # Also check by teams and date
                    existing = db.query(models.Match).filter(
                        models.Match.home_team == match["home_team"],
                        models.Match.away_team == match["away_team"],
                        models.Match.match_date == target_date
                    ).first()
                
                if existing:
                    # Update status/scores if changed
                    home_score = match.get("home_score")
                    away_score = match.get("away_score")
                    
                    # Only set status to finished if match has scores AND is today or in the past
                    if home_score is not None and away_score is not None and target_date <= date.today():
                        new_status = "finished"
                    else:
                        new_status = match["status"]
                    
                    if existing.status != new_status or existing.home_score != home_score or existing.away_score != away_score:
                        existing.status = new_status
                        existing.home_score = home_score
                        existing.away_score = away_score
                        db.commit()
                else:
                    # Create new match
                    home_score = match.get("home_score")
                    away_score = match.get("away_score")
                    
                    # Only set status to finished if match has scores AND is today or in the past
                    if home_score is not None and away_score is not None and target_date <= date.today():
                        status = "finished"
                    else:
                        status = match["status"]
                    
                    new_match = models.Match(
                        league_id=db_league.id,
                        home_team=match["home_team"],
                        away_team=match["away_team"],
                        home_score=home_score,
                        away_score=away_score,
                        match_date=target_date,
                        match_time=match.get("match_time"),
                        status=status,
                        espn_event_id=match.get("espn_event_id")
                    )
                    db.add(new_match)
                    db.commit()
                    match_count += 1
                    
    except Exception as e:
        print(f"[Scheduler] ❌ ERROR fetching matches for {target_date}: {e}")
        import traceback
        print(f"[Scheduler] Traceback: {traceback.format_exc()}")
        db.rollback()
    
    return match_count


async def fetch_ipl_matches(db: Session) -> int:
    """
    Fetch IPL matches from Cricket API and store in database.
    Returns the number of new matches stored.
    """
    cricket_api = CricketAPI()
    match_count = 0
    
    try:
        ipl_matches = await cricket_api.get_ipl_matches()
        
        # Get or create IPL league
        league_info = {
            "slug": "ipl",
            "country": "India"
        }
        
        db_league = db.query(models.League).filter(
            models.League.slug == league_info["slug"]
        ).first()
        
        if not db_league:
            db_league = models.League(
                name="Indian Premier League",
                slug=league_info["slug"],
                country=league_info.get("country"),
                display_order=0
            )
            db.add(db_league)
            db.commit()
            db.refresh(db_league)
        
        for match in ipl_matches:
            # Check if match already exists
            existing = db.query(models.Match).filter(
                models.Match.home_team == match.get("home_team"),
                models.Match.away_team == match.get("away_team"),
                models.Match.match_date == match.get("match_date")
            ).first()
            
            if not existing:
                # Create new match
                new_match = models.Match(
                    league_id=db_league.id,
                    home_team=match.get("home_team", ""),
                    away_team=match.get("away_team", ""),
                    match_date=match.get("match_date"),
                    match_time=match.get("match_time"),
                    status=match.get("status", "scheduled"),
                    home_score=match.get("home_score"),
                    away_score=match.get("away_score")
                )
                db.add(new_match)
                match_count += 1
        
        if match_count > 0:
            db.commit()
            print(f"[Scheduler] ✓ Added {match_count} new IPL matches")
        
    except Exception as e:
        print(f"[Scheduler] Error fetching IPL matches: {e}")
        import traceback
        print(f"[Scheduler] Traceback: {traceback.format_exc()}")
        db.rollback()
    
    return match_count


async def fetch_multi_sport_matches(db: Session) -> int:
    """
    Fetch matches from all sports APIs (NBA, Tennis, NHL, NFL, MLB, FIFA)
    Returns total number of new matches stored.
    """
    total_matches = 0
    
    # Define sports and their API getters
    sports_config = [
        ("NBA", "nba", get_nba_api),
        ("Tennis", "tennis", get_tennis_api),
        ("NHL", "nhl", get_nhl_api),
        ("NFL", "nfl", get_nfl_api),
        ("MLB", "mlb", get_mlb_api),
        ("FIFA World Cup", "fifa-world-cup", get_fifa_api),
        ("PGA", "pga", get_pga_api),
        ("UFC", "ufc", get_ufc_api),
    ]
    
    for sport_name, sport_slug, api_getter in sports_config:
        try:
            print(f"[Scheduler] Fetching {sport_name} matches...")
            api = api_getter()
            matches = await api.get_matches()
            
            if not matches:
                print(f"[Scheduler] No {sport_name} matches found")
                continue
            
            # Get or create league
            db_league = db.query(models.League).filter(
                models.League.slug == sport_slug
            ).first()
            
            if not db_league:
                db_league = models.League(
                    name=sport_name,
                    slug=sport_slug,
                    country="International",
                    display_order=0
                )
                db.add(db_league)
                db.commit()
                db.refresh(db_league)
            
            # Add matches
            sport_match_count = 0
            for match in matches:
                existing = db.query(models.Match).filter(
                    models.Match.league_id == db_league.id,
                    models.Match.home_team == match.get("home_team"),
                    models.Match.away_team == match.get("away_team"),
                    models.Match.match_date == match.get("match_date")
                ).first()
                
                if not existing:
                    new_match = models.Match(
                        league_id=db_league.id,
                        home_team=match.get("home_team", ""),
                        away_team=match.get("away_team", ""),
                        match_date=match.get("match_date"),
                        match_time=match.get("match_time", "20:00"),
                        status=match.get("status", "scheduled"),
                        home_score=match.get("home_score"),
                        away_score=match.get("away_score")
                    )
                    db.add(new_match)
                    sport_match_count += 1
            
            if sport_match_count > 0:
                db.commit()
                total_matches += sport_match_count
                print(f"[Scheduler] ✓ Added {sport_match_count} {sport_name} matches")
            
        except Exception as e:
            print(f"[Scheduler] Error fetching {sport_name} matches: {e}")
            import traceback
            print(f"[Scheduler] Traceback: {traceback.format_exc()}")
            db.rollback()
            continue
    
    return total_matches


async def prefetch_upcoming_matches():
    """
    Daily job to pre-fetch matches for the next 7 days.
    Only fetches dates that haven't been fetched yet (smart incremental fetch).
    Also refreshes today's matches to get updated scores/status.
    
    FIX: Don't mark past dates as fetched if we got 0 matches (indicates potential API failure).
    This ensures matches aren't missed due to temporary API issues.
    """
    print(f"\n[Scheduler] Starting daily match prefetch at {datetime.now()}")
    
    db = SessionLocal()
    today = date.today()
    total_new_matches = 0
    dates_fetched = 0
    failed_dates = []
    
    try:
        # Fetch IPL matches first
        print(f"[Scheduler] Fetching IPL matches...")
        ipl_matches = await fetch_ipl_matches(db)
        total_new_matches += ipl_matches
        print(f"[Scheduler] ✓ Fetched {ipl_matches} IPL matches")
        
        # Fetch multi-sport matches (NBA, Tennis, NHL, NFL, MLB, FIFA)
        print(f"[Scheduler] Fetching multi-sport matches...")
        multi_sport_matches = await fetch_multi_sport_matches(db)
        total_new_matches += multi_sport_matches
        print(f"[Scheduler] ✓ Fetched {multi_sport_matches} multi-sport matches")
        
        # Auto-fix FIFA World Cup match statuses: mark past "scheduled" matches as "finished"
        try:
            fifa_league = db.query(models.League).filter(models.League.slug == "fifa-world-cup").first()
            if fifa_league:
                stale_fifa = db.query(models.Match).filter(
                    models.Match.league_id == fifa_league.id,
                    models.Match.status == "scheduled",
                    models.Match.match_date < today
                ).all()
                if stale_fifa:
                    for m in stale_fifa:
                        m.status = "finished"
                    db.commit()
                    print(f"[Scheduler] ✓ Marked {len(stale_fifa)} past FIFA matches as finished")
        except Exception as e:
            print(f"[Scheduler] Error fixing FIFA statuses: {e}")
        
        # Then fetch football matches for next 7 days
        for i in range(7):
            target_date = today + timedelta(days=i)
            
            # Check if we've already fetched this date
            already_fetched = db.query(models.FetchedDate).filter(
                models.FetchedDate.fetch_date == target_date
            ).first()
            
            # Always refresh today (to get score updates)
            # For other days, only fetch if not already in DB
            if i == 0 or not already_fetched:
                print(f"[Scheduler] Fetching football matches for {target_date}...")
                
                # If it's today and already fetched, we're just updating
                if i == 0 and already_fetched:
                    print(f"[Scheduler] Refreshing today's matches for score updates")
                
                match_count = await fetch_matches_for_date(target_date, db)
                total_new_matches += match_count
                dates_fetched += 1
                
                # CRITICAL FIX: Only mark past dates as fetched if we got matches
                # If past date has 0 matches, it might indicate API failure - don't mark as fetched
                # This allows reconciliation job to catch it and refetch
                should_mark_fetched = False
                
                if target_date > today:
                    # Future dates: mark as fetched (matches may be added later)
                    should_mark_fetched = True
                elif match_count > 0:
                    # Past/today with matches: mark as fetched
                    should_mark_fetched = True
                elif target_date == today:
                    # Today with 0 matches: still mark as fetched (will update via refresh_today_scores)
                    should_mark_fetched = True
                else:
                    # Past date with 0 matches: DON'T mark as fetched!
                    # Indicates potential API issue - reconciliation will refetch
                    should_mark_fetched = False
                    failed_dates.append(target_date)
                    print(f"[Scheduler] ⚠️  FLAGGED: {target_date} has 0 matches - may be API issue, not marking as fetched")
                
                # Mark date as fetched if appropriate
                if not already_fetched and should_mark_fetched:
                    fetched_record = models.FetchedDate(fetch_date=target_date)
                    db.merge(fetched_record)
                    try:
                        db.commit()
                    except:
                        db.rollback()
                
                if match_count > 0:
                    print(f"[Scheduler] ✓ Fetched {match_count} new matches for {target_date}")
                else:
                    print(f"[Scheduler] Found 0 matches for {target_date}")
            else:
                print(f"[Scheduler] Skipping {target_date} - already fetched")
        
        # Clean up old fetched_dates entries (older than 7 days ago)
        cutoff_date = today - timedelta(days=7)
        db.query(models.FetchedDate).filter(
            models.FetchedDate.fetch_date < cutoff_date
        ).delete()
        db.commit()
        print(f"[Scheduler] Cleaned up fetched_dates older than {cutoff_date}")
        
    except Exception as e:
        print(f"[Scheduler] Error in prefetch job: {e}")
        import traceback
        print(f"[Scheduler] Traceback: {traceback.format_exc()}")
        db.rollback()
    finally:
        db.close()
    
    if failed_dates:
        print(f"[Scheduler] ⚠️  ALERT: {len(failed_dates)} dates flagged for reconciliation: {failed_dates}")
    
    print(f"[Scheduler] Prefetch complete! Fetched {dates_fetched} dates, {total_new_matches} new matches\n")


async def refresh_today_scores():
    """
    Lightweight job to refresh only today's matches for live score updates.
    Skips API call if all today's matches are already finished.
    """
    print(f"\n[Scheduler] Score refresh check at {datetime.now()}")
    
    db = SessionLocal()
    today = date.today()
    
    try:
        # First, check if there are any unfinished matches for today
        todays_matches = db.query(models.Match).filter(
            models.Match.match_date == today
        ).all()
        
        if not todays_matches:
            print(f"[Scheduler] No matches for today - skipping refresh")
            return
        
        unfinished_count = sum(1 for m in todays_matches if m.status != 'finished')
        
        if unfinished_count == 0:
            print(f"[Scheduler] All {len(todays_matches)} matches finished - skipping API call ✓")
            return
        
        print(f"[Scheduler] {unfinished_count} unfinished matches - refreshing from API...")
        
        # Only call API if there are unfinished matches
        football_api = get_football_api()
        fixtures_by_league = await football_api.get_matches_for_date(today)
        updated_count = 0
        
        for league_name, matches in fixtures_by_league.items():
            for match in matches:
                # Find existing match in DB
                existing = None
                if match.get("espn_event_id"):
                    existing = db.query(models.Match).filter(
                        models.Match.espn_event_id == match.get("espn_event_id")
                    ).first()
                
                if not existing:
                    existing = db.query(models.Match).filter(
                        models.Match.home_team == match["home_team"],
                        models.Match.away_team == match["away_team"],
                        models.Match.match_date == today
                    ).first()
                
                if existing:
                    # Update if status or scores changed
                    home_score = match.get("home_score")
                    away_score = match.get("away_score")
                    
                    # Auto-set status to finished if match has scores
                    if home_score is not None and away_score is not None:
                        new_status = "finished"
                    else:
                        new_status = match["status"]
                    
                    changed = False
                    if existing.status != new_status:
                        existing.status = new_status
                        changed = True
                    if existing.home_score != home_score:
                        existing.home_score = home_score
                        changed = True
                    if existing.away_score != away_score:
                        existing.away_score = away_score
                        changed = True
                    
                    if changed:
                        db.commit()
                        updated_count += 1
                        print(f"[Scheduler] Updated: {match['home_team']} vs {match['away_team']} - {new_status}")
        
        print(f"[Scheduler] Score refresh complete! Updated {updated_count} matches\n")
        
    except Exception as e:
        print(f"[Scheduler] Error refreshing scores: {e}")
        db.rollback()
    finally:
        db.close()


async def fetch_highlights_for_yesterday(send_notification: bool = False):
    """
    Fetch YouTube highlights for yesterday's finished matches.
    Only fetches for matches that don't already have highlights.
    Runs twice daily (8 AM and 2 PM) to catch highlight uploads.
    
    Args:
        send_notification: If True, sends email for missing highlights (used on 2nd run)
    """
    print(f"\n[Scheduler] Fetching highlights for yesterday's matches at {datetime.now()}")
    
    db = SessionLocal()
    yesterday = date.today() - timedelta(days=1)
    highlights_found = 0
    matches_checked = 0
    missing_matches = []  # Track matches that couldn't find highlights
    
    try:
        # Get yesterday's finished matches that are teams of interest
        yesterdays_matches = db.query(models.Match).filter(
            models.Match.match_date == yesterday,
            models.Match.status == 'finished'
        ).all()
        
        if not yesterdays_matches:
            print(f"[Scheduler] No finished matches for yesterday ({yesterday})")
            return
        
        # Filter to matches without highlights
        matches_without_highlights = []
        for match in yesterdays_matches:
            # Check if match already has highlights
            existing_highlight = db.query(models.Highlight).filter(
                models.Highlight.match_id == match.id
            ).first()
            
            if not existing_highlight:
                # Check if it's a team of interest
                league_name = match.league.name if match.league else "Unknown"
                if match_has_team_of_interest(match.home_team, match.away_team, league_name):
                    matches_without_highlights.append(match)
        
        if not matches_without_highlights:
            print(f"[Scheduler] All {len(yesterdays_matches)} matches already have highlights ✓")
            return
        
        print(f"[Scheduler] Found {len(matches_without_highlights)} matches needing highlights")
        
        youtube_service = get_youtube_service()
        
        for match in matches_without_highlights:
            matches_checked += 1
            league_name = match.league.name if match.league else None
            
            try:
                print(f"[Scheduler] Searching highlights: {match.home_team} vs {match.away_team}")
                
                videos = youtube_service.search_highlights(
                    home_team=match.home_team,
                    away_team=match.away_team,
                    league=league_name,
                    match_date=match.match_date,
                    max_results=10  # Fetch multiple highlights for geo-filtering
                )
                
                if videos:
                    # Store ALL highlights in DB for better geo-filtering options
                    added_count = 0
                    for video in videos:
                        # Check if this highlight already exists
                        existing = db.query(models.Highlight).filter(
                            models.Highlight.match_id == match.id,
                            models.Highlight.youtube_video_id == video['video_id']
                        ).first()
                        
                        if not existing:
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
                            added_count += 1
                    db.commit()
                    highlights_found += added_count
                    print(f"[Scheduler] ✓ Found {len(videos)} highlights, added {added_count} new ones for {match.home_team} vs {match.away_team}")
                else:
                    print(f"[Scheduler] ✗ No highlights found for {match.home_team} vs {match.away_team}")
                    # Track this match for notification
                    missing_matches.append({
                        'match_id': match.id,
                        'home_team': match.home_team,
                        'away_team': match.away_team,
                        'match_date': str(match.match_date),
                        'league_name': league_name or 'Unknown'
                    })
                    
            except YouTubeQuotaExhaustedError:
                print(f"[Scheduler] YouTube quota exhausted - stopping highlight fetch")
                break
            except Exception as e:
                print(f"[Scheduler] Error fetching highlight for {match.home_team} vs {match.away_team}: {e}")
                continue
        
        print(f"[Scheduler] Highlights fetch complete! Found {highlights_found}/{matches_checked} highlights")
        
        # Send email notification for missing highlights (only on 2nd run of the day)
        if send_notification and missing_matches:
            print(f"[Scheduler] Sending notification for {len(missing_matches)} missing highlights...")
            send_missing_highlights_notification(missing_matches)
        elif missing_matches:
            print(f"[Scheduler] {len(missing_matches)} matches still missing - will retry at 2 PM\n")
        
    except Exception as e:
        print(f"[Scheduler] Error in highlights fetch job: {e}")
        db.rollback()
    finally:
        db.close()


async def fetch_highlights_for_today():
    """
    Fetch YouTube highlights for today's finished matches with retry logic.
    Runs every 1-2 hours throughout the day.
    Tracks retry attempts and stops after 12 attempts (24 hours).
    """
    print(f"\n[Scheduler] Fetching highlights for today's finished matches at {datetime.now()}")
    
    db = SessionLocal()
    today = date.today()
    highlights_found = 0
    matches_checked = 0
    max_retry_attempts = 12  # Stop after 12 attempts (24 hours with 2-hour intervals)
    
    try:
        # Get today's finished matches without highlights
        todays_finished_matches = db.query(models.Match).filter(
            models.Match.match_date == today,
            models.Match.status == 'finished'
        ).all()
        
        if not todays_finished_matches:
            print(f"[Scheduler] No finished matches for today ({today})")
            return
        
        # Filter to matches without highlights and under retry limit
        matches_to_process = []
        for match in todays_finished_matches:
            # Skip if already has highlights
            existing_highlight = db.query(models.Highlight).filter(
                models.Highlight.match_id == match.id
            ).first()
            
            if existing_highlight:
                continue
            
            # Skip if exceeded retry attempts
            if match.highlight_fetch_attempts >= max_retry_attempts:
                continue
            
            # Check if it's a team of interest
            league_name = match.league.name if match.league else "Unknown"
            if match_has_team_of_interest(match.home_team, match.away_team, league_name):
                matches_to_process.append(match)
        
        if not matches_to_process:
            finished_count = len(todays_finished_matches)
            with_highlights = sum(1 for m in todays_finished_matches if db.query(models.Highlight).filter(models.Highlight.match_id == m.id).first())
            print(f"[Scheduler] All today's finished matches processed ({with_highlights}/{finished_count} have highlights)")
            return
        
        print(f"[Scheduler] Processing {len(matches_to_process)} matches needing highlights")
        
        youtube_service = get_youtube_service()
        
        for match in matches_to_process:
            matches_checked += 1
            league_name = match.league.name if match.league else None
            
            # Update retry tracking
            match.highlight_fetch_attempts += 1
            match.last_highlight_fetch_attempt = datetime.now()
            
            try:
                print(f"[Scheduler] Searching highlights (attempt {match.highlight_fetch_attempts}): {match.home_team} vs {match.away_team}")
                
                videos = youtube_service.search_highlights(
                    home_team=match.home_team,
                    away_team=match.away_team,
                    league=league_name,
                    match_date=match.match_date,
                    max_results=1
                )
                
                if videos:
                    video = videos[0]
                    # Check if this highlight already exists
                    existing = db.query(models.Highlight).filter(
                        models.Highlight.match_id == match.id,
                        models.Highlight.youtube_video_id == video['video_id']
                    ).first()
                    
                    if not existing:
                        # Store highlight in DB
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
                        highlights_found += 1
                        print(f"[Scheduler] ✓ Found: {video['title'][:50]}...")
                    else:
                        print(f"[Scheduler] ℹ️  Highlight already exists: {video['title'][:50]}...")
                else:
                    print(f"[Scheduler] ✗ No highlights yet (will retry later)")
                    db.commit()  # Save the retry attempt count
                    
            except YouTubeQuotaExhaustedError:
                print(f"[Scheduler] YouTube quota exhausted - stopping today's highlight fetch")
                db.commit()  # Save retry attempts before exiting
                break
            except Exception as e:
                print(f"[Scheduler] Error fetching highlight: {e}")
                db.commit()  # Save retry attempt even on error
                continue
        
        print(f"[Scheduler] Today's highlights fetch complete! Found {highlights_found}/{matches_checked} highlights\n")
        
    except Exception as e:
        print(f"[Scheduler] Error in today's highlights fetch job: {e}")
        db.rollback()
    finally:
        db.close()


async def fetch_highlights_for_matches_missing_them():
    """
    Fetch highlights for all finished matches (any date) that don't have highlights yet.
    This is useful for immediately populating highlights after reconciliation adds missing matches.
    
    Can be triggered manually via /api/admin/fetch-missing-highlights
    """
    print(f"\n[Scheduler] ==================== FETCH MISSING HIGHLIGHTS ====================")
    print(f"[Scheduler] Starting highlights fetch for matches without highlights at {datetime.now()}")
    
    db = SessionLocal()
    highlights_found = 0
    matches_checked = 0
    
    try:
        # Get all finished matches without highlights from the past 7 days
        seven_days_ago = date.today() - timedelta(days=7)
        
        finished_matches = db.query(models.Match).filter(
            models.Match.match_date >= seven_days_ago,
            models.Match.match_date <= date.today(),
            models.Match.status == 'finished'
        ).all()
        
        if not finished_matches:
            print(f"[Scheduler] No finished matches in the past 7 days")
            return
        
        # Filter to matches without highlights
        matches_to_process = []
        for match in finished_matches:
            existing_highlight = db.query(models.Highlight).filter(
                models.Highlight.match_id == match.id
            ).first()
            
            if not existing_highlight:
                league_name = match.league.name if match.league else "Unknown"
                if match_has_team_of_interest(match.home_team, match.away_team, league_name):
                    matches_to_process.append(match)
        
        if not matches_to_process:
            finished_with_highlights = sum(1 for m in finished_matches if db.query(models.Highlight).filter(models.Highlight.match_id == m.id).first())
            print(f"[Scheduler] All finished matches already have highlights ({finished_with_highlights}/{len(finished_matches)})")
            return
        
        print(f"[Scheduler] Found {len(matches_to_process)} finished matches needing highlights\n")
        
        youtube_service = get_youtube_service()
        
        for match in matches_to_process:
            matches_checked += 1
            league_name = match.league.name if match.league else None
            
            try:
                print(f"[Scheduler] [{matches_checked}/{len(matches_to_process)}] Searching: {match.home_team} vs {match.away_team} ({match.match_date})")
                
                videos = youtube_service.search_highlights(
                    home_team=match.home_team,
                    away_team=match.away_team,
                    league=league_name,
                    match_date=match.match_date,
                    max_results=1
                )
                
                if videos:
                    video = videos[0]
                    # Check if this highlight already exists
                    existing = db.query(models.Highlight).filter(
                        models.Highlight.match_id == match.id,
                        models.Highlight.youtube_video_id == video['video_id']
                    ).first()
                    
                    if not existing:
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
                        highlights_found += 1
                        print(f"[Scheduler] ✓ Found: {video['title'][:60]}...")
                    else:
                        print(f"[Scheduler] ℹ️  Highlight already exists: {video['title'][:60]}...")
                else:
                    print(f"[Scheduler] ✗ No highlights found yet")
                    
            except YouTubeQuotaExhaustedError:
                print(f"[Scheduler] YouTube quota exhausted - stopping")
                break
            except Exception as e:
                print(f"[Scheduler] Error: {e}")
                continue
        
        print(f"\n[Scheduler] ==================== RESULT ====================")
        print(f"[Scheduler] Matches checked: {matches_checked}")
        print(f"[Scheduler] Highlights found: {highlights_found}")
        print(f"[Scheduler] ====================================================\n")
        
    except Exception as e:
        print(f"[Scheduler] Error in fetch missing highlights job: {e}")
        db.rollback()
    finally:
        db.close()


async def reconcile_todays_matches():
    """
    Comprehensive reconciliation job that:
    1. Checks yesterday's matches are in DB (safety net for missed matches from prefetch)
    2. Re-fetches ALL of today's matches from ESPN (regardless of DB state)
    3. Ensures all matches exist in DB and are up-to-date
    4. Checks that all finished matches have highlights
    5. Triggers highlight fetch for any finished matches missing highlights
    
    This is a safety net to catch:
    - Matches that were missed during morning prefetch (e.g., Copa del Rey Barcelona vs Atletico)
    - Status updates that were missed
    - Missing highlights for finished matches
    
    Runs multiple times per day (noon, 6 PM, 11 PM) to ensure nothing is missed.
    """
    print(f"\n[Scheduler] ==================== RECONCILIATION JOB ====================")
    print(f"[Scheduler] Starting comprehensive match reconciliation at {datetime.now()}")
    
    db = SessionLocal()
    today = date.today()
    yesterday = today - timedelta(days=1)
    stats = {
        'matches_fetched': 0,
        'matches_added': 0,
        'matches_updated': 0,
        'highlights_found': 0,
        'highlights_missing': 0
    }
    
    try:
        football_api = get_football_api()
        
        # Step 0: CHECK YESTERDAY'S MATCHES (Safety net for missed matches)
        # This catches matches that should have been fetched during morning prefetch but weren't
        print(f"[Scheduler] Step 0: Checking yesterday's matches for completeness ({yesterday})...")
        
        yesterday_matches_db = db.query(models.Match).filter(
            models.Match.match_date == yesterday
        ).count()
        
        print(f"[Scheduler] Yesterday in DB: {yesterday_matches_db} matches")
        
        # Fetch yesterday from ESPN to verify we have everything
        yesterday_espn = await football_api.get_matches_for_date(yesterday)
        
        if yesterday_espn:
            yesterday_total_espn = sum(len(matches) for matches in yesterday_espn.values())
            print(f"[Scheduler] Yesterday on ESPN: {yesterday_total_espn} matches")
            
            if yesterday_total_espn > yesterday_matches_db:
                print(f"[Scheduler] ⚠️  ALERT: Missing {yesterday_total_espn - yesterday_matches_db} matches from yesterday!")
                print(f"[Scheduler] Re-fetching yesterday from ESPN...")
                
                # Re-fetch yesterday to add missing matches
                added_count = await fetch_matches_for_date(yesterday, db)
                if added_count > 0:
                    stats['matches_added'] += added_count
                    print(f"[Scheduler] ✓ Added {added_count} missing matches from yesterday")
        
        # Step 1: Fetch ALL today's matches from ESPN (fresh from source)
        print(f"[Scheduler] Step 1: Fetching all matches for {today} from ESPN API...")
        fixtures_by_league = await football_api.get_matches_for_date(today)
        
        if not fixtures_by_league:
            print(f"[Scheduler] No matches found on ESPN for {today}")
        else:
            all_espn_matches = []
            for league_name, matches in fixtures_by_league.items():
                all_espn_matches.extend([(league_name, match) for match in matches])
            
            stats['matches_fetched'] = len(all_espn_matches)
            print(f"[Scheduler] Found {len(all_espn_matches)} matches on ESPN")
            
            # Step 2: Ensure all matches exist in DB and are up-to-date
            print(f"[Scheduler] Step 2: Reconciling matches with database...")
            
            for league_name, match in all_espn_matches:
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
                
                # Find existing match
                existing = None
                if match.get("espn_event_id"):
                    existing = db.query(models.Match).filter(
                        models.Match.espn_event_id == match.get("espn_event_id")
                    ).first()
                
                if not existing:
                    existing = db.query(models.Match).filter(
                        models.Match.home_team == match["home_team"],
                        models.Match.away_team == match["away_team"],
                        models.Match.match_date == today
                    ).first()
                
                home_score = match.get("home_score")
                away_score = match.get("away_score")
                
                # Determine status: if has scores, mark as finished
                if home_score is not None and away_score is not None:
                    status = "finished"
                else:
                    status = match["status"]
                
                if existing:
                    # Update existing match if anything changed
                    changed = False
                    if existing.status != status:
                        existing.status = status
                        changed = True
                    if existing.home_score != home_score:
                        existing.home_score = home_score
                        changed = True
                    if existing.away_score != away_score:
                        existing.away_score = away_score
                        changed = True
                    
                    if changed:
                        db.commit()
                        stats['matches_updated'] += 1
                        print(f"[Scheduler] Updated: {match['home_team']} vs {match['away_team']} - {status} ({home_score}-{away_score})")
                else:
                    # Add new match (this was missed during prefetch!)
                    new_match = models.Match(
                        league_id=db_league.id,
                        home_team=match["home_team"],
                        away_team=match["away_team"],
                        home_score=home_score,
                        away_score=away_score,
                        match_date=today,
                        match_time=match.get("match_time"),
                        status=status,
                        espn_event_id=match.get("espn_event_id")
                    )
                    db.add(new_match)
                    db.commit()
                    stats['matches_added'] += 1
                    print(f"[Scheduler] ⚠️  ADDED MISSING MATCH: {match['home_team']} vs {match['away_team']}")
            
            # Step 3: Check all finished matches for highlights
            print(f"[Scheduler] Step 3: Checking highlights for finished matches...")
            
            finished_matches = db.query(models.Match).filter(
                models.Match.match_date == today,
                models.Match.status == 'finished'
            ).all()
            
            if not finished_matches:
                print(f"[Scheduler] No finished matches yet today")
            else:
                print(f"[Scheduler] Found {len(finished_matches)} finished matches")
                
                youtube_service = get_youtube_service()
                
                for match in finished_matches:
                    # Check if highlights exist
                    existing_highlight = db.query(models.Highlight).filter(
                        models.Highlight.match_id == match.id
                    ).first()
                    
                    if existing_highlight:
                        stats['highlights_found'] += 1
                        continue
                    
                    # Check if this is a match of interest
                    league_name = match.league.name if match.league else "Unknown"
                    if not match_has_team_of_interest(match.home_team, match.away_team, league_name):
                        continue
                    
                    # Missing highlights - try to fetch now
                    print(f"[Scheduler] ⚠️  Missing highlights: {match.home_team} vs {match.away_team}")
                    stats['highlights_missing'] += 1
                    
                    try:
                        videos = youtube_service.search_highlights(
                            home_team=match.home_team,
                            away_team=match.away_team,
                            league=league_name,
                            match_date=match.match_date,
                            max_results=1
                        )
                        
                        if videos:
                            video = videos[0]
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
                            print(f"[Scheduler] ✓ Found and added highlights!")
                            stats['highlights_found'] += 1
                            stats['highlights_missing'] -= 1
                        else:
                            print(f"[Scheduler] ✗ Highlights not available yet (will retry next run)")
                            
                    except YouTubeQuotaExhaustedError:
                        print(f"[Scheduler] YouTube quota exhausted - will retry in next reconciliation")
                        break
                    except Exception as e:
                        print(f"[Scheduler] Error fetching highlights: {e}")
                        continue
        
        # Print summary
        print(f"\n[Scheduler] ==================== RECONCILIATION SUMMARY ====================")
        print(f"[Scheduler] ESPN Matches Fetched (today): {stats['matches_fetched']}")
        print(f"[Scheduler] DB Matches Added: {stats['matches_added']}")
        print(f"[Scheduler] DB Matches Updated: {stats['matches_updated']}")
        print(f"[Scheduler] Finished Matches with Highlights: {stats['highlights_found']}")
        print(f"[Scheduler] Finished Matches Missing Highlights: {stats['highlights_missing']}")
        print(f"[Scheduler] ================================================================\n")
        
        # Alert if we added matches (means prefetch failed!)
        if stats['matches_added'] > 0:
            print(f"[Scheduler] ⚠️  WARNING: {stats['matches_added']} matches were missing from DB!")
            print(f"[Scheduler] ⚠️  This indicates the morning prefetch job failed or didn't run.")
        
    except Exception as e:
        print(f"[Scheduler] Error in reconciliation job: {e}")
        import traceback
        print(f"[Scheduler] Traceback: {traceback.format_exc()}")
        db.rollback()
    finally:
        db.close()


async def poll_rss_feeds_for_highlights():
    """
    Poll YouTube RSS feeds for recent highlights (runs every 10 minutes).
    This is FAST and FREE - no API quota used!
    
    Checks recent finished matches (last 48 hours) and searches RSS feeds
    for highlight videos. Much faster than hourly API-based search.
    """
    print(f"\n[RSS Poller] ==================== RSS FEED POLL ====================")
    print(f"[RSS Poller] Starting RSS feed polling at {datetime.now()}")
    
    db = SessionLocal()
    highlights_found = 0
    matches_checked = 0
    
    try:
        # Get finished matches from the last 48 hours without highlights
        lookback_date = date.today() - timedelta(days=2)
        
        finished_matches = db.query(models.Match).filter(
            models.Match.match_date >= lookback_date,
            models.Match.status == 'finished'
        ).all()
        
        if not finished_matches:
            print(f"[RSS Poller] No finished matches in the last 48 hours")
            return
        
        # Filter to matches without highlights and teams of interest
        matches_to_check = []
        for match in finished_matches:
            # Skip if already has highlights
            existing_highlight = db.query(models.Highlight).filter(
                models.Highlight.match_id == match.id
            ).first()
            
            if existing_highlight:
                continue
            
            # Check if it's a team of interest
            league_name = match.league.name if match.league else "Unknown"
            if match_has_team_of_interest(match.home_team, match.away_team, league_name):
                matches_to_check.append(match)
        
        if not matches_to_check:
            with_highlights = sum(1 for m in finished_matches if db.query(models.Highlight).filter(models.Highlight.match_id == m.id).first())
            print(f"[RSS Poller] All recent finished matches have highlights ({with_highlights}/{len(finished_matches)})")
            return
        
        print(f"[RSS Poller] Checking {len(matches_to_check)} matches needing highlights")
        
        rss_service = await get_rss_service()
        
        try:
            for match in matches_to_check:
                matches_checked += 1
                league_name = match.league.name if match.league else None
                
                if not league_name:
                    continue
                
                try:
                    print(f"[RSS Poller] Searching RSS: {match.home_team} vs {match.away_team} ({league_name})")
                    
                    # Search RSS feeds for this match (24 hour lookback)
                    videos = await rss_service.find_recent_highlights_for_match(
                        home_team=match.home_team,
                        away_team=match.away_team,
                        league_name=league_name,
                        match_date=match.match_date,
                        hours_lookback=24
                    )
                    
                    if videos:
                        video = videos[0]  # Take the first/best match
                        
                        # Check if this highlight already exists
                        existing = db.query(models.Highlight).filter(
                            models.Highlight.youtube_video_id == video['youtube_video_id']
                        ).first()
                        
                        if not existing:
                            # Create new highlight
                            highlight = models.Highlight(
                                match_id=match.id,
                                youtube_video_id=video['youtube_video_id'],
                                title=video['title'],
                                description=video.get('description'),
                                thumbnail_url=video.get('thumbnail_url'),
                                channel_title=video.get('channel_title'),
                                is_official=video.get('is_official', True),
                                published_at=video.get('published_at')
                            )
                            
                            db.add(highlight)
                            db.commit()
                            db.refresh(highlight)
                            
                            highlights_found += 1
                            print(f"[RSS Poller] ✅ Added highlight: {video['title']}")
                        else:
                            print(f"[RSS Poller] ℹ️  Highlight already exists")
                    else:
                        print(f"[RSS Poller] ❌ No highlights found yet")
                
                except Exception as e:
                    print(f"[RSS Poller] Error processing match {match.id}: {e}")
                    continue
        finally:
            await rss_service.close()
        
        print(f"[RSS Poller] ==================== RSS POLL COMPLETE ====================")
        print(f"[RSS Poller] Matches Checked: {matches_checked}")
        print(f"[RSS Poller] New Highlights Found: {highlights_found}")
        print(f"[RSS Poller] ===========================================================\n")
    
    except Exception as e:
        print(f"[RSS Poller] Error in RSS polling: {e}")
        import traceback
        print(f"[RSS Poller] Traceback: {traceback.format_exc()}")
        db.rollback()
    finally:
        db.close()


def start_scheduler():
    """Start the scheduler with configured jobs"""
    
    try:
        # Schedule the prefetch job to run daily at 6:00 AM local time
        scheduler.add_job(
            prefetch_upcoming_matches,
            CronTrigger(hour=6, minute=0),
            id="prefetch_matches",
            name="Daily Match Prefetch (Morning)",
            replace_existing=True
        )
        
        # Schedule SECOND prefetch at 6:00 PM to catch matches ESPN adds between 6 AM-6 PM
        # This reduces the maximum miss window from 24 hours to 12 hours
        # (ESPN often publishes cup match data with 3-7 day lead time, not always available at first check)
        scheduler.add_job(
            prefetch_upcoming_matches,
            CronTrigger(hour=18, minute=0),
            id="prefetch_matches_evening",
            name="Daily Match Prefetch (Evening)",
            replace_existing=True
        )
        
        # Schedule score refresh every 2 hours for status updates
        scheduler.add_job(
            refresh_today_scores,
            CronTrigger(hour='*/2', minute=0),  # Every 2 hours at :00
            id="refresh_scores",
            name="Score Status Refresh",
            replace_existing=True
        )
        
        # Schedule highlights fetch for yesterday's matches - 8 AM and 2 PM
        # Morning run: First attempt, no notification (highlights may still be uploading)
        scheduler.add_job(
            fetch_highlights_for_yesterday,
            CronTrigger(hour=8, minute=0),
            id="fetch_highlights_morning",
            name="Morning Highlights Fetch",
            replace_existing=True,
            kwargs={"send_notification": False}
        )
        
        # Afternoon run: Second attempt, send email if highlights still missing
        scheduler.add_job(
            fetch_highlights_for_yesterday,
            CronTrigger(hour=14, minute=0),
            id="fetch_highlights_afternoon",
            name="Afternoon Highlights Fetch",
            replace_existing=True,
            kwargs={"send_notification": True}
        )
        
        # Fetch highlights for today's finished matches every hour throughout the day
        # Matches happen at various times globally, highlights typically uploaded within 1-3 hours after match ends
        scheduler.add_job(
            fetch_highlights_for_today,
            CronTrigger(hour='8-23', minute=0),  # Every hour from 8 AM to 11 PM
            id="fetch_today_highlights",
            name="Today's Highlights Fetch",
            replace_existing=True
        )
        
        # Comprehensive reconciliation job - safety net to catch missed matches/highlights
        # Runs at noon, 6 PM, and 11 PM to ensure nothing is missed
        scheduler.add_job(
            reconcile_todays_matches,
            CronTrigger(hour='12,18,23', minute=0),  # 12 PM, 6 PM, 11 PM
            id="reconcile_matches",
            name="Daily Match Reconciliation",
            replace_existing=True
        )
        
        # RSS Feed Polling - FAST and FREE highlight discovery
        # Polls YouTube RSS feeds every 10 minutes for instant highlight detection
        # No API quota used, gives us highlights within 10-15 minutes of upload!
        scheduler.add_job(
            poll_rss_feeds_for_highlights,
            CronTrigger(minute='*/10'),  # Every 10 minutes
            id="rss_feed_polling",
            name="RSS Feed Polling (Every 10 min)",
            replace_existing=True
        )
        
        # Aggressive highlight retry - every 30 minutes for matches missing highlights
        # This ensures we catch highlights even if they're delayed
        scheduler.add_job(
            fetch_highlights_for_matches_missing_them,
            CronTrigger(minute='*/30'),  # Every 30 minutes
            id="aggressive_highlight_retry",
            name="Aggressive Highlight Retry (Every 30 min)",
            replace_existing=True
        )
        
        scheduler.start()
        print("[Scheduler] Started! Jobs scheduled:")
        print("  - Daily prefetch at 6:00 AM (7-day lookahead)")
        print("  - Daily prefetch at 6:00 PM (catch late ESPN data updates)")
        print("  - Score status refresh every 2 hours")
        print("  - Highlights fetch at 8 AM and 2 PM (yesterday's matches)")
        print("  - Today's highlights fetch every hour (8 AM - 11 PM)")
        print("  - Match reconciliation at 12 PM, 6 PM, 11 PM (safety net)")
        print("  - 🚀 RSS feed polling every 10 minutes (FAST & FREE!)")
        print("  - ⚡ Aggressive highlight retry every 30 minutes (catch delayed uploads)")
        print("[Scheduler] Note: RSS polling provides highlights 10-15 min after upload!")
    except Exception as e:
        print(f"[Scheduler] Warning: Failed to start scheduler: {e}")
        print("[Scheduler] Application will continue without scheduled jobs")


def shutdown_scheduler():
    """Gracefully shutdown the scheduler"""
    try:
        if scheduler.running:
            scheduler.shutdown(wait=False)
            print("[Scheduler] Shutdown complete")
    except Exception as e:
        print(f"[Scheduler] Warning: Error during shutdown: {e}")
