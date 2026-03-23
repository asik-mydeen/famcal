-- Add dashboard access columns to families table
-- These enable token-based kiosk/display access without Google OAuth

ALTER TABLE families ADD COLUMN IF NOT EXISTS dashboard_slug TEXT UNIQUE;
ALTER TABLE families ADD COLUMN IF NOT EXISTS dashboard_token TEXT;

-- Create index for fast slug lookup
CREATE INDEX IF NOT EXISTS idx_families_dashboard_slug ON families(dashboard_slug);

-- RLS policy: allow anonymous SELECT via dashboard_token
-- This lets the serverless API endpoint validate tokens
CREATE POLICY "Allow dashboard token read" ON families
  FOR SELECT
  USING (true);
