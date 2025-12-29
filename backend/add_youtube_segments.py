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
        raise ValueError("Invalid time format. Please provide time as number (11.24) or string ('11.24')")

def add_youtube_fun_segments():
    """Add fun segments from YouTube video l2KQhq6Rrn8"""
    
    db = SessionLocal()
    
    try:
        # YouTube video details - you can modify these as needed
        video_id = "l2KQhq6Rrn8"
        
        # Fun segments data with time in minutes
        segments_data = [
            {
                "title": "Fun Segment 1",
                "start_minutes": 11.24,
                "end_minutes": 11.35,
            },
            {
                "title": "Fun Segment 2", 
                "start_minutes": 11.52,
                "end_minutes": 12.10,
            }
        ]
        
        # Default metadata (you can update these)
        default_metadata = {
            "language": "ENGLISH",
            "year": "2024",
            "artist": "Unknown Artist",
            "album": "YouTube Video"
        }
        
        print(f"🎵 Processing YouTube video: https://www.youtube.com/watch?v={video_id}")
        print(f"📊 Adding {len(segments_data)} fun segments...\n")
        
        # Check/create unknown artist
        artist_result = db.execute(text("SELECT id FROM artists WHERE name = :name LIMIT 1"), 
                                 {"name": default_metadata["artist"]})
        artist = artist_result.fetchone()
        
        if artist:
            artist_id = artist.id
            print(f'✅ Artist "{default_metadata["artist"]}" found with ID: {artist_id}')
        else:
            # Insert unknown artist
            insert_artist = text("""
                INSERT INTO artists (name, slug, language, created_at) 
                VALUES (:name, :slug, :language, NOW()) 
                RETURNING id
            """)
            
            artist_result = db.execute(insert_artist, {
                "name": default_metadata["artist"],
                "slug": "unknown-artist",
                "language": default_metadata["language"]
            })
            artist_id = artist_result.fetchone().id
            db.commit()
            print(f'✅ Created new artist "{default_metadata["artist"]}" with ID: {artist_id}')
        
        production_sql_statements = []
        
        # Process each segment
        for i, segment in enumerate(segments_data, 1):
            start_seconds = minutes_to_seconds(segment["start_minutes"])
            end_seconds = minutes_to_seconds(segment["end_minutes"])
            
            print(f'🎵 Processing {segment["title"]}:')
            print(f'   Time: {segment["start_minutes"]} min → {start_seconds}s to {segment["end_minutes"]} min → {end_seconds}s')
            print(f'   Duration: {end_seconds - start_seconds} seconds')
            
            # Check if segment already exists
            existing_song = db.execute(text("""
                SELECT id FROM songs 
                WHERE youtube_video_id = :video_id 
                AND start_seconds = :start_seconds 
                AND end_seconds = :end_seconds
                LIMIT 1
            """), {
                "video_id": video_id,
                "start_seconds": start_seconds,
                "end_seconds": end_seconds
            }).fetchone()
            
            if existing_song:
                print(f'   ⚠️ Segment already exists with ID: {existing_song.id}')
                continue
            
            # Insert song with category = 'fun'
            insert_song = text("""
                INSERT INTO songs (title, language, year, artist_id, youtube_video_id, album, start_seconds, end_seconds, category, created_at, updated_at) 
                VALUES (:title, :language, :year, :artist_id, :video_id, :album, :start_seconds, :end_seconds, :category, NOW(), NOW()) 
                ON CONFLICT (youtube_video_id, start_seconds, end_seconds) DO UPDATE SET
                    category = :category,
                    updated_at = NOW()
                RETURNING id
            """)
            
            insert_result = db.execute(insert_song, {
                "title": segment["title"],
                "language": default_metadata["language"],
                "year": int(default_metadata["year"]),
                "artist_id": artist_id,
                "video_id": video_id,
                "album": default_metadata["album"],
                "start_seconds": start_seconds,
                "end_seconds": end_seconds,
                "category": "fun"
            })
            
            new_song_id = insert_result.fetchone().id
            db.commit()
            
            print(f'✅ Added to database: "{segment["title"]}" (ID: {new_song_id})')
            
            # Generate production SQL
            artist_sql = f"""
-- Ensure {default_metadata["artist"]} artist exists in production
INSERT INTO artists (name, slug, language, created_at) 
VALUES ('{default_metadata["artist"]}', 'unknown-artist', '{default_metadata["language"]}', NOW())
ON CONFLICT (name) DO NOTHING;"""
            
            song_sql = f"""
-- Insert fun segment: {segment["title"]}
INSERT INTO songs (title, language, year, artist_id, youtube_video_id, album, start_seconds, end_seconds, category, created_at, updated_at)
VALUES ('{segment["title"]}', '{default_metadata["language"]}', {default_metadata["year"]}, 
        (SELECT id FROM artists WHERE name = '{default_metadata["artist"]}' LIMIT 1), 
        '{video_id}', '{default_metadata["album"]}', {start_seconds}, {end_seconds}, 'fun', NOW(), NOW());"""
            
            production_sql_statements.extend([artist_sql, song_sql])
            print()
        
        print('🎉 Local database update complete!')
        
        # Display production SQL
        print(f'\n📋 SQL STATEMENTS FOR PRODUCTION DATABASE:')
        print('=' * 80)
        
        for sql in production_sql_statements:
            print(sql)
        
        print('\n' + '=' * 80)
        print('🔗 Run these on Railway production database')
        
        # Show database summary
        total_songs = db.execute(text("SELECT COUNT(*) as count FROM songs")).fetchone().count
        fun_songs = db.execute(text("SELECT COUNT(*) as count FROM songs WHERE category = 'fun'")).fetchone().count
        
        print(f'\n📊 Database Summary:')
        print(f'   Total songs: {total_songs}')
        print(f'   Fun songs: {fun_songs}')
        
        # Show time conversion examples
        print(f'\n⏰ Time Conversions Used:')
        for segment in segments_data:
            start_sec = minutes_to_seconds(segment["start_minutes"])
            end_sec = minutes_to_seconds(segment["end_minutes"])
            print(f'   {segment["start_minutes"]} min → {start_sec}s, {segment["end_minutes"]} min → {end_sec}s')
        
    except Exception as e:
        print(f'❌ Error: {e}')
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("🎉 Adding fun segments from YouTube video...\n")
    add_youtube_fun_segments()