-- Remove is_official column from highlights table
-- This field is redundant since we only search official channels

ALTER TABLE highlights DROP COLUMN IF EXISTS is_official;
