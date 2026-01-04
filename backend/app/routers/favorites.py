from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from ..database import get_db
from ..models_users import User, UserFavoriteTeam
from ..schemas_users import UserFavoriteTeamCreate, UserFavoriteTeamResponse
from .auth import get_current_user
from .. import models

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


@router.get("/teams", response_model=List[UserFavoriteTeamResponse])
def get_favorite_teams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all favorite teams for the current user"""
    favorites = db.query(UserFavoriteTeam).filter(
        UserFavoriteTeam.user_id == current_user.id
    ).all()
    return favorites


@router.post("/teams", response_model=UserFavoriteTeamResponse)
def add_favorite_team(
    team_data: UserFavoriteTeamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a team to user's favorites"""
    
    # Check if already exists
    existing = db.query(UserFavoriteTeam).filter(
        UserFavoriteTeam.user_id == current_user.id,
        UserFavoriteTeam.team_name == team_data.team_name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team already in favorites"
        )
    
    # Create new favorite
    favorite = UserFavoriteTeam(
        user_id=current_user.id,
        team_name=team_data.team_name,
        league_id=team_data.league_id
    )
    
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    
    return favorite


@router.post("/teams/bulk", response_model=List[UserFavoriteTeamResponse])
def add_favorite_teams_bulk(
    teams: List[UserFavoriteTeamCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add multiple teams to user's favorites at once"""
    
    # Get existing favorites to avoid duplicates
    existing_teams = db.query(UserFavoriteTeam.team_name).filter(
        UserFavoriteTeam.user_id == current_user.id
    ).all()
    existing_team_names = set(t[0] for t in existing_teams)
    
    # Create new favorites
    new_favorites = []
    for team_data in teams:
        if team_data.team_name not in existing_team_names:
            favorite = UserFavoriteTeam(
                user_id=current_user.id,
                team_name=team_data.team_name,
                league_id=team_data.league_id
            )
            new_favorites.append(favorite)
            existing_team_names.add(team_data.team_name)
    
    if new_favorites:
        db.add_all(new_favorites)
        db.commit()
        for fav in new_favorites:
            db.refresh(fav)
    
    # Return all current favorites
    all_favorites = db.query(UserFavoriteTeam).filter(
        UserFavoriteTeam.user_id == current_user.id
    ).all()
    
    return all_favorites


@router.delete("/teams/{team_name}")
def remove_favorite_team(
    team_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a team from user's favorites"""
    
    favorite = db.query(UserFavoriteTeam).filter(
        UserFavoriteTeam.user_id == current_user.id,
        UserFavoriteTeam.team_name == team_name
    ).first()
    
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not in favorites"
        )
    
    db.delete(favorite)
    db.commit()
    
    return {"message": "Team removed from favorites"}


@router.delete("/teams")
def clear_favorite_teams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear all favorite teams for the user"""
    
    db.query(UserFavoriteTeam).filter(
        UserFavoriteTeam.user_id == current_user.id
    ).delete()
    
    db.commit()
    
    return {"message": "All favorite teams cleared"}


@router.put("/teams/replace", response_model=List[UserFavoriteTeamResponse])
def replace_favorite_teams(
    teams: List[UserFavoriteTeamCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Replace all favorite teams with new list"""
    
    # Delete all existing favorites
    db.query(UserFavoriteTeam).filter(
        UserFavoriteTeam.user_id == current_user.id
    ).delete()
    
    # Add new favorites
    new_favorites = []
    for team_data in teams:
        favorite = UserFavoriteTeam(
            user_id=current_user.id,
            team_name=team_data.team_name,
            league_id=team_data.league_id
        )
        new_favorites.append(favorite)
    
    if new_favorites:
        db.add_all(new_favorites)
        db.commit()
        for fav in new_favorites:
            db.refresh(fav)
    
    return new_favorites
