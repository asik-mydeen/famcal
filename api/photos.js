// api/photos.js — Vercel Serverless Function
// Proxies Google Photos Library API calls (which don't support CORS from browsers)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header required" });
  }

  const { action } = req.query;
  const PHOTOS_API = "https://photoslibrary.googleapis.com/v1";

  try {
    if (action === "albums") {
      // List albums
      const response = await fetch(`${PHOTOS_API}/albums?pageSize=50`, {
        headers: { Authorization: authHeader },
      });
      const data = await response.json();
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
