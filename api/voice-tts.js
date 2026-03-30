/**
 * /api/voice-tts — Text-to-Speech using OpenAI TTS API.
 * Returns audio/mpeg stream for natural-sounding voice output.
 *
 * POST /api/voice-tts
 * Body: { text: "Hello!", voice?: "nova", speed?: 1.0 }
 * Returns: audio/mpeg binary stream
 *
 * Voices: alloy, echo, fable, onyx, nova (recommended - warm female), shimmer
 * Requires: OPENAI_API_KEY
 */
export default async function handler(req, res) {
  const _o = (req.headers && req.headers.origin) || "";
  const _ok = ["https://calendar-app-01.vercel.app", "tauri://localhost", "https://tauri.localhost", "http://localhost:3000"];
  res.setHeader("Access-Control-Allow-Origin", _ok.includes(_o) ? _o : _ok[0]);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY not configured" });

  const { text, voice, speed } = req.body || {};
  if (!text || text.length === 0) return res.status(400).json({ error: "text required" });

  // Limit text length to prevent abuse (OpenAI TTS max is 4096 chars)
  const truncated = text.slice(0, 4096);

  try {
    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input: truncated,
        voice: voice || "coral",
        instructions: "You are Amara, a warm and friendly family assistant on a wall-mounted calendar. Speak in a cheerful, natural, conversational tone. Be concise and enthusiastic but not over the top. Pronounce names carefully.",
        speed: speed || 1.0,
        response_format: "mp3",
      }),
    });

    if (!ttsRes.ok) {
      const err = await ttsRes.json().catch(() => ({}));
      console.error("[tts] OpenAI error:", err);
      return res.status(ttsRes.status).json({ error: err.error?.message || "TTS failed" });
    }

    // Stream the audio response directly to the client
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");

    const arrayBuffer = await ttsRes.arrayBuffer();
    res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("[tts] Error:", err);
    return res.status(500).json({ error: "TTS failed. Please try again." });
  }
}
