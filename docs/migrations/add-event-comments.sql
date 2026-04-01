-- Run in Supabase SQL editor or via migration
CREATE TABLE IF NOT EXISTS event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  author_id TEXT,
  author_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_comments_event_id_idx ON event_comments(event_id);
CREATE INDEX IF NOT EXISTS event_comments_family_id_idx ON event_comments(family_id);

-- Row level security
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Family members can read comments" ON event_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON event_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authors can delete own comments" ON event_comments FOR DELETE USING (author_id = auth.uid()::text);
