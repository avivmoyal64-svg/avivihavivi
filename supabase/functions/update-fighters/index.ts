// @ts-nocheck
// Refreshes rankings, pro records, age, height and reach for the roster from ufc.com.
// Saves them in site_data (key "fighters"); the website lays them over the roster.
// Roster below = names on the site (regenerate when classes are added).
const ROSTER: Record<string, string[]> = {"Flyweight": ["Demetrious Johnson","Joshua Van","Alexandre Pantoja","Manel Kape","Brandon Royval","Tatsuro Taira","Lone'er Kavanagh","Kyoji Horiguchi","Asu Almabayev","Brandon Moreno","Ramazan Temirov","Steve Erceg","Charles Johnson","Bilal Hasan"],"Bantamweight": ["Dominick Cruz","T.J. Dillashaw","Henry Cejudo","Petr Yan","Merab Dvalishvili","Song Yadong","Sean O'Malley","Mario Bautista","Umar Nurmagomedov","Cory Sandhagen","Raul Rosas Jr.","Payton Talbott","Aiemann Zahabi","Bryce Mitchell","Marlon Vera","Raoni Barcelos","Deiveson Figueiredo","Aleksandre Topuria","Ethyn Ewing"],"Featherweight": ["Jose Aldo","Alexander Volkanovski","Movsar Evloev","Lerone Murphy","Aljamain Sterling","Jean Silva","Arnold Allen","Youssef Zalal","Aaron Pico","Kevin Vallejos","Melquizael Costa","Steve Garcia","Patricio Pitbull","Josh Emmett","Brian Ortega","Yair Rodriguez","Tommy McMillen","Marwane Rahiki","Luke Riley"],"Lightweight": ["Khabib Nurmagomedov","Dustin Poirier","Eddie Alvarez","Tony Ferguson","Justin Gaethje","Ilia Topuria","Charles Oliveira","Max Holloway","Paddy Pimblett","Arman Tsarukyan","Quillan Salkilld","Tom Nolan","Benoît Saint Denis","Mateusz Gamrot","Maurício Ruffy","Rafael Fiziev","Renato Moicano","Esteban Ribovics","Salahdine Parnasse","Beneil Dariush","Diego Lopes","Usman Nurmagomedov","Michael Chandler","Terrance McKinney","King Green","Akbar Abdullaev","Conor McGregor","Magomed Zaynukov"],"Welterweight": ["Georges St-Pierre","Jorge Masvidal","Colby Covington","Tyron Woodley","Robbie Lawler","Kamaru Usman","Gilbert Burns","Islam Makhachev","Carlos Prates","Ian Garry","Shavkat Rakhmonov","Michael Morales","Jack Della Maddalena","Sean Brady","Gabriel Bonfim","Belal Muhammad","Mike Malott","Uroš Medić","Leon Edwards","Joaquin Buckley","Yaroslav Amosov","Jacobe Smith","Kevin Holland","Roberto Soldić","Neil Magny","Geoff Neal"],"Middleweight": ["Anderson Silva","Chris Weidman","Michael Bisping","Sean Strickland","Khamzat Chimaev","Dricus Du Plessis","Nassourdine Imavov","Brendan Allen","Joe Pyfer","Caio Borralho","Gregory Rodrigues","Israel Adesanya","Ikram Aliskerov","Christian Leroy Duncan","Bo Nickal","Roman Kopylov","Shara Magomedov","Ateba Gautier","Damian Pinas","Baisangur Susurkaev","Yousri Belgaroui","Jared Cannonier"]};

const SB_URL = Deno.env.get("SUPABASE_URL")!, SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const dbH = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "content-type": "application/json" };
const readRow = async (key: string) => { try { const r = await fetch(SB_URL + "/rest/v1/site_data?key=eq." + key + "&select=value", { headers: dbH }); const j = await r.json(); return (j[0] && j[0].value) || {}; } catch { return {}; } };
const writeRow = async (key: string, o: unknown) => { const r = await fetch(SB_URL + "/rest/v1/site_data?on_conflict=key", { method: "POST", headers: { ...dbH, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ key, value: o, updated_at: new Date().toISOString() }) }); if (!r.ok) throw new Error("write failed " + r.status + " " + await r.text()); };
const UA = { "user-agent": "Mozilla/5.0 (compatible; ufc-roster-updater)", accept: "text/html,*/*", "accept-language": "en-US,en;q=0.9" };
const get = async (u: string) => { const r = await fetch(u, { headers: UA }); if (!r.ok) throw new Error(u + " -> " + r.status); return r.text(); };

const norm = (s: string) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const slugOf = (n: string) => String(n).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/['\u2019.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const clean = (s: string) => String(s || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&rsquo;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const ATH = /href="[^"]*\/athlete\/([^"?#]+)"[^>]*>([^<]+)<\/a>/i;

// finds which roster class a rankings table belongs to (looks at the table's heading text)
const classOf = (tb: string) => {
  const head = clean(((tb.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i) || [])[1] || "").replace(/<span[\s\S]*?<\/span>/gi, ""));
  if (!head || /women|pound/i.test(head)) return "";
  const DE: Record<string, string> = { fliegengewicht: "Flyweight", bantamgewicht: "Bantamweight", federgewicht: "Featherweight", leicht: "Lightweight", leichtgewicht: "Lightweight", weltergewicht: "Welterweight", mittelgewicht: "Middleweight", halbschwergewicht: "Light Heavyweight", schwergewicht: "Heavyweight" };
  if (DE[norm(head)] && ROSTER[DE[norm(head)]]) return DE[norm(head)];
  const keys = Object.keys(ROSTER).filter(k => norm(head).includes(norm(k))).sort((a, b) => b.length - a.length);
  return keys[0] || "";
};
// ---- rankings page: { "Flyweight": { "Name": 0 (champion) | 1..15 } } plus name -> ufc.com slug
async function rankings() {
  const html = await get("https://www.ufc.com/rankings");
  const rk: Record<string, Record<string, number>> = {}, slugs: Record<string, string> = {};
  for (const tb of html.split(/<table/i).slice(1)) {
    const end = tb.search(/<\/table>/i), body = end > 0 ? tb.slice(0, end) : tb;
    const cap = (body.match(/<caption[\s\S]*?<\/caption>/i) || [""])[0];
    const cls = classOf(tb);
    if (!cls) continue;
    const ranks: Record<string, number> = {};
    const champ = cap.match(ATH);
    if (champ) { const n = clean(champ[2]); ranks[n] = 0; slugs[norm(n)] = champ[1]; }
    for (const row of body.split(/<tr/i).slice(1)) {
      const r = row.match(/weight-class-rank[^>]*>\s*(\d+)/i), a = row.match(ATH);
      if (r && a) { const n = clean(a[2]); ranks[n] = +r[1]; slugs[norm(n)] = a[1]; }
    }
    // also store each ranked fighter under the name used on our roster (ufc.com may add middle names)
    for (const [n, v] of Object.entries(ranks)) {
      const sl = slugs[norm(n)], tk = norm(n).split(" ");
      for (const c in ROSTER) for (const rn of ROSTER[c]) {
        if (rn === n || ranks[rn] !== undefined) continue;
        const rt = norm(rn).split(" ");
        if (slugOf(rn) === sl || (rt.length >= 2 && rt.every(w => tk.includes(w)))) { ranks[rn] = v; slugs[norm(rn)] = sl; }
      }
    }
    if (Object.keys(ranks).length >= 10) rk[cls] = ranks;
  }
  return { rk, slugs };
}

const inch = (v: string) => { const n = parseFloat(v); return n > 30 && n < 100 ? n : 0; };
async function athlete(slug: string) {
  const h = await get("https://www.ufc.com/athlete/" + slug);
  const o: any = {};
  const m = h.match(/(\d+)-(\d+)-(\d+)\s*\(W-L-D\)/);
  if (m) o.rec = (m[1] + "-" + m[2] + (+m[3] ? "-" + m[3] : ""));
  const i = h.indexOf("c-bio__label"), bio = i >= 0 ? clean(h.slice(i, i + 12000)) : "";
  const num = (label: string) => { const r = bio.match(new RegExp("\\b(?:" + label + ")\\s+(\\d+(?:\\.\\d+)?)", "i")); return r ? parseFloat(r[1]) : 0; };
  const ht = inch(String(num("Height|Gr\\S{1,2}e"))), rc = inch(String(num("Reach|Reichweite"))), age = num("Age|Alter");
  if (ht) o.ht = Math.floor(ht / 12) + "'" + Math.round(ht % 12) + "\"";
  if (rc) o.rch = Math.round(rc) + "\"";
  if (age > 15 && age < 60) o.age = Math.round(age);
  return o;
}

Deno.serve(async (req) => {
  try {
    const q = new URL(req.url).searchParams;
    if (q.get("peek")) {   // debugging: shows what was read from one athlete page
      const s = q.get("peek")!, h = await get("https://www.ufc.com/athlete/" + s), i = h.indexOf("c-bio__label");
      return new Response(JSON.stringify({ parsed: await athlete(s), wl: (h.match(/.{0,60}\(W-L-D\)/) || [""])[0], bio: clean(h.slice(i, i + 3000)).slice(0, 600) }), { headers: { "content-type": "application/json" } });
    }
    if (q.get("who")) {   // debugging: where is a fighter in the saved rankings?
      const w = norm(q.get("who")!), cur: any = await readRow("fighters"), hits: any[] = [];
      for (const c in cur.rk || {}) for (const n in cur.rk[c]) if (norm(n).includes(w)) hits.push({ cls: c, name: n, rank: cur.rk[c][n] });
      return new Response(JSON.stringify({ hits, info: Object.entries(cur.f || {}).filter(([n]) => norm(n).includes(w)) }), { headers: { "content-type": "application/json" } });
    }
    if (q.get("ranks")) {
      const html = await get("https://www.ufc.com/rankings"), tbs = html.split(/<table/i).slice(1);
      return new Response(JSON.stringify({ tables: tbs.map(tb => ({ h4: ((tb.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i) || [])[1] || "").replace(/\s+/g, " ").slice(0, 90), cls: classOf(tb), rows: (tb.match(/weight-class-rank"/g) || []).length })), second: (tbs[1] || "").replace(/\s+/g, " ").slice(0, 1200) }), { headers: { "content-type": "application/json" } });
    }
    const prev: any = await readRow("fighters"), ev: any = await readRow("events");
    const out: any = { updated: new Date().toISOString(), rk: prev.rk || {}, f: prev.f || {} };
    let slugs: Record<string, string> = {};
    try { const r = await rankings(); if (Object.keys(r.rk).length >= 3) out.rk = r.rk; slugs = r.slugs; } catch (e) { console.log("rankings failed:", (e as Error).message); }
    // who is due: fighters on the last/next card every 2 h, everyone else every 20 h (max 30 per run)
    const card = new Set<string>();
    [...((ev.next && ev.next.fights) || []).flatMap((f: any) => [f.a, f.b]), ...((ev.last && ev.last.fights) || []).flatMap((f: any) => [f.w, f.l])].forEach((n: string) => card.add(norm(n)));
    const now = Date.now(), due: string[] = [];
    for (const cls in ROSTER) for (const n of ROSTER[cls]) {
      const t = (out.f[n] && out.f[n].t) || 0, age = now - t;
      if (age > (card.has(norm(n)) ? 2 : 20) * 3600e3 || (!(out.f[n] && out.f[n].age) && age > 3600e3)) due.push(n);
    }
    due.sort((a, b) => ((out.f[a] && out.f[a].t) || 0) - ((out.f[b] && out.f[b].t) || 0));
    const todo = due.slice(0, 30);
    let okc = 0; const failed: string[] = [];
    for (let i = 0; i < todo.length; i += 6) {
      await Promise.all(todo.slice(i, i + 6).map(async (n) => {
        const slug = slugs[norm(n)] || slugOf(n);
        try { const o = await athlete(slug); out.f[n] = Object.assign({}, out.f[n] || {}, o, { t: now }); if (o.rec) okc++; else failed.push(n); }
        catch (e) { failed.push(n); out.f[n] = Object.assign({}, out.f[n] || {}, { t: now - 18 * 3600e3 }); }   // try again in ~2 h
      }));
    }
    await writeRow("fighters", out);
    return new Response(JSON.stringify({ ok: true, classesRanked: Object.keys(out.rk).length, refreshed: todo.length, withRecord: okc, failed, remaining: due.length - todo.length }), { headers: { "content-type": "application/json" } });
  } catch (e) { console.error(e); return new Response("error: " + (e as Error).message, { status: 500 }); }
});
