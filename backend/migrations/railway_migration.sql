-- Copy this SQL and run it in Railway Dashboard → PostgreSQL → Data → Query

ALTER TABLE matches ADD COLUMN IF NOT EXISTS highlight_fetch_attempts INTEGER DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS last_highlight_fetch_attempt TIMESTAMP;

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'matches' 
AND column_name IN ('highlight_fetch_attempts', 'last_highlight_fetch_attempt')
ORDER BY column_name;
