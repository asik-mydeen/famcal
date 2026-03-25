/**
 * Supabase Realtime subscription hook.
 * Subscribes to postgres_changes on multiple tables for a given family_id.
 * Dispatches INSERT/UPDATE/DELETE events to the provided dispatch function.
 *
 * Usage:
 *   useSupabaseRealtime(familyId, dispatch, { mappers: { events: eventFromDb } });
 *
 * Requires Supabase Realtime to be enabled on the project + tables.
 * Enable in Supabase Dashboard → Database → Replication → enable tables.
 */
import { useEffect, useRef } from "react";
import { supabase } from "lib/supabase";

// Tables to subscribe to and their corresponding dispatch action prefixes
const REALTIME_TABLES = [
  { table: "events", setAction: "SET_EVENTS", fetchAll: true },
  { table: "tasks", setAction: "SET_TASKS", fetchAll: true },
  { table: "family_members", setAction: "SET_MEMBERS", fetchAll: true },
  { table: "meals", setAction: "SET_MEALS", fetchAll: true },
  { table: "lists", setAction: "SET_LISTS", fetchAll: true },
  { table: "notes", setAction: "SET_NOTES", fetchAll: true },
  { table: "countdowns", setAction: "SET_COUNTDOWNS", fetchAll: true },
  { table: "rewards", setAction: "SET_REWARDS", fetchAll: true },
];

export default function useSupabaseRealtime(familyId, dispatch, options = {}) {
  const channelRef = useRef(null);
  const { enabled = true, mappers = {} } = options;

  useEffect(() => {
    if (!familyId || !enabled) return;

    // Check if Supabase is configured
    const url = supabase?.supabaseUrl || "";
    if (!url || url.includes("your-project")) return;

    // Create a single channel for all table subscriptions
    const channel = supabase.channel(`family-${familyId}`);

    REALTIME_TABLES.forEach(({ table }) => {
      channel.on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table,
          filter: table === "list_items" ? undefined : `family_id=eq.${familyId}`,
        },
        async (payload) => {
          console.log(`[realtime] ${payload.eventType} on ${table}:`, payload.new?.id || payload.old?.id);

          // For simplicity: refetch the full table on any change.
          // This is simpler than patching individual rows and handles
          // cascading changes (e.g., list_items when a list changes).
          try {
            let query = supabase.from(table).select("*");
            if (table !== "list_items") {
              query = query.eq("family_id", familyId);
            }
            const { data } = await query;
            if (!data) return;

            // Apply mapper if provided (e.g., eventFromDb)
            const mapper = mappers[table];
            const mapped = mapper ? data.map(mapper) : data;

            // Special handling for lists — need to merge items
            if (table === "lists") {
              const listIds = data.map((l) => l.id);
              if (listIds.length > 0) {
                const { data: items } = await supabase
                  .from("list_items")
                  .select("*")
                  .in("list_id", listIds);
                const listsWithItems = data.map((l) => ({
                  ...l,
                  items: (items || []).filter((i) => i.list_id === l.id),
                }));
                dispatch({ type: "SET_LISTS", value: listsWithItems });
                return;
              }
            }

            const setAction = REALTIME_TABLES.find((t) => t.table === table)?.setAction;
            if (setAction) {
              dispatch({ type: setAction, value: mapped });
            }
          } catch (err) {
            console.warn(`[realtime] Failed to refresh ${table}:`, err.message);
          }
        }
      );
    });

    // Also subscribe to list_items changes (no family_id filter)
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "list_items" },
      async () => {
        // Refetch lists with items when list_items change
        try {
          const { data: lists } = await supabase.from("lists").select("*").eq("family_id", familyId);
          if (!lists) return;
          const listIds = lists.map((l) => l.id);
          const { data: items } = await supabase.from("list_items").select("*").in("list_id", listIds);
          const listsWithItems = lists.map((l) => ({
            ...l,
            items: (items || []).filter((i) => i.list_id === l.id),
          }));
          dispatch({ type: "SET_LISTS", value: listsWithItems });
        } catch (err) {
          console.warn("[realtime] Failed to refresh list_items:", err.message);
        }
      }
    );

    channel.subscribe((status) => {
      console.log(`[realtime] Channel status: ${status}`);
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, enabled]);
}
