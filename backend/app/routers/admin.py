from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from ..database import get_db
from .. import models

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.post("/fix-data-integrity")
def fix_data_integrity(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Fix data integrity issues - remove highlights from scheduled/live matches"""
    
    result = {
        "scheduled_matches_cleaned": 0,
        "highlights_removed": 0,
        "highlights_moved": 0,
        "details": []
    }
    
    # Find scheduled/live matches that incorrectly have highlights
    scheduled_matches = db.query(models.Match).filter(
        models.Match.status.in_(["scheduled", "live"])
    ).all()
    
    for match in scheduled_matches:
        if match.highlights:
            match_detail = {
                "match_id": match.id,
                "teams": f"{match.home_team} vs {match.away_team}",
                "date": str(match.match_date),
                "status": match.status,
                "highlights_before": len(match.highlights),
                "action": "removed_highlights"
            }
            
            # Remove highlights from scheduled matches
            for highlight in match.highlights:
                db.delete(highlight)
                result["highlights_removed"] += 1
            
            result["scheduled_matches_cleaned"] += 1
            result["details"].append(match_detail)
    
    # Commit changes
    db.commit()
    
    return result