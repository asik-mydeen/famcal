-- Fix: Add write (INSERT, UPDATE, DELETE) RLS policies for all tables
-- Previously only SELECT policies existed, causing all writes to silently fail

-- Helper: Allow authenticated users full access to their family's data
-- Allow anon users full access (for dashboard/kiosk mode — app validates tokens)

-- families
DO $$ BEGIN
  CREATE POLICY "auth_write_families" ON families FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- family_members
DO $$ BEGIN
  CREATE POLICY "auth_write_family_members" ON family_members FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- tasks
DO $$ BEGIN
  CREATE POLICY "auth_write_tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- events
DO $$ BEGIN
  CREATE POLICY "auth_write_events" ON events FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- rewards
DO $$ BEGIN
  CREATE POLICY "auth_write_rewards" ON rewards FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- meals
DO $$ BEGIN
  CREATE POLICY "auth_write_meals" ON meals FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- lists
DO $$ BEGIN
  CREATE POLICY "auth_write_lists" ON lists FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- list_items
DO $$ BEGIN
  CREATE POLICY "auth_write_list_items" ON list_items FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- notes
DO $$ BEGIN
  CREATE POLICY "auth_write_notes" ON notes FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- countdowns
DO $$ BEGIN
  CREATE POLICY "auth_write_countdowns" ON countdowns FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- photos
DO $$ BEGIN
  CREATE POLICY "auth_write_photos" ON photos FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ai_preferences
DO $$ BEGIN
  CREATE POLICY "auth_write_ai_preferences" ON ai_preferences FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- conversations
DO $$ BEGIN
  CREATE POLICY "auth_write_conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- conversation_messages
DO $$ BEGIN
  CREATE POLICY "auth_write_conversation_messages" ON conversation_messages FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ai_memories
DO $$ BEGIN
  CREATE POLICY "auth_write_ai_memories" ON ai_memories FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
