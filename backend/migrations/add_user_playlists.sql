-- Add user playlist tables
-- Migration: Add support for user custom playlists

-- Create user_playlists table
CREATE TABLE IF NOT EXISTS user_playlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_playlist_songs table  
CREATE TABLE IF NOT EXISTS user_playlist_songs (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER NOT NULL REFERENCES user_playlists(id) ON DELETE CASCADE,
    song_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_playlist_song UNIQUE (playlist_id, song_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_playlists_user_id ON user_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist_id ON user_playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_position ON user_playlist_songs(playlist_id, position);

-- Create trigger to update updated_at on user_playlists
CREATE OR REPLACE FUNCTION update_playlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_playlist_updated_at_trigger 
    BEFORE UPDATE ON user_playlists 
    FOR EACH ROW 
    EXECUTE FUNCTION update_playlist_updated_at();