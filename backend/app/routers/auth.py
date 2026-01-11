from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import bcrypt
from typing import Optional
import jwt
from datetime import datetime, timedelta
import httpx

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


class GoogleAuthRequest(BaseModel):
    code: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    google_id: Optional[str] = None
    picture: Optional[str] = None


@router.post("/google", response_model=AuthResponse)
async def google_auth(
    auth_data: GoogleAuthRequest,
    db: Session = Depends(get_db)
):
    """Handle Google OAuth authentication - supports both code flow (mobile) and direct user data (web)"""
    
    email = auth_data.email
    name = auth_data.name
    google_id = auth_data.google_id
    
    # If authorization code is provided, exchange it for user info
    if auth_data.code:
        try:
            async with httpx.AsyncClient() as client:
                # Exchange code for access token
                token_response = await client.post(
                    'https://oauth2.googleapis.com/token',
                    data={
                        'code': auth_data.code,
                        'client_id': '472641857686-qcnd1804adma81q7j7o7t6ge9e80alkt.apps.googleusercontent.com',
                        'redirect_uri': 'com.googleusercontent.apps.472641857686-qcnd1804adma81q7j7o7t6ge9e80alkt:/oauth2redirect',
                        'grant_type': 'authorization_code',
                    }
                )
                token_data = token_response.json()
                
                print(f"Token response: {token_data}")  # Debug logging
                
                if 'error' in token_data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Google OAuth error: {token_data.get('error_description', token_data['error'])}"
                    )
                
                access_token = token_data.get('access_token')
                
                # Get user info from Google
                user_response = await client.get(
                    'https://www.googleapis.com/oauth2/v2/userinfo',
                    headers={'Authorization': f'Bearer {access_token}'}
                )
                user_data = user_response.json()
                
                email = user_data.get('email')
                name = user_data.get('name')
                google_id = user_data.get('id')
                
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to exchange authorization code: {str(e)}"
            )
    
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
        if name and not user.name:
            user.name = name
        db.commit()
        db.refresh(user)
    else:
        # Create new user
        user = User(
            email=email,
            name=name or email.split('@')[0],
            provider="google",
            provider_id=google_id,
            email_verified=True
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
                detail="Invalid token: missing user_id in payload"
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
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