export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const key = process.env.NOVA_API_KEY;
  if (!key) return res.status(500).json({ error: "NOVA_API_KEY not configured" });

  // Return key (in production, add auth check here)
  return res.status(200).json({ key });
}
