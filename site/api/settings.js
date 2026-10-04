import { readSettings } from "./_store.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") { res.status(405).json({ error: "method" }); return; }
  try {
    const s = await readSettings();
    if (!s) { res.status(200).json({ empty: true }); return; }
    res.status(200).json(s);
  } catch (e) {
    res.status(503).json({ error: "storage" });
  }
}
