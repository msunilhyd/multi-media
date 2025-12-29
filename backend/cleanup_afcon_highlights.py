import sys
sys.path.append('/Users/s0m13i5/linus/multi-media/backend')

from sqlalchemy.orm import Session
from sqlalchemy import text, create_engine
from app.database import SessionLocal

def remove_extended_highlights():
    """Remove extended highlights, keep only the shorter regular highlights"""
    
    # Local database first
    print("🔧 Cleaning up LOCAL database...")
    db = SessionLocal()
    
    try:
        # Find and remove extended highlights
        extended_highlights = db.execute(text("""
            SELECT h.id, h.title, h.youtube_video_id 
            FROM highlights h
            JOIN matches m ON h.match_id = m.id
            JOIN leagues l ON m.league_id = l.id
            WHERE l.name = 'AFCON' 
            AND h.title ILIKE '%EXTENDED HIGHLIGHTS%'
        """)).fetchall()
        
        print(f"📊 Found {len(extended_highlights)} extended highlights to remove")
        
        for highlight in extended_highlights:
            print(f"🗑️ Removing: {highlight.title[:60]}... (ID: {highlight.id})")
            db.execute(text("DELETE FROM highlights WHERE id = :id"), {"id": highlight.id})
        
        db.commit()
        print(f"✅ Local database cleaned up!")
        
        # Check remaining highlights
        remaining = db.execute(text("""
            SELECT COUNT(*) as count
            FROM highlights h
            JOIN matches m ON h.match_id = m.id
            JOIN leagues l ON m.league_id = l.id
            WHERE l.name = 'AFCON'
        """)).fetchone()
        
        print(f"📈 Remaining AFCON highlights: {remaining.count}")
        
    except Exception as e:
        print(f"❌ Error with local database: {e}")
        db.rollback()
    finally:
        db.close()
    
    # Production database
    print(f"\n🔧 Cleaning up PRODUCTION database...")
    prod_url = "postgresql://postgres:wUXRJCcrvqKCaNLZaUiRDXEbsjdduujw@shinkansen.proxy.rlwy.net:49888/railway"
    
    try:
        prod_engine = create_engine(prod_url)
        
        with prod_engine.connect() as conn:
            # Find extended highlights in production
            extended_prod = conn.execute(text("""
                SELECT h.id, h.title, h.youtube_video_id 
                FROM highlights h
                JOIN matches m ON h.match_id = m.id
                JOIN leagues l ON m.league_id = l.id
                WHERE l.name = 'AFCON' 
                AND h.title ILIKE '%EXTENDED HIGHLIGHTS%'
            """)).fetchall()
            
            print(f"📊 Found {len(extended_prod)} extended highlights to remove from production")
            
            for highlight in extended_prod:
                print(f"🗑️ Removing from prod: {highlight.title[:60]}... (ID: {highlight.id})")
                conn.execute(text("DELETE FROM highlights WHERE id = :id"), {"id": highlight.id})
            
            conn.commit()
            print(f"✅ Production database cleaned up!")
            
            # Check remaining production highlights
            remaining_prod = conn.execute(text("""
                SELECT COUNT(*) as count
                FROM highlights h
                JOIN matches m ON h.match_id = m.id
                JOIN leagues l ON m.league_id = l.id
                WHERE l.name = 'AFCON'
            """)).fetchone()
            
            print(f"📈 Remaining AFCON highlights in production: {remaining_prod.count}")
    
    except Exception as e:
        print(f"❌ Error with production database: {e}")
    
    print(f"\n🎉 Cleanup complete! Now each AFCON match should have only 1 highlight (the shorter version).")

if __name__ == "__main__":
    remove_extended_highlights()