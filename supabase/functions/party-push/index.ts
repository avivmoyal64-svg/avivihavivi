// @ts-nocheck
// Party games: tells the two invited players about a new party (once per room). Needs the host's login token.
// Uses the same VAPID secrets as send-push.
import webpush from "npm:web-push@3.6.7";

const SB_URL = Deno.env.get("SUPABASE_URL")!, SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const dbH = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "content-type": "application/json" };
webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com", Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);
const get = async (path: string) => { const r = await fetch(SB_URL + "/rest/v1/" + path, { headers: dbH }); return r.ok ? await r.json() : []; };
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type, x-client-info", "access-control-allow-methods": "POST, GET, OPTIONS" };
const jr = (o: unknown, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { "content-type": "application/json", ...CORS } });
const T = {
  en: (who: string, id: string) => ({ title: who + " invited you to a party 🎉", body: "Party games: join and vote on Hot Seat Heist or Weigh-In Whisper.", tag: "party-" + id, url: "/#party" }),
  he: (who: string, id: string) => ({ title: who + " הזמין/ה אתכם למסיבה 🎉", body: "משחקי מסיבה: הצטרפו והצביעו על Hot Seat Heist או Weigh-In Whisper.", tag: "party-" + id, url: "/#party" }),
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const url = new URL(req.url), id = url.searchParams.get("partynote");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return jr({ skipped: true });
  try {
    const ur = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: SB_KEY, Authorization: req.headers.get("authorization") || "" } });
    if (!ur.ok) return jr({ error: "not logged in" }, 401);
    const me = (await ur.json()).id;
    const room = (await get("party_rooms?id=eq." + id + "&select=id,host,status,notified"))[0];
    if (!room || room.host !== me || room.status !== "lobby" || room.notified) return jr({ skipped: true });
    await fetch(SB_URL + "/rest/v1/party_rooms?id=eq." + id, { method: "PATCH", headers: dbH, body: JSON.stringify({ notified: true }) });
    const mem = await get("party_members?room=eq." + id + "&state=eq.invited&select=uid");
    if (!mem.length) return jr({ sent: 0 });
    const subs = await get("push_subs?select=endpoint,user_id,p256dh,auth,lang&user_id=in.(" + mem.map((m: any) => m.uid).join(",") + ")");
    const who = (url.searchParams.get("name") || "Someone").replace(/[\r\n<>]/g, "").slice(0, 24) || "Someone";
    const dead: string[] = []; let ok = 0;
    await Promise.all(subs.map(async (s: any) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify((s.lang === "he" ? T.he : T.en)(who, id)), { TTL: 3600 });
        ok++;
      } catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) dead.push(s.endpoint); }
    }));
    if (dead.length) await fetch(SB_URL + "/rest/v1/push_subs?endpoint=in.(" + dead.map(encodeURIComponent).join(",") + ")", { method: "DELETE", headers: dbH });
    return jr({ sent: ok });
  } catch (e) { return jr({ error: "failed" }, 500); }
});
