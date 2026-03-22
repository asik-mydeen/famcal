import { generateText } from "ai";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, context } = req.body || {};
  if (!message) return res.status(400).json({ error: "Message required" });

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
    // The AI SDK automatically uses AI_GATEWAY_API_KEY when deployed on Vercel
    const result = await generateText({
      model: "anthropic/claude-haiku-4-5",
      system: systemPrompt,
      prompt: message,
      maxTokens: 1024,
    });

    const text = result.text || "";

    let parsed;
    try {
      const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { reply: text, actions: [] };
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("[ai] Error:", err.message, err.cause || "");
    return res.status(500).json({
      error: "AI request failed",
      message: err.message,
    });
  }
}
