/**
 * /api/google-token — Exchange Google auth code for access + refresh tokens.
 * Called by the client after GIS initCodeClient returns an authorization code.
 * Stores refresh_token in Supabase family_members for server-side sync.
 *
 * Requires env vars:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY (service role for writes)
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  const _o = (req.headers && req.headers.origin) || "";
  const _ok = ["https://calendar-app-01.vercel.app", "tauri://localhost", "https://tauri.localhost", "http://localhost:3000"];
  res.setHeader("Access-Control-Allow-Origin", _ok.includes(_o) ? _o : _ok[0]);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { code, memberId, redirectUri } = req.body;
  if (!code || !memberId) {
    return res.status(400).json({ error: "Missing code or memberId" });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "Google OAuth not configured on server (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)" });
  }

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri || "postmessage",
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("[google-token] Token exchange error:", tokenData.error, tokenData.error_description);
      return res.status(400).json({ error: tokenData.error_description || tokenData.error });
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Store refresh_token in Supabase for server-side sync
    let refreshTokenStored = false;
    if (refresh_token) {
      if (!process.env.SUPABASE_SERVICE_KEY) {
        console.warn("[google-token] SUPABASE_SERVICE_KEY not set — using anon key. Refresh token write may fail due to RLS.");
      }
      const { error: dbErr } = await supabase
        .from("family_members")
        .update({ google_refresh_token: refresh_token })
        .eq("id", memberId);

      if (dbErr) {
        console.error("[google-token] Failed to store refresh token for", memberId, ":", dbErr.message, "| Key type:", process.env.SUPABASE_SERVICE_KEY ? "service" : "anon");
      } else {
        console.log("[google-token] Refresh token stored for member:", memberId);
        refreshTokenStored = true;
      }
    }

    // Fetch the calendar ID (email) for this account
    let calendarId = "primary";
    try {
      const calRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const calData = await calRes.json();
      calendarId = calData.id || "primary";
    } catch {
      // Non-fatal — use "primary" as fallback
    }

    return res.status(200).json({
      access_token,
      expires_in,
      refresh_token: !!refresh_token, // Boolean only — don't expose actual token to client
      refresh_token_stored: refreshTokenStored, // Whether DB write succeeded
      calendarId,
    });
  } catch (err) {
    console.error("[google-token] Exchange failed:", err);
    return res.status(500).json({ error: "Token exchange failed: " + err.message });
  }
}
