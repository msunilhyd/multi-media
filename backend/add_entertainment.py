#!/usr/bin/env python3
"""
Helper script to easily add entertainment content (no artist needed!)
Usage: python add_entertainment.py
"""
import sys
sys.path.append('/Users/s0m13i5/linus/multi-media/backend')

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal
import math

def minutes_to_seconds(minutes_float):
    """Convert minutes to seconds"""
    return math.floor(float(minutes_float) * 60)

def add_entertainment_content():
    """Interactive script to add entertainment content"""
    
    print("🎭 Add Entertainment Content")
    print("=" * 40)
    
    # Get content details
    title = input("Title: ")
    youtube_video_id = input("YouTube Video ID (e.g., l2KQhq6Rrn8): ")
    description = input("Description (optional): ") or None
    content_type = input("Content Type [fun/comedy/viral/meme]: ") or "fun"
    language = input("Language [ENGLISH]: ") or "ENGLISH"
    
    # Get time segments
    start_minutes = input("Start time (minutes, e.g., 11.24): ")
    end_minutes = input("End time (minutes, e.g., 11.35): ")
    
    # Convert times
    start_seconds = minutes_to_seconds(start_minutes)
    end_seconds = minutes_to_seconds(end_minutes)
    
    print(f"\n📋 Summary:")
    print(f"   Title: {title}")
    print(f"   Video: https://www.youtube.com/watch?v={youtube_video_id}")
    print(f"   Time: {start_minutes}min → {start_seconds}s to {end_minutes}min → {end_seconds}s")
    print(f"   Duration: {end_seconds - start_seconds} seconds")
    print(f"   Type: {content_type}")
    print(f"   Language: {language}")
    
    confirm = input(f"\nAdd this content? (y/N): ")
    if confirm.lower() != 'y':
        print("Cancelled.")
        return
    
    # Add to database
    db = SessionLocal()
    
    try:
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
            "title": title,
            "youtube_video_id": youtube_video_id,
            "description": description,
            "content_type": content_type,
            "language": language.upper(),
            "start_seconds": start_seconds,
            "end_seconds": end_seconds
        })
        
        entertainment_id = result.fetchone().id
        db.commit()
        
        print(f"✅ Added entertainment content (ID: {entertainment_id})")
        
        # Show summary
        total_count = db.execute(text("SELECT COUNT(*) as count FROM entertainment")).fetchone().count
        print(f"📊 Total entertainment items: {total_count}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_entertainment_content()