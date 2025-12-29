-- Add playlist_type column to distinguish between music and entertainment playlists

-- Add new column
ALTER TABLE user_playlists ADD COLUMN playlist_type VARCHAR(20) DEFAULT 'music';

-- Update existing playlists based on their content
-- If a playlist contains entertainment items, mark it as entertainment
UPDATE user_playlists
SET playlist_type = 'entertainment'
WHERE id IN (
    SELECT DISTINCT playlist_id 
    FROM user_playlist_songs 
    WHERE content_type = 'entertainment'
);

-- Make playlist_type not null
ALTER TABLE user_playlists ALTER COLUMN playlist_type SET NOT NULL;
