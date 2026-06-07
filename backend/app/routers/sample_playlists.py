from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/sample-playlists", tags=["sample-playlists"])


class SamplePlaylistSchema(schemas.BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    song_count: Optional[int] = 0

    class Config:
        from_attributes = True


class SamplePlaylistSongSchema(schemas.BaseModel):
    id: int
    title: str
    artist: Optional[str]
    youtube_video_id: str
    description: Optional[str]
    thumbnail_url: Optional[str]
    channel_title: Optional[str]
    published_at: Optional[datetime]
    view_count: Optional[int]
    duration: Optional[str]
    position: int

    class Config:
        from_attributes = True


class SamplePlaylistDetailSchema(SamplePlaylistSchema):
    songs: List[SamplePlaylistSongSchema]


@router.get("", response_model=List[SamplePlaylistSchema])
async def get_sample_playlists(db: Session = Depends(get_db)):
    """Get all sample playlists"""
    playlists = db.query(models.SamplePlaylist).all()
    
    result = []
    for playlist in playlists:
        result.append({
            "id": playlist.id,
            "name": playlist.name,
            "description": playlist.description,
            "created_at": playlist.created_at,
            "updated_at": playlist.updated_at,
            "song_count": len(playlist.songs)
        })
    
    return result


@router.get("/{playlist_id}", response_model=SamplePlaylistDetailSchema)
async def get_sample_playlist(playlist_id: int, db: Session = Depends(get_db)):
    """Get a specific sample playlist with all songs"""
    playlist = db.query(models.SamplePlaylist).options(
        joinedload(models.SamplePlaylist.songs)
    ).filter(models.SamplePlaylist.id == playlist_id).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    return {
        "id": playlist.id,
        "name": playlist.name,
        "description": playlist.description,
        "created_at": playlist.created_at,
        "updated_at": playlist.updated_at,
        "songs": sorted(playlist.songs, key=lambda x: x.position)
    }


@router.post("", response_model=SamplePlaylistSchema)
async def create_sample_playlist(
    name: str,
    description: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Create a new sample playlist"""
    playlist = models.SamplePlaylist(
        name=name,
        description=description
    )
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    
    return {
        "id": playlist.id,
        "name": playlist.name,
        "description": playlist.description,
        "created_at": playlist.created_at,
        "updated_at": playlist.updated_at,
        "song_count": 0
    }


@router.post("/{playlist_id}/songs")
async def add_song_to_sample_playlist(
    playlist_id: int,
    title: str,
    youtube_video_id: str,
    artist: Optional[str] = None,
    description: Optional[str] = None,
    thumbnail_url: Optional[str] = None,
    channel_title: Optional[str] = None,
    published_at: Optional[datetime] = None,
    view_count: Optional[int] = None,
    duration: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Add a song to a sample playlist"""
    playlist = db.query(models.SamplePlaylist).filter(
        models.SamplePlaylist.id == playlist_id
    ).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Get next position
    max_position = db.query(models.SamplePlaylistSong).filter(
        models.SamplePlaylistSong.playlist_id == playlist_id
    ).count()
    
    song = models.SamplePlaylistSong(
        playlist_id=playlist_id,
        title=title,
        artist=artist,
        youtube_video_id=youtube_video_id,
        description=description,
        thumbnail_url=thumbnail_url,
        channel_title=channel_title,
        published_at=published_at,
        view_count=view_count,
        duration=duration,
        position=max_position + 1
    )
    db.add(song)
    db.commit()
    db.refresh(song)
    
    return {
        "id": song.id,
        "title": song.title,
        "artist": song.artist,
        "youtube_video_id": song.youtube_video_id,
        "position": song.position
    }


@router.delete("/{playlist_id}")
async def delete_sample_playlist(playlist_id: int, db: Session = Depends(get_db)):
    """Delete a sample playlist and all its songs"""
    playlist = db.query(models.SamplePlaylist).filter(
        models.SamplePlaylist.id == playlist_id
    ).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    db.delete(playlist)
    db.commit()
    
    return {"message": "Playlist deleted successfully"}


@router.delete("/{playlist_id}/songs/{song_id}")
async def remove_song_from_sample_playlist(
    playlist_id: int,
    song_id: int,
    db: Session = Depends(get_db)
):
    """Remove a song from a sample playlist"""
    song = db.query(models.SamplePlaylistSong).filter(
        models.SamplePlaylistSong.id == song_id,
        models.SamplePlaylistSong.playlist_id == playlist_id
    ).first()
    
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    db.delete(song)
    db.commit()
    
    return {"message": "Song removed successfully"}
