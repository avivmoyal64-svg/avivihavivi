// @ts-nocheck
// Builds events.json (next card, last results, history) from ESPN's public scoreboard,
// and takes the official main-card start time from ufc.com when it can be found.

const SB_URL = Deno.env.get("SUPABASE_URL")!, SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const dbH = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "content-type": "application/json" };
const readPrev = async () => { try { const r = await fetch(SB_URL + "/rest/v1/site_data?key=eq.events&select=value", { headers: dbH }); const j = await r.json(); return (j[0] && j[0].value) || {}; } catch { return {}; } };
const writeOut = async (o: unknown) => { const r = await fetch(SB_URL + "/rest/v1/site_data?on_conflict=key", { method: "POST", headers: { ...dbH, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ key: "events", value: o, updated_at: new Date().toISOString() }) }); if (!r.ok) throw new Error("write failed " + r.status + " " + await r.text()); };
const UA = { "user-agent": "Mozilla/5.0 (compatible; ufc-roster-updater)", accept: "*/*" };
const get = async (u: string, json?: boolean) => {
  const r = await fetch(u, { headers: UA });
  if (!r.ok) throw new Error(u + " -> " + r.status);
  return json ? r.json() : r.text();
};
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
const slug = (s: unknown) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ET = "America/New_York";
const fmtWhen = (iso, venue) => {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: ET }).format(d).replace(",", ",");
  return day + (venue ? " · " + venue : "");
};
const name = a => (a && (a.athlete?.displayName || a.athlete?.fullName || a.displayName)) || "";

const ORD = c => (c.competitors || []).slice().sort((x, y) => (x.order || 9) - (y.order || 9));
const clsOf = c => String(c.type?.text || c.type?.abbreviation || "").replace(/^W\s+/, "Women's ").replace(/\s*(title\s*)?bout\s*$/i, "").trim();
const core = async (ev, c, tail = "") => { try { return await get(`https://sports.core.api.espn.com/v2/sports/mma/leagues/ufc/events/${ev.id}/competitions/${c.id}${tail}`, true); } catch { return null; } };

function parseMethod(t) {
  t = String(t || "").toLowerCase();
  if (!t) return null;
  if (/sub|choke|armbar|lock|triangle|guillotine/.test(t)) return "SUB";
  if (/dec/.test(t)) return "DEC";
  if (/dq|disq/.test(t)) return "DQ";
  if (/draw|no contest|no-contest/.test(t)) return "NC";
  if (/ko|tko|stop|doctor|retire|punch|kick|knee|elbow/.test(t)) return "KO/TKO";
  return null;
}
async function resultOf(ev, c) {
  const rd = c.status?.period, clk = c.status?.displayClock;
  const st = await core(ev, c, "/status");
  const r = st?.result || c.status?.result || {};
  let m = parseMethod([r.name, r.displayName, r.shortDisplayName, r.description, st?.type?.detail, st?.type?.description].filter(Boolean).join(" "));
  const full = clk === "5:00" || clk === "5:00.0";
  if (!m) m = full ? "DEC" : "KO/TKO";
  const detail = m === "DEC" ? (/split/i.test(JSON.stringify(r)) ? "Split" : /majority/i.test(JSON.stringify(r)) ? "Majority" : /unan/i.test(JSON.stringify(r)) ? "Unanimous" : "") : (rd ? `R${rd}${clk ? " " + clk : ""}` : "");
  return { method: m === "NC" ? "NC/DRAW" : m, m, detail, raw: r };
}

function comps(ev) {
  const list = (ev.competitions || []).map((c, i) => ({ c, i, t: Date.parse(c.date || ev.date) || 0 }));
  list.sort((a, b) => a.i - b.i);
  const n = list.length, maxT = Math.max(...list.map(x => x.t));
  let main = list.map(x => x.t === maxT);
  const cnt = main.filter(Boolean).length;
  if (cnt < 3 || cnt > 7) main = list.map((x, k) => k >= n - (n >= 13 ? 6 : 5));
  list.forEach((x, k) => { x.main = main[k]; x.pos = k; });
  return list;
}

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


Deno.serve(async (req) => {
if (new URL(req.url).searchParams.get("debug")) {
  const sbd = await get(`https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard?dates=${ymd(new Date(Date.now() - 21 * 864e5))}-${ymd(new Date(Date.now() + 28 * 864e5))}&limit=100`, true);
  const evs = (sbd.events || []).filter(e => /ufc/i.test(e.name || ""));
  const dn = e => e.status?.type?.state === "post" || e.status?.type?.completed;
  const pe = evs.filter(dn).pop(), ne = evs.find(e => !dn(e));
  const o = {};
  if (pe) { o.status = []; for (const c of pe.competitions.slice(-2)) o.status.push(await core(pe, c, "/status")); }
  if (ne) { o.comp = await core(ne, ne.competitions[ne.competitions.length - 1]); }
  return new Response(JSON.stringify(o).slice(0, 6000), { headers: { "content-type": "application/json" } });
}
try {
const prev: any = await readPrev();
const now = Date.now();
const sb = await get(`https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard?dates=${ymd(new Date(now - 21 * 864e5))}-${ymd(new Date(now + 28 * 864e5))}&limit=100`, true);
const events = (sb.events || []).filter(e => /ufc/i.test(e.name || e.shortName || "")).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
const done = e => e.status?.type?.state === "post" || e.status?.type?.completed;
const upcoming = events.filter(e => !done(e));
const past = events.filter(done);
const out: any = { updated: new Date().toISOString(), next: prev.next, last: prev.last, history: prev.history || {} };

const evId = ev => "e" + ev.id;
const fid = (ev, a, b) => evId(ev) + "-" + [slug(a), slug(b)].sort().join("-vs-");
const venueOf = ev => { const v = ev.competitions?.[0]?.venue || ev.venues?.[0] || {}; return [v.fullName, v.address?.city].filter(Boolean).join(", "); };

if (upcoming.length) {
  const ev = upcoming[0], L = comps(ev), main = L.filter(x => x.main);
  if (main.length >= 3) {
    const fights = [];
    const rev = main.slice().reverse();
    for (let k = 0; k < rev.length; k++) {
      const x = rev[k], cs = ORD(x.c), a = name(cs[0]), b = name(cs[1]);
      if (!a || !b) continue;
      const cc = await core(ev, x.c);
      const periods = cc?.format?.regulation?.periods || 0;
      const five = periods ? periods >= 5 : k < 2;
      const isMain = k === 0, co = k === 1;
      const title = /title|championship/i.test(JSON.stringify([cc?.notes, cc?.note, cc?.name, cc?.type?.text])) || (five && (co || (isMain && /^UFC \d+/i.test(ev.name))));
      fights.push({ id: fid(ev, a, b), a, b, cls: clsOf(x.c), tag: (title ? "Title fight · " : "") + (isMain ? "Main event" : co ? "Co-main" : "Main card"), main: isMain ? 1 : 0, rounds: five ? 5 : 3 });
    }
    const off = await officialMainCard(ev);
    const lock = off ? off.ts : main[0].t;
    out.next = { id: evId(ev), name: String(ev.name).split(":")[0].trim() || ev.shortName, when: fmtWhen(ev.date, venueOf(ev)), lock, source: off ? "ufc.com" : "espn", fights };
  }
}
if (past.length) {
  const ev = past[past.length - 1], L = comps(ev);
  const rows = [];
  const rev = L.slice().reverse();
  for (let k = 0; k < rev.length; k++) {
    const x = rev[k], cs = ORD(x.c), w = cs.find(c => c.winner), l = cs.find(c => c !== w);
    if (!w) continue;
    const mo = await resultOf(ev, x.c);
    rows.push({ id: fid(ev, name(w), name(l)), w: name(w), l: name(l), cls: clsOf(x.c), method: mo.method, m: mo.m, detail: mo.detail, main: k === 0 ? 1 : 0, card: x.main ? 1 : 0 });
  }
  if (rows.length) {
    out.last = { id: evId(ev), name: ev.name, when: fmtWhen(ev.date, venueOf(ev)), fights: rows };
    rows.forEach(r => { out.history[r.id] = { w: r.w, m: r.m === "NC" || r.m === "DQ" ? "" : r.m, main: r.main }; });
  }
}
const strip = o => JSON.stringify({ ...o, updated: 0 });
if (strip(out) === strip(prev)) console.log("no change");
else await writeOut(out);
console.log("next:", out.next && out.next.name, out.next && out.next.source, "| last:", out.last && out.last.name, "| history:", Object.keys(out.history).length);

return new Response(JSON.stringify({ ok: true, next: out.next && out.next.name, last: out.last && out.last.name }), { headers: { "content-type": "application/json" } });
} catch (e) { console.error(e); return new Response("error: " + (e as Error).message, { status: 500 }); }
});
