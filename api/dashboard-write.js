import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY
);

/**
 * Dashboard Write API — persists mutations from the kiosk/dashboard.
 * Validates dashboard_token before allowing any writes.
 *
 * POST /api/dashboard-write
 * Body: { slug, token, action, table, payload }
 */
export default async function handler(req, res) {
  const _o = (req.headers && req.headers.origin) || "";
  const _ok = ["https://calendar-app-01.vercel.app", "tauri://localhost", "https://tauri.localhost", "http://localhost:3000"];
  res.setHeader("Access-Control-Allow-Origin", _ok.includes(_o) ? _o : _ok[0]);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { slug, token, action, table, payload } = req.body || {};

  if (!slug || !token || !action || !table) {
    return res.status(400).json({ error: "slug, token, action, table required" });
  }

  // Allowed tables
  const ALLOWED_TABLES = ["events", "tasks", "meals", "lists", "list_items", "rewards", "notes", "countdowns", "family_members"];
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ error: "Invalid table" });
  }

  // Allowed actions
  if (!["insert", "update", "delete"].includes(action)) {
    return res.status(400).json({ error: "Invalid action (insert|update|delete)" });
  }

  try {
    // Validate token
    const { data: family, error: famError } = await supabase
      .from("families")
      .select("id")
      .eq("dashboard_slug", slug)
      .eq("dashboard_token", token)
      .single();

    if (famError || !family) {
      return res.status(401).json({ error: "Invalid access token" });
    }

    let result;

    if (action === "insert") {
      // Ensure family_id is set for top-level tables
      const row = { ...payload };
      if (table !== "list_items") {
        row.family_id = family.id;
      }
      // Remove temp IDs (let Supabase generate UUID)
      if (row.id && (row.id.startsWith("evt-") || row.id.startsWith("task-") || row.id.startsWith("meal-") || row.id.startsWith("list-") || row.id.startsWith("item-") || row.id.startsWith("note-") || row.id.startsWith("cd-") || row.id.startsWith("reward-"))) {
        delete row.id;
      }
      const { data, error } = await supabase.from(table).insert(row).select();
      if (error) throw error;
      result = data?.[0];

    } else if (action === "update") {
      const { id, ...rest } = payload;
      if (!id) return res.status(400).json({ error: "id required for update" });
      const { data, error } = await supabase.from(table).update(rest).eq("id", id).select();
      if (error) throw error;
      result = data?.[0];

    } else if (action === "delete") {
      const id = typeof payload === "string" ? payload : payload?.id;
      if (!id) return res.status(400).json({ error: "id required for delete" });
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      result = { deleted: id };
    }

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("[dashboard-write]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
