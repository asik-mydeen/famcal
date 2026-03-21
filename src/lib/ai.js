// src/lib/ai.js — Client-side AI helper

export async function sendAIMessage(message, context) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "AI request failed");
    }

    return await res.json();
  } catch (err) {
    console.error("[ai]", err);
    return { reply: "Sorry, I couldn't process that. Please try again.", actions: [] };
  }
}
