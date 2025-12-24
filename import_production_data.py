#!/usr/bin/env python3
"""
Import production data from JSON files into PostgreSQL database
"""
import json
import psycopg2
from datetime import datetime
import os
import sys

def connect_to_db():
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="football_highlights",
            user=os.getenv('USER')  # Use current user
        )
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def clear_existing_data(cursor):
    """Clear existing data to avoid duplicates"""
    print("Clearing existing data...")
    
    # Clear in correct order due to foreign key constraints
    cursor.execute("DELETE FROM highlights;")
    cursor.execute("DELETE FROM matches;")
    cursor.execute("DELETE FROM leagues;")
    cursor.execute("DELETE FROM fetched_dates;")
    
    print("Existing data cleared")

def import_leagues(cursor, file_path):
    """Import leagues data"""
    print(f"Importing leagues from {file_path}")
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    leagues = data.get('leagues', [])
    for league in leagues:
        cursor.execute("""
            INSERT INTO leagues (id, name, slug, country, logo_url, display_order, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                slug = EXCLUDED.slug,
                country = EXCLUDED.country,
                logo_url = EXCLUDED.logo_url,
                display_order = EXCLUDED.display_order
        """, (
            league['id'],
            league['name'],
            league['slug'],
            league['country'],
            league.get('logo_url'),
            league['display_order'],
            league['created_at']
        ))
    
    print(f"Imported {len(leagues)} leagues")

def import_matches(cursor, file_path):
    """Import matches data"""
    print(f"Importing matches from {file_path}")
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    matches = data.get('matches', [])
    for match in matches:
        cursor.execute("""
            INSERT INTO matches (id, league_id, home_team, away_team, home_score, away_score, 
                               match_date, match_time, status, espn_event_id, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                league_id = EXCLUDED.league_id,
                home_team = EXCLUDED.home_team,
                away_team = EXCLUDED.away_team,
                home_score = EXCLUDED.home_score,
                away_score = EXCLUDED.away_score,
                match_date = EXCLUDED.match_date,
                match_time = EXCLUDED.match_time,
                status = EXCLUDED.status,
                espn_event_id = EXCLUDED.espn_event_id,
                updated_at = EXCLUDED.updated_at
        """, (
            match['id'],
            match['league_id'],
            match['home_team'],
            match['away_team'],
            match['home_score'],
            match['away_score'],
            match['match_date'],
            match['match_time'],
            match['status'],
            match['espn_event_id'],
            match['created_at'],
            match['updated_at']
        ))
    
    print(f"Imported {len(matches)} matches")

def import_highlights(cursor, file_path):
    """Import highlights data"""
    print(f"Importing highlights from {file_path}")
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    highlights = data.get('highlights', [])
    for highlight in highlights:
        cursor.execute("""
            INSERT INTO highlights (id, match_id, youtube_video_id, title, description,
                                  thumbnail_url, channel_title, published_at, view_count,
                                  duration, is_official, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                match_id = EXCLUDED.match_id,
                youtube_video_id = EXCLUDED.youtube_video_id,
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                thumbnail_url = EXCLUDED.thumbnail_url,
                channel_title = EXCLUDED.channel_title,
                published_at = EXCLUDED.published_at,
                view_count = EXCLUDED.view_count,
                duration = EXCLUDED.duration,
                is_official = EXCLUDED.is_official
        """, (
            highlight['id'],
            highlight['match_id'],
            highlight['youtube_video_id'],
            highlight['title'],
            highlight.get('description'),
            highlight.get('thumbnail_url'),
            highlight.get('channel_title'),
            highlight.get('published_at'),
            highlight.get('view_count'),
            highlight.get('duration'),
            highlight.get('is_official', False),
            highlight['created_at']
        ))
    
    print(f"Imported {len(highlights)} highlights")

def import_fetched_dates(cursor, file_path):
    """Import fetched_dates data"""
    print(f"Importing fetched_dates from {file_path}")
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    fetched_dates = data.get('fetched_dates', [])
    for fetch_date in fetched_dates:
        cursor.execute("""
            INSERT INTO fetched_dates (id, fetch_date, fetched_at)
            VALUES (%s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                fetch_date = EXCLUDED.fetch_date,
                fetched_at = EXCLUDED.fetched_at
        """, (
            fetch_date['id'],
            fetch_date['fetch_date'],
            fetch_date['fetched_at']
        ))
    
    print(f"Imported {len(fetched_dates)} fetched dates")

def main():
    """Main import function"""
    data_dir = os.path.expanduser("~/Desktop/data/")
    
    # Define file mappings
    files = {
        'leagues': 'columns-1766562371898.json',
        'matches': 'columns-1766562372242.json', 
        'highlights': 'columns-1766562371553.json',
        'fetched_dates': 'columns.json'
    }
    
    print("Starting production data import...")
    
    conn = connect_to_db()
    cursor = conn.cursor()
    
    try:
        # Clear existing data
        clear_existing_data(cursor)
        
        # Import data in correct order (respecting foreign key constraints)
        import_leagues(cursor, os.path.join(data_dir, files['leagues']))
        import_fetched_dates(cursor, os.path.join(data_dir, files['fetched_dates']))
        import_matches(cursor, os.path.join(data_dir, files['matches']))
        import_highlights(cursor, os.path.join(data_dir, files['highlights']))
        
        # Commit all changes
        conn.commit()
        
        # Show summary
        cursor.execute("SELECT COUNT(*) FROM leagues")
        league_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM matches")
        match_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM highlights") 
        highlight_count = cursor.fetchone()[0]
        
        print(f"\n=== Import Summary ===")
        print(f"Leagues: {league_count}")
        print(f"Matches: {match_count}")
        print(f"Highlights: {highlight_count}")
        print("Import completed successfully!")
        
    except Exception as e:
        print(f"Error during import: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()