from fastapi import APIRouter, HTTPException
from typing import Optional, Dict
from ..football_api import get_football_api

router = APIRouter(prefix="/api/standings", tags=["standings"])

# Mapping from league slugs to ESPN league codes
LEAGUE_ESPN_MAP = {
    "premier-league": "eng.1",
    "la-liga": "esp.1",
    "bundesliga": "ger.1",
    "serie-a": "ita.1",
    "ligue-1": "fra.1",
    "champions-league": "uefa.champions",
    "europa-league": "uefa.europa",
}


@router.get("/{league_slug}")
async def get_standings(league_slug: str) -> Dict:
    """
    Get standings for a specific league.
    
    Supported leagues:
    - premier-league
    - la-liga
    - bundesliga
    - serie-a
    - ligue-1
    - champions-league
    - europa-league
    """
    espn_league_code = LEAGUE_ESPN_MAP.get(league_slug)
    
    if not espn_league_code:
        raise HTTPException(
            status_code=404,
            detail=f"Standings not available for {league_slug}. Supported leagues: {', '.join(LEAGUE_ESPN_MAP.keys())}"
        )
    
    football_api = get_football_api()
    standings = await football_api.get_standings(espn_league_code)
    
    if not standings:
        raise HTTPException(
            status_code=404,
            detail=f"Failed to fetch standings for {league_slug}"
        )
    
    return standings
