#!/usr/bin/env python3
"""Sync local SQLite data to Railway PostgreSQL"""
import sqlite3
import psycopg2
from datetime import datetime

# Connection strings
SQLITE_PATH = "/Users/s0m13i5/linus/multi-media/backend/football_highlights.db"
PG_URL = "postgresql://postgres:wUXRJCcrvqKCaNLZaUiRDXEbsjdduujw@shinkansen.proxy.rlwy.net:49888/railway"

def sync_data():
    # Connect to both databases
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()
    
    pg_conn = psycopg2.connect(PG_URL)
    pg_cur = pg_conn.cursor()
    
    print("Connected to both databases!")
    
    # Clear existing data in Railway (to avoid duplicates)
    print("Clearing existing Railway data...")
    pg_cur.execute("DELETE FROM highlights")
    pg_cur.execute("DELETE FROM matches")
    pg_cur.execute("DELETE FROM leagues")
    pg_conn.commit()
    
    # Sync leagues
    print("Syncing leagues...")
    sqlite_cur.execute("SELECT * FROM leagues")
    leagues = sqlite_cur.fetchall()
    for league in leagues:
        pg_cur.execute("""
            INSERT INTO leagues (id, name, slug, country, logo_url, display_order, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (league['id'], league['name'], league['slug'], league['country'], 
              league['logo_url'], league['display_order'], league['created_at']))
    pg_conn.commit()
    print(f"  Synced {len(leagues)} leagues")
    
    # Sync matches
    print("Syncing matches...")
    sqlite_cur.execute("SELECT * FROM matches")
    matches = sqlite_cur.fetchall()
    for match in matches:
        pg_cur.execute("""
            INSERT INTO matches (id, league_id, home_team, away_team, home_score, away_score, 
                                match_date, match_time, status, espn_event_id, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (match['id'], match['league_id'], match['home_team'], match['away_team'],
              match['home_score'], match['away_score'], match['match_date'], match['match_time'],
              match['status'], match['espn_event_id'], match['created_at'], match['updated_at']))
    pg_conn.commit()
    print(f"  Synced {len(matches)} matches")
    
    # Sync highlights
    print("Syncing highlights...")
    sqlite_cur.execute("SELECT * FROM highlights")
    highlights = sqlite_cur.fetchall()
    for h in highlights:
        # Convert SQLite integer (0/1) to Python boolean for PostgreSQL
        is_official = bool(h['is_official']) if h['is_official'] is not None else False
        pg_cur.execute("""
            INSERT INTO highlights (id, match_id, youtube_video_id, title, description, 
                                   thumbnail_url, channel_title, view_count, duration, is_official, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (h['id'], h['match_id'], h['youtube_video_id'], h['title'], h['description'],
              h['thumbnail_url'], h['channel_title'], h['view_count'], h['duration'], 
              is_official, h['created_at']))
    pg_conn.commit()
    print(f"  Synced {len(highlights)} highlights")
    
    # Reset sequences
    print("Resetting sequences...")
    pg_cur.execute("SELECT setval('leagues_id_seq', (SELECT MAX(id) FROM leagues))")
    pg_cur.execute("SELECT setval('matches_id_seq', (SELECT MAX(id) FROM matches))")
    pg_cur.execute("SELECT setval('highlights_id_seq', (SELECT MAX(id) FROM highlights))")
    pg_conn.commit()
    
    # Close connections
    sqlite_conn.close()
    pg_conn.close()
    
    print("\n✅ Sync complete!")

if __name__ == "__main__":
    sync_data()
