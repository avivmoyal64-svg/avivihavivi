/* "Who Beat Who": two fighters appear, both players tap the one that has a win over the other. First correct tap wins the round.
   First to 5 round wins (max 9 rounds, 10 seconds each). The server picks the pairs and decides who was first. Full-screen. Loaded after party.js. */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const nm = id => (typeof NAMES !== "undefined" && NAMES[id]) || "Player";
const ROUND_MS = 10000;
let OPEN = false, G = [], OK = false, M = null, V = null, OFF = 0, MSG = "", BUSY = false, KEY = "", LK = 0, FB = "", SEL = null;
const DISM = {};
const srv = () => Date.now() + OFF;
window.BTC = window.BTC || {};
window.pendBeat = () => G.some(g => g.a === ME && g.status === "invited" && Date.parse(g.created_at) > Date.now() - 864e5);
const live = g => g.status === "invited" || (g.status === "active" && Date.parse(g.touched || 0) > Date.now() - 10 * 60e3);
const invitesIn = () => G.filter(g => g.b === ME && g.status === "invited" && Date.parse(g.created_at) > Date.now() - 864e5);
const playable = () => G.filter(g => g.status === "active" && Date.parse(g.touched || 0) > Date.now() - 10 * 60e3);
const rpc = async (fn, a) => { const r = await SB.rpc(fn, a || {}); if (r.error) throw r.error; return r.data; };
const photoOf = n => { try { for (const c in D) if (D[c].some(f => f.n === n)) return (typeof photoZ === "function" ? photoZ(n) : "") || ""; } catch (e) {} return ""; };
const ini = n => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
const ERR = e => { const t = String((e && e.message) || e); return /pending invite/i.test(t) ? (window.PENDMSG || "You already have an invite waiting.") : /wait a few/i.test(t) ? "Wait a few seconds before sending another challenge, or cancel the one you sent." : /already open/i.test(t) ? "You already have an open game with this player." : /too many/i.test(t) ? "You sent too many challenges today. Try again tomorrow." : "Could not do that. Try again."; };

function ensure() {
  if ($("bt")) return;
  const st = document.createElement("style");
  st.textContent = `
#bt{position:fixed;inset:0;z-index:410;display:none;flex-direction:column;background:radial-gradient(800px 460px at 100% 0,rgba(var(--rgb),.22),transparent 60%),radial-gradient(700px 400px at 0 100%,rgba(var(--rgb),.14),transparent 60%),#1f2024;color:var(--tx,#f2f2f2);padding-top:env(safe-area-inset-top,0px)}
#bt.on{display:flex}
#bt .pth{flex:none;display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid #4d4e55;background:rgba(31,32,36,.92)}
#bt .pth h2{margin:0;flex:1;font:italic 900 24px "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;letter-spacing:1.2px;background:linear-gradient(90deg,var(--red),var(--red2) 60%,var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent}
#bt .ptbk{all:unset;cursor:pointer;box-sizing:border-box;min-height:44px;padding:0 16px;display:flex;align-items:center;border:1px solid #6b6c75;color:#fff;font:700 15px Barlow,Heebo,Arial,sans-serif}
#bt .ptbk.lv{border-color:var(--red2);color:#ffb4b4}
#btb{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 14px 22px;max-width:640px;width:100%;margin:0 auto;box-sizing:border-box}
.btcd{display:grid;place-items:center;height:min(52vh,420px);margin:6px 0;background:#2c2d32;border:2px solid #4d4e55;text-align:center;font:italic 900 120px "Barlow Condensed",Arial,sans-serif;color:#fff}
.btcd small{display:block;font:700 16px Barlow,Heebo,Arial,sans-serif;color:var(--mut);letter-spacing:.6px;text-transform:uppercase}
.btq{margin:4px 0 10px;text-align:center;font:italic 900 26px/1.05 "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;letter-spacing:.8px}
.btsr{display:block;margin:6px auto 2px;padding:3px 12px;width:max-content;max-width:100%;background:var(--gold);color:#fff;font:italic 900 20px "Barlow Condensed","Heebo",Arial,sans-serif;letter-spacing:1px}
.btq small{display:block;margin-top:2px;font:15px Barlow,Heebo,Arial,sans-serif;font-style:normal;text-transform:none;letter-spacing:0;color:var(--mut)}
.btvs{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.btc{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;background:#2c2d32;border:2px solid #5a5b63;color:#fff;overflow:hidden;position:relative;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.btc:active{transform:scale(.98)}
.btc .ph{display:block;width:100%;aspect-ratio:3/4;background:#3a3b42 center top/cover no-repeat;position:relative}
.btc .ph.av{display:grid;place-items:center;font:italic 900 72px "Barlow Condensed",Arial,sans-serif;color:#9a9ba4;background:linear-gradient(160deg,#3a3b42,#2a2b30)}
.btc b{display:block;padding:10px 8px 12px;text-align:center;font:italic 900 22px/1.05 "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;letter-spacing:.4px;overflow-wrap:anywhere}
.btc.w{border-color:var(--grn);box-shadow:0 0 24px rgba(47,191,113,.45)}.btc.l{opacity:.55}
.btc.w .ph::after{content:"BEAT";position:absolute;left:0;right:0;bottom:0;padding:6px;background:#2fbf71e6;text-align:center;font:italic 900 22px "Barlow Condensed",Arial,sans-serif;letter-spacing:2px;color:#08210f}
.btc.l .ph::after{content:"LOST";position:absolute;left:0;right:0;bottom:0;padding:6px;background:#000a;text-align:center;font:italic 900 22px "Barlow Condensed",Arial,sans-serif;letter-spacing:2px;color:#ddd}
.btlk .btc:not(.w):not(.l){opacity:.45;pointer-events:none}
.btbar{height:8px;background:#3a3b42;margin:12px 0 4px}.btbar u{display:block;height:100%;width:100%;background:linear-gradient(90deg,var(--red),var(--red2));text-decoration:none}
.btmsg{min-height:22px;margin:6px 0;text-align:center;color:var(--mut);font:700 15px Barlow,Heebo,Arial,sans-serif}
#btinv{position:fixed;z-index:66;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);max-width:560px;margin:0 auto;animation:invUp .45s cubic-bezier(.2,1.2,.3,1) both}
#btinv[hidden]{display:none}`;
  document.head.appendChild(st);
  const el = document.createElement("div"); el.id = "bt"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Who Beat Who");
  el.innerHTML = `<div class="pth"><h2>Who Beat Who</h2><button class="ptbk" id="btx" type="button">‹ Back</button></div><div id="btb"></div>`;
  document.body.appendChild(el);
  $("btx").onclick = onBack;
  $("btb").addEventListener("click", onClick);
}

/* ---------- open / close ---------- */
window.beatOpen = async function (id) {
  ensure(); OPEN = true; $("bt").classList.add("on");
  try { if (location.hash !== "#beat") history.pushState({ bt: 1 }, "", "#beat"); } catch (e) {}
  if (typeof window.smClose === "function") window.smClose();
  M = null; V = null; MSG = ""; KEY = "";
  await load();
  if (id) { try { await rpc("bt_accept", { p_game: id }).catch(() => {}); } catch (e) {} await enter(id); }
  render(true);
};
function close() {
  OPEN = false; M = null; V = null; KEY = ""; MSG = ""; SEL = null;
  const p = $("bt"); if (p) p.classList.remove("on");
  try { if (location.hash === "#beat") history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
}
const inGame = () => !!(M && V && V.status === "active");
async function onBack() {
  if (inGame()) {
    if (!confirm(window.LANGHE ? "לצאת מהמשחק? זה נחשב הפסד." : "Quit this game? It counts as a loss.")) return;
    try { await rpc("bt_forfeit", { p_game: M }); } catch (e) {}
  }
  if (M) { M = null; V = null; KEY = ""; await load(); render(true); return; }
  close();
}
addEventListener("popstate", () => {
  if (!OPEN) return;
  if (inGame()) { try { history.pushState({ bt: 1 }, "", "#beat"); } catch (e) {} return; }
  if (location.hash !== "#beat") close();
});

/* ---------- data ---------- */
async function load() {
  if (!SB || !ME) return;
  try {
    const q = await SB.from("bt_games").select("id,a,b,status,wa,wb,winner,draw,created_at,touched").or("a.eq." + ME + ",b.eq." + ME).order("created_at", { ascending: false }).limit(20);
    if (q.error) throw q.error; G = q.data || []; OK = true;
  } catch (e) { OK = false; G = []; }
  if (OK) { try { const w = await SB.rpc("bt_wins"); if (!w.error && Array.isArray(w.data)) { Object.keys(window.BTC).forEach(k => delete window.BTC[k]); w.data.forEach(x => { if (x.winner) window.BTC[x.winner] = 5 * Number(x.n || 0); }); } } catch (e) {} }
}
async function enter(id) { M = id; V = null; KEY = ""; LK = 0; FB = ""; await pull(); }
async function pull() {
  if (!M) return; const t0 = Date.now();
  try {
    const r = await rpc("bt_view", { p_game: M });
    OFF = Number(r.now) - (t0 + Date.now()) / 2; V = r; LK = Math.max(LK, Number(r.lock) || 0);
  } catch (e) { /* keep the last view */ }
}
async function poll() { if (!OPEN || document.hidden || !M || BUSY) return; await pull(); render(false); }
setInterval(poll, 500);
setInterval(() => { if (OPEN && !M && !document.hidden) load().then(() => { if (OPEN && !M) render(false); }); }, 4000);

/* ---------- views ---------- */
function model() {
  if (!V) return null;
  if (V.status === "done" || V.status === "cancelled" || V.status === "declined") return { ph: "end", key: "end" + V.status + V.me + V.opp };
  const now = srv();
  if (V.done) return { ph: "done", key: "r" + V.round + "d" };
  if (now < Number(V.rstart)) return { ph: "cd", key: "r" + V.round + "c" + (V.x || "") };
  return { ph: "live", key: "r" + V.round + "l" + (V.x || "") };
}
function card(n, cls, act) {
  const ph = photoOf(n);
  return `<button type="button" class="btc ${cls || ""}" ${act ? `data-a="pick" data-n="${esc(n)}"` : "disabled"}>${ph ? `<i class="ph" style="background-image:url(${ph})"></i>` : `<i class="ph av">${esc(ini(n))}</i>`}<b>${esc(n)}</b></button>`;
}
function scoreBar() {
  const g = G.find(x => x.id === M), opp = g ? nm(g.a === ME ? g.b : g.a) : "Opponent";
  return `<div class="wws"><span>${esc(nm(ME))}</span><b dir="ltr" id="btsc">${V ? V.me : 0} – ${V ? V.opp : 0}</b><span>${esc(opp)}</span></div>`;
}
function menu() {
  const inv = invitesIn(), pl = playable();
  const ps = Object.keys(NAMES || {}).filter(id => id !== ME && NAMES[id]).sort((a, b) => nm(a).localeCompare(nm(b)));
  const open = new Set(G.filter(live).map(g => g.a === ME ? g.b : g.a));
  const blocked = BUSY || (window.invitePending && window.invitePending());
  return `${MSG ? `<div class="ptmsg" style="margin:0 0 10px;padding:10px 12px;background:#3a2323;border-inline-start:5px solid var(--red2);font:15px Barlow,Heebo,Arial,sans-serif">${esc(MSG)}</div>` : ""}
<div class="dlbox" style="margin-top:0"><b>Who Beat Who</b><p>Two fighters appear. Tap the one that has a win over the other, faster than your opponent. 10 seconds a round. First to 5 round wins. A wrong tap locks you out for 2 seconds. Some pairs fought more than once, and then you are told which fight to pick (fight 1, fight 2…). The winner gets 5 coins.</p></div>
${inv.map(g => `<div class="dlr conf"><div><b>${esc(nm(g.a))}</b><small>Challenged you · 🥊 Who Beat Who</small></div><button class="fvb go" type="button" data-a="acc" data-id="${g.id}">Accept</button><button class="fvb" type="button" data-a="no" data-id="${g.id}">Decline</button></div>`).join("")}
${pl.map(g => `<div class="dlr conf"><div><b>${esc(nm(g.a === ME ? g.b : g.a))}</b><small>Game in progress · <span dir="ltr">${g.a === ME ? g.wa : g.wb} – ${g.a === ME ? g.wb : g.wa}</span></small></div><button class="fvb go" type="button" data-a="join" data-id="${g.id}">Join</button></div>`).join("")}
${G.filter(g => g.status === "invited" && g.a === ME && Date.parse(g.created_at) > Date.now() - 864e5).map(g => `<div class="dlr"><div><b>${esc(nm(g.b))}</b><small>Waiting for them to accept · 🥊 Who Beat Who</small></div><button class="fvb" type="button" data-a="no" data-id="${g.id}">Cancel</button></div>`).join("")}
<div class="dlbox"><b>Challenge a player</b><p>They get a notification. The game starts when they accept.</p></div>
${OK ? ps.map(id => `<div class="dlr"><div><b>${esc(nm(id))}</b></div><button class="fvb go" type="button" data-a="ch" data-id="${esc(id)}" ${open.has(id) || blocked ? "disabled" : ""}>Challenge</button></div>`).join("") || '<div class="pfn">No other players yet.</div>' : '<div class="pfn">Loading…</div>'}`;
}
function view() {
  if (!M) return menu();
  const m = model(); if (!m) return `<div class="pfn" style="text-align:center">Loading…</div>`;
  const head = scoreBar();
  if (m.ph === "end") {
    if (V.status === "cancelled" || V.status === "declined") return `<div class="dlbox"><b>The game was cancelled</b><p>Nobody is playing any more.</p></div><button class="fvb gsb go" type="button" data-a="back">‹ Back</button>`;
    const win = V.winner === "me", lose = V.winner === "opp";
    return head + `<div class="dlbox ${win ? "dwin" : lose ? "dlose" : ""}"><b>${V.draw ? "Draw" : win ? "You won! +5 coins" : "You lost"}</b><p>Final score <span dir="ltr">${V.me} – ${V.opp}</span>${V.w ? ` · last pair: ${esc(V.w)} beat ${esc(V.l)}` : ""}</p></div><button class="fvb gsb go" type="button" data-a="back">‹ Back</button>`;
  }
  if (m.ph === "cd") return head + `<div class="btcd"><div><span id="btcdn">3</span><small>Get ready</small></div></div>`;
  if (m.ph === "live") { const sr = Number(V.tot) > 1; return head + `<div class="btq">Round ${Math.min(V.round, 9)}${sr ? `<span class="btsr">Fight ${V.n} of ${V.tot} between them</span><small>Who won that fight?</small>` : `<small>Who has a win over the other?</small>`}</div><div class="btvs" id="btvs">${card(V.x, "", 1)}${card(V.y, "", 1)}</div><div class="btbar"><u id="btbar"></u></div><div class="btmsg" id="btmsg" role="status"></div>`; }
  const t = V.rwin === "me" ? "You got it first! 🎉" : V.rwin === "opp" ? "They got it first" : "Nobody got it in time";
  const wn = V.w, ln = V.l;
  return head + `<div class="btq">${esc(wn || "")} beat ${esc(ln || "")}${Number(V.wtot) > 1 ? `<span class="btsr">Fight ${V.wn} of ${V.wtot}</span>` : ""}<small>${t}</small></div><div class="btvs">${card(wn, "w")}${card(ln, "l")}</div><div class="btmsg" id="btnx">Next round in …</div>`;
}
function render(force) {
  if (!OPEN) return; ensure();
  const m = model(), k = (M ? "g" + (m ? m.key : "x") : "menu" + G.map(g => g.id + g.status).join()) + "|" + MSG + "|" + (BUSY ? 1 : 0);
  if (!force && k === KEY) { tick(); return; } KEY = k;
  $("btb").innerHTML = view();
  const x = $("btx"); if (x) { const g = inGame(); x.textContent = g ? "Quit" : "‹ Back"; x.classList.toggle("lv", g); }
  tick();
}
function tick() {
  if (!OPEN || !M || !V) return;
  const m = model(); if (!m) return; const now = srv();
  if (m.ph === "cd") { const e = $("btcdn"); if (e) e.textContent = String(Math.max(1, Math.ceil((Number(V.rstart) - now) / 1000))); }
  else if (m.ph === "live") {
    const left = Math.max(0, Number(V.rstart) + ROUND_MS - now), bar = $("btbar"); if (bar) bar.style.width = (left / ROUND_MS * 100).toFixed(1) + "%";
    const vs = $("btvs"); if (vs) vs.classList.toggle("btlk", now < LK);
    const msg = $("btmsg"); if (msg && now >= LK && /Locked/.test(msg.textContent)) msg.textContent = "";
  } else if (m.ph === "done") { const e = $("btnx"); if (e) e.textContent = V.next ? "Next round in " + Math.max(0, Math.ceil((Number(V.next) - now) / 1000)) + "s" : ""; }
  const sc = $("btsc"); if (sc) sc.textContent = V.me + " – " + V.opp;
}
setInterval(() => { if (OPEN && M) tick(); }, 100);

/* ---------- actions ---------- */
async function onClick(e) {
  const t = e.target.closest("[data-a]"); if (!t || t.disabled) return;
  const a = t.dataset.a, id = t.dataset.id;
  try {
    if (a === "pick") return pick(t.dataset.n);
    if (BUSY) return;
    if (a === "ch") { if (window.invitePending && window.invitePending()) { MSG = window.PENDMSG; return render(true); } BUSY = true; MSG = ""; render(true);
      try { const gid = await rpc("bt_create", { p_to: id }); note(gid, "invited"); MSG = "Challenge sent to " + nm(id) + ". The game starts when they accept."; } catch (er) { MSG = ERR(er); }
      BUSY = false; await load(); render(true); return; }
    if (a === "acc") { BUSY = true; try { await rpc("bt_accept", { p_game: id }); note(id, "accepted"); await enter(id); } catch (er) { MSG = ERR(er); } BUSY = false; await load(); render(true); return; }
    if (a === "join") { await enter(id); render(true); return; }
    if (a === "no") { try { await rpc("bt_decline", { p_game: id }); } catch (er) {} await load(); render(true); return; }
    if (a === "back") { M = null; V = null; KEY = ""; await load(); render(true); return; }
  } catch (er) { MSG = ERR(er); render(true); }
}
async function pick(name) {
  const m = model(); if (!m || m.ph !== "live") return; const now = srv(); if (now < LK) return;
  const setMsg = t => { const e = $("btmsg"); if (e) e.textContent = t; };
  try {
    const t0 = Date.now(), d = await rpc("bt_pick_v", { p_game: M, p_name: name });
    const fresh = () => { if (d.view && d.view.now) { OFF = Number(d.view.now) - (t0 + Date.now()) / 2; V = d.view; LK = Math.max(LK, Number(V.lock) || 0); return true; } return false; };
    if (d.hit) { if (!fresh()) await pull(); render(true); return; }
    if (d.why === "wrong") { LK = srv() + 2000; setMsg("Wrong! Locked for 2 seconds."); const vs = $("btvs"); if (vs) vs.classList.add("btlk"); }
    else if (d.why === "locked") setMsg("Locked… wait a moment.");
    else if (!fresh()) await pull();
  } catch (er) { setMsg("Could not send that. Try again."); }
}
async function note(id, kind) {
  try {
    const s = (await SB.auth.getSession()).data.session; if (!s || !id) return;
    await fetch(SUPA_URL + "/functions/v1/party-push?beatnote=" + encodeURIComponent(id) + "&kind=" + kind + "&name=" + encodeURIComponent(String(NAMES[ME] || "").slice(0, 24)), { method: "POST", headers: { Authorization: "Bearer " + s.access_token, apikey: SUPA_KEY } });
  } catch (e) {}
}

/* ---------- invite pop-up (any page) ---------- */
function ui() {
  let el = $("btinv");
  if (!el) { el = document.createElement("div"); el.id = "btinv"; el.setAttribute("role", "alert"); el.hidden = true; document.body.appendChild(el); }
  const other = ["dlinv", "gqinv", "wwinv", "ptinv", "flinv"].some(i => { const o = $(i); return o && !o.hidden; });
  const inc = !OK || !ME || OPEN || other ? null : invitesIn().find(g => !DISM[g.id]);
  const acc = inc || !OK || !ME || OPEN || other ? null : playable().find(g => g.a === ME && !DISM[g.id] && Date.parse(g.touched || 0) > Date.now() - 2 * 60e3);
  if (!inc && !acc) { el.hidden = true; el.innerHTML = ""; el.dataset.k = ""; return; }
  const g = inc || acc, k = (inc ? "i" : "a") + g.id; el.hidden = false;
  if (el.dataset.k === k) return; el.dataset.k = k;
  el.innerHTML = inc
    ? `<div class="dli"><i class="dlig">🥊</i><div><b><span>${esc(nm(g.a))}</span> <span>challenged you 🥊</span></b><small>Who Beat Who · first to 5 · 5 coins</small></div><button type="button" class="dla" data-ba="${g.id}">Accept</button><button type="button" data-bn="${g.id}">Decline</button></div>`
    : `<div class="dli"><i class="dlig">✅</i><div><b><span>${esc(nm(g.b))}</span> <span>accepted your challenge 🥊</span></b><small>Who Beat Who · join now</small></div><button type="button" class="dla" data-bj="${g.id}">Join</button><button type="button" data-bl="${g.id}">Later</button></div>`;
  const q = s => el.querySelector(s);
  if (q("[data-ba]")) q("[data-ba]").onclick = async () => { const id = g.id; await window.beatOpen(); try { await rpc("bt_accept", { p_game: id }); note(id, "accepted"); await enter(id); } catch (er) { MSG = ERR(er); } await load(); render(true); };
  if (q("[data-bn]")) q("[data-bn]").onclick = async () => { try { await rpc("bt_decline", { p_game: g.id }); } catch (er) {} await load(); ui(); };
  if (q("[data-bj]")) q("[data-bj]").onclick = async () => { const id = g.id; await window.beatOpen(); await enter(id); render(true); };
  if (q("[data-bl]")) q("[data-bl]").onclick = () => { DISM[g.id] = 1; ui(); };
}
setInterval(() => { try { ui(); } catch (e) {} }, 900);
setInterval(async () => { try { if (ME && !document.hidden && !OPEN && (G.some(live) || !G.length)) await load(); } catch (e) {} }, 5000);
setTimeout(() => { try { if (typeof ME !== "undefined" && ME) { load(); if (location.hash === "#beat" && !OPEN) window.beatOpen(); } } catch (e) {} }, 4500);
})();
