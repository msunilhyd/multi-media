# Multi-Media Platform

A full-stack multi-platform application for football highlights and music playlists. Available on web and mobile (iOS/Android).

## Tech Stack

- **Web Frontend**: Next.js 14, React, TailwindCSS
- **Mobile App**: React Native, Expo, TypeScript
- **Backend**: FastAPI (Python), SQLAlchemy
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **APIs**: YouTube Data API v3, Football API

## Project Structure

```
multi-media/
├── backend/              # FastAPI backend server
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── models.py         # SQLAlchemy models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── database.py       # Database configuration
│   │   ├── config.py         # App settings
│   │   ├── scraper.py        # BBC Sport scraper
│   │   ├── youtube_service.py # YouTube API service
│   │   └── routers/          # API routes
│   ├── requirements.txt
│   └── DEPLOY.md
├── frontend/             # Next.js web application
│   ├── src/
│   │   ├── app/              # Next.js app router pages
│   │   ├── components/       # React components
│   │   └── lib/              # API utilities
│   ├── package.json
│   └── DEPLOY.md
├── mobile/               # React Native + Expo mobile app
│   ├── src/
│   │   ├── navigation/       # App navigation
│   │   ├── screens/          # Mobile screens
│   │   └── services/         # API client
│   ├── App.tsx
│   ├── package.json
│   └── README.md
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

### 3. Setup Mobile App (Optional)

```bash
cd mobile

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env and set EXPO_PUBLIC_API_URL to your backend URL

# Start Expo dev server
npm start
```

### 4. Access the Applications

- **Web Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Mobile**: Scan QR code with Expo Go app

## 📱 Mobile App Features

The mobile app includes all advanced features:

- ✅ **Full-Screen Video Player** - YouTube integration with play/pause controls
- ✅ **Authentication** - Login/signup with JWT token management
- ✅ **Real-Time Search** - Search highlights by title or competition
- ✅ **Favorites** - Bookmark highlights and playlists with local storage
- ✅ **Push Notifications** - Get notified about new highlights
- ✅ **Offline Caching** - Browse content without internet (1-hour cache)

### Mobile Screens

1. **Highlights** - Browse football highlights with search
2. **Playlists** - Access music playlists
3. **Favorites** - View all saved favorites
4. **Profile** - Manage settings and notifications

For detailed mobile documentation, see [`mobile/README.md`](./mobile/README.md)

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel deploy --prod
```

### Backend (Railway)
See [`backend/DEPLOY.md`](./backend/DEPLOY.md) for Railway deployment instructions.

### Mobile (Expo EAS)
```bash
cd mobile
eas build --platform android
eas build --platform ios
```

## 📚 Documentation

- **Frontend**: [`frontend/DEPLOY.md`](./frontend/DEPLOY.md)
- **Backend**: [`backend/DEPLOY.md`](./backend/DEPLOY.md)
- **Mobile**: [`mobile/README.md`](./mobile/README.md)

## 🤝 Contributing

Contributions are welcome! This is a learning project.

## 📄 License

MIT License - For educational purposes only.
