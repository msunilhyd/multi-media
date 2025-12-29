-- PostgreSQL Migration: Modify unique constraint to allow multiple segments
-- Date: 2025-12-28
-- This allows multiple segments from the same YouTube video

-- Remove the unique constraint on youtube_video_id to allow multiple segments
ALTER TABLE songs DROP CONSTRAINT IF EXISTS songs_youtube_video_id_key;

-- Create a new composite unique constraint that allows same video with different time segments
ALTER TABLE songs ADD CONSTRAINT unique_song_segment UNIQUE (youtube_video_id, start_seconds, end_seconds);