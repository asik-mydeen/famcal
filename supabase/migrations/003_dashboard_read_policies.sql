-- Allow anonymous SELECT on all family data tables
-- Required for the dashboard/kiosk API (api/dashboard.js) to read data
-- without a Supabase Auth session.
--
-- Security: The dashboard API validates the dashboard_token before
-- querying these tables. RLS just needs to allow the read.
-- If using SUPABASE_SERVICE_ROLE_KEY, these policies are not needed
-- (service role bypasses RLS). These are a fallback for anon key access.

-- Drop existing restrictive policies if they conflict, then add permissive ones
-- (wrapped in DO blocks to avoid errors if policies don't exist)

DO $$ BEGIN
  CREATE POLICY "anon_read_family_members" ON family_members FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_events" ON events FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_tasks" ON tasks FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_meals" ON meals FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_lists" ON lists FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_list_items" ON list_items FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_rewards" ON rewards FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_notes" ON notes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_countdowns" ON countdowns FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
