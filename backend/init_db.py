#!/usr/bin/env python3
"""
Database initialization script for Railway PostgreSQL
This script creates all required tables using SQLAlchemy models
"""
import sys
import os

# Add the backend directory to the path so we can import app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
from app.models import League, Match, Highlight, FetchedDate
from app.models_users import User, UserFavoriteTeam, NotificationPreference, Notification

# Import models for music and entertainment features
try:
    from app.models import Song, UserPlaylist, UserPlaylistItem, EntertainmentVideo
except ImportError:
    print("Warning: Some models could not be imported")

def run_migrations():
    """Run SQL migrations from migrations folder"""
    from pathlib import Path
    from sqlalchemy import text
    
    migrations_dir = Path(__file__).parent / 'migrations'
    
    # Migrations to run in order
    migrations = [
        'add_admin_and_submitted_songs.sql'
    ]
    
    for migration_file in migrations:
        migration_path = migrations_dir / migration_file
        if migration_path.exists():
            try:
                with open(migration_path, 'r') as f:
                    sql_script = f.read()
                
                connection = engine.raw_connection()
                cursor = connection.cursor()
                
                # Split by semicolon and execute each statement
                statements = [s.strip() for s in sql_script.split(';') if s.strip()]
                for statement in statements:
                    cursor.execute(statement)
                
                connection.commit()
                cursor.close()
                connection.close()
                print(f"   ✅ {migration_file}")
            except Exception as e:
                print(f"   ⚠️  {migration_file}: {e}")
        else:
            print(f"   ⚠️  Migration file not found: {migration_file}")

def init_database():
    """Initialize database with all tables"""
    print("🚀 Starting database initialization...")
    print(f"📊 Database URL: {engine.url}")
    
    try:
        # Check if tables already exist
        from sqlalchemy import inspect
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if existing_tables:
            print(f"\n✅ Database already has {len(existing_tables)} tables:")
            for table in existing_tables:
                print(f"   - {table}")
            print("\n✨ Skipping table creation - database is already initialized!")
        else:
            # Create all tables
            print("\n📝 Creating tables...")
            Base.metadata.create_all(bind=engine)
            print("✅ All tables created successfully!")
            
            # Print created tables
            print("\n📋 Created tables:")
            for table in Base.metadata.sorted_tables:
                print(f"   - {table.name}")
        
        # Check and insert default leagues if needed
        from sqlalchemy.orm import Session
        with Session(engine) as session:
            from app.models import League
            league_count = session.query(League).count()
            
            if league_count == 0:
                print("\n🏆 Inserting default leagues...")
                default_leagues = [
                    League(name='Champions League', slug='champions-league', country='Europe', display_order=1),
                    League(name='Premier League', slug='premier-league', country='England', display_order=2),
                    League(name='La Liga', slug='la-liga', country='Spain', display_order=3),
                    League(name='Serie A', slug='serie-a', country='Italy', display_order=4),
                    League(name='Bundesliga', slug='bundesliga', country='Germany', display_order=5),
                    League(name='Ligue 1', slug='ligue-1', country='France', display_order=6),
                    League(name='Europa League', slug='europa-league', country='Europe', display_order=7),
                    League(name='EFL Championship', slug='championship', country='England', display_order=8),
                    League(name='FA Cup', slug='fa-cup', country='England', display_order=9),
                    League(name='EFL Cup', slug='efl-cup', country='England', display_order=10),
                    League(name='Supercopa de España', slug='supercoca-de-espana', country='Spain', display_order=11),
                    League(name='NFL', slug='nfl', country='USA', display_order=12),
                    League(name='MLB', slug='mlb', country='USA', display_order=13),
                ]
                session.add_all(default_leagues)
                session.commit()
                print(f"✅ Inserted {len(default_leagues)} default leagues")
            else:
                print(f"\n✅ Database already has {league_count} leagues")
        
        # Run migrations
        print("\n🔄 Running migrations...")
        run_migrations()
        
        print("\n✨ Database initialization completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error initializing database: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
