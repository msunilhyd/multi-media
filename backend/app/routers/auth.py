from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import bcrypt
from typing import Optional

from ..database import get_db
from ..models_users import User, NotificationPreference
from ..schemas_users import UserCreate, UserResponse, UserLogin

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/register", response_model=UserResponse)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with email and password"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    password_hash = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Create user
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=password_hash,
        provider="email"
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create default notification preferences (handled by trigger)
    
    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        created_at=new_user.created_at
    )


@router.post("/login", response_model=UserResponse)
def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    """Login user with email and password"""
    
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check password
    if not bcrypt.checkpw(login_data.password.encode('utf-8'), user.password_hash.encode('utf-8')):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )
    
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        created_at=user.created_at
    )


@router.post("/google", response_model=UserResponse)
def google_auth(google_data: dict, db: Session = Depends(get_db)):
    """Handle Google OAuth authentication"""
    
    email = google_data.get("email")
    name = google_data.get("name")
    google_id = google_data.get("google_id")
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.email == email).first()
    
    if user:
        # Update Google ID if not set
        if not user.provider_id and google_id:
            user.provider_id = google_id
            user.provider = "google"
            db.commit()
            db.refresh(user)
    else:
        # Create new user
        user = User(
            email=email,
            name=name,
            provider="google",
            provider_id=google_id,
            email_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        created_at=user.created_at
    )