// api/photos.js — Vercel Serverless Function
// Proxies Google Photos Library API calls (which don't support CORS from browsers)

export default async function handler(req, res) {
  const _o = (req.headers && req.headers.origin) || "";
  const _ok = ["https://calendar-app-01.vercel.app", "https://calendar.asikmydeen.com", "tauri://localhost", "https://tauri.localhost", "http://localhost:3000"];
  res.setHeader("Access-Control-Allow-Origin", _ok.includes(_o) ? _o : _ok[0]);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header required" });
  }

  const { action } = req.query;
  const PHOTOS_API = "https://photoslibrary.googleapis.com/v1";

  // Health check — verify the function is reachable
  if (action === "ping") {
    return res.status(200).json({ ok: true, message: "Photos API proxy is working" });
  }

  try {
    if (action === "albums") {
      // List albums
      const token = authHeader.replace("Bearer ", "");
      console.log("[photos-api] Fetching albums, token starts with:", token.substring(0, 20));

      // First verify token scopes server-side
      const tokenInfoRes = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
      const tokenInfo = await tokenInfoRes.json();
      console.log("[photos-api] Token scopes:", tokenInfo.scope);
      console.log("[photos-api] Has photoslibrary?", tokenInfo.scope?.includes("photoslibrary"));

      const response = await fetch(`${PHOTOS_API}/albums?pageSize=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("[photos-api] Google Photos response status:", response.status);
      const data = await response.json();
      console.log("[photos-api] Response body:", JSON.stringify(data).substring(0, 500));
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      return res.status(200).json(data);
    }

    if (action === "photos") {
      // Search photos in album
      const { albumId } = req.body || {};
      if (!albumId) {
        return res.status(400).json({ error: "albumId required in body" });
      }
      const response = await fetch(`${PHOTOS_API}/mediaItems:search`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ albumId, pageSize: 50 }),
      });
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: "Invalid action. Use ?action=albums or ?action=photos" });
  } catch (err) {
    console.error("[photos-api]", err);
    return res.status(500).json({ error: "Photos API request failed" });
  }
}
