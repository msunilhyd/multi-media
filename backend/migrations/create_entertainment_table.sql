-- PostgreSQL Migration: Create entertainment table for fun content
-- Date: 2025-12-28
-- Separate fun/entertainment content from songs table

-- Create entertainment table (no artist association needed)
CREATE TABLE IF NOT EXISTS entertainment (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    youtube_video_id VARCHAR(50) NOT NULL,
    description TEXT,
    content_type VARCHAR(100) DEFAULT 'fun', -- fun, comedy, viral, meme, etc.
    language VARCHAR(50),
    start_seconds INTEGER,
    end_seconds INTEGER,
    duration INTEGER GENERATED ALWAYS AS (end_seconds - start_seconds) STORED,
    thumbnail_url VARCHAR(500),
    channel_title VARCHAR(200),
    view_count INTEGER DEFAULT 0,
    tags TEXT[], -- Array of tags like ['funny', 'viral', 'comedy']
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint for video segments
    CONSTRAINT unique_entertainment_segment UNIQUE (youtube_video_id, start_seconds, end_seconds)
);

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_entertainment_content_type ON entertainment(content_type);
CREATE INDEX IF NOT EXISTS idx_entertainment_language ON entertainment(language);
CREATE INDEX IF NOT EXISTS idx_entertainment_youtube_video_id ON entertainment(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_entertainment_tags ON entertainment USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_entertainment_created_at ON entertainment(created_at DESC);

-- Add comments for clarity
COMMENT ON TABLE entertainment IS 'Fun and entertainment content separate from music';
COMMENT ON COLUMN entertainment.content_type IS 'Type of content: fun, comedy, viral, meme, etc.';
COMMENT ON COLUMN entertainment.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN entertainment.duration IS 'Calculated duration in seconds (read-only)';

-- Migrate existing fun content from songs table to entertainment table
INSERT INTO entertainment (
    title, 
    youtube_video_id, 
    content_type, 
    language,
    start_seconds, 
    end_seconds,
    created_at
)
SELECT 
    title,
    youtube_video_id,
    'fun' as content_type,
    language,
    start_seconds,
    end_seconds,
    created_at
FROM songs 
WHERE category = 'fun';

-- Remove fun content from songs table and reset category column default
DELETE FROM songs WHERE category = 'fun';

-- Reset the category column to be music-focused
UPDATE songs SET category = 'music' WHERE category IS NULL;
ALTER TABLE songs ALTER COLUMN category SET DEFAULT 'music';