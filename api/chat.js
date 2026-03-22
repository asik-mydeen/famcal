// api/chat.js — Vercel Serverless Function
// Uses Vercel AI SDK with AI Gateway for the AI command bar

import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, context } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  const apiKey = process.env.AI_GATEWAY_API_KEY
    || process.env.ANTHROPIC_API_KEY
    || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const aiKeys = Object.keys(process.env).filter(k =>
      k.includes("AI") || k.includes("OPENAI") || k.includes("ANTHROPIC") || k.includes("GATEWAY")
    );
    return res.status(500).json({
      error: "AI not configured",
      hint: "Set AI_GATEWAY_API_KEY (Vercel AI Gateway) or ANTHROPIC_API_KEY or OPENAI_API_KEY in Vercel env vars",
      detectedKeys: aiKeys.length > 0 ? aiKeys : ["none"],
    });
  }

  const systemPrompt = `You are FamCal AI, a helpful assistant for a family calendar app.

Current family context:
- Family members: ${context?.members?.map(m => `${m.name} (${m.id})`).join(", ") || "None"}
- Today: ${new Date().toISOString().split("T")[0]} (${new Date().toLocaleDateString("en-US", { weekday: "long" })})

Respond with a JSON object ONLY. No text outside JSON.

{
  "reply": "Friendly message to show the user",
  "actions": [
    { "type": "create_event", "data": { "title": "...", "member_id": "...", "start": "YYYY-MM-DDTHH:mm:00", "end": "YYYY-MM-DDTHH:mm:00", "allDay": false } },
    { "type": "create_task", "data": { "title": "...", "assigned_to": "member_id", "due_date": "YYYY-MM-DD", "points_value": 10, "category": "chores" } },
    { "type": "add_meal", "data": { "date": "YYYY-MM-DD", "meal_type": "breakfast|lunch|dinner|snack", "title": "..." } },
    { "type": "add_list_items", "data": { "list_name": "Groceries", "items": ["item1", "item2"] } },
    { "type": "info", "data": { "content": "text" } }
  ]
}

Rules:
- Match member names to the closest family member, use their member_id
- Default points_value is 10
- Be warm and family-oriented`;

  try {
    // Set up the AI Gateway provider
    const gateway = createOpenAI({
      apiKey,
      baseURL: "https://api.vercel.ai/v1",
    });

    const { text } = await generateText({
      model: gateway("anthropic/claude-haiku-4-5"),
      system: systemPrompt,
      prompt: message,
      maxTokens: 1024,
      temperature: 0.7,
    });

    // Parse JSON from response
    let parsed;
    try {
      const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { reply: text, actions: [] };
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("AI error:", err.message, err.cause || "");

    // Fallback: try direct Anthropic if available
    if (process.env.ANTHROPIC_API_KEY && !apiKey.startsWith("sk-ant")) {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": process.env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: "user", content: message }],
          }),
        });
        const data = await response.json();
        const content = data.content?.[0]?.text || "";
        let parsed;
        try {
          parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        } catch {
          parsed = { reply: content, actions: [] };
        }
        return res.status(200).json(parsed);
      } catch (fallbackErr) {
        console.error("Fallback also failed:", fallbackErr.message);
      }
    }

    return res.status(500).json({
      error: "AI request failed",
      message: err.message,
    });
  }
}
