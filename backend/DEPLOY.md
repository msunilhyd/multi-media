# Backend Deployment (Railway)

## Prerequisites
- Railway account (https://railway.app)
- GitHub repo with this code

## Deploy Steps

### 1. Create Railway Project
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Choose the `multi-media/backend` folder as root

### 2. Add PostgreSQL Database
1. In Railway dashboard, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway auto-creates DATABASE_URL env variable

### 3. Set Environment Variables
In Railway Settings → Variables, add:
```
YOUTUBE_API_KEYS=your-youtube-api-key-1,your-youtube-api-key-2
FOOTBALL_API_KEY=your-football-api-key
APP_NAME=Football Highlights API
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
NOTIFICATION_EMAIL=your-email@gmail.com
```

### 4. Deploy
Railway will auto-deploy on push to main branch.

Your API will be available at: `https://your-app.up.railway.app`
