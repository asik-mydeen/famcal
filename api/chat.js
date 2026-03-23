import { generateText, gateway } from "ai";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, context, message } = req.body || {};

  // Support both formats: {messages: [...]} (new) or {message: "..."} (legacy)
  const chatMessages = messages || (message ? [{ role: "user", content: message }] : []);
  if (!chatMessages.length) return res.status(400).json({ error: "Message required" });

  const ctx = context || {};
  const today = new Date().toISOString().split("T")[0];
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  // Build member list
  const memberList = ctx.members?.map(
    (m) => `- ${m.name} (id: ${m.id}, ${m.points || 0}pts, level ${m.level || 1})`
  ).join("\n") || "No members";

  // Build today's tasks
  const todayTasks = ctx.todayTasks?.map((t) => {
    const who = ctx.members?.find((m) => m.id === t.assigned_to)?.name || "unassigned";
    return `- [${t.completed ? "DONE" : "todo"}] "${t.title}" assigned to ${who} (${t.points_value || 0}pts, id: ${t.id})`;
  }).join("\n") || "None";

  // Build today's events
  const todayEvents = ctx.todayEvents?.map((e) => {
    const time = e.allDay ? "All day" : `${e.start?.split("T")[1]?.slice(0, 5) || "?"}-${e.end?.split("T")[1]?.slice(0, 5) || "?"}`;
    const who = ctx.members?.find((m) => m.id === e.member_id)?.name || "family";
    return `- ${time}: "${e.title}" (${who}, id: ${e.id})`;
  }).join("\n") || "None";

  // Build this week's meals
  const weekMeals = ctx.meals?.slice(0, 21).map(
    (m) => `- ${m.date} ${m.meal_type}: "${m.title}"`
  ).join("\n") || "None";

  // Build lists
  const listsStr = ctx.lists?.map((l) => {
    const items = l.items?.slice(0, 10).map(
      (i) => `  ${i.checked ? "[x]" : "[ ]"} ${i.text} (id: ${i.id})`
    ).join("\n") || "  (empty)";
    return `"${l.name}" (id: ${l.id}):\n${items}`;
  }).join("\n") || "None";

  // Build rewards
  const rewardsStr = ctx.rewards?.map(
    (r) => `- "${r.title}" costs ${r.points_cost}pts (id: ${r.id})`
  ).join("\n") || "None";

  // Build notes
  const notesStr = ctx.notes?.slice(0, 10).map((n) => {
    const who = ctx.members?.find((m) => m.id === n.member_id)?.name || "family";
    return `- "${n.text}" by ${who}${n.pinned ? " (pinned)" : ""} (id: ${n.id})`;
  }).join("\n") || "None";

  const systemPrompt = `You are FamCal AI, a warm and helpful family assistant for a wall-mounted family calendar app.

TODAY: ${today} (${dayName})
CURRENT PAGE: ${ctx.currentPage || "unknown"}

FAMILY MEMBERS:
${memberList}

TODAY'S TASKS/CHORES:
${todayTasks}

TODAY'S EVENTS:
${todayEvents}

THIS WEEK'S MEALS:
${weekMeals}

LISTS:
${listsStr}

REWARDS AVAILABLE:
${rewardsStr}

NOTES:
${notesStr}

You MUST respond with valid JSON only. No markdown, no code blocks, no extra text.

Response format:
{"reply":"your friendly message","actions":[{"type":"action_type","data":{...}}]}

AVAILABLE ACTIONS:

Events:
- create_event: {title, member_id, start:"YYYY-MM-DDTHH:mm:00", end:"YYYY-MM-DDTHH:mm:00", allDay:false}
- update_event: {event_id, title?, start?, end?, member_id?, allDay?}
- remove_event: {event_id}

Tasks/Chores:
- create_task: {title, assigned_to:member_id, due_date:"YYYY-MM-DD", due_time?"HH:mm", points_value:10, category:"chores|homework|errands|health|cooking|pets|other", priority:"low|medium|high", recurring:false, recurring_pattern?"daily|weekly|monthly"}
- update_task: {task_id, title?, assigned_to?, due_date?, points_value?, category?, priority?}
- complete_task: {task_id, completed_by:member_id}
- remove_task: {task_id}

Meals:
- add_meal: {date:"YYYY-MM-DD", meal_type:"breakfast|lunch|dinner|snack", title, notes?}
- update_meal: {meal_id, title?, meal_type?, notes?}
- remove_meal: {meal_id}

Lists:
- create_list: {name, icon?}
- add_list_items: {list_name, items:["item1","item2"]}
- toggle_list_item: {list_id, item_id}
- remove_list_item: {list_id, item_id}

Notes:
- add_note: {text, member_id?, pinned:false}
- remove_note: {note_id}

Countdowns:
- add_countdown: {title, target_date:"YYYY-MM-DD", icon?, color?}
- remove_countdown: {countdown_id}

Rewards:
- add_reward: {title, description?, points_cost, icon?}
- claim_reward: {reward_id, member_id}

Info (no mutation, just answer):
- info: {} — use when the user asks a question that doesn't need data changes. Put the answer in "reply".

RULES:
1. Match member names to IDs (case-insensitive). "Mom"/"Nikkath", "Dad"/"Asik", "Aarish", "Aaraa" etc.
2. If the request is AMBIGUOUS (who? when? what?), return {"reply":"clarifying question here","actions":[]} — do NOT guess.
3. For dates: "tomorrow" = today+1, "next Monday" = actual date, "Friday" = upcoming Friday. Always output YYYY-MM-DD.
4. For times: "2pm" = "14:00", "morning" = "09:00". Use 24h format HH:mm for start/end times.
5. When updating/deleting, find the item by name in the data above and use its ID.
6. Multiple actions OK (e.g., "add eggs, milk, bread to groceries" = one add_list_items).
7. Be warm, concise, family-friendly. Address members by name.
8. For queries ("how many points?", "what's for dinner?"), use reply text + info action with no data changes.`;

  try {
    const result = await generateText({
      model: gateway("anthropic/claude-haiku-4-5"),
      system: systemPrompt,
      messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
      maxTokens: 1024,
    });

    const text = (result.text || "").trim();

    let parsed;
    try {
      // Strip markdown code blocks if present
      const clean = text.replace(/^```(?:json)?\n?/gm, "").replace(/\n?```$/gm, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = { reply: text, actions: [] };
    }

    return res.status(200).json({
      reply: parsed.reply || text,
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    });
  } catch (err) {
    console.error("[ai] Error:", err.message, err.cause || "");

    if (err.message?.includes("API key") || err.message?.includes("Unauthorized") || err.message?.includes("401")) {
      return res.status(500).json({
        reply: "AI is not configured yet. Please set AI_GATEWAY_API_KEY in your Vercel project settings.",
        actions: [],
        error: "missing_api_key",
      });
    }

    return res.status(500).json({
      reply: "Sorry, I had trouble processing that. Please try again.",
      actions: [],
      error: err.message,
    });
  }
}
