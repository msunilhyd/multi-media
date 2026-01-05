from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import bcrypt
from typing import Optional
import jwt
from datetime import datetime, timedelta

from ..database import get_db
from ..models_users import User, NotificationPreference
from ..schemas_users import UserCreate, UserResponse, UserLogin

# JWT settings
JWT_SECRET = "your-secret-key-here-change-in-production"  # In production, use environment variable
JWT_ALGORITHM = "HS256"

security = HTTPBearer()

router = APIRouter(prefix="/api/auth", tags=["authentication"])


class AuthResponse(BaseModel):
    user: dict
    access_token: str
    token_type: str = "bearer"


@router.post("/register", response_model=AuthResponse)
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
    
    # Create JWT token
    access_token = create_access_token(new_user.id)
    
    return AuthResponse(
        user={
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.name,
            "created_at": new_user.created_at.isoformat()
        },
        access_token=access_token
    )


@router.post("/login", response_model=AuthResponse)
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
    
    # Create JWT token
    access_token = create_access_token(user.id)
    
    return AuthResponse(
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "created_at": user.created_at.isoformat()
        },
        access_token=access_token
    )


@router.post("/google", response_model=AuthResponse)
async def google_auth(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Handle Google OAuth authentication"""
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid authorization header"
        )
    
    google_token = authorization.replace("Bearer ", "")
    
    # Verify Google token and get user info
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f'Bearer {google_token}'}
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Google token"
                )
            
            google_user = response.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to verify Google token: {str(e)}"
        )
    
    email = google_user.get("email")
    name = google_user.get("name")
    google_id = google_user.get("id")
    picture_url = google_user.get("picture")
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by Google"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.email == email).first()
    
    if user:
        # Update Google ID and picture if not set
        if not user.provider_id and google_id:
            user.provider_id = google_id
            user.provider = "google"
        if picture_url and not user.picture_url:
            user.picture_url = picture_url
        db.commit()
        db.refresh(user)
    else:
        # Create new user
        user = User(
            email=email,
            name=name or email.split('@')[0],
            provider="google",
            provider_id=google_id,
            email_verified=True,
            picture_url=picture_url
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Create JWT token
    access_token = create_access_token(user.id)
    
    return AuthResponse(
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "provider": user.provider,
            "google_id": user.provider_id if user.provider == "google" else None,
            "picture_url": user.picture_url,
        },
        access_token=access_token
    )


def create_access_token(user_id: int) -> str:
    """Create JWT access token for user"""
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=24)  # Token expires in 24 hours
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current user from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user


# For simple user authentication without JWT (for development)
def get_user_by_email(email: str, db: Session = Depends(get_db)) -> User:
    """Get user by email for simple authentication"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user