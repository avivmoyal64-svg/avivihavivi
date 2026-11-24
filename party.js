/* Party games: a full-screen room for 2 or 3 players. Invite one or two players, vote live on a game, play.
   Games: Hot Seat Heist, Weigh-In Whisper, Odd Fighter Out, Pie Press Conference, Rubber Gloves, Dirty Corner (the last four live in party2.js). The server decides everything. Loaded after who.js. */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const nm = id => (typeof NAMES !== "undefined" && NAMES[id]) || "Player";
let OPEN = false, ROOM = null, V = null, OFF = 0, VNOW = 0, INF = 0, MINE = [], SEL = [], MSG = "", BUSY = false, KEY = "", MQ = "", WQ = "";
const DISM = {};
const srv = () => Date.now() + OFF;
const secs = ms => Math.max(0, Math.ceil((ms - srv()) / 1000));
const rpc = async (fn, a) => { const r = await SB.rpc(fn, a || {}); if (r.error) throw r.error; return r.data; };
const photoOf = n => { try { return (typeof photoZ === "function" ? photoZ(n) : "") || ""; } catch (e) { return ""; } };
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const fighters = () => { const a = []; for (const c in D) D[c].forEach(f => a.push(f.n)); return a; };
const fdata = n => { for (const c in D) { const f = D[c].find(x => x.n === n); if (f) return { f, c }; } return null; };
const GAMES = {
  heist: { i: "💰", t: "Hot Seat Heist", s: "Steal points from the others. Guess who will play it safe." },
  whisper: { i: "🤫", t: "Weigh-In Whisper", s: "One of you is the Imposter and has no idea who the fighter is." }
};
{ const X = window.PARTYX; if (X) for (const k in X.games) GAMES[k] = X.games[k]; }
const NEED3 = { whisper: 1, dirty: 1 };
const CATS = { wins: ["Most wins", ""], fights: ["Most fights", ""], pct: ["Best win rate", "%"], loss: ["Fewest losses", ""] };
const ERR = e => {
  const t = String((e && e.message) || e);
  return /already in a party/i.test(t) ? "You are already in a party. Finish or leave it first." : /too many/i.test(t) ? "You started too many parties today. Try again tomorrow." : /pick (one or )?two/i.test(t) ? "Pick one or two other players." : /needs 3/i.test(t) ? "That game needs 3 players." :
    /do not use the name/i.test(t) ? "Do not use the fighter's name. Give a different clue." : /one word/i.test(t) ? "Write one word (2 to 20 letters)." : /slow down/i.test(t) ? "Slow down a little." :
    /not open|closed|no such party/i.test(t) ? "This party is not open any more." : "Could not do that. Try again.";
};

/* ---------- screen ---------- */
function ensure() {
  if ($("pty")) return;
  const st = document.createElement("style");
  st.textContent = `
#pty{position:fixed;inset:0;z-index:420;display:none;flex-direction:column;background:radial-gradient(800px 460px at 100% 0,rgba(var(--rgb),.22),transparent 60%),radial-gradient(700px 400px at 0 100%,rgba(var(--rgb),.14),transparent 60%),#1f2024;color:var(--tx,#f2f2f2);padding-top:env(safe-area-inset-top,0px)}
#pty.on{display:flex}
.pth{flex:none;display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid #4d4e55;background:rgba(31,32,36,.92)}
.pth h2{margin:0;flex:1;font:italic 900 24px "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;letter-spacing:1.2px;background:linear-gradient(90deg,var(--red),var(--red2) 60%,var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent}
.ptbk{all:unset;cursor:pointer;box-sizing:border-box;min-height:44px;padding:0 16px;display:flex;align-items:center;border:1px solid #6b6c75;color:#fff;font:700 15px Barlow,Heebo,Arial,sans-serif}
.ptbk.lv{border-color:var(--red2);color:#ffb4b4}
#ptb{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 14px 18px;max-width:640px;width:100%;margin:0 auto;box-sizing:border-box}
#ptb .dlbox:first-child{margin-top:0}
.ptbig{margin:14px 0;padding:24px 16px;text-align:center;background:linear-gradient(160deg,#34353b,#26272b);border:2px solid var(--gold);border-inline-start:10px solid var(--red2)}
.ptbig i{display:block;font-style:normal;font-size:54px}
.ptbig h3{margin:6px 0 4px;font:italic 900 38px/1 "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;letter-spacing:.8px}
.ptbig p{margin:6px 0 0;color:#cfcfd6;font:16px/1.4 Barlow,Heebo,Arial,sans-serif}
.ptcd{display:block;margin-top:10px;font:italic 900 56px/1 "Barlow Condensed","Heebo",Arial,sans-serif;color:var(--gold)}
.ptbar{height:6px;background:#3a3b42;margin:6px 0 12px}.ptbar u{display:block;height:100%;width:100%;background:linear-gradient(90deg,var(--red),var(--red2))}
.ptseat{display:flex;align-items:center;gap:12px;margin:8px 0;padding:12px 14px;background:#2c2d32;border:1px solid #4d4e55}
.ptseat .ga{flex:none}.ptseat>div{flex:1;min-width:0}.ptseat b{display:block;font:700 18px Barlow,Heebo,Arial,sans-serif}.ptseat small{color:var(--mut);font:14px Barlow,Heebo,Arial,sans-serif}
.ptseat.ok{border-color:var(--grn)}.ptseat em{font-style:normal;font:700 14px Barlow,Heebo,Arial,sans-serif;color:var(--mut)}.ptseat.ok em{color:var(--grn)}
.ptvote{all:unset;box-sizing:border-box;cursor:pointer;display:block;width:100%;margin:10px 0;padding:18px 16px;background:linear-gradient(160deg,#34353b,#26272b);border:2px solid #5a5b63;text-align:center;color:#fff}
.ptvote.me{border-color:var(--gold);box-shadow:0 0 22px rgba(var(--rgb),.45)}
.ptvg{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ptvg .ptvote{margin:0;padding:14px 6px}.ptvg .ptvote b{font-size:22px}.ptvote i{display:block;font-style:normal;font-size:44px}.ptvote b{display:block;font:italic 900 30px/1.05 "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;letter-spacing:.6px}
.ptvote span{display:block;margin-top:4px;color:#cfcfd6;font:15px/1.35 Barlow,Heebo,Arial,sans-serif}.ptvote em{display:block;margin-top:8px;font:700 15px Barlow,Heebo,Arial,sans-serif;font-style:normal;color:var(--gold)}
.ptf{position:sticky;top:-14px;z-index:3;display:flex;gap:14px;align-items:center;margin:-14px -14px 12px;padding:12px 14px;background:#26272b;border-bottom:2px solid var(--gold)}
.ptf>i{flex:none;width:92px;height:116px;background:#3a3b42 center top/cover no-repeat;border:1px solid #6b6c75}
.ptf.q>i{display:grid;place-items:center;font:italic 900 64px "Barlow Condensed",Arial,sans-serif;color:#777;font-style:normal}
.ptf b{display:block;font:italic 900 26px/1.05 "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;letter-spacing:.5px}
.ptf small{display:block;color:#cfcfd6;font:14px/1.4 Barlow,Heebo,Arial,sans-serif}.ptf .tg{margin-top:6px;color:var(--gold);font-weight:700}
.ptrole{margin:0 0 12px;padding:12px 14px;font:700 17px/1.3 Barlow,Heebo,Arial,sans-serif;border-inline-start:6px solid var(--grn);background:#233127}
.ptrole.imp{border-color:var(--red2);background:#3a2323}
.ptin{display:flex;gap:8px;margin:10px 0}.ptin .gpq{flex:1;font-size:18px}
.ptgo{all:unset;box-sizing:border-box;cursor:pointer;text-align:center;padding:14px 18px;background:linear-gradient(90deg,var(--red),var(--red2));color:#fff;font:italic 900 19px "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;letter-spacing:1px}
.ptgo:disabled{opacity:.5}
.ptopt{all:unset;box-sizing:border-box;cursor:pointer;display:block;width:100%;margin:8px 0;padding:16px 14px;text-align:center;background:#2c2d32;border:2px solid #5a5b63;color:#fff;font:italic 900 20px "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;letter-spacing:.8px}
.ptopt small{display:block;margin-top:2px;font:14px Barlow,Heebo,Arial,sans-serif;text-transform:none;letter-spacing:0;font-style:normal;color:#cfcfd6}
.ptopt.s{border-color:var(--grn)}.ptopt.me{border-color:var(--gold);background:#3a2f1f}.ptopt:disabled{opacity:.55}
.ptcl{display:flex;gap:10px;align-items:baseline;padding:10px 12px;margin:6px 0;background:#2c2d32;border:1px solid #4d4e55}.ptcl span{flex:1;min-width:0;color:#cfcfd6;font:15px Barlow,Heebo,Arial,sans-serif}.ptcl b{font:italic 900 24px "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;color:#fff}
.ptsb{margin:14px 0}.ptsb .ptseat b{font-size:17px}.ptsb .ptseat strong{font:italic 900 30px "Barlow Condensed",Arial,sans-serif;color:var(--gold)}.ptsb .ptseat em{color:var(--grn);font-weight:700}
.ptrow{padding:10px 12px;margin:6px 0;background:#2c2d32;border:1px solid #4d4e55;display:flex;gap:10px;align-items:center}.ptrow>div{flex:1;min-width:0}.ptrow b{display:block;font:700 16px Barlow,Heebo,Arial,sans-serif}.ptrow small{display:block;color:var(--mut);font:13px Barlow,Heebo,Arial,sans-serif}.ptrow strong{font:italic 900 26px "Barlow Condensed",Arial,sans-serif;color:var(--gold)}.ptrow.w{border-color:var(--grn)}
.ptmsg{margin:8px 0;padding:10px 12px;background:#3a2323;border-inline-start:5px solid var(--red2);font:15px Barlow,Heebo,Arial,sans-serif}
#ptinv{position:fixed;z-index:66;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);max-width:560px;margin:0 auto;animation:invUp .45s cubic-bezier(.2,1.2,.3,1) both}`;
  document.head.appendChild(st);
  const el = document.createElement("div"); el.id = "pty"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Party games");
  el.innerHTML = `<div class="pth"><h2>Party games</h2><button class="ptbk" id="ptx" type="button">‹ Back</button></div><div id="ptb"></div></div>`;
  document.body.appendChild(el);
  $("ptx").onclick = onBack;
  $("ptb").addEventListener("click", onClick);
}
function flash(t) { const b = $("ptb"); if (!b) return; let m = $("ptflash"); if (!m) { m = document.createElement("div"); m.id = "ptflash"; m.className = "ptmsg"; b.insertBefore(m, b.firstChild); } m.textContent = t; setTimeout(() => { try { m.remove(); } catch (e) {} }, 3500); }

/* ---------- open / close ---------- */
window.partyOpen = async function (id) {
  ensure(); OPEN = true; $("pty").classList.add("on");
  try { if (location.hash !== "#party") history.pushState({ pt: 1 }, "", "#party"); } catch (e) {}
  if (typeof window.smClose === "function") window.smClose();
  if (id) { await enter(id); } else { await mine(); }
  render(true);
};
function close() {
  OPEN = false; ROOM = null; V = null; KEY = ""; MSG = ""; SEL = [];
  const p = $("pty"); if (p) p.classList.remove("on");
  try { if (location.hash === "#party") history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
}
async function onBack() {
  if (ROOM && V && ["lobby", "voting", "playing"].includes(V.status)) {
    const ok = confirm(window.LANGHE ? "לעזוב את המסיבה? זה יסיים אותה לכולם." : "Leave the party? This ends it for everyone.");
    if (!ok) return;
    try { await rpc("party_leave", { p_room: ROOM }); } catch (e) {}
  }
  if (ROOM) { ROOM = null; V = null; KEY = ""; await mine(); render(true); return; }
  close();
}
addEventListener("popstate", () => {
  if (!OPEN) return;
  if (ROOM && V && ["lobby", "voting", "playing"].includes(V.status)) { try { history.pushState({ pt: 1 }, "", "#party"); } catch (e) {} return; }
  if (location.hash !== "#party") close();
});

/* ---------- data ---------- */
async function mine() { if (!SB || !ME) return; try { MINE = await rpc("party_mine"); } catch (e) { MINE = MINE || []; } }
async function enter(id) {
  ROOM = id; V = null; KEY = ""; VNOW = 0; await pull();
}
/* take a fresh view (from a poll or straight from an action); ignore answers that are older than what we have */
function take(v, t0) {
  if (!v || !ROOM || v.id !== ROOM) return false;
  const n = Number(v.now) || 0; if (n && n < VNOW) return false; VNOW = n;
  OFF = n - (t0 + Date.now()) / 2; V = v; return true;
}
/* one request per tap: the server answers with the new view. The screen updates first (optimistic), then corrects itself. */
async function act(d, a, guess) {
  if (guess && V && V.g) { try { guess(V.g); } catch (e) {} render(true); }
  const t0 = Date.now();
  try {
    const r = await rpc("party_act", { p_room: ROOM, p_do: d, p_a: a });
    if (!(r && r.view && take(r.view, t0))) await pull();
  } catch (er) { flash(ERR(er)); await pull(); }
  render(true);
}
const addMe = (arr) => (arr || []).includes(ME) ? arr : (arr || []).concat(ME);
async function pull() {
  if (!ROOM) return;
  const t0 = Date.now();
  try {
    const v = await rpc("party_view", { p_room: ROOM, p_since: 0 });
    take(v, t0);
  } catch (e) { if (/no such party/i.test(String(e && e.message))) { ROOM = null; V = null; MSG = "This party is not open any more."; await mine(); render(true); } }
}
async function poll() {
  if (!OPEN || document.hidden || !ROOM) return;
  await pull();
  if (V && V.g && V.g.phase === "live" && window.PARTYX) { try { window.PARTYX.update(V.g, cx()); } catch (e) { console.error(e); } }
  render(false);
}
(function loop() {
  const live = !!(V && V.g && V.g.phase === "live");
  setTimeout(() => { if (INF < (live ? 2 : 1)) { INF++; poll().catch(() => {}).then(() => { INF--; }); } loop(); }, live ? 170 : 550);
})();
setInterval(() => { if (OPEN && !ROOM) mine().then(() => { if (OPEN && !ROOM && !SEL.length && !document.activeElement.matches("input")) render(false); }); }, 4000);

/* ---------- views ---------- */
const keyOf = () => {
  if (!ROOM || !V) return "pick|" + MINE.map(m => m.id + m.me + m.status).join() + "|" + SEL.join() + "|" + MSG;
  const g = V.g || {};
  if (g.phase === "live") return [V.status, g.game, "live", MSG].join("|");
  return [V.status, V.closed_by, (V.members || []).map(m => m.state + ":" + (m.vote || "")).join(), g.game, g.phase, g.round, g.role, g.fighter, (g.clued || []).join(), (g.voted || []).join(), g.myvote, (g.chosen || []).join(), g.mychoice,
    g.caught, g.lg, g.lres, window.PARTYX && g.seats ? window.PARTYX.key(g) : "", JSON.stringify(g.score || {}), MSG].join("|");
};
function seat(id, state, extra) {
  const ok = state === "joined";
  return `<div class="ptseat${ok ? " ok" : ""}">${typeof avZ === "function" ? avZ(nm(id)).replace("<i ", '<i class="ga" ') : ""}<div><b>${esc(nm(id))}${id === ME ? " (you)" : ""}</b><small>${extra || ""}</small></div><em>${state === "joined" ? "Ready" : state === "declined" ? "Declined" : "Invited"}</em></div>`;
}
function fcard(n, role) {
  if (!n) return `<div class="ptf q"><i>?</i><div><b>Hidden fighter</b><small>You are the Imposter. Listen to the clues and blend in.</small></div></div>`;
  const d = fdata(n), ph = photoOf(n);
  return `<div class="ptf"><i style="${ph ? "background-image:url(" + ph + ")" : ""}"></i><div><b>${esc(n)}</b>${d ? `<small>${d.f.nick ? "“" + esc(d.f.nick) + "” · " : ""}${esc(d.c)}</small><small>Record <span dir="ltr">${esc(d.f.rec || "")}</span></small><small>${esc((d.f.base || []).slice(0, 4).join(" · "))}</small>` : ""}${role === "ins" ? `<small class="tg">Insider card: only you and the other Insider see this</small>` : ""}</div></div>`;
}
function board(g, showGain) {
  const ids = (V.members || []).map(m => m.uid), sc = g.score || {}, gain = showGain ? g.gain || (g.last && g.last.gain) || {} : {};
  return `<div class="ptsb"><div class="dlbox"><b>Scores</b></div>${ids.slice().sort((a, b) => (sc[b] || 0) - (sc[a] || 0)).map(id => `<div class="ptseat"><div><b>${esc(nm(id))}${id === ME ? " (you)" : ""}</b>${gain[id] ? `<small><em>+${gain[id]} this round</em></small>` : ""}</div><strong>${sc[id] || 0}</strong></div>`).join("")}</div>`;
}
function final(g) {
  const ids = (V.members || []).map(m => m.uid), sc = g.score || {}, top = Math.max.apply(null, ids.map(id => sc[id] || 0)), wins = ids.filter(id => (sc[id] || 0) === top);
  const mine = wins.includes(ME);
  return `<div class="ptbig"><i>${mine ? "🏆" : "🥊"}</i><h3>${wins.length > 1 ? "It's a tie" : esc(nm(wins[0])) + " wins"}</h3><p>${mine ? "You won the party game!" : "Good game. Play again?"}</p></div>${board(g, false)}<div class="pfn" style="text-align:center">Next game vote in <span data-end="${g.ends}">${secs(g.ends)}</span>s</div>`;
}
function picker() {
  const inv = MINE.filter(m => m.me === "invited" && m.status === "lobby"), cur = MINE.filter(m => m.me === "joined");
  const ps = Object.keys(NAMES || {}).filter(id => id !== ME && NAMES[id]).sort((a, b) => nm(a).localeCompare(nm(b)));
  return `${MSG ? `<div class="ptmsg">${esc(MSG)}</div>` : ""}
<div class="ptbig"><i>🎉</i><h3>Party games</h3><p>Pick one or two friends to play.</p></div>
${cur.map(m => `<div class="dlr conf"><div><b>${esc(nm(m.host))}'s party</b><small>${m.status === "lobby" ? "Waiting for players" : "In progress"}</small></div><button class="fvb go" type="button" data-a="resume" data-id="${m.id}">Open</button></div>`).join("")}
${inv.map(m => `<div class="dlr conf"><div><b>${esc(nm(m.host))}</b><small>Invited you to a party 🎉</small></div><button class="fvb go" type="button" data-a="join" data-id="${m.id}">Join</button><button class="fvb" type="button" data-a="no" data-id="${m.id}">Decline</button></div>`).join("")}
<div class="dlbox"><b>${SEL.length} of 2 picked</b><p>${SEL.length === 1 ? "2-player party. Pick one more for all 6 games." : "With 2 players: 4 games. With 3 players: all 6."}</p></div>
${ps.map(id => `<button type="button" class="ptopt${SEL.includes(id) ? " me" : ""}" data-a="sel" data-id="${esc(id)}">${esc(nm(id))}<small>${SEL.includes(id) ? "✓" : ""}</small></button>`).join("") || '<div class="pfn">No other players yet.</div>'}
<button class="ptgo" style="width:100%;margin-top:12px;padding:18px" type="button" data-a="start" ${SEL.length >= 1 && !BUSY && !cur.length ? "" : "disabled"}>Start the party</button>`;
}
function lobby() {
  const ms = V.members || [];
  return `<div class="ptbig"><i>🎉</i><h3>Waiting…</h3></div>${ms.map(m => seat(m.uid, m.state, m.uid === V.host ? "Host" : "")).join("")}`;
}
function voting() {
  const ms = V.members || [], cnt = g => ms.filter(m => m.vote === g).length;
  return `<div class="ptbig" style="padding:12px"><h3 style="margin:0">Pick a game</h3><span class="ptcd" style="font-size:44px" data-end="${V.vote_end}">${secs(V.vote_end)}</span></div>
<div class="ptvg">${Object.keys(GAMES).map(k => { const g = GAMES[k], me = (ms.find(m => m.uid === ME) || {}).vote === k, off = ms.length < 3 && NEED3[k];
    return `<button type="button" class="ptvote${me ? " me" : ""}" data-a="vote" data-id="${k}" ${off ? 'disabled style="opacity:.4"' : ""}><i>${g.i}</i><b>${g.t}</b><em>${off ? "3 players" : cnt(k) ? "✔ " + cnt(k) : "·"}</em></button>`; }).join("")}</div>`;
}
const RULES = {
  heist: "Score by fighter rank, or steal from a player who plays it straight.",
  whisper: "Find the Imposter who doesn't know the fighter."
};
function intro(g) {
  const G = GAMES[g.game];
  return `<div class="ptbig"><i>${G.i}</i><h3>${G.t}</h3><p>${RULES[g.game] || G.r}</p><span class="ptcd" data-end="${g.ends}">${secs(g.ends)}</span><p>Get ready</p></div>`;
}
function timer(g, dur) { return g.ends > 8e15 ? "" : `<div class="ptbar"><u data-end="${g.ends}" data-dur="${dur}"></u></div><div class="pfn" style="text-align:center"><span data-end="${g.ends}">${secs(g.ends)}</span>s left</div>`; }
function others() { return (V.members || []).map(m => m.uid).filter(id => id !== ME); }
function whisper(g) {
  const ph = g.phase, imp = g.role === "imp", head = ph === "intro" ? "" : `${fcard(g.fighter, g.role)}<div class="ptrole${imp ? " imp" : ""}">${imp ? "You are the IMPOSTER 🤫. You don't know the fighter." : "You are an INSIDER 🕵️. Find the Imposter."} · Round ${g.round} of 3</div>`;
  if (ph === "intro") return intro(g);
  if (ph === "over") return head + final(g);
  const ms = (V.members || []).map(m => m.uid);
  if (ph === "clue") {
    const sent = (g.clued || []).includes(ME), mine = (g.clues || {})[ME];
    return head + `<div class="dlbox"><b>One clue word</b><p>${imp ? "Blend in." : "Don't use the name."}</p></div>
${sent ? `<div class="ptcl"><b>${esc(mine || "")}</b><span>Sent ✓</span></div>` : `<div class="ptin"><input class="gpq" id="ptw" maxlength="20" placeholder="One word" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(WQ)}"><button class="ptgo" type="button" data-a="clue">Send</button></div>`}
${ms.map(id => `<div class="ptseat${(g.clued || []).includes(id) ? " ok" : ""}"><div><b>${esc(nm(id))}${id === ME ? " (you)" : ""}</b></div><em>${(g.clued || []).includes(id) ? "Clue in ✓" : "Writing…"}</em></div>`).join("")}${timer(g, 32000)}`;
  }
  if (ph === "vote") {
    const cl = g.clues || {}, vd = g.voted || [];
    return head + `<div class="dlbox"><b>The clues</b></div>${ms.map(id => `<div class="ptcl"><b>${esc(cl[id] || "—")}</b><span>${esc(nm(id))}${id === ME ? " (you)" : ""}</span></div>`).join("")}
<div class="dlbox"><b>Who is the Imposter?</b></div>
${others().map(id => `<button type="button" class="ptopt${g.myvote === id ? " me" : ""}" data-a="acc" data-id="${id}">${esc(nm(id))}<small>${g.myvote === id ? "✓" : ""}</small></button>`).join("")}
<div class="pfn" style="text-align:center">${vd.length} of ${ms.length} voted</div>${timer(g, 50000)}`;
  }
  if (ph === "last") {
    if (imp) return head + `<div class="dlbox dlose"><b>You were caught!</b><p>You get one last guess. Name the fighter for 1 point.</p></div><div class="dlr conf dlpn"><input class="gpq" id="ptq" type="search" placeholder="Type a name and tap the fighter" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(MQ)}"><div class="dlfl" id="ptl"></div></div>${timer(g, 25000)}`;
    return head + `<div class="dlbox dwin"><b>You caught the Imposter!</b><p>${esc(nm(g.imp))} gets one last guess at the fighter…</p></div>${timer(g, 25000)}`;
  }
  /* reveal */
  const v = g.votes || {};
  return head + `<div class="dlbox ${g.caught ? "dwin" : "dlose"}"><b>${g.caught ? "The Imposter was caught!" : "The Imposter got away!"}</b><p>${esc(nm(g.imp))} was the Imposter${g.caught && g.lg ? ` · last guess: ${esc(g.lg)} ${g.lres ? "✓ +1" : "✗"}` : ""}</p></div>
${ms.map(id => `<div class="ptrow"><div><b>${esc(nm(id))}</b><small>${v[id] ? "Voted for " : "No vote"}${v[id] ? esc(nm(v[id])) : ""}</small></div></div>`).join("")}${board(g, true)}
<div class="pfn" style="text-align:center">${g.round >= 3 ? "Final scores next" : "Next round in"} <span data-end="${g.ends}">${secs(g.ends)}</span>s</div>`;
}
function heist(g) {
  if (g.phase === "intro") return intro(g);
  const cat = CATS[g.cat] || ["", ""], head = `${fcard(g.mine, "")}<div class="dlbox"><b>Round ${g.round} of 5 · ${cat[0]}</b><p>${g.cat === "loss" ? "Fewer losses is better. " : ""}Your fighter's number: <b dir="ltr">${g.myval == null ? "?" : g.myval}${cat[1]}</b></p></div>`.replace('<div class="ptf">', '<div class="ptf">');
  if (g.phase === "over") return `${final(g)}`;
  if (g.phase === "pick") {
    const ch = (g.chosen || []).includes(ME), mc = g.mychoice, ms = (V.members || []).map(m => m.uid);
    return head + `${ch ? `<div class="ptmsg" style="border-color:var(--grn);background:#233127">Locked in ✓</div>` : ``}
<button type="button" class="ptopt s${mc === "S" ? " me" : ""}" data-a="ch" data-id="S" ${ch ? "disabled" : ""}>Play it straight<small>Score by rank</small></button>
${others().map(id => `<button type="button" class="ptopt${mc === id ? " me" : ""}" data-a="ch" data-id="${id}" ${ch ? "disabled" : ""}>Steal from ${esc(nm(id))}<small>Steal</small></button>`).join("")}
${ms.map(id => `<div class="ptseat${(g.chosen || []).includes(id) ? " ok" : ""}"><div><b>${esc(nm(id))}${id === ME ? " (you)" : ""}</b></div><em>${(g.chosen || []).includes(id) ? "Locked ✓" : "Thinking…"}</em></div>`).join("")}${timer(g, 17000)}`;
  }
  const L = g.last || {}, ms = (V.members || []).map(m => m.uid), hand = g.hand || {};
  return head + `<div class="dlbox"><b>Round result</b></div>${ms.map(id => { const c = (L.choice || {})[id]; return `<div class="ptrow${(L.gain || {})[id] > 0 ? " w" : ""}"><div><b>${esc(nm(id))}${id === ME ? " (you)" : ""}</b><small>${esc(hand[id] || "")} · <span dir="ltr">${(L.vals || {})[id]}${cat[1]}</span> · ${c === "S" ? "played straight" : "stole from " + esc(nm(c))}</small></div><strong>+${(L.gain || {})[id] || 0}</strong></div>`; }).join("")}${board(g, false)}
<div class="pfn" style="text-align:center">${g.round >= 5 ? "Final scores next" : "Next round in"} <span data-end="${g.ends}">${secs(g.ends)}</span>s</div>`;
}
function cx() { return { V, ME, nm, esc, srv, secs, intro, final, board, timer, photo: photoOf, rpc, room: () => ROOM, take: (v, t0) => { if (take(v, t0) && V.g && V.g.phase === "live" && window.PARTYX) { try { window.PARTYX.update(V.g, cx()); } catch (e) {} } } }; }
function room() {
  if (V.status === "closed") return `<div class="ptbig"><i>👋</i><h3>Party ended</h3><p>${V.closed_by ? esc(nm(V.closed_by)) + (V.closed_by === ME ? " (you)" : "") + " left or declined, so the party was closed." : "The party timed out."}</p></div><button class="ptgo" style="width:100%" type="button" data-a="done">Back to party games</button>`;
  if (V.status === "lobby") return lobby();
  if (V.status === "voting") return voting();
  const g = V.g; if (!g) return `<div class="ptbig"><i>⏳</i><h3>Starting…</h3></div>`;
  if (window.PARTYX && window.PARTYX.games[g.game]) return window.PARTYX.html(g, cx());
  return g.game === "whisper" ? whisper(g) : heist(g);
}
function fillList() {
  const out = $("ptl"); if (!out) return;
  const k = norm(MQ); if (!k) { out.innerHTML = ""; return; }
  const r = fighters().filter(n => norm(n).includes(k)).sort((a, b) => a.localeCompare(b)).slice(0, 8);
  out.innerHTML = r.map(n => `<button type="button" data-n="${esc(n)}">${typeof avZ === "function" ? avZ(n).replace("<i ", '<i class="ga" ') : ""}<span>${esc(n)}</span></button>`).join("");
  out.querySelectorAll("button[data-n]").forEach(b => { b.onclick = () => lastGuess(b.getAttribute("data-n")); });
}
function render(force) {
  if (!OPEN) return;
  ensure();
  const k = keyOf(); if (!force && k === KEY) { tick(); return; } KEY = k;
  const b = $("ptb"), w = $("ptw"), q = $("ptq"), ae = document.activeElement, had = ae && (ae.id === "ptw" || ae.id === "ptq"), id = had ? ae.id : "";
  if (w) WQ = w.value; if (q) MQ = q.value;
  const top = b.scrollTop;
  b.innerHTML = !ROOM || !V ? picker() : room();
  b.scrollTop = top;
  const x = $("ptx"); if (x) { const inRoom = ROOM && V && ["lobby", "voting", "playing"].includes(V.status); x.textContent = inRoom ? "Leave" : "‹ Back"; x.classList.toggle("lv", !!inRoom); }
  if (id) { const e = $(id); if (e) { e.focus(); try { const n = e.value.length; e.setSelectionRange(n, n); } catch (er) {} } }
  fillList(); tick();
  if (ROOM && V && V.g && V.status !== "closed" && window.PARTYX && window.PARTYX.games[V.g.game]) { try { window.PARTYX.mount(V.g, cx()); } catch (e) { console.error(e); } }
}
function tick() {
  document.querySelectorAll("#ptb [data-end]").forEach(e => {
    const end = Number(e.dataset.end), left = Math.max(0, end - srv());
    if (e.tagName === "U") e.style.width = (Math.min(1, left / Number(e.dataset.dur || 1)) * 100).toFixed(1) + "%"; else e.textContent = String(Math.ceil(left / 1000));
  });
}
setInterval(() => { if (OPEN) tick(); }, 250);

/* ---------- actions ---------- */
async function onClick(e) {
  const t = e.target.closest("[data-a]"); if (!t || BUSY) return;
  const a = t.dataset.a, id = t.dataset.id;
  try {
    if (a === "sel") { SEL = SEL.includes(id) ? SEL.filter(x => x !== id) : SEL.length < 2 ? SEL.concat(id) : SEL; MSG = ""; render(true); return; }
    if (a === "start") {
      BUSY = true; MSG = "";
      try { const rid = await rpc("party_create", { p_b: SEL[0], p_c: SEL[1] || null }); note(rid); SEL = []; BUSY = false; await enter(rid); } catch (er) { console.error("party", er); MSG = ERR(er); }
      BUSY = false; render(true); return;
    }
    if (a === "resume") { await enter(id); render(true); return; }
    if (a === "join") { BUSY = true; try { await rpc("party_accept", { p_room: id }); await enter(id); } catch (er) { MSG = ERR(er); await mine(); } BUSY = false; render(true); return; }
    if (a === "no") { try { await rpc("party_decline", { p_room: id }); } catch (er) {} await mine(); render(true); return; }
    if (a === "done") { ROOM = null; V = null; await mine(); render(true); return; }
    if (a === "vote") {
      const m = (V && V.members || []).find(x => x.uid === ME); if (m) { m.vote = id; render(true); }
      try { await rpc("party_vote", { p_room: ROOM, p_game: id }); } catch (er) { flash(ERR(er)); }
      await pull(); render(true); return;
    }
    if (a === "clue") { const w = $("ptw"); if (!w) return; const word = w.value; WQ = ""; await act("clue", word, g => { g.clued = addMe(g.clued); g.clues = Object.assign({}, g.clues, { [ME]: word.toLowerCase() }); }); return; }
    if (a === "acc" || a === "px2") { await act("accuse", id, g => { g.myvote = id; g.voted = addMe(g.voted); }); return; }
    if (a === "px") { await act("pick", id, g => { g.mine = id; g.acted = addMe(g.acted); }); return; }
    if (a === "fling") { const m = window.PARTYX && window.PARTYX.aim(); if (!m) { flash("Drag on the ring to aim first."); return; } await act("pick", m.a.toFixed(3) + "," + m.p.toFixed(2)); return; }
    if (a === "ch") { await act("choose", id, g => { g.mychoice = id; g.chosen = addMe(g.chosen); }); return; }
  } catch (er) { flash(ERR(er)); }
}
async function lastGuess(n) { MQ = ""; await act("lastguess", n); }
document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target && e.target.id === "ptw") { const b = document.querySelector('#ptb [data-a="clue"]'); if (b) b.click(); } });
document.addEventListener("input", e => { if (e.target && e.target.id === "ptq") { MQ = e.target.value; fillList(); } });
async function note(id) {
  try {
    const s = (await SB.auth.getSession()).data.session; if (!s || !id) return;
    await fetch(SUPA_URL + "/functions/v1/party-push?partynote=" + encodeURIComponent(id) + "&name=" + encodeURIComponent(String(NAMES[ME] || "").slice(0, 24)), { method: "POST", headers: { Authorization: "Bearer " + s.access_token, apikey: SUPA_KEY } });
  } catch (e) {}
}

/* ---------- invite pop-up (any page) ---------- */
function inviteUi() {
  let el = $("ptinv");
  if (!el) { el = document.createElement("div"); el.id = "ptinv"; el.setAttribute("role", "alert"); el.hidden = true; document.body.appendChild(el); }
  const g = ME && !OPEN ? MINE.find(m => m.me === "invited" && m.status === "lobby" && !DISM[m.id]) : null;
  if (!g) { el.hidden = true; el.innerHTML = ""; el.dataset.k = ""; return; }
  el.hidden = false; if (el.dataset.k === g.id) return; el.dataset.k = g.id;
  el.innerHTML = `<div class="dli"><i class="dlig">🎉</i><div><b><span>${esc(nm(g.host))}</span> <span>invited you to a party 🎉</span></b><small>Party games · vote on a game together</small></div><button type="button" class="dla" data-pj="${g.id}">Join</button><button type="button" data-pn="${g.id}">Later</button></div>`;
  el.querySelector("[data-pj]").onclick = async () => { const id = g.id; try { await partyOpen(); await rpc("party_accept", { p_room: id }); await enter(id); render(true); } catch (er) { MSG = ERR(er); render(true); } };
  el.querySelector("[data-pn]").onclick = () => { DISM[g.id] = 1; inviteUi(); };
}
setInterval(() => { try { inviteUi(); } catch (e) {} }, 1000);
setInterval(() => { try { if (ME && !document.hidden && !OPEN) mine(); } catch (e) {} }, 6000);
setTimeout(() => { try { if (typeof ME !== "undefined" && ME) { mine(); if (location.hash === "#party" && !OPEN) window.partyOpen(); } } catch (e) {} }, 4000);
})();
