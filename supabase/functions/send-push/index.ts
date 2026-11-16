// @ts-nocheck
// Sends push notifications: "picks are open", "picks lock in 1 hour" (only to people who have not finished picking)
// and "results are in". Runs every 10 minutes from pg_cron. It remembers what it already sent in site_data (key "push_state").
// Secrets to set in Supabase -> Edge Functions -> Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@example.com),
// optional PUSH_TEST_KEY (lets you send a test message with ?test=THE_KEY).
import webpush from "npm:web-push@3.6.7";

const SB_URL = Deno.env.get("SUPABASE_URL")!, SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const dbH = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "content-type": "application/json" };
const LOCK_H = 5, REMIND_MIN = 60;
webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com", Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

const get = async (path: string) => { const r = await fetch(SB_URL + "/rest/v1/" + path, { headers: dbH }); return r.ok ? await r.json() : []; };
const readKey = async (k: string) => { const j = await get("site_data?key=eq." + k + "&select=value"); return j[0] ? j[0].value : null; };
const writeKey = async (k: string, v: unknown) => { await fetch(SB_URL + "/rest/v1/site_data?on_conflict=key", { method: "POST", headers: { ...dbH, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ key: k, value: v, updated_at: new Date() }) }); };

const T = {
  en: {
    open: (n: string) => ({ title: "Picks are open", body: n + ": choose your winners and earn coins." }),
    remind: (n: string, done: number, tot: number) => ({ title: "Picks lock in about 1 hour", body: n + ": you picked " + done + " of " + tot + " fights." }),
    results: (n: string) => ({ title: "Results are in", body: n + " is over. See how you did on the scoreboard." }),
    test: () => ({ title: "Notifications work", body: "This is a test message." }),
    nudge: (f: number) => ({ title: "Your GOAT list is waiting 🐐", body: "You are at " + f + " of 20. Finish it and get 100 coins!", tag: "goat-nudge" }),
    duel: (who: string, id: string, c: number) => ({ title: who + " challenged you ⚔️", body: "1v1 trivia duel: 10 easy questions, the winner gets " + c + " coins.", tag: "duel-" + id, url: "/#duel" }),
  },
  he: {
    open: (n: string) => ({ title: "הבחירות נפתחו", body: n + ": בחרו מנצחים והרוויחו מטבעות." }),
    remind: (n: string, done: number, tot: number) => ({ title: "הבחירות ננעלות בעוד כשעה", body: n + ": בחרתם " + done + " מתוך " + tot + " קרבות." }),
    results: (n: string) => ({ title: "התוצאות מוכנות", body: n + " הסתיים. בדקו בלוח התוצאות איך הלך לכם." }),
    test: () => ({ title: "ההתראות עובדות", body: "זו הודעת בדיקה." }),
    nudge: (f: number) => ({ title: "רשימת ה-GOAT שלכם מחכה 🐐", body: "אתם ב-" + f + " מתוך 20. סיימו אותה וקבלו 100 מטבעות!", tag: "goat-nudge" }),
    duel: (who: string, id: string, c: number) => ({ title: who + " אתגר/ה אתכם ⚔️", body: "דו-קרב טריוויה 1 על 1: 10 שאלות קלות, המנצח מקבל " + c + " מטבעות.", tag: "duel-" + id, url: "/#duel" }),
  },
};


// One-off announcements, sent by opening ?announce=THE_KEY&msg=NAME (once per name; add &again=1 to resend)
const ANN: Record<string, any> = {
  goat: {
    en: { title: "GOAT list is live 🐐", body: "Build your top 20 fighters of all time. Fill all 20 spots and get 100 coins!", tag: "goat" },
    he: { title: "רשימת ה-GOAT באוויר 🐐", body: "בנו את 20 הלוחמים הטובים בכל הזמנים. מלאו את כל 20 המקומות וקבלו 100 מטבעות!", tag: "goat" },
  },
};

async function send(subs: any[], make: (s: any) => any, dead: string[]) {
  let ok = 0;
  await Promise.all(subs.map(async (s) => {
    const m = make(s); if (!m) return;
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ ...m, url: m.url || "/", tag: m.tag }), { TTL: 3600 });
      ok++;
    } catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) dead.push(s.endpoint); }
  }));
  return ok;
}

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type, x-client-info", "access-control-allow-methods": "POST, GET, OPTIONS" };
const jr = (o: unknown, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { "content-type": "application/json", ...CORS } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const url = new URL(req.url), dead: string[] = [], log: string[] = [];

  // A player challenged someone to a trivia duel: notify the invited player (once per game). Needs the challenger's login token.
  const ch = url.searchParams.get("challenge");
  if (ch) {
    try {
      const au = req.headers.get("authorization") || "";
      const ur = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: SB_KEY, Authorization: au } });
      if (!ur.ok) return jr({ error: "not logged in" }, 401);
      const me = (await ur.json()).id;
      const gm = (await get("trivia_games?id=eq." + encodeURIComponent(ch) + "&select=id,a,b,status,notified,reward"))[0];
      if (!gm || gm.a !== me || gm.status !== "invited" || gm.notified) return jr({ skipped: true });
      await fetch(SB_URL + "/rest/v1/trivia_games?id=eq." + encodeURIComponent(ch), { method: "PATCH", headers: dbH, body: JSON.stringify({ notified: true }) });
      const subs0 = (await get("push_subs?select=endpoint,user_id,p256dh,auth,lang&user_id=eq." + gm.b));
      const who = (url.searchParams.get("name") || "Someone").replace(/[\r\n<>]/g, "").slice(0, 24) || "Someone";
      const n = await send(subs0, (s: any) => (s.lang === "he" ? T.he : T.en).duel(who, ch, gm.reward || 5), dead);
      if (dead.length) await fetch(SB_URL + "/rest/v1/push_subs?endpoint=in.(" + dead.map(encodeURIComponent).join(",") + ")", { method: "DELETE", headers: dbH });
      return jr({ sent: n });
    } catch (e) { return jr({ error: "failed" }, 500); }
  }

  const subs = await get("push_subs?select=endpoint,user_id,p256dh,auth,lang");
  const L = (s: any) => (s.lang === "he" ? T.he : T.en);

  const tk = Deno.env.get("PUSH_TEST_KEY");
  if (tk && url.searchParams.get("test") === tk) {
    const n = await send(subs, (s) => L(s).test(), dead);
    if (dead.length) await fetch(SB_URL + "/rest/v1/push_subs?endpoint=in.(" + dead.map(encodeURIComponent).join(",") + ")", { method: "DELETE", headers: dbH });
    return new Response(JSON.stringify({ test: true, subscribers: subs.length, sent: n, removed: dead.length }), { headers: { "content-type": "application/json" } });
  }

  if (tk && url.searchParams.get("announce") === tk) {
    const name = url.searchParams.get("msg") || "", a = ANN[name];
    if (!a) return new Response(JSON.stringify({ error: "unknown msg", known: Object.keys(ANN) }), { headers: { "content-type": "application/json" } });
    const stt = (await readKey("push_state")) || {}; stt.announced = stt.announced || {};
    if (stt.announced[name] && !url.searchParams.get("again")) return new Response(JSON.stringify({ skipped: "already sent", add: "&again=1 to send again" }), { headers: { "content-type": "application/json" } });
    const n = await send(subs, (s) => (s.lang === "he" ? a.he : a.en), dead);
    stt.announced[name] = Date.now(); await writeKey("push_state", stt);
    if (dead.length) await fetch(SB_URL + "/rest/v1/push_subs?endpoint=in.(" + dead.map(encodeURIComponent).join(",") + ")", { method: "DELETE", headers: dbH });
    return new Response(JSON.stringify({ announced: name, subscribers: subs.length, sent: n, removed: dead.length }), { headers: { "content-type": "application/json" } });
  }

  const ev = await readKey("events"); if (!ev) return new Response("no events");
  const first = !(await readKey("push_state")), st = (await readKey("push_state")) || {};
  const now = Date.now(), nx = ev.next, last = ev.last;

  if (nx && nx.lock) {
    const lockAt = nx.lock - LOCK_H * 3600e3;
    // 1) picks are open (a new event shows up while picks are still open)
    if (st.open !== nx.id && now < lockAt) {
      if (!first) log.push("open:" + await send(subs, (s) => L(s).open(nx.name), dead));
      st.open = nx.id;
    }
    // 2) one hour before the lock, only to people who have not finished
    if (st.remind !== nx.id && now >= lockAt - REMIND_MIN * 60e3 && now < lockAt) {
      const ids = new Set((nx.fights || []).map((f: any) => f.id)), tot = ids.size;
      const picks = await get("picks?select=user_id,fights"), cnt: Record<string, number> = {};
      picks.forEach((p: any) => { cnt[p.user_id] = Object.keys(p.fights || {}).filter((k) => ids.has(k)).length; });
      log.push("remind:" + await send(subs, (s) => { const d = cnt[s.user_id] || 0; return d >= tot ? null : L(s).remind(nx.name, d, tot); }, dead));
      st.remind = nx.id;
    }
  }
  // 3) results are in (a finished event appears as "last")
  if (last && last.id && st.results !== last.id) {
    if (!first && (last.fights || []).length) log.push("results:" + await send(subs, (s) => L(s).results(last.name), dead));
    st.results = last.id;
  }
  // 4) GOAT list nudge: started but not finished, one day after the last edit (at most 2 times per person, once per edit)
  try {
    const gl = await get("goat_lists?select=user_id,list,updated_at,bonus");
    st.nudge = st.nudge || {};
    for (const row of gl) {
      const filled = (Array.isArray(row.list) ? row.list : []).filter((x: any) => String(x || "").trim()).length;
      const age = now - Date.parse(row.updated_at);
      if (row.bonus || filled < 1 || filled >= 20 || !(age >= 24 * 3600e3 && age < 7 * 24 * 3600e3)) continue;
      const rec = st.nudge[row.user_id] || { u: "", n: 0 };
      if (rec.u === row.updated_at || rec.n >= 2) continue;
      const mine = subs.filter((s: any) => s.user_id === row.user_id);
      if (!first && mine.length) log.push("nudge:" + await send(mine, (s) => L(s).nudge(filled), dead));
      st.nudge[row.user_id] = { u: row.updated_at, n: first ? rec.n : rec.n + 1 };
    }
  } catch (e) {}
  await writeKey("push_state", st);
  if (dead.length) await fetch(SB_URL + "/rest/v1/push_subs?endpoint=in.(" + dead.map(encodeURIComponent).join(",") + ")", { method: "DELETE", headers: dbH });
  return new Response(JSON.stringify({ first, subscribers: subs.length, log, removed: dead.length }), { headers: { "content-type": "application/json" } });
});
