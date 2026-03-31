-- =============================================
-- FamCal Complete Schema
-- Run this on a fresh self-hosted Supabase instance
-- Creates all tables, indexes, RLS policies
-- =============================================

-- =============================================
-- BASE TABLES (pre-v3, originally created via Supabase UI)
-- =============================================

-- Families
CREATE TABLE IF NOT EXISTS families (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My Family',
  owner_email TEXT,
  weather_location TEXT,
  kiosk_enabled BOOLEAN DEFAULT FALSE,
  photo_interval INT DEFAULT 5,
  idle_timeout INT DEFAULT 300,
  font_scale FLOAT DEFAULT 1.0,
  setup_done BOOLEAN DEFAULT FALSE,
  dashboard_slug TEXT UNIQUE,
  dashboard_token TEXT,
  google_client_id TEXT,
  theme_preset TEXT DEFAULT 'default',
  dark_mode BOOLEAN DEFAULT FALSE,
  babysitter_pin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_families_dashboard_slug ON families(dashboard_slug);

-- Family Members
CREATE TABLE IF NOT EXISTS family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#6C5CE7',
  avatar_emoji TEXT,
  avatar_url TEXT,
  points INT DEFAULT 0,
  level INT DEFAULT 1,
  streak_days INT DEFAULT 0,
  birth_date DATE,
  google_calendar_id TEXT,
  google_refresh_token TEXT,
  allowance_balance DECIMAL DEFAULT 0,
  allowance_rate DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);

-- Tasks (Chores)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  due_time TIME,
  assigned_to UUID,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TEXT,
  completed_by UUID,
  recurring BOOLEAN DEFAULT FALSE,
  points_value INT DEFAULT 10,
  rotation_members TEXT[],
  rotation_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_family ON tasks(family_id);

-- Events (Calendar)
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  member_id UUID,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT 'info',
  source TEXT DEFAULT 'manual',
  google_event_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  recurrence_rule TEXT,
  reminder_minutes INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_family ON events(family_id);
CREATE INDEX IF NOT EXISTS idx_events_google ON events(google_event_id);

-- Rewards
CREATE TABLE IF NOT EXISTS rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  points_cost INT DEFAULT 10,
  icon TEXT DEFAULT 'redeem',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rewards_family ON rewards(family_id);

-- Enable RLS on base tables
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 001: V3 Tables — Meals, Lists, Notes, Countdowns, Photos
-- =============================================

CREATE TABLE IF NOT EXISTS meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  title TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meals_family_date ON meals(family_id, date);

CREATE TABLE IF NOT EXISTS lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'checklist',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS list_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  category TEXT,
  checked BOOLEAN DEFAULT FALSE,
  checked_at TIMESTAMPTZ,
  added_by UUID REFERENCES family_members(id),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  member_id UUID REFERENCES family_members(id),
  text TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS countdowns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_date DATE NOT NULL,
  icon TEXT DEFAULT 'celebration',
  color TEXT DEFAULT '#6C5CE7',
  source_event_id UUID,
  auto_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  sort_order INT DEFAULT 0,
  uploaded_by UUID REFERENCES family_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE countdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 004: AI Assistant Tables
-- =============================================

CREATE TABLE IF NOT EXISTS ai_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE UNIQUE,
  assistant_name TEXT DEFAULT 'Amara',
  personality TEXT DEFAULT 'warm, concise, family-friendly',
  cuisine_preferences TEXT DEFAULT '',
  dietary_restrictions TEXT DEFAULT '',
  tone TEXT DEFAULT 'friendly',
  language TEXT DEFAULT 'en',
  custom_instructions TEXT,
  meal_defaults JSONB DEFAULT '{}',
  shopping_defaults JSONB DEFAULT '{}',
  servings INT DEFAULT 4,
  cooking_speed TEXT DEFAULT 'any',
  meal_instructions TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INT DEFAULT 0,
  tags TEXT[],
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  actions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  confidence FLOAT DEFAULT 1.0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_preferences_family ON ai_preferences(family_id);
CREATE INDEX IF NOT EXISTS idx_conversations_family ON conversations(family_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_memories_family ON ai_memories(family_id);
CREATE INDEX IF NOT EXISTS idx_ai_memories_active ON ai_memories(family_id, active);

ALTER TABLE ai_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memories ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 009: Alarms
-- =============================================

CREATE TABLE IF NOT EXISTS alarms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  alarm_time TIMESTAMPTZ NOT NULL,
  recurring TEXT DEFAULT NULL CHECK (recurring IN ('daily', 'weekdays', 'weekends', NULL)),
  icon TEXT DEFAULT 'alarm',
  enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES family_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alarms_family ON alarms(family_id);
CREATE INDEX IF NOT EXISTS idx_alarms_time ON alarms(alarm_time);
ALTER TABLE alarms ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 010: Family Messages, Routines, Mood, Allowance, Achievements
-- =============================================

CREATE TABLE IF NOT EXISTS family_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  from_member_id UUID REFERENCES family_members(id),
  to_member_id UUID REFERENCES family_members(id),
  content TEXT NOT NULL,
  pinned BOOLEAN DEFAULT false,
  urgent BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE family_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  member_id UUID REFERENCES family_members(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'morning',
  icon TEXT DEFAULT 'wb_sunny',
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE routine_steps ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS routine_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_step_id UUID REFERENCES routine_steps(id) ON DELETE CASCADE,
  member_id UUID REFERENCES family_members(id),
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS mood_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  member_id UUID REFERENCES family_members(id),
  mood TEXT NOT NULL,
  note TEXT,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id, checkin_date)
);
ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS allowance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  member_id UUID REFERENCES family_members(id),
  amount DECIMAL NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  task_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE allowance_transactions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  member_id UUID REFERENCES family_members(id),
  type TEXT NOT NULL,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'emoji_events',
  earned_at TIMESTAMPTZ DEFAULT now(),
  points_bonus INT DEFAULT 0,
  UNIQUE(family_id, member_id, key)
);
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 011: Emergency Info & Pets
-- =============================================

CREATE TABLE IF NOT EXISTS emergency_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  member_id UUID REFERENCES family_members(id),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE emergency_info ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  name TEXT NOT NULL,
  species TEXT DEFAULT 'dog',
  breed TEXT,
  birth_date DATE,
  photo_url TEXT,
  icon TEXT DEFAULT 'pets',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS pet_care_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id),
  member_id UUID REFERENCES family_members(id),
  care_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE pet_care_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES — Allow all access (app validates via tokens)
-- =============================================

-- Read policies
DO $$ BEGIN CREATE POLICY "allow_read_families" ON families FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_read_family_members" ON family_members FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_read_tasks" ON tasks FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_read_events" ON events FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_read_rewards" ON rewards FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_read_meals" ON meals FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_read_lists" ON lists FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_read_list_items" ON list_items FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_read_notes" ON notes FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_read_countdowns" ON countdowns FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_read_photos" ON photos FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_read_ai_preferences" ON ai_preferences FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_read_conversations" ON conversations FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_read_conversation_messages" ON conversation_messages FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_read_ai_memories" ON ai_memories FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_read_alarms" ON alarms FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Write policies (ALL = INSERT, UPDATE, DELETE)
DO $$ BEGIN CREATE POLICY "allow_write_families" ON families FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_write_family_members" ON family_members FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_write_tasks" ON tasks FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_write_events" ON events FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_write_rewards" ON rewards FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_write_meals" ON meals FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_write_lists" ON lists FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_write_list_items" ON list_items FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_write_notes" ON notes FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_write_countdowns" ON countdowns FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_write_photos" ON photos FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_write_ai_preferences" ON ai_preferences FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_write_conversations" ON conversations FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_write_conversation_messages" ON conversation_messages FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_write_ai_memories" ON ai_memories FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_write_alarms" ON alarms FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Wave 2-5 tables (family_messages, routines, mood, allowance, achievements, emergency, pets)
CREATE POLICY "family_messages_select" ON family_messages FOR SELECT USING (true);
CREATE POLICY "family_messages_all" ON family_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "routines_select" ON routines FOR SELECT USING (true);
CREATE POLICY "routines_all" ON routines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "routine_steps_select" ON routine_steps FOR SELECT USING (true);
CREATE POLICY "routine_steps_all" ON routine_steps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "routine_completions_select" ON routine_completions FOR SELECT USING (true);
CREATE POLICY "routine_completions_all" ON routine_completions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mood_checkins_select" ON mood_checkins FOR SELECT USING (true);
CREATE POLICY "mood_checkins_all" ON mood_checkins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allowance_transactions_select" ON allowance_transactions FOR SELECT USING (true);
CREATE POLICY "allowance_transactions_all" ON allowance_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "achievements_select" ON achievements FOR SELECT USING (true);
CREATE POLICY "achievements_all" ON achievements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "emergency_info_select" ON emergency_info FOR SELECT USING (true);
CREATE POLICY "emergency_info_all" ON emergency_info FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pets_select" ON pets FOR SELECT USING (true);
CREATE POLICY "pets_all" ON pets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pet_care_logs_select" ON pet_care_logs FOR SELECT USING (true);
CREATE POLICY "pet_care_logs_all" ON pet_care_logs FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_write" ON storage.objects FOR ALL USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "photos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "photos_auth_write" ON storage.objects FOR ALL USING (bucket_id = 'photos') WITH CHECK (bucket_id = 'photos');

-- =============================================
-- REALTIME PUBLICATION
-- =============================================
-- Add tables to realtime publication (ignore errors if already added)
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE families; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE family_members; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE tasks; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE events; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE rewards; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE meals; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE lists; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE list_items; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notes; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE countdowns; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE family_messages; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE emergency_info; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE pets; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE pet_care_logs; EXCEPTION WHEN OTHERS THEN NULL; END $$;
