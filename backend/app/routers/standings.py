import httpx
from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, List
from ..football_api import get_football_api

router = APIRouter(prefix="/api/standings", tags=["standings"])

# Mapping from league slugs to ESPN league codes
LEAGUE_ESPN_MAP = {
    "premier-league": "eng.1",
    "la-liga": "esp.1",
    "bundesliga": "ger.1",
    "serie-a": "ita.1",
    "ligue-1": "fra.1",
    "super-league": "tur.1",  # Turkish Super Lig
    "champions-league": "uefa.champions",
    "europa-league": "uefa.europa",
}


@router.get("/fifa-world-cup")
async def get_fifa_standings() -> List[Dict]:
    """Fetch live FIFA World Cup 2026 group standings from ESPN (no API key required)."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings",
                headers={"User-Agent": "Mozilla/5.0"}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail="ESPN API unavailable")
            data = resp.json()

        groups = []
        for child in data.get("children", []):
            group_name = child.get("name", "")
            entries = child.get("standings", {}).get("entries", [])
            teams = []
            for entry in entries:
                team = entry.get("team", {})
                note = entry.get("note", {})
                stats = {s["name"]: s.get("value", 0) for s in entry.get("stats", []) if "value" in s}
                logo = team.get("logos", [{}])[0].get("href", "") if team.get("logos") else ""
                teams.append({
                    "name": team.get("displayName", ""),
                    "abbr": team.get("abbreviation", ""),
                    "logo": logo,
                    "mp": int(stats.get("gamesPlayed", 0)),
                    "w": int(stats.get("wins", 0)),
                    "d": int(stats.get("ties", 0)),
                    "l": int(stats.get("losses", 0)),
                    "gf": int(stats.get("pointsFor", 0)),
                    "ga": int(stats.get("pointsAgainst", 0)),
                    "gd": int(stats.get("pointDifferential", 0)),
                    "pts": int(stats.get("points", 0)),
                    "advancing": note.get("color", "") in ("#81D6AC", "#green") or "Advance" in note.get("description", ""),
                    "note": note.get("description", ""),
                })
            groups.append({"group": group_name, "teams": teams})

        return groups

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
    - super-league (Turkish Super Lig)
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
