#!/bin/bash
set -e

# Activate virtual environment
export PATH="/opt/venv/bin:$PATH"

echo "🚀 Starting application deployment..."
echo "📍 Environment: ${RAILWAY_ENVIRONMENT:-unknown}"
echo "📍 Port: ${PORT:-8000}"
echo "📍 Database URL: ${DATABASE_URL:0:30}..." # Show only first 30 chars for security
echo "📍 Python: $(which python)"

# Run database initialization
echo "📊 Initializing database..."
if python init_db.py; then
    echo "✅ Database initialization successful"
else
    echo "❌ Database initialization failed"
    exit 1
fi

# Start the uvicorn server
echo "🌐 Starting uvicorn server..."
echo "📍 Host: 0.0.0.0"
echo "📍 Port: ${PORT:-8000}"

exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --log-level info
