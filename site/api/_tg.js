export const CHANNEL = "codeandcashreviews";

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] === "#") { const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); try { return String.fromCodePoint(n); } catch (x) { return m; } }
    return ENT[e] ?? m;
  });
}
function plain(html) {
  return decode(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function parsePosts(html) {
  const out = [];
  const parts = html.split('data-post="' + CHANNEL + "/").slice(1);
  for (const chunk of parts) {
    const id = parseInt(chunk, 10);
    if (!id) continue;
    const head = chunk.slice(0, 400);
    if (/service_message/.test(html.slice(Math.max(0, html.indexOf('data-post="' + CHANNEL + "/" + id + '"') - 200), html.indexOf('data-post="' + CHANNEL + "/" + id + '"')))) continue;
    let text = "";
    const t = chunk.indexOf('<div class="tgme_widget_message_text js-message_text"');
    if (t >= 0) { const s = chunk.indexOf(">", t) + 1; text = plain(chunk.slice(s, chunk.indexOf("</div>", s))); }
    let name = "";
    const f = chunk.match(/class="tgme_widget_message_forwarded_from_name"[^>]*>([\s\S]*?)<\/(a|span)>\s*(<\/span>|<\/div>|<\/a>)/);
    if (f) name = plain(f[1]);
    const d = chunk.match(/<time datetime="([^"]+)"/);
    const photo = /tgme_widget_message_photo_wrap/.test(chunk);
    if (!text && !photo) continue;
    out.push({ id, date: d ? d[1].slice(0, 10) : "", name, text, photo });
  }
  const seen = new Set();
  return out.filter(p => !seen.has(p.id) && seen.add(p.id)).sort((a, b) => b.id - a.id);
}

export function photoUrl(html) {
  const m = html.match(/tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/);
  return m ? m[1] : "";
}

const UA = { "User-Agent": "Mozilla/5.0 (compatible; CodeAndCashSite/1.0)" };

export async function fetchChannel(pages = 6) {
  const all = new Map();
  let url = "https://t.me/s/" + CHANNEL;
  for (let i = 0; i < pages && url; i++) {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) throw new Error("t.me " + r.status);
    const posts = parsePosts(await r.text());
    if (!posts.length) break;
    posts.forEach(p => all.set(p.id, p));
    const min = Math.min(...posts.map(p => p.id));
    url = min > 1 ? "https://t.me/s/" + CHANNEL + "?before=" + min : "";
  }
  return [...all.values()].sort((a, b) => b.id - a.id);
}

export async function fetchPhoto(id) {
  const r = await fetch("https://t.me/" + CHANNEL + "/" + id + "?embed=1&mode=tme", { headers: UA });
  if (!r.ok) return null;
  const u = photoUrl(await r.text());
  if (!u) return null;
  const img = await fetch(u.startsWith("//") ? "https:" + u : u, { headers: UA });
  if (!img.ok) return null;
  return { type: img.headers.get("content-type") || "image/jpeg", buf: Buffer.from(await img.arrayBuffer()) };
}
