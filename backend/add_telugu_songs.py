import sys
sys.path.append('/Users/s0m13i5/linus/multi-media/backend')

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal
import uuid

def add_telugu_songs():
    """Add two Telugu songs to local database and generate production SQL"""
    
    db = SessionLocal()
    
    try:
        # Song data
        songs_data = [
            {
                "title": "Chikri",
                "language": "TELUGU",
                "year": "2024",
                "composer": "AR Rahman",
                "videoId": "vVDp1ulBKIk",
                "movie": "PEddi"
            },
            {
                "title": "Chuttamalle cover",
                "language": "TELUGU", 
                "year": "2024",
                "composer": "AR Rahman",
                "videoId": "xfiVVABv9II",
                "movie": "PEddi"
            }
        ]
        
        production_sql_statements = []
        
        # First, let's check what the songs table looks like
        try:
            result = db.execute(text("SELECT * FROM songs LIMIT 1"))
            columns = result.keys()
            print(f"📋 Songs table columns: {list(columns)}")
        except Exception as e:
            print(f"⚠️ Could not query songs table: {e}")
            
        # Check if artist "AR Rahman" exists
        ar_rahman_result = db.execute(text("SELECT id FROM artists WHERE name = 'AR Rahman' LIMIT 1"))
        ar_rahman = ar_rahman_result.fetchone()
        
        ar_rahman_id = None
        if ar_rahman:
            ar_rahman_id = ar_rahman.id
            print(f"✅ Found AR Rahman artist (ID: {ar_rahman_id})")
        else:
            # Create AR Rahman artist with ON CONFLICT handling
            try:
                ar_rahman_id = db.execute(text("""
                    INSERT INTO artists (name, slug, language) 
                    VALUES ('AR Rahman', 'ar-rahman', 'TELUGU') 
                    ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
                    RETURNING id
                """)).fetchone().id
                db.commit()
                print(f"✅ Created AR Rahman artist (ID: {ar_rahman_id})")
            except Exception as e:
                # If still fails, just find the existing one
                print(f"⚠️ Could not create artist, finding existing: {e}")
                ar_rahman_result = db.execute(text("SELECT id FROM artists WHERE slug = 'ar-rahman' LIMIT 1"))
                ar_rahman = ar_rahman_result.fetchone()
                if ar_rahman:
                    ar_rahman_id = ar_rahman.id
                    print(f"✅ Found existing AR Rahman artist (ID: {ar_rahman_id})")
                else:
                    print("❌ Could not find or create AR Rahman artist")
                    return
        
        for song_data in songs_data:
            print(f'\n🎵 Processing: {song_data["title"]}')
            
            # Check if song already exists by video_id
            existing_song_result = db.execute(text("""
                SELECT id, title FROM songs WHERE youtube_video_id = :video_id LIMIT 1
            """), {"video_id": song_data["videoId"]})
            
            existing_song = existing_song_result.fetchone()
            
            if existing_song:
                print(f'⚠️ Song already exists: {existing_song.title} (ID: {existing_song.id})')
                continue
            
            # Add song to local database
            insert_result = db.execute(text("""
                INSERT INTO songs (title, language, year, artist_id, youtube_video_id, album, created_at, updated_at) 
                VALUES (:title, :language, :year, :artist_id, :video_id, :movie, NOW(), NOW())
                RETURNING id
            """), {
                "title": song_data["title"],
                "language": song_data["language"],
                "year": int(song_data["year"]),
                "artist_id": ar_rahman_id,
                "video_id": song_data["videoId"],
                "movie": song_data["movie"]
            })
            
            new_song_id = insert_result.fetchone().id
            db.commit()
            
            print(f'✅ Added to local database: {song_data["title"]} (ID: {new_song_id})')
            
            # Generate production SQL - first make sure AR Rahman exists in production
            ar_rahman_sql = f"""
-- Ensure AR Rahman artist exists in production
INSERT INTO artists (name, slug, language, created_at, updated_at) 
VALUES ('AR Rahman', 'ar-rahman', 'TELUGU', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;"""
            
            # Generate song insert SQL
            song_sql = f"""
-- Insert song: {song_data["title"]}
INSERT INTO songs (title, language, year, artist_id, youtube_video_id, album, created_at, updated_at)
VALUES ('{song_data["title"].replace("'", "''")}', '{song_data["language"]}', {song_data["year"]}, 
        (SELECT id FROM artists WHERE name = 'AR Rahman' LIMIT 1), 
        '{song_data["videoId"]}', '{song_data["movie"].replace("'", "''")}', NOW(), NOW());"""
            
            production_sql_statements.extend([ar_rahman_sql, song_sql])
        
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
        
        telugu_songs_result = db.execute(text("SELECT COUNT(*) as count FROM songs WHERE language = 'TELUGU'"))
        telugu_songs = telugu_songs_result.fetchone().count
        
        print(f'\n📊 Database Summary:')
        print(f'   Total songs: {total_songs}')
        print(f'   Telugu songs: {telugu_songs}')
        
    except Exception as e:
        print(f'❌ Error: {e}')
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    add_telugu_songs()