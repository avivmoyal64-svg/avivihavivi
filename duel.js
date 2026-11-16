/* 1v1 trivia duels: 10 easy multiple-choice questions. Five kinds of duel. Loaded after the main script (shares its globals). */
(function () {
"use strict";
const RES = {"Islam Makhachev":{"rec":"29-1-0","w":29,"ko":5,"sub":13,"dec":11,"beat":["Della Maddalena","Dober","Garry","Green","Hooker","Johnson","Kuntz","Lentz","Moicano","Moises","Oliveira","Poirier","Ramos","Tibau","Tsarukyan","Volkanovski","Wade"],"lost":["Martins"]},"Jon Jones":{"rec":"28-1-0","w":28,"ko":11,"sub":7,"dec":10,"beat":["Bader","Belfort","Bonnar","Cormier","Evans","Gane","Gusmao","Gustafsson","Jackson","Machida","Miocic","O'Brien","Reyes","Rua","Santos","Smith","Sonnen","St-Preux","Teixeira","Vera","Vladimir"],"lost":["Hamill"]},"Conor McGregor":{"rec":"22-7-0","w":22,"ko":19,"sub":1,"dec":2,"beat":["Aldo","Alvarez","Brandao","Brimage","Cerrone","Diaz","Holloway","Mendes","Poirier","Siver"],"lost":["Diaz","Khabib","Poirier"]},"Khabib Nurmagomedov":{"rec":"29-0-0","w":29,"ko":8,"sub":11,"dec":10,"beat":["Barboza","Dos Anjos","Gaethje","Healy","Horcher","Iaquinta","Johnson","McGregor","Poirier","Shalorus","Tavares","Tibau","Trujillo"],"lost":[]},"Georges St-Pierre":{"rec":"26-2-0","w":26,"ko":8,"sub":6,"dec":12,"beat":["Alves","Bisping","Condit","Fitch","Hardy","Hendricks","Hieron","Hughes","Koscheck","Miller","Parisyan","Penn","Serra","Sherk","Shields","Trigg"],"lost":["Hughes","Serra"]},"Anderson Silva":{"rec":"34-11-0","beat":["Belfort","Bonnar","Brunson","Cote","Franklin","Griffin","Henderson","Irvin","Leben","Leites","Lutter","Maia","Marquardt","Okami","Sonnen"],"lost":["Adesanya","Bisping","Cannonier","Cormier","Hall","Weidman"]},"Daniel Cormier":{"rec":"22-3-0","w":22,"ko":10,"sub":5,"dec":7,"beat":["Cummins","Gustafsson","Henderson","Johnson","Lewis","Miocic","Mir","Nelson","Oezdemir","Silva"],"lost":["Jones","Miocic"]},"Francis Ngannou":{"rec":"18-3-0","w":18,"ko":13,"sub":4,"dec":1,"beat":["Arlovski","Blaydes","Gane","Hamilton","Henrique","Mihajlovic","Miocic","Overeem","Rozenstruik","Santos","Velasquez"],"lost":["Lewis","Miocic"]},"Alexander Volkanovski":{"rec":"29-4-0","w":29,"ko":14,"sub":3,"dec":12,"beat":["Aldo","Elkins","Hirota","Holloway","Jung","Kasuya","Kennedy","Lopes","Mendes","Ortega","Rodriguez","Young"],"lost":["Makhachev","Topuria"]},"Jose Aldo":{"rec":"32-10-0","w":32,"ko":17,"sub":1,"dec":14,"beat":["Edgar","Font","Hominick","Jung","Lamas","Martinez","Mendes","Moicano","Munhoz","Stephens","Vera"],"lost":["Dvalishvili","Holloway","McGregor","Moraes","Volkanovski","Yan"]},"Dustin Poirier":{"rec":"30-10-0","w":30,"ko":16,"sub":7,"dec":7,"beat":["Alvarez","Brandao","Brookins","Chandler","Duffy","Ferreira","Gaethje","Garza","Green","Holloway","Hooker","McGregor","Medeiros","Miller","Pettis","St. Denis"],"lost":["Gaethje","Holloway","Johnson","Jung","Khabib","Makhachev","Oliveira","Swanson"]},"Charles Oliveira":{"rec":"37-11-0","w":37,"ko":10,"sub":22,"dec":5,"beat":["Brooks","Chandler","Dariush","Gaethje","Gamrot","Lentz","Poirier","Teymur"],"lost":["Felder","Holloway","Lamas","Makhachev","Pettis","Topuria"]},"Demetrious Johnson":{"rec":"25-4-1","w":25,"ko":5,"sub":8,"dec":12,"beat":["Bagautinov","Benavidez","Borg","Cariaso","Cejudo","Dodson","Elliott","Horiguchi","Moraga","Reis"],"lost":["Cejudo"]},"Israel Adesanya":{"rec":"24-6-0","beat":["Brunson","Cannonier","Costa","Gastelum","Pereira","Romero","Silva","Tavares","Vettori","Whittaker","Wilkinson"],"lost":["Blachowicz","Du Plessis","Imavov","Pereira","Strickland"]},"Ilia Topuria":{"rec":"17-1-0","w":17,"ko":7,"sub":8,"dec":2,"beat":["Emmett","Hall","Herbert","Holloway","Jackson","Mitchell","Oliveira","Volkanovski","Zalal"],"lost":[]},"Yoel Romero":{"rec":"17-7-0","w":17,"ko":14,"sub":0,"dec":3,"beat":["Brunson","Kennedy","Machida","Markes","Rockhold","Souza","Starks","Tavares","Weidman"],"lost":["Adesanya","Costa","Whittaker"]}};
const COLS = "id,a,b,status,mode,topic,fighter,reward,a_score,b_score,a_ms,b_ms,winner,rewarded,draw,ready,created_at,finished_at";
const MODES = {
  random:  { c: 25, i: "🎲", t: "Random fighter",     d: "10 questions about a random fighter" },
  "class": { c: 10, i: "🏋️", t: "Weight class",       d: "Questions about the fighters of one division" },
  fighter: { c: 10, i: "🥊", t: "Specific fighter",   d: "Pick one fighter to be quizzed on" },
  card:    { c: 10, i: "📅", t: "This week's card",   d: "Questions about the fighters on the upcoming card" },
  fav:     { c: 15, i: "🔄", t: "Fighter swap",       d: "You each pick a fighter. Your opponent is quizzed on yours and you on theirs" }
};
let G = [], OK = false, PL = null, OUT = null, CH = null, MSG = "", BUSY = false, T = 0;

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
let CTX = null;
function ctx() {
  const ALL = [];
  for (const c in D) D[c].forEach(f => ALL.push({ f, c }));
  const names = ALL.map(x => x.f.n), RN = {};
  for (const k in RES) RN[nz(k)] = RES[k];
  return CTX = {
    ALL, names, RN, DIV: Object.keys(D),
    STY: uniq(ALL.flatMap(x => x.f.base || [])).filter(clean), STR: uniq(ALL.flatMap(x => x.f.s || [])).filter(clean),
    NK: uniq(ALL.map(x => x.f.nick)).filter(clean), sur: uniq(names.map(last))
  };
}
const entry = (C, n) => C.ALL.find(x => nz(x.f.n) === nz(n));

/* every question we can ask about one fighter: groups of "real" questions plus true/false fillers */
function cands(x, C) {
  const f = x.f, n = f.n, c = x.c, g = { div: [], nick: [], base: [], str: [], opp: [], mate: [], rec: [], res: [] }, tf = [];
  const add = (k, q) => { if (q) g[k].push(q); };
  add("div", mk(`Which weight class does ${n} fight in?`, c, C.DIV));
  if (clean(f.nick)) add("nick", mk(`Which nickname belongs to ${n}?`, f.nick, C.NK));
  (f.base || []).filter(clean).forEach(b => add("base", mk(`Which of these is part of ${n}'s fighting background?`, b, C.STY.filter(s => !(f.base || []).includes(s)), [`Which of these did ${n} train in?`])));
  (f.s || []).filter(clean).slice(0, 2).forEach(s => add("str", mk(`Which of these is one of ${n}'s strengths?`, s, C.STR.filter(y => !(f.s || []).includes(y) && !(f.w || []).includes(y)), [`What is ${n} good at?`])));
  const opp = uniq((f.ff || []).concat(f.hl || []).map(o => { const p = String(o).split(/\s+vs\.?\s+/i); return base(p.length > 1 ? (p.find(z => nz(base(z)) !== nz(n)) || "") : o); })).filter(o => o && nz(o) !== nz(n)), oz = new Set(opp.map(nz));
  opp.forEach(o => add("opp", mk(`Which of these fighters has ${n} fought?`, o, C.names.filter(y => nz(y) !== nz(n) && !oz.has(nz(y))), [`${n} has been in the cage with which of these fighters?`])));
  const mates = C.ALL.filter(y => y.c === c && y.f.n !== n).map(y => y.f.n), others = C.ALL.filter(y => y.c !== c).map(y => y.f.n);
  shuf(mates).slice(0, 2).forEach(m => add("mate", mk(`Which of these fighters is in ${n}'s weight class?`, m, others, [`Which of these fighters competes at ${n}'s weight?`])));
  const r = C.RN[nz(n)];
  if (r) {
    const W = r.w || parseInt(String(r.rec).split("-")[0], 10), L = parseInt(String(r.rec).split("-")[1], 10);
    if (W) add("rec", mk(`How many wins does ${n} have on the record?`, "" + W, ["" + (W - 4), "" + (W + 3), "" + (W - 8), "" + (W + 7)].filter(v => +v > 0)));
    if (!isNaN(L)) add("rec", { q: `Is ${n} undefeated as a pro?`, o: ["Yes", "No"], a: L === 0 ? 0 : 1, alt: [] });
    if (r.ko != null) { const m = [["Knockout", r.ko], ["Submission", r.sub], ["Decision", r.dec]].sort((p, q) => q[1] - p[1]); if (m[0][1] > m[1][1]) add("res", { q: `How did ${n} win most of the fights?`, o: ["Knockout", "Submission", "Decision"], a: ["Knockout", "Submission", "Decision"].indexOf(m[0][0]), alt: [] }); }
    const seen = new Set((r.beat || []).concat(r.lost || []).map(nz));
    (r.beat || []).slice(0, 6).forEach(o => add("res", mk(`Which of these fighters has ${n} beaten?`, o, C.sur.filter(s => !seen.has(nz(s)) && nz(s) !== nz(last(n))), [`Which of these fighters lost to ${n}?`])));
  }
  const T_ = (txt, truth) => tf.push({ q: "True or false: " + txt, o: ["True", "False"], a: truth ? 0 : 1, alt: [] });
  { const t = Math.random() < 0.5; T_(`${n} fights at ${t ? c : rnd(C.DIV.filter(d => d !== c))}.`, t); }
  if ((f.base || []).length) { const t = Math.random() < 0.5, b = t ? rnd(f.base) : rnd(C.STY.filter(s => !f.base.includes(s))); if (clean(b)) T_(`${n} has a ${b} background.`, t); }
  if (clean(f.nick)) { const t = Math.random() < 0.5, k = t ? f.nick : rnd(C.NK.filter(y => y !== f.nick)); if (k) T_(`${n}'s nickname is “${k}”.`, t); }
  if (mates.length) { const t = Math.random() < 0.5, o = t ? rnd(mates) : rnd(others); if (o) T_(`${o} fights in the same weight class as ${n}.`, t); }
  /* extra fillers, only used when a fighter has little data */
  const pad = C.DIV.filter(d => d !== c).map(d => ({ q: `True or false: ${n} fights at ${d}.`, o: ["True", "False"], a: 1, alt: [] }));
  return { g, tf, pad };
}
/* fill 10 slots round-robin over the queues; repeated question text gets its alternative wording */
function rr(queues, need, used, dupOk) {
  const out = []; let more = true;
  queues = queues.map(q => q.slice());
  while (out.length < need && more) {
    more = false;
    for (const q of queues) {
      if (out.length >= need) break;
      while (q.length) {
        const z = q.shift(); more = true;
        let t = z.q;
        if (!dupOk && used.has(t)) t = (z.alt || []).find(a => !used.has(a)); 
        if (!t) continue;
        z.q = t; used.add(t); out.push(z); break;
      }
    }
  }
  return out;
}
function setFor(x, C) {
  const { g, tf, pad } = cands(x, C), used = new Set();
  const qs = shuf(Object.keys(g)).map(k => shuf(g[k]));
  let out = rr(qs, 10, used);
  if (out.length < 10) out = out.concat(rr([shuf(tf)], 10 - out.length, used));
  if (out.length < 10) out = out.concat(rr([shuf(pad)], 10 - out.length, used));
  return out.length === 10 ? shuf(out) : null;
}
const pack = (fighter, out) => ({ fighter, q: out.map(z => ({ q: z.q, o: z.o })), ans: out.map(z => z.a) });

function genRandom() {
  const C = ctx();
  for (const x of shuf(C.ALL)) { const o = setFor(x, C); if (o) return pack(x.f.n, o); }
  return null;
}
function genFighter(name) {
  const C = ctx(), x = entry(C, name); if (!x) return null;
  const o = setFor(x, C); return o ? pack(x.f.n, o) : null;
}
function genClass(cls) {
  const C = ctx(), mem = shuf(C.ALL.filter(x => x.c === cls)), out = [], pick = [];
  const A = [], B = [], Cc = [], Dd = [];
  const aT = [`Which of these fighters is in the ${cls} division?`, `Which of these fighters competes at ${cls}?`, `Who fights at ${cls}?`];
  const outside = C.ALL.filter(x => x.c !== cls).map(x => x.f.n);
  mem.slice(0, 7).forEach((x, i) => A.push(mk(aT[i % 3], x.f.n, outside)));
  mem.filter(x => clean(x.f.nick)).slice(0, 5).forEach(x => B.push(mk(`Who is known as “${x.f.nick}”?`, x.f.n, mem.map(y => y.f.n))));
  shuf(mem).slice(0, 4).forEach(x => Cc.push(mk(`Which weight class does ${x.f.n} fight in?`, cls, C.DIV)));
  shuf(mem).filter(x => (x.f.base || []).some(clean)).slice(0, 4).forEach(x => { const b = (x.f.base || []).filter(clean)[0]; Dd.push(mk(`Which of these fighters has a ${b} background?`, x.f.n, C.ALL.filter(y => !(y.f.base || []).includes(b)).map(y => y.f.n))); });
  const q = rr([A, B, Cc, Dd].map(a => a.filter(Boolean)), 10, new Set(), true);
  return q.length === 10 ? pack(cls, shuf(q)) : null;
}
const cardFighters = () => { const C = ctx(), L = []; (EV.fights || []).forEach(f => [f.a, f.b].forEach(n => { const x = n && entry(C, n); if (x && !L.some(y => y.f.n === x.f.n)) L.push(x); })); return L; };
function genCard() {
  const C = ctx(), L = shuf(cardFighters()); if (L.length < 3) return null;
  const used = new Set(), queues = L.map(x => { const { g } = cands(x, C); const ks = shuf(Object.keys(g)); const il = []; for (let r = 0; r < 4; r++) ks.forEach(k => { if (g[k][r]) il.push(g[k][r]); }); return shuf(il).slice(0, 3); });
  let out = rr(queues, 10, used);
  if (out.length < 10) out = out.concat(rr(L.map(x => shuf(cands(x, C).tf)), 10 - out.length, used));
  return out.length === 10 ? pack("This week's card", shuf(out)) : null;
}
window.duelGen = genRandom; window.duelGenFighter = genFighter; window.duelGenClass = genClass; window.duelGenCard = genCard;

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
      const w = await SB.from("trivia_games").select("winner,reward").eq("rewarded", true);
      if (!w.error) { Object.keys(DUELC).forEach(k => delete DUELC[k]); (w.data || []).forEach(x => { if (x.winner) DUELC[x.winner] = (DUELC[x.winner] || 0) + (x.reward || 25); }); }
    } catch (e) {}
  }
  try { hnav(); } catch (e) {}
  try { ren(); } catch (e) {}
  if (!PL && !(CH && /^(fighter|swap1|swapb)$/.test(CH.step))) { try { window.duelShow(); } catch (e) {} }
}
window.duelLoad = load;

const live = g => g.status === "invited" || g.status === "active";
const mineTodo = () => G.filter(g => g.b === ME && g.b_score == null && live(g));
const myTurn = () => G.filter(g => g.mode === "fav" && g.a === ME && g.ready && g.a_score == null && live(g));
window.duelCard = () => {
  if (!OK || !ME) return "";
  const n = mineTodo().length, t = myTurn().length;
  return `<button class="hcard${n || t ? " cshot" : ""}" onclick="openPage('duel')"><i>⚔️</i><span><b>Trivia duel</b><small>${n ? (n === 1 ? "1 player challenged you!" : n + " players challenged you!") : t ? "Your fighter duel is ready to play!" : "Challenge a player · win up to 25 coins"}</small></span><em>›</em></button>`;
};
window.duelBtn = id => (!OK || !ME || id === ME) ? "" : `<div class="fvt"><div><small>Trivia duel</small><b>Challenge this player</b></div><button class="fvb" type="button" onclick="duelGo('${esc(id)}')">⚔️ Challenge</button></div>`;
window.duelGo = id => { try { $("pf").close(); } catch (e) {} CH = { to: id, step: "mode" }; MSG = ""; openPage("duel"); };
function $(id) { return document.getElementById(id); }

/* ---------- page ---------- */
const side = g => { const me = g.a === ME; return { opp: me ? g.b : g.a, my: me ? g.a_score : g.b_score, th: me ? g.b_score : g.a_score }; };
const mlab = g => { const m = MODES[g.mode] || MODES.random; return m.i + " " + m.t; };
function row(g) {
  const s = side(g), who = esc(nm(s.opp)), sub0 = `<span>${mlab(g)}</span> · ${esc(g.topic || g.fighter || "")}`;
  if (g.status === "done") {
    const win = g.winner === ME, lose = g.winner && g.winner !== ME;
    const t = g.draw ? "Draw" : win ? "You won" : "You lost";
    const sub = win && g.rewarded ? "+" + (g.reward || 25) + " coins" : win ? "No coins (daily limit)" : "";
    return `<div class="dlr ${win ? "dwin" : lose ? "dlose" : ""}"><div><b>${who}</b><small>${sub0}</small></div><div class="dls"><b dir="ltr">${s.my} – ${s.th}</b><small>${t}${sub ? " · " + sub : ""}</small></div></div>`;
  }
  if (g.status === "declined" || g.status === "cancelled") return "";
  const inv = g.b === ME && g.b_score == null, mine = s.my != null, wait = g.mode === "fav" && g.a === ME && !g.ready;
  const btns = (mine || wait) ? "" : `<button class="fvb go" type="button" onclick="duelPlay('${g.id}')">Play</button>`;
  const no = g.b_score == null ? `<button class="fvb" type="button" onclick="duelNo('${g.id}')">${inv ? "Decline" : "Cancel"}</button>` : "";
  return `<div class="dlr ${inv ? "inv" : ""}"><div><b>${who}</b><small>${inv ? "Challenged you" : wait ? "Waiting for them to pick a fighter" : mine ? "Waiting for them to play" : "Your turn to play"}</small><small>${sub0}</small></div>${btns}${no}</div>`;
}
function playHtml() {
  const q = PL.qs[PL.i], pct = Math.round(PL.i / PL.qs.length * 100);
  return `<div class="dlq"><div class="dlhd"><span class="dlav">${findF(PL.fighter) ? avZ(PL.fighter) : "<i>⚔️</i>"}</span><div><small>Question</small><b>${PL.i + 1} / ${PL.qs.length}</b></div><button class="fvb" type="button" onclick="duelQuit()">Quit</button></div>
<div class="dlbar"><i style="width:${pct}%"></i></div><h3 class="dlqt">${esc(q.q)}</h3><div class="dlo">${q.o.map((o, k) => `<button type="button" onclick="duelAns(${k})">${esc(o)}</button>`).join("")}</div></div>`;
}
function outHtml() {
  const g = G.find(x => x.id === OUT.id), s = g ? side(g) : null;
  let end = "";
  if (g && g.status === "done") {
    const win = g.winner === ME;
    end = `<p>${g.draw ? "It is a draw. No coins." : win ? (g.rewarded ? "You won! +" + (g.reward || 25) + " coins" : "You won! (daily coin limit reached)") : esc(nm(s.opp)) + " won this one."}</p><p class="dln">${esc(nm(s.opp))}: ${s.th} / 10</p>`;
  } else end = `<p>Waiting for ${esc(nm(s ? s.opp : null))} to play. The result shows up here when they finish.</p>`;
  return `<div class="dlres"><small>Your score</small><b>${OUT.score} / 10</b>${end}<button class="fvb go" type="button" onclick="duelBack()">Done</button></div>`;
}
function panel() {
  const id = CH.to, nmE = esc(nm(id)), head = `<div class="dlpt"><div><b>${nmE}</b><small>${CH.step === "mode" ? "Choose a duel type" : CH.step === "class" ? "Choose a weight class" : CH.step === "swap1" ? "Choose the fighter your opponent gets questions on" : "Choose a fighter"}</small></div><button class="fvb" type="button" onclick="duelCf('')">Cancel</button></div>`;
  if (CH.step === "class") return `<div class="dlr conf dlpn">${head}<div class="dlcl">${Object.keys(D).map(c => `<button type="button" onclick="duelSend('class','${esc(c)}')">${esc(c)}</button>`).join("")}</div><button class="fvb" type="button" onclick="duelStep('mode')">‹ Back</button></div>`;
  if (CH.step === "fighter" || CH.step === "swap1") return `<div class="dlr conf dlpn">${head}<input class="gpq" id="dlfq" type="search" placeholder="Search a fighter" autocomplete="off" oninput="duelFq(this.value)"><div class="dlfl" id="dlfl"></div><button class="fvb" type="button" onclick="duelStep('mode')">‹ Back</button></div>`;
  const cardOk = cardFighters().length >= 3;
  const opt = (k, ok, why, act) => { const m = MODES[k]; return `<button class="dlmo" type="button" ${ok ? "" : "disabled"} onclick="${act}"><i>${m.i}</i><span><b>${m.t}</b><small>${ok ? m.d : why}</small></span><em>${m.c} coins</em></button>`; };
  return `<div class="dlr conf dlpn">${head}<div class="dlmos">${opt("random", 1, "", "duelSend('random','')")}${opt("class", 1, "", "duelStep('class')")}${opt("fighter", 1, "", "duelStep('fighter')")}${opt("card", cardOk, "Not enough profiled fighters on this week's card", "duelSend('card','')")}${opt("fav", 1, "", "duelStep('swap1')")}</div></div>`;
}
window.duelShow = () => {
  const el = $("pgds"); if (!el) return;
  if (PL) { el.innerHTML = playHtml(); return; }
  if (OUT) { el.innerHTML = outHtml(); return; }
  if (!OK) { el.innerHTML = '<div class="box"><div class="pfn">The trivia duel is not available yet.</div></div>'; return; }
  if (CH && CH.step === "swapb") {
    el.innerHTML = `<div class="dlbox"><b>${esc(nm(CH.opp))}</b><p>${esc(MSG) || "Choose the fighter your challenger gets questions on"}</p></div><div class="dlr conf dlpn"><input class="gpq" id="dlfq" type="search" placeholder="Search a fighter" autocomplete="off" oninput="duelFq(this.value)"><div class="dlfl" id="dlfl"></div><button class="fvb" type="button" onclick="duelCf('')">Cancel</button></div>`;
    window.duelFq($("dlfq") ? $("dlfq").value : ""); return;
  }
  const ids = Object.keys(NAMES).filter(id => id !== ME && NAMES[id]).sort((a, b) => nm(a).localeCompare(nm(b)));
  const open = new Set(G.filter(g => g.status === "invited" || g.status === "active").map(g => g.a === ME ? g.b : g.a));
  const players = ids.map(id => CH && CH.to === id ? panel()
    : `<div class="dlr"><div><b>${esc(nm(id))}</b></div><button class="fvb" type="button" ${open.has(id) || BUSY ? "disabled" : ""} onclick="duelCf('${esc(id)}')">⚔️ Challenge</button></div>`).join("");
  const todo = G.filter(g => (g.status === "invited" || g.status === "active")).map(row).join("");
  const done = G.filter(g => g.status === "done").slice(0, 8).map(row).join("");
  el.innerHTML = `<div class="dlbox"><b>1v1 Trivia duel</b><p>10 easy questions. The player with the most right answers wins the coins. A tie goes to whoever answered faster. Pick a duel type when you challenge someone: random fighter 25 coins, weight class 10, a specific fighter 10, this week's card 10, or fighter swap 15.</p></div>
${MSG ? `<div class="dlm" role="status">${esc(MSG)}</div>` : ""}
${todo ? `<h3 class="dlh3">Your games</h3>${todo}` : ""}
<h3 class="dlh3">Challenge a player</h3>${players || '<div class="pfn">No other players yet.</div>'}
${done ? `<h3 class="dlh3">Results</h3>${done}` : ""}`;
  if (CH && /^(fighter|swap1|swapb)$/.test(CH.step)) window.duelFq($("dlfq") ? $("dlfq").value : "");
};
window.duelCf = id => { CH = id ? { to: id, step: "mode" } : null; MSG = ""; window.duelShow(); };
window.duelStep = s => { if (CH) { CH.step = s; window.duelShow(); } };
window.duelPickF = n => {
  if (!CH) return;
  if (CH.step === "swap1") window.duelSend("fav", n);
  else if (CH.step === "swapb") setA(n);
  else window.duelSend("fighter", n);
};
window.duelFq = v => {
  const out = $("dlfl"); if (!out) return;
  const k = nz(v || ""), all = [];
  for (const c in D) D[c].forEach(f => all.push([f.n, c]));
  const r = all.filter(x => !k || nz(x[0]).includes(k)).sort((a, b) => a[0].localeCompare(b[0])).slice(0, 12);
  out.innerHTML = r.map(x => `<button type="button" data-n="${esc(x[0])}" onclick="duelPickF(this.dataset.n)">${avZ(x[0]).replace("<i ", '<i class="ga" ')}<span>${esc(x[0])}</span><small>${esc(x[1])}</small></button>`).join("") || '<div class="pfn">No match.</div>';
};

/* ---------- actions ---------- */
async function push(id) {
  try {
    const s = (await SB.auth.getSession()).data.session; if (!s) return;
    await fetch(SUPA_URL + "/functions/v1/send-push?challenge=" + encodeURIComponent(id) + "&name=" + encodeURIComponent(String(NAMES[ME] || "").slice(0, 24)), { method: "POST", headers: { Authorization: "Bearer " + s.access_token, apikey: SUPA_KEY } });
  } catch (e) {}
}
window.duelSend = async (mode, topic) => {
  if (BUSY || !CH) return;
  const to = CH.to; BUSY = true; MSG = ""; CH = null;
  try {
    let g;
    if (mode === "class") g = genClass(topic);
    else if (mode === "fighter") g = genFighter(topic);
    else if (mode === "card") g = genCard();
    else if (mode === "fav") { g = genFighter(topic); }
    else g = genRandom();
    if (!g) throw new Error("no questions");
    const args = { p_to: to, p_mode: mode, p_topic: (mode === "random" ? g.fighter : topic) || g.fighter, p_fighter: g.fighter, p_q: g.q, p_ans: g.ans };
    const r = await SB.rpc("trivia_create", args);
    if (r.error) throw r.error;
    push(r.data);
    BUSY = false;
    await load();
    if (mode === "fav") { MSG = "Challenge sent. You get your questions once they pick a fighter for you."; window.duelShow(); }
    else startPlay({ id: r.data, fighter: g.fighter, qs: g.q });
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
    const q = await SB.from("trivia_games").select("id,a,b,mode,ready,fighter,fighter_b,questions,questions_b").eq("id", id).single();
    if (q.error || !q.data) throw q.error || 0;
    const d = q.data, mineB = d.mode === "fav" && d.b === ME;
    if (mineB && !d.ready) { BUSY = false; CH = { step: "swapb", game: id, opp: d.a }; MSG = ""; window.duelShow(); return; }
    BUSY = false; startPlay({ id, fighter: mineB ? d.fighter_b : d.fighter, qs: mineB ? d.questions_b : d.questions });
  } catch (e) { BUSY = false; MSG = "Could not open the game. Try again."; window.duelShow(); }
};
async function setA(n) {
  const gid = CH && CH.game; if (!gid || BUSY) return;
  BUSY = true;
  try {
    const g = genFighter(n); if (!g) throw new Error("no questions");
    const r = await SB.rpc("trivia_set_a", { p_game: gid, p_fighter: g.fighter, p_q: g.q, p_ans: g.ans });
    if (r.error) throw r.error;
    BUSY = false; CH = null; await load(); await window.duelPlay(gid);
  } catch (e) { BUSY = false; MSG = "Could not save your pick. Try again."; window.duelShow(); }
}
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
const cp = window.closePage;
window.closePage = function () { PL = null; OUT = null; CH = null; MSG = ""; return cp.apply(this, arguments); };

/* ---------- start ---------- */
(function w(n) {
  try { if (ME && SB) { load(); SB.channel("duel").on("postgres_changes", { event: "*", schema: "public", table: "trivia_games" }, () => { clearTimeout(T); T = setTimeout(load, 500); }).subscribe(); return; } } catch (e) {}
  if (n < 40) setTimeout(() => w(n + 1), 400);
})(0);
document.addEventListener("visibilitychange", () => { if (!document.hidden && ME) { try { load(); } catch (e) {} } });
})();
