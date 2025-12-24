"""
Migration script to import songs from frontend playlists.ts to PostgreSQL database
"""
import sys
import os

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from sqlalchemy import text
import json

# Song data from playlists.ts
songs_data = """
[
  {
    "id": 1342,
    "title": "Sahiba",
    "language": "HINDI",
    "year": "2024",
    "composer": "Jasleen Royal",
    "videoId": "Npd94-t1Lv0",
    "movie": "Rockstar"
  }
]
"""

def slugify(text):
    """Convert text to slug format"""
    import re
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text


def import_songs_from_file():
    """Import songs from the frontend playlists.ts file"""
    
    # Read the playlists.ts file directly
    # Get the multi-media directory (parent of backend)
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    multimedia_dir = os.path.dirname(backend_dir)
    playlists_path = os.path.join(
        multimedia_dir,
        'frontend', 'src', 'data', 'playlists.ts'
    )
    
    print(f"Reading songs from: {playlists_path}")
    
    if not os.path.exists(playlists_path):
        print(f"Error: File not found: {playlists_path}")
        return
    
    # Parse the TypeScript file to extract song data
    with open(playlists_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract the array content between "export const defaultPlaylist: Song[] = [" and "];"
    import re
    pattern = r'export const defaultPlaylist: Song\[\] = \[(.*?)\];'
    match = re.search(pattern, content, re.DOTALL)
    
    if not match:
        print("Error: Could not find defaultPlaylist in file")
        return
    
    array_content = match.group(1)
    
    # Parse songs manually (since it's TypeScript, not valid JSON)
    songs = []
    song_pattern = r'\{[^}]+\}'
    for song_match in re.finditer(song_pattern, array_content):
        song_text = song_match.group(0)
        
        # Extract fields
        def extract_field(field_name):
            field_pattern = rf'{field_name}:\s*"([^"]*)"'
            field_match = re.search(field_pattern, song_text)
            return field_match.group(1) if field_match else None
        
        def extract_number_field(field_name):
            field_pattern = rf'{field_name}:\s*(\d+)'
            field_match = re.search(field_pattern, song_text)
            return int(field_match.group(1)) if field_match else None
        
        song = {
            'id': extract_number_field('id'),
            'title': extract_field('title'),
            'language': extract_field('language'),
            'year': extract_field('year'),
            'composer': extract_field('composer'),
            'videoId': extract_field('videoId'),
            'movie': extract_field('movie'),
            'startSeconds': extract_number_field('startSeconds'),
            'endSeconds': extract_number_field('endSeconds')
        }
        
        if song['title'] and song['videoId']:
            songs.append(song)
    
    print(f"Found {len(songs)} songs to import")
    
    db = SessionLocal()
    try:
        imported = 0
        skipped = 0
        artist_cache = {}
        
        for song in songs:
            try:
                composer = song['composer']
                
                # Get or create artist
                if composer not in artist_cache:
                    artist_slug = slugify(composer)
                    
                    # Check if artist exists
                    result = db.execute(
                        text("SELECT id FROM artists WHERE slug = :slug"),
                        {"slug": artist_slug}
                    ).fetchone()
                    
                    if result:
                        artist_id = result[0]
                    else:
                        # Insert artist
                        result = db.execute(
                            text("""
                                INSERT INTO artists (name, slug, language) 
                                VALUES (:name, :slug, :language) 
                                RETURNING id
                            """),
                            {
                                "name": composer,
                                "slug": artist_slug,
                                "language": song['language']
                            }
                        )
                        artist_id = result.fetchone()[0]
                        db.commit()
                    
                    artist_cache[composer] = artist_id
                else:
                    artist_id = artist_cache[composer]
                
                # Insert song
                db.execute(
                    text("""
                        INSERT INTO songs (
                            title, artist_id, youtube_video_id, language, 
                            album, channel_title, year, start_seconds, end_seconds
                        ) VALUES (
                            :title, :artist_id, :video_id, :language,
                            :album, :channel_title, :year, :start_seconds, :end_seconds
                        ) 
                        ON CONFLICT (youtube_video_id) DO NOTHING
                    """),
                    {
                        "title": song['title'],
                        "artist_id": artist_id,
                        "video_id": song['videoId'],
                        "language": song['language'],
                        "album": song['movie'],
                        "channel_title": composer,
                        "year": song['year'],
                        "start_seconds": song.get('startSeconds'),
                        "end_seconds": song.get('endSeconds')
                    }
                )
                db.commit()
                
                imported += 1
                if imported % 100 == 0:
                    print(f"Imported {imported} songs...")
                    
            except Exception as e:
                print(f"Error importing song '{song.get('title', 'Unknown')}': {e}")
                db.rollback()
                skipped += 1
                continue
        
        print(f"\n✅ Migration complete!")
        print(f"📊 Imported: {imported}")
        print(f"⚠️  Skipped: {skipped}")
        
    except Exception as e:
        print(f"❌ Migration error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("Starting song import from playlists.ts...")
    import_songs_from_file()
