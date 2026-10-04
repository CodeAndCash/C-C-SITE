// Code&Cash
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const frameLerp = (k, dt) => 1 - Math.pow(1 - k, dt / (1000 / 60));
const ease = t => t * t * t * (t * (t * 6 - 15) + 10);
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;
const COARSE = matchMedia("(pointer: coarse)").matches;
const EASE = "cubic-bezier(0.2, 0, 0, 1)";
const root = document.documentElement;
root.classList.add("js");
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

// тема: светлая / тёмная, выбор запоминается
(() => {
  const sys = matchMedia("(prefers-color-scheme: light)");
  const meta = document.querySelector('meta[name="theme-color"]');
  const apply = (m, anim) => {
    if (anim && !REDUCED) { root.classList.add("theme-anim"); clearTimeout(apply.t); apply.t = setTimeout(() => root.classList.remove("theme-anim"), 500); }
    root.dataset.mode = m;
    $$("[data-theme-set]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.themeSet === m)));
    $$("[data-theme-toggle]").forEach(b => { b.textContent = m === "dark" ? "Светлая тема" : "Тёмная тема"; });
    if (meta) meta.content = m === "dark" ? "#151619" : "#fafaf8";
  };
  const saved = store.get("cc-theme");
  apply(saved === "light" || saved === "dark" ? saved : (sys.matches ? "light" : "dark"));
  const set = m => { store.set("cc-theme", m); apply(m, true); };
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-theme-set], [data-theme-toggle]");
    if (!b) return;
    set(b.dataset.themeSet || (root.dataset.mode === "dark" ? "light" : "dark"));
  });
  sys.addEventListener?.("change", () => { if (!store.get("cc-theme")) apply(sys.matches ? "light" : "dark", true); });
})();

// один цикл кадров на весь сайт
const ticker = (() => {
  const subs = new Set(); let raf = 0;
  const loop = now => {
    raf = requestAnimationFrame(loop);
    for (const s of subs) { const dt = s.last ? Math.min(now - s.last, 100) : 16.7; s.last = now; try { s.fn(now, dt); } catch (e) { console.warn(e); } }
    if (!subs.size) { cancelAnimationFrame(raf); raf = 0; }
  };
  return { add(fn) { const s = { fn, last: 0 }; subs.add(s); if (!raf) raf = requestAnimationFrame(loop); return () => subs.delete(s); } };
})();
function whileVisible(el, fn, margin = "0px") {
  let stop = null;
  new IntersectionObserver(es => {
    const on = es[es.length - 1].isIntersecting;
    if (on && !stop) stop = ticker.add(fn);
    if (!on && stop) { stop(); stop = null; }
  }, { rootMargin: margin }).observe(el);
}
function onArrive(el, cb, margin = "0px 0px -8% 0px") {
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); cb(); } }, { rootMargin: margin });
  io.observe(el);
}

// блокировка прокрутки (меню, галерея, шторка) без прыжка страницы
const locks = new Set();
function lock(key, on) {
  on ? locks.add(key) : locks.delete(key);
  document.body.classList.toggle("lock", locks.size > 0);
}

// ───── шапка и меню ─────
const top = $("[data-top]");
(function header() {
  let last = scrollY, acc = 0;
  const on = () => {
    const y = scrollY, d = y - last; last = y;
    top.classList.toggle("is-solid", y > 20);
    if (locks.size) return;
    acc = Math.sign(d) === Math.sign(acc) ? acc + d : d;
    if (y < 300 || acc < -24) top.classList.remove("is-hidden");
    else if (acc > 36) top.classList.add("is-hidden");
  };
  addEventListener("scroll", on, { passive: true }); on();
  top.addEventListener("focusin", () => top.classList.remove("is-hidden"));
})();
const burger = $("[data-burger]"), menu = $("[data-menu]");
function setMenu(on) {
  root.classList.toggle("is-menu", on);
  burger.setAttribute("aria-expanded", String(on));
  lock("menu", on);
  if (on) {
    top.classList.remove("is-hidden");
    if (!REDUCED) $$("nav a", menu).forEach((a, i) => a.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: 60 + i * 45, easing: EASE, fill: "backwards" }));
  }
}
burger.addEventListener("click", () => setMenu(!root.classList.contains("is-menu")));
menu.addEventListener("click", e => { if (e.target.closest("a")) setMenu(false); });
addEventListener("resize", () => { if (innerWidth >= 960) setMenu(false); });

// плавный переход к разделам
document.addEventListener("click", e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute("href").slice(1);
  const el = id ? document.getElementById(id) : null;
  if (!el) return;
  e.preventDefault();
  const y = id === "top" ? 0 : el.getBoundingClientRect().top + scrollY - (innerWidth >= 960 ? 72 : 64);
  scrollTo({ top: y, behavior: REDUCED ? "auto" : "smooth" });
  if (id !== "top") history.replaceState(null, "", "#" + id);
});

// ───── появление ─────
$$("[data-words]").forEach(h => {
  const text = h.textContent.trim();
  h.setAttribute("aria-label", text);
  h.innerHTML = text.split(/\s+/).map(w => `<span class="w" aria-hidden="true"><span>${w}</span></span>`).join(" ");
  if (REDUCED) return;
  const spans = $$(".w > span", h);
  spans.forEach(s => { s.style.transform = "translateY(105%)"; });
  onArrive(h, () => spans.forEach((s, i) => {
    s.style.transform = "";
    s.animate([{ transform: "translateY(105%)" }, { transform: "none" }], { duration: 900, delay: i * 55, easing: "cubic-bezier(.2,.7,.1,1)", fill: "backwards" });
  }));
});
const RV = {
  "": [{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }],
  flip: [{ opacity: 0, transform: "perspective(900px) rotateX(-40deg) translateY(24px)" }, { opacity: 1, transform: "none" }],
  side: [{ opacity: 0, transform: "perspective(900px) rotateY(24deg) translateX(24px)" }, { opacity: 1, transform: "none" }],
  card: [{ opacity: 0, transform: "perspective(1200px) rotateX(18deg) translateY(40px) scale(0.96)" }, { opacity: 1, transform: "none" }]
};
const rvCount = new Map();
function reveal(el) {
  const scope = el.parentElement, n = rvCount.get(scope) || 0; rvCount.set(scope, n + 1);
  if (REDUCED) { el.classList.remove("rv"); return; }
  onArrive(el, () => { el.classList.remove("rv"); el.animate(RV[el.dataset.rv || ""], { duration: 900, delay: Math.min(n, 6) * 80, easing: EASE, fill: "backwards" }); });
}
$$(".rv").forEach(reveal);
(function heroIn() {
  if (REDUCED) return;
  $$("[data-lines] .ln > span").forEach((s, i) => s.animate([{ transform: "translateY(105%)" }, { transform: "none" }], { duration: 1000, delay: 120 + i * 100, easing: "cubic-bezier(.2,.7,.1,1)", fill: "backwards" }));
  $$("[data-hin]").forEach((el, i) => el.animate(RV[""], { duration: 900, delay: 60 + (i ? 360 + i * 90 : 0), easing: EASE, fill: "backwards" }));
})();


// ───── наклон за пальцем или мышью ─────
function tilt(el, { max = 10, idle = 0, scrollTilt = 0 } = {}) {
  const s = { x: 0, y: 0, tx: 0, ty: 0 };
  const t0 = performance.now() + Math.random() * 3000;
  if (FINE && !REDUCED) {
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      s.tx = ((e.clientX - r.left) / r.width) * 2 - 1; s.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      el.style.setProperty("--gx", ((s.tx + 1) * 50).toFixed(1) + "%"); el.style.setProperty("--gy", ((s.ty + 1) * 50).toFixed(1) + "%");
    });
    el.addEventListener("pointerleave", () => { s.tx = s.ty = 0; });
  }
  if (REDUCED) return;
  whileVisible(el, (now, dt) => {
    const k = frameLerp(0.08, dt);
    s.x += (s.tx - s.x) * k; s.y += (s.ty - s.y) * k;
    const t = (now - t0) / 1000;
    const r = el.getBoundingClientRect(), p = clamp((innerHeight - r.top) / (innerHeight + r.height)) - 0.5;
    const rx = -s.y * max + Math.sin(t * 0.8) * idle - p * scrollTilt;
    const ry = s.x * max + Math.cos(t * 0.6) * idle * 1.4;
    el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  }, "10% 0px");
}
tilt($("[data-pass]"), { max: 9, idle: 2.5, scrollTilt: 10 });
tilt($("[data-phone]"), { max: 8, idle: 3, scrollTilt: 22 });

// автор: фото в объёме — карточка наклоняется, снимок чуть отстаёт
(function author() {
  const card = $("[data-author]"), img = $("[data-photo] img");
  tilt(card, { max: 10, idle: 2, scrollTilt: 12 });
  if (REDUCED) return;
  whileVisible(card, () => {
    const r = card.getBoundingClientRect(), p = clamp((innerHeight - r.top) / (innerHeight + r.height)) - 0.5;
    img.style.transform = `scale(1.08) translateY(${(p * -24).toFixed(1)}px)`;
  }, "10% 0px");
})();

// ───── телефон с ботом: сообщения приходят по очереди ─────
(function chat() {
  const msgs = $$("[data-chat] .msg");
  let timers = [];
  const play = () => {
    timers.forEach(clearTimeout); timers = [];
    msgs.forEach(m => m.classList.remove("is-in"));
    msgs.forEach((m, i) => timers.push(setTimeout(() => m.classList.add("is-in"), REDUCED ? 0 : 300 + i * 900)));
    if (!REDUCED) timers.push(setTimeout(play, 300 + msgs.length * 900 + 4000));
  };
  let on = false;
  new IntersectionObserver(es => {
    const vis = es[es.length - 1].isIntersecting;
    if (vis && !on) { on = true; play(); }
    if (!vis && on) { on = false; timers.forEach(clearTimeout); }
  }, { threshold: 0.25 }).observe($("[data-phone]"));
})();

// ───── парсер: пример поиска ─────
(function parser() {
  const fr = $("[data-pdemo]");
  if (fr) onArrive(fr, () => { if (!fr.src) fr.src = "parser-demo.html"; }, "600px 0px 600px 0px");
  const sf = $("[data-sdemo]");
  if (sf) onArrive(sf, () => { if (!sf.src) sf.src = "script-demo.html"; }, "600px 0px 600px 0px");
  // счётчик офферов
  const big = $("[data-count]");
  onArrive(big, () => {
    const to = +big.dataset.count, t0 = performance.now(), D = 1600;
    const stop = ticker.add(now => {
      const p = clamp((now - t0) / D);
      big.textContent = p >= 1 ? "300–400+" : Math.round(to * ease(p));
      if (p >= 1) stop();
    });
  });
})();

// ───── настройки: набор в C&C Family и отзывы ─────
let DEFAULTS = {};
try { DEFAULTS = JSON.parse($("#cc-default").textContent); } catch (e) {}
async function loadSettings() {
  for (const url of ["api/settings", "settings.json?v=" + Date.now()]) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok || !/json/.test(r.headers.get("content-type") || "")) continue;
      const d = await r.json();
      if (d && d.family) return d;
    } catch (e) {}
  }
  return DEFAULTS;
}
const SITE_IMG = /^(https:\/\/[\w-]+\.(public\.)?blob\.vercel-storage\.com\/|\/api\/img\?p=|assets\/)/;
function applyImages(m = {}) {
  $$("[data-img]").forEach(el => {
    if (!el.dataset.orig) el.dataset.orig = el.getAttribute("src");
    const v = m[el.dataset.img];
    el.src = v && SITE_IMG.test(v) ? v : el.dataset.orig;
  });
}
function applyFamily(f = {}) {
  const sec = $("[data-family]"), open = !!f.open;
  sec.classList.toggle("is-open", open);
  if (f.priceRub) $("[data-rub]").textContent = `${f.priceRub} ₽`;
  if (f.priceUsd) $("[data-usd]").textContent = `$${f.priceUsd}`;
  if (f.wave) $("[data-wave]").textContent = f.wave;
  const book = $("[data-book]"), bt = f.bookText === undefined ? "Забронировать место со скидкой" : String(f.bookText).trim(), bu = f.bookUrl === undefined ? "https://t.me/m/bxwMqnFtMWJh" : String(f.bookUrl).trim();
  if (book) { const ok = bt && /^https:\/\//.test(bu); book.hidden = !ok; if (ok) { book.textContent = bt; book.href = bu; } }
  const btn = $("[data-fam-btn]");
  if (open) {
    const seats = Math.max(0, parseInt(f.seats, 10) || 0), total = Math.max(seats, parseInt(f.total, 10) || 0);
    $("[data-state-text]").textContent = seats > 0 ? "Вход открыт" : "Места закончились";
    $("[data-seats]").textContent = seats;
    const bar = $("[data-seats-bar]");
    onArrive(bar, () => { bar.style.width = total ? `${(seats / total * 100).toFixed(1)}%` : "100%"; });
    btn.href = "https://t.me/SUN9ISE";
    $("[data-fam-btn-text]").textContent = seats > 0 ? "Вступить в C&C Family" : "Написать, чтобы попасть в следующую волну";
    $("[data-fam-note]").textContent = seats > 0 ? "Пиши в личку, расскажу, как оплатить и что дальше." : "Напиши, и я сообщу, когда откроется следующая волна.";
  } else {
    $("[data-state-text]").textContent = "Вход пока закрыт";
    btn.href = "https://t.me/CodeandCash_of";
    $("[data-fam-btn-text]").textContent = "Узнать об открытии первым";
    $("[data-fam-note]").textContent = "Когда откроем вход, напишем в канале.";
  }
}

// ───── отзывы и просмотр ─────
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const fmtDate = d => { if (!d) return ""; try { const x = new Date(d + "T12:00:00"); return isNaN(x) ? "" : x.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }); } catch (e) { return ""; } };
let REVIEWS = [];
function renderReviews(list) {
  REVIEWS = (list || []).filter(r => r && (r.text || r.img));
  const box = $("[data-reviews]");
  box.innerHTML = REVIEWS.map((r, i) => `
    <button class="review" type="button" role="listitem" data-open="${i}" aria-label="Открыть отзыв ${i + 1} из ${REVIEWS.length}">
      <span class="review__top"><span class="review__who"><i>${esc((r.name || "О").trim().charAt(0).toUpperCase())}</i><span><b>${esc(r.name || "Отзыв")}</b>${r.date ? `<small>${esc(fmtDate(r.date))}</small>` : ""}</span></span></span>
      ${r.img ? `<span class="review__img"><img src="${esc(r.img)}" alt="" loading="lazy" decoding="async"></span>` : ""}
      <span class="review__text">${esc(r.text || "")}</span>
      <span class="review__more"><span>${r.img ? "Скриншот" : "Текст"}</span><span>Открыть →</span></span>
    </button>`).join("");
  $$(".review", box).forEach((el, i) => {
    if (REDUCED) return;
    el.style.opacity = "0";
    onArrive(el, () => { el.style.opacity = ""; el.animate([{ opacity: 0, transform: "perspective(900px) rotateY(-20deg) translateX(30px)" }, { opacity: 1, transform: "none" }], { duration: 800, delay: Math.min(i, 4) * 90, easing: EASE, fill: "backwards" }); }, "0px");
  });
  buildLightbox();
}
const rvBox = $("[data-reviews]");
const rvStep = () => (rvBox.querySelector(".review")?.offsetWidth || 300) + 12;
$("[data-rv-prev]").addEventListener("click", () => rvBox.scrollBy({ left: -rvStep(), behavior: REDUCED ? "auto" : "smooth" }));
$("[data-rv-next]").addEventListener("click", () => rvBox.scrollBy({ left: rvStep(), behavior: REDUCED ? "auto" : "smooth" }));
rvBox.addEventListener("click", e => { const b = e.target.closest("[data-open]"); if (b) openLb(+b.dataset.open, b); });

const lb = $("[data-lb]"), slides = $("[data-lb-slides]"), track = $("[data-lb-track]"), dotsBox = $("[data-lb-dots]");
let cur = 0, opener = null;
function buildLightbox() {
  slides.innerHTML = REVIEWS.map((r, i) => `
    <div class="lb__slide" data-slide="${i}">
      <figure class="lb__card">
        ${r.img ? `<img src="${esc(r.img)}" alt="Скриншот отзыва ${i + 1}" loading="lazy" decoding="async" draggable="false">` : ""}
        ${r.text ? `<p>${esc(r.text)}</p>` : ""}
        <figcaption class="src"><span>${esc(r.name || "Отзыв")}${r.date ? " · " + esc(fmtDate(r.date)) : ""}</span></figcaption>
      </figure>
    </div>`).join("");
  dotsBox.innerHTML = REVIEWS.map(() => "<i></i>").join("");
}
function go(i, anim = true) {
  cur = clamp(i, 0, REVIEWS.length - 1);
  slides.style.transition = anim && !REDUCED ? "" : "none";
  slides.style.transform = `translateX(${-cur * 100}%)`;
  $$(".lb__slide", slides).forEach((s, k) => s.classList.toggle("is-cur", k === cur));
  $$("i", dotsBox).forEach((d, k) => d.classList.toggle("is-cur", k === cur));
  $("[data-lb-count]").textContent = `${cur + 1} / ${REVIEWS.length}`;
  $("[data-lb-prev]").disabled = cur === 0;
  $("[data-lb-next]").disabled = cur === REVIEWS.length - 1;
}
function openLb(i, from) {
  opener = from || null;
  go(i, false);
  lb.classList.add("is-open"); lock("lb", true);
  setTimeout(() => $("[data-lb-close]").focus(), 60);
}
function closeLb() {
  if (!lb.classList.contains("is-open")) return;
  lb.classList.remove("is-open"); lock("lb", false);
  if (opener) opener.focus({ preventScroll: true });
}
$("[data-lb-close]").addEventListener("click", closeLb);
$("[data-lb-prev]").addEventListener("click", () => go(cur - 1));
$("[data-lb-next]").addEventListener("click", () => go(cur + 1));
lb.addEventListener("click", e => { if (e.target.classList.contains("lb__slide")) closeLb(); });
addEventListener("keydown", e => {
  if (lb.classList.contains("is-open")) {
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowRight") go(cur + 1);
    if (e.key === "ArrowLeft") go(cur - 1);
  } else if (e.key === "Escape") { setMenu(false); closeSheet(); }
});
// свайп пальцем
(function swipe() {
  let x0 = null, y0 = 0, dx = 0, horiz = null;
  track.addEventListener("pointerdown", e => { if (e.target.closest("a") || e.button > 0) return; x0 = e.clientX; y0 = e.clientY; dx = 0; horiz = null; try { track.setPointerCapture(e.pointerId); } catch (_) {} });
  track.addEventListener("dragstart", e => e.preventDefault());
  track.addEventListener("pointermove", e => {
    if (x0 === null) return;
    dx = e.clientX - x0;
    if (horiz === null && (Math.abs(dx) > 8 || Math.abs(e.clientY - y0) > 8)) horiz = Math.abs(dx) > Math.abs(e.clientY - y0);
    if (!horiz) return;
    const edge = (cur === 0 && dx > 0) || (cur === REVIEWS.length - 1 && dx < 0) ? 0.3 : 1;
    slides.style.transition = "none";
    slides.style.transform = `translateX(calc(${-cur * 100}% + ${dx * edge}px))`;
  });
  const end = () => {
    if (x0 === null) return;
    if (horiz && Math.abs(dx) > Math.min(80, track.offsetWidth * 0.18)) go(cur + (dx < 0 ? 1 : -1)); else go(cur);
    x0 = null;
  };
  track.addEventListener("pointerup", end); track.addEventListener("pointercancel", end);
})();

let SETTINGS = DEFAULTS, CHANNEL = null;
const TG = "https://t.me/codeandcashreviews/";
const BAD = /(^|[^а-яё])((?:а|о|на|за|по|вы|до)?(?:ху[йеёияю]|пизд|бля|еба|ёба|еби)[а-яё]*)/gi;
const mask = t => String(t || "").replace(BAD, (m, pre, w) => pre + (w.length > 5 ? w.slice(0, 2) + "**" + w.slice(-3) : w[0] + "**" + w.slice(-1)));
function mergeReviews() {
  const s = SETTINGS || DEFAULTS;
  const own = (s.reviews && s.reviews.length ? s.reviews : DEFAULTS.reviews || []).map(r => ({ ...r }));
  const covered = new Set(), hide = new Set((s.hideTg || []).map(Number));
  own.forEach(r => { (r.tg || []).forEach(i => covered.add(+i)); const m = /codeandcashreviews\/(\d+)/.exec(r.link || ""); if (m) covered.add(+m[1]); });
  const extra = (CHANNEL || []).filter(p => p && p.id && !covered.has(p.id) && !hide.has(p.id) && (p.text || p.photo)).map(p => ({
    name: /[\p{L}\p{N}]/u.test(p.name || "") ? p.name : "", text: p.text || "", date: p.date || "", link: TG + p.id, img: p.photo ? "api/tgimg?id=" + p.id : ""
  }));
  const all = [...own, ...extra].map((r, i) => ({ ...r, text: mask(r.text), _i: i }));
  all.sort((a, b) => (b.date || "").localeCompare(a.date || "") || a._i - b._i);
  return all;
}
async function loadChannel() {
  try {
    const r = await fetch("api/reviews");
    if (!r.ok || !/json/.test(r.headers.get("content-type") || "")) return null;
    const d = await r.json();
    return Array.isArray(d.posts) ? d.posts : null;
  } catch (e) { return null; }
}
(async () => {
  let late = false;
  const ch = loadChannel().then(c => { if (c && c.length) { CHANNEL = c; if (late) renderReviews(mergeReviews()); } });
  SETTINGS = await loadSettings();
  applyFamily(SETTINGS.family || DEFAULTS.family); applyImages(SETTINGS.images);
  await Promise.race([ch, new Promise(r => setTimeout(r, 2500))]);
  late = true;
  renderReviews(mergeReviews());
})();

// ───── наверх ─────
(function toTop() {
  const btn = $("[data-totop]"), ring = $("[data-totop-ring]"), L = 2 * Math.PI * 24;
  const on = () => {
    const h = document.documentElement.scrollHeight - innerHeight, p = h > 0 ? scrollY / h : 0;
    ring.style.strokeDashoffset = (L * (1 - p)).toFixed(1);
    btn.classList.toggle("is-on", scrollY > innerHeight * 0.8);
  };
  addEventListener("scroll", on, { passive: true }); addEventListener("resize", on); on();
  btn.addEventListener("click", () => {
    btn.classList.remove("is-go"); void btn.offsetWidth; btn.classList.add("is-go");
    scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" });
    history.replaceState(null, "", location.pathname + location.search);
  });
})();


// ───── управление сайтом: 5 нажатий на логотип или адрес с #admin ─────
// Посетителям панель ничего не даст: сохранить можно только с ключом GitHub владельца.
(function admin() {
  const box = $("[data-admin]"), frame = $("[data-admin-frame]");
  const open = () => { if (!frame.src) frame.src = "admin.html#embed"; box.hidden = false; lock("admin", true); };
  const close = () => { box.hidden = true; lock("admin", false); if (location.hash === "#admin") history.replaceState(null, "", location.pathname + location.search); };
  let taps = 0, timer = 0;
  $("[data-logo]").addEventListener("click", () => { taps++; clearTimeout(timer); timer = setTimeout(() => { taps = 0; }, 1500); if (taps >= 5) { taps = 0; open(); } });
  if (location.hash === "#admin") open();
  addEventListener("hashchange", () => { if (location.hash === "#admin") open(); });
  addEventListener("message", e => {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.type === "cc-close") close();
    // после сохранения сразу показываем изменения, не дожидаясь GitHub
    if (e.data.type === "cc-saved" && e.data.settings) { SETTINGS = e.data.settings; applyFamily(SETTINGS.family); applyImages(SETTINGS.images); renderReviews(mergeReviews()); }
  });
})();

// ───── приложение: кнопка установки ─────
const sheet = $("[data-sheet]");
function closeSheet() { if (sheet.classList.contains("is-open")) { sheet.classList.remove("is-open"); lock("sheet", false); } }
(function install() {
  const btns = [$("[data-install]"), $("[data-install-foot]")];
  const ua = navigator.userAgent;
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  let deferred = null;
  const show = on => {
    btns[0].classList.toggle("is-on", on);
    btns[1].hidden = !on;
  };
  const done = () => { store.set("cc-installed", "1"); show(false); closeSheet(); };
  if (standalone) store.set("cc-installed", "1");
  const hiddenForGood = () => standalone || store.get("cc-installed") === "1";
  if (!hiddenForGood() && ios) show(true);
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; if (!hiddenForGood()) show(true); });
  addEventListener("appinstalled", done);
  const click = async () => {
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice.catch(() => ({ outcome: "dismissed" }));
      deferred = null;
      if (outcome === "accepted") done(); else show(false);
    } else if (ios) { sheet.classList.add("is-open"); lock("sheet", true); }
  };
  btns.forEach(b => b.addEventListener("click", click));
  $("[data-sheet-close]").addEventListener("click", closeSheet);
  $("[data-sheet-done]").addEventListener("click", done);
  sheet.addEventListener("click", e => { if (e.target === sheet) closeSheet(); });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost") && window.top === window) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();

// ───── 3D-монета на первом экране ─────
(async function coin() {
  const canvas = $("[data-coin]"), hero = $("[data-hero]"), stage = canvas.parentElement, hint = $("[data-hint]");
  const fail = () => { root.classList.add("no-3d"); hint.hidden = true; };
  let T, RoomEnvironment;
  try { T = await import("three"); ({ RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js")); } catch (e) { return fail(); }
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); } catch (e) { return fail(); }
  renderer.setClearAlpha(0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new T.Scene();
  const pm = new T.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture; pm.dispose();
  scene.environmentIntensity = 0.85;
  const key = new T.DirectionalLight(0xffffff, 2.4); key.position.set(-3, 4, 5);
  const rim = new T.DirectionalLight(0xdfe3ff, 1.4); rim.position.set(4, -2, -3);
  scene.add(key, rim);
  const camera = new T.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 7.2);

  // рисуем стороны монеты
  const birdImg = new Image(); birdImg.src = "assets/bird.png";
  const face = (big, ring, rot) => {
    const S = 1024, cv = document.createElement("canvas"); cv.width = cv.height = S;
    const bump = document.createElement("canvas"); bump.width = bump.height = S;
    const draw = () => {
      for (const [c, isBump] of [[cv, false], [bump, true]]) {
        const x = c.getContext("2d");
        x.clearRect(0, 0, S, S);
        const g = x.createRadialGradient(S * 0.38, S * 0.32, S * 0.05, S / 2, S / 2, S * 0.55);
        if (isBump) { g.addColorStop(0, "#666"); g.addColorStop(1, "#555"); } else { g.addColorStop(0, "#d9dade"); g.addColorStop(1, "#8e9095"); }
        x.fillStyle = g; x.fillRect(0, 0, S, S);
        // кольца
        x.lineWidth = 10; x.strokeStyle = isBump ? "#a0a0a0" : "rgba(255,255,255,0.35)";
        x.beginPath(); x.arc(S / 2, S / 2, S * 0.47, 0, Math.PI * 2); x.stroke();
        x.lineWidth = 4; x.beginPath(); x.arc(S / 2, S / 2, S * 0.36, 0, Math.PI * 2); x.stroke();
        // надпись по кругу
        x.fillStyle = isBump ? "#b0b0b0" : "#3a3b40";
        x.font = `600 ${S * 0.05}px Geologica, "Golos Text", Arial, sans-serif`;
        x.textAlign = "center"; x.textBaseline = "middle";
        const chars = [...ring], step = (Math.PI * 2) / chars.length;
        chars.forEach((ch, i) => { x.save(); x.translate(S / 2, S / 2); x.rotate(i * step); x.translate(0, -S * 0.415); x.fillText(ch, 0, 0); x.restore(); });
        // центр: надпись или птица
        if (big === "bird") {
          if (birdImg.complete && birdImg.naturalWidth) {
            const B = S * 0.5, tmp = document.createElement("canvas"); tmp.width = tmp.height = B;
            const tx = tmp.getContext("2d"); tx.drawImage(birdImg, 0, 0, B, B);
            tx.globalCompositeOperation = "source-in"; tx.fillStyle = isBump ? "#fff" : "#26272c"; tx.fillRect(0, 0, B, B);
            x.drawImage(tmp, S / 2 - B / 2, S / 2 - B / 2);
          }
        } else {
          x.font = `700 ${S * 0.26}px Geologica, "Golos Text", Arial, sans-serif`;
          x.fillStyle = isBump ? "#fff" : "#26272c";
          x.fillText(big, S / 2, S / 2 + S * 0.01);
        }
      }
    };
    draw();
    const map = new T.CanvasTexture(cv), bumpMap = new T.CanvasTexture(bump);
    map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
    // крышка цилиндра повёрнута — выравниваем надпись
    for (const t of [map, bumpMap]) { t.center.set(0.5, 0.5); t.rotation = rot; }
    const redraw = () => { draw(); map.needsUpdate = bumpMap.needsUpdate = true; };
    document.fonts.ready.then(redraw);
    if (big === "bird") birdImg.addEventListener("load", redraw);
    return new T.MeshStandardMaterial({ map, bumpMap, bumpScale: 4, metalness: 1, roughness: 0.3 });
  };
  const edgeTex = (() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 8;
    const x = c.getContext("2d");
    for (let i = 0; i < 512; i += 4) { x.fillStyle = i % 8 ? "#ffffff" : "#777777"; x.fillRect(i, 0, 4, 8); }
    const t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; t.repeat.set(12, 1); return t;
  })();
  const edge = new T.MeshStandardMaterial({ color: 0xb8b9be, metalness: 1, roughness: 0.34, bumpMap: edgeTex, bumpScale: 2 });
  const coinG = new T.CylinderGeometry(1.35, 1.35, 0.17, 160, 1);
  const coinM = new T.Mesh(coinG, [edge, face("C&C", "CODE · AND · CASH · ЗАРАБОТОК НА AI · ", Math.PI / 2), face("bird", "C&C FAMILY · УСПЕВАЙ · БУДЬ ПЕРВЫМ · ", Math.PI / 2)]);
  coinM.rotation.x = Math.PI / 2;
  const spinG = new T.Group(), tiltG = new T.Group(), world = new T.Group();
  spinG.add(coinM); tiltG.add(spinG); world.add(tiltG); scene.add(world);
  // мягкая тень
  const sh = document.createElement("canvas"); sh.width = sh.height = 128;
  { const x = sh.getContext("2d"), g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, "rgba(0,0,0,0.55)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
  const shadow = new T.Mesh(new T.PlaneGeometry(3.4, 0.9), new T.MeshBasicMaterial({ map: new T.CanvasTexture(sh), transparent: true, depthWrite: false }));
  shadow.position.set(0, -1.85, -0.4); world.add(shadow);

  // размер и раскладка
  const ratios = [Math.min(devicePixelRatio || 1, COARSE ? 1.75 : 2), 1.25, 1];
  let ri = 0, layout = { x: 0, y: 0, s: 1 };
  const resize = () => {
    const r = stage.getBoundingClientRect();
    renderer.setPixelRatio(ratios[ri]);
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
    const wide = innerWidth >= 960;
    layout = wide ? { x: Math.min(2.6, 0.95 * camera.aspect), y: 0, s: 1 } : { x: 0, y: -0.05, s: Math.min(0.92, 0.62 * camera.aspect + 0.3) };
  };
  new ResizeObserver(resize).observe(stage); resize();

  // управление: мышь наклоняет, палец или мышь крутят с инерцией
  const s = { nx: 0, ny: 0, rx: 0, ry: 0, spin: 0, v: 0.004, drag: null, p: 0 };
  if (FINE) {
    hero.addEventListener("pointermove", e => { s.nx = e.clientX / innerWidth * 2 - 1; s.ny = e.clientY / innerHeight * 2 - 1; });
    hero.addEventListener("pointerleave", () => { s.nx = s.ny = 0; });
  }
  canvas.addEventListener("pointerdown", e => { s.drag = { x: e.clientX, id: e.pointerId, t: performance.now() }; });
  addEventListener("pointermove", e => {
    if (!s.drag || e.pointerId !== s.drag.id) return;
    const dx = e.clientX - s.drag.x; s.drag.x = e.clientX;
    s.v = dx * 0.012; s.spin += s.v;
    if (Math.abs(dx) > 2) hint.style.opacity = "0";
  }, { passive: true });
  const end = e => { if (s.drag && e.pointerId === s.drag.id) s.drag = null; };
  addEventListener("pointerup", end); addEventListener("pointercancel", end);
  canvas.style.cursor = "grab";

  const t0 = performance.now();
  let fpsT = 0, fpsN = 0, budget = 0, lastR = 0;
  function frame(now, dt) {
    const t = REDUCED ? 0 : (now - t0) / 1000;
    const r = hero.getBoundingClientRect();
    s.p += (clamp(-r.top / (r.height * 0.8)) - s.p) * frameLerp(0.12, dt);
    const p = REDUCED ? 0 : s.p;
    s.rx += (s.ny * 0.25 - s.rx) * frameLerp(0.06, dt);
    s.ry += (s.nx * 0.4 - s.ry) * frameLerp(0.06, dt);
    if (!s.drag) { s.v += ((REDUCED ? 0 : 0.006) - s.v) * frameLerp(0.03, dt); s.spin += s.v * (dt / 16.7); }
    // появление: монета падает и раскручивается
    const intro = REDUCED ? 1 : ease(clamp(t / 1.4));
    world.position.set(layout.x, layout.y + (1 - intro) * 1.6 + p * 1.4 + Math.sin(t * 1.1) * 0.06, 0);
    world.scale.setScalar(layout.s * (0.7 + 0.3 * intro) * (1 - p * 0.25));
    tiltG.rotation.set(s.rx + 0.18 - p * 0.4, s.ry, Math.sin(t * 0.7) * 0.05);
    spinG.rotation.y = s.spin + (1 - intro) * 4 + p * Math.PI;
    shadow.material.opacity = 0.9 - p * 0.9;
    canvas.style.opacity = canvas.classList.contains("is-ready") ? (1 - p * 0.9).toFixed(3) : "";
    if (budget && now - lastR < budget) return;
    lastR = now;
    renderer.render(scene, camera);
    if (!fpsT) fpsT = now;
    fpsN++;
    if (now - fpsT > 800) {
      const fps = fpsN * 1000 / (now - fpsT); fpsT = now; fpsN = 0;
      if (fps < 45) { if (ri < ratios.length - 1) { ri++; resize(); } else if (!budget) budget = 1000 / 30; }
    }
  }
  frame(performance.now(), 16);
  canvas.classList.add("is-ready");
  whileVisible(hero, frame);
  document.addEventListener("visibilitychange", () => { fpsT = 0; });
})();
