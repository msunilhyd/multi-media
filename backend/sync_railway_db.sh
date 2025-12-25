#!/bin/bash

# Script to sync Railway database with music schema and data

echo "🚂 Syncing Railway Database..."
echo ""

# Get Railway database URL
echo "📡 Getting Railway database URL..."
RAILWAY_DB_URL=$(railway run --service Postgres printenv DATABASE_URL 2>/dev/null)

if [ -z "$RAILWAY_DB_URL" ]; then
    echo "❌ Error: Could not get Railway database URL"
    echo "Please ensure:"
    echo "  1. Railway CLI is installed: npm install -g @railway/cli"
    echo "  2. You're logged in: railway login"
    echo "  3. Project is linked: railway link"
    exit 1
fi

echo "✅ Connected to Railway database"
echo ""

# Run migration
echo "📦 Running music schema migration..."
railway run --service Postgres bash -c "psql \$DATABASE_URL -f migrations/add_music_schema.sql" 2>&1 | grep -v "NOTICE"

if [ $? -eq 0 ]; then
    echo "✅ Music schema migration complete"
else
    echo "❌ Migration failed"
    exit 1
fi

echo ""

# Import songs
echo "📀 Importing songs to Railway database..."
railway run --service Postgres python migrate_songs.py

if [ $? -eq 0 ]; then
    echo "✅ Songs imported successfully"
else
    echo "⚠️  Song import had issues (check above)"
fi

echo ""
echo "🎉 Railway database sync complete!"
echo ""

# Show stats
echo "📊 Railway Database Stats:"
railway run --service Postgres psql \$DATABASE_URL -c "SELECT 
    (SELECT COUNT(*) FROM songs) as total_songs,
    (SELECT COUNT(*) FROM artists) as total_artists,
    (SELECT COUNT(DISTINCT language) FROM songs) as languages;" 2>/dev/null

echo ""
echo "✅ Done!"
