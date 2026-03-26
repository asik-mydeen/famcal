-- FamCal Realtime Triggers
-- Run this in Supabase SQL Editor to enable instant sync.
--
-- Uses the recommended broadcast approach (NOT postgres_changes).
-- Each table gets a trigger that broadcasts INSERT/UPDATE/DELETE
-- to a family-scoped topic: "family:<family_id>"

-- Generic broadcast function for tables with family_id column
CREATE OR REPLACE FUNCTION broadcast_family_change()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'family:' || COALESCE(NEW.family_id, OLD.family_id)::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Broadcast function for list_items (uses list_id → lists.family_id)
CREATE OR REPLACE FUNCTION broadcast_list_item_change()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  fid uuid;
BEGIN
  SELECT family_id INTO fid FROM public.lists
  WHERE id = COALESCE(NEW.list_id, OLD.list_id);

  IF fid IS NOT NULL THEN
    PERFORM realtime.broadcast_changes(
      'family:' || fid::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for all family tables
DROP TRIGGER IF EXISTS events_realtime ON public.events;
CREATE TRIGGER events_realtime
  AFTER INSERT OR UPDATE OR DELETE ON public.events
  FOR EACH ROW EXECUTE FUNCTION broadcast_family_change();

DROP TRIGGER IF EXISTS tasks_realtime ON public.tasks;
CREATE TRIGGER tasks_realtime
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION broadcast_family_change();

DROP TRIGGER IF EXISTS family_members_realtime ON public.family_members;
CREATE TRIGGER family_members_realtime
  AFTER INSERT OR UPDATE OR DELETE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION broadcast_family_change();

DROP TRIGGER IF EXISTS meals_realtime ON public.meals;
CREATE TRIGGER meals_realtime
  AFTER INSERT OR UPDATE OR DELETE ON public.meals
  FOR EACH ROW EXECUTE FUNCTION broadcast_family_change();

DROP TRIGGER IF EXISTS lists_realtime ON public.lists;
CREATE TRIGGER lists_realtime
  AFTER INSERT OR UPDATE OR DELETE ON public.lists
  FOR EACH ROW EXECUTE FUNCTION broadcast_family_change();

DROP TRIGGER IF EXISTS notes_realtime ON public.notes;
CREATE TRIGGER notes_realtime
  AFTER INSERT OR UPDATE OR DELETE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION broadcast_family_change();

DROP TRIGGER IF EXISTS countdowns_realtime ON public.countdowns;
CREATE TRIGGER countdowns_realtime
  AFTER INSERT OR UPDATE OR DELETE ON public.countdowns
  FOR EACH ROW EXECUTE FUNCTION broadcast_family_change();

DROP TRIGGER IF EXISTS rewards_realtime ON public.rewards;
CREATE TRIGGER rewards_realtime
  AFTER INSERT OR UPDATE OR DELETE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION broadcast_family_change();

DROP TRIGGER IF EXISTS list_items_realtime ON public.list_items;
CREATE TRIGGER list_items_realtime
  AFTER INSERT OR UPDATE OR DELETE ON public.list_items
  FOR EACH ROW EXECUTE FUNCTION broadcast_list_item_change();

-- RLS policy on realtime.messages to allow family members to receive broadcasts
-- (Allow any authenticated user to read — family_id filtering is done by topic)
CREATE POLICY IF NOT EXISTS "authenticated_can_read_broadcasts" ON realtime.messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "authenticated_can_write_broadcasts" ON realtime.messages
  FOR INSERT TO authenticated WITH CHECK (true);
