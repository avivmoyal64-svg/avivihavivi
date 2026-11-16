/* Free daily case (CS:GO style reel) + free picks. Loaded after the main script (shares its globals). */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const TW = 112;                       /* tile width in px (kept in sync with the CSS through inline styles) */
const RC = { gold: "#ffcc33", red: "#ff3b3b", pink: "#f253b8", purple: "#9b5cff", blue: "#3d8bff", grey: "#8b8d97" };
/* prizes: r = rarity colour, odds = the real chance in % (the server does the draw) */
const PR = {
  pick:    { r: "gold",   i: "🎟️", t: "Free pick",           odds: 1 },
  c500:    { r: "red",    i: "COIN", t: "500 coins",           odds: 2 },
  c250:    { r: "pink",   i: "COIN", t: "250 coins",           odds: 8 },
  theme:   { r: "pink",   i: "🎨", t: "Free theme",          odds: 5 },
  c100:    { r: "purple", i: "COIN", t: "100 coins",           odds: 10 },
  sticker: { r: "purple", i: "⭐", t: "Free sticker",        odds: 5 },
  emoji:   { r: "blue",   i: "😎", t: "Free emoji",          odds: 10 },
  c25:     { r: "grey",   i: "COIN", t: "25 coins",            odds: 10 },
  none:    { r: "grey",   i: "😴", t: "Try again tomorrow",  odds: 49 }
};
/* what the reel SHOWS is skewed toward the good colours so it looks like a better chance than it is */
const POOL = { gold: ["pick"], red: ["c500"], pink: ["c250", "theme"], purple: ["c100", "sticker"], blue: ["emoji"], grey: ["c25", "none"] };
const VIS = [["gold", 6], ["red", 10], ["pink", 17], ["purple", 20], ["blue", 22], ["grey", 25]];
const pickR = () => { let x = Math.random() * 100; for (const [r, w] of VIS) { if ((x -= w) < 0) return r; } return "grey"; };
const rnd = a => a[Math.floor(Math.random() * a.length)];
const randKey = () => rnd(POOL[pickR()]);
const randNon = () => rnd(POOL[rnd(["pink", "purple", "blue", "grey"])]);

let ST = null, CASEOK = false, busy = false, SIG = "", LAST = null, KEEP = false;
window.FPN = 0;

function keyOf(r) {
  if (!r) return "none";
  if (r.prize === "coins") return ({ 500: "c500", 250: "c250", 100: "c100", 25: "c25" })[r.amount] || (r.amount >= 250 ? "c250" : r.amount >= 100 ? "c100" : "c25");
  return PR[r.prize] ? r.prize : "none";
}
function real(k, item) {   /* the winning tile shows the real item that was won */
  const IT = window.SHOPIT || {}, it = item && IT[item];
  if (!it) return null;
  if (k === "theme") return { i: "🎨", t: it.n + " theme" };
  if (k === "sticker") return { i: it.i, t: it.n + " sticker" };
  if (k === "emoji") return { i: it.g, t: it.n + " emoji" };
  return null;
}
const ic = i => i === "COIN" ? '<i class="coin cc"></i>' : "<i>" + i + "</i>";
const tile = (k, o) => { const p = PR[k], x = o || p; return `<div class="cst r-${p.r}" style="width:${TW}px">${ic(x.i)}<b>${esc(x.t)}</b></div>`; };

/* ---------- data ---------- */
async function load() {
  if (!SB || !ME) return;
  try { const r = await SB.rpc("case_status"); if (r.error || !r.data) throw 0; ST = r.data; CASEOK = true; window.FPN = ST.free_picks || 0; } catch (e) { CASEOK = false; }
  if (CASEOK) {
    try {
      const q = await SB.from("case_opens").select("user_id,prize,amount");
      if (!q.error) { Object.keys(CASEC).forEach(k => delete CASEC[k]); (q.data || []).forEach(x => { if (x.prize === "coins") CASEC[x.user_id] = (CASEC[x.user_id] || 0) + (x.amount || 0); }); }
    } catch (e) {}
  }
  try { hnav(); } catch (e) {}
  try { ren(); } catch (e) {}
  SIG = ""; if (!busy) { try { window.caseShow(); } catch (e) {} }
}
window.caseLoad = load;

/* ---------- home card ---------- */
const left = () => { const ms = ST && ST.next_at ? Date.parse(ST.next_at) - Date.now() : 0; if (ms <= 0) return ""; const m = Math.ceil(ms / 60000), h = Math.floor(m / 60); return h ? h + "h " + (m % 60) + "m" : (m % 60) + "m"; };
window.caseCard = () => {
  if (!CASEOK || !ME) return "";
  const open = ST && ST.opened;
  return `<button class="hcard${open ? "" : " cshot"}" onclick="openPage('case')"><i>🎁</i><span><b>Daily case</b><small>${open ? "Next free case in " + esc(left() || "a moment") : "Your free case is ready!"}</small></span><em>›</em></button>`;
};

/* ---------- page ---------- */
function resultCard(r) {
  const k = keyOf(r), p = PR[k], o = real(k, r && r.item) || p;
  let msg;
  if (k === "none") msg = "Nothing this time. Come back tomorrow for another free case.";
  else if (k === "pick") msg = "You can now change one locked pick, as long as that fight is not over. Open the pick and tap “Change this pick”.";
  else if (r.prize === "coins") msg = "+" + r.amount + " coins were added to your total.";
  else msg = "It is yours now. Find it in the Shop to use it.";
  const head = k === "none" ? "Try again tomorrow" : k === "pick" ? "Free pick!" : r.prize === "coins" ? r.amount + " coins" : o.t;
  return `<div class="csres r-${p.r}" role="status">${ic(o.i)}<div><small>${k === "none" ? "Today's case" : "You won"}</small><b>${esc(head)}</b><span>${esc(msg)}</span></div></div>`;
}
function stripKeys(final, item) {
  const W = 46, N = W + 9, keys = [];
  for (let i = 0; i < N; i++) keys.push(randKey());
  let f = 0.15 + Math.random() * 0.7, near = false;
  const rr = PR[final].r;
  if (rr !== "gold" && rr !== "red" && Math.random() < 0.8) {          /* 80%: stop right next to a very good prize */
    near = true; const s = Math.random() < 0.5 ? 1 : -1;
    keys[W + s] = Math.random() < 0.4 ? "pick" : "c500";
    f = s > 0 ? 0.9 + Math.random() * 0.07 : 0.03 + Math.random() * 0.07;
  } else { [W - 1, W + 1].forEach(i => { if (PR[keys[i]].r === "gold" || PR[keys[i]].r === "red") keys[i] = randNon(); }); }
  keys[W] = final;
  return { keys, W, f, near };
}
const stripHtml = (keys, W, o) => keys.map((k, i) => tile(k, i === W ? o : null)).join("");

function html() {
  if (!ME) return '<div class="box"><div class="pfn">Log in to open your free daily case.</div></div>';
  const open = ST && ST.opened, idle = stripKeys(randKey(), null);
  const fp = window.FPN > 0 ? `<div class="csfp">🎟️ Free picks: <b>${window.FPN}</b></div>` : "";
  return `<div class="csh"><div class="csn">Free daily case</div><small>One free spin every day</small></div>
  <div class="cswrap" dir="ltr"><div class="csstrip" id="csr">${stripHtml(idle.keys, -1, null)}</div><div class="cspt"></div></div>
  ${open ? resultCard(ST) : ""}
  <div class="csact">${open ? `<button class="btn csb" type="button" disabled id="csb">Come back tomorrow</button><div class="csnext" id="csnx">Next free case in ${esc(left() || "a moment")}</div>` : `<button class="btn csb" type="button" id="csb" onclick="caseOpen()">Open free case</button><div class="csnext" id="csnx"></div>`}</div>
  ${fp}`;
}
window.caseShow = function () {
  const el = $("pgcs"); if (!el || busy) return;
  if (KEEP && el.querySelector(".cst.win")) return;   /* keep the finished reel on screen until the page is closed */
  if (!CASEOK) { const t = '<div class="box"><div class="pfn">The daily case is not open yet.</div></div>'; if (SIG !== t) { el.innerHTML = t; SIG = t; } return; }
  const sig = JSON.stringify([ME, ST, window.FPN]);
  if (sig === SIG && el.firstChild) return;
  SIG = sig; el.innerHTML = html();
};

/* ---------- spin ---------- */
const reduced = () => { try { return matchMedia("(prefers-reduced-motion:reduce)").matches; } catch (e) { return false; } };
function spin(strip, vw, target, dur) {
  return new Promise(done => {
    const t0 = performance.now(); let lastIdx = -1, lastV = 0;
    const ease = x => 1 - Math.pow(1 - x, 4);
    const step = now => {
      const t = Math.min(1, (now - t0) / dur), x = target * ease(t);
      strip.style.transform = "translate3d(" + (-x) + "px,0,0)";
      const idx = Math.floor((x + vw / 2) / TW);
      if (idx !== lastIdx) {                       /* a prize passes the pointer: tick */
        lastIdx = idx;
        if (now - lastV >= 45) { lastV = now; try { navigator.vibrate && navigator.vibrate(9); } catch (e) {} }
        const pt = document.querySelector(".cspt"); if (pt) { pt.classList.remove("tk"); void pt.offsetWidth; pt.classList.add("tk"); }
      }
      if (t < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });
}
window.caseOpen = async function () {
  if (busy || !SB || !ME) return;
  const btn = $("csb"), strip = $("csr"); if (!btn || !strip) return;
  busy = true; btn.disabled = true; btn.textContent = "Opening…";
  let r;
  try { const x = await SB.rpc("open_case"); if (x.error) throw x.error; r = x.data; }
  catch (e) {
    busy = false; SIG = "";
    const t = String((e && e.message) || e);
    btn.textContent = /already/i.test(t) ? "Come back tomorrow" : "Could not open. Try again";
    if (!/already/i.test(t)) btn.disabled = false;
    await load(); return;
  }
  const k = keyOf(r), o = real(k, r.item), S = stripKeys(k, r.item);
  strip.style.transition = "none"; strip.style.transform = "translate3d(0,0,0)";
  strip.innerHTML = stripHtml(S.keys, S.W, o);
  const wrap = strip.parentNode, vw = wrap.clientWidth, target = S.W * TW + S.f * TW - vw / 2;
  void strip.offsetWidth;
  await spin(strip, vw, target, reduced() ? 1400 : 7000);
  const tiles = strip.children; for (let i = 0; i < tiles.length; i++) tiles[i].classList.add(i === S.W ? "win" : "dim");
  try { navigator.vibrate && navigator.vibrate(k === "none" ? [60] : [40, 50, 40, 50, 140]); } catch (e) {}
  LAST = r; ST = Object.assign({}, ST || {}, r, { opened: true });
  window.FPN = r.free_picks != null ? r.free_picks : window.FPN;
  const act = wrap.parentNode.querySelector(".csact");
  wrap.insertAdjacentHTML("afterend", resultCard(r));
  if (act) act.innerHTML = '<button class="btn csb" type="button" disabled>Come back tomorrow</button><div class="csnext" id="csnx">Next free case in ' + esc(left() || "a moment") + "</div>";
  busy = false; KEEP = true;
  if (r.prize === "coins") { try { CASEC[ME] = (CASEC[ME] || 0) + (r.amount || 0); } catch (e) {} }
  try { window.shopLoad && window.shopLoad(); } catch (e) {}
  try { hnav(); ren(); } catch (e) {}
  SIG = JSON.stringify([ME, ST, window.FPN]);
  load();
};

const _cp = window.closePage;
window.closePage = function () { KEEP = false; SIG = ""; return _cp.apply(this, arguments); };

/* ---------- free pick (used from the pick window) ---------- */
window.fpBox = (f, sv) => {
  if (!CASEOK || !ME || !(window.FPN > 0) || !sv || !locked() || res(f.id)) return "";
  if (!(EV.fights || []).some(x => x.id === f.id)) return "";
  if (FPUSE === f.id) return `<div class="bbx on"><h4>🎟️ Free pick active</h4><p>Choose a new winner, how it ends and the round, then press Update my pick. This uses 1 of your free picks.</p><button class="bbb" type="button" onclick="fpStop()">Cancel</button></div>`;
  return `<div class="bbx"><h4>🎟️ Use a free pick</h4><p>Change this locked pick as long as the fight is not over. You have ${window.FPN} free pick${window.FPN === 1 ? "" : "s"}.</p><button class="bbb" type="button" onclick="fpStart('${esc(f.id)}')">Change this pick</button></div>`;
};
window.fpStart = id => { FPUSE = id; try { drawPk(); } catch (e) {} };
window.fpStop = () => {
  FPUSE = null;
  try { const m = ((PICKS[ME] || {}).fights || {})[CF.id] || {}; sel = { w: m.w || "", m: nm(m.m || ""), r: m.r || 0 }; drawPk(); } catch (e) {}
};

/* ---------- start ---------- */
(function w(n) {
  try {
    if (ME && SB) {
      load();
      SB.channel("case").on("postgres_changes", { event: "*", schema: "public", table: "case_opens" }, () => { if (!busy) load(); }).subscribe();
      return;
    }
  } catch (e) {}
  if (n < 40) setTimeout(() => w(n + 1), 400);
})(0);
setInterval(() => {
  const e = $("csnx");
  if (ST && ST.opened && ST.next_at) {
    if (Date.parse(ST.next_at) <= Date.now() && !busy) { load(); return; }
    if (e) e.textContent = "Next free case in " + (left() || "a moment");
  }
}, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden && ME && !busy) load(); });
})();
