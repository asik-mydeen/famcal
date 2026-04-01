/**
 * /api/voice-transcribe — Transcribe audio using OpenAI Whisper API.
 *
 * Accepts: multipart/form-data with "audio" file field + optional "prompt" text field
 * The "prompt" field guides Whisper toward expected vocabulary (family names, wake words).
 * Returns: { text: "transcribed text" }
 *
 * Requires env: OPENAI_API_KEY (same key used for /api/chat)
 */

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PROMPT_LENGTH = 500;

export const config = {
  api: {
    bodyParser: false, // Handle multipart manually
  },
};

export default async function handler(req, res) {
  const _o = (req.headers && req.headers.origin) || "";
  const _ok = ["https://calendar-app-01.vercel.app", "https://calendar.asikmydeen.com", "tauri://localhost", "https://tauri.localhost", "http://localhost:3000"];
  res.setHeader("Access-Control-Allow-Origin", _ok.includes(_o) ? _o : _ok[0]);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  try {
    // Read the raw body as a buffer
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    // Parse multipart boundary from content-type
    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(.+)/);

    let audioBuffer;
    let filename = "audio.webm";
    let promptText = "";

    if (boundaryMatch) {
      // Parse multipart form data manually
      const boundary = boundaryMatch[1];
      const parts = parseMultipart(body, boundary);
      const audioPart = parts.find((p) => p.name === "audio" || p.name === "file");
      if (!audioPart) {
        return res.status(400).json({ error: "No audio file in request" });
      }
      audioBuffer = audioPart.data;
      filename = audioPart.filename || "audio.webm";

      // Extract prompt for Whisper vocabulary guidance (family names, wake words)
      const promptPart = parts.find((p) => p.name === "prompt");
      if (promptPart) {
        promptText = promptPart.data.toString().slice(0, MAX_PROMPT_LENGTH).trim();
      }
    } else {
      // Raw audio body
      audioBuffer = body;
    }

    if (!audioBuffer || audioBuffer.length < 100) {
      return res.status(400).json({ error: "Audio too short or empty" });
    }

    if (audioBuffer.length > MAX_AUDIO_SIZE) {
      return res.status(413).json({ error: "Audio too large (max 10MB)" });
    }

    // Send to OpenAI Whisper API
    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: "audio/webm" }), filename);
    formData.append("model", "whisper-1");
    formData.append("language", "en");
    formData.append("response_format", "json");

    // Pass prompt to guide Whisper toward expected vocabulary (family names, etc.)
    if (promptText) {
      formData.append("prompt", promptText);
    }

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.json().catch(() => ({}));
      console.error("[whisper] API error:", err);
      return res.status(whisperRes.status).json({ error: err.error?.message || "Whisper transcription failed" });
    }

    const result = await whisperRes.json();
    return res.status(200).json({ text: result.text || "" });
  } catch (err) {
    console.error("[whisper] Error:", err);
    return res.status(500).json({ error: "Transcription failed. Please try again." });
  }
}

// Simple multipart parser
function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  let start = buffer.indexOf(boundaryBuffer) + boundaryBuffer.length;

  while (start < buffer.length) {
    const nextBoundary = buffer.indexOf(boundaryBuffer, start);
    if (nextBoundary === -1) break;

    const partData = buffer.slice(start, nextBoundary);
    const headerEnd = partData.indexOf("\r\n\r\n");
    if (headerEnd === -1) { start = nextBoundary + boundaryBuffer.length; continue; }

    const headerStr = partData.slice(0, headerEnd).toString();
    const data = partData.slice(headerEnd + 4, partData.length - 2); // Remove trailing \r\n

    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const filenameMatch = headerStr.match(/filename="([^"]+)"/);

    parts.push({
      name: nameMatch?.[1] || "",
      filename: filenameMatch?.[1] || "",
      data,
    });

    start = nextBoundary + boundaryBuffer.length;
  }

  return parts;
}
