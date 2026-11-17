/* "Guess the fighter": 10 clues, one more opens with each step, a search box is always there.
   Solo (random or picked fighter) and 1v1 (each player picks the mystery fighter for the other). Loaded after duel.js. */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const nm = id => (typeof NAMES !== "undefined" && NAMES[id]) || "Player";
const KEY = "ufcguess";
let S = null, M = null, MV = null, CH = null, Q = "", MSG = "", OK = false, G = [], BUSY = false, WR = [];
const DISM = {};
let ST = { best: 0, played: 0, won: 0 };
try { ST = Object.assign(ST, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} };
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const fighters = () => { const a = []; for (const c in D) D[c].forEach(f => a.push([f.n, c])); return a; };
const names = () => (window.guessNames ? window.guessNames() : []);
const live = g => g.status === "invited" || g.status === "active";
const mineRes = g => g.a === ME ? g.res_a : g.res_b;
const invitesIn = () => G.filter(g => g.b === ME && g.status === "invited");
const myTurn = () => G.filter(g => g.status === "active" && !mineRes(g));

/* ---------- data ---------- */
async function load() {
  try {
    const q = await SB.from("guess_games").select("id,a,b,status,res_a,res_b,pts_a,pts_b,winner,draw,created_at").or("a.eq." + ME + ",b.eq." + ME).order("created_at", { ascending: false }).limit(30);
    if (q.error) throw q.error;
    G = q.data || []; OK = true;
  } catch (e) { OK = false; G = []; }
  const p = $("pgQ"); if (p && !p.hidden && !$("gsq") && !BUSY) window.guessShow();
}
async function loadView() {
  if (!M) return;
  try { const r = await SB.rpc("guess_view", { p_game: M }); if (r.error) throw r.error; MV = r.data; } catch (e) { MV = null; MSG = "Could not open this game. Try again."; M = null; }
}

/* ---------- unified play view (solo or 1v1) ---------- */
function pv() {
  if (S) return { clues: S.g.facts.slice(0, S.done ? 10 : S.open), opened: S.open, res: S.done === 1 ? "solved" : S.done === 2 ? "failed" : null, answer: S.done ? S.g.name : null, pts: S.pts };
  if (M && MV && (MV.status === "active" || MV.status === "done")) return { clues: MV.clues || [], opened: MV.opened, res: MV.res || null, answer: MV.answer || null, pts: MV.pts || 0, opp: MV.opp_res, oppPts: MV.opp_pts, st: MV.status };
  return null;
}
function soloStart(name) {
  const all = names(); if (!all.length) return;
  for (let i = 0; i < 20; i++) {
    const n = name || all[Math.floor(Math.random() * all.length)], g = window.guessFacts(n);
    if (g) { S = { g, open: 1, wrong: [], done: 0, pts: 0 }; CH = null; Q = ""; MSG = ""; WR = []; window.guessShow(); return; }
    if (name) break;
  }
  MSG = "Could not build clues for that fighter. Try another one."; window.guessShow();
}
function soloFinish(won) {
  S.done = won ? 1 : 2; S.pts = won ? 11 - S.open : 0;
  ST.played++; if (won) { ST.won++; ST.best = Math.max(ST.best, S.pts); } save();
}
async function act(kind, name) {
  if (BUSY) return; MSG = "";
  if (S) {
    if (S.done) return;
    if (kind === "next") { if (S.open < 10) S.open++; }
    else if (kind === "giveup") soloFinish(false);
    else if (kind === "try") {
      Q = "";
      if (String(name).toLowerCase() === S.g.name.toLowerCase()) soloFinish(true);
      else { S.wrong.push(name); if (S.open >= 10) soloFinish(false); else { S.open++; MSG = "Not " + name + ". A new clue opened."; } }
    }
    window.guessShow(); return;
  }
  if (!M) return;
  BUSY = true; if (kind === "try") Q = "";
  try {
    const r = await SB.rpc("guess_step", { p_game: M, p_do: kind, p_name: name || null });
    if (r.error) throw r.error;
    if (kind === "try") { if (!r.data.hit && !r.data.res) { WR.push(name); MSG = "Not " + name + ". A new clue opened."; } else if (!r.data.hit) WR.push(name); }
    await loadView(); await load();
    if (MV && MV.status === "done") gnote(M, "done");
  } catch (e) { MSG = "Could not save that. Try again."; }
  BUSY = false; window.guessShow();
}

/* ---------- search (same look as the rest of the site) ---------- */
function searchBox(ph) { return `<input class="gpq" id="gsq" type="search" placeholder="${ph}" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(Q)}"><div class="dlfl" id="gsl"></div>`; }
function fillList() {
  const out = $("gsl"); if (!out) return;
  const k = norm(Q), play = !!pv(), bad = new Set((S ? S.wrong : WR).map(x => x.toLowerCase()));
  if (play && !k) { out.innerHTML = ""; return; }
  const r = fighters().filter(x => (!k || norm(x[0]).includes(k)) && !bad.has(x[0].toLowerCase())).sort((a, b) => a[0].localeCompare(b[0])).slice(0, play ? 8 : 12);
  out.innerHTML = r.map(x => `<button type="button" data-n="${esc(x[0])}">${avZ(x[0]).replace("<i ", '<i class="ga" ')}<span>${esc(x[0])}</span>${play ? "" : `<small>${esc(x[1])}</small>`}</button>`).join("") || '<div class="pfn">No match.</div>';
  out.querySelectorAll("button[data-n]").forEach(b => { b.onclick = () => picked(b.getAttribute("data-n")); });
}
function picked(n) {
  if (pv() && !(pv().res)) { act("try", n); return; }
  if (CH && CH.step === "pick") {
    if (CH.mode === "create") return sendChallenge(n);
    if (CH.mode === "accept") return acceptWith(n);
  }
}

/* ---------- 1v1 actions ---------- */
async function gnote(id, kind) {
  try {
    const s = (await SB.auth.getSession()).data.session; if (!s || !id) return;
    await fetch(SUPA_URL + "/functions/v1/send-push?guessnote=" + encodeURIComponent(id) + "&kind=" + kind + "&name=" + encodeURIComponent(String(NAMES[ME] || "").slice(0, 24)), { method: "POST", headers: { Authorization: "Bearer " + s.access_token, apikey: SUPA_KEY } });
  } catch (e) {}
}
const ERR = e => { const t = String((e && e.message) || e); return /wait a few/i.test(t) ? "Wait a few seconds before sending another invite, or cancel the one you sent." : /already open/i.test(t) ? "You already have an open game with this player." : /too many/i.test(t) ? "You sent too many challenges today. Try again tomorrow." : "Something went wrong. Try again."; };
async function sendChallenge(n) {
  if (BUSY) return; const g = window.guessFacts(n); if (!g) { MSG = "Could not build clues for that fighter. Try another one."; return window.guessShow(); }
  BUSY = true;
  try {
    const r = await SB.rpc("guess_create", { p_to: CH.to, p_name: g.name, p_clues: g.facts });
    if (r.error) throw r.error;
    gnote(r.data, "invited");
    MSG = "Challenge sent to " + nm(CH.to) + ". They get the clues for " + g.name + " once they accept."; CH = null; Q = "";
  } catch (e) { MSG = ERR(e); CH = null; }
  BUSY = false; await load(); window.guessShow();
}
async function acceptWith(n) {
  if (BUSY) return; const g = window.guessFacts(n); if (!g) { MSG = "Could not build clues for that fighter. Try another one."; return window.guessShow(); }
  BUSY = true; const gid = CH.gid;
  try {
    const r = await SB.rpc("guess_accept", { p_game: gid, p_name: g.name, p_clues: g.facts });
    if (r.error) throw r.error;
    gnote(gid, "accepted");
    CH = null; Q = ""; WR = []; M = gid; S = null; await loadView();
  } catch (e) { MSG = ERR(e); CH = null; }
  BUSY = false; await load(); window.guessShow();
}
window.guessAccept = id => { const g = G.find(x => x.id === id); if (!g) return; try { openPage("guess"); } catch (e) {} S = null; M = null; MV = null; Q = ""; MSG = ""; CH = { step: "pick", mode: "accept", gid: id, opp: g.a }; window.guessShow(); };
window.guessNo = async id => { try { await SB.rpc("guess_decline", { p_game: id }); } catch (e) {} await load(); window.guessShow(); };
window.guessPlay = async id => { try { openPage("guess"); } catch (e) {} S = null; CH = null; M = id; WR = []; Q = ""; MSG = ""; await loadView(); window.guessShow(); };
window.guessInGame = () => !!((S && !S.done) || (M && MV && MV.status === "active" && !MV.res));
window.guessQuit = async () => {
  if (S) { S = null; CH = null; MSG = ""; Q = ""; window.guessShow(); return; }
  if (M && MV && !MV.res) { try { await SB.rpc("guess_step", { p_game: M, p_do: "giveup", p_name: null }); } catch (e) {} }
  S = null; M = null; MV = null; CH = null; MSG = ""; Q = ""; WR = []; await load(); window.guessShow();
};
window.guessLater = id => { DISM[id] = 1; ui(); };
window.guessGo = id => { try { $("pf").close(); } catch (e) {} S = null; M = null; MV = null; Q = ""; MSG = ""; CH = { step: "pick", mode: "create", to: id }; openPage("guess"); window.guessShow(); };
window.guessBtn = id => (!OK || !ME || id === ME) ? "" : `<div class="fvt"><div><small>Guess the fighter</small><b>Pick a fighter for them to guess</b></div><button class="fvb" type="button" onclick="guessGo('${esc(id)}')">🕵️ 1v1</button></div>`;

/* ---------- views ---------- */
const sumRow = g => {
  const me = g.a === ME, opp = me ? g.b : g.a, mp = me ? g.pts_a : g.pts_b, op = me ? g.pts_b : g.pts_a, mr = mineRes(g);
  const who = esc(nm(opp)); let sub = "", btn = "", no = "", cls = "";
  if (g.status === "invited") {
    if (g.b === ME) { sub = "Challenged you"; btn = `<button class="fvb go" type="button" onclick="guessAccept('${g.id}')">Accept</button>`; no = `<button class="fvb" type="button" onclick="guessNo('${g.id}')">Decline</button>`; cls = " inv"; }
    else { sub = "Waiting for them to accept"; no = `<button class="fvb" type="button" onclick="guessNo('${g.id}')">Cancel</button>`; }
  } else if (g.status === "active") {
    if (mr) sub = "Waiting for them to finish"; else { sub = "Your turn to guess"; btn = `<button class="fvb go" type="button" onclick="guessPlay('${g.id}')">Play</button>`; }
  } else if (g.status === "done") {
    const win = g.winner === ME, lose = !!g.winner && !win; cls = win ? " dwin" : lose ? " dlose" : "";
    return `<div class="dlr${cls}"><div><b>${who}</b><small>🕵️ Guess the fighter</small></div><div class="dls"><b dir="ltr">${mp} – ${op}</b><small>${g.draw ? "Draw" : win ? "You won" : "You lost"}</small></div></div>`;
  } else return "";
  return `<div class="dlr${cls}"><div><b>${who}</b><small>${sub}</small><small>🕵️ Guess the fighter</small></div>${btn}${no}</div>`;
}
function menu() {
  const lst = G.filter(g => g.status !== "declined" && g.status !== "cancelled").slice(0, 8);
  return `<div class="dlbox"><b>Guess the fighter</b><p>10 clues about a mystery fighter. Each wrong guess opens the next clue. Fewer clues = more points.</p></div>
${MSG ? `<div class="dlr conf"><div><small>${esc(MSG)}</small></div></div>` : ""}
<div class="dlmos">
<button class="dlmo" type="button" id="gsrand"><i>🎲</i><span><b>Random fighter</b><small>The game picks the mystery fighter</small></span></button>
${OK ? `<button class="dlmo" type="button" id="gsvs"><i>⚔️</i><span><b>1v1 challenge</b><small>You pick the fighter they guess, they pick yours</small></span></button>` : ""}
</div>
${lst.length ? `<div class="dlbox"><b>Your 1v1 games</b></div>${lst.map(sumRow).join("")}` : ""}
<div class="gst"><span><b>${ST.best}</b><small>Best score</small></span><span><b>${ST.won}</b><small>Solved</small></span><span><b>${ST.played}</b><small>Played</small></span></div>`;
}
function view() {
  if (CH && CH.step === "who") {
    const ps = Object.keys(NAMES || {}).filter(id => id !== ME);
    return `<div class="dlbox"><b>1v1 challenge</b><p>Choose a player. You pick the fighter they have to guess.</p></div>${ps.map(id => `<div class="dlr"><div><b>${esc(nm(id))}</b></div><button class="fvb go" type="button" data-p="${esc(id)}">Challenge</button></div>`).join("") || '<div class="pfn">No other players yet.</div>'}<button class="fvb gsb" type="button" id="gsmenu">‹ Back</button>`;
  }
  if (CH && CH.step === "pick") {
    const t = CH.mode === "create" ? `Pick the fighter ${esc(nm(CH.to))} has to guess` : CH.mode === "accept" ? `Pick the fighter ${esc(nm(CH.opp))} has to guess` : "Pick a fighter";
    const sub = CH.mode === "accept" ? "Accepting starts the game. You both guess at the same time." : CH.mode === "create" ? "They get 10 clues about this fighter." : "";
    return `<div class="dlbox"><b>${t}</b><p>${sub}</p></div><div class="dlr conf dlpn">${searchBox("Search a fighter")}</div><button class="fvb gsb" type="button" id="gsmenu">‹ Back</button>`;
  }
  const v = pv();
  if (!v) return menu();
  const left = 10 - v.clues.length, rows = v.clues.map((c, i) => `<div class="dlr gsr"><em>${i + 1}</em><div><b>${esc(c)}</b></div></div>`).join("") + (left > 0 ? `<div class="dlr gsr lk"><em>🔒</em><div><b>${left} more clue${left > 1 ? "s" : ""} locked</b></div></div>` : "");
  let end = "";
  const vs = M ? " · " + esc("1v1") : "";
  if (v.res) {
    const w = v.res === "solved";
    let fin = "";
    if (M) {
      const g = G.find(x => x.id === M), op = g ? nm(g.a === ME ? g.b : g.a) : "Player";
      if (v.st === "done") { const me = v.pts, th = v.oppPts, win = me > th, dr = me === th; fin = `<div class="dlr ${dr ? "" : win ? "dwin" : "dlose"}"><div><b>${esc(op)}</b><small>${v.opp === "solved" ? "Solved it" : "Did not solve it"}</small></div><div class="dls"><b dir="ltr">${me} – ${th}</b><small>${dr ? "Draw" : win ? "You won" : "You lost"}</small></div></div>`; }
      else fin = `<div class="dlr"><div><b>${esc(op)}</b><small>Still guessing…</small></div></div>`;
    }
    end = `<div class="dlbox"><b>${w ? "Correct! +" + v.pts + " points" : "It was " + esc(v.answer || "")}</b>${w ? `<p>${esc(v.answer || "")} · solved with ${v.opened} clue${v.opened > 1 ? "s" : ""}</p>` : ""}</div>${fin}${S ? `<button class="fvb go gsb" type="button" id="gsagain">Play again</button>` : ""}<button class="fvb gsb" type="button" id="gsmenu">Menu</button>`;
  } else {
    end = `${MSG ? `<div class="dlr conf"><div><small>${esc(MSG)}</small></div></div>` : ""}<div class="dlr conf dlpn">${searchBox("Search a fighter and tap to guess")}</div><div class="gsa"><button class="fvb" type="button" id="gsnext"${v.opened >= 10 ? " disabled" : ""}>${v.opened < 10 ? "Open next clue" : "Last clue opened"}</button><button class="fvb" type="button" id="gsgive">Give up</button></div>`;
  }
  return `<div class="dlbox"><b>Who is this fighter?</b><p>Clue ${Math.min(v.opened, 10)} of 10 · worth ${v.res ? v.pts : 11 - v.opened} points${vs}</p></div>${rows}${end}`;
}
window.guessShow = function () {
  const el = $("pgqs"); if (!el) return;
  const had = document.activeElement && document.activeElement.id === "gsq", pos = had ? document.activeElement.selectionStart : 0;
  if (!S && M && !MV && !(CH)) { loadView().then(() => window.guessShow()); return; }
  el.innerHTML = view();
  const inp = $("gsq");
  if (inp) { inp.oninput = () => { Q = inp.value; fillList(); }; fillList(); if (had) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (e) {} } }
  const b = (id, f) => { const e = $(id); if (e) e.onclick = f; };
  b("gsrand", () => { M = null; MV = null; soloStart(); });
  b("gsvs", () => { CH = { step: "who" }; MSG = ""; window.guessShow(); });
  b("gsagain", () => soloStart());
  b("gsmenu", () => { S = null; M = null; MV = null; CH = null; MSG = ""; Q = ""; WR = []; window.guessShow(); });
  b("gsnext", () => act("next")); b("gsgive", () => act("giveup"));
  el.querySelectorAll("button[data-p]").forEach(x => { x.onclick = () => { CH = { step: "pick", mode: "create", to: x.getAttribute("data-p") }; Q = ""; window.guessShow(); }; });
};

/* ---------- home card, invite pop-up, refresh ---------- */
window.guessCard = () => {
  const n = OK && ME ? invitesIn().length : 0, t = OK && ME ? myTurn().length : 0;
  return `<button class="hcard${n || t ? " cshot" : ""}" onclick="openPage('guess')"><i>🕵️</i><span><b>Guess the fighter</b><small>${n ? (n === 1 ? "1 player challenged you!" : n + " players challenged you!") : t ? "Your guessing game is ready!" : ST.played ? "Best score " + ST.best + " · " + ST.won + " solved" : "10 clues · who is the mystery fighter?"}</small></span><em>›</em></button>`;
};
function ui() {
  let el = $("gqinv");
  if (!el) { el = document.createElement("div"); el.id = "gqinv"; el.setAttribute("role", "alert"); document.body.appendChild(el); }
  let onPage = false; try { const p = $("pgQ"); onPage = !!(p && !p.hidden); } catch (e) {}
  const other = $("dlinv") && !$("dlinv").hidden;
  const inc = !OK || !ME || onPage || other ? null : invitesIn()[0];
  const acc = inc || !OK || !ME || onPage || other ? null : myTurn().find(g => !DISM[g.id] && g.a === ME);
  if (!inc && !acc) { el.hidden = true; el.innerHTML = ""; el.dataset.k = ""; return; }
  const g = inc || acc, k = (inc ? "i" : "a") + g.id; el.hidden = false;
  if (el.dataset.k === k) return; el.dataset.k = k;
  el.innerHTML = inc
    ? `<div class="dli"><div><b><span>${esc(nm(g.a))}</span> <span>challenged you 🕵️</span></b><small>Guess the fighter · 1v1</small></div><button type="button" class="dla" onclick="guessAccept('${g.id}')">Accept</button><button type="button" class="dld" onclick="guessNo('${g.id}')">Decline</button></div>`
    : `<div class="dli"><div><b><span>${esc(nm(g.b))}</span> <span>accepted your challenge</span></b><small>Guess the fighter · play now</small></div><button type="button" class="dla" onclick="guessPlay('${g.id}')">Play</button><button type="button" class="dld" onclick="guessLater('${g.id}')">Later</button></div>`;
}
setInterval(() => { try { ui(); } catch (e) {} }, 900);
async function tick() {
  try {
    if (!ME || document.hidden || BUSY) return;
    const p = $("pgQ"), open = p && !p.hidden;
    if (!OK && !open && !G.length) { if (!tick.n || ++tick.n > 10) { tick.n = 1; await load(); } return; }
    if (open || G.some(live)) {
      await load();
      if (open && M && MV && MV.status !== "done" && MV.res) { await loadView(); if (MV && MV.status === "done") window.guessShow(); }
    }
  } catch (e) {}
}
setInterval(tick, 6000);
setTimeout(() => { if (typeof ME !== "undefined" && ME) load(); }, 4000);
})();
