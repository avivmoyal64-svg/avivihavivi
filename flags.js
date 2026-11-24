/* "Flag Rush": 1v1. Seven fighters on the left, seven flags on the right. Tap a fighter, then the flag of the country he or she fights for.
   First to match all seven wins the round (60 seconds). First to 3 round wins (max 5 rounds). The server picks the fighters and checks every match.
   Full-screen. Flags are drawn here as small SVGs (flag emoji do not show on Windows). Loaded after beat.js. */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const nm = id => (typeof NAMES !== "undefined" && NAMES[id]) || "Player";
const ROUND_MS = 60000;
let OPEN = false, G = [], OK = false, M = null, V = null, OFF = 0, MSG = "", BUSY = false, KEY = "", LK = 0, FB = "", SEL = null, SEND = false;
const DISM = {};
const srv = () => Date.now() + OFF;
window.FLC = window.FLC || {};
window.pendFlag = () => G.some(g => g.a === ME && g.status === "invited" && Date.parse(g.created_at) > Date.now() - 864e5);
const live = g => g.status === "invited" || (g.status === "active" && Date.parse(g.touched || 0) > Date.now() - 10 * 60e3);
const invitesIn = () => G.filter(g => g.b === ME && g.status === "invited" && Date.parse(g.created_at) > Date.now() - 864e5);
const playable = () => G.filter(g => g.status === "active" && Date.parse(g.touched || 0) > Date.now() - 10 * 60e3);
const rpc = async (fn, a) => { const r = await SB.rpc(fn, a || {}); if (r.error) throw r.error; return r.data; };
const photoOf = n => { try { return (typeof photoZ === "function" ? photoZ(n) : "") || ""; } catch (e) {} return ""; };
const ini = n => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
const ERR = e => { const t = String((e && e.message) || e); return /pending invite/i.test(t) ? (window.PENDMSG || "You already have an invite waiting.") : /wait a few/i.test(t) ? "Wait a few seconds before sending another invite." : /too many/i.test(t) ? "Too many challenges today. Try again tomorrow." : /already open/i.test(t) ? "You already have a game open with this player." : "Something went wrong. Try again."; };

/* ---------- flags (60 x 40 drawings) ---------- */
const R = (x, y, w, h, f) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`;
const HB = (...c) => c.map((f, i) => R(0, +(i * 40 / c.length).toFixed(2), 60, +(40 / c.length + .4).toFixed(2), f)).join("");
const VB = (...c) => c.map((f, i) => R(+(i * 60 / c.length).toFixed(2), 0, +(60 / c.length + .4).toFixed(2), 40, f)).join("");
const ST = (cx, cy, r, f) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .4 : r; p.push((cx + rr * Math.cos(a)).toFixed(1) + "," + (cy + rr * Math.sin(a)).toFixed(1)); } return `<polygon points="${p.join(" ")}" fill="${f}"/>`; };
const CI = (x, y, r, f) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>`;
const JACK = `${R(0, 0, 60, 40, "#012169")}<path d="M0 0L60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0L60 40M60 0L0 40" stroke="#c8102e" stroke-width="3"/>${R(0, 14, 60, 12, "#fff")}${R(24, 0, 12, 40, "#fff")}${R(0, 16.5, 60, 7, "#c8102e")}${R(26.5, 0, 7, 40, "#c8102e")}`;
const CROSS = (x, y) => R(x - 1.3, y - 3.6, 2.6, 7.2, "#da121a") + R(x - 3.6, y - 1.3, 7.2, 2.6, "#da121a");
const FL = {
  us: () => { let s = ""; for (let i = 0; i < 13; i++) s += R(0, +(i * 40 / 13).toFixed(2), 60, 3.2, i % 2 ? "#fff" : "#b22234"); s += R(0, 0, 27, 21.5, "#3c3b6e"); for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) s += CI(3.5 + c * 5.2, 3.6 + r * 5, 1, "#fff"); return s; },
  br: () => R(0, 0, 60, 40, "#009c3b") + `<polygon points="30,4 56,20 30,36 4,20" fill="#ffdf00"/>` + CI(30, 20, 8.5, "#002776") + `<path d="M22 18.5Q30 15.5 38 21.5" stroke="#fff" stroke-width="1.6" fill="none"/>`,
  ru: () => HB("#fff", "#0039a6", "#d52b1e"),
  ie: () => VB("#169b62", "#fff", "#ff883e"),
  gb: () => JACK,
  au: () => R(0, 0, 60, 40, "#00247d") + `<g transform="scale(.5)">${JACK}</g>` + ST(15, 31, 5, "#fff") + ST(44, 7, 2.8, "#fff") + ST(36, 18, 2.8, "#fff") + ST(52, 16, 2.8, "#fff") + ST(44, 31, 2.8, "#fff"),
  nz: () => R(0, 0, 60, 40, "#00247d") + `<g transform="scale(.5)">${JACK}</g>` + ST(44, 9, 3, "#cc142b") + ST(36, 19, 3, "#cc142b") + ST(52, 18, 3, "#cc142b") + ST(44, 32, 3, "#cc142b"),
  ca: () => R(0, 0, 15, 40, "#d52b1e") + R(15, 0, 30, 40, "#fff") + R(45, 0, 15, 40, "#d52b1e") + `<polygon points="30,6 33,15 38,12 36,22 41,21 37,26 39,29 31,28 31,35 29,35 29,28 21,29 23,26 19,21 24,22 22,12 27,15" fill="#d52b1e"/>`,
  mx: () => VB("#006847", "#fff", "#ce1126") + CI(30, 20, 4.5, "#8c6b2f"),
  pl: () => HB("#fff", "#dc143c"),
  cm: () => VB("#007a5e", "#ce1126", "#fcd116") + ST(30, 20, 7, "#fcd116"),
  fr: () => VB("#0055a4", "#fff", "#ef4135"),
  ge: () => R(0, 0, 60, 40, "#fff") + R(26, 0, 8, 40, "#da121a") + R(0, 16, 60, 8, "#da121a") + CROSS(13, 8) + CROSS(47, 8) + CROSS(13, 32) + CROSS(47, 32),
  cz: () => HB("#fff", "#d7141a") + `<polygon points="0,0 30,20 0,40" fill="#11457e"/>`,
  nl: () => HB("#ae1c28", "#fff", "#21468b"),
  se: () => R(0, 0, 60, 40, "#006aa7") + R(17, 0, 9, 40, "#fecc00") + R(0, 15.5, 60, 9, "#fecc00"),
  jp: () => R(0, 0, 60, 40, "#fff") + CI(30, 20, 12, "#bc002d"),
  cn: () => R(0, 0, 60, 40, "#de2910") + ST(10, 10, 6.5, "#ffde00") + ST(20, 4, 2, "#ffde00") + ST(24, 9, 2, "#ffde00") + ST(24, 15, 2, "#ffde00") + ST(20, 20, 2, "#ffde00"),
  kr: () => { let s = R(0, 0, 60, 40, "#fff") + `<path d="M19 20a11 11 0 0 1 22 0z" fill="#cd2e3a"/><path d="M41 20a11 11 0 0 1-22 0z" fill="#0047a0"/>`; const bars = (x, y, a) => `<g transform="translate(${x} ${y}) rotate(${a})">${[-2.6, 0, 2.6].map(o => R(-4.5, o - .6, 9, 1.2, "#000")).join("")}</g>`; return s + bars(9, 8, -34) + bars(51, 8, 34) + bars(9, 32, 34) + bars(51, 32, -34); },
  kz: () => R(0, 0, 60, 40, "#00afca") + CI(33, 15, 6, "#fec50c") + R(8, 29, 44, 2.5, "#fec50c") + R(5, 6, 3, 28, "#fec50c"),
  za: () => R(0, 0, 60, 20, "#e03c31") + R(0, 20, 60, 20, "#001489") + `<path d="M0 0L24 20H60M0 40L24 20" stroke="#fff" stroke-width="12" fill="none"/><path d="M0 0L24 20H60M0 40L24 20" stroke="#007749" stroke-width="6.5" fill="none"/><polygon points="0,3.5 19,20 0,36.5" fill="#ffb81c"/><polygon points="0,8 14,20 0,32" fill="#000"/>`,
  hr: () => HB("#ff0000", "#fff", "#171796") + R(24.5, 11, 11, 15, "#fff") + [0, 1, 2, 3].map(r => [0, 1, 2].map(c => (r + c) % 2 ? "" : R(24.5 + c * 3.67, 11 + r * 3.75, 3.67, 3.75, "#ff0000")).join("")).join("") + `<rect x="24.5" y="11" width="11" height="15" fill="none" stroke="#171796" stroke-width=".8"/>`,
  ar: () => HB("#74acdf", "#fff", "#74acdf") + CI(30, 20, 4.5, "#f6b40e"),
  it: () => VB("#009246", "#fff", "#ce2b37"),
  de: () => HB("#000", "#dd0000", "#ffce00"),
  cu: () => [0, 1, 2, 3, 4].map(i => R(0, i * 8, 60, 8.2, i % 2 ? "#fff" : "#002a8f")).join("") + `<polygon points="0,0 26,20 0,40" fill="#cf142b"/>` + ST(8.5, 20, 6, "#fff")
};
const CN = { us: "United States", br: "Brazil", ru: "Russia", ie: "Ireland", gb: "United Kingdom", au: "Australia", nz: "New Zealand", ca: "Canada", mx: "Mexico", pl: "Poland", cm: "Cameroon", fr: "France", ge: "Georgia", cz: "Czechia", nl: "Netherlands", se: "Sweden", jp: "Japan", cn: "China", kr: "South Korea", kz: "Kazakhstan", za: "South Africa", hr: "Croatia", ar: "Argentina", it: "Italy", de: "Germany", cu: "Cuba" };
const flag = c => `<svg viewBox="0 0 60 40" preserveAspectRatio="none" aria-hidden="true">${FL[c] ? FL[c]() : R(0, 0, 60, 40, "#555")}</svg>`;
const PAL = ["#ff5a5f", "#ffb020", "#2fbf71", "#3aa0ff", "#b36bff", "#ff7ac8", "#35d6d0"];

function ensure() {
  if ($("fl")) return;
  const st = document.createElement("style");
  st.textContent = `
#fl{position:fixed;inset:0;z-index:411;display:none;flex-direction:column;background:radial-gradient(800px 460px at 100% 0,rgba(var(--rgb),.22),transparent 60%),radial-gradient(700px 400px at 0 100%,rgba(var(--rgb),.14),transparent 60%) #1f2024}
#fl.on{display:flex}
#fl .pth{flex:none;display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid #4d4e55;background:rgba(31,32,36,.92)}
#fl .pth h2{margin:0;flex:1;font:italic 900 24px "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;letter-spacing:1.2px;background:linear-gradient(90deg,var(--red),var(--red2) 60%,var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent}
#fl .ptbk{all:unset;cursor:pointer;box-sizing:border-box;min-height:44px;padding:0 16px;display:flex;align-items:center;border:1px solid #6b6c75;color:#fff;font:700 15px Barlow,Heebo,Arial,sans-serif}
#fl .ptbk.lv{border-color:var(--red2);color:#ffb4b4}
#flb{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 14px 22px;max-width:520px;width:100%;margin:0 auto;box-sizing:border-box}
.flcd{display:grid;place-items:center;height:min(52vh,420px);margin:6px 0;background:#2c2d32;border:2px solid #4d4e55;text-align:center;font:italic 900 120px "Barlow Condensed",Arial,sans-serif;color:#fff}
.flcd small{display:block;font:700 16px Barlow,Heebo,Arial,sans-serif;color:var(--mut);letter-spacing:.6px;text-transform:uppercase}
.flq{margin:2px 0 8px;text-align:center;font:italic 900 24px/1.05 "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;letter-spacing:.8px}
.flq small{display:block;margin-top:2px;font:15px Barlow,Heebo,Arial,sans-serif;font-style:normal;text-transform:none;letter-spacing:0;color:var(--mut)}
.flpr{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 10px}
.flpr div{background:#2c2d32;border:1px solid #4d4e55;padding:6px 10px;font:700 14px Barlow,Heebo,Arial,sans-serif;color:var(--mut)}
.flpr div b{display:flex;justify-content:space-between;color:#fff;font:italic 900 18px "Barlow Condensed","Heebo",Arial,sans-serif;letter-spacing:.5px;text-transform:uppercase}
.flpr i{display:flex;gap:3px;margin-top:4px}.flpr i u{flex:1;height:6px;background:#4a4b53;text-decoration:none}.flpr i u.on{background:var(--grn)}.flpr .op i u.on{background:var(--red2)}
.flbd{position:relative;display:flex;gap:0;justify-content:space-between}
.flc{display:flex;flex-direction:column;gap:7px}.flc.fl-l{flex:1;min-width:0;margin-inline-end:54px}.flc.fl-r{flex:none;width:92px}
.flln{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.flf,.flg{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;height:52px;background:#2c2d32;border:2px solid #5a5b63;color:#fff;-webkit-tap-highlight-color:transparent;touch-action:manipulation;position:relative}
.flf:active,.flg:active{transform:scale(.98)}
.flf{gap:9px;padding:0 10px 0 0;overflow:hidden}
.flf .ph{flex:none;width:44px;align-self:stretch;background:#3a3b42 center top/cover no-repeat;display:grid;place-items:center;font:italic 900 20px "Barlow Condensed",Arial,sans-serif;color:#9a9ba4}
.flf b{flex:1;min-width:0;font:italic 900 17px/1.05 "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;letter-spacing:.3px;overflow-wrap:anywhere}
.flg{justify-content:center;padding:3px}.flg svg{display:block;width:100%;height:100%}
.flf.sel,.flg.sel{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.35),0 0 18px rgba(255,255,255,.3);transform:scale(1.02)}
.flf.m,.flg.m{pointer-events:none;background:#26302b}.flg.m{opacity:.85}
.flk .flf:not(.m),.flk .flg:not(.m){opacity:.45;pointer-events:none}
.flbar{height:8px;background:#3a3b42;margin:12px 0 4px}.flbar u{display:block;height:100%;width:100%;background:linear-gradient(90deg,var(--red),var(--red2));text-decoration:none}
.flmsg{min-height:22px;margin:6px 0;text-align:center;color:var(--mut);font:700 15px Barlow,Heebo,Arial,sans-serif}
.flan{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
.flan div{display:flex;align-items:center;gap:8px;background:#2c2d32;border:1px solid #4d4e55;padding:6px;font:italic 900 15px/1.05 "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase}
.flan svg{flex:none;width:36px;height:24px;display:block}
#flinv{position:fixed;z-index:66;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);max-width:560px;margin:0 auto;animation:invUp .45s cubic-bezier(.2,1.2,.3,1) both}
#flinv[hidden]{display:none}`;
  document.head.appendChild(st);
  const el = document.createElement("div"); el.id = "fl"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Flag Rush");
  el.innerHTML = `<div class="pth"><h2>Flag Rush</h2><button class="ptbk" id="flx" type="button">‹ Back</button></div><div id="flb"></div>`;
  document.body.appendChild(el);
  $("flx").onclick = onBack;
  $("flb").addEventListener("click", onClick);
  addEventListener("resize", () => { if (OPEN) lines(); });
}

/* ---------- open / close ---------- */
window.flagOpen = async function (id) {
  ensure(); OPEN = true; $("fl").classList.add("on");
  try { if (location.hash !== "#flags") history.pushState({ fl: 1 }, "", "#flags"); } catch (e) {}
  if (typeof window.smClose === "function") window.smClose();
  M = null; V = null; MSG = ""; KEY = ""; SEL = null;
  await load();
  if (id) { try { await rpc("fm_accept", { p_game: id }).catch(() => {}); } catch (e) {} await enter(id); }
  render(true);
};
function close() {
  OPEN = false; M = null; V = null; KEY = ""; MSG = ""; SEL = null;
  const p = $("fl"); if (p) p.classList.remove("on");
  try { if (location.hash === "#flags") history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
}
const inGame = () => !!(M && V && V.status === "active");
async function onBack() {
  if (inGame()) {
    if (!confirm(window.LANGHE ? "לצאת מהמשחק? זה נחשב הפסד." : "Quit this game? It counts as a loss.")) return;
    try { await rpc("fm_forfeit", { p_game: M }); } catch (e) {}
  }
  if (M) { M = null; V = null; KEY = ""; await load(); render(true); return; }
  close();
}
addEventListener("popstate", () => {
  if (!OPEN) return;
  if (inGame()) { try { history.pushState({ fl: 1 }, "", "#flags"); } catch (e) {} return; }
  if (location.hash !== "#flags") close();
});

/* ---------- data ---------- */
async function load() {
  if (!SB || !ME) return;
  try {
    const q = await SB.from("fm_games").select("id,a,b,status,wa,wb,winner,draw,created_at,touched").or("a.eq." + ME + ",b.eq." + ME).order("created_at", { ascending: false }).limit(20);
    if (q.error) throw q.error; G = q.data || []; OK = true;
  } catch (e) { OK = false; G = []; }
  if (OK) { try { const w = await SB.rpc("fm_wins"); if (!w.error && Array.isArray(w.data)) { const _b = JSON.stringify(window.FLC); Object.keys(window.FLC).forEach(k => delete window.FLC[k]); w.data.forEach(x => { if (x.winner) window.FLC[x.winner] = 5 * Number(x.n || 0); });  if (JSON.stringify(window.FLC) !== _b) { try { ren(); } catch (e) {} }} } catch (e) {} }
}
async function enter(id) { M = id; V = null; KEY = ""; LK = 0; FB = ""; SEL = null; await pull(); }
async function pull() {
  if (!M) return; const t0 = Date.now();
  try {
    const r = await rpc("fm_view", { p_game: M });
    OFF = Number(r.now) - (t0 + Date.now()) / 2; V = r; LK = Math.max(LK, Number(r.lock) || 0);
  } catch (e) { /* keep the last view */ }
}
async function poll() { if (!OPEN || document.hidden || !M || BUSY || SEND) return; await pull(); render(false); }
setInterval(poll, 600);
setInterval(() => { if (OPEN && !M && !document.hidden) load().then(() => { if (OPEN && !M) render(false); }); }, 4000);

/* ---------- views ---------- */
function model() {
  if (!V) return null;
  if (V.status === "done" || V.status === "cancelled" || V.status === "declined") return { ph: "end", key: "end" + V.status + V.me + V.opp };
  const now = srv();
  if (V.done) return { ph: "done", key: "r" + V.round + "d" };
  if (now < Number(V.rstart) || !V.l) return { ph: "cd", key: "r" + V.round + "c" + (V.l ? 1 : 0) };
  return { ph: "live", key: "r" + V.round + "l" + (V.mm || []).map(x => x.n).join("|") + "~" + (SEL ? SEL.s + SEL.v : "") + "~" + FB };
}
function pips(n) { let s = ""; for (let i = 0; i < 7; i++) s += `<u class="${i < n ? "on" : ""}"></u>`; return s; }
function scoreBar() {
  const g = G.find(x => x.id === M), opp = g ? nm(g.a === ME ? g.b : g.a) : "Opponent";
  return `<div class="wws"><span>${esc(nm(ME))}</span><b dir="ltr" id="flsc">${V ? V.me : 0} – ${V ? V.opp : 0}</b><span>${esc(opp)}</span></div>`;
}
function prog() {
  const g = G.find(x => x.id === M), opp = g ? nm(g.a === ME ? g.b : g.a) : "Opponent";
  return `<div class="flpr"><div><b><span>${esc(nm(ME))}</span><span dir="ltr" id="flmc">${V.mc || 0}/7</span></b><i id="flmp">${pips(V.mc || 0)}</i></div><div class="op"><b><span>${esc(opp)}</span><span dir="ltr" id="floc">${V.oc || 0}/7</span></b><i id="flop">${pips(V.oc || 0)}</i></div></div>`;
}
function board() {
  const mm = V.mm || [], iN = {}, iC = {}; mm.forEach((x, i) => { iN[x.n] = i; iC[x.c] = i; });
  const left = (V.l || []).map(n => {
    const m = n in iN, ph = photoOf(n);
    return `<button type="button" class="flf${m ? " m" : ""}${SEL && SEL.s === "f" && SEL.v === n ? " sel" : ""}" ${m ? `data-p="${iN[n]}" style="border-color:${PAL[iN[n] % 7]}" disabled` : `data-a="f" data-v="${esc(n)}"`}>${ph ? `<i class="ph" style="background-image:url(${ph})"></i>` : `<i class="ph">${esc(ini(n))}</i>`}<b>${esc(n)}</b></button>`;
  }).join("");
  const right = (V.r || []).map(c => {
    const m = c in iC;
    return `<button type="button" class="flg${m ? " m" : ""}${SEL && SEL.s === "c" && SEL.v === c ? " sel" : ""}" title="${esc(CN[c] || c)}" aria-label="${esc(CN[c] || c)}" ${m ? `data-q="${iC[c]}" style="border-color:${PAL[iC[c] % 7]}" disabled` : `data-a="c" data-v="${c}"`}>${flag(c)}</button>`;
  }).join("");
  return `<div class="flbd" id="flbd"><div class="flc fl-l">${left}</div><svg class="flln" id="flln"></svg><div class="flc fl-r">${right}</div></div>`;
}
function lines() {
  const box = $("flbd"), sv = $("flln"); if (!box || !sv) return;
  const b = box.getBoundingClientRect(); let s = "";
  for (let i = 0; i < 7; i++) {
    const l = box.querySelector(`[data-p="${i}"]`), r = box.querySelector(`[data-q="${i}"]`); if (!l || !r) continue;
    const x = l.getBoundingClientRect(), y = r.getBoundingClientRect(), rtl = getComputedStyle(box).direction === "rtl";
    const x1 = (rtl ? x.left : x.right) - b.left, y1 = x.top + x.height / 2 - b.top, x2 = (rtl ? y.right : y.left) - b.left, y2 = y.top + y.height / 2 - b.top;
    s += `<path d="M${x1} ${y1}C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}" stroke="${PAL[i % 7]}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  }
  sv.innerHTML = s;
}
function menu() {
  const inv = invitesIn(), pl = playable();
  const ps = Object.keys(NAMES || {}).filter(id => id !== ME && NAMES[id]).sort((a, b) => nm(a).localeCompare(nm(b)));
  const open = new Set(G.filter(live).map(g => g.a === ME ? g.b : g.a));
  const blocked = BUSY || (window.invitePending && window.invitePending());
  return `${MSG ? `<div class="ptmsg" style="margin:0 0 10px;padding:10px 12px;background:#3a2323;border-inline-start:5px solid var(--red2);font:15px Barlow,Heebo,Arial,sans-serif">${esc(MSG)}</div>` : ""}
<div class="dlbox" style="margin-top:0"><b>Flag Rush</b><p>Seven fighters on the left, seven flags on the right. Tap a fighter, then the flag of the country he or she fights for. The first to match all seven wins the round. 60 seconds a round. First to 3 round wins. A wrong match locks you out for 2 seconds. The winner gets 5 coins.</p></div>
${inv.map(g => `<div class="dlr conf"><div><b>${esc(nm(g.a))}</b><small>Challenged you · 🏁 Flag Rush</small></div><button class="fvb go" type="button" data-a="acc" data-id="${g.id}">Accept</button><button class="fvb" type="button" data-a="no" data-id="${g.id}">Decline</button></div>`).join("")}
${pl.map(g => `<div class="dlr conf"><div><b>${esc(nm(g.a === ME ? g.b : g.a))}</b><small>Game in progress · <span dir="ltr">${g.a === ME ? g.wa : g.wb} – ${g.a === ME ? g.wb : g.wa}</span></small></div><button class="fvb go" type="button" data-a="join" data-id="${g.id}">Join</button></div>`).join("")}
${G.filter(g => g.status === "invited" && g.a === ME && Date.parse(g.created_at) > Date.now() - 864e5).map(g => `<div class="dlr"><div><b>${esc(nm(g.b))}</b><small>Waiting for them to accept · 🏁 Flag Rush</small></div><button class="fvb" type="button" data-a="no" data-id="${g.id}">Cancel</button></div>`).join("")}
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
    return head + `<div class="dlbox ${win ? "dwin" : lose ? "dlose" : ""}"><b>${V.draw ? "Draw" : win ? "You won! +5 coins" : "You lost"}</b><p>Final score <span dir="ltr">${V.me} – ${V.opp}</span></p></div>${answers()}<button class="fvb gsb go" type="button" data-a="back">‹ Back</button>`;
  }
  if (m.ph === "cd") return head + `<div class="flcd"><div><span id="flcdn">3</span><small>Get ready</small></div></div>`;
  if (m.ph === "live") return head + prog() + `<div class="flq">Round ${Math.min(V.round, 5)}<small>Tap a fighter, then their flag</small></div>${board()}<div class="flbar"><u id="flbar"></u></div><div class="flmsg" id="flmsg">${esc(FB)}</div>`;
  const me = V.rwin === "me", opp = V.rwin === "opp";
  const t = me ? (V.mc >= 7 ? "You matched all seven first! 🎉" : "Time's up. You matched more 🎉") : opp ? (V.oc >= 7 ? "They matched all seven first" : "Time's up. They matched more") : "Time's up. A tie, nobody scores";
  return head + prog() + `<div class="flq">Round ${Math.min(V.round, 5)}<small>${t}</small></div>${answers()}<div class="flmsg" id="flnx">Next round in …</div>`;
}
function answers() {
  const a = V.ans || []; if (!a.length) return "";
  return `<div class="flan">${a.map(x => `<div>${flag(x.c)}<span>${esc(x.n)}</span></div>`).join("")}</div>`;
}
function render(force) {
  if (!OPEN) return; ensure();
  const m = model(), k = (M ? "g" + (m ? m.key : "x") : "menu" + G.map(g => g.id + g.status).join()) + "|" + MSG + "|" + (BUSY ? 1 : 0);
  if (!force && k === KEY) { tick(); return; } KEY = k;
  $("flb").innerHTML = view();
  const x = $("flx"); if (x) { const g = inGame(); x.textContent = g ? "Quit" : "‹ Back"; x.classList.toggle("lv", g); }
  lines(); tick();
}
function tick() {
  if (!OPEN || !M || !V) return;
  const m = model(); if (!m) return; const now = srv();
  if (m.ph === "cd") { const e = $("flcdn"); if (e) e.textContent = String(Math.max(1, Math.ceil((Number(V.rstart) - now) / 1000))); }
  else if (m.ph === "live") {
    const left = Math.max(0, Number(V.rstart) + ROUND_MS - now), bar = $("flbar"); if (bar) bar.style.width = (left / ROUND_MS * 100).toFixed(1) + "%";
    const bd = $("flbd"); if (bd) bd.classList.toggle("flk", now < LK);
    if (FB && now >= LK && /Locked/.test(FB)) { FB = ""; const msg = $("flmsg"); if (msg) msg.textContent = ""; }
    const oc = $("floc"); if (oc) oc.textContent = (V.oc || 0) + "/7";
    const op = $("flop"); if (op && op.children.length) Array.from(op.children).forEach((u, i) => u.classList.toggle("on", i < (V.oc || 0)));
  } else if (m.ph === "done") { const e = $("flnx"); if (e) e.textContent = V.next ? "Next round in " + Math.max(0, Math.ceil((Number(V.next) - now) / 1000)) + "s" : ""; }
  const sc = $("flsc"); if (sc) sc.textContent = V.me + " – " + V.opp;
}
setInterval(() => { if (OPEN && M) tick(); }, 100);

/* ---------- actions ---------- */
async function onClick(e) {
  const t = e.target.closest("[data-a]"); if (!t || t.disabled) return;
  const a = t.dataset.a, id = t.dataset.id;
  try {
    if (a === "f" || a === "c") return choose(a, t.dataset.v);
    if (BUSY) return;
    if (a === "ch") { if (window.invitePending && window.invitePending()) { MSG = window.PENDMSG; return render(true); } BUSY = true; MSG = ""; render(true);
      try { const gid = await rpc("fm_create", { p_to: id }); note(gid, "invited"); MSG = "Challenge sent to " + nm(id) + ". The game starts when they accept."; } catch (er) { MSG = ERR(er); }
      BUSY = false; await load(); render(true); return; }
    if (a === "acc") { BUSY = true; try { await rpc("fm_accept", { p_game: id }); note(id, "accepted"); await enter(id); } catch (er) { MSG = ERR(er); } BUSY = false; await load(); render(true); return; }
    if (a === "join") { await enter(id); render(true); return; }
    if (a === "no") { try { await rpc("fm_decline", { p_game: id }); } catch (er) {} await load(); render(true); return; }
    if (a === "back") { M = null; V = null; KEY = ""; await load(); render(true); return; }
  } catch (er) { MSG = ERR(er); render(true); }
}
function choose(side, v) {
  const m = model(); if (!m || m.ph !== "live" || SEND || srv() < LK) return;
  if (SEL && SEL.s !== side) { const n = side === "f" ? v : SEL.v, c = side === "c" ? v : SEL.v; return submit(n, c); }
  SEL = SEL && SEL.s === side && SEL.v === v ? null : { s: side, v }; render(true);
}
async function submit(n, c) {
  SEL = null; SEND = true;
  try {
    const t0 = Date.now(), d = await rpc("fm_pick_v", { p_game: M, p_name: n, p_cc: c });
    const fresh = () => { if (d.view && d.view.now) { OFF = Number(d.view.now) - (t0 + Date.now()) / 2; V = d.view; LK = Math.max(LK, Number(V.lock) || 0); return true; } return false; };
    if (d.ok) { FB = ""; if (!fresh()) await pull(); }
    else if (d.why === "wrong") { LK = srv() + 2000; FB = "Wrong match! Locked for 2 seconds."; }
    else if (d.why === "locked") FB = "Locked… wait a moment.";
    else if (!fresh()) await pull();
  } catch (er) { FB = "Could not send that. Try again."; }
  SEND = false; render(true);
}
async function note(id, kind) {
  try {
    const s = (await SB.auth.getSession()).data.session; if (!s || !id) return;
    await fetch(SUPA_URL + "/functions/v1/party-push?flagnote=" + encodeURIComponent(id) + "&kind=" + kind + "&name=" + encodeURIComponent(String(NAMES[ME] || "").slice(0, 24)), { method: "POST", headers: { Authorization: "Bearer " + s.access_token, apikey: SUPA_KEY } });
  } catch (e) {}
}

/* ---------- invite pop-up (any page) ---------- */
function ui() {
  let el = $("flinv");
  if (!el) { el = document.createElement("div"); el.id = "flinv"; el.setAttribute("role", "alert"); el.hidden = true; document.body.appendChild(el); }
  const other = ["dlinv", "gqinv", "wwinv", "ptinv", "btinv"].some(i => { const o = $(i); return o && !o.hidden; });
  const inc = !OK || !ME || OPEN || other ? null : invitesIn().find(g => !DISM[g.id]);
  const acc = inc || !OK || !ME || OPEN || other ? null : playable().find(g => g.a === ME && !DISM[g.id] && Date.parse(g.touched || 0) > Date.now() - 2 * 60e3);
  if (!inc && !acc) { el.hidden = true; el.innerHTML = ""; el.dataset.k = ""; return; }
  const g = inc || acc, k = (inc ? "i" : "a") + g.id; el.hidden = false;
  if (el.dataset.k === k) return; el.dataset.k = k;
  el.innerHTML = inc
    ? `<div class="dli"><i class="dlig">🏁</i><div><b><span>${esc(nm(g.a))}</span> <span>challenged you 🏁</span></b><small>Flag Rush · first to 3 · 5 coins</small></div><button type="button" class="dla" data-fa="${g.id}">Accept</button><button type="button" data-fn="${g.id}">Decline</button></div>`
    : `<div class="dli"><i class="dlig">✅</i><div><b><span>${esc(nm(g.b))}</span> <span>accepted your challenge 🏁</span></b><small>Flag Rush · join now</small></div><button type="button" class="dla" data-fj="${g.id}">Join</button><button type="button" data-fl="${g.id}">Later</button></div>`;
  const q = s => el.querySelector(s);
  if (q("[data-fa]")) q("[data-fa]").onclick = async () => { const id = g.id; await window.flagOpen(); try { await rpc("fm_accept", { p_game: id }); note(id, "accepted"); await enter(id); } catch (er) { MSG = ERR(er); } await load(); render(true); };
  if (q("[data-fn]")) q("[data-fn]").onclick = async () => { try { await rpc("fm_decline", { p_game: g.id }); } catch (er) {} await load(); ui(); };
  if (q("[data-fj]")) q("[data-fj]").onclick = async () => { const id = g.id; await window.flagOpen(); await enter(id); render(true); };
  if (q("[data-fl]")) q("[data-fl]").onclick = () => { DISM[g.id] = 1; ui(); };
}
setInterval(() => { try { ui(); } catch (e) {} }, 900);
setInterval(async () => { try { if (ME && !document.hidden && !OPEN && (G.some(live) || !G.length)) await load(); } catch (e) {} }, 5000);
setTimeout(() => { try { if (typeof ME !== "undefined" && ME) { load(); if (location.hash === "#flags" && !OPEN) window.flagOpen(); } } catch (e) {} }, 4800);
})();
