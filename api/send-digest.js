import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const CORS_ORIGINS = [
  "https://calendar.asikmydeen.com",
  "https://calendar-app-01.vercel.app",
  "tauri://localhost",
  "https://tauri.localhost",
  "http://localhost:3000",
];

export default async function handler(req, res) {
  const origin = (req.headers && req.headers.origin) || "";
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY
  );

  // Build today's date range (UTC midnight boundaries)
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  try {
    const { data: families, error: famErr } = await supabase.from("families").select("id, name");
    if (famErr) throw new Error(`families query failed: ${famErr.message}`);
    if (!families || families.length === 0) return res.json({ success: true, sent: 0 });

    // Build nodemailer transporter once (shared across all families)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    let sent = 0;

    for (const family of families) {
      // Fetch today's events — DB column is start_time (mapped to start in FamilyContext)
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("family_id", family.id)
        .gte("start_time", todayStart)
        .lt("start_time", todayEnd)
        .order("start_time");

      // Fetch pending/in-progress tasks due today or overdue
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("family_id", family.id)
        .in("status", ["pending", "in_progress"])
        .lte("due_date", todayEnd)
        .order("due_date");

      if (!events?.length && !tasks?.length) continue;

      // Fetch family members who have an email address
      const { data: members } = await supabase
        .from("family_members")
        .select("name, email")
        .eq("family_id", family.id)
        .not("email", "is", null);

      if (!members?.length) continue;

      // Build email HTML
      const dateStr = today.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      let html = `<h2>Good morning! Here's your ${family.name} agenda for ${dateStr}</h2>`;

      if (events?.length) {
        html += "<h3>Today's Events</h3><ul>";
        for (const e of events) {
          const time = e.all_day
            ? "All day"
            : e.start_time
              ? new Date(e.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
              : "All day";
          html += `<li><strong>${e.title}</strong> &middot; ${time}</li>`;
        }
        html += "</ul>";
      }

      if (tasks?.length) {
        html += "<h3>Tasks Due Today</h3><ul>";
        for (const t of tasks) {
          html += `<li>${t.title}${t.assigned_to ? ` (${t.assigned_to})` : ""}</li>`;
        }
        html += "</ul>";
      }

      html +=
        '<p style="color:#888;font-size:12px">You receive this because you\'re a FamCal family member. Manage settings in the app.</p>';

      const subject = `${family.name} \u00b7 Today's Agenda \u2014 ${dateStr}`;

      for (const member of members) {
        if (!member.email) continue;
        try {
          await transporter.sendMail({
            from: `FamCal <${process.env.SMTP_USER}>`,
            to: member.email,
            subject,
            html,
          });
          sent++;
        } catch (mailErr) {
          console.warn(`[send-digest] Failed to send to ${member.email}:`, mailErr.message);
        }
      }
    }

    return res.json({ success: true, sent });
  } catch (err) {
    console.error("[send-digest] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
