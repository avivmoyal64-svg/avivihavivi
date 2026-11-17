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
    note: (k: string, who: string, id: string) => k === "accepted" ? ({ title: who + " accepted your challenge ⚔️", body: "Open the site to play your 10 questions.", tag: "duelnote-" + id, url: "/#duel" }) : k === "ready" ? ({ title: who + " picked your fighter", body: "Your questions are ready. Play now!", tag: "duelnote-" + id, url: "/#duel" }) : ({ title: "Your duel is finished", body: who + " finished too. See who won!", tag: "duelnote-" + id, url: "/#duel" }),
    duel: (who: string, id: string, c: number) => ({ title: who + " challenged you ⚔️", body: "1v1 trivia duel: 10 easy questions, the winner gets " + c + " coins.", tag: "duel-" + id, url: "/#duel" }),
    gnote: (k: string, who: string, id: string) => k === "invited" ? ({ title: who + " challenged you 🕵️", body: "Guess the fighter 1v1: pick a fighter for them, then guess theirs.", tag: "guess-" + id, url: "/#guess" }) : k === "accepted" ? ({ title: who + " accepted your challenge 🕵️", body: "Open the site and guess their fighter.", tag: "guess-" + id, url: "/#guess" }) : ({ title: "Your guessing game is finished", body: who + " finished too. See who won!", tag: "guess-" + id, url: "/#guess" }),
    wnote: (k: string, who: string, id: string) => k === "invited" ? ({ title: who + " challenged you ⚡", body: "Who's Who race: name the blurred fighter first. Best of 5.", tag: "who-" + id, url: "/#who" }) : ({ title: who + " accepted your challenge ⚡", body: "The race is starting. Open the site and join now!", tag: "who-" + id, url: "/#who" }),
  },
  he: {
    open: (n: string) => ({ title: "הבחירות נפתחו", body: n + ": בחרו מנצחים והרוויחו מטבעות." }),
    remind: (n: string, done: number, tot: number) => ({ title: "הבחירות ננעלות בעוד כשעה", body: n + ": בחרתם " + done + " מתוך " + tot + " קרבות." }),
    results: (n: string) => ({ title: "התוצאות מוכנות", body: n + " הסתיים. בדקו בלוח התוצאות איך הלך לכם." }),
    test: () => ({ title: "ההתראות עובדות", body: "זו הודעת בדיקה." }),
    nudge: (f: number) => ({ title: "רשימת ה-GOAT שלכם מחכה 🐐", body: "אתם ב-" + f + " מתוך 20. סיימו אותה וקבלו 100 מטבעות!", tag: "goat-nudge" }),
    note: (k: string, who: string, id: string) => k === "accepted" ? ({ title: who + " אישר/ה את האתגר שלכם ⚔️", body: "היכנסו לאתר כדי לשחק את 10 השאלות.", tag: "duelnote-" + id, url: "/#duel" }) : k === "ready" ? ({ title: who + " בחר/ה לוחם עבורכם", body: "השאלות שלכם מוכנות. שחקו עכשיו!", tag: "duelnote-" + id, url: "/#duel" }) : ({ title: "הדו-קרב שלכם הסתיים", body: who + " סיים/ה גם. בואו לראות מי ניצח!", tag: "duelnote-" + id, url: "/#duel" }),
    duel: (who: string, id: string, c: number) => ({ title: who + " אתגר/ה אתכם ⚔️", body: "דו-קרב טריוויה 1 על 1: 10 שאלות קלות, המנצח מקבל " + c + " מטבעות.", tag: "duel-" + id, url: "/#duel" }),
    gnote: (k: string, who: string, id: string) => k === "invited" ? ({ title: who + " אתגר/ה אתכם 🕵️", body: "נחש את הלוחם 1 על 1: בחרו לוחם עבורו/ה ונחשו את שלו/ה.", tag: "guess-" + id, url: "/#guess" }) : k === "accepted" ? ({ title: who + " אישר/ה את האתגר שלכם 🕵️", body: "היכנסו לאתר ונחשו את הלוחם שלו/ה.", tag: "guess-" + id, url: "/#guess" }) : ({ title: "משחק הניחושים שלכם הסתיים", body: who + " סיים/ה גם. בואו לראות מי ניצח!", tag: "guess-" + id, url: "/#guess" }),
    wnote: (k: string, who: string, id: string) => k === "invited" ? ({ title: who + " אתגר/ה אתכם ⚡", body: "מרוץ מי זה: זהו קודם את הלוחם המטושטש. הטוב מ-5.", tag: "who-" + id, url: "/#who" }) : ({ title: who + " אישר/ה את האתגר שלכם ⚡", body: "המרוץ מתחיל. היכנסו לאתר והצטרפו עכשיו!", tag: "who-" + id, url: "/#who" }),
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

  // Duel updates (accepted / fighter picked / finished): tell the other player of the game.
  const dn = url.searchParams.get("duelnote"), dk = url.searchParams.get("kind") || "";
  if (dn && ["accepted", "ready", "done"].includes(dk)) {
    try {
      const au = req.headers.get("authorization") || "";
      const ur = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: SB_KEY, Authorization: au } });
      if (!ur.ok) return jr({ error: "not logged in" }, 401);
      const me = (await ur.json()).id;
      const gm = (await get("trivia_games?id=eq." + encodeURIComponent(dn) + "&select=id,a,b,status,ready"))[0];
      if (!gm || (gm.a !== me && gm.b !== me)) return jr({ skipped: true });
      if ((dk === "accepted" && !(me === gm.b && gm.status !== "invited")) || (dk === "ready" && !(me === gm.b && gm.ready)) || (dk === "done" && gm.status !== "done")) return jr({ skipped: true });
      const other = me === gm.a ? gm.b : gm.a;
      const subs0 = await get("push_subs?select=endpoint,user_id,p256dh,auth,lang&user_id=eq." + other);
      const who = (url.searchParams.get("name") || "Someone").replace(/[\r\n<>]/g, "").slice(0, 24) || "Someone";
      const n = await send(subs0, (s: any) => (s.lang === "he" ? T.he : T.en).note(dk, who, dn), dead);
      if (dead.length) await fetch(SB_URL + "/rest/v1/push_subs?endpoint=in.(" + dead.map(encodeURIComponent).join(",") + ")", { method: "DELETE", headers: dbH });
      return jr({ sent: n });
    } catch (e) { return jr({ error: "failed" }, 500); }
  }

  // Guess-the-fighter 1v1 updates (invited / accepted / done): tell the other player of the game.
  const gn = url.searchParams.get("guessnote"), gk = url.searchParams.get("kind") || "";
  if (gn && ["invited", "accepted", "done"].includes(gk)) {
    try {
      const au = req.headers.get("authorization") || "";
      const ur = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: SB_KEY, Authorization: au } });
      if (!ur.ok) return jr({ error: "not logged in" }, 401);
      const me = (await ur.json()).id;
      const isW = url.searchParams.get("gt") === "who";
      const gm = (await get((isW ? "who_games" : "guess_games") + "?id=eq." + encodeURIComponent(gn) + "&select=id,a,b,status,notified"))[0];
      if (!gm || (gm.a !== me && gm.b !== me)) return jr({ skipped: true });
      if ((gk === "done" && isW) || (gk === "invited" && !(me === gm.a && gm.status === "invited" && !gm.notified)) || (gk === "accepted" && !(me === gm.b && gm.status === "active")) || (gk === "done" && gm.status !== "done")) return jr({ skipped: true });
      if (gk === "invited") await fetch(SB_URL + "/rest/v1/" + (isW ? "who_games" : "guess_games") + "?id=eq." + encodeURIComponent(gn), { method: "PATCH", headers: dbH, body: JSON.stringify({ notified: true }) });
      const other = me === gm.a ? gm.b : gm.a;
      const subs0 = await get("push_subs?select=endpoint,user_id,p256dh,auth,lang&user_id=eq." + other);
      const who = (url.searchParams.get("name") || "Someone").replace(/[\r\n<>]/g, "").slice(0, 24) || "Someone";
      const n = await send(subs0, (s: any) => (s.lang === "he" ? T.he : T.en)[isW ? "wnote" : "gnote"](gk, who, gn), dead);
      if (dead.length) await fetch(SB_URL + "/rest/v1/push_subs?endpoint=in.(" + dead.map(encodeURIComponent).join(",") + ")", { method: "DELETE", headers: dbH });
      return jr({ sent: n });
    } catch (e) { return jr({ error: "failed" }, 500); }
  }

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
