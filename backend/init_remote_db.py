#!/usr/bin/env python3
"""
Initialize remote Railway database with NFL and MLB leagues
This script connects to the Railway database and adds missing leagues
"""
import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Get the Railway database URL from environment
# If not set, ask user to provide it
railway_db_url = os.getenv('RAILWAY_DATABASE_URL') or os.getenv('DATABASE_URL_REMOTE')

if not railway_db_url:
    print("❌ RAILWAY_DATABASE_URL not found in .env")
    print("\nPlease set RAILWAY_DATABASE_URL in your .env file with your Railway PostgreSQL connection string")
    print("Example: postgresql://user:password@host:port/database")
    sys.exit(1)

print(f"🔗 Connecting to Railway database...")
print(f"📊 Database: {railway_db_url.split('@')[1] if '@' in railway_db_url else 'unknown'}")

try:
    # Create engine for Railway database
    engine = create_engine(railway_db_url)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Check if NFL league exists
    result = session.execute(text("SELECT id FROM leagues WHERE slug = 'nfl'"))
    nfl_exists = result.fetchone() is not None
    
    # Check if MLB league exists
    result = session.execute(text("SELECT id FROM leagues WHERE slug = 'mlb'"))
    mlb_exists = result.fetchone() is not None
    
    if nfl_exists and mlb_exists:
        print("✅ NFL and MLB leagues already exist in remote database")
    else:
        print("📝 Adding missing leagues to remote database...")
        
        if not nfl_exists:
            session.execute(text("""
                INSERT INTO leagues (name, slug, country, display_order)
                VALUES ('NFL', 'nfl', 'USA', 12)
            """))
            print("  ✅ Added NFL league")
        
        if not mlb_exists:
            session.execute(text("""
                INSERT INTO leagues (name, slug, country, display_order)
                VALUES ('MLB', 'mlb', 'USA', 13)
            """))
            print("  ✅ Added MLB league")
        
        session.commit()
        print("\n✅ Remote database initialized successfully!")
    
    # Verify leagues
    result = session.execute(text("SELECT name, slug FROM leagues ORDER BY display_order"))
    leagues = result.fetchall()
    print(f"\n📊 Leagues in remote database ({len(leagues)} total):")
    for name, slug in leagues:
        print(f"  - {name} ({slug})")
    
    session.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("\nMake sure your RAILWAY_DATABASE_URL is correct and the database is accessible")
    sys.exit(1)
