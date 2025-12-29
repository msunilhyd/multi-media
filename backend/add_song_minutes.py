#!/usr/bin/env python3
"""
Simple helper script to add songs with minute timestamps
Usage: python add_song_minutes.py "Song Title" "HINDI" "2024" "Artist Name" "videoId" "Album" 4.15 4.30
"""

import sys
import os
import math

# Add parent directory to path to import app modules
sys.path.append('/Users/s0m13i5/linus/multi-media/backend')

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal

def minutes_to_seconds(minutes_float):
    """Convert minutes in decimal format to seconds."""
    if isinstance(minutes_float, (int, float)):
        return math.floor(minutes_float * 60)
    elif isinstance(minutes_float, str):
        return math.floor(float(minutes_float) * 60)
    else:
        raise ValueError("Invalid time format. Please provide time as number (14.36) or string ('14.36')")

def add_song_with_minutes(title, language, year, artist_name, youtube_id, album, start_minutes, end_minutes, category="fun"):
    """Add a song with time in minutes format."""
    
    start_seconds = minutes_to_seconds(start_minutes)
    end_seconds = minutes_to_seconds(end_minutes)
    
    print(f'🎵 Adding: {title}')
    print(f'   {start_minutes} min -> {start_seconds}s')
    print(f'   {end_minutes} min -> {end_seconds}s')
    print(f'   Category: {category}')
    
    db = SessionLocal()
    
    try:
        # Find or create artist
        artist_result = db.execute(text("SELECT id FROM artists WHERE name = :name LIMIT 1"), 
                                 {"name": artist_name})
        artist = artist_result.fetchone()
        
        if artist:
            artist_id = artist.id
            print(f'✅ Artist "{artist_name}" found with ID: {artist_id}')
        else:
            # Create artist
            insert_artist = text("""
                INSERT INTO artists (name, slug, language, created_at, updated_at) 
                VALUES (:name, :slug, :language, NOW(), NOW()) 
                RETURNING id
            """)
            
            artist_slug = artist_name.lower().replace(' ', '-').replace('&', 'and')
            artist_result = db.execute(insert_artist, {
                "name": artist_name,
                "slug": artist_slug,
                "language": language
            })
            artist_id = artist_result.fetchone().id
            db.commit()
            print(f'✅ Created new artist "{artist_name}" with ID: {artist_id}')
        
        # Insert song
        insert_song = text("""
            INSERT INTO songs (title, language, year, artist_id, youtube_video_id, album, start_seconds, end_seconds, category, created_at, updated_at) 
            VALUES (:title, :language, :year, :artist_id, :video_id, :album, :start_seconds, :end_seconds, :category, NOW(), NOW()) 
            ON CONFLICT (youtube_video_id, start_seconds, end_seconds) DO UPDATE SET
                category = :category,
                updated_at = NOW()
            RETURNING id
        """)
        
        insert_result = db.execute(insert_song, {
            "title": title,
            "language": language,
            "year": int(year),
            "artist_id": artist_id,
            "video_id": youtube_id,
            "album": album,
            "start_seconds": start_seconds,
            "end_seconds": end_seconds,
            "category": category
        })
        
        new_song_id = insert_result.fetchone().id
        db.commit()
        
        print(f'✅ Added to database: "{title}" (ID: {new_song_id})')
        
        return new_song_id
        
    except Exception as e:
        print(f'❌ Error: {e}')
        db.rollback()
        return None
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 9:
        print("Usage: python add_song_minutes.py \"Song Title\" \"HINDI\" \"2024\" \"Artist Name\" \"videoId\" \"Album\" start_minutes end_minutes")
        print("Example: python add_song_minutes.py \"Rockstar Fun\" \"HINDI\" \"2024\" \"Jasleen Royal\" \"RxLRFm6Eb5M\" \"Rockstar\" 4.15 4.30")
        sys.exit(1)
    
    title = sys.argv[1]
    language = sys.argv[2]
    year = sys.argv[3]
    artist_name = sys.argv[4]
    youtube_id = sys.argv[5]
    album = sys.argv[6]
    start_minutes = float(sys.argv[7])
    end_minutes = float(sys.argv[8])
    
    result = add_song_with_minutes(title, language, year, artist_name, youtube_id, album, start_minutes, end_minutes)
    
    if result:
        print(f"\n🎉 Success! Song added with ID: {result}")
    else:
        print("\n❌ Failed to add song")