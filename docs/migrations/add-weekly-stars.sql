-- Add weekly stars (dual currency) to family_members
-- Run on Supabase: supabase-api.asikmydeen.com

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS weekly_stars INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_stars_reset_at DATE;

-- Initialize: set reset date to this Monday for all existing members
UPDATE family_members
SET weekly_stars = 0,
    weekly_stars_reset_at = date_trunc('week', CURRENT_DATE)::date;
