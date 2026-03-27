-- =============================================
-- 010: New Features Migration
-- Recurring events, Chore rotation, Family messages
-- =============================================

-- Recurring events
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
-- Values: null (one-time), "daily", "weekdays", "weekly", "biweekly", "monthly"

-- Chore rotation
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rotation_members TEXT[];
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rotation_index INT DEFAULT 0;

-- Family message board
CREATE TABLE IF NOT EXISTS family_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  from_member_id UUID REFERENCES family_members(id),
  to_member_id UUID REFERENCES family_members(id), -- null = for everyone
  content TEXT NOT NULL,
  pinned BOOLEAN DEFAULT false,
  urgent BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for family_messages
ALTER TABLE family_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_messages_select" ON family_messages FOR SELECT USING (true);
CREATE POLICY "family_messages_insert" ON family_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "family_messages_update" ON family_messages FOR UPDATE USING (true);
CREATE POLICY "family_messages_delete" ON family_messages FOR DELETE USING (true);
