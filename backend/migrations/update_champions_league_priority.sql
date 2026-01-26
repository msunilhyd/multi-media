-- Update Champions League to be the top priority in display
UPDATE leagues 
SET display_order = CASE 
    WHEN slug = 'champions-league' THEN 1
    WHEN slug = 'premier-league' THEN 2
    ELSE display_order
END
WHERE slug IN ('champions-league', 'premier-league');
