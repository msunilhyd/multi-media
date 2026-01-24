-- PostgreSQL Migration: Remove UNIQUE constraint on youtube_video_id
-- Date: 2026-01-23
-- Reason: Allow multiple songs from the same video with different start/end times
-- For example: Same video can have multiple songs at different timestamps

-- Drop the unique constraint on youtube_video_id
ALTER TABLE songs DROP CONSTRAINT IF EXISTS songs_youtube_video_id_key;

-- Drop the unique index if it exists
DROP INDEX IF EXISTS idx_songs_youtube_video_id;

-- Recreate as a regular (non-unique) index for performance
CREATE INDEX IF NOT EXISTS idx_songs_youtube_video_id ON songs(youtube_video_id);

-- Now you can insert multiple songs with the same youtube_video_id
-- but different start_seconds and end_seconds
-- Example:
-- INSERT INTO songs (title, youtube_video_id, language, start_seconds, end_seconds) 
-- VALUES ('Song 1', 'abc123', 'ENGLISH', 0, 60);
-- INSERT INTO songs (title, youtube_video_id, language, start_seconds, end_seconds) 
-- VALUES ('Song 2', 'abc123', 'ENGLISH', 120, 180);
