/* Free daily case (CS:GO style reel) + free picks. Loaded after the main script (shares its globals). */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const TW = 112;                       /* tile width in px (kept in sync with the CSS through inline styles) */
const RC = { gold: "#ffcc33", red: "#ff3b3b", pink: "#f253b8", purple: "#9b5cff", blue: "#3d8bff", grey: "#8b8d97" };
/* prizes: r = rarity colour, odds = the real chance in % (the server does the draw) */
const PR = {
  pick:    { r: "red",    i: "🎟️", t: "Free pick",           odds: 2 },
  boost:   { r: "gold",   i: "⚡", t: "Coin boost",          odds: 1 },
  c500:    { r: "gold",   i: "COIN", t: "500 coins",           odds: 1 },
  c250:    { r: "pink",   i: "COIN", t: "250 coins",           odds: 8 },
  c100:    { r: "purple", i: "COIN", t: "100 coins",           odds: 10 },
  peek:    { r: "purple", i: "🔍", t: "Peek token",          odds: 10 },
  duel:    { r: "purple", i: "⚔️", t: "Duel boost",          odds: 10 },
  theme:   { r: "purple", i: "🎨", t: "Free theme",          odds: 8 },
  sticker: { r: "purple", i: "⭐", t: "Free sticker",        odds: 5 },
  banner:  { r: "blue",   i: "🖼️", t: "Profile banner",      odds: 12 },
  c25:     { r: "grey",   i: "COIN", t: "25 coins",            odds: 10 },
  spin:    { r: "blue",   i: "🔄", t: "Another spin",        odds: 10 },
  none:    { r: "grey",   i: "😴", t: "Try again tomorrow",  odds: 13 }
};
/* what the reel SHOWS is skewed toward the good colours so it looks like a better chance than it is */
const POOL = { gold: ["c500", "boost"], red: ["pick"], pink: ["c250"], purple: ["c100", "peek", "duel", "theme", "sticker"], blue: ["banner", "spin"], grey: ["c25", "none"] };
const VIS = [["gold", 6], ["red", 10], ["pink", 17], ["purple", 20], ["blue", 22], ["grey", 25]];
const pickR = () => { let x = Math.random() * 100; for (const [r, w] of VIS) { if ((x -= w) < 0) return r; } return "grey"; };
const rnd = a => a[Math.floor(Math.random() * a.length)];
const randKey = () => rnd(POOL[pickR()]);
const randNon = () => rnd(POOL[rnd(["pink", "purple", "blue", "grey"])]);

let ST = null, CASEOK = false, busy = false, SIG = "", LAST = null, KEEP = false;
window.FPN = 0; window.BSN = 0; window.PKN = 0; window.DBN = 0;

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
  return null;
}
const ic = i => i === "COIN" ? '<i class="coin cc"></i>' : "<i>" + i + "</i>";
/* gold prizes are hidden as "?" on the reel until the winning one lands and is revealed */
const tile = (k, o, rev) => { const p = PR[k], x = o || p; if (p.r === "gold" && !rev) return `<div class="cst r-gold cq" style="width:${TW}px"><i class="cqm">?</i><b>?</b></div>`; return `<div class="cst r-${p.r}" style="width:${TW}px">${ic(x.i)}<b>${esc(x.t)}</b></div>`; };

/* ---------- data ---------- */
async function load() {
  if (!SB || !ME) return;
  try { const r = await SB.rpc("case_status"); if (r.error || !r.data) throw 0; ST = r.data; CASEOK = true; window.FPN = ST.free_picks || 0; window.BSN = ST.boosts || 0; window.PKN = ST.peeks || 0; window.DBN = ST.duel_boosts || 0; } catch (e) { CASEOK = false; }
  if (CASEOK) {
    try {
      const q = await SB.from("case_opens").select("user_id,prize,amount");
      if (!q.error) { Object.keys(CASEC).forEach(k => delete CASEC[k]); (q.data || []).forEach(x => { if (x.prize === "coins") CASEC[x.user_id] = (CASEC[x.user_id] || 0) + (x.amount || 0); }); }
    } catch (e) {}
  }
  if (CASEOK) {
    try {
      const b = await SB.from("coin_boosts").select("user_id,fights");
      if (!b.error) { Object.keys(BOOSTF).forEach(k => delete BOOSTF[k]); (b.data || []).forEach(x => { BOOSTF[x.user_id] = new Set((BOOSTF[x.user_id] ? Array.from(BOOSTF[x.user_id]) : []).concat(x.fights || [])); }); }
    } catch (e) {}
  }
  await loadPeeks();
  try { hnav(); } catch (e) {}
  try { ren(); } catch (e) {}
  try { const P = $("pgP"); if (P && !P.hidden) drawPage(); } catch (e) {}
  SIG = ""; if (!busy) { try { window.caseShow(); } catch (e) {} }
}
window.caseLoad = load;

/* ---------- home card ---------- */
const left = () => { const ms = ST && ST.next_at ? Date.parse(ST.next_at) - Date.now() : 0; if (ms <= 0) return ""; const m = Math.ceil(ms / 60000), h = Math.floor(m / 60); return h ? h + "h " + (m % 60) + "m" : (m % 60) + "m"; };
window.caseCard = () => {
  if (!CASEOK || !ME) return "";
  const open = ST && ST.opened, again = !!(ST && !ST.opened && ST.prize === "spin");
  return `<button class="hcard${open ? "" : " cshot"}" onclick="openPage('case')"><i>🎁</i><span><b>Daily case</b><small>${open ? "Next free case in " + esc(left() || "a moment") : again ? "You have another spin!" : "Your free case is ready!"}</small></span><em>›</em></button>`;
};

/* ---------- page ---------- */
const MEAN = {
  pick: "Change one locked pick, as long as that fight is not over.",
  boost: "+20% coins on every pick of one week's event. You choose which week to use it on.",
  c500: "500 coins added to your total.", c250: "250 coins added to your total.",
  c100: "100 coins added to your total.", c25: "25 coins added to your total.",
  theme: "Unlocks a color theme for the whole site. Use it in the Shop.",
  sticker: "Unlocks a sticker next to your name. Use it in the Shop.",
  peek: "See how many other players picked each fighter in one fight, before it starts. Use it on the This week page.",
  duel: "Your next rewarded duel win pays double (10 coins instead of 5).",
  banner: "Unlocks your profile banner: pick a fighter to show big on your profile and choose a colour.",
  spin: "Spin the case again right away.",
  none: "Nothing this time. A new free case opens tomorrow."
};
function prizes() {
  const order = ["pick", "boost", "c500", "c250", "c100", "peek", "duel", "banner", "theme", "sticker", "c25", "spin", "none"];
  return `<div class="cspz"><h3>Possible prizes</h3>${order.map(k => `<div class="cspr r-${PR[k].r}">${ic(PR[k].i)}<div><b>${esc(PR[k].t)}</b><span>${esc(MEAN[k])}</span></div></div>`).join("")}</div>`;
}
function resultCard(r) {
  const k = keyOf(r), p = PR[k], o = real(k, r && r.item) || p;
  let msg;
  if (k === "none") msg = "Nothing this time. Come back tomorrow for another free case.";
  else if (k === "spin") msg = "You get to spin the case again right now.";
  else if (k === "pick") msg = "You can now change one locked pick, as long as that fight is not over. Open the pick and tap “Change this pick”.";
  else if (k === "peek") msg = "Open This week's picks and tap Peek on a fight to see how the other players picked it.";
  else if (k === "duel") msg = "Your next rewarded duel win pays double.";
  else if (k === "banner") msg = "Open your profile to choose a fighter and a colour.";
  else if (k === "boost") msg = "Use it on a week's event before the fights start. Every correct pick that week pays 20% more coins.";
  else if (r.prize === "coins") msg = "+" + r.amount + " coins were added to your total.";
  else msg = "It is yours now. Find it in the Shop to use it.";
  const head = k === "none" ? "Try again tomorrow" : k === "pick" ? "Free pick!" : k === "boost" ? "Coin boost!" : k === "peek" ? "Peek token!" : k === "duel" ? "Duel boost!" : k === "banner" ? "Profile banner!" : k === "spin" ? "Another spin!" : r.prize === "coins" ? r.amount + " coins" : o.t;
  return `<div class="csres r-${p.r}" role="status">${ic(o.i)}<div><small>${k === "none" ? "Today's case" : "You won"}</small><b>${esc(head)}</b><span>${esc(msg)}</span></div></div>`;
}
function stripKeys(final, item) {
  const W = 46, N = W + 9, keys = [];
  for (let i = 0; i < N; i++) keys.push(randKey());
  let f = 0.15 + Math.random() * 0.7, near = false;
  const rr = PR[final].r;
  if (rr !== "gold" && rr !== "red" && Math.random() < 0.8) {          /* 80%: stop right next to a very good prize */
    near = true; const s = Math.random() < 0.5 ? 1 : -1;
    keys[W + s] = Math.random() < 0.4 ? rnd(["c500", "boost"]) : "pick";
    f = s > 0 ? 0.9 + Math.random() * 0.07 : 0.03 + Math.random() * 0.07;
  } else { [W - 1, W + 1].forEach(i => { if (PR[keys[i]].r === "gold" || PR[keys[i]].r === "red") keys[i] = randNon(); }); }
  keys[W] = final;
  return { keys, W, f, near };
}
const stripHtml = (keys, W, o) => keys.map((k, i) => tile(k, i === W ? o : null)).join("");

const boostOn = () => { const s = BOOSTF[ME]; return !!(s && (EV.fights || []).some(f => s.has(f.id))); };
function boostBox() {
  const n = window.BSN || 0, on = boostOn();
  if (!n && !on) return "";
  if (on) return `<div class="csfp csbo"><b>⚡ Coin boost active</b><span>${esc(EV.name || "This week")}: every correct pick pays 20% more coins.</span></div>`;
  return `<div class="csfp csbo"><b>⚡ Coin boosts: ${n}</b><span>Use one on ${esc(EV.name || "this week's event")}. It adds 20% coins to every correct pick of that event. Use it before the fights start.</span><button class="btn csb" type="button" onclick="boostUse()">Use a boost on ${esc(EV.name || "this week")}</button></div>`;
}
/* ---------- items that affect this week's picks (shown on the This week page, only when you have them) ---------- */
const PEEK = {};
async function loadPeeks() {
  if (!SB || !ME || !CASEOK) return;
  try {
    const q = await SB.from("peeks").select("fight_id"); if (q.error) return;
    const have = new Set((q.data || []).map(x => x.fight_id));
    for (const f of (EV.fights || [])) { if (have.has(f.id) && !PEEK[f.id]) { const r = await SB.rpc("peek_fight", { p_fight: f.id }); if (!r.error && r.data) PEEK[f.id] = r.data; } else if (!have.has(f.id)) delete PEEK[f.id]; }
  } catch (e) {}
}
window.peekDo = async function (fid) {
  if (!SB || !ME || busy) return; busy = true;
  try { const r = await SB.rpc("peek_fight", { p_fight: fid }); if (r.error) throw r.error; PEEK[fid] = r.data; window.PKN = r.data.peeks != null ? r.data.peeks : window.PKN; }
  catch (e) { const t = String((e && e.message) || e); try { alert(/no peek/i.test(t) ? "You have no peek tokens." : /started|over/i.test(t) ? "This fight already started, so you can't peek at it." : "Could not peek. Try again."); } catch (x) {} }
  busy = false; try { drawPage(); } catch (e) {}
};
window.itemsPanel = function () {
  if (!CASEOK || !ME) return "";
  const fs = (EV.fights || []), peeked = fs.filter(f => PEEK[f.id]), rows = [];
  if (boostOn()) rows.push(`<div class="dlr conf"><div><b>⚡ Coin boost active</b><small>Every correct pick this week pays 20% more coins.</small></div></div>`);
  else if ((window.BSN || 0) > 0) rows.push(`<div class="dlr conf"><div><b>⚡ Coin boost · ${window.BSN}</b><small>Use one on ${esc(EV.name || "this week")}: +20% coins on every correct pick.</small></div><button class="fvb go" type="button" onclick="boostUse().then(()=>{try{drawPage()}catch(e){}})">Use</button></div>`);
  if ((window.FPN || 0) > 0) rows.push(`<div class="dlr"><div><b>🎟️ Free picks · ${window.FPN}</b><small>Open a locked pick and tap “Change this pick”.</small></div></div>`);
  if ((window.PKN || 0) > 0 || peeked.length) {
    rows.push(`<div class="dlr"><div><b>🔍 Peek tokens · ${window.PKN || 0}</b><small>See how many other players picked each fighter in a fight.</small></div></div>`);
    fs.forEach(f => {
      const pk = PEEK[f.id], over = !!res(f.id) || f.live;
      if (!pk && (over || !(window.PKN > 0))) return;
      rows.push(`<div class="dlr"><div><b>${esc(f.a)} vs ${esc(f.b)}</b><small>${pk ? `${esc(pk.a)}: <span class="pkn">${pk.na}</span> · ${esc(pk.b)}: <span class="pkn">${pk.nb}</span> other player${pk.na + pk.nb === 1 ? "" : "s"}` : "Not peeked yet"}</small></div>${pk ? "" : `<button class="fvb go" type="button" onclick="peekDo('${esc(f.id)}')">Peek</button>`}</div>`);
    });
  }
  return rows.length ? `<div class="dlbox"><b>Your items</b><p>These change how this week's picks work.</p></div>${rows.join("")}` : "";
};
window.boostUse = async function () {
  if (!SB || !ME || busy) return; busy = true;
  try { const r = await SB.rpc("use_boost"); if (r.error) throw r.error; }
  catch (e) { const t = String((e && e.message) || e); try { alert(/already started/i.test(t) ? "This week's event already started, so a boost can't be used on it." : /already active/i.test(t) ? "A boost is already active for this event." : "Could not use the boost. Try again."); } catch (x) {} }
  busy = false; await load();
  try { const o = document.querySelector(".csbo"); if (o) o.outerHTML = boostBox() || ""; } catch (e) {}
};
function html() {
  if (!ME) return '<div class="box"><div class="pfn">Log in to open your free daily case.</div></div>';
  const open = ST && ST.opened, again = !!(ST && !ST.opened && ST.prize === "spin"), idle = stripKeys(randKey(), null);
  const bx = boostBox(), fp = window.FPN > 0 ? `<div class="csfp">🎟️ Free picks: <b>${window.FPN}</b></div>` : "";
  return `<div class="csh"><div class="csn">Free daily case</div><small>One free spin every day</small></div>
  <div class="cswrap" dir="ltr"><div class="csstrip" id="csr">${stripHtml(idle.keys, -1, null)}</div><div class="cspt"></div></div>
  ${open || again ? resultCard(ST) : ""}
  <div class="csact">${open ? `<button class="btn csb" type="button" disabled id="csb">Come back tomorrow</button><div class="csnext" id="csnx">Next free case in ${esc(left() || "a moment")}</div>` : `<button class="btn csb" type="button" id="csb" onclick="caseOpen()">${again ? "Spin again" : "Open free case"}</button><div class="csnext" id="csnx"></div>`}</div>
  ${bx}${fp}${prizes()}`;
}
window.caseShow = function () {
  const el = $("pgcs"); if (!el || busy) return;
  if (KEEP && el.querySelector(".cst.win")) return;   /* keep the finished reel on screen until the page is closed */
  if (!CASEOK) { const t = '<div class="box"><div class="pfn">The daily case is not open yet.</div></div>'; if (SIG !== t) { el.innerHTML = t; SIG = t; } return; }
  const sig = JSON.stringify([ME, ST, window.FPN, window.BSN, window.PKN, window.DBN, BOOSTF[ME] ? BOOSTF[ME].size : 0, EV && EV.id]);
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
function goldReveal(k) {
  return new Promise(done => {
    const p = PR[k], calm = reduced();
    const el = document.createElement("div"); el.id = "cgold"; el.className = calm ? "calm" : "";
    el.innerHTML = `<div class="cgr" aria-hidden="true"></div><div class="cgb"><div class="cgc"><span class="cgq">?</span><span class="cgi">${ic(p.i)}</span></div><h1>${esc(p.t)}!</h1><p>${esc(MEAN[k])}</p><em>Tap to continue</em></div>`;
    document.body.appendChild(el);
    try { navigator.vibrate && navigator.vibrate([80, 60, 80, 60, 220]); } catch (e) {}
    let fin = false;
    const end = () => { if (fin) return; fin = true; el.classList.add("out"); setTimeout(() => { el.remove(); done(); }, 260); };
    setTimeout(() => { el.onclick = end; }, calm ? 300 : 2200);
    setTimeout(end, calm ? 2200 : 7000);
  });
}
window.caseOpen = async function () {
  if (busy || !SB || !ME) return;
  const btn = $("csb"), strip = $("csr"); if (!btn || !strip) return;
  busy = true; btn.disabled = true; btn.textContent = "Opening…";
  { const old = strip.parentNode.parentNode.querySelector(".csres"); if (old) old.remove(); }
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
  const tiles = strip.children;
  if (PR[k].r === "gold") {                      /* gold: the "?" is revealed with a big animation */
    for (let i = 0; i < tiles.length; i++) tiles[i].classList.add(i === S.W ? "win" : "dim");
    await goldReveal(k);
    tiles[S.W].outerHTML = tile(k, o, true); tiles[S.W].classList.add("win");
  }
  for (let i = 0; i < tiles.length; i++) { tiles[i].classList.remove("win", "dim"); tiles[i].classList.add(i === S.W ? "win" : "dim"); }
  try { navigator.vibrate && navigator.vibrate(k === "none" ? [60] : [40, 50, 40, 50, 140]); } catch (e) {}
  const again = r.prize === "spin";
  LAST = r; ST = Object.assign({}, ST || {}, r, { opened: !again });
  window.FPN = r.free_picks != null ? r.free_picks : window.FPN;
  window.BSN = r.boosts != null ? r.boosts : window.BSN;
  window.PKN = r.peeks != null ? r.peeks : window.PKN; window.DBN = r.duel_boosts != null ? r.duel_boosts : window.DBN;
  const act = wrap.parentNode.querySelector(".csact");
  wrap.insertAdjacentHTML("afterend", resultCard(r));
  if (act) act.innerHTML = again ? '<button class="btn csb" type="button" id="csb" onclick="caseOpen()">Spin again</button><div class="csnext" id="csnx"></div>' : '<button class="btn csb" type="button" disabled id="csb">Come back tomorrow</button><div class="csnext" id="csnx">Next free case in ' + esc(left() || "a moment") + "</div>";
  busy = false; KEEP = true;
  if (r.prize === "coins") { try { CASEC[ME] = (CASEC[ME] || 0) + (r.amount || 0); } catch (e) {} }
  try { window.shopLoad && window.shopLoad(); } catch (e) {}
  try { hnav(); ren(); } catch (e) {}
  SIG = ""; 
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
  setTimeout(() => w(n + 1), n < 40 ? 400 : 2000);
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
