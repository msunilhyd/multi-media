from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import yt_dlp
import logging
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
    youtube_url: str


class SubmitSongResponse(BaseModel):
    success: bool
    message: str
    song: Optional[SubmittedSongResponse] = None
    error: Optional[str] = None


def extract_youtube_details(youtube_url: str) -> dict:
    """Extract video details from YouTube URL using yt-dlp"""
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_audio': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            
            return {
                'video_id': info.get('id'),
                'title': info.get('title', 'Unknown'),
                'duration': info.get('duration'),  # in seconds
                'thumbnail': info.get('thumbnail'),
                'uploader': info.get('uploader'),
            }
    except Exception as e:
        logger.error(f"Error extracting YouTube details: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Could not extract video details: {str(e)}")


@router.post("/submit", response_model=SubmitSongResponse)
async def submit_song(
    request: SubmitSongRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a YouTube song for admin review.
    Users can optionally add it to their playlist immediately.
    """
    try:
        # Extract YouTube video details
        video_details = extract_youtube_details(request.youtube_url)
        
        # Check if already submitted
        existing = db.query(UserSubmittedSong).filter(
            UserSubmittedSong.youtube_video_id == video_details['video_id'],
            UserSubmittedSong.user_id == current_user.id
        ).first()
        
        if existing:
            return SubmitSongResponse(
                success=False,
                message="You have already submitted this song",
                error="Duplicate submission"
            )
        
        # Create submitted song record
        submitted_song = UserSubmittedSong(
            user_id=current_user.id,
            youtube_url=request.youtube_url,
            youtube_video_id=video_details['video_id'],
            title=video_details['title'],
            artist=video_details.get('uploader'),
            duration=video_details.get('duration'),
            thumbnail_url=video_details.get('thumbnail'),
        )
        
        db.add(submitted_song)
        db.commit()
        db.refresh(submitted_song)
        
        # Automatically add to user's first playlist (or create one)
        playlist = db.query(UserPlaylist).filter(
            UserPlaylist.user_id == current_user.id,
            UserPlaylist.playlist_type == 'music'
        ).first()
        
        # If no music playlist exists, create one
        if not playlist:
            playlist = UserPlaylist(
                user_id=current_user.id,
                title="My Music",
                description="My personal music submissions",
                playlist_type='music'
            )
            db.add(playlist)
            db.commit()
            db.refresh(playlist)
        
        # Add to playlist
        playlist_song = UserPlaylistSong(
            playlist_id=playlist.id,
            song_id=-submitted_song.id,  # Negative ID to indicate submitted song
            content_type='submitted_song',
            item_id=submitted_song.id,
            position=db.query(UserPlaylistSong).filter(
                UserPlaylistSong.playlist_id == playlist.id
            ).count() + 1
        )
        db.add(playlist_song)
        
        submitted_song.added_to_playlist = True
        db.commit()
        
        return SubmitSongResponse(
            success=True,
            message="Song added to your playlist! It will be reviewed by admins.",
            song=SubmittedSongResponse.from_orm(submitted_song)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting song: {str(e)}")
        return SubmitSongResponse(
            success=False,
            message="Error submitting song",
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
