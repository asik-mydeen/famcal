// api/chat.js — Vercel Serverless Function for AI command bar
// Uses raw fetch to Vercel AI Gateway (OpenAI-compatible endpoint)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, context } = req.body || {};
  if (!message) return res.status(400).json({ error: "Message required" });

  // Check for API keys — support multiple providers
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  // GLM key might be stored as AI_GATEWAY_API_KEY (user set it up through Vercel AI BYOK)
  const glmKey = process.env.GLM_API_KEY || process.env.ZHIPU_API_KEY || process.env.AI_GATEWAY_API_KEY;

  if (!gatewayKey && !anthropicKey && !openaiKey && !glmKey) {
    return res.status(500).json({
      error: "No AI API key configured",
      hint: "Set one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GLM_API_KEY, or AI_GATEWAY_API_KEY in Vercel env vars",
    });
  }

  const systemPrompt = `You are FamCal AI, a helpful family calendar assistant.

Family members: ${context?.members?.map(m => `${m.name} (${m.id})`).join(", ") || "None"}
Today: ${new Date().toISOString().split("T")[0]} (${new Date().toLocaleDateString("en-US", { weekday: "long" })})

Respond with JSON ONLY:
{"reply":"friendly message","actions":[{"type":"create_event|create_task|add_meal|add_list_items|info","data":{...}}]}

Action data formats:
- create_event: {title, member_id, start:"YYYY-MM-DDTHH:mm:00", end, allDay:false}
- create_task: {title, assigned_to:member_id, due_date:"YYYY-MM-DD", points_value:10, category:"chores"}
- add_meal: {date:"YYYY-MM-DD", meal_type:"breakfast|lunch|dinner|snack", title}
- add_list_items: {list_name:"Groceries", items:["item1","item2"]}
- info: {content:"text"}

Match member names to IDs. Be warm and family-friendly.`;

  try {
    let responseText;

    if (gatewayKey) {
      // Vercel AI Gateway (OpenAI-compatible)
      const resp = await fetch("https://api.vercel.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gatewayKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "anthropic/claude-haiku-4-5",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          max_tokens: 1024,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("[ai] Gateway error:", resp.status, errText);
        // If gateway fails and no fallback keys, return error
        if (!glmKey && !anthropicKey && !openaiKey) {
          return res.status(502).json({ error: "AI Gateway error", status: resp.status, details: errText });
        }
        // Fall through to fallback providers
      } else {
        const data = await resp.json();
        responseText = data.choices?.[0]?.message?.content || "";
      }
    }

    // Fallback: Zhipu GLM (OpenAI-compatible API)
    if (!responseText && glmKey) {
      const resp = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${glmKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "glm-4-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          max_tokens: 1024,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        responseText = data.choices?.[0]?.message?.content || "";
      } else {
        const errText = await resp.text();
        console.error("[ai] GLM error:", resp.status, errText);
      }
    }

    // Fallback: Direct Anthropic
    if (!responseText && anthropicKey) {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
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
      if (resp.ok) {
        const data = await resp.json();
        responseText = data.content?.[0]?.text || "";
      } else {
        const errText = await resp.text();
        console.error("[ai] Anthropic error:", resp.status, errText);
      }
    }

    // Fallback: OpenAI
    if (!responseText && openaiKey) {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          max_tokens: 1024,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        responseText = data.choices?.[0]?.message?.content || "";
      } else {
        const errText = await resp.text();
        console.error("[ai] OpenAI error:", resp.status, errText);
      }
    }

    if (!responseText) {
      return res.status(502).json({
        error: "All AI providers failed",
        tried: {
          gateway: !!gatewayKey,
          glm: !!glmKey,
          anthropic: !!anthropicKey,
          openai: !!openaiKey,
        },
      });
    }

    // Parse JSON from response
    let parsed;
    try {
      const jsonStr = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { reply: responseText, actions: [] };
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("[ai] Unhandled error:", err.message);
    return res.status(500).json({ error: "AI request failed", message: err.message });
  }
}
