from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import get_settings

settings = get_settings()

if settings.database_url.startswith("sqlite"):
    engine = create_engine(
        settings.database_url, 
        connect_args={"check_same_thread": False}
    )
else:
    # For PostgreSQL, add connection arguments for schema
    connect_args = {}
    if "postgresql" in settings.database_url or "postgres" in settings.database_url:
        connect_args["options"] = "-c search_path=linus_playlists,public"
    
    engine = create_engine(
        settings.database_url,
        connect_args=connect_args
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
