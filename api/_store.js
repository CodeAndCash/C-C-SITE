import { put, list, del, get } from "@vercel/blob";

const ROOT = "cc/";
let mode = process.env.BLOB_ACCESS === "private" || process.env.BLOB_ACCESS === "public" ? process.env.BLOB_ACCESS : null;

export function storeError(e) {
  const m = String((e && e.message) || e);
  if (/token|store id|credentials|unauthorized|forbidden/i.test(m)) return "Хранилище не подключено к проекту. В Vercel откройте Storage, создайте Blob и нажмите Connect для этого проекта, потом сделайте Redeploy.";
  return "Ошибка хранилища: " + m;
}

async function putAny(pathname, body, contentType) {
  const order = mode ? [mode] : ["public", "private"];
  let first;
  for (const access of order) {
    try {
      const b = await put(pathname, body, { access, contentType, addRandomSuffix: true, cacheControlMaxAge: 31536000 });
      mode = access;
      return { ...b, access };
    } catch (e) { if (!first) first = e; }
  }
  throw first;
}

async function readText(blob) {
  try {
    const r = await fetch(blob.url, { cache: "no-store" });
    if (r.ok) return await r.text();
  } catch (e) {}
  const g = await get(blob.pathname, { access: "private", useCache: false });
  if (!g || !g.stream) throw new Error("settings not readable");
  return await new Response(g.stream).text();
}

async function settingsBlobs() {
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix: ROOT + "settings", limit: 1000, cursor });
    out.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

export async function readSettings() {
  const blobs = await settingsBlobs();
  if (!blobs.length) return null;
  return JSON.parse(await readText(blobs[0]));
}

export async function writeSettings(data) {
  await putAny(ROOT + "settings.json", JSON.stringify(data), "application/json");
  const old = (await settingsBlobs()).slice(10).map(b => b.url);
  if (old.length) { try { await del(old); } catch (e) {} }
}

export async function saveImage(buf, type) {
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const b = await putAny(ROOT + "reviews/r." + ext, buf, type);
  return b.access === "public" ? b.url : "/api/img?p=" + encodeURIComponent(b.pathname);
}

export async function readImage(pathname) {
  return await get(pathname, { access: "private" });
}
