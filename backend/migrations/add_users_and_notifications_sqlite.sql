-- SQLite Migration: Add user authentication and notification system tables
-- Date: 2025-12-24

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    password_hash TEXT, -- For email/password auth
    provider TEXT DEFAULT 'email', -- 'email', 'google', 'github'
    provider_id TEXT, -- External provider user ID
    email_verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- User favorite teams
CREATE TABLE IF NOT EXISTS user_favorite_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    league_id INTEGER REFERENCES leagues(id),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, team_name)
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email_highlights INTEGER DEFAULT 1,
    email_match_reminders INTEGER DEFAULT 0,
    push_notifications INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Notifications history
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'match_reminder', 'highlights_available', 'weekly_digest'
    title TEXT NOT NULL,
    message TEXT,
    match_id INTEGER REFERENCES matches(id) ON DELETE SET NULL, -- Optional link to specific match
    sent_at TEXT DEFAULT (datetime('now')),
    read_at TEXT NULL,
    email_sent INTEGER DEFAULT 0,
    push_sent INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_favorite_teams_user_id ON user_favorite_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);