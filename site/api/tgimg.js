import { fetchPhoto } from "./_tg.js";

export default async function handler(req, res) {
  const id = parseInt((req.query && req.query.id) || "", 10);
  if (!(id > 0 && id < 1e7)) { res.status(400).end(); return; }
  try {
    const p = await fetchPhoto(id);
    if (!p) { res.setHeader("Cache-Control", "public, s-maxage=300"); res.status(404).end(); return; }
    res.setHeader("Content-Type", p.type);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400");
    res.status(200).end(p.buf);
  } catch (e) {
    res.status(502).end();
  }
}
