import { readImage } from "./_store.js";

export default async function handler(req, res) {
  const p = String((req.query && req.query.p) || "");
  if (!/^cc\/reviews\/[\w.-]+\.(jpg|png|webp)$/.test(p)) { res.status(400).end(); return; }
  try {
    const g = await readImage(p);
    if (!g || !g.stream) { res.status(404).end(); return; }
    res.setHeader("Content-Type", /\.png$/.test(p) ? "image/png" : /\.webp$/.test(p) ? "image/webp" : "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    const buf = Buffer.from(await new Response(g.stream).arrayBuffer());
    res.status(200).end(buf);
  } catch (e) {
    res.status(404).end();
  }
}
