-- Migration: Add user authentication and notification system tables
-- Date: 2025-12-24

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    password_hash VARCHAR(255), -- For email/password auth
    provider VARCHAR(50) DEFAULT 'email', -- 'email', 'google', 'github'
    provider_id VARCHAR(100), -- External provider user ID
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User favorite teams
CREATE TABLE IF NOT EXISTS user_favorite_teams (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    team_name VARCHAR(100) NOT NULL,
    league_id INTEGER REFERENCES leagues(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, team_name)
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email_highlights BOOLEAN DEFAULT true,
    email_match_reminders BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Notifications history
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'match_reminder', 'highlights_available', 'weekly_digest'
    title VARCHAR(200) NOT NULL,
    message TEXT,
    match_id INTEGER REFERENCES matches(id) ON DELETE SET NULL, -- Optional link to specific match
    sent_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP NULL,
    email_sent BOOLEAN DEFAULT false,
    push_sent BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_favorite_teams_user_id ON user_favorite_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_teams_team_name ON user_favorite_teams(team_name);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at DESC);

-- Default notification preferences trigger
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_create_default_notification_preferences
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();