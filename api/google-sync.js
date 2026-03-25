/**
 * /api/google-sync — Server-side Google Calendar sync using stored refresh tokens.
 * Can be called by Vercel cron or manually by the dashboard.
 *
 * Syncs all members with google_refresh_token in a given family.
 * Uses refresh tokens to get fresh access tokens — no browser needed.
 *
 * Query params:
 *   familyId (required) — which family to sync
 *   token (required) — dashboard_token for auth
 *
 * Requires env vars:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY
);

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

async function refreshAccessToken(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data.access_token;
}

async function fetchGoogleEvents(accessToken, calendarId) {
  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
  const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30).toISOString();

  const url = `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?` +
    `timeMin=${timeMin}&timeMax=${timeMax}&maxResults=250&singleEvents=true&orderBy=startTime`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Google API ${res.status}: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.items || [];
}

function googleEventToDb(gEvent, memberId, familyId) {
  const isAllDay = !!gEvent.start?.date;
  return {
    family_id: familyId,
    member_id: memberId,
    title: gEvent.summary || "(No title)",
    start_time: isAllDay ? gEvent.start.date : gEvent.start.dateTime,
    end_time: isAllDay ? (gEvent.end?.date || gEvent.start.date) : (gEvent.end?.dateTime || gEvent.start.dateTime),
    all_day: isAllDay,
    color: "primary",
    source: "google",
    google_event_id: gEvent.id,
    updated_at: gEvent.updated || new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { familyId, token } = req.query;
  if (!familyId) return res.status(400).json({ error: "Missing familyId" });

  // Auth: verify dashboard token or cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (isCron) {
    // Cron job — authorized for all families
  } else if (token && familyId !== "all") {
    // Dashboard token auth for specific family
    const { data: family } = await supabase
      .from("families")
      .select("id, dashboard_token")
      .eq("id", familyId)
      .single();

    if (!family || family.dashboard_token !== token) {
      return res.status(401).json({ error: "Invalid token" });
    }
  } else {
    return res.status(401).json({ error: "Unauthorized — provide token or cron secret" });
  }

  // For cron: sync ALL families that have members with refresh tokens
  // For dashboard: sync only the specified family
  let memberQuery = supabase
    .from("family_members")
    .select("id, name, family_id, google_calendar_id, google_refresh_token")
    .not("google_refresh_token", "is", null);

  if (familyId !== "all") {
    memberQuery = memberQuery.eq("family_id", familyId);
  }

  const { data: members, error: membersErr } = await memberQuery;

  if (membersErr) {
    return res.status(500).json({ error: "Failed to fetch members: " + membersErr.message });
  }

  if (!members || members.length === 0) {
    return res.status(200).json({ synced: 0, message: "No members with refresh tokens" });
  }

  const results = [];

  for (const member of members) {
    if (!member.google_refresh_token || !member.google_calendar_id) continue;

    try {
      // Refresh the access token
      const accessToken = await refreshAccessToken(member.google_refresh_token);

      // Fetch events from Google
      const gEvents = await fetchGoogleEvents(accessToken, member.google_calendar_id);

      // Get existing synced events for this member
      const memberFamilyId = member.family_id || familyId;
      const { data: existingEvents } = await supabase
        .from("events")
        .select("id, google_event_id, updated_at")
        .eq("family_id", memberFamilyId)
        .eq("member_id", member.id)
        .eq("source", "google");

      const existingMap = new Map((existingEvents || []).map((e) => [e.google_event_id, e]));

      let added = 0, updated = 0, removed = 0;

      // Upsert Google events
      const googleEventIds = new Set();
      for (const gEvent of gEvents) {
        if (gEvent.status === "cancelled") continue;
        googleEventIds.add(gEvent.id);

        const dbEvent = googleEventToDb(gEvent, member.id, memberFamilyId);
        const existing = existingMap.get(gEvent.id);

        if (existing) {
          // Update if Google event is newer
          if (gEvent.updated && existing.updated_at && new Date(gEvent.updated) > new Date(existing.updated_at)) {
            await supabase.from("events").update(dbEvent).eq("id", existing.id);
            updated++;
          }
        } else {
          // Insert new event
          await supabase.from("events").insert(dbEvent);
          added++;
        }
      }

      // Remove events deleted from Google
      for (const [googleId, existing] of existingMap) {
        if (!googleEventIds.has(googleId)) {
          await supabase.from("events").delete().eq("id", existing.id);
          removed++;
        }
      }

      results.push({ member: member.name, added, updated, removed, total: gEvents.length });
    } catch (err) {
      console.error(`[google-sync] Failed for ${member.name}:`, err.message);
      results.push({ member: member.name, error: err.message });
    }
  }

  return res.status(200).json({ synced: results.length, results });
}
