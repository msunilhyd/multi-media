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
from ..models_users import User, NotificationPreference, UserFavoriteTeam, UserPlaylist
from ..schemas_users import UserCreate, UserResponse, UserLogin

# JWT settings
JWT_SECRET = "your-secret-key-here-change-in-production"  # In production, use environment variable
JWT_ALGORITHM = "HS256"

security = HTTPBearer()

router = APIRouter(prefix="/api/auth", tags=["authentication"])


# Helper functions
def create_access_token(user_id: int) -> str:
    """Create JWT access token for user"""
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)  # Token expires in 7 days
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


# Response models
class AuthResponse(BaseModel):
    user: dict
    access_token: str
    token_type: str = "bearer"


class DeleteAccountResponse(BaseModel):
    message: str
    deleted_user_id: int


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
    code_verifier: Optional[str] = None
    redirect_uri: Optional[str] = None
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
                # Use iOS client for mobile PKCE flow (no client_secret needed)
                redirect_uri = auth_data.redirect_uri or 'com.googleusercontent.apps.472641857686-qcnd1804adma81q7j7o7t6ge9e80alkt:/oauth2redirect'
                
                token_data_payload = {
                    'code': auth_data.code,
                    'client_id': '472641857686-qcnd1804adma81q7j7o7t6ge9e80alkt.apps.googleusercontent.com',  # iOS client
                    'redirect_uri': redirect_uri,
                    'grant_type': 'authorization_code',
                }
                
                # Add code_verifier if provided (PKCE flow for mobile)
                if auth_data.code_verifier:
                    token_data_payload['code_verifier'] = auth_data.code_verifier
                
                token_response = await client.post(
                    'https://oauth2.googleapis.com/token',
                    data=token_data_payload
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


class AppleAuthRequest(BaseModel):
    identityToken: Optional[str] = None
    user: Optional[str] = None
    email: Optional[str] = None
    fullName: Optional[dict] = None


@router.post("/apple", response_model=AuthResponse)
async def apple_auth(
    auth_data: AppleAuthRequest,
    db: Session = Depends(get_db)
):
    """Handle Apple Sign In authentication"""
    
    print(f"🍎 Apple auth endpoint called")
    print(f"🍎 Received data: user={auth_data.user}, email={auth_data.email}, has_token={bool(auth_data.identityToken)}")
    
    try:
        # Extract user info from the request
        apple_user_id = auth_data.user
        email = auth_data.email
        
        # Construct name from fullName if provided
        name = None
        if auth_data.fullName:
            given_name = auth_data.fullName.get('givenName', '')
            family_name = auth_data.fullName.get('familyName', '')
            if given_name or family_name:
                name = f"{given_name} {family_name}".strip()
        
        # Check if user exists by Apple ID or email
        user = None
        if apple_user_id:
            user = db.query(User).filter(
                User.provider_id == apple_user_id,
                User.provider == "apple"
            ).first()
        
        if not user and email:
            user = db.query(User).filter(User.email == email).first()
        
        if user:
            # Update Apple ID if not set
            if not user.provider_id and apple_user_id:
                user.provider_id = apple_user_id
                user.provider = "apple"
            if name and not user.name:
                user.name = name
            db.commit()
            db.refresh(user)
        else:
            # Create new user
            # If no email provided (user chose to hide), generate a private email
            if not email:
                email = f"{apple_user_id}@privaterelay.appleid.com"
            
            user = User(
                email=email,
                name=name or "Apple User",
                provider="apple",
                provider_id=apple_user_id,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create default notification preferences
            notification_pref = NotificationPreference(
                user_id=user.id,
                email_match_reminders=True,
                email_highlights=True,
                push_notifications=False
            )
            db.add(notification_pref)
            db.commit()
        
        # Create JWT token
        access_token = create_access_token(user.id)
        
        return AuthResponse(
            user={
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "provider": user.provider,
            },
            access_token=access_token
        )
    except Exception as e:
        import traceback
        print(f"❌ Apple auth error: {str(e)}")
        print(traceback.format_exc())
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Apple authentication failed: {str(e)}")


@router.post("/refresh", response_model=AuthResponse)
def refresh_token(current_user: User = Depends(get_current_user)):
    """Refresh JWT access token for current user"""
    # Create new JWT token
    access_token = create_access_token(current_user.id)
    
    return AuthResponse(
        user={
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
            "provider": current_user.provider,
        },
        access_token=access_token
    )


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


@router.delete("/me", response_model=DeleteAccountResponse)
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete user account and all associated data.
    This action is permanent and cannot be undone.
    """
    user_id = current_user.id
    
    try:
        # Delete user's favorite teams
        db.query(UserFavoriteTeam).filter(UserFavoriteTeam.user_id == user_id).delete()
        
        # Delete user's playlists
        db.query(UserPlaylist).filter(UserPlaylist.user_id == user_id).delete()
        
        # Delete notification preferences
        db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).delete()
        
        # Delete the user account
        db.delete(current_user)
        db.commit()
        
        return DeleteAccountResponse(
            message="Account successfully deleted",
            deleted_user_id=user_id
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete account: {str(e)}"
        )