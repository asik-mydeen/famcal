/**
 * FamCal API Server — Express wrapper for Vercel-style handlers.
 *
 * Each file in ../api/ exports a default `handler(req, res)` function.
 * This server mounts them at /api/<filename> and adds CORS for TrueNAS.
 */

import express from "express";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// Allowed origins — includes TrueNAS local IP patterns + standard origins
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)
  .concat([
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:80",
    "tauri://localhost",
    "https://tauri.localhost",
    "https://calendar-app-01.vercel.app",
  ]);

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS middleware — covers all /api/* routes
app.use("/api", (req, res, next) => {
  const origin = req.headers.origin || "";
  const allowed =
    !origin ||
    ALLOWED_ORIGINS.some((o) => origin === o || origin.startsWith("http://192.168.") || origin.startsWith("http://10.") || origin.startsWith("http://172."));

  res.setHeader("Access-Control-Allow-Origin", allowed ? origin || "*" : "");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

// Dynamically load and mount each API handler
const handlers = [
  "chat",
  "dashboard",
  "dashboard-write",
  "google-sync",
  "google-token",
  "photos",
  "send-digest",
  "voice-nova-key",
  "voice-transcribe",
  "voice-tts",
];

async function loadHandlers() {
  for (const name of handlers) {
    try {
      const mod = await import(`../api/${name}.js`);
      const handler = mod.default;
      if (typeof handler !== "function") {
        console.warn(`[api] ${name}: no default export, skipping`);
        continue;
      }

      // Mount at /api/<name> — all HTTP methods
      app.all(`/api/${name}`, (req, res) => {
        try {
          handler(req, res);
        } catch (err) {
          console.error(`[api] ${name} threw:`, err.message);
          res.status(500).json({ error: "Internal server error" });
        }
      });

      console.log(`[api] mounted /api/${name}`);
    } catch (err) {
      console.warn(`[api] failed to load ${name}:`, err.message);
    }
  }
}

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

loadHandlers().then(() => {
  // 404 fallback for unknown API routes — MUST be after handlers are mounted
  app.use("/api/*", (_req, res) => res.status(404).json({ error: "Not found" }));

  app.listen(PORT, () => {
    console.log(`FamCal API listening on :${PORT}`);
  });
});
