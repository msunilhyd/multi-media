#!/usr/bin/env python3
"""
Script to update league display order in existing database
Run this to set Champions League as top priority
"""
import sys
import os

# Add the backend directory to the path so we can import app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy.orm import Session
from app.models import League

def update_league_order():
    """Update display order to prioritize Champions League"""
    print("🔄 Updating league display order...")
    
    with Session(engine) as session:
        # Get current leagues
        leagues = session.query(League).all()
        print(f"📊 Found {len(leagues)} leagues")
        
        # Update display orders
        updates = {
            'champions-league': 1,
            'premier-league': 2,
            'la-liga': 3,
            'serie-a': 4,
            'bundesliga': 5,
            'ligue-1': 6,
            'europa-league': 7,
            'championship': 8,
            'fa-cup': 9,
            'efl-cup': 10,
            'supercopa-de-espana': 11,
        }
        
        updated_count = 0
        for league in leagues:
            if league.slug in updates:
                old_order = league.display_order
                new_order = updates[league.slug]
                if old_order != new_order:
                    league.display_order = new_order
                    print(f"   ✓ {league.name}: {old_order} → {new_order}")
                    updated_count += 1
        
        if updated_count > 0:
            session.commit()
            print(f"\n✅ Updated {updated_count} leagues successfully!")
        else:
            print("\n✅ All leagues already have correct display order")
        
        # Show final order
        print("\n📋 Current league order:")
        leagues = session.query(League).order_by(League.display_order).all()
        for league in leagues:
            print(f"   {league.display_order}. {league.name} ({league.slug})")

if __name__ == "__main__":
    try:
        update_league_order()
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
