import { fetchChannel } from "./_tg.js";

export default async function handler(req, res) {
  try {
    const posts = await fetchChannel();
    res.setHeader("Cache-Control", "public, s-maxage=20, stale-while-revalidate=40");
    res.status(200).json({ channel: "codeandcashreviews", posts });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: "channel" });
  }
}
