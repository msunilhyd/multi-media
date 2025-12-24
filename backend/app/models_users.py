from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(100))
    password_hash = Column(String(255))  # For email/password auth
    provider = Column(String(50), default="email")  # 'email', 'google', 'github'
    provider_id = Column(String(100))  # External provider user ID
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    favorite_teams = relationship("UserFavoriteTeam", back_populates="user", cascade="all, delete-orphan")
    notification_preferences = relationship("NotificationPreference", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class UserFavoriteTeam(Base):
    __tablename__ = "user_favorite_teams"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    team_name = Column(String(100), nullable=False)
    league_id = Column(Integer, ForeignKey("leagues.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="favorite_teams")
    league = relationship("League")
    
    # Constraints
    __table_args__ = (UniqueConstraint("user_id", "team_name", name="unique_user_team"),)


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    email_highlights = Column(Boolean, default=True)
    email_match_reminders = Column(Boolean, default=False)
    push_notifications = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notification_preferences")


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)  # 'match_reminder', 'highlights_available', 'weekly_digest'
    title = Column(String(200), nullable=False)
    message = Column(Text)
    match_id = Column(Integer, ForeignKey("matches.id", ondelete="SET NULL"))
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True))
    email_sent = Column(Boolean, default=False)
    push_sent = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    match = relationship("Match")