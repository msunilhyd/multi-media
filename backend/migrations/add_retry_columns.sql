-- Migration: Add retry tracking columns to matches table
-- Date: 2025-12-24
-- Description: Adds highlight_fetch_attempts and last_highlight_fetch_attempt columns

-- Add highlight_fetch_attempts column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matches' 
        AND column_name = 'highlight_fetch_attempts'
    ) THEN
        ALTER TABLE matches ADD COLUMN highlight_fetch_attempts INTEGER DEFAULT 0;
        RAISE NOTICE 'Added highlight_fetch_attempts column';
    ELSE
        RAISE NOTICE 'highlight_fetch_attempts column already exists';
    END IF;
END $$;

-- Add last_highlight_fetch_attempt column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matches' 
        AND column_name = 'last_highlight_fetch_attempt'
    ) THEN
        ALTER TABLE matches ADD COLUMN last_highlight_fetch_attempt TIMESTAMP;
        RAISE NOTICE 'Added last_highlight_fetch_attempt column';
    ELSE
        RAISE NOTICE 'last_highlight_fetch_attempt column already exists';
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'matches' 
AND column_name IN ('highlight_fetch_attempts', 'last_highlight_fetch_attempt')
ORDER BY column_name;
