# Local Development Setup - Production Database

## Quick Setup

To connect your local development environment to the **production Railway database**, follow these steps:

### Step 1: Create `.env` file in backend directory

```bash
cd backend
cp .env.example .env
```

### Step 2: Update `.env` with Production Database

Edit `backend/.env` and set:

```env
# Production Database (Railway PostgreSQL)
DATABASE_URL=postgresql://postgres:wUXRJCcrvqKCaNLZaUiRDXEbsjdduujw@shinkansen.proxy.rlwy.net:49888/railway

YOUTUBE_API_KEYS=your-youtube-api-key-1,your-youtube-api-key-2
FOOTBALL_API_KEY=your-football-api-key
APP_NAME=Football Highlights API

# Email notification settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
NOTIFICATION_EMAIL=your-email@gmail.com
```

### Step 3: Start Backend

```bash
cd backend
python -m uvicorn app.main:app --reload
```

The backend will now connect to the **production Railway database**.

## Testing

Once running, you can:

1. **Add sample matches** to production database:
   ```
   POST http://localhost:8000/api/admin/add-sample-matches
   ```

2. **Fetch highlights** for those matches:
   ```
   POST http://localhost:8000/api/admin/fetch-yesterday-highlights
   ```

3. **View highlights** in frontend:
   - Navigate to any sport page (NBA, Tennis, NHL, etc.)
   - Highlights will be fetched from production database

## Switching Back to Local Database

If you want to use local SQLite instead:

```env
# Local Database
DATABASE_URL=sqlite:///./football_highlights.db
```

Then restart the backend.

## Important Notes

⚠️ **Production Database Warning:**
- You're now working with the **live production database**
- Any changes made locally will affect the live application
- Be careful when adding/modifying data
- Sample matches added will be visible to all users

✅ **Benefits:**
- Test with real data
- Verify scheduler works with production database
- Test highlight fetching end-to-end
- No need to maintain separate databases

## Database Connection Details

**Production Database:**
- Host: `shinkansen.proxy.rlwy.net`
- Port: `49888`
- Database: `railway`
- User: `postgres`
- Password: `wUXRJCcrvqKCaNLZaUiRDXEbsjdduujw`

## Troubleshooting

**Connection refused?**
- Check internet connection
- Verify DATABASE_URL is correct
- Check if Railway database is online

**Slow queries?**
- Network latency to Railway
- Consider using local database for development
- Use production database only for testing

**Data conflicts?**
- Multiple developers using same production database
- Coordinate changes with team
- Consider separate staging database
