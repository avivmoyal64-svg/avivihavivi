// @ts-nocheck
// Notifications for party games (?partynote=ROOM), Who Beat Who (?beatnote=GAME&kind=invited|accepted) and Flag Rush (?flagnote=GAME&kind=...). Needs the caller's login token.
// Uses the same VAPID secrets as send-push. Deployed with verify_jwt off (it checks the token itself).
import webpush from "npm:web-push@3.6.7";

const SB_URL = Deno.env.get("SUPABASE_URL")!, SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const dbH = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "content-type": "application/json" };
webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com", Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);
const get = async (path: string) => { const r = await fetch(SB_URL + "/rest/v1/" + path, { headers: dbH }); return r.ok ? await r.json() : []; };
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type, x-client-info", "access-control-allow-methods": "POST, GET, OPTIONS" };
const jr = (o: unknown, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { "content-type": "application/json", ...CORS } });
const T = {
  en: {
    flag: (k: string, who: string, id: string) => k === "invited" ? ({ title: who + " challenged you 🏁", body: "Flag Rush: match 7 fighters to their flags before they do. First to 3 rounds.", tag: "flag-" + id, url: "/#flags" }) : ({ title: who + " accepted your challenge 🏁", body: "Flag Rush: the game is starting. Join now.", tag: "flag-" + id, url: "/#flags" }),
    party: (who: string, id: string) => ({ title: who + " invited you to a party 🎉", body: "Party games: join and vote on Hot Seat Heist or Weigh-In Whisper.", tag: "party-" + id, url: "/#party" }),
    beat: (k: string, who: string, id: string) => k === "invited" ? ({ title: who + " challenged you 🥊", body: "Who Beat Who: tap the fighter with the win, faster than they do. First to 5.", tag: "beat-" + id, url: "/#beat" }) : ({ title: who + " accepted your challenge 🥊", body: "Who Beat Who: the game is starting. Join now.", tag: "beat-" + id, url: "/#beat" }),
  },
  he: {
    flag: (k: string, who: string, id: string) => k === "invited" ? ({ title: who + " אתגר/ה אתכם 🏁", body: "מרוץ דגלים: חברו 7 לוחמים לדגלים שלהם לפני שהם עושים את זה. הראשון ל-3 סיבובים.", tag: "flag-" + id, url: "/#flags" }) : ({ title: who + " אישר/ה את האתגר שלכם 🏁", body: "מרוץ דגלים: המשחק מתחיל. הצטרפו עכשיו.", tag: "flag-" + id, url: "/#flags" }),
    party: (who: string, id: string) => ({ title: who + " הזמין/ה אתכם למסיבה 🎉", body: "משחקי מסיבה: הצטרפו והצביעו על Hot Seat Heist או Weigh-In Whisper.", tag: "party-" + id, url: "/#party" }),
    beat: (k: string, who: string, id: string) => k === "invited" ? ({ title: who + " אתגר/ה אתכם 🥊", body: "מי ניצח את מי: לחצו על הלוחם שניצח, מהר ממנו/ממנה. הראשון ל-5.", tag: "beat-" + id, url: "/#beat" }) : ({ title: who + " אישר/ה את האתגר שלכם 🥊", body: "מי ניצח את מי: המשחק מתחיל. הצטרפו עכשיו.", tag: "beat-" + id, url: "/#beat" }),
  },
};
async function push(userIds: string[], make: (s: any) => any) {
  if (!userIds.length) return 0;
  const subs = await get("push_subs?select=endpoint,user_id,p256dh,auth,lang&user_id=in.(" + userIds.join(",") + ")");
  const dead: string[] = []; let ok = 0;
  await Promise.all(subs.map(async (s: any) => {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(make(s)), { TTL: 3600 }); ok++; }
    catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) dead.push(s.endpoint); }
  }));
  if (dead.length) await fetch(SB_URL + "/rest/v1/push_subs?endpoint=in.(" + dead.map(encodeURIComponent).join(",") + ")", { method: "DELETE", headers: dbH });
  return ok;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const url = new URL(req.url), pid = url.searchParams.get("partynote"), bid = url.searchParams.get("beatnote"), fid = url.searchParams.get("flagnote"), kind = url.searchParams.get("kind") || "";
  const id = pid || bid || fid;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return jr({ skipped: true });
  try {
    const ur = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: SB_KEY, Authorization: req.headers.get("authorization") || "" } });
    if (!ur.ok) return jr({ error: "not logged in" }, 401);
    const me = (await ur.json()).id;
    const who = (url.searchParams.get("name") || "Someone").replace(/[\r\n<>]/g, "").slice(0, 24) || "Someone";
    if (pid) {
      const room = (await get("party_rooms?id=eq." + id + "&select=id,host,status,notified"))[0];
      if (!room || room.host !== me || room.status !== "lobby" || room.notified) return jr({ skipped: true });
      await fetch(SB_URL + "/rest/v1/party_rooms?id=eq." + id, { method: "PATCH", headers: dbH, body: JSON.stringify({ notified: true }) });
      const mem = await get("party_members?room=eq." + id + "&state=eq.invited&select=uid");
      return jr({ sent: await push(mem.map((m: any) => m.uid), (s: any) => (s.lang === "he" ? T.he : T.en).party(who, id)) });
    }
    if (!(["invited", "accepted"].includes(kind))) return jr({ skipped: true });
    const tbl = fid ? "fm_games" : "bt_games", tk = fid ? "flag" : "beat";
    const gm = (await get(tbl + "?id=eq." + id + "&select=id,a,b,status,notified"))[0];
    if (!gm || (gm.a !== me && gm.b !== me)) return jr({ skipped: true });
    if ((kind === "invited" && !(me === gm.a && gm.status === "invited" && !gm.notified)) || (kind === "accepted" && !(me === gm.b && gm.status === "active"))) return jr({ skipped: true });
    if (kind === "invited") await fetch(SB_URL + "/rest/v1/" + tbl + "?id=eq." + id, { method: "PATCH", headers: dbH, body: JSON.stringify({ notified: true }) });
    const other = me === gm.a ? gm.b : gm.a;
    return jr({ sent: await push([other], (s: any) => (s.lang === "he" ? T.he : T.en)[tk](kind, who, id)) });
  } catch (e) { return jr({ error: "failed" }, 500); }
});
