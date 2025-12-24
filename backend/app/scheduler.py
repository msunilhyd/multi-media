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
from .youtube_service import get_youtube_service, YouTubeQuotaExhaustedError
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
                    
                    # Auto-set status to finished if match has scores
                    if home_score is not None and away_score is not None:
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
                    
                    # Auto-set status to finished if match has scores
                    if home_score is not None and away_score is not None:
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
        print(f"[Scheduler] Error fetching matches for {target_date}: {e}")
        db.rollback()
    
    return match_count


async def prefetch_upcoming_matches():
    """
    Daily job to pre-fetch matches for the next 7 days.
    Only fetches dates that haven't been fetched yet (smart incremental fetch).
    Also refreshes today's matches to get updated scores/status.
    """
    print(f"\n[Scheduler] Starting daily match prefetch at {datetime.now()}")
    
    db = SessionLocal()
    today = date.today()
    total_new_matches = 0
    dates_fetched = 0
    
    try:
        for i in range(7):
            target_date = today + timedelta(days=i)
            
            # Check if we've already fetched this date
            already_fetched = db.query(models.FetchedDate).filter(
                models.FetchedDate.fetch_date == target_date
            ).first()
            
            # Always refresh today (to get score updates)
            # For other days, only fetch if not already in DB
            if i == 0 or not already_fetched:
                print(f"[Scheduler] Fetching matches for {target_date}...")
                
                # If it's today and already fetched, we're just updating
                if i == 0 and already_fetched:
                    print(f"[Scheduler] Refreshing today's matches for score updates")
                
                match_count = await fetch_matches_for_date(target_date, db)
                total_new_matches += match_count
                dates_fetched += 1
                
                # Mark date as fetched
                if not already_fetched:
                    fetched_record = models.FetchedDate(fetch_date=target_date)
                    db.merge(fetched_record)
                    try:
                        db.commit()
                    except:
                        db.rollback()
                
                print(f"[Scheduler] Fetched {match_count} new matches for {target_date}")
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
        db.rollback()
    finally:
        db.close()
    
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
                    max_results=1
                )
                
                if videos:
                    video = videos[0]
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
                        duration=video.get('duration', ''),
                        is_official=video.get('is_official', False)
                    )
                    db.add(highlight)
                    db.commit()
                    highlights_found += 1
                    print(f"[Scheduler] ✓ Found: {video['title'][:50]}...")
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
                        duration=video.get('duration', ''),
                        is_official=video.get('is_official', False)
                    )
                    db.add(highlight)
                    db.commit()
                    highlights_found += 1
                    print(f"[Scheduler] ✓ Found: {video['title'][:50]}...")
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


def start_scheduler():
    """Start the scheduler with configured jobs"""
    
    try:
        # Schedule the prefetch job to run daily at 6:00 AM local time
        scheduler.add_job(
            prefetch_upcoming_matches,
            CronTrigger(hour=6, minute=0),
            id="prefetch_matches",
            name="Daily Match Prefetch",
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
            CronTrigger(hour='12-23', minute=0),  # Every hour from 12 PM to 11 PM
            id="fetch_today_highlights",
            name="Today's Highlights Fetch",
            replace_existing=True
        )
        
        scheduler.start()
        print("[Scheduler] Started! Jobs scheduled:")
        print("  - Daily prefetch at 6:00 AM")
        print("  - Score status refresh every 2 hours")
        print("  - Highlights fetch at 8 AM and 2 PM (yesterday's matches)")
        print("  - Today's highlights fetch every hour (12 PM - 11 PM)")
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
