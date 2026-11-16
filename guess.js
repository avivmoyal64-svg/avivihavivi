/* "Guess the fighter": 10 clues, one more opens with each step, a search box is always there. Loaded after duel.js. */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const KEY = "ufcguess";
let S = null, Q = "", SEL = false, MSG = "";
let ST = { best: 0, played: 0, won: 0 };
try { ST = Object.assign(ST, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} };
const names = () => (window.guessNames ? window.guessNames() : []);
function start(name) {
  const all = names(); if (!all.length) return;
  for (let i = 0; i < 20; i++) {
    const n = name || all[Math.floor(Math.random() * all.length)], g = window.guessFacts(n);
    if (g) { S = { g, open: 1, wrong: [], done: 0, pts: 0 }; Q = ""; MSG = ""; SEL = false; show(); return; }
    if (name) break;
  }
  MSG = "Could not build clues for that fighter. Try another one."; show();
}
function finish(won) {
  S.done = won ? 1 : 2; S.pts = won ? 11 - S.open : 0;
  ST.played++; if (won) { ST.won++; ST.best = Math.max(ST.best, S.pts); } save();
}
function guess(n) {
  if (!S || S.done) return;
  Q = ""; const ok = String(n).toLowerCase() === S.g.name.toLowerCase();
  if (ok) { finish(true); MSG = ""; }
  else {
    S.wrong.push(n);
    if (S.open >= 10) { finish(false); } else { S.open++; MSG = "Not " + n + ". A new clue opened."; }
  }
  show();
}
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function results() {
  const q = norm(Q); if (!q) return [];
  const bad = new Set((S ? S.wrong : []).map(x => x.toLowerCase()));
  return names().filter(n => norm(n).includes(q) && !bad.has(n.toLowerCase())).slice(0, 6);
}
const esc2 = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function listHtml() {
  const r = results();
  if (!Q) return "";
  return `<div class="gsl">${r.length ? r.map(n => `<button type="button" data-n="${esc2(n)}">${esc2(n)}</button>`).join("") : '<div class="gsn">No fighter found</div>'}</div>`;
}
function search() {
  return `<div class="gss"><input id="gsq" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search a fighter and tap to guess" value="${esc2(Q)}"><div id="gsr">${listHtml()}</div></div>`;
}
function view() {
  if (!S) {
    return `<div class="dlbox"><b>Guess the fighter</b><p>10 clues about a mystery fighter. Each wrong guess opens the next clue. Fewer clues = more points.</p></div>
<button class="fvb go gsb" type="button" id="gsrand">🎲 Random mystery fighter</button>
<div class="dlbox"><b>Pick the fighter</b><p>Choose who the mystery fighter is. Search below, then tap a name.</p></div>${search()}
<div class="gst"><span><b>${ST.best}</b><small>Best score</small></span><span><b>${ST.won}</b><small>Solved</small></span><span><b>${ST.played}</b><small>Played</small></span></div>${MSG ? `<div class="gsm">${esc2(MSG)}</div>` : ""}`;
  }
  const g = S.g, rows = g.facts.map((t, i) => i < S.open || S.done ? `<li class="${i < S.open ? "on" : "off"}"><em>${i + 1}</em><span>${esc2(t)}</span></li>` : `<li class="lk"><em>${i + 1}</em><span>🔒 Locked</span></li>`).join("");
  let end = "";
  if (S.done) {
    const w = S.done === 1;
    end = `<div class="gsw ${w ? "y" : "n"}"><b>${w ? "Correct! +" + S.pts + " points" : "It was " + esc2(g.name)}</b>${w ? `<span>${esc2(g.name)} · solved with ${S.open} clue${S.open > 1 ? "s" : ""}</span>` : ""}</div><button class="fvb go gsb" type="button" id="gsagain">Play again</button><button class="fvb gsb" type="button" id="gsmenu">Menu</button>`;
  } else {
    end = `${MSG ? `<div class="gsm">${esc2(MSG)}</div>` : ""}${search()}<div class="gsa"><button class="fvb" type="button" id="gsnext">${S.open < 10 ? "Open next clue" : "Last clue opened"}</button><button class="fvb" type="button" id="gsgive">Give up</button></div>`;
  }
  return `<div class="dlbox"><b>Who is this fighter?</b><p>Clue ${Math.min(S.open, 10)} of 10 · worth ${S.done ? S.pts : 11 - S.open} points</p></div><ol class="gsc">${rows}</ol>${end}`;
}
window.guessShow = function () {
  const el = $("pgqs"); if (!el) return;
  const had = document.activeElement && document.activeElement.id === "gsq", pos = had ? document.activeElement.selectionStart : 0;
  el.innerHTML = view();
  const inp = $("gsq");
  if (inp) {
    inp.oninput = () => { Q = inp.value; const r = $("gsr"); if (r) { r.innerHTML = listHtml(); wire(); } };
    if (had) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (e) {} }
  }
  wire();
  const b = (id, f) => { const e = $(id); if (e) e.onclick = f; };
  b("gsrand", () => start()); b("gsagain", () => start()); b("gsmenu", () => { S = null; MSG = ""; Q = ""; window.guessShow(); });
  b("gsnext", () => { if (S && !S.done && S.open < 10) { S.open++; MSG = ""; window.guessShow(); } });
  b("gsgive", () => { if (S && !S.done) { finish(false); MSG = ""; window.guessShow(); } });
};
function show() { window.guessShow(); }
function wire() {
  const r = $("gsr"); if (!r) return;
  r.querySelectorAll("button[data-n]").forEach(btn => { btn.onclick = () => { const n = btn.getAttribute("data-n"); if (S) guess(n); else start(n); }; });
}
window.guessCard = () => `<button class="hcard" onclick="openPage('guess')"><i>🕵️</i><span><b>Guess the fighter</b><small>${ST.played ? "Best score " + ST.best + " · " + ST.won + " solved" : "10 clues · who is the mystery fighter?"}</small></span><em>›</em></button>`;
})();
