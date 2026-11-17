// Service worker: lets browsers install the site as an app, shows push notifications, and gives an offline mode.
// Offline: the app shell and scripts are saved (network first, so updates still arrive instantly), fighter/event data
// (public site_data rows) is saved after each load, and photos / fonts / libraries are saved as you look at them.
// Private data (picks, coins, profiles) and the password page are never saved.
const V = "ufc-v2", SHELL = ["/", "/index.html", "/he.js", "/shop.js", "/bets.js", "/case.js", "/duel.js", "/guess.js", "/who.js", "/menu.js", "/coinbar.js", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/terms.html", "/privacy.html", "/copyright.html", "/contact.html", "/legal.css"];
const SUPA = "hauxmxemyvgbgkbholln.supabase.co";
// only store real pages, never the password gate (it is sent with Cache-Control: no-store)
const good = r => r && r.status === 200 && !/no-store/i.test(r.headers.get("cache-control") || "");
const key = u => { const p = new URL(u); return p.origin === self.location.origin && (p.pathname === "/" || p.pathname === "/index.html") ? "/index.html" : u; };

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(async u => {
    try { const r = await fetch(u, { cache: "reload" }); if (good(r)) await c.put(key(new URL(u, self.location.origin).href), r); } catch (x) {}
  }))));
});
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

async function netFirst(req, k, ms) {
  const c = await caches.open(V);
  try {
    const r = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error("slow")), ms || 8000))]);
    if (good(r)) c.put(k, r.clone());
    return r;
  } catch (x) {
    const hit = await c.match(k);
    if (hit) return hit;
    // slow but not offline: let the real request finish
    if (x && x.message === "slow") return fetch(req);
    throw x;
  }
}
async function cacheFirst(req, k) {
  const c = await caches.open(V), hit = await c.match(k);
  if (hit) return hit;
  const r = await fetch(req);
  if (r && (r.ok || r.type === "opaque")) c.put(k, r.clone());
  return r;
}
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    if (u.pathname === "/__login" || u.pathname === "/sw.js") return;
    if (req.mode === "navigate") return e.respondWith(netFirst(req, key(req.url), 4000));
    if (/\.(?:webp|jpg|jpeg|png|gif|svg|ico|woff2?)$/i.test(u.pathname)) return e.respondWith(cacheFirst(req, req.url));
    return e.respondWith(netFirst(req, req.url, 6000));
  }
  if (u.hostname === SUPA) {
    // only the public fighter/event data; everything else (picks, coins, login) always goes to the network
    if (u.pathname.startsWith("/rest/v1/site_data")) return e.respondWith(netFirst(req, u.pathname + u.search, 5000));
    return;
  }
  // Other sites (login library CDN, fonts, ESPN photos) are NOT handled here: the site security policy only lets a service worker fetch our own server and Supabase,
  // so the browser loads those itself, exactly as before.
});
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "UFC Fighter Roster", {
    body: d.body || "", icon: "icon-192.png", badge: "icon-192.png", tag: d.tag || undefined, data: { url: d.url || "/" }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { if ("focus" in c) { c.focus(); if ("navigate" in c) { try { c.navigate(url); } catch (x) {} } return; } }
    return self.clients.openWindow(url);
  }));
});
