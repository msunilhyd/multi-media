from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import leagues, matches, highlights, admin
from .config import get_settings
from .scheduler import start_scheduler, shutdown_scheduler

settings = get_settings()

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - start/stop scheduler"""
    # Startup
    start_scheduler()
    yield
    # Shutdown
    shutdown_scheduler()


app = FastAPI(
    title=settings.app_name,
    description="API for football match highlights from various leagues",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    redirect_slashes=False,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=False,  # Must be False when using allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leagues.router)
app.include_router(matches.router)
app.include_router(highlights.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {
        "message": "Football Highlights API",
        "docs": "/api/docs",
        "version": "1.0.0"
    }


@app.get("/api/health")
@app.get("/health")
def health_check():
    return {"status": "healthy"}
