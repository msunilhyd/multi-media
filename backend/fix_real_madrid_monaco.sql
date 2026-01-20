-- SQL queries to fix Real Madrid vs Monaco match with incorrect video

-- 1. First, find the match and its highlights
SELECT 
    m.id as match_id,
    m.home_team,
    m.away_team,
    m.match_date,
    m.status,
    l.name as league,
    h.id as highlight_id,
    h.youtube_video_id,
    h.title,
    h.published_at,
    CONCAT('https://www.youtube.com/watch?v=', h.youtube_video_id) as video_url
FROM matches m
JOIN leagues l ON m.league_id = l.id
LEFT JOIN highlights h ON h.match_id = m.id
WHERE 
    (m.home_team ILIKE '%Real Madrid%' OR m.away_team ILIKE '%Real Madrid%')
    AND (m.home_team ILIKE '%Monaco%' OR m.away_team ILIKE '%Monaco%')
ORDER BY m.match_date DESC;

-- 2. Find the specific problematic video (k2DJYwzegxg)
SELECT 
    h.id as highlight_id,
    m.home_team,
    m.away_team,
    m.match_date,
    h.youtube_video_id,
    h.title,
    CONCAT('https://www.youtube.com/watch?v=', h.youtube_video_id) as video_url
FROM highlights h
JOIN matches m ON h.match_id = m.id
WHERE h.youtube_video_id = 'k2DJYwzegxg';

-- 3. Option A: Delete the incorrect highlight (replace <highlight_id> with actual ID)
-- DELETE FROM highlights WHERE id = <highlight_id>;

-- 4. Option B: Update with correct video ID (replace <highlight_id> and <new_video_id>)
-- UPDATE highlights 
-- SET youtube_video_id = '<new_video_id>',
--     title = '<new_title>',
--     updated_at = NOW()  -- if this column exists
-- WHERE id = <highlight_id>;

-- 5. Verify the fix
-- SELECT 
--     m.home_team,
--     m.away_team,
--     h.youtube_video_id,
--     h.title,
--     CONCAT('https://www.youtube.com/watch?v=', h.youtube_video_id) as video_url
-- FROM highlights h
-- JOIN matches m ON h.match_id = m.id
-- WHERE m.id = <match_id>;
