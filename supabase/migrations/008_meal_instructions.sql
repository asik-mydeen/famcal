-- Add meal_instructions column for family-specific meal planning instructions
ALTER TABLE ai_preferences ADD COLUMN IF NOT EXISTS meal_instructions TEXT DEFAULT '';
