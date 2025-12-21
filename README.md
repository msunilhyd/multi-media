# Football Highlights Dashboard

A full-stack web application that scrapes BBC Sport for football fixtures and displays YouTube highlights grouped by league.

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: FastAPI (Python), SQLAlchemy
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **APIs**: YouTube Data API v3

## Project Structure

```
football-highlights-app/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── models.py         # SQLAlchemy models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── database.py       # Database configuration
│   │   ├── config.py         # App settings
│   │   ├── scraper.py        # BBC Sport scraper
│   │   ├── youtube_service.py # YouTube API service
│   │   └── routers/          # API routes
│   │       ├── matches.py
│   │       ├── leagues.py
│   │       └── highlights.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js app router pages
│   │   ├── components/       # React components
│   │   └── lib/              # API utilities
│   ├── package.json
│   └── next.config.js
└── README.md
```

## Quick Start

### 1. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your YOUTUBE_API_KEY

# Start the backend server
uvicorn app.main:app --reload --port 8000
```

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the frontend dev server
npm run dev
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/api/docs

MIT License - For educational purposes only.
# multi-media
