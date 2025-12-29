-- Add content_type and item_id columns to support both songs and entertainment
-- This replaces song_id with a more flexible approach

-- Add new columns
ALTER TABLE user_playlist_songs ADD COLUMN content_type VARCHAR(20) DEFAULT 'song';
ALTER TABLE user_playlist_songs ADD COLUMN item_id INTEGER;

-- Copy existing song_id values to item_id
UPDATE user_playlist_songs SET item_id = song_id WHERE song_id IS NOT NULL;

-- Make item_id not null after copying data
ALTER TABLE user_playlist_songs ALTER COLUMN item_id SET NOT NULL;

-- We keep song_id for backward compatibility but it's no longer the primary reference
