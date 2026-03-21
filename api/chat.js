// api/chat.js — Vercel Serverless Function
// Calls Vercel AI Gateway with the family's context and returns structured actions

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, context } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  // Support multiple env var names for the AI Gateway key
  const apiKey = process.env.AI_GATEWAY_API_KEY
    || process.env.VERCEL_AI_GATEWAY_API_KEY
    || process.env.OPENAI_API_KEY
    || process.env.AI_API_KEY;

  if (!apiKey) {
    // Log available env var keys (not values) for debugging
    const aiRelatedKeys = Object.keys(process.env).filter(k =>
      k.includes("AI") || k.includes("OPENAI") || k.includes("GATEWAY") || k.includes("GLM")
    );
    return res.status(500).json({
      error: "AI Gateway not configured",
      hint: "Set AI_GATEWAY_API_KEY in Vercel Environment Variables (Settings > Environment Variables)",
      detectedKeys: aiRelatedKeys.length > 0 ? aiRelatedKeys : ["none found"],
    });
  }

  const systemPrompt = `You are FamCal AI, a helpful assistant for a family calendar app. You help manage the family's schedule, chores, meals, and lists.

Current family context:
- Family members: ${context?.members?.map(m => `${m.name} (${m.id})`).join(", ") || "None"}
- Today's date: ${new Date().toISOString().split("T")[0]}
- Day of week: ${new Date().toLocaleDateString("en-US", { weekday: "long" })}

You MUST respond with a JSON object. Do NOT include any text outside the JSON.

Response format:
{
  "reply": "A friendly message to show the user",
  "actions": [
    {
      "type": "create_event",
      "data": { "title": "...", "member_id": "...", "start": "YYYY-MM-DDTHH:mm:00", "end": "YYYY-MM-DDTHH:mm:00", "allDay": false }
    },
    {
      "type": "create_task",
      "data": { "title": "...", "assigned_to": "member_id", "due_date": "YYYY-MM-DD", "points_value": 10, "category": "chores", "recurring": false }
    },
    {
      "type": "add_meal",
      "data": { "date": "YYYY-MM-DD", "meal_type": "breakfast|lunch|dinner|snack", "title": "..." }
    },
    {
      "type": "add_list_items",
      "data": { "list_name": "Groceries", "items": ["item1", "item2"] }
    },
    {
      "type": "info",
      "data": { "content": "Information text to display" }
    }
  ]
}

Rules:
- If the user asks to create an event, use "create_event" action with proper date/time
- If the user asks to add a chore/task, use "create_task" action
- If the user asks about meals, use "add_meal" action
- If the user asks to add items to a list, use "add_list_items" action
- If the user asks a question or wants info, use "info" action with a helpful response
- For meal suggestions, return multiple "add_meal" actions
- When a member name is mentioned, match it to the closest family member and use their member_id
- Use 24-hour time internally but show 12-hour in replies
- Default points_value for tasks is 10
- Always be warm, friendly, and family-oriented in your reply`;

  try {
    const response = await fetch("https://api.vercel.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("AI Gateway error:", err);
      return res.status(500).json({ error: "AI request failed", details: err });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle potential markdown wrapping)
    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      // If parsing fails, return as info
      parsed = { reply: content, actions: [] };
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("AI Gateway error:", err);
    return res.status(500).json({ error: "AI request failed" });
  }
}
