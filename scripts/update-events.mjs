// Builds events.json (next card, last results, history) from ESPN's public scoreboard,
// and takes the official main-card start time from ufc.com when it can be found.
import fs from "node:fs";

const OUT = process.env.EVENTS_OUT || "events.json";
const UA = { "user-agent": "Mozilla/5.0 (compatible; ufc-roster-updater)", accept: "*/*" };
const get = async (u, json) => {
  const r = await fetch(u, { headers: UA });
  if (!r.ok) throw new Error(u + " -> " + r.status);
  return json ? r.json() : r.text();
};
const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, "");
const slug = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ET = "America/New_York";
const fmtWhen = (iso, venue) => {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: ET }).format(d).replace(",", ",");
  return day + (venue ? " · " + venue : "");
};
const name = a => (a && (a.athlete?.displayName || a.athlete?.fullName || a.displayName)) || "";

function methodOf(c) {
  const res = c.status?.result || {};
  const t = [res.shortDisplayName, res.name, res.description].filter(Boolean).join(" ").toLowerCase();
  if (!t) return { method: "", m: "", detail: "" };
  const rd = c.status?.period, clk = c.status?.displayClock;
  if (/sub/.test(t)) return { method: "SUB", m: "SUB", detail: rd ? `R${rd}${clk ? " " + clk : ""}` : "" };
  if (/dec/.test(t)) {
    const kind = /split|s dec/.test(t) ? "Split" : /major|m dec/.test(t) ? "Majority" : /unan|u dec/.test(t) ? "Unanimous" : "";
    return { method: "DEC", m: "DEC", detail: kind };
  }
  if (/dq|disq/.test(t)) return { method: "DQ", m: "DQ", detail: rd ? `R${rd}` : "" };
  if (/draw|no contest|nc/.test(t)) return { method: "NC/DRAW", m: "NC", detail: "" };
  return { method: "KO/TKO", m: "KO/TKO", detail: rd ? `R${rd}${clk ? " " + clk : ""}` : "" };
}

function comps(ev) {
  const list = (ev.competitions || []).map((c, i) => ({ c, i, t: Date.parse(c.date || c.startDate || ev.date) || 0 }));
  list.sort((a, b) => a.t - b.t || b.i - a.i);
  const n = list.length;
  const segMain = list.map(x => /main/i.test(x.c.cardSegment?.name || x.c.cardSegment?.description || ""));
  const hasSeg = list.some(x => x.c.cardSegment);
  const mainCount = hasSeg ? segMain.filter(Boolean).length : n >= 13 ? 6 : 5;
  list.forEach((x, k) => { x.main = hasSeg ? segMain[k] : k >= n - mainCount; x.pos = k; });
  list.n = n;
  return list;
}
const clsOf = c => String(c.type?.text || c.type?.abbreviation || "").replace(/\s*(title\s*)?bout\s*$/i, "").replace(/\s*title\s*$/i, "").trim();
const isTitle = c => /title|championship/i.test(JSON.stringify([c.type, c.notes, c.note, c.name, c.format?.name]));

async function officialMainCard(ev) {
  try {
    const list = await get("https://www.ufc.com/events");
    const slugs = [...new Set([...list.matchAll(/href="\/event\/([a-z0-9-]+)"/g)].map(m => m[1]))].slice(0, 12);
    const target = Date.parse(ev.date);
    for (const s of slugs) {
      let html;
      try { html = await get("https://www.ufc.com/event/" + s); } catch { continue; }
      const mc = html.match(/data-main-card="(\d{9,13})"/);
      const any = html.match(/data-timestamp="(\d{9,13})"/);
      const ts = mc ? +mc[1] : null;
      const ref = ts || (any ? +any[1] : null);
      if (!ref) continue;
      const ms = ref < 1e12 ? ref * 1000 : ref;
      if (Math.abs(ms - target) < 30 * 3600e3 && ts) return { ts: ts < 1e12 ? ts * 1000 : ts, slug: s };
    }
  } catch (e) { console.log("ufc.com lookup failed:", e.message); }
  return null;
}

const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const now = Date.now();
const sb = await get(`https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard?dates=${ymd(new Date(now - 21 * 864e5))}-${ymd(new Date(now + 28 * 864e5))}&limit=100`, true);
const events = (sb.events || []).filter(e => /ufc/i.test(e.name || e.shortName || "")).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
const done = e => e.status?.type?.state === "post" || e.status?.type?.completed;
const upcoming = events.filter(e => !done(e));
const past = events.filter(done);
const out = { updated: new Date().toISOString(), next: prev.next, last: prev.last, history: prev.history || {} };

const evId = ev => "e" + ev.id;
const fid = (ev, a, b) => evId(ev) + "-" + [slug(a), slug(b)].sort().join("-vs-");
const venueOf = ev => { const v = ev.competitions?.[0]?.venue || ev.venues?.[0] || {}; return [v.fullName, v.address?.city].filter(Boolean).join(", "); };

if (upcoming.length) {
  const ev = upcoming[0], L = comps(ev), main = L.filter(x => x.main);
  if (main.length >= 3) {
    const fights = main.slice().reverse().map((x, k, arr) => {
      const cs = x.c.competitors || [], a = name(cs[0]), b = name(cs[1]);
      const isMain = k === 0, co = k === 1;
      const title = isTitle(x.c);
      return { id: fid(ev, a, b), a, b, cls: clsOf(x.c), tag: (title ? "Title fight · " : "") + (isMain ? "Main event" : co ? "Co-main" : "Main card"), main: isMain ? 1 : 0, rounds: isMain || title ? 5 : 3 };
    }).filter(f => f.a && f.b);
    const off = await officialMainCard(ev);
    const lock = off ? off.ts : main[0].t;
    out.next = { id: evId(ev), name: String(ev.name).split(":")[0].trim() || ev.shortName, when: fmtWhen(ev.date, venueOf(ev)), lock, source: off ? "ufc.com" : "espn", fights };
  }
}
if (past.length) {
  const ev = past[past.length - 1], L = comps(ev);
  const rows = L.slice().reverse().map((x, k) => {
    const cs = x.c.competitors || [], w = cs.find(c => c.winner), l = cs.find(c => c !== w);
    if (!w) return null;
    const mo = methodOf(x.c);
    return { id: fid(ev, name(w), name(l)), w: name(w), l: name(l), cls: clsOf(x.c), method: mo.method, m: mo.m, detail: mo.detail, main: k === 0 ? 1 : 0, card: x.main ? 1 : 0 };
  }).filter(Boolean);
  if (rows.length) {
    out.last = { id: evId(ev), name: ev.name, when: fmtWhen(ev.date, venueOf(ev)), fights: rows };
    rows.forEach(r => { out.history[r.id] = { w: r.w, m: r.m === "NC" || r.m === "DQ" ? "" : r.m, main: r.main }; });
  }
}
const strip = o => JSON.stringify({ ...o, updated: 0 });
if (strip(out) === strip(prev)) console.log("no change");
else fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log("next:", out.next && out.next.name, out.next && out.next.source, "| last:", out.last && out.last.name, "| history:", Object.keys(out.history).length);
