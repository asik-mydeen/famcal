// src/lib/ai.js — Client-side AI helper with rich context
import { apiUrl } from "lib/api";

export function buildAIContext(state, currentPage) {
  const { family, members, tasks, events, meals, lists, notes, rewards } = state;
  const today = new Date().toISOString().split("T")[0];
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  return {
    familyName: family?.name || "My Family",
    members: (members || []).map((m) => ({
      id: m.id, name: m.name, points: m.points || 0, level: m.level || 1,
      streak_days: m.streak_days || 0,
      birth_date: m.birth_date || null,
      avatar_color: m.avatar_color || null,
    })),
    // Active tasks (incomplete, any date)
    activeTasks: (tasks || [])
      .filter((t) => !t.completed)
      .map((t) => ({
        id: t.id, title: t.title, description: t.description,
        assigned_to: t.assigned_to, due_date: t.due_date, due_time: t.due_time,
        points_value: t.points_value, category: t.category, priority: t.priority,
        recurring: t.recurring, recurring_pattern: t.recurring_pattern,
      })),
    // Recently completed tasks (last 7 days)
    recentCompletedTasks: (tasks || [])
      .filter((t) => t.completed && t.completed_at &&
        new Date(t.completed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .map((t) => ({
        id: t.id, title: t.title, assigned_to: t.assigned_to,
        completed_at: t.completed_at, completed_by: t.completed_by,
        points_value: t.points_value, category: t.category,
      })),
    events: (events || [])
      .filter((e) => {
        const eDate = e.start?.split("T")[0];
        return eDate >= today && eDate <= weekEndStr;
      })
      .map((e) => ({
        id: e.id, title: e.title, member_id: e.member_id,
        start: e.start, end: e.end, allDay: e.allDay,
        source: e.source,
      })),
    meals: (meals || [])
      .filter((m) => m.date >= today && m.date <= weekEndStr)
      .map((m) => ({ id: m.id, date: m.date, meal_type: m.meal_type, title: m.title, notes: m.notes })),
    lists: (lists || []).map((l) => ({
      id: l.id, name: l.name,
      items: (l.items || []).map((i) => ({
        id: i.id, text: i.text, checked: i.checked, category: i.category,
      })),
    })),
    notes: (notes || []).map((n) => ({
      id: n.id, text: n.text, member_id: n.member_id, pinned: n.pinned,
    })),
    rewards: (rewards || []).map((r) => ({
      id: r.id, title: r.title, description: r.description, points_cost: r.points_cost, icon: r.icon,
    })),
    countdowns: (state.countdowns || []).map((c) => ({
      id: c.id, title: c.title, target_date: c.target_date,
      icon: c.icon, color: c.color,
    })),
    currentPage: currentPage || "unknown",
    familyId: family?.id || null,
  };
}

export async function sendAIMessage(messages, context, aiPreferences = null, memories = null) {
  try {
    const res = await fetch(apiUrl("/api/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        context,
        ai_preferences: aiPreferences,
        memories: memories?.filter((m) => m.active).slice(0, 50),
      }),
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
