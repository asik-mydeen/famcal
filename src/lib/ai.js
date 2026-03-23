// src/lib/ai.js — Client-side AI helper with rich context

export function buildAIContext(state, currentPage) {
  const { members, tasks, events, meals, lists, notes, rewards } = state;
  const today = new Date().toISOString().split("T")[0];
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  return {
    members: (members || []).map((m) => ({
      id: m.id, name: m.name, points: m.points || 0, level: m.level || 1,
    })),
    todayTasks: (tasks || [])
      .filter((t) => !t.completed && (t.due_date === today || !t.due_date))
      .slice(0, 20)
      .map((t) => ({
        id: t.id, title: t.title, assigned_to: t.assigned_to,
        due_date: t.due_date, completed: t.completed,
        points_value: t.points_value, category: t.category,
      })),
    todayEvents: (events || [])
      .filter((e) => e.start?.startsWith(today))
      .slice(0, 20)
      .map((e) => ({
        id: e.id, title: e.title, member_id: e.member_id,
        start: e.start, end: e.end, allDay: e.allDay,
      })),
    meals: (meals || [])
      .filter((m) => m.date >= today && m.date <= weekEndStr)
      .slice(0, 21)
      .map((m) => ({ id: m.id, date: m.date, meal_type: m.meal_type, title: m.title })),
    lists: (lists || []).map((l) => ({
      id: l.id, name: l.name,
      items: (l.items || []).slice(0, 15).map((i) => ({
        id: i.id, text: i.text, checked: i.checked,
      })),
    })),
    notes: (notes || []).slice(0, 10).map((n) => ({
      id: n.id, text: n.text, member_id: n.member_id, pinned: n.pinned,
    })),
    rewards: (rewards || []).map((r) => ({
      id: r.id, title: r.title, points_cost: r.points_cost,
    })),
    currentPage: currentPage || "unknown",
  };
}

export async function sendAIMessage(messages, context) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, context }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.reply || err.error || "AI request failed");
    }

    return await res.json();
  } catch (err) {
    console.error("[ai]", err);
    return {
      reply: err.message || "Sorry, I couldn't process that. Please try again.",
      actions: [],
    };
  }
}
