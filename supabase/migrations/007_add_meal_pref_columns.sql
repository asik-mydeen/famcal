-- Add meal preference columns to ai_preferences
ALTER TABLE ai_preferences ADD COLUMN IF NOT EXISTS servings INT DEFAULT 4;
ALTER TABLE ai_preferences ADD COLUMN IF NOT EXISTS cooking_speed TEXT DEFAULT 'any';
