-- Fix: Change TEXT[] columns to TEXT in ai_preferences
-- The app sends plain strings, not arrays. TEXT[] causes type mismatch on insert.
-- Safe to alter since no data has been successfully written yet (RLS was blocking writes).

ALTER TABLE ai_preferences ALTER COLUMN cuisine_preferences TYPE TEXT USING array_to_string(cuisine_preferences, ', ');
ALTER TABLE ai_preferences ALTER COLUMN dietary_restrictions TYPE TEXT USING array_to_string(dietary_restrictions, ', ');

-- Set defaults for text columns
ALTER TABLE ai_preferences ALTER COLUMN cuisine_preferences SET DEFAULT '';
ALTER TABLE ai_preferences ALTER COLUMN dietary_restrictions SET DEFAULT '';
