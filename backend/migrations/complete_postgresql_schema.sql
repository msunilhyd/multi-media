-- PostgreSQL Migration: Create complete football highlights database schema
-- Date: 2025-12-24

-- Drop tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS user_favorite_teams CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS highlights CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS fetched_dates CASCADE;
DROP TABLE IF EXISTS leagues CASCADE;

-- Leagues table
CREATE TABLE leagues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    country VARCHAR(100),
    logo_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on leagues
CREATE INDEX idx_leagues_slug ON leagues(slug);

-- Matches table
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    league_id INTEGER REFERENCES leagues(id) NOT NULL,
    home_team VARCHAR(200) NOT NULL,
    away_team VARCHAR(200) NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    match_date DATE NOT NULL,
    match_time VARCHAR(10),
    status VARCHAR(50) DEFAULT 'scheduled',
    espn_event_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes on matches
CREATE INDEX idx_matches_league_id ON matches(league_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_espn_event_id ON matches(espn_event_id);

-- Highlights table
CREATE TABLE highlights (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(id) NOT NULL,
    youtube_video_id VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    channel_title VARCHAR(200),
    published_at TIMESTAMP,
    view_count INTEGER,
    duration VARCHAR(20),
    is_official BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes on highlights
CREATE INDEX idx_highlights_match_id ON highlights(match_id);
CREATE INDEX idx_highlights_youtube_video_id ON highlights(youtube_video_id);

-- Fetched dates table (for tracking which dates have been fetched)
CREATE TABLE fetched_dates (
    id SERIAL PRIMARY KEY,
    fetch_date DATE NOT NULL UNIQUE,
    fetched_at TIMESTAMP DEFAULT NOW()
);

-- Create index on fetched_dates
CREATE INDEX idx_fetched_dates_fetch_date ON fetched_dates(fetch_date);

-- Users table for authentication
CREATE TABLE users (
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

-- Create indexes on users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider);

-- User favorite teams
CREATE TABLE user_favorite_teams (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    team_name VARCHAR(100) NOT NULL,
    league_id INTEGER REFERENCES leagues(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, team_name)
);

-- Create indexes on user_favorite_teams
CREATE INDEX idx_user_favorite_teams_user_id ON user_favorite_teams(user_id);

-- Notification preferences
CREATE TABLE notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email_highlights BOOLEAN DEFAULT true,
    email_match_reminders BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on notification_preferences
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Notifications history
CREATE TABLE notifications (
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

-- Create indexes on notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_match_id ON notifications(match_id);

-- Insert some default leagues
INSERT INTO leagues (name, slug, country, display_order) VALUES
    ('Premier League', 'premier-league', 'England', 1),
    ('Champions League', 'champions-league', 'Europe', 2),
    ('La Liga', 'la-liga', 'Spain', 3),
    ('Serie A', 'serie-a', 'Italy', 4),
    ('Bundesliga', 'bundesliga', 'Germany', 5),
    ('Ligue 1', 'ligue-1', 'France', 6),
    ('Europa League', 'europa-league', 'Europe', 7),
    ('EFL Championship', 'championship', 'England', 8),
    ('FA Cup', 'fa-cup', 'England', 9),
    ('EFL Cup', 'efl-cup', 'England', 10);

-- Create function to auto-create notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id, email_highlights, email_match_reminders, push_notifications)
    VALUES (NEW.id, true, false, false);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create notification preferences
CREATE OR REPLACE TRIGGER trigger_create_default_notification_preferences
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();