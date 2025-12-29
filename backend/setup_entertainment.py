import sys
sys.path.append('/Users/s0m13i5/linus/multi-media/backend')

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal
import math

def minutes_to_seconds(minutes_float):
    """Convert minutes in decimal format to seconds."""
    if isinstance(minutes_float, (int, float)):
        return math.floor(minutes_float * 60)
    elif isinstance(minutes_float, str):
        return math.floor(float(minutes_float) * 60)
    else:
        raise ValueError("Invalid time format")

def run_migration_and_add_content():
    """Run the entertainment table migration and add content"""
    
    db = SessionLocal()
    
    try:
        print("🚀 Running entertainment table migration...")
        
        # Read and execute the migration
        with open('/Users/s0m13i5/linus/multi-media/backend/migrations/create_entertainment_table.sql', 'r') as f:
            migration_sql = f.read()
        
        # Execute migration in parts to handle potential conflicts
        try:
            db.execute(text(migration_sql))
            db.commit()
            print("✅ Entertainment table created and fun content migrated!")
        except Exception as e:
            print(f"⚠️ Migration error (might already exist): {e}")
            db.rollback()
        
        # Add new YouTube segments to entertainment table
        youtube_segments = [
            {
                "title": "Funny Moment 1",
                "youtube_video_id": "l2KQhq6Rrn8",
                "start_minutes": 11.24,
                "end_minutes": 11.35,
                "content_type": "comedy",
                "description": "Short funny segment"
            },
            {
                "title": "Funny Moment 2", 
                "youtube_video_id": "l2KQhq6Rrn8",
                "start_minutes": 11.52,
                "end_minutes": 12.10,
                "content_type": "comedy",
                "description": "Another funny segment"
            }
        ]
        
        print(f"\n🎭 Adding {len(youtube_segments)} entertainment segments...")
        
        for i, segment in enumerate(youtube_segments, 1):
            start_seconds = minutes_to_seconds(segment["start_minutes"])
            end_seconds = minutes_to_seconds(segment["end_minutes"])
            
            print(f'\n🎵 Processing: {segment["title"]}')
            print(f'   Video: https://www.youtube.com/watch?v={segment["youtube_video_id"]}')
            print(f'   Time: {segment["start_minutes"]}min → {start_seconds}s to {segment["end_minutes"]}min → {end_seconds}s')
            print(f'   Type: {segment["content_type"]}')
            
            # Insert into entertainment table (no artist needed!)
            insert_entertainment = text("""
                INSERT INTO entertainment (
                    title, youtube_video_id, description, content_type, language,
                    start_seconds, end_seconds, created_at, updated_at
                ) 
                VALUES (
                    :title, :youtube_video_id, :description, :content_type, :language,
                    :start_seconds, :end_seconds, NOW(), NOW()
                ) 
                ON CONFLICT (youtube_video_id, start_seconds, end_seconds) 
                DO UPDATE SET
                    title = :title,
                    description = :description,
                    content_type = :content_type,
                    updated_at = NOW()
                RETURNING id
            """)
            
            result = db.execute(insert_entertainment, {
                "title": segment["title"],
                "youtube_video_id": segment["youtube_video_id"],
                "description": segment["description"],
                "content_type": segment["content_type"],
                "language": "ENGLISH",  # Default
                "start_seconds": start_seconds,
                "end_seconds": end_seconds
            })
            
            entertainment_id = result.fetchone().id
            db.commit()
            
            print(f'✅ Added to entertainment table (ID: {entertainment_id})')
        
        # Show summary
        entertainment_count = db.execute(text("SELECT COUNT(*) as count FROM entertainment")).fetchone().count
        content_types = db.execute(text("SELECT content_type, COUNT(*) as count FROM entertainment GROUP BY content_type")).fetchall()
        
        print(f'\n📊 Entertainment Database Summary:')
        print(f'   Total entertainment items: {entertainment_count}')
        for content_type in content_types:
            print(f'   {content_type.content_type}: {content_type.count} items')
        
        # Test the new API structure
        print(f'\n🔗 New API Endpoints:')
        print(f'   GET /entertainment - All entertainment content')
        print(f'   GET /entertainment?content_type=comedy - Comedy content')  
        print(f'   GET /entertainment?content_type=fun - Fun content')
        print(f'   GET /entertainment/featured - Featured content')
        print(f'   GET /entertainment/types - Available content types')
        
    except Exception as e:
        print(f'❌ Error: {e}')
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_migration_and_add_content()