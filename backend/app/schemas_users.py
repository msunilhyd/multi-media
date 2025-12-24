from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List


class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserFavoriteTeamBase(BaseModel):
    team_name: str
    league_id: Optional[int] = None


class UserFavoriteTeamCreate(UserFavoriteTeamBase):
    pass


class UserFavoriteTeamResponse(UserFavoriteTeamBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class NotificationPreferenceBase(BaseModel):
    email_highlights: bool = True
    email_match_reminders: bool = False
    push_notifications: bool = False


class NotificationPreferenceUpdate(NotificationPreferenceBase):
    pass


class NotificationPreferenceResponse(NotificationPreferenceBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class NotificationBase(BaseModel):
    type: str
    title: str
    message: Optional[str] = None
    match_id: Optional[int] = None


class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    sent_at: datetime
    read_at: Optional[datetime] = None
    email_sent: bool = False
    push_sent: bool = False
    
    class Config:
        from_attributes = True


# Combined response models
class UserWithPreferences(UserResponse):
    notification_preferences: Optional[NotificationPreferenceResponse] = None
    favorite_teams: List[UserFavoriteTeamResponse] = []