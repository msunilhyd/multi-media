-- Add is_admin column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create user_submitted_songs table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_submitted_songs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    youtube_url VARCHAR(500) NOT NULL,
    youtube_video_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    duration INTEGER,
    thumbnail_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending',
    admin_notes TEXT,
    added_to_playlist BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, youtube_video_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_submitted_songs_user_id ON user_submitted_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_submitted_songs_status ON user_submitted_songs(status);
CREATE INDEX IF NOT EXISTS idx_user_submitted_songs_youtube_video_id ON user_submitted_songs(youtube_video_id);
