/* 1v1 trivia duels: 10 easy multiple-choice questions. Five kinds of duel. Loaded after the main script (shares its globals). */
(function () {
"use strict";
const RES = {"Islam Makhachev":{"rec":"29-1-0","w":29,"ko":5,"sub":13,"dec":11,"beat":["Della Maddalena","Dober","Garry","Green","Hooker","Johnson","Kuntz","Lentz","Moicano","Moises","Oliveira","Poirier","Ramos","Tibau","Tsarukyan","Volkanovski","Wade"],"lost":["Martins"]},"Jon Jones":{"rec":"28-1-0","w":28,"ko":11,"sub":7,"dec":10,"beat":["Bader","Belfort","Bonnar","Cormier","Evans","Gane","Gusmao","Gustafsson","Jackson","Machida","Miocic","O'Brien","Reyes","Rua","Santos","Smith","Sonnen","St-Preux","Teixeira","Vera","Vladimir"],"lost":["Hamill"]},"Conor McGregor":{"rec":"22-7-0","w":22,"ko":19,"sub":1,"dec":2,"beat":["Aldo","Alvarez","Brandao","Brimage","Cerrone","Diaz","Holloway","Mendes","Poirier","Siver"],"lost":["Diaz","Khabib","Poirier"]},"Khabib Nurmagomedov":{"rec":"29-0-0","w":29,"ko":8,"sub":11,"dec":10,"beat":["Barboza","Dos Anjos","Gaethje","Healy","Horcher","Iaquinta","Johnson","McGregor","Poirier","Shalorus","Tavares","Tibau","Trujillo"],"lost":[]},"Georges St-Pierre":{"rec":"26-2-0","w":26,"ko":8,"sub":6,"dec":12,"beat":["Alves","Bisping","Condit","Fitch","Hardy","Hendricks","Hieron","Hughes","Koscheck","Miller","Parisyan","Penn","Serra","Sherk","Shields","Trigg"],"lost":["Hughes","Serra"]},"Anderson Silva":{"rec":"34-11-0","beat":["Belfort","Bonnar","Brunson","Cote","Franklin","Griffin","Henderson","Irvin","Leben","Leites","Lutter","Maia","Marquardt","Okami","Sonnen"],"lost":["Adesanya","Bisping","Cannonier","Cormier","Hall","Weidman"]},"Daniel Cormier":{"rec":"22-3-0","w":22,"ko":10,"sub":5,"dec":7,"beat":["Cummins","Gustafsson","Henderson","Johnson","Lewis","Miocic","Mir","Nelson","Oezdemir","Silva"],"lost":["Jones","Miocic"]},"Francis Ngannou":{"rec":"18-3-0","w":18,"ko":13,"sub":4,"dec":1,"beat":["Arlovski","Blaydes","Gane","Hamilton","Henrique","Mihajlovic","Miocic","Overeem","Rozenstruik","Santos","Velasquez"],"lost":["Lewis","Miocic"]},"Alexander Volkanovski":{"rec":"29-4-0","w":29,"ko":14,"sub":3,"dec":12,"beat":["Aldo","Elkins","Hirota","Holloway","Jung","Kasuya","Kennedy","Lopes","Mendes","Ortega","Rodriguez","Young"],"lost":["Makhachev","Topuria"]},"Jose Aldo":{"rec":"32-10-0","w":32,"ko":17,"sub":1,"dec":14,"beat":["Edgar","Font","Hominick","Jung","Lamas","Martinez","Mendes","Moicano","Munhoz","Stephens","Vera"],"lost":["Dvalishvili","Holloway","McGregor","Moraes","Volkanovski","Yan"]},"Dustin Poirier":{"rec":"30-10-0","w":30,"ko":16,"sub":7,"dec":7,"beat":["Alvarez","Brandao","Brookins","Chandler","Duffy","Ferreira","Gaethje","Garza","Green","Holloway","Hooker","McGregor","Medeiros","Miller","Pettis","St. Denis"],"lost":["Gaethje","Holloway","Johnson","Jung","Khabib","Makhachev","Oliveira","Swanson"]},"Charles Oliveira":{"rec":"37-11-0","w":37,"ko":10,"sub":22,"dec":5,"beat":["Brooks","Chandler","Dariush","Gaethje","Gamrot","Lentz","Poirier","Teymur"],"lost":["Felder","Holloway","Lamas","Makhachev","Pettis","Topuria"]},"Demetrious Johnson":{"rec":"25-4-1","w":25,"ko":5,"sub":8,"dec":12,"beat":["Bagautinov","Benavidez","Borg","Cariaso","Cejudo","Dodson","Elliott","Horiguchi","Moraga","Reis"],"lost":["Cejudo"]},"Israel Adesanya":{"rec":"24-6-0","beat":["Brunson","Cannonier","Costa","Gastelum","Pereira","Romero","Silva","Tavares","Vettori","Whittaker","Wilkinson"],"lost":["Blachowicz","Du Plessis","Imavov","Pereira","Strickland"]},"Ilia Topuria":{"rec":"17-1-0","w":17,"ko":7,"sub":8,"dec":2,"beat":["Emmett","Hall","Herbert","Holloway","Jackson","Mitchell","Oliveira","Volkanovski","Zalal"],"lost":[]},"Yoel Romero":{"rec":"17-7-0","w":17,"ko":14,"sub":0,"dec":3,"beat":["Brunson","Kennedy","Machida","Markes","Rockhold","Souza","Starks","Tavares","Weidman"],"lost":["Adesanya","Costa","Whittaker"]}};
const COLS = "id,a,b,status,mode,topic,fighter,reward,a_score,b_score,a_ms,b_ms,winner,rewarded,draw,ready,created_at,finished_at";
const MODES = {
  random:  { c: 5, i: "🎲", t: "Random fighter",     d: "10 questions about a random fighter" },
  "class": { c: 5, i: "🏋️", t: "Weight class",       d: "Questions about the fighters of one division" },
  fighter: { c: 5, i: "🥊", t: "Specific fighter",   d: "Pick one fighter to be quizzed on" },
  card:    { c: 5, i: "📅", t: "This week's card",   d: "Questions about the fighters on the upcoming card" },
  fav:     { c: 5, i: "🔄", t: "Fighter swap",       d: "You each pick a fighter. Your opponent is quizzed on yours and you on theirs" }
};
let G = [], OK = false, PL = null, OUT = null, CH = null, MSG = "", BUSY = false, T = 0, LOCK = 0, LT = 0;
const DISM = {};

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

/* One question per kind of fact about a fighter (so a game never repeats the same template). Kinds share a group and a game takes at most 2 per group. */
const GROUP = { div: "d", limit: "d", mate: "d", nick: "n", base: "s", sdef: "s", orig: "s", opp: "o", rec: "r", und: "r", res: "w" };
function slotQs(x, C) {
  const f = x.f, n = f.n, c = x.c, S = {};
  S.div = mk(`Which weight class does ${n} fight in?`, c, C.DIV);
  if (LIM[c]) S.limit = mk(`${n} fights at ${c}. What is the weight limit of that division?`, lim(c), C.DIV.map(lim));
  if (clean(f.nick)) S.nick = mk(`Which nickname belongs to ${n}?`, f.nick, C.NK);
  const arts = (f.base || []).filter(s => clean(s) && SDESC[s] && s !== "Well-rounded"), all = f.base || [];
  if (arts.length) {
    const b = rnd(arts);
    S.base = mk(`Which of these did ${n} train in?`, b, Object.keys(SDESC).filter(s => s !== "Well-rounded" && !all.includes(s) && !(s === "Greco-Roman" && all.includes("Greco-Roman Wrestling")) && !(s === "Greco-Roman Wrestling" && all.includes("Greco-Roman"))));
    const other = arts.filter(s => s !== b && SDESC[s] !== SDESC[b]);
    if (other.length) S.sdef = sdesc(other[0], `${n}'s background includes ${other[0]}. What is ${other[0]}?`);
    const og = arts.filter(s => SORIG[s]); if (og.length) S.orig = sorig(rnd(og));
  }
  const opp = uniq((f.ff || []).concat(f.hl || []).map(o => { const p = String(o).split(/\s+vs\.?\s+/i); return base(p.length > 1 ? (p.find(z => nz(base(z)) !== nz(n)) || "") : o); })).filter(o => o && nz(o) !== nz(n)), oz = new Set(opp.map(nz));
  /* wrong options only come from other weight classes, so they cannot be a real opponent by accident */
  if (opp.length) S.opp = mk(`Which of these fighters has ${n} fought?`, rnd(opp), C.ALL.filter(y => y.c !== c && !oz.has(nz(y.f.n))).map(y => y.f.n));
  const mates = C.ALL.filter(y => y.c === c && y.f.n !== n).map(y => y.f.n), others = C.ALL.filter(y => y.c !== c).map(y => y.f.n);
  if (mates.length) S.mate = mk(`Which of these fighters is in ${n}'s weight class?`, rnd(mates), others);
  const r = C.RN[nz(n)], rec = r ? r.rec : f.rec;
  const W = r && r.w ? r.w : parseInt(String(rec || "").split("-")[0], 10), L = parseInt(String(rec || "").split("-")[1], 10);
  if (W > 0) S.rec = mk(`How many wins does ${n} have on the record?`, "" + W, ["" + (W - 4), "" + (W + 3), "" + (W - 8), "" + (W + 7)].filter(v => +v > 0));
  if (!isNaN(L) && W > 0) S.und = { q: `Is ${n} undefeated as a pro?`, o: ["Yes", "No"], a: L === 0 ? 0 : 1, alt: [] };
  if (r) {
    if (r.ko != null) { const m = [["Knockout", r.ko], ["Submission", r.sub], ["Decision", r.dec]].sort((p, q) => q[1] - p[1]); if (m[0][1] > m[1][1]) S.res = { q: `How did ${n} win most of the fights?`, o: ["Knockout", "Submission", "Decision"], a: ["Knockout", "Submission", "Decision"].indexOf(m[0][0]), alt: [] }; }
    const seen = new Set((r.beat || []).concat(r.lost || []).map(nz));
    if ((r.beat || []).length && !S.res) S.res = mk(`Which of these fighters has ${n} beaten?`, rnd(r.beat), C.sur.filter(s => !seen.has(nz(s)) && nz(s) !== nz(last(n))));
  }
  return S;
}
/* fill slots round-robin over the queues; repeated question text gets its alternative wording */
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
  const S = slotQs(x, C), cnt = {}, out = [], used = new Set();
  shuf(Object.keys(S).filter(k => S[k])).forEach(k => { const g = GROUP[k]; if ((cnt[g] || 0) < 2 && !used.has(S[k].q)) { cnt[g] = (cnt[g] || 0) + 1; out.push(S[k]); used.add(S[k].q); } });
  for (const q of ruleQs()) { if (out.length >= 10) break; if (!used.has(q.q)) { out.push(q); used.add(q.q); } }
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
/* ---------- educational questions (weight class + this week's card) ---------- */
const LIM = { Flyweight: [125, 56.7], Bantamweight: [135, 61.2], Featherweight: [145, 65.8], Lightweight: [155, 70.3], Welterweight: [170, 77.1], Middleweight: [185, 83.9], "Light Heavyweight": [205, 93.0], Heavyweight: [265, 120.2] };
const lim = c => LIM[c] ? `${LIM[c][0]} lb (${LIM[c][1]} kg)` : "";
const SDESC = {
  BJJ: "Ground fighting built on submissions", Wrestling: "Takedowns and controlling the opponent", Boxing: "Striking with punches",
  "Muay Thai": "Striking with fists, elbows, knees and shins", Kickboxing: "Striking with punches and kicks", Judo: "Throws, pins and chokes",
  Sambo: "Russian grappling with throws and leg locks", Karate: "Striking art built on straight-line punches and kicks", Taekwondo: "Kicking art known for fast, high kicks",
  "Greco-Roman": "Wrestling with holds only above the waist", "Greco-Roman Wrestling": "Wrestling with holds only above the waist",
  "Dirty Boxing": "Close-range punching from the clinch", "Well-rounded": "Skilled in both striking and grappling"
};
const SORIG = { BJJ: "Brazil", "Muay Thai": "Thailand", Judo: "Japan", Karate: "Japan", Taekwondo: "Korea", Sambo: "Russia" };
const COUNTRIES = ["Brazil", "Thailand", "Japan", "Korea", "Russia", "Mexico", "Ireland"];
const STRIKE = ["Boxing", "Kickboxing", "Muay Thai", "Karate", "Taekwondo", "Dirty Boxing"];
const sdesc = (s, F) => mk(F || `What is ${s}?`, SDESC[s], Object.keys(SDESC).filter(k => SDESC[k] !== SDESC[s] && (!STRIKE.includes(s) || !STRIKE.includes(k))).map(k => SDESC[k]));
const sorig = s => mk(`Which country does ${s} come from?`, SORIG[s], COUNTRIES);
function weightQs(c) {
  const DIV = Object.keys(D), i = DIV.indexOf(c), out = [];
  if (!LIM[c]) return out;
  out.push(mk(`What is the weight limit of the ${c} division?`, lim(c), DIV.map(lim)));
  if (i < DIV.length - 1) out.push(mk(`Which division is the next one up from ${c}?`, DIV[i + 1], DIV));
  else if (i > 0) out.push(mk(`Which division is the next one down from ${c}?`, DIV[i - 1], DIV));
  return out.filter(Boolean);
}
function ruleQs() {
  const S = (q, right, wr) => mk(q, right, wr);
  return shuf([
    S("How long is a standard UFC round?", "5 minutes", ["3 minutes", "7 minutes", "10 minutes"]),
    S("How long is the rest between rounds?", "1 minute", ["30 seconds", "2 minutes", "5 minutes"]),
    S("How many rounds is a UFC title fight?", "5 rounds", ["3 rounds", "4 rounds", "7 rounds"]),
    S("How many rounds is a standard non-title UFC fight?", "3 rounds", ["2 rounds", "4 rounds", "5 rounds"]),
    S("How many sides does the Octagon have?", "8", ["6", "10", "12"]),
    S("What does TKO stand for?", "Technical knockout", ["Total knockout", "Timed knockout", "Tag knockout"]),
    S("What happens when a fighter taps out?", "They submit and the fight ends", ["The round is paused", "The fight is a draw", "They get a free break"]),
    S("How many judges score a UFC fight?", "3", ["1", "2", "5"]),
    S("What is the judges' scoring system called?", "10-point must system", ["5-point system", "Round-win system", "100-point system"]),
    S("In a normal round, how many points do the judges give?", "10 to the winner and 9 to the loser", ["5 to the winner and 4 to the loser", "10 to both fighters", "100 to the winner and 90 to the loser"]),
    S("What happens if nobody wins by knockout or submission before the last round ends?", "The judges decide the winner", ["A sudden-death round is fought", "The fight is always a draw", "The fight is replayed another day"]),
    S("In which year was the first UFC event held?", "1993", ["1988", "1996", "2001"]),
    S("How many men's weight classes does the UFC list here?", "8", ["5", "6", "10"]),
    S("In non-title fights, how much over the division limit can a fighter weigh?", "1 pound", ["5 pounds", "10 pounds", "There is no limit"]),
    S("When do official weigh-ins take place?", "The day before the fight", ["Right after the fight", "A week before the fight", "One hour before the fight"]),
    S("What can happen if a fighter misses weight?", "Part of their purse can be forfeited", ["Nothing at all", "They automatically win", "The fight gets more rounds"])
  ].filter(Boolean));
}
function genClass(cls) {
  const C = ctx(), mem = shuf(C.ALL.filter(x => x.c === cls));
  const W = weightQs(cls);
  const outside = C.ALL.filter(x => x.c !== cls).map(x => x.f.n), F = [];
  const aT = [`Which of these fighters is in the ${cls} division?`, `Which of these fighters competes at ${cls}?`, `Who fights at ${cls}?`];
  mem.slice(0, 2).forEach((x, i) => F.push(mk(aT[i % 3], x.f.n, outside)));
  mem.filter(x => clean(x.f.nick)).slice(0, 2).forEach(x => F.push(mk(`Who is known as “${x.f.nick}”?`, x.f.n, mem.map(y => y.f.n))));
  const styles = shuf(uniq(mem.flatMap(x => x.f.base || [])).filter(s => SDESC[s])), S = [];
  styles.slice(0, 3).forEach(s => S.push(sdesc(s)));
  styles.filter(s => SORIG[s]).slice(0, 1).forEach(s => S.push(sorig(s)));
  const q = rr([W, shuf(F.filter(Boolean)), shuf(S.filter(Boolean)), ruleQs()], 10, new Set(), true);
  return q.length === 10 ? pack(cls, shuf(q)) : null;
}
const cardFighters = () => { const C = ctx(), L = []; (EV.fights || []).forEach(f => [f.a, f.b].forEach(n => { const x = n && entry(C, n); if (x && !L.some(y => y.f.n === x.f.n)) L.push(x); })); return L; };
const winsOf = r => { const m = /^(\d+)-/.exec(String(r || "")); return m ? +m[1] : null; };
const rankOf = t => { const s = String(t || "").toUpperCase(); if (/CHAMP/.test(s)) return 0; const m = /#(\d+)/.exec(s); return m ? +m[1] : null; };
function genCard() {
  const C = ctx(), L = shuf(cardFighters()); if (L.length < 3) return null;
  const fs = shuf(EV.fights || []), used = new Set();
  const R = [], LM = [], WN = [], RK = [], SD = [], OR = [];
  fs.forEach(f => {
    if (f.a && f.b && (f.rounds === 3 || f.rounds === 5)) R.push(mk(`${f.a} vs ${f.b} is scheduled for how many rounds?`, f.rounds + " rounds", ["3 rounds", "5 rounds", "4 rounds", "2 rounds"]));
    if (f.a && f.b && LIM[f.cls]) LM.push(mk(`${f.a} vs ${f.b} is a ${f.cls} fight. What is the weight limit?`, lim(f.cls), Object.keys(LIM).map(lim)));
    [[f.a, f.ra], [f.b, f.rb]].forEach(([n, r]) => { const w = winsOf(r); if (n && w) WN.push(mk(`How many wins does ${n} have going into this fight?`, "" + w, ["" + (w - 3), "" + (w + 2), "" + (w - 6), "" + (w + 5)].filter(v => +v >= 0))); });
    const ra = rankOf(f.ta), rb = rankOf(f.tb);
    if (f.a && f.b && ra != null && rb != null && ra !== rb) RK.push({ q: `Who is ranked higher: ${f.a} or ${f.b}?`, o: [f.a, f.b], a: ra < rb ? 0 : 1, alt: [] });
  });
  L.forEach(x => (x.f.base || []).filter(s => SDESC[s]).slice(0, 1).forEach(s => { SD.push(sdesc(s, `${x.f.n}'s background includes ${s}. What is ${s}?`)); if (SORIG[s]) OR.push(sorig(s)); }));
  const qs = [R, LM, WN, RK, SD, OR, ruleQs().slice(0, 2)].map(a => shuf(a.filter(Boolean)));
  let out = rr(qs, 10, used);
  if (out.length < 10) out = out.concat(rr(L.map(x => shuf(Object.values(slotQs(x, C)).filter(Boolean)).slice(0, 3)), 10 - out.length, used));
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
      if (!w.error) { Object.keys(DUELC).forEach(k => delete DUELC[k]); (w.data || []).forEach(x => { if (x.winner) DUELC[x.winner] = (DUELC[x.winner] || 0) + (x.reward || 5); }); }
    } catch (e) {}
  }
  try { hnav(); } catch (e) {}
  try { ren(); } catch (e) {}
  if (!PL && !(CH && /^(fighter|swap1|swapb)$/.test(CH.step))) { try { window.duelShow(); } catch (e) {} }
  try { ui(); } catch (e) {}
  try { if (OK) checkResults(); } catch (e) {}
}
window.duelLoad = load;

const live = g => g.status === "invited" || g.status === "active";
const mineTodo = () => G.filter(g => g.b === ME && g.b_score == null && live(g));
const invitesIn = () => G.filter(g => g.b === ME && g.status === "invited");
const myTurn = () => G.filter(g => g.a === ME && g.status === "active" && g.ready && g.a_score == null);
window.duelCard = () => {
  if (!OK || !ME) return "";
  const n = mineTodo().length, t = myTurn().length;
  return `<button class="hcard${n || t ? " cshot" : ""}" onclick="openPage('duel')"><i>⚔️</i><span><b>Trivia duel</b><small>${n ? (n === 1 ? "1 player challenged you!" : n + " players challenged you!") : t ? "Your duel is ready to play!" : "Challenge a player · winner gets 5 coins"}</small></span><em>›</em></button>`;
};
window.duelBtn = id => (!OK || !ME || id === ME) ? "" : `<div class="fvt"><div><small>Trivia duel</small><b>Challenge this player</b></div><button class="fvb" type="button" onclick="duelGo('${esc(id)}')">⚔️ Challenge</button></div>`;
window.duelGo = id => { try { $("pf").close(); } catch (e) {} CH = { to: id, step: "mode" }; MSG = ""; openPage("duel"); };
function $(id) { return document.getElementById(id); }

/* ---------- page ---------- */
const lockLeft = () => Math.max(0, Math.ceil((LOCK - Date.now()) / 1000));
const side = g => { const me = g.a === ME; return { opp: me ? g.b : g.a, my: me ? g.a_score : g.b_score, th: me ? g.b_score : g.a_score }; };
const mlab = g => { const m = MODES[g.mode] || MODES.random; return m.i + " " + m.t; };
function row(g) {
  const s = side(g), who = esc(nm(s.opp)), sub0 = `<span>${mlab(g)}</span> · ${esc(g.topic || g.fighter || "")}`;
  if (g.status === "done") {
    const win = g.winner === ME, lose = g.winner && g.winner !== ME;
    const t = g.draw ? "Draw" : win ? "You won" : "You lost";
    const sub = win && g.rewarded ? "+" + (g.reward || 5) + " coins" : win ? "No coins (daily limit)" : "";
    return `<div class="dlr ${win ? "dwin" : lose ? "dlose" : ""}"><div><b>${who}</b><small>${sub0}</small></div><div class="dls"><b dir="ltr">${s.my} – ${s.th}</b><small>${t}${sub ? " · " + sub : ""}</small></div></div>`;
  }
  if (g.status === "declined" || g.status === "cancelled") return "";
  const invIn = g.b === ME && g.status === "invited", invOut = g.a === ME && g.status === "invited", inv = invIn;
  const mine = s.my != null, wait = g.mode === "fav" && g.a === ME && !g.ready && g.status === "active";
  const btns = invIn ? `<button class="fvb go" type="button" onclick="duelAccept('${g.id}')">Accept</button>` : (mine || wait || invOut) ? "" : `<button class="fvb go" type="button" onclick="duelPlay('${g.id}')">Play</button>`;
  const no = g.b_score == null ? `<button class="fvb" type="button" onclick="duelNo('${g.id}')">${invIn ? "Decline" : "Cancel"}</button>` : "";
  return `<div class="dlr ${inv ? "inv" : ""}"><div><b>${who}</b><small>${invIn ? "Challenged you" : invOut ? "Waiting for them to accept" : wait ? "Waiting for them to pick a fighter" : mine ? "Waiting for them to play" : "Your turn to play"}</small><small>${sub0}</small></div>${btns}${no}</div>`;
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
    end = `<p>${g.draw ? "It is a draw. No coins." : win ? (g.rewarded ? "You won! +" + (g.reward || 5) + " coins" : "You won! (daily coin limit reached)") : esc(nm(s.opp)) + " won this one."}</p><p class="dln">${esc(nm(s.opp))}: ${s.th} / 10</p>`;
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
    : `<div class="dlr"><div><b>${esc(nm(id))}</b></div><button class="fvb" type="button" ${open.has(id) || BUSY || lockLeft() ? "disabled" : ""} onclick="duelCf('${esc(id)}')">${lockLeft() && !open.has(id) ? "Wait " + lockLeft() + "s" : "⚔️ Challenge"}</button></div>`).join("");
  const todo = G.filter(g => (g.status === "invited" || g.status === "active")).map(row).join("");
  const done = G.filter(g => g.status === "done").slice(0, 8).map(row).join("");
  el.innerHTML = `<div class="dlbox"><b>1v1 Trivia duel</b><p>10 easy questions. The player with the most right answers wins the coins. A tie goes to whoever answered faster. Pick a duel type when you challenge someone: random fighter, weight class, a specific fighter, this week's card, or fighter swap. The winner gets 5 coins.</p></div>
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
    LOCK = Date.now() + 10000; lockTick();
    MSG = "Invite sent. They can accept or decline it. You can cancel it under Your games.";
    window.duelShow();
  } catch (e) {
    BUSY = false;
    const t = String((e && e.message) || e);
    MSG = /wait a few/i.test(t) ? "Wait a few seconds before sending another invite, or cancel the one you sent." : /already open/i.test(t) ? "You already have an open game with this player." : /too many/i.test(t) ? "You sent too many challenges today. Try again tomorrow." : "Could not send the challenge. Try again.";
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
window.duelAccept = async id => {
  if (BUSY) return; BUSY = true;
  try { const r = await SB.rpc("trivia_accept", { p_game: id }); if (r.error) throw r.error; }
  catch (e) { BUSY = false; MSG = "Could not accept the invite. Try again."; try { openPage("duel"); } catch (x) {} await load(); return; }
  BUSY = false; CH = null; MSG = "";
  await load();
  try { openPage("duel"); } catch (e) {}
  await window.duelPlay(id);
};
function lockTick() { clearTimeout(LT); if (lockLeft() > 0) LT = setTimeout(() => { try { if (!PL && !(CH && /^(fighter|swap1|swapb)$/.test(CH.step))) window.duelShow(); } catch (e) {} lockTick(); }, 1000); }

/* ---------- big win / lose animation ---------- */
const SEEN = new Set(); let SEEN0 = false, FXT = 0;
const seenKey = () => "dlseen_" + ME;
function seenLoad() { try { const a = JSON.parse(localStorage.getItem(seenKey()) || "null"); return Array.isArray(a) ? a : null; } catch (e) { return null; } }
function seenSave() { try { localStorage.setItem(seenKey(), JSON.stringify([...SEEN].slice(-80))); } catch (e) {} }
function checkResults() {
  const done = G.filter(g => g.status === "done");
  if (!SEEN0) { SEEN0 = true; const s = seenLoad(); if (s === null) { done.forEach(g => SEEN.add(g.id)); seenSave(); return; } s.forEach(i => SEEN.add(i)); }
  const fresh = done.filter(g => !SEEN.has(g.id));
  if (!fresh.length || PL) return;
  fresh.forEach(g => SEEN.add(g.id)); seenSave();
  resultFx(fresh[0]);
}
function resultFx(g) {
  const win = g.winner === ME, lose = !!g.winner && !win, calm = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } })();
  const s = side(g); let el = $("dlfx"); if (el) el.remove();
  el = document.createElement("div"); el.id = "dlfx"; el.className = win ? "win" : lose ? "lose" : "draw"; el.onclick = () => window.dlfxClose();
  const sub = win ? (g.rewarded ? "+" + (g.reward || 5) + " coins" : "No coins today (daily limit)") : lose ? "Better luck next time" : "No coins this time";
  el.innerHTML = `<div class="dlfxb"><h1>${win ? "You win!" : lose ? "You lose!" : "It's a draw"}</h1><div class="dlfxs" dir="ltr">${s.my} – ${s.th}</div><p>${esc(sub)}</p><small>${esc(nm(s.opp))}</small><em>Tap to close</em></div>`;
  document.body.appendChild(el);
  if (!calm && el.animate) {
    const n = win ? 34 : lose ? 14 : 0, W = innerWidth, H = innerHeight;
    for (let i = 0; i < n; i++) {
      const c = document.createElement("i"); c.className = "coin dlfxc" + (lose ? " gr" : ""); c.setAttribute("aria-hidden", "true");
      const x = Math.random() * W, sz = 20 + Math.random() * 26, r = (Math.random() * 720 - 360) | 0, dl = Math.random() * (win ? 1400 : 700);
      c.style.cssText = `left:${x}px;top:-60px;width:${sz}px;height:${sz}px;font-size:${sz}px`;
      el.appendChild(c);
      c.animate(win
        ? [{ transform: "translateY(0) rotate(0deg)", opacity: 1 }, { transform: `translateY(${H + 120}px) rotate(${r}deg)`, opacity: 1 }]
        : [{ transform: "translateY(0) rotate(0deg)", opacity: .9 }, { transform: `translateY(${H * .55}px) rotate(${r}deg)`, opacity: 0 }],
        { duration: win ? 1800 + Math.random() * 1400 : 1500 + Math.random() * 900, delay: dl, easing: win ? "cubic-bezier(.3,.1,.6,1)" : "ease-in", fill: "both" });
    }
  }
  clearTimeout(FXT); FXT = setTimeout(() => window.dlfxClose(), 6500);
}
window.dlfxClose = () => { clearTimeout(FXT); const e = $("dlfx"); if (e) { e.classList.add("out"); setTimeout(() => e.remove(), 250); } };

/* ---------- invite pop-up (shows anywhere on the site until you answer) ---------- */
function ui() {
  let el = $("dlinv");
  if (!el) { el = document.createElement("div"); el.id = "dlinv"; el.setAttribute("role", "alert"); document.body.appendChild(el); }
  let onPage = false; try { const p = $("pgD"); onPage = !!(p && !p.hidden); } catch (e) {}
  const inc = !OK || !ME || onPage || PL ? null : invitesIn()[0];
  const acc = inc || !OK || !ME || onPage || PL ? null : myTurn().find(g => !DISM[g.id]);
  if (!inc && !acc) { el.hidden = true; el.innerHTML = ""; el.dataset.k = ""; return; }
  const g = inc || acc, k = (inc ? "i" : "a") + g.id + "|" + invitesIn().length;
  el.hidden = false;
  if (el.dataset.k === k) return;
  el.dataset.k = k;
  const m = MODES[g.mode] || MODES.random, more = inc ? invitesIn().length - 1 : 0;
  el.innerHTML = inc
    ? `<div class="dli"><div><b><span>${esc(nm(g.a))}</span> <span>challenged you ⚔️</span></b><small>${m.i} ${m.t} · ${g.reward || 5} coins</small>${more > 0 ? `<small>+${more}</small>` : ""}</div><button type="button" class="dla" onclick="duelAccept('${g.id}')">Accept</button><button type="button" class="dld" onclick="duelNo('${g.id}')">Decline</button></div>`
    : `<div class="dli"><div><b><span>${esc(nm(g.b))}</span> <span>accepted your challenge</span></b><small>Play now</small></div><button type="button" class="dla" onclick="openPage('duel');duelPlay('${g.id}')">Play</button><button type="button" class="dld" onclick="duelLater('${g.id}')">Later</button></div>`;
}
window.duelLater = id => { DISM[id] = 1; ui(); };
setInterval(() => { try { ui(); } catch (e) {} }, 800);

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
  LOCK = 0;
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
