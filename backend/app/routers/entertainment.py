from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from ..database import get_db
from pydantic import BaseModel

router = APIRouter(
    prefix="/api/entertainment",
    tags=["entertainment"]
)


class Entertainment(BaseModel):
    id: int
    title: str
    youtube_video_id: str
    description: Optional[str] = None
    content_type: str
    start_seconds: Optional[int] = None
    end_seconds: Optional[int] = None
    duration: Optional[int] = None
    thumbnail_url: Optional[str] = None
    channel_title: Optional[str] = None
    view_count: Optional[int] = None
    tags: Optional[List[str]] = None
    is_featured: bool = False
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[Entertainment])
async def get_entertainment(
    content_type: Optional[str] = Query(None, description="Filter by content type (fun, comedy, viral, meme, etc.)"),
    search: Optional[str] = Query(None, description="Search in title or description"),
    featured: Optional[bool] = Query(None, description="Filter featured content"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    offset: int = Query(0, ge=0, description="Number of items to skip"),
    db: Session = Depends(get_db)
):
    """
    Get entertainment content with optional filters.
    
    - **content_type**: Filter by type (fun, comedy, viral, meme, etc.)
    - **language**: Filter by language (ENGLISH, HINDI, etc.)
    - **search**: Search in title or description
    - **featured**: Filter featured content only
    - **limit**: Maximum number of items to return (default: 100, max: 1000)
    - **offset**: Number of items to skip for pagination
    """
    
    # Build the query - using only columns that exist in production
    query = """
        SELECT 
            id,
            title,
            youtube_video_id,
            content_type,
            start_seconds,
            end_seconds,
            created_at,
            updated_at
        FROM entertainment
        WHERE 1=1
    """
    
    params = {}
    
    # Add filters
    if content_type:
        query += " AND content_type = :content_type"
        params['content_type'] = content_type.lower()
    
    if search:
        query += " AND title ILIKE :search"
        params['search'] = f"%{search}%"
    
    # Note: is_featured column doesn't exist in production database
    # if featured is not None:
    #     query += " AND is_featured = :featured"
    #     params['featured'] = featured
    
    # Add ordering and pagination
    query += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
    params['limit'] = limit
    params['offset'] = offset
    
    # Execute query
    result = db.execute(text(query), params)
    entertainment_items = []
    
    for row in result:
        entertainment_items.append(Entertainment(
            id=row.id,
            title=row.title,
            youtube_video_id=row.youtube_video_id,
            description="",  # Not available in production DB
            content_type=row.content_type,
            start_seconds=row.start_seconds,
            end_seconds=row.end_seconds,
            duration=0,  # Not available in production DB
            thumbnail_url="",  # Not available in production DB
            channel_title="",  # Not available in production DB
            view_count=0,  # Not available in production DB
            tags=[],  # Not available in production DB
            is_featured=False  # Not available in production DB
        ))
    
    return entertainment_items


@router.get("/types")
async def get_content_types(db: Session = Depends(get_db)):
    """Get all available content types"""
    result = db.execute(text("""
        SELECT content_type, COUNT(*) as count 
        FROM entertainment 
        GROUP BY content_type 
        ORDER BY count DESC
    """))
    
    return [{"type": row.content_type, "count": row.count} for row in result]


@router.get("/featured", response_model=List[Entertainment])
async def get_featured_entertainment(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get featured entertainment content"""
    return await get_entertainment(featured=True, limit=limit, db=db)


@router.get("/{entertainment_id}", response_model=Entertainment)
async def get_entertainment_by_id(entertainment_id: int, db: Session = Depends(get_db)):
    """Get specific entertainment content by ID"""
    result = db.execute(text("""
        SELECT 
            id,
            title,
            youtube_video_id,
            content_type,
            start_seconds,
            end_seconds,
            created_at,
            updated_at
        FROM entertainment WHERE id = :id
    """), {"id": entertainment_id})
    
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Entertainment content not found")
    
    return Entertainment(
        id=row.id,
        title=row.title,
        youtube_video_id=row.youtube_video_id,
        description="",  # Not available in production DB
        content_type=row.content_type,
        start_seconds=row.start_seconds,
        end_seconds=row.end_seconds,
        duration=0,  # Not available in production DB
        thumbnail_url="",  # Not available in production DB
        channel_title="",  # Not available in production DB
        view_count=0,  # Not available in production DB
        tags=[],  # Not available in production DB
        is_featured=False  # Not available in production DB
    )