import sys
sys.path.append('/Users/s0m13i5/linus/multi-media/backend')

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal
import uuid
import math

def minutes_to_seconds(minutes_float):
    """
    Convert minutes in decimal format to seconds.
    Example: 14.36 minutes = 861.6 seconds = 861 seconds (rounded down)
    """
    if isinstance(minutes_float, (int, float)):
        return math.floor(minutes_float * 60)
    elif isinstance(minutes_float, str):
        return math.floor(float(minutes_float) * 60)
    else:
        raise ValueError("Invalid time format. Please provide time as number (14.36) or string ('14.36')")

def add_fun_songs():
    """Add fun songs to local database and generate production SQL"""
    
    db = SessionLocal()
    
    try:
        # First, run the migration to add category column if it doesn't exist
        try:
            migration_sql = """
            -- Add category column if it doesn't exist
            ALTER TABLE songs 
            ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'music';
            
            -- Create index for category filtering
            CREATE INDEX IF NOT EXISTS idx_songs_category ON songs(category);
            
            -- Remove unique constraint on youtube_video_id to allow multiple segments
            ALTER TABLE songs DROP CONSTRAINT IF EXISTS songs_youtube_video_id_key;
            
            -- Create composite unique constraint for video segments
            ALTER TABLE songs ADD CONSTRAINT unique_song_segment 
            UNIQUE (youtube_video_id, start_seconds, end_seconds);
            """
            db.execute(text(migration_sql))
            db.commit()
            print("✅ Migration: Added category column and updated constraints")
        except Exception as e:
            print(f"⚠️ Migration might have already been run: {e}")
            db.rollback()
        
        # Fun songs data - format: [title, language, year, artist, youtube_id, album, start_seconds, end_seconds]
        fun_songs_data = [
            ['Rockstar - Funny Version', 'HINDI', '2024', 'Jasleen Royal', 'RxLRFm6Eb5M', 'Rockstar', 249, 260],
            ['Rockstar - Extended Fun', 'HINDI', '2024', 'Jasleen Royal', 'RxLRFm6Eb5M', 'Rockstar', 861, 866]
        ]
        
        production_sql_statements = []
        
        # First, let's check what the songs table looks like
        try:
            result = db.execute(text("SELECT * FROM songs LIMIT 1"))
            columns = result.keys()
            print(f"📋 Songs table columns: {list(columns)}")
        except Exception as e:
            print(f"⚠️ Could not query songs table: {e}")
            
        # Check if artist "Jasleen Royal" exists
        artist_result = db.execute(text("SELECT id FROM artists WHERE name = 'Jasleen Royal' LIMIT 1"))
        artist = artist_result.fetchone()
        
        artist_id = None
        if artist:
            artist_id = artist.id
            print(f'✅ Artist "Jasleen Royal" found with ID: {artist_id}')
        else:
            # Insert artist first
            insert_artist = text("""
                INSERT INTO artists (name, slug, language, created_at, updated_at) 
                VALUES (:name, :slug, :language, NOW(), NOW()) 
                RETURNING id
            """)
            
            artist_result = db.execute(insert_artist, {
                "name": "Jasleen Royal",
                "slug": "jasleen-royal",
                "language": "HINDI"
            })
            artist_id = artist_result.fetchone().id
            db.commit()
            print(f'✅ Created new artist "Jasleen Royal" with ID: {artist_id}')
        
        # Process each fun song
        for i, song_data in enumerate(fun_songs_data):
            title, language, year, artist_name, youtube_id, album, start_seconds, end_seconds = song_data
            
            print(f'\n🎵 Processing song {i+1}: "{title}"')
            print(f'   Time range: {start_seconds}s - {end_seconds}s')
            
            # Check if song already exists
            existing_song = db.execute(text("""
                SELECT id FROM songs 
                WHERE youtube_video_id = :video_id 
                AND start_seconds = :start_seconds 
                AND end_seconds = :end_seconds
                LIMIT 1
            """), {
                "video_id": youtube_id,
                "start_seconds": start_seconds,
                "end_seconds": end_seconds
            }).fetchone()
            
            if existing_song:
                print(f'   ⚠️ Song segment already exists with ID: {existing_song.id}')
                continue
            
            # Insert song with category = 'fun' using ON CONFLICT
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
                "category": "fun"
            })
            
            new_song_id = insert_result.fetchone().id
            db.commit()
            
            print(f'✅ Added to local database: "{title}" (ID: {new_song_id})')
            
            # Generate production SQL - first make sure artist exists in production
            artist_sql = f"""
-- Ensure Jasleen Royal artist exists in production
INSERT INTO artists (name, slug, language, created_at, updated_at) 
VALUES ('Jasleen Royal', 'jasleen-royal', 'HINDI', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;"""
            
            # Generate song insert SQL with category
            song_sql = f"""
-- Insert fun song: {title}
INSERT INTO songs (title, language, year, artist_id, youtube_video_id, album, start_seconds, end_seconds, category, created_at, updated_at)
VALUES ('{title.replace("'", "''")}', '{language}', {year}, 
        (SELECT id FROM artists WHERE name = 'Jasleen Royal' LIMIT 1), 
        '{youtube_id}', '{album.replace("'", "''")}', {start_seconds}, {end_seconds}, 'fun', NOW(), NOW());"""
            
            production_sql_statements.extend([artist_sql, song_sql])
        
        print(f'\n🎉 Local database update complete!')
        
        # Display production SQL
        print(f'\n📋 SQL STATEMENTS FOR PRODUCTION DATABASE:')
        print(f'=' * 80)
        
        for i, sql in enumerate(production_sql_statements):
            print(sql)
        
        print(f'\n' + '=' * 80)
        print(f'🔗 Run these on Railway production database:')
        print(f'postgresql://postgres:wUXRJCcrvqKCaNLZaUiRDXEbsjdduujw@shinkansen.proxy.rlwy.net:49888/railway')
        
        # Show database summary
        total_songs_result = db.execute(text("SELECT COUNT(*) as count FROM songs"))
        total_songs = total_songs_result.fetchone().count
        
        fun_songs_result = db.execute(text("SELECT COUNT(*) as count FROM songs WHERE category = 'fun'"))
        fun_songs = fun_songs_result.fetchone().count
        
        music_songs_result = db.execute(text("SELECT COUNT(*) as count FROM songs WHERE category = 'music' OR category IS NULL"))
        music_songs = music_songs_result.fetchone().count
        
        print(f'\n📊 Database Summary:')
        print(f'   Total songs: {total_songs}')
        print(f'   Fun songs: {fun_songs}')
        print(f'   Music songs: {music_songs}')
        
        # Test the time conversion function
        print(f'\n⏰ Time Conversion Examples:')
        test_times = [14.36, 4.15, '2.30', 0.45]
        for time_val in test_times:
            seconds = minutes_to_seconds(time_val)
            print(f'   {time_val} minutes = {seconds} seconds')
        
    except Exception as e:
        print(f'❌ Error: {e}')
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def add_song_with_minutes(title, language, year, artist, youtube_id, album, start_minutes, end_minutes):
    """
    Helper function to add a song using minutes format.
    Example: add_song_with_minutes("Song Title", "HINDI", "2024", "Artist", "videoId", "Album", 14.36, 14.41)
    """
    start_seconds = minutes_to_seconds(start_minutes)
    end_seconds = minutes_to_seconds(end_minutes)
    
    print(f'🎵 Converting time for: {title}')
    print(f'   {start_minutes} min -> {start_seconds}s')
    print(f'   {end_minutes} min -> {end_seconds}s')
    
    # Add to database logic here (similar to above)
    # For now, just return the converted data
    return [title, language, year, artist, youtube_id, album, start_seconds, end_seconds]

if __name__ == "__main__":
    print("🎉 Adding fun songs to database...\n")
    add_fun_songs()
    
    print(f'\n' + '='*60)
    print("🔧 USAGE FOR FUTURE SONGS:")
    print("When you provide time in minutes (like 14.36), use:")
    print("start_seconds = minutes_to_seconds(14.36)  # = 861 seconds")
    print("end_seconds = minutes_to_seconds(14.41)    # = 864 seconds")
    print('='*60)