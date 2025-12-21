from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/leagues", tags=["leagues"])


@router.get("", response_model=List[schemas.League])
def get_leagues(db: Session = Depends(get_db)):
    leagues = db.query(models.League).order_by(models.League.display_order).all()
    return leagues


@router.get("/{slug}", response_model=schemas.LeagueWithMatches)
def get_league_by_slug(slug: str, db: Session = Depends(get_db)):
    league = db.query(models.League).filter(models.League.slug == slug).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return league


@router.post("", response_model=schemas.League)
def create_league(league: schemas.LeagueCreate, db: Session = Depends(get_db)):
    existing = db.query(models.League).filter(models.League.slug == league.slug).first()
    if existing:
        return existing
    
    db_league = models.League(**league.model_dump())
    db.add(db_league)
    db.commit()
    db.refresh(db_league)
    return db_league
