-- PostgreSQL Migration: Add music schema to existing database
-- Date: 2025-12-24
-- This adds music functionality while keeping football highlights intact

-- Artists table
CREATE TABLE IF NOT EXISTS artists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    language VARCHAR(50),
    country VARCHAR(100),
    profile_image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artists_language ON artists(language);
CREATE INDEX IF NOT EXISTS idx_artists_slug ON artists(slug);

-- Songs table
CREATE TABLE IF NOT EXISTS songs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    artist_id INTEGER REFERENCES artists(id),
    youtube_video_id VARCHAR(50) UNIQUE NOT NULL,
    language VARCHAR(50) NOT NULL,
    genre VARCHAR(100),
    album VARCHAR(200),
    thumbnail_url VARCHAR(500),
    channel_title VARCHAR(200),
    duration VARCHAR(20),
    view_count INTEGER DEFAULT 0,
    published_at TIMESTAMP,
    is_official BOOLEAN DEFAULT false,
    year VARCHAR(10),
    start_seconds INTEGER,
    end_seconds INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_songs_language ON songs(language);
CREATE INDEX IF NOT EXISTS idx_songs_artist_id ON songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_songs_youtube_video_id ON songs(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre);
CREATE INDEX IF NOT EXISTS idx_songs_year ON songs(year);

-- User favorite songs
CREATE TABLE IF NOT EXISTS user_favorite_songs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorite_songs_user_id ON user_favorite_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_songs_song_id ON user_favorite_songs(song_id);

-- Playlists
CREATE TABLE IF NOT EXISTS playlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);

-- Playlist songs
CREATE TABLE IF NOT EXISTS playlist_songs (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(playlist_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_song_id ON playlist_songs(song_id);

-- Song play history
CREATE TABLE IF NOT EXISTS play_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    played_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_play_history_user_id ON play_history(user_id);
CREATE INDEX IF NOT EXISTS idx_play_history_song_id ON play_history(song_id);
CREATE INDEX IF NOT EXISTS idx_play_history_played_at ON play_history(played_at);

-- User favorite artists
CREATE TABLE IF NOT EXISTS user_favorite_artists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    artist_id INTEGER REFERENCES artists(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, artist_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorite_artists_user_id ON user_favorite_artists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_artists_artist_id ON user_favorite_artists(artist_id);

-- Update notification_preferences to include music notifications (if columns don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='notification_preferences' AND column_name='email_new_songs') THEN
        ALTER TABLE notification_preferences ADD COLUMN email_new_songs BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='notification_preferences' AND column_name='email_artist_updates') THEN
        ALTER TABLE notification_preferences ADD COLUMN email_artist_updates BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Insert sample data
INSERT INTO artists (name, slug, language) VALUES
    ('Various Artists', 'various-artists', 'multi')
ON CONFLICT (slug) DO NOTHING;
