import { createHash, timingSafeEqual } from "node:crypto";
import { readSettings, writeSettings, saveImage, storeError } from "./_store.js";

const wait = ms => new Promise(r => setTimeout(r, ms));
const hash = s => createHash("sha256").update(String(s)).digest();

function passwordOk(given) {
  const real = (process.env.ADMIN_PASSWORD || "").trim();
  if (!real) return null;
  return timingSafeEqual(hash(given || ""), hash(real));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  let raw = typeof req.body === "string" ? req.body : Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
  if (!raw) { const chunks = []; for await (const c of req) chunks.push(c); raw = Buffer.concat(chunks).toString("utf8"); }
  return raw ? JSON.parse(raw) : {};
}

const str = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
const okImg = v => /^https:\/\/[\w-]+\.(public\.|private\.)?blob\.vercel-storage\.com\/cc\/reviews\/[\w.-]+$/.test(v) || /^\/api\/img\?p=cc%2Freviews%2F[\w.-]+$/.test(v) || /^assets\/reviews\/[\w.-]+\.(webp|jpg|png)$/.test(v);

function clean(s) {
  const f = s && typeof s.family === "object" && s.family ? s.family : {};
  const num = v => Math.max(0, Math.min(100000, parseInt(v, 10) || 0));
  const family = { open: !!f.open, seats: num(f.seats), total: num(f.total), priceRub: str(f.priceRub, 20), priceUsd: str(f.priceUsd, 20), wave: str(f.wave, 5000),
    bookText: f.bookText === undefined ? "Забронировать место со скидкой" : str(f.bookText, 200),
    bookUrl: f.bookUrl === undefined ? "https://t.me/m/bxwMqnFtMWJh" : (/^https:\/\/[^\s"<>]+$/.test(str(f.bookUrl, 500)) ? str(f.bookUrl, 500) : "") };
  const reviews = (Array.isArray(s && s.reviews) ? s.reviews : []).slice(0, 300).map(r => {
    const o = {};
    const name = str(r && r.name, 60); if (name) o.name = name;
    o.text = str(r && r.text, 20000);
    const date = str(r && r.date, 10); if (/^\d{4}-\d{2}-\d{2}$/.test(date)) o.date = date;
    const link = str(r && r.link, 300); if (/^https:\/\/t\.me\/[\w/+-]+$/.test(link)) o.link = link;
    const img = str(r && r.img, 400); if (img && okImg(img)) o.img = img;
    const tg = Array.isArray(r && r.tg) ? r.tg.map(n => parseInt(n, 10)).filter(n => n > 0 && n < 1e7).slice(0, 20) : [];
    if (tg.length) o.tg = tg;
    return o;
  }).filter(r => r.text || r.img);
  const hideTg = (Array.isArray(s && s.hideTg) ? s.hideTg : []).map(n => parseInt(n, 10)).filter(n => n > 0 && n < 1e7).slice(0, 1000);
  const im = s && typeof s.images === "object" && s.images ? s.images : {};
  const images = {};
  for (const k of ["author", "family", "marathon", "parser"]) { const v = str(im[k], 400); if (v && okImg(v)) images[k] = v; }
  return { family, reviews, hideTg, images };
}

function imageType(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ error: "Только POST" }); return; }
  let body;
  try { body = await readBody(req); } catch (e) { res.status(400).json({ error: "Не удалось прочитать запрос." }); return; }
  const ok = passwordOk(typeof body.password === "string" ? body.password.trim() : "");
  if (ok === null) { res.status(500).json({ error: "В Vercel не задан пароль. Settings, Environment Variables, добавьте ADMIN_PASSWORD и сделайте Redeploy." }); return; }
  if (!ok) { await wait(900); res.status(401).json({ error: "Неверный пароль." }); return; }
  try {
    if (body.action === "check") {
      let settings = null;
      try { settings = await readSettings(); } catch (e) { res.status(503).json({ error: storeError(e) }); return; }
      res.status(200).json({ ok: true, settings });
      return;
    }
    if (body.action === "upload") {
      const buf = Buffer.from(String(body.data || ""), "base64");
      if (!buf.length || buf.length > 3 * 1024 * 1024) { res.status(400).json({ error: "Картинка слишком большая." }); return; }
      const type = imageType(buf);
      if (!type) { res.status(400).json({ error: "Это не картинка." }); return; }
      res.status(200).json({ url: await saveImage(buf, type) });
      return;
    }
    if (body.action === "save") {
      const data = clean(body.settings);
      await writeSettings(data);
      res.status(200).json({ ok: true, settings: data });
      return;
    }
    res.status(400).json({ error: "Неизвестное действие." });
  } catch (e) {
    res.status(503).json({ error: storeError(e) });
  }
}
