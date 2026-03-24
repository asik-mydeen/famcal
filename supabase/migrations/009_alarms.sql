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

DO $$ BEGIN
  CREATE POLICY "anon_read_alarms" ON alarms FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "auth_write_alarms" ON alarms FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
