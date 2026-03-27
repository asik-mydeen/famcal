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

-- =============================================
-- Visual Routines (Morning/Bedtime Checklists)
-- =============================================

CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  member_id UUID REFERENCES family_members(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'morning', -- morning, afternoon, bedtime, custom
  icon TEXT DEFAULT 'wb_sunny',
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routine_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  icon TEXT DEFAULT 'check_circle',
  duration_minutes INT DEFAULT 5,
  points_value INT DEFAULT 5,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routine_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_step_id UUID REFERENCES routine_steps(id) ON DELETE CASCADE,
  member_id UUID REFERENCES family_members(id),
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for routines
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routines_select" ON routines FOR SELECT USING (true);
CREATE POLICY "routines_insert" ON routines FOR INSERT WITH CHECK (true);
CREATE POLICY "routines_update" ON routines FOR UPDATE USING (true);
CREATE POLICY "routines_delete" ON routines FOR DELETE USING (true);

ALTER TABLE routine_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routine_steps_select" ON routine_steps FOR SELECT USING (true);
CREATE POLICY "routine_steps_insert" ON routine_steps FOR INSERT WITH CHECK (true);
CREATE POLICY "routine_steps_update" ON routine_steps FOR UPDATE USING (true);
CREATE POLICY "routine_steps_delete" ON routine_steps FOR DELETE USING (true);

ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routine_completions_select" ON routine_completions FOR SELECT USING (true);
CREATE POLICY "routine_completions_insert" ON routine_completions FOR INSERT WITH CHECK (true);
CREATE POLICY "routine_completions_delete" ON routine_completions FOR DELETE USING (true);

-- =============================================
-- Feelings Check-In / Mood Board
-- =============================================

CREATE TABLE IF NOT EXISTS mood_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  member_id UUID REFERENCES family_members(id),
  mood TEXT NOT NULL, -- happy, good, okay, tired, stressed, sad, angry, excited
  note TEXT,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id, checkin_date)
);

ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mood_checkins_select" ON mood_checkins FOR SELECT USING (true);
CREATE POLICY "mood_checkins_insert" ON mood_checkins FOR INSERT WITH CHECK (true);
CREATE POLICY "mood_checkins_update" ON mood_checkins FOR UPDATE USING (true);
CREATE POLICY "mood_checkins_delete" ON mood_checkins FOR DELETE USING (true);

-- =============================================
-- Event Reminders
-- =============================================
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_minutes INT;

-- =============================================
-- Allowance & Money Tracking
-- =============================================
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS allowance_balance DECIMAL DEFAULT 0;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS allowance_rate DECIMAL DEFAULT 0;

CREATE TABLE IF NOT EXISTS allowance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  member_id UUID REFERENCES family_members(id),
  amount DECIMAL NOT NULL,
  type TEXT NOT NULL, -- earned, spent, bonus, deduction, allowance
  description TEXT,
  task_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE allowance_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allowance_transactions_select" ON allowance_transactions FOR SELECT USING (true);
CREATE POLICY "allowance_transactions_insert" ON allowance_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "allowance_transactions_update" ON allowance_transactions FOR UPDATE USING (true);
CREATE POLICY "allowance_transactions_delete" ON allowance_transactions FOR DELETE USING (true);

-- =============================================
-- Achievements & Badges
-- =============================================
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  member_id UUID REFERENCES family_members(id),
  type TEXT NOT NULL, -- streak, milestone, special
  key TEXT NOT NULL, -- unique identifier like "streak_7", "tasks_100"
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'emoji_events',
  earned_at TIMESTAMPTZ DEFAULT now(),
  points_bonus INT DEFAULT 0,
  UNIQUE(family_id, member_id, key)
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_select" ON achievements FOR SELECT USING (true);
CREATE POLICY "achievements_insert" ON achievements FOR INSERT WITH CHECK (true);
CREATE POLICY "achievements_update" ON achievements FOR UPDATE USING (true);
CREATE POLICY "achievements_delete" ON achievements FOR DELETE USING (true);
