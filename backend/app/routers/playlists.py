from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from ..models_users import User, UserPlaylist, UserPlaylistSong

router = APIRouter(
    prefix="/api/playlists",
    tags=["playlists"]
)

def get_current_user_by_email(user_email: str = Header(..., alias="x-user-email"), db: Session = Depends(get_db)) -> User:
    """Get current user by email from header (temporary implementation)"""
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


class CreatePlaylistRequest(BaseModel):
    title: str
    description: Optional[str] = None
    is_public: bool = False


class AddSongToPlaylistRequest(BaseModel):
    song_id: int


class PlaylistSong(BaseModel):
    id: int
    title: str
    language: str
    year: Optional[str] = None
    composer: str
    videoId: str
    movie: Optional[str] = None
    startSeconds: Optional[int] = None
    endSeconds: Optional[int] = None
    position: int
    
    class Config:
        from_attributes = True


class PlaylistResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    is_public: bool
    created_at: str
    updated_at: str
    song_count: int
    songs: List[PlaylistSong] = []
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[PlaylistResponse])
async def get_user_playlists(
    current_user: User = Depends(get_current_user_by_email),
    db: Session = Depends(get_db)
):
    """Get all playlists for the current user"""
    
    query = """
        SELECT 
            p.id,
            p.title,
            p.description,
            p.is_public,
            p.created_at,
            p.updated_at,
            COUNT(ps.id) as song_count
        FROM user_playlists p
        LEFT JOIN user_playlist_songs ps ON p.id = ps.playlist_id
        WHERE p.user_id = :user_id
        GROUP BY p.id, p.title, p.description, p.is_public, p.created_at, p.updated_at
        ORDER BY p.updated_at DESC
    """
    
    result = db.execute(text(query), {"user_id": current_user.id})
    playlists = []
    
    for row in result:
        playlists.append(PlaylistResponse(
            id=row.id,
            title=row.title,
            description=row.description,
            is_public=row.is_public,
            created_at=row.created_at.isoformat(),
            updated_at=row.updated_at.isoformat(),
            song_count=row.song_count,
            songs=[]
        ))
    
    return playlists


@router.post("/", response_model=PlaylistResponse)
async def create_playlist(
    request: CreatePlaylistRequest,
    current_user: User = Depends(get_current_user_by_email),
    db: Session = Depends(get_db)
):
    """Create a new playlist for the current user"""
    
    playlist = UserPlaylist(
        user_id=current_user.id,
        title=request.title,
        description=request.description,
        is_public=request.is_public
    )
    
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    
    return PlaylistResponse(
        id=playlist.id,
        title=playlist.title,
        description=playlist.description,
        is_public=playlist.is_public,
        created_at=playlist.created_at.isoformat(),
        updated_at=playlist.updated_at.isoformat(),
        song_count=0,
        songs=[]
    )


@router.get("/{playlist_id}", response_model=PlaylistResponse)
async def get_playlist(
    playlist_id: int,
    current_user: User = Depends(get_current_user_by_email),
    db: Session = Depends(get_db)
):
    """Get a specific playlist with all its songs"""
    
    # First check if the playlist exists and belongs to the user
    playlist_query = """
        SELECT 
            p.id,
            p.title,
            p.description,
            p.is_public,
            p.created_at,
            p.updated_at
        FROM user_playlists p
        WHERE p.id = :playlist_id AND p.user_id = :user_id
    """
    
    playlist_result = db.execute(text(playlist_query), {
        "playlist_id": playlist_id, 
        "user_id": current_user.id
    }).fetchone()
    
    if not playlist_result:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Get all songs in the playlist
    songs_query = """
        SELECT 
            s.id,
            s.title,
            s.language,
            s.year,
            a.name as composer,
            s.youtube_video_id as "videoId",
            s.album as movie,
            s.start_seconds as "startSeconds",
            s.end_seconds as "endSeconds",
            ps.position
        FROM user_playlist_songs ps
        JOIN songs s ON ps.song_id = s.id
        LEFT JOIN artists a ON s.artist_id = a.id
        WHERE ps.playlist_id = :playlist_id
        ORDER BY ps.position
    """
    
    songs_result = db.execute(text(songs_query), {"playlist_id": playlist_id})
    songs = []
    
    for row in songs_result:
        songs.append(PlaylistSong(
            id=row.id,
            title=row.title,
            language=row.language,
            year=row.year,
            composer=row.composer or "Unknown",
            videoId=row.videoId,
            movie=row.movie,
            startSeconds=row.startSeconds,
            endSeconds=row.endSeconds,
            position=row.position
        ))
    
    return PlaylistResponse(
        id=playlist_result.id,
        title=playlist_result.title,
        description=playlist_result.description,
        is_public=playlist_result.is_public,
        created_at=playlist_result.created_at.isoformat(),
        updated_at=playlist_result.updated_at.isoformat(),
        song_count=len(songs),
        songs=songs
    )


@router.post("/{playlist_id}/songs")
async def add_song_to_playlist(
    playlist_id: int,
    request: AddSongToPlaylistRequest,
    current_user: User = Depends(get_current_user_by_email),
    db: Session = Depends(get_db)
):
    """Add a song to a playlist"""
    
    # Check if playlist exists and belongs to user
    playlist_check = db.execute(text("""
        SELECT id FROM user_playlists 
        WHERE id = :playlist_id AND user_id = :user_id
    """), {"playlist_id": playlist_id, "user_id": current_user.id}).fetchone()
    
    if not playlist_check:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Check if song exists
    song_check = db.execute(text("""
        SELECT id FROM songs WHERE id = :song_id
    """), {"song_id": request.song_id}).fetchone()
    
    if not song_check:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if song is already in playlist
    existing = db.execute(text("""
        SELECT id FROM user_playlist_songs 
        WHERE playlist_id = :playlist_id AND song_id = :song_id
    """), {"playlist_id": playlist_id, "song_id": request.song_id}).fetchone()
    
    if existing:
        raise HTTPException(status_code=400, detail="Song already in playlist")
    
    # Get the next position
    max_position = db.execute(text("""
        SELECT COALESCE(MAX(position), 0) as max_pos 
        FROM user_playlist_songs 
        WHERE playlist_id = :playlist_id
    """), {"playlist_id": playlist_id}).fetchone()
    
    next_position = max_position.max_pos + 1
    
    # Add the song
    playlist_song = UserPlaylistSong(
        playlist_id=playlist_id,
        song_id=request.song_id,
        position=next_position
    )
    
    db.add(playlist_song)
    db.commit()
    
    return {"message": "Song added to playlist", "position": next_position}


@router.delete("/{playlist_id}/songs/{song_id}")
async def remove_song_from_playlist(
    playlist_id: int,
    song_id: int,
    current_user: User = Depends(get_current_user_by_email),
    db: Session = Depends(get_db)
):
    """Remove a song from a playlist"""
    
    # Check if playlist exists and belongs to user
    playlist_check = db.execute(text("""
        SELECT id FROM user_playlists 
        WHERE id = :playlist_id AND user_id = :user_id
    """), {"playlist_id": playlist_id, "user_id": current_user.id}).fetchone()
    
    if not playlist_check:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Remove the song
    result = db.execute(text("""
        DELETE FROM user_playlist_songs 
        WHERE playlist_id = :playlist_id AND song_id = :song_id
        RETURNING position
    """), {"playlist_id": playlist_id, "song_id": song_id})
    
    deleted_row = result.fetchone()
    if not deleted_row:
        raise HTTPException(status_code=404, detail="Song not found in playlist")
    
    deleted_position = deleted_row.position
    
    # Reorder remaining songs
    db.execute(text("""
        UPDATE user_playlist_songs 
        SET position = position - 1 
        WHERE playlist_id = :playlist_id AND position > :deleted_position
    """), {"playlist_id": playlist_id, "deleted_position": deleted_position})
    
    db.commit()
    
    return {"message": "Song removed from playlist"}


@router.delete("/{playlist_id}")
async def delete_playlist(
    playlist_id: int,
    current_user: User = Depends(get_current_user_by_email),
    db: Session = Depends(get_db)
):
    """Delete a playlist"""
    
    # Check if playlist exists and belongs to user
    result = db.execute(text("""
        DELETE FROM user_playlists 
        WHERE id = :playlist_id AND user_id = :user_id
        RETURNING id
    """), {"playlist_id": playlist_id, "user_id": current_user.id})
    
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    db.commit()
    return {"message": "Playlist deleted"}