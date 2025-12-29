from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from ..models_users import User, UserPlaylist, UserPlaylistSong
from .auth import get_current_user

router = APIRouter(
    prefix="/api/playlists",
    tags=["playlists"]
)


class CreatePlaylistRequest(BaseModel):
    title: str
    description: Optional[str] = None
    is_public: bool = False
    playlist_type: str = 'music'  # 'music' or 'entertainment'


class AddSongToPlaylistRequest(BaseModel):
    song_id: int
    content_type: str = 'song'  # 'song' or 'entertainment'


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
    playlist_type: str
    created_at: str
    updated_at: str
    song_count: int
    songs: List[PlaylistSong] = []
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[PlaylistResponse])
async def get_user_playlists(
    playlist_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all playlists for the current user, optionally filtered by type"""
    
    query = """
        SELECT 
            p.id,
            p.title,
            p.description,
            p.is_public,
            p.playlist_type,
            p.created_at,
            p.updated_at,
            COUNT(ps.id) as song_count
        FROM user_playlists p
        LEFT JOIN user_playlist_songs ps ON p.id = ps.playlist_id
        WHERE p.user_id = :user_id
    """
    
    params = {"user_id": current_user.id}
    
    if playlist_type:
        query += " AND p.playlist_type = :playlist_type"
        params["playlist_type"] = playlist_type
    
    query += """
        GROUP BY p.id, p.title, p.description, p.is_public, p.playlist_type, p.created_at, p.updated_at
        ORDER BY p.updated_at DESC
    """
    
    result = db.execute(text(query), params)
    playlists = []
    
    for row in result:
        playlists.append(PlaylistResponse(
            id=row.id,
            title=row.title,
            description=row.description,
            is_public=row.is_public,
            playlist_type=row.playlist_type,
            created_at=row.created_at.isoformat(),
            updated_at=row.updated_at.isoformat(),
            song_count=row.song_count,
            songs=[]
        ))
    
    return playlists


@router.post("/", response_model=PlaylistResponse)
async def create_playlist(
    request: CreatePlaylistRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new playlist for the current user"""
    
    playlist = UserPlaylist(
        user_id=current_user.id,
        title=request.title,
        description=request.description,
        is_public=request.is_public,
        playlist_type=request.playlist_type
    )
    
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    
    return PlaylistResponse(
        id=playlist.id,
        title=playlist.title,
        description=playlist.description,
        is_public=playlist.is_public,
        playlist_type=playlist.playlist_type,
        created_at=playlist.created_at.isoformat(),
        updated_at=playlist.updated_at.isoformat(),
        song_count=0,
        songs=[]
    )


@router.get("/{playlist_id}", response_model=PlaylistResponse)
async def get_playlist(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
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
            p.playlist_type,
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
    
    # Get all items in the playlist (both songs and entertainment)
    items_query = """
        SELECT 
            ps.item_id,
            ps.content_type,
            ps.position
        FROM user_playlist_songs ps
        WHERE ps.playlist_id = :playlist_id
        ORDER BY ps.position
    """
    
    items_result = db.execute(text(items_query), {"playlist_id": playlist_id})
    songs = []
    
    for row in items_result:
        if row.content_type == 'entertainment':
            # Fetch from entertainment table
            ent_query = """
                SELECT 
                    e.id,
                    e.title,
                    e.youtube_video_id as "videoId",
                    e.start_seconds as "startSeconds",
                    e.end_seconds as "endSeconds"
                FROM entertainment e
                WHERE e.id = :item_id
            """
            ent_result = db.execute(text(ent_query), {"item_id": row.item_id}).fetchone()
            if ent_result:
                songs.append(PlaylistSong(
                    id=ent_result.id,
                    title=ent_result.title,
                    language="Entertainment",  # Default for entertainment
                    year=None,
                    composer="",
                    videoId=ent_result.videoId,
                    movie=None,
                    startSeconds=ent_result.startSeconds,
                    endSeconds=ent_result.endSeconds,
                    position=row.position
                ))
        else:
            # Fetch from songs table
            song_query = """
                SELECT 
                    s.id,
                    s.title,
                    s.language,
                    s.year,
                    a.name as composer,
                    s.youtube_video_id as "videoId",
                    s.album as movie,
                    s.start_seconds as "startSeconds",
                    s.end_seconds as "endSeconds"
                FROM songs s
                LEFT JOIN artists a ON s.artist_id = a.id
                WHERE s.id = :item_id
            """
            song_result = db.execute(text(song_query), {"item_id": row.item_id}).fetchone()
            if song_result:
                songs.append(PlaylistSong(
                    id=song_result.id,
                    title=song_result.title,
                    language=song_result.language,
                    year=song_result.year,
                    composer=song_result.composer or "Unknown",
                    videoId=song_result.videoId,
                    movie=song_result.movie,
                    startSeconds=song_result.startSeconds,
                    endSeconds=song_result.endSeconds,
                    position=row.position
                ))
    
    return PlaylistResponse(
        id=playlist_result.id,
        title=playlist_result.title,
        description=playlist_result.description,
        is_public=playlist_result.is_public,
        playlist_type=playlist_result.playlist_type,
        created_at=playlist_result.created_at.isoformat(),
        updated_at=playlist_result.updated_at.isoformat(),
        song_count=len(songs),
        songs=songs
    )


@router.post("/{playlist_id}/songs")
async def add_song_to_playlist(
    playlist_id: int,
    request: AddSongToPlaylistRequest,
    current_user: User = Depends(get_current_user),
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
    
    # Check if item exists in the appropriate table
    if request.content_type == 'entertainment':
        item_check = db.execute(text("""
            SELECT id FROM entertainment WHERE id = :item_id
        """), {"item_id": request.song_id}).fetchone()
        if not item_check:
            raise HTTPException(status_code=404, detail="Entertainment item not found")
    else:
        item_check = db.execute(text("""
            SELECT id FROM songs WHERE id = :item_id
        """), {"item_id": request.song_id}).fetchone()
        if not item_check:
            raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if item is already in playlist
    existing = db.execute(text("""
        SELECT id FROM user_playlist_songs 
        WHERE playlist_id = :playlist_id AND item_id = :item_id AND content_type = :content_type
    """), {"playlist_id": playlist_id, "item_id": request.song_id, "content_type": request.content_type}).fetchone()
    
    if existing:
        raise HTTPException(status_code=400, detail="Item already in playlist")
    
    # Get the next position
    max_position = db.execute(text("""
        SELECT COALESCE(MAX(position), 0) as max_pos 
        FROM user_playlist_songs 
        WHERE playlist_id = :playlist_id
    """), {"playlist_id": playlist_id}).fetchone()
    
    next_position = max_position.max_pos + 1
    
    # Add the item
    playlist_song = UserPlaylistSong(
        playlist_id=playlist_id,
        song_id=request.song_id,
        content_type=request.content_type,
        item_id=request.song_id,
        position=next_position
    )
    
    db.add(playlist_song)
    db.commit()
    
    return {"message": "Song added to playlist", "position": next_position}


@router.delete("/{playlist_id}/songs/{song_id}")
async def remove_song_from_playlist(
    playlist_id: int,
    song_id: int,
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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