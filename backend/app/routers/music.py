from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from ..database import get_db
from pydantic import BaseModel

router = APIRouter(
    prefix="/music",
    tags=["music"]
)


class Artist(BaseModel):
    id: int
    name: str
    slug: str
    language: Optional[str] = None
    
    class Config:
        from_attributes = True


class Song(BaseModel):
    id: int
    title: str
    language: str
    year: Optional[str] = None
    composer: str
    videoId: str
    movie: Optional[str] = None
    startSeconds: Optional[int] = None
    endSeconds: Optional[int] = None
    
    class Config:
        from_attributes = True


class SongListResponse(BaseModel):
    songs: List[Song]
    total: int
    page: int
    page_size: int


@router.get("/songs", response_model=List[Song])
async def get_songs(
    language: Optional[str] = Query(None, description="Filter by language (ENGLISH, HINDI, TAMIL, etc.)"),
    search: Optional[str] = Query(None, description="Search in title, artist, or movie"),
    year: Optional[str] = Query(None, description="Filter by year"),
    artist: Optional[str] = Query(None, description="Filter by artist/composer name"),
    limit: int = Query(100, ge=1, le=500, description="Number of songs to return"),
    offset: int = Query(0, ge=0, description="Number of songs to skip"),
    db: Session = Depends(get_db)
):
    """
    Get songs with optional filters.
    
    - **language**: Filter by language (ENGLISH, HINDI, TAMIL, TELUGU, etc.)
    - **search**: Search in title, artist name, or movie name
    - **year**: Filter by year
    - **artist**: Filter by artist/composer name
    - **limit**: Maximum number of songs to return (default: 100, max: 500)
    - **offset**: Number of songs to skip for pagination
    """
    
    # Build the query
    query = """
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
        WHERE 1=1
    """
    
    params = {}
    
    # Apply filters
    if language:
        query += " AND s.language = :language"
        params['language'] = language.upper()
    
    if search:
        query += " AND (s.title ILIKE :search OR a.name ILIKE :search OR s.album ILIKE :search)"
        params['search'] = f"%{search}%"
    
    if year:
        query += " AND s.year = :year"
        params['year'] = year
    
    if artist:
        query += " AND a.name ILIKE :artist"
        params['artist'] = f"%{artist}%"
    
    # Add ordering and pagination
    query += " ORDER BY s.id DESC LIMIT :limit OFFSET :offset"
    params['limit'] = limit
    params['offset'] = offset
    
    # Execute query
    result = db.execute(text(query), params)
    songs = []
    
    for row in result:
        songs.append(Song(
            id=row.id,
            title=row.title,
            language=row.language,
            year=row.year,
            composer=row.composer or "Unknown",
            videoId=row.videoId,
            movie=row.movie,
            startSeconds=row.startSeconds,
            endSeconds=row.endSeconds
        ))
    
    return songs


@router.get("/songs/{song_id}", response_model=Song)
async def get_song(song_id: int, db: Session = Depends(get_db)):
    """Get a specific song by ID"""
    
    query = """
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
        WHERE s.id = :song_id
    """
    
    result = db.execute(text(query), {"song_id": song_id}).fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="Song not found")
    
    return Song(
        id=result.id,
        title=result.title,
        language=result.language,
        year=result.year,
        composer=result.composer or "Unknown",
        videoId=result.videoId,
        movie=result.movie,
        startSeconds=result.startSeconds,
        endSeconds=result.endSeconds
    )


@router.get("/languages")
async def get_languages(db: Session = Depends(get_db)):
    """Get all available languages with song counts"""
    
    query = """
        SELECT 
            language,
            COUNT(*) as count
        FROM songs
        GROUP BY language
        ORDER BY count DESC
    """
    
    result = db.execute(text(query))
    languages = [{"language": row.language, "count": row.count} for row in result]
    
    return languages


@router.get("/artists", response_model=List[Artist])
async def get_artists(
    language: Optional[str] = Query(None, description="Filter by language"),
    search: Optional[str] = Query(None, description="Search in artist name"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Get all artists with optional filters"""
    
    query = "SELECT id, name, slug, language FROM artists WHERE 1=1"
    params = {}
    
    if language:
        query += " AND language = :language"
        params['language'] = language.upper()
    
    if search:
        query += " AND name ILIKE :search"
        params['search'] = f"%{search}%"
    
    query += " ORDER BY name LIMIT :limit"
    params['limit'] = limit
    
    result = db.execute(text(query), params)
    artists = [
        Artist(id=row.id, name=row.name, slug=row.slug, language=row.language)
        for row in result
    ]
    
    return artists


@router.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Get music statistics"""
    
    query = """
        SELECT 
            COUNT(DISTINCT s.id) as total_songs,
            COUNT(DISTINCT s.artist_id) as total_artists,
            COUNT(DISTINCT s.language) as total_languages
        FROM songs s
    """
    
    result = db.execute(text(query)).fetchone()
    
    return {
        "total_songs": result.total_songs,
        "total_artists": result.total_artists,
        "total_languages": result.total_languages
    }
