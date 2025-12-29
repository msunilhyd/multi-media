-- PostgreSQL Migration: Add type/category column to songs table
-- Date: 2025-12-28
-- This adds a category column to distinguish fun content from regular music

-- Add category column to songs table
ALTER TABLE songs 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'music';

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_songs_category ON songs(category);

-- Update any existing fun-related songs to have 'fun' category
UPDATE songs 
SET category = 'fun' 
WHERE title ILIKE '%funny%' 
   OR title ILIKE '%comedy%' 
   OR title ILIKE '%fun%' 
   OR title ILIKE '%party%' 
   OR title ILIKE '%laugh%';

-- Add comments for clarity
COMMENT ON COLUMN songs.category IS 'Song category: music (default), fun, comedy, party, etc.';