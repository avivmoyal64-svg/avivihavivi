/* 1v1 trivia duel: 10 easy multiple-choice questions about one random fighter. Loaded after the main script (shares its globals). */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const RES = {"Islam Makhachev":{"rec":"29-1-0","w":29,"ko":5,"sub":13,"dec":11,"beat":["Della Maddalena","Dober","Garry","Green","Hooker","Johnson","Kuntz","Lentz","Moicano","Moises","Oliveira","Poirier","Ramos","Tibau","Tsarukyan","Volkanovski","Wade"],"lost":["Martins"]},"Jon Jones":{"rec":"28-1-0","w":28,"ko":11,"sub":7,"dec":10,"beat":["Bader","Belfort","Bonnar","Cormier","Evans","Gane","Gusmao","Gustafsson","Jackson","Machida","Miocic","O'Brien","Reyes","Rua","Santos","Smith","Sonnen","St-Preux","Teixeira","Vera","Vladimir"],"lost":["Hamill"]},"Conor McGregor":{"rec":"22-7-0","w":22,"ko":19,"sub":1,"dec":2,"beat":["Aldo","Alvarez","Brandao","Brimage","Cerrone","Diaz","Holloway","Mendes","Poirier","Siver"],"lost":["Diaz","Khabib","Poirier"]},"Khabib Nurmagomedov":{"rec":"29-0-0","w":29,"ko":8,"sub":11,"dec":10,"beat":["Barboza","Dos Anjos","Gaethje","Healy","Horcher","Iaquinta","Johnson","McGregor","Poirier","Shalorus","Tavares","Tibau","Trujillo"],"lost":[]},"Georges St-Pierre":{"rec":"26-2-0","w":26,"ko":8,"sub":6,"dec":12,"beat":["Alves","Bisping","Condit","Fitch","Hardy","Hendricks","Hieron","Hughes","Koscheck","Miller","Parisyan","Penn","Serra","Sherk","Shields","Trigg"],"lost":["Hughes","Serra"]},"Anderson Silva":{"rec":"34-11-0","beat":["Belfort","Bonnar","Brunson","Cote","Franklin","Griffin","Henderson","Irvin","Leben","Leites","Lutter","Maia","Marquardt","Okami","Sonnen"],"lost":["Adesanya","Bisping","Cannonier","Cormier","Hall","Weidman"]},"Daniel Cormier":{"rec":"22-3-0","w":22,"ko":10,"sub":5,"dec":7,"beat":["Cummins","Gustafsson","Henderson","Johnson","Lewis","Miocic","Mir","Nelson","Oezdemir","Silva"],"lost":["Jones","Miocic"]},"Francis Ngannou":{"rec":"18-3-0","w":18,"ko":13,"sub":4,"dec":1,"beat":["Arlovski","Blaydes","Gane","Hamilton","Henrique","Mihajlovic","Miocic","Overeem","Rozenstruik","Santos","Velasquez"],"lost":["Lewis","Miocic"]},"Alexander Volkanovski":{"rec":"29-4-0","w":29,"ko":14,"sub":3,"dec":12,"beat":["Aldo","Elkins","Hirota","Holloway","Jung","Kasuya","Kennedy","Lopes","Mendes","Ortega","Rodriguez","Young"],"lost":["Makhachev","Topuria"]},"Jose Aldo":{"rec":"32-10-0","w":32,"ko":17,"sub":1,"dec":14,"beat":["Edgar","Font","Hominick","Jung","Lamas","Martinez","Mendes","Moicano","Munhoz","Stephens","Vera"],"lost":["Dvalishvili","Holloway","McGregor","Moraes","Volkanovski","Yan"]},"Dustin Poirier":{"rec":"30-10-0","w":30,"ko":16,"sub":7,"dec":7,"beat":["Alvarez","Brandao","Brookins","Chandler","Duffy","Ferreira","Gaethje","Garza","Green","Holloway","Hooker","McGregor","Medeiros","Miller","Pettis","St. Denis"],"lost":["Gaethje","Holloway","Johnson","Jung","Khabib","Makhachev","Oliveira","Swanson"]},"Charles Oliveira":{"rec":"37-11-0","w":37,"ko":10,"sub":22,"dec":5,"beat":["Brooks","Chandler","Dariush","Gaethje","Gamrot","Lentz","Poirier","Teymur"],"lost":["Felder","Holloway","Lamas","Makhachev","Pettis","Topuria"]},"Demetrious Johnson":{"rec":"25-4-1","w":25,"ko":5,"sub":8,"dec":12,"beat":["Bagautinov","Benavidez","Borg","Cariaso","Cejudo","Dodson","Elliott","Horiguchi","Moraga","Reis"],"lost":["Cejudo"]},"Israel Adesanya":{"rec":"24-6-0","beat":["Brunson","Cannonier","Costa","Gastelum","Pereira","Romero","Silva","Tavares","Vettori","Whittaker","Wilkinson"],"lost":["Blachowicz","Du Plessis","Imavov","Pereira","Strickland"]},"Ilia Topuria":{"rec":"17-1-0","w":17,"ko":7,"sub":8,"dec":2,"beat":["Emmett","Hall","Herbert","Holloway","Jackson","Mitchell","Oliveira","Volkanovski","Zalal"],"lost":[]},"Yoel Romero":{"rec":"17-7-0","w":17,"ko":14,"sub":0,"dec":3,"beat":["Brunson","Kennedy","Machida","Markes","Rockhold","Souza","Starks","Tavares","Weidman"],"lost":["Adesanya","Costa","Whittaker"]}};
const COLS = "id,a,b,status,fighter,a_score,b_score,a_ms,b_ms,winner,rewarded,draw,created_at,finished_at";
let G = [], OK = false, PL = null, OUT = null, CONF = null, MSG = "", BUSY = false, T = 0, SIG = "";

const rnd = a => a[Math.floor(Math.random() * a.length)];
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uniq = a => [...new Set(a.filter(Boolean))];
const clean = s => !!s && !/[()?]|maybe|\bvs\b/i.test(s) && s.length <= 22;
const base = n => String(n).replace(/\s+\d+$/, "");
const last = n => String(n).trim().split(/\s+/).pop();
const nm = id => NAMES[id] || "Player";

/* ---------- questions ---------- */
function mk(q, right, wrongs, alt) {
  const ws = shuf(uniq(wrongs).filter(x => x !== right)).slice(0, 3);
  if (!right || ws.length < 2) return null;
  const o = shuf([right, ...ws]);
  return { q, o, a: o.indexOf(right), alt: alt || [] };
}
function gen() {
  const ALL = [];
  for (const c in D) D[c].forEach(f => ALL.push({ f, c }));
  const names = ALL.map(x => x.f.n), DIV = Object.keys(D);
  const STY = uniq(ALL.flatMap(x => x.f.base || [])).filter(clean), STR = uniq(ALL.flatMap(x => x.f.s || [])).filter(clean);
  const WK = uniq(ALL.flatMap(x => x.f.w || [])).filter(clean), NK = uniq(ALL.map(x => x.f.nick)).filter(clean);
  const RN = {}; for (const k in RES) RN[nz(k)] = RES[k];
  const sur = uniq(names.map(last));
  for (const x of shuf(ALL)) {
    const f = x.f, n = f.n, c = x.c, g = { div: [], nick: [], base: [], str: [], weak: [], opp: [], mate: [], rec: [], res: [] }, tf = [];
    const add = (k, q) => { if (q) g[k].push(q); };
    add("div", mk(`Which weight class does ${n} fight in?`, c, DIV));
    if (clean(f.nick)) add("nick", mk(`Which nickname belongs to ${n}?`, f.nick, NK));
    (f.base || []).filter(clean).forEach(b => add("base", mk(`Which of these is part of ${n}'s fighting background?`, b, STY.filter(s => !(f.base || []).includes(s)), [`Which of these did ${n} train in?`])));
    (f.s || []).filter(clean).slice(0, 2).forEach(s => add("str", mk(`Which of these is one of ${n}'s strengths?`, s, STR.filter(y => !(f.s || []).includes(y) && !(f.w || []).includes(y)), [`What is ${n} good at?`])));
    const opp = uniq((f.ff || []).concat(f.hl || []).map(o => { const p = String(o).split(/\s+vs\.?\s+/i); return base(p.length > 1 ? (p.find(z => nz(base(z)) !== nz(n)) || "") : o); })).filter(o => o && nz(o) !== nz(n)), oz = new Set(opp.map(nz));
    opp.forEach(o => add("opp", mk(`Which of these fighters has ${n} fought?`, o, names.filter(y => nz(y) !== nz(n) && !oz.has(nz(y))), [`${n} has been in the cage with which of these fighters?`])));
    const mates = ALL.filter(y => y.c === c && y.f.n !== n).map(y => y.f.n), others = ALL.filter(y => y.c !== c).map(y => y.f.n);
    shuf(mates).slice(0, 2).forEach(m => add("mate", mk(`Which of these fighters is in ${n}'s weight class?`, m, others, [`Which of these fighters competes at ${n}'s weight?`])));
    const r = RN[nz(n)];
    if (r) {
      const W = r.w || parseInt(String(r.rec).split("-")[0], 10), L = parseInt(String(r.rec).split("-")[1], 10);
      if (W) add("rec", mk(`How many wins does ${n} have on the record?`, "" + W, ["" + (W - 4), "" + (W + 3), "" + (W - 8), "" + (W + 7)].filter(v => +v > 0)));
      if (!isNaN(L)) add("rec", { q: `Is ${n} undefeated as a pro?`, o: ["Yes", "No"], a: L === 0 ? 0 : 1 });
      if (r.ko != null) { const m = [["Knockout", r.ko], ["Submission", r.sub], ["Decision", r.dec]].sort((p, q) => q[1] - p[1]); if (m[0][1] > m[1][1]) add("res", { q: `How did ${n} win most of the fights?`, o: ["Knockout", "Submission", "Decision"], a: ["Knockout", "Submission", "Decision"].indexOf(m[0][0]) }); }
      const seen = new Set((r.beat || []).concat(r.lost || []).map(nz));
      (r.beat || []).slice(0, 6).forEach(o => add("res", mk(`Which of these fighters has ${n} beaten?`, o, sur.filter(s => !seen.has(nz(s)) && nz(s) !== nz(last(n))))));
    }
    /* true / false fillers */
    const T_ = (txt, truth) => tf.push({ q: "True or false: " + txt, o: ["True", "False"], a: truth ? 0 : 1 });
    T_(`${n} fights at ${rnd([true, false]) ? c : rnd(DIV.filter(d => d !== c))}.`, null);
    tf[0].a = tf[0].q.includes(" fights at " + c + ".") ? 0 : 1;
    if ((f.base || []).length) { const t = Math.random() < 0.5, b = t ? rnd(f.base) : rnd(STY.filter(s => !f.base.includes(s))); if (b) T_(`${n} has a ${b} background.`, t); }
    if (clean(f.nick)) { const t = Math.random() < 0.5, k = t ? f.nick : rnd(NK.filter(y => y !== f.nick)); if (k) T_(`${n}'s nickname is “${k}”.`, t); }
    if (g.mate.length + 0 || mates.length) { const t = Math.random() < 0.5, o = t ? rnd(mates) : rnd(others); if (o) T_(`${o} fights in the same weight class as ${n}.`, t); }
    /* round-robin over the kinds so the quiz is varied */
    const out = [], keys = shuf(Object.keys(g)); Object.keys(g).forEach(k => { g[k] = shuf(g[k]); });
    let more = true;
    const used = new Set();
    while (out.length < 10 && more) {
      more = false;
      for (const k of keys) {
        if (out.length >= 10) break;
        while (g[k].length) {
          const q = g[k].shift(); more = true;
          let t = used.has(q.q) ? (q.alt || []).find(a => !used.has(a)) : q.q;
          if (!t) continue;
          q.q = t; used.add(t); out.push(q); break;
        }
      }
    }
    tf.forEach(q => { if (used.has(q.q)) q.q = ""; });
    for (const q of shuf(tf)) { if (q.q && out.length < 10) out.push(q); }
    if (out.length < 10) continue;
    const qs = shuf(out);
    return { fighter: n, q: qs.map(z => ({ q: z.q, o: z.o })), ans: qs.map(z => z.a) };
  }
  return null;
}
window.duelGen = gen;

/* ---------- data ---------- */
async function load() {
  if (!SB || !ME) return;
  try {
    const q = await SB.from("trivia_games").select(COLS).or("a.eq." + ME + ",b.eq." + ME).order("created_at", { ascending: false }).limit(60);
    if (q.error) throw q.error;
    G = q.data || []; OK = true;
  } catch (e) { OK = false; G = []; }
  if (OK) {
    try {
      const w = await SB.from("trivia_games").select("winner").eq("rewarded", true);
      if (!w.error) { Object.keys(DUELC).forEach(k => delete DUELC[k]); (w.data || []).forEach(x => { if (x.winner) DUELC[x.winner] = (DUELC[x.winner] || 0) + 25; }); }
    } catch (e) {}
  }
  try { hnav(); } catch (e) {}
  try { ren(); } catch (e) {}
  if (!PL) { try { window.duelShow(); } catch (e) {} }
}
window.duelLoad = load;

const mineTodo = () => G.filter(g => g.b === ME && g.b_score == null && (g.status === "invited" || g.status === "active"));
window.duelCard = () => {
  if (!OK || !ME) return "";
  const n = mineTodo().length;
  return `<button class="hcard${n ? " cshot" : ""}" onclick="openPage('duel')"><i>⚔️</i><span><b>Trivia duel</b><small>${n ? (n === 1 ? "1 player challenged you!" : n + " players challenged you!") : "Challenge a player · winner gets 25 coins"}</small></span><em>›</em></button>`;
};
window.duelBtn = id => (!OK || !ME || id === ME) ? "" : `<div class="fvt"><div><small>Trivia duel</small><b>Challenge this player</b></div><button class="fvb" type="button" onclick="duelGo('${esc(id)}')">⚔️ Challenge</button></div>`;
window.duelGo = id => { try { $("pf").close(); } catch (e) {} CONF = id; MSG = ""; openPage("duel"); };

/* ---------- page ---------- */
const side = g => { const me = g.a === ME; return { opp: me ? g.b : g.a, my: me ? g.a_score : g.b_score, th: me ? g.b_score : g.a_score }; };
function row(g) {
  const s = side(g), who = esc(nm(s.opp));
  if (g.status === "done") {
    const win = g.winner === ME, lose = g.winner && g.winner !== ME;
    const t = g.draw ? "Draw" : win ? "You won" : "You lost";
    const sub = win && g.rewarded ? "+25 coins" : win ? "No coins (daily limit)" : "";
    return `<div class="dlr ${win ? "dwin" : lose ? "dlose" : ""}"><div><b>${who}</b><small>${esc(g.fighter || "")}</small></div><div class="dls"><b dir="ltr">${s.my} – ${s.th}</b><small>${t}${sub ? " · " + sub : ""}</small></div></div>`;
  }
  if (g.status === "declined" || g.status === "cancelled") return "";
  const inv = g.b === ME && g.b_score == null, mine = s.my != null;
  const btns = mine ? "" : `<button class="fvb go" type="button" onclick="duelPlay('${g.id}')">Play</button>`;
  const no = g.b_score == null ? `<button class="fvb" type="button" onclick="duelNo('${g.id}')">${inv ? "Decline" : "Cancel"}</button>` : "";
  return `<div class="dlr ${inv ? "inv" : ""}"><div><b>${who}</b><small>${inv ? "Challenged you" : mine ? "Waiting for them to play" : "Your turn to play"}</small></div>${btns}${mine ? "" : ""}${no}</div>`;
}
function playHtml() {
  const q = PL.qs[PL.i], pct = Math.round(PL.i / PL.qs.length * 100);
  return `<div class="dlq"><div class="dlhd"><span class="dlav">${avZ(PL.fighter)}</span><div><small>Question</small><b>${PL.i + 1} / ${PL.qs.length}</b></div><button class="fvb" type="button" onclick="duelQuit()">Quit</button></div>
<div class="dlbar"><i style="width:${pct}%"></i></div><h3 class="dlqt">${esc(q.q)}</h3><div class="dlo">${q.o.map((o, k) => `<button type="button" onclick="duelAns(${k})">${esc(o)}</button>`).join("")}</div></div>`;
}
function outHtml() {
  const g = G.find(x => x.id === OUT.id), s = g ? side(g) : null;
  let end = "";
  if (g && g.status === "done") {
    const win = g.winner === ME;
    end = `<p>${g.draw ? "It is a draw. No coins." : win ? "You won!" + (g.rewarded ? " +25 coins" : " (daily coin limit reached)") : esc(nm(s.opp)) + " won this one."}</p><p class="dln">${esc(nm(s.opp))}: ${s.th} / 10</p>`;
  } else end = `<p>Waiting for ${esc(nm(s ? s.opp : null))} to play. The result shows up here when they finish.</p>`;
  return `<div class="dlres"><small>Your score</small><b>${OUT.score} / 10</b>${end}<button class="fvb go" type="button" onclick="duelBack()">Done</button></div>`;
}
window.duelShow = () => {
  const el = $("pgds"); if (!el) return;
  if (PL) { el.innerHTML = playHtml(); return; }
  if (OUT) { el.innerHTML = outHtml(); return; }
  if (!OK) { el.innerHTML = '<div class="box"><div class="pfn">The trivia duel is not available yet.</div></div>'; return; }
  const ids = Object.keys(NAMES).filter(id => id !== ME && NAMES[id]).sort((a, b) => nm(a).localeCompare(nm(b)));
  const open = new Set(G.filter(g => g.status === "invited" || g.status === "active").map(g => g.a === ME ? g.b : g.a));
  const players = ids.map(id => CONF === id
    ? `<div class="dlr conf"><div><b>${esc(nm(id))}</b><small>Send the challenge?</small></div><button class="fvb go" type="button" onclick="duelSend('${esc(id)}')">Send</button><button class="fvb" type="button" onclick="duelCf('')">Cancel</button></div>`
    : `<div class="dlr"><div><b>${esc(nm(id))}</b></div><button class="fvb" type="button" ${open.has(id) || BUSY ? "disabled" : ""} onclick="duelCf('${esc(id)}')">⚔️ Challenge</button></div>`).join("");
  const todo = G.filter(g => (g.status === "invited" || g.status === "active")).map(row).join("");
  const done = G.filter(g => g.status === "done").slice(0, 8).map(row).join("");
  el.innerHTML = `<div class="dlbox"><b>1v1 Trivia duel</b><p>10 easy questions about one random fighter. The player with the most right answers wins 25 coins. A tie goes to whoever answered faster.</p></div>
${MSG ? `<div class="dlm" role="status">${esc(MSG)}</div>` : ""}
${todo ? `<h3 class="dlh3">Your games</h3>${todo}` : ""}
<h3 class="dlh3">Challenge a player</h3>${players || '<div class="pfn">No other players yet.</div>'}
${done ? `<h3 class="dlh3">Results</h3>${done}` : ""}`;
};
window.duelCf = id => { CONF = id || null; MSG = ""; window.duelShow(); };

/* ---------- actions ---------- */
async function push(id) {
  try {
    const s = (await SB.auth.getSession()).data.session; if (!s) return;
    await fetch(SUPA_URL + "/functions/v1/send-push?challenge=" + encodeURIComponent(id) + "&name=" + encodeURIComponent(String(NAMES[ME] || "").slice(0, 24)), { method: "POST", headers: { Authorization: "Bearer " + s.access_token, apikey: SUPA_KEY } });
  } catch (e) {}
}
window.duelSend = async to => {
  if (BUSY) return; BUSY = true; MSG = ""; CONF = null;
  try {
    const g = gen(); if (!g) throw new Error("no questions");
    const r = await SB.rpc("trivia_create", { p_to: to, p_fighter: g.fighter, p_q: g.q, p_ans: g.ans });
    if (r.error) throw r.error;
    push(r.data);
    BUSY = false;
    await load();
    startPlay({ id: r.data, fighter: g.fighter, qs: g.q });
  } catch (e) {
    BUSY = false;
    const t = String((e && e.message) || e);
    MSG = /already open/i.test(t) ? "You already have an open game with this player." : /too many/i.test(t) ? "You sent too many challenges today. Try again tomorrow." : "Could not send the challenge. Try again.";
    window.duelShow();
  }
};
function startPlay(p) { PL = { id: p.id, fighter: p.fighter, qs: p.qs, i: 0, picks: [], t0: Date.now() }; OUT = null; window.duelShow(); const e = $("pgD"); if (e) e.scrollTop = 0; }
window.duelPlay = async id => {
  if (BUSY) return; BUSY = true;
  try {
    const q = await SB.from("trivia_games").select("id,fighter,questions").eq("id", id).single();
    if (q.error || !q.data) throw q.error || 0;
    BUSY = false; startPlay({ id, fighter: q.data.fighter, qs: q.data.questions });
  } catch (e) { BUSY = false; MSG = "Could not open the game. Try again."; window.duelShow(); }
};
window.duelAns = k => {
  if (!PL || PL.lock) return;
  PL.lock = true; PL.picks.push(k);
  const bs = document.querySelectorAll(".dlo button"); if (bs[k]) bs[k].classList.add("on");
  setTimeout(() => {
    if (!PL) return;
    PL.lock = false; PL.i++;
    if (PL.i >= PL.qs.length) finish(); else window.duelShow();
  }, 260);
};
async function finish() {
  const p = PL, ms = Date.now() - p.t0;
  const el = $("pgds"); if (el) el.innerHTML = '<div class="box"><div class="pfn">Saving your answers…</div></div>';
  try {
    const r = await SB.rpc("trivia_submit", { p_game: p.id, p_picks: p.picks, p_ms: ms });
    if (r.error) throw r.error;
    PL = null; OUT = { id: p.id, score: r.data };
    await load(); window.duelShow();
  } catch (e) {
    PL = null; MSG = /already played/i.test(String((e && e.message) || e)) ? "You already played this game." : "Could not save your answers. Open the game and try again.";
    await load(); window.duelShow();
  }
}
window.duelQuit = () => { PL = null; window.duelShow(); };
window.duelBack = () => { OUT = null; window.duelShow(); };
window.duelNo = async id => {
  try { const r = await SB.rpc("trivia_decline", { p_game: id }); if (r.error) throw r.error; } catch (e) { MSG = "Could not change the game. Try again."; }
  await load(); window.duelShow();
};
/* leaving the page ends any quiz in progress */
const cp = window.closePage;
window.closePage = function () { PL = null; OUT = null; CONF = null; MSG = ""; return cp.apply(this, arguments); };

/* ---------- start ---------- */
(function w(n) {
  try { if (ME && SB) { load(); SB.channel("duel").on("postgres_changes", { event: "*", schema: "public", table: "trivia_games" }, () => { clearTimeout(T); T = setTimeout(load, 500); }).subscribe(); return; } } catch (e) {}
  if (n < 40) setTimeout(() => w(n + 1), 400);
})(0);
document.addEventListener("visibilitychange", () => { if (!document.hidden && ME) { try { load(); } catch (e) {} } });
})();
