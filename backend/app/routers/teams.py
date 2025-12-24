from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from typing import List
from ..database import get_db
from .. import models

router = APIRouter(prefix="/api/teams", tags=["teams"])


@router.get("/all")
def get_all_teams(db: Session = Depends(get_db)):
    """Get all unique teams grouped by league"""
    
    # Get all leagues with their teams
    leagues = db.query(models.League).all()
    
    result = []
    for league in leagues:
        # Get unique teams from matches in this league
        home_teams = db.query(distinct(models.Match.home_team)).filter(
            models.Match.league_id == league.id
        ).all()
        
        away_teams = db.query(distinct(models.Match.away_team)).filter(
            models.Match.league_id == league.id
        ).all()
        
        # Combine and sort teams
        teams_set = set()
        for (team,) in home_teams:
            if team:
                teams_set.add(team)
        for (team,) in away_teams:
            if team:
                teams_set.add(team)
        
        teams_list = sorted(list(teams_set))
        
        if teams_list:
            result.append({
                "league_id": league.id,
                "league_name": league.name,
                "league_slug": league.slug,
                "teams": teams_list
            })
    
    return result
