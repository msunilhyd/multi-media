#!/usr/bin/env python3
"""Run database migrations from the migrations folder"""

import os
import sys
import psycopg2
from pathlib import Path
from sqlalchemy import create_engine, text

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

def run_migration(db_url, migration_file):
    """Run a single migration file"""
    engine = create_engine(db_url)
    
    with open(migration_file, 'r') as f:
        sql_script = f.read()
    
    with engine.begin() as conn:
        # Split by semicolon and execute each statement
        statements = [s.strip() for s in sql_script.split(';') if s.strip()]
        for statement in statements:
            print(f"Executing: {statement[:80]}...")
            conn.execute(text(statement))
    
    print(f"✓ Successfully ran {Path(migration_file).name}\n")

def main():
    migrations_dir = Path(__file__).parent / 'migrations'
    
    # List of migrations to run
    migrations = [
        'add_admin_and_submitted_songs.sql'
    ]
    
    print("Starting database migrations...\n")
    
    for migration in migrations:
        migration_file = migrations_dir / migration
        if migration_file.exists():
            run_migration(DATABASE_URL, migration_file)
        else:
            print(f"⚠ Migration file not found: {migration}")
    
    print("✓ All migrations completed!")

if __name__ == '__main__':
    main()
