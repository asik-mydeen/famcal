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

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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
    if (refresh_token) {
      const { error: dbErr } = await supabase
        .from("family_members")
        .update({ google_refresh_token: refresh_token })
        .eq("id", memberId);

      if (dbErr) {
        console.warn("[google-token] Failed to store refresh token:", dbErr.message);
        // Don't fail — access_token still works for immediate use
      } else {
        console.log("[google-token] Refresh token stored for member:", memberId);
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
      calendarId,
    });
  } catch (err) {
    console.error("[google-token] Exchange failed:", err);
    return res.status(500).json({ error: "Token exchange failed: " + err.message });
  }
}
