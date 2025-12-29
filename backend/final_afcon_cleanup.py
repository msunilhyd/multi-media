import sys
sys.path.append('/Users/s0m13i5/linus/multi-media/backend')

from sqlalchemy.orm import Session
from sqlalchemy import text, create_engine
from app.database import SessionLocal

def final_afcon_cleanup():
    """Final cleanup to ensure only 1 highlight per AFCON match"""
    
    # Production database
    print(f"🔧 Final cleanup of PRODUCTION database...")
    prod_url = "postgresql://postgres:wUXRJCcrvqKCaNLZaUiRDXEbsjdduujw@shinkansen.proxy.rlwy.net:49888/railway"
    
    try:
        prod_engine = create_engine(prod_url)
        
        with prod_engine.connect() as conn:
            # Find any highlights with "EXTENDED" in the title (any position)
            extended_prod = conn.execute(text("""
                SELECT h.id, h.title, h.youtube_video_id, m.home_team, m.away_team
                FROM highlights h
                JOIN matches m ON h.match_id = m.id
                JOIN leagues l ON m.league_id = l.id
                WHERE l.name = 'AFCON' 
                AND (h.title ILIKE '%EXTENDED HIGHLIGHTS%' OR h.title ILIKE '%HIGHLIGHTS EXTENDED%')
            """)).fetchall()
            
            print(f"📊 Found {len(extended_prod)} extended highlights to remove from production")
            
            for highlight in extended_prod:
                match_name = f"{highlight.home_team} vs {highlight.away_team}"
                print(f"🗑️ Removing from prod: {match_name} | {highlight.title[:50]}... (ID: {highlight.id})")
                conn.execute(text("DELETE FROM highlights WHERE id = :id"), {"id": highlight.id})
            
            conn.commit()
            print(f"✅ Production database final cleanup complete!")
            
            # Check final status
            final_status = conn.execute(text("""
                SELECT m.home_team, m.away_team, COUNT(h.id) as highlight_count
                FROM matches m
                JOIN leagues l ON m.league_id = l.id
                LEFT JOIN highlights h ON h.match_id = m.id
                WHERE l.name = 'AFCON'
                GROUP BY m.id, m.home_team, m.away_team
                ORDER BY m.match_date DESC
            """)).fetchall()
            
            print(f"\n📈 Final AFCON match status:")
            total_highlights = 0
            for match in final_status:
                print(f"  {match.home_team} vs {match.away_team}: {match.highlight_count} highlights")
                total_highlights += match.highlight_count
            
            print(f"\n🎯 Total AFCON highlights: {total_highlights}")
    
    except Exception as e:
        print(f"❌ Error with production database: {e}")
    
    print(f"\n🎉 Final cleanup complete!")

if __name__ == "__main__":
    final_afcon_cleanup()