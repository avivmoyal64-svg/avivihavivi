/* "Who's Who" race: a blurred fighter photo gets clearer; two players guess at the same time, the first correct guess wins the round.
   Best of 5 (first to 3 round wins). The server picks the fighters and decides who was first. Solo practice is local. Loaded after guess.js. */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const nm = id => (typeof NAMES !== "undefined" && NAMES[id]) || "Player";
const ROUND_MS = 30000, CLEAR_MS = 24000, MAXBLUR = 28;
let G = [], OK = false, M = null, V = null, OFF = 0, S = null, CH = null, MSG = "", BUSY = false, PK = null, KEY = "", WR = [], LK = 0, Q = "", RK = "";
const DISM = {};
window.pendWho = () => G.some(g => g.a === ME && g.status === "invited" && Date.parse(g.created_at) > Date.now() - 864e5);
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const fighters = () => { const a = []; for (const c in D) D[c].forEach(f => a.push(f.n)); return a; };
const srv = () => Date.now() + OFF;
const live = g => g.status === "invited" || (g.status === "active" && Date.parse(g.touched || 0) > Date.now() - 10 * 60e3);
const invitesIn = () => G.filter(g => g.b === ME && g.status === "invited" && Date.parse(g.created_at) > Date.now() - 864e5);
const playable = () => G.filter(g => g.status === "active" && Date.parse(g.touched || 0) > Date.now() - 10 * 60e3);

/* fighter hash -> name (the server only tells us a hash of the current fighter) */
async function buildPk() {
  if (PK) return PK;
  const m = {};
  try {
    const enc = new TextEncoder();
    for (const c in D) for (const f of D[c]) {
      const h = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(f.n)));
      m[Array.from(h.slice(0, 5)).map(b => b.toString(16).padStart(2, "0")).join("")] = f.n;
    }
  } catch (e) {}
  PK = m; return m;
}
const photoOf = n => { try { return (typeof photoZ === "function" ? photoZ(n) : "") || ""; } catch (e) { return ""; } };

async function note(id, kind) {
  try {
    const s = (await SB.auth.getSession()).data.session; if (!s || !id) return;
    await fetch(SUPA_URL + "/functions/v1/send-push?gt=who&guessnote=" + encodeURIComponent(id) + "&kind=" + kind + "&name=" + encodeURIComponent(String(NAMES[ME] || "").slice(0, 24)), { method: "POST", headers: { Authorization: "Bearer " + s.access_token, apikey: SUPA_KEY } });
  } catch (e) {}
}

/* ---------- data ---------- */
async function load() {
  if (!SB || !ME) return;
  try {
    const q = await SB.from("who_games").select("id,a,b,status,wa,wb,winner,draw,created_at,touched").or("a.eq." + ME + ",b.eq." + ME).order("created_at", { ascending: false }).limit(20);
    if (q.error) throw q.error;
    G = q.data || []; OK = true;
  } catch (e) { OK = false; G = []; }
  if (OK) {
    try {
      const w = await SB.rpc("who_wins");
      if (!w.error && Array.isArray(w.data)) { const _b = JSON.stringify(WHOC); Object.keys(WHOC).forEach(k => delete WHOC[k]); w.data.forEach(x => { if (x.winner) WHOC[x.winner] = 5 * Number(x.n || 0); });  if (JSON.stringify(WHOC) !== _b) { try { ren(); } catch (e) {} }}
    } catch (e) {}
  }
  const p = $("pgW"); if (p && !p.hidden && !M && !S && !$("wwq")) window.whoShow();
}
async function pull() {
  if (!M) return;
  const t0 = Date.now();
  try {
    const r = await SB.rpc("who_view", { p_game: M });
    if (r.error) throw r.error;
    V = r.data; OFF = Number(V.now) - (t0 + Date.now()) / 2;
    LK = Math.max(LK, Number(V.lock) || 0);
  } catch (e) { /* keep the last view; try again next poll */ }
}

/* ---------- a single round, from the server view or from solo ---------- */
function model() {
  if (S) {
    const t = Date.now() - S.t0, over = S.done || t >= ROUND_MS;
    return { solo: 1, phase: over ? "done" : "live", t, name: S.name, win: S.done === 1 ? "me" : null, key: "s" + S.id + (over ? "d" : "l") };
  }
  if (!V) return null;
  if (V.status === "done" || V.status === "cancelled" || V.status === "declined") return { phase: "end", key: "end" + V.status + V.me + V.opp, name: V.name };
  const now = srv();
  if (V.done) return { phase: "done", name: V.name, win: V.rwin, next: Number(V.next), key: "r" + V.round + "d" };
  if (now < Number(V.rstart)) return { phase: "cd", left: Number(V.rstart) - now, key: "r" + V.round + "c" };
  return { phase: "live", t: now - Number(V.rstart), pk: V.pk, key: "r" + V.round + "l" };
}
function curName(m) {
  if (m.solo) return m.name;
  if (m.phase === "live") return PK && m.pk ? PK[m.pk] : "";
  return m.name || "";
}
const blurFor = t => Math.max(0, MAXBLUR * (1 - t / CLEAR_MS));

/* ---------- views ---------- */
function searchBox() { return `<input class="gpq" id="wwq" type="search" placeholder="Type a name and tap the fighter" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(Q)}"><div class="dlfl" id="wwl"></div>`; }
function fillList() {
  const out = $("wwl"); if (!out) return;
  const k = norm(Q), bad = new Set(WR.map(x => x.toLowerCase()));
  if (!k) { out.innerHTML = ""; return; }
  const r = fighters().filter(n => norm(n).includes(k) && !bad.has(n.toLowerCase())).sort((a, b) => a.localeCompare(b)).slice(0, 8);
  out.innerHTML = r.map(n => `<button type="button" data-n="${esc(n)}">${avZ(n).replace("<i ", '<i class="ga" ')}<span>${esc(n)}</span></button>`).join("");
  out.querySelectorAll("button[data-n]").forEach(b => { b.onclick = () => guess(b.getAttribute("data-n")); });
}
const sumRow = g => {
  const me = g.a === ME, opp = me ? g.b : g.a, who = esc(nm(opp)), ms = me ? g.wa : g.wb, os = me ? g.wb : g.wa;
  if (g.status === "invited") {
    if (Date.parse(g.created_at) < Date.now() - 864e5) return "";
    return g.b === ME
      ? `<div class="dlr conf"><div><b>${who}</b><small>Challenged you · ⚡ Who's Who race</small></div><button class="fvb go" type="button" onclick="whoAccept('${g.id}')">Accept</button><button class="fvb" type="button" onclick="whoNo('${g.id}')">Decline</button></div>`
      : `<div class="dlr"><div><b>${who}</b><small>Waiting for them to accept · ⚡ Who's Who race</small></div><button class="fvb" type="button" onclick="whoNo('${g.id}')">Cancel</button></div>`;
  }
  if (g.status === "active") {
    if (Date.parse(g.touched || 0) < Date.now() - 10 * 60e3) return "";
    return `<div class="dlr conf"><div><b>${who}</b><small>Race in progress · <span dir="ltr">${ms} – ${os}</span></small></div><button class="fvb go" type="button" onclick="whoPlay('${g.id}')">Join</button></div>`;
  }
  if (g.status === "done") {
    const win = g.winner === ME, lose = !!g.winner && !win;
    return `<div class="dlr${win ? " dwin" : lose ? " dlose" : ""}"><div><b>${who}</b><small>⚡ Who's Who race</small></div><div class="dls"><b dir="ltr">${ms} – ${os}</b><small>${g.draw ? "Draw" : win ? "You won" : "You lost"}</small></div></div>`;
  }
  return "";
};
function menu() {
  const lst = G.filter(g => g.status !== "declined" && g.status !== "cancelled").slice(0, 8).map(sumRow).join("");
  return `<div class="dlbox"><b>Who's Who race</b><p>A blurred fighter photo gets clearer every second. Tap the right fighter before the other player does. Best of 5, first to 3 round wins. A wrong guess locks you out for 2 seconds. The winner gets 5 coins.</p></div>
${MSG ? `<div class="dlr conf"><div><small>${esc(MSG)}</small></div></div>` : ""}
<div class="dlmos">
${OK ? `<button class="dlmo" type="button" id="wwvs"><i>⚡</i><span><b>Race a player</b><small>Both guess at the same time. The first right answer wins the round</small></span><em>5 coins</em></button>` : ""}
<button class="dlmo" type="button" id="wwsolo"><i>🎯</i><span><b>Solo practice</b><small>One fighter at a time against the clock. No coins</small></span></button>
</div>
${lst ? `<div class="dlbox"><b>Your races</b></div>${lst}` : ""}`;
}
function pickPlayer() {
  const ps = Object.keys(NAMES || {}).filter(id => id !== ME && NAMES[id]).sort((a, b) => nm(a).localeCompare(nm(b)));
  const open = new Set(G.filter(g => live(g)).map(g => g.a === ME ? g.b : g.a));
  return `<div class="dlbox"><b>Race a player</b><p>Choose who to challenge. They get a notification and the race starts when they accept.</p></div>${ps.map(id => `<div class="dlr"><div><b>${esc(nm(id))}</b></div><button class="fvb go" type="button" data-p="${esc(id)}" ${open.has(id) || BUSY || (window.invitePending && window.invitePending()) ? "disabled" : ""}>Challenge</button></div>`).join("") || '<div class="pfn">No other players yet.</div>'}<button class="fvb gsb" type="button" id="wwback">‹ Back</button>`;
}
function head(m) {
  if (S) return `<div class="dlbox"><b>Solo practice</b><p>Who is this fighter?</p></div>`;
  const op = G.find(x => x.id === M), who = op ? nm(op.a === ME ? op.b : op.a) : "Opponent";
  return `<div class="wws"><span>${esc(nm(ME))}</span><b id="wwsc" dir="ltr">${V ? V.me : 0} – ${V ? V.opp : 0}</b><span>${esc(who)}</span></div>
<div class="dlbox"><b>Round ${V ? Math.min(V.round, 5) : 1} of 5</b><p>First to 3 round wins</p></div>`;
}
function view() {
  if (CH && CH.step === "who") return pickPlayer();
  const m = model();
  if (!m) return menu();
  let body = "";
  if (m.phase === "cd") body = `<div class="wwcd"><div><span id="wwcdn">3</span><small>Get ready</small></div></div>`;
  else if (m.phase === "live") {
    const n = curName(m), ph = n ? photoOf(n) : "";
    body = `<div class="wwph" id="wwph"><i id="wwi" style="${ph ? `background-image:url(${ph});` : ""}filter:blur(${MAXBLUR}px)"></i><div class="wwt" id="wwt">30</div></div><div class="wwb"><u id="wwbar"></u></div>
<div class="wwmsg" id="wwmsg" role="status"></div><div id="wwsearch" class="dlr conf dlpn">${searchBox()}</div>`;
  } else if (m.phase === "done") {
    const n = curName(m), ph = n ? photoOf(n) : "";
    const t = m.win === "me" ? "You got it first! 🎉" : m.win === "opp" ? "They got it first" : "Nobody got it";
    body = `<div class="wwph"><i style="${ph ? `background-image:url(${ph});` : ""}"></i></div><div class="dlbox ${m.win === "me" ? "dwin" : m.win === "opp" ? "dlose" : ""}"><b>It was ${esc(n || "?")}</b><p>${t}</p>${m.solo ? "" : `<p id="wwnx">Next round in …</p>`}</div>${m.solo ? `<button class="fvb gsb go" type="button" id="wwagain">Next fighter</button><button class="fvb gsb" type="button" id="wwmenu">‹ Back</button>` : ""}`;
  } else if (m.phase === "end") {
    const win = V.winner === "me", lose = V.winner === "opp";
    if (V.status === "cancelled" || V.status === "declined") body = `<div class="dlbox"><b>The race was cancelled</b><p>Nobody is playing any more.</p></div><button class="fvb gsb" type="button" id="wwmenu">‹ Back</button>`;
    else body = `<div class="dlbox ${win ? "dwin" : lose ? "dlose" : ""}"><b>${V.draw ? "Draw" : win ? "You won the race! +5 coins" : "You lost the race"}</b><p>Final score <span dir="ltr">${V.me} – ${V.opp}</span>${m.name ? " · last fighter: " + esc(m.name) : ""}</p></div><button class="fvb gsb go" type="button" id="wwmenu">‹ Back</button>`;
  }
  return head(m) + body;
}
window.whoShow = function () {
  const el = $("pgws"); if (!el) return;
  if (!OK && ME && Date.now() - (window.whoShow.lt || 0) > 4000) { window.whoShow.lt = Date.now(); load(); }
  const had = document.activeElement && document.activeElement.id === "wwq", pos = had ? document.activeElement.selectionStart : 0;
  const m = model(); KEY = (CH ? "c" + CH.step : "") + (m ? m.key : "menu");
  el.innerHTML = view();
  const inp = $("wwq");
  if (inp) { inp.oninput = () => { Q = inp.value; fillList(); }; fillList(); if (had) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (e) {} } }
  const b = (id, f) => { const e = $(id); if (e) e.onclick = f; };
  b("wwvs", () => { if (window.invitePending && window.invitePending()) { MSG = window.PENDMSG; return window.whoShow(); } CH = { step: "who" }; MSG = ""; window.whoShow(); });
  b("wwsolo", () => startSolo());
  b("wwagain", () => startSolo());
  b("wwback", () => { CH = null; window.whoShow(); });
  b("wwmenu", () => leave());
  el.querySelectorAll("button[data-p]").forEach(x => { x.onclick = () => challenge(x.getAttribute("data-p")); });
  tick();
};
function leave() { S = null; M = null; V = null; CH = null; MSG = ""; Q = ""; WR = []; LK = 0; load().then(() => window.whoShow()); window.whoShow(); }

/* ---------- actions ---------- */
function startSolo() {
  const all = fighters().filter(n => photoOf(n)); if (!all.length) return;
  S = { id: Date.now(), name: all[Math.floor(Math.random() * all.length)], t0: Date.now(), done: 0 };
  M = null; V = null; CH = null; Q = ""; WR = []; LK = 0; MSG = ""; window.whoShow();
}
const ERR = e => { const t = String((e && e.message) || e); return /pending invite/i.test(t) ? window.PENDMSG : /wait a few/i.test(t) ? "Wait a few seconds before sending another challenge, or cancel the one you sent." : /already open/i.test(t) ? "You already have an open race with this player." : /too many/i.test(t) ? "You sent too many challenges today. Try again tomorrow." : /not enough/i.test(t) ? "The race is not ready yet. Try again later." : "Could not do that. Try again."; };
async function challenge(id) {
  if (BUSY) return; if (window.invitePending && window.invitePending()) { MSG = window.PENDMSG; CH = null; return window.whoShow(); }
  BUSY = true;
  try {
    const r = await SB.rpc("who_create", { p_to: id });
    if (r.error) throw r.error;
    note(r.data, "invited");
    MSG = "Challenge sent to " + nm(id) + ". The race starts when they accept."; CH = null;
  } catch (e) { MSG = ERR(e); CH = null; }
  BUSY = false; await load(); window.whoShow();
}
window.whoChallenge = async id => {
  try { CH = null; S = null; M = null; V = null; MSG = ""; openPage("who"); } catch (e) {}
  await load(); await challenge(id);
};
window.whoAccept = async id => {
  if (BUSY) return; BUSY = true;
  try { openPage("who"); } catch (e) {}
  try {
    const r = await SB.rpc("who_accept", { p_game: id });
    if (r.error) throw r.error;
    note(id, "accepted");
    await buildPk(); S = null; CH = null; M = id; V = null; WR = []; Q = ""; LK = 0; MSG = ""; await pull();
  } catch (e) { MSG = ERR(e); }
  BUSY = false; await load(); window.whoShow();
};
window.whoPlay = async id => {
  try { openPage("who"); } catch (e) {}
  await buildPk(); S = null; CH = null; M = id; V = null; WR = []; Q = ""; LK = 0; MSG = ""; await pull(); window.whoShow();
};
window.whoNo = async id => { try { await SB.rpc("who_decline", { p_game: id }); } catch (e) {} await load(); window.whoShow(); };
window.whoInGame = () => { const m = model(); return !!(m && m.phase !== "end" && (S ? m.phase === "live" : V && V.status === "active")); };
window.whoQuit = async () => {
  if (M && V && V.status === "active") { try { await SB.rpc("who_forfeit", { p_game: M }); } catch (e) {} }
  leave();
};
window.whoLater = id => { DISM[id] = 1; ui(); };
async function guess(name) {
  const m = model(); if (!m || m.phase !== "live") return;
  const now = S ? Date.now() : srv();
  if (now < LK) return;
  Q = ""; const inp = $("wwq"); if (inp) inp.value = ""; fillList();
  if (S) {
    if (name.toLowerCase() === S.name.toLowerCase()) { S.done = 1; window.whoShow(); }
    else { WR.push(name); LK = Date.now() + 2000; setMsg("Not " + name + ". Locked for 2 seconds."); }
    return;
  }
  try {
    const t0 = Date.now(), r = await SB.rpc("who_guess_v", { p_game: M, p_name: name });
    if (r.error) throw r.error;
    const d = r.data || {};
    const fresh = () => { if (d.view && d.view.now) { V = d.view; OFF = Number(V.now) - (t0 + Date.now()) / 2; LK = Math.max(LK, Number(V.lock) || 0); return true; } return false; };
    if (d.hit) { MSG = ""; if (!fresh()) await pull(); window.whoShow(); return; }
    if (d.why === "wrong") { WR.push(name); LK = srv() + 2000; setMsg("Not " + name + ". Locked for 2 seconds."); }
    else if (d.why === "locked") setMsg("Wait a moment…");
    else if (!fresh()) await pull();
  } catch (e) { setMsg("Could not send that guess. Try again."); }
}
function setMsg(t) { const e = $("wwmsg"); if (e) e.textContent = t; }

/* ---------- live updates ---------- */
function tick() {
  const m = model(); if (!m) return;
  const now = S ? Date.now() : srv();
  if (m.phase === "cd") { const e = $("wwcdn"); if (e) e.textContent = String(Math.max(1, Math.ceil(m.left / 1000))); }
  else if (m.phase === "live") {
    const i = $("wwi"), t = $("wwt"), bar = $("wwbar"), left = Math.max(0, ROUND_MS - m.t);
    if (i && !i.style.backgroundImage) { const n = curName(m), ph = n ? photoOf(n) : ""; if (ph) i.style.backgroundImage = "url(" + ph + ")"; }
    if (i) i.style.filter = "blur(" + blurFor(m.t).toFixed(1) + "px)";
    if (t) t.textContent = String(Math.ceil(left / 1000));
    if (bar) bar.style.width = (left / ROUND_MS * 100).toFixed(1) + "%";
    const s = $("wwsearch"); if (s) s.classList.toggle("wwlk", now < LK);
    const msg = $("wwmsg"); if (msg && now >= LK && /Locked|Wait/.test(msg.textContent)) msg.textContent = "";
  } else if (m.phase === "done" && !m.solo) {
    const e = $("wwnx"); if (e) e.textContent = "Next round in " + Math.max(0, Math.ceil((m.next - now) / 1000)) + "s";
  }
  const sc = $("wwsc"); if (sc && V) sc.textContent = V.me + " – " + V.opp;
  const nk = (CH ? "c" + CH.step : "") + m.key;
  if (nk !== KEY && $("pgws") && !$("pgW").hidden) window.whoShow();
}
let PT = 0;
setInterval(() => { try { const p = $("pgW"); if (p && !p.hidden && (S || M)) tick(); } catch (e) {} }, 120);
async function poll() {
  try {
    const p = $("pgW");
    if (!M || !p || p.hidden || document.hidden || BUSY) return;
    await pull(); tick();
    if (V && V.status !== "active" && V.status !== "invited") { /* finished: one last redraw, then stop polling */ window.whoShow(); }
  } catch (e) {}
}
setInterval(poll, 700);

/* ---------- entry card, invite pop-up ---------- */
window.whoCard = () => {
  const n = OK && ME ? invitesIn().length : 0, t = OK && ME ? playable().length : 0;
  if (!n && !t) return "";
  return `<button class="dlmo" type="button" onclick="openPage('who')"><i>⚡</i><span><b>Who's Who race</b><small>${n ? (n === 1 ? "1 player challenged you!" : n + " players challenged you!") : t ? "A race is waiting for you" : "Race another player: name the blurred fighter first"}</small></span><em>5 coins</em></button>`;
};
function ui() {
  let el = $("wwinv");
  if (!el) { el = document.createElement("div"); el.id = "wwinv"; el.setAttribute("role", "alert"); document.body.appendChild(el); }
  let onPage = false; try { const p = $("pgW"); onPage = !!(p && !p.hidden); } catch (e) {}
  const other = ($("dlinv") && !$("dlinv").hidden) || ($("gqinv") && !$("gqinv").hidden);
  const inc = !OK || !ME || onPage || other ? null : invitesIn().find(g => !DISM[g.id]);
  const acc = inc || !OK || !ME || onPage || other ? null : playable().find(g => g.a === ME && !DISM[g.id] && Date.parse(g.touched || 0) > Date.now() - 2 * 60e3);
  if (!inc && !acc) { el.hidden = true; el.innerHTML = ""; el.dataset.k = ""; return; }
  const g = inc || acc, k = (inc ? "i" : "a") + g.id; el.hidden = false;
  if (el.dataset.k === k) return; el.dataset.k = k;
  el.innerHTML = inc
    ? `<div class="dli"><i class="dlig">⚡</i><div><b><span>${esc(nm(g.a))}</span> <span>challenged you ⚡</span></b><small>Who's Who race · first to 3</small></div><button type="button" class="dla" onclick="whoAccept('${g.id}')">Accept</button><button type="button" onclick="whoNo('${g.id}')">Decline</button></div>`
    : `<div class="dli"><i class="dlig">✅</i><div><b><span>${esc(nm(g.b))}</span> <span>accepted your challenge ⚡</span></b><small>Who's Who race · join now</small></div><button type="button" class="dla" onclick="whoPlay('${g.id}')">Join</button><button type="button" onclick="whoLater('${g.id}')">Later</button></div>`;
}
setInterval(() => { try { ui(); } catch (e) {} }, 900);
async function refresh() {
  try {
    if (!ME || document.hidden || BUSY) return;
    const p = $("pgW"), open = p && !p.hidden, duelOpen = $("pgD") && !$("pgD").hidden;
    if (!OK && !open && !duelOpen && !G.length) { if (!refresh.n || ++refresh.n > 10) { refresh.n = 1; await load(); } return; }
    if (open || duelOpen || G.some(live)) await load();
  } catch (e) {}
}
setInterval(refresh, 5000);
setTimeout(() => { if (typeof ME !== "undefined" && ME) load(); }, 4500);
buildPk();
})();
