from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import logging
import re
from ..database import get_db
from ..models_users import UserSubmittedSong, User, UserPlaylistSong, UserPlaylist
from .auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/user-songs",
    tags=["user-songs"]
)


class SubmittedSongResponse(BaseModel):
    id: int
    title: str
    artist: Optional[str]
    youtube_video_id: str
    youtube_url: str
    duration: Optional[int]
    thumbnail_url: Optional[str]
    status: str
    added_to_playlist: bool
    created_at: datetime
    admin_notes: Optional[str] = None
    
    class Config:
        from_attributes = True


class SubmitSongRequest(BaseModel):
    song_name: str
    youtube_url: str


class SubmitSongResponse(BaseModel):
    success: bool
    message: str
    song: Optional[SubmittedSongResponse] = None
    error: Optional[str] = None


def extract_video_id_from_url(youtube_url: str) -> str:
    """Extract video ID from YouTube URL"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, youtube_url)
        if match:
            return match.group(1)
    
    raise HTTPException(status_code=400, detail="Could not extract video ID from URL. Please provide a valid YouTube URL.")


@router.post("/submit", response_model=SubmitSongResponse)
async def submit_song(
    request: SubmitSongRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a song to user's playlist.
    """
    try:
        logger.info(f"User {current_user.id} submitting song: {request.song_name}")
        
        # Extract video ID from URL
        video_id = extract_video_id_from_url(request.youtube_url)
        logger.info(f"Extracted video ID: {video_id}")
        
        # Check if already submitted by this user
        existing = db.query(UserSubmittedSong).filter(
            UserSubmittedSong.youtube_video_id == video_id,
            UserSubmittedSong.user_id == current_user.id
        ).first()
        
        if existing:
            logger.warning(f"User {current_user.id} already submitted video {video_id}")
            return SubmitSongResponse(
                success=False,
                message="",
                error="You have already submitted this song"
            )
        
        # Create submitted song record
        submitted_song = UserSubmittedSong(
            user_id=current_user.id,
            youtube_url=request.youtube_url,
            youtube_video_id=video_id,
            title=request.song_name,
            artist=None,
            duration=None,
            thumbnail_url=f"https://img.youtube.com/vi/{video_id}/default.jpg",
        )
        
        db.add(submitted_song)
        db.commit()
        db.refresh(submitted_song)
        logger.info(f"Created submitted song record: {submitted_song.id}")
        
        # Automatically add to user's music playlist (or create one)
        playlist = db.query(UserPlaylist).filter(
            UserPlaylist.user_id == current_user.id,
            UserPlaylist.playlist_type == 'music'
        ).first()
        
        # If no music playlist exists, create one
        if not playlist:
            logger.info(f"Creating default music playlist for user {current_user.id}")
            playlist = UserPlaylist(
                user_id=current_user.id,
                title=f"{current_user.name}'s playlist",
                description="My personal music playlist",
                playlist_type='music'
            )
            db.add(playlist)
            db.commit()
            db.refresh(playlist)
        
        # Add to playlist
        playlist_song = UserPlaylistSong(
            playlist_id=playlist.id,
            song_id=-submitted_song.id,
            content_type='submitted_song',
            item_id=submitted_song.id,
            position=db.query(UserPlaylistSong).filter(
                UserPlaylistSong.playlist_id == playlist.id
            ).count() + 1
        )
        db.add(playlist_song)
        
        submitted_song.added_to_playlist = True
        db.commit()
        logger.info(f"Added song to playlist {playlist.id}")
        
        return SubmitSongResponse(
            success=True,
            message="Song added to your playlist!",
            song=SubmittedSongResponse.from_orm(submitted_song)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting song for user {current_user.id}: {str(e)}", exc_info=True)
        return SubmitSongResponse(
            success=False,
            message="",
            error=str(e)
        )


@router.get("/my-submissions", response_model=List[SubmittedSongResponse])
async def get_my_submissions(
    status: Optional[str] = Query(None, description="Filter by status: pending, approved, rejected"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's submitted songs"""
    query = db.query(UserSubmittedSong).filter(UserSubmittedSong.user_id == current_user.id)
    
    if status:
        query = query.filter(UserSubmittedSong.status == status)
    
    submissions = query.order_by(UserSubmittedSong.created_at.desc()).all()
    return submissions


@router.get("/pending", response_model=List[SubmittedSongResponse])
async def get_pending_songs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Admin only: Get all pending songs awaiting review
    """
    # Check if user is admin (you'll need to add an is_admin field to User model)
    if not getattr(current_user, 'is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    pending_songs = db.query(UserSubmittedSong).filter(
        UserSubmittedSong.status == "pending"
    ).order_by(UserSubmittedSong.created_at.asc()).all()
    
    return pending_songs


@router.post("/review/{song_id}")
async def review_song(
    song_id: int,
    status: str = Query(..., description="'approved' or 'rejected'"),
    notes: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Admin only: Review and approve/reject a submitted song
    """
    # Check if user is admin
    if not getattr(current_user, 'is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
    
    song = db.query(UserSubmittedSong).filter(UserSubmittedSong.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    song.status = status
    song.admin_notes = notes
    song.reviewed_at = datetime.utcnow()
    song.reviewed_by = current_user.id
    
    db.commit()
    db.refresh(song)
    
    return {
        "success": True,
        "message": f"Song {status} successfully",
        "song": SubmittedSongResponse.from_orm(song)
    }
