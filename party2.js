/* Party games, part 2: Odd Fighter Out, Pie in the Face Press Conference (live), Rubber Gloves (live), Dirty Corner.
   Animated SVG scenes with silly characters. The server decides every result; this file only draws it. Loaded before party.js. */
(function () {
"use strict";
const NS = "http://www.w3.org/2000/svg";
const COL = ["#e23d3d", "#3d8be2", "#3db36b"], SKIN = ["#f6c9a0", "#e8b48a", "#cf9a6c"], PXS = [55, 150, 245];
const SHOW = { oddout: 3500, dirty: 4000 };
let TOK = 0, STY = false;
const L = {};
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const $ = id => document.getElementById(id);
const mk = (tag, at, par) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (par) par.appendChild(e); return e; };
const short = (c, id) => { const n = c.nm(id); return n.length > 9 ? n.slice(0, 8) + "…" : n; };
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const anim = (n, kf, o) => { try { return n.animate(kf, o); } catch (e) { return null; } };

function css() {
  if (STY) return; STY = true;
  const s = document.createElement("style");
  s.textContent = `
.px{display:block;width:100%;height:auto;margin:4px 0 8px;background:#17181b;border:2px solid var(--gold);border-radius:8px;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.pxhud{display:flex;gap:6px;margin:0 0 4px}.pxhud div{flex:1;min-width:0;padding:5px 6px;background:#2c2d32;border-bottom:4px solid #555;text-align:center;font:700 13px Barlow,Heebo,Arial,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:relative}
.pxhud div b{display:block;font:italic 900 26px/1 "Barlow Condensed",Arial,sans-serif;color:#fff}.pxhud div u{position:absolute;left:0;bottom:-4px;height:4px;background:var(--gold);text-decoration:none}
.pxhud div.me{outline:2px solid var(--gold)}
.pxcards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}
.pxc{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;align-items:center;text-align:center;padding:8px 4px 10px;background:linear-gradient(160deg,#34353b,#26272b);border:3px solid #5a5b63;color:#fff;min-width:0;position:relative;transition:transform .15s}
.pxc:active{transform:scale(.96)}
.pxc.me{border-color:var(--gold);box-shadow:0 0 18px rgba(var(--rgb),.5)}.pxc.odd{border-color:var(--grn);box-shadow:0 0 22px rgba(60,220,120,.55);animation:pxp .6s ease-in-out 3}.pxc.bad{border-color:var(--red2);opacity:.75}
@keyframes pxp{50%{transform:scale(1.06)}}
.pxc i{width:100%;aspect-ratio:3/4;background:#3a3b42 center top/cover no-repeat;border:1px solid #6b6c75;margin-bottom:6px;font-style:normal;display:grid;place-items:center;font:italic 900 40px "Barlow Condensed",Arial,sans-serif;color:#888}
.pxc b{display:block;font:italic 900 15px/1.05 "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;overflow-wrap:break-word;hyphens:auto}
.pxc small{display:block;margin-top:3px;color:#cfcfd6;font:13px/1.25 Barlow,Heebo,Arial,sans-serif}.pxc small strong{display:block;font:italic 900 22px/1 "Barlow Condensed",Arial,sans-serif;color:var(--gold)}
.pxc em{position:absolute;top:-10px;inset-inline-end:-6px;font:700 12px Barlow,Arial,sans-serif;font-style:normal;background:var(--gold);color:#111;border-radius:10px;padding:1px 7px}
.pxbtns{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0}
.pxt{all:unset;box-sizing:border-box;cursor:pointer;text-align:center;padding:12px 4px;background:#2c2d32;border:2px solid #5a5b63;color:#fff;font:italic 900 17px/1.1 "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;letter-spacing:.5px;min-width:0}
.pxt i{display:block;font-style:normal;font-size:34px;margin-bottom:2px}.pxt.me{border-color:var(--gold);background:#3a2f1f}.pxt:disabled{opacity:.55}
.pxt2{grid-template-columns:repeat(2,1fr)}
.pxbig{all:unset;box-sizing:border-box;cursor:pointer;display:block;width:100%;text-align:center;padding:16px;background:linear-gradient(90deg,#2a6fd6,#3d8be2);color:#fff;font:italic 900 26px "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;border-bottom:5px solid #1a4a96;-webkit-tap-highlight-color:transparent}
.pxbig:active{transform:translateY(3px);border-bottom-width:2px}
.pxcd{height:7px;background:#3a3b42;margin:4px 0}.pxcd u{display:block;height:100%;width:100%;background:var(--grn)}
.pxbar{position:relative;height:30px;background:#3a3b42;border:2px solid #111;margin:6px 0;overflow:hidden}.pxbar u{display:block;height:100%;transition:none}.pxbar b{position:absolute;inset:0;display:grid;place-items:center;font:italic 900 20px "Barlow Condensed",Arial,sans-serif;color:#fff;text-shadow:0 1px 3px #000}
.pxsay{margin:8px 0;padding:10px 12px;background:#2c2d32;border-inline-start:5px solid var(--gold);font:16px/1.35 Barlow,Heebo,Arial,sans-serif}
.pxsay.g{border-color:var(--grn);background:#233127}.pxsay.r{border-color:var(--red2);background:#3a2323}
.pxfloat{position:absolute;pointer-events:none;font:italic 900 40px "Barlow Condensed",Arial,sans-serif;text-shadow:0 2px 4px #000}
@keyframes pxsh{0%,100%{transform:translate(0,0)}20%{transform:translate(-5px,2px)}40%{transform:translate(5px,-2px)}60%{transform:translate(-4px,-1px)}80%{transform:translate(3px,2px)}}
@keyframes pxlv{0%,100%{opacity:.35}50%{opacity:.7}}`;
  document.head.appendChild(s);
}

/* ---------- silly characters ---------- */
function face(i, mood) {
  const eyes = mood === "hit"
    ? `<path d="M-13 -9l9 8M-4 -9l-9 8M4 -9l9 8M13 -9l-9 8" stroke="#222" stroke-width="2.6" stroke-linecap="round"/>`
    : `<circle cx="-8" cy="-5" r="7" fill="#fff" stroke="#222" stroke-width="1.6"/><circle cx="8" cy="-5" r="7" fill="#fff" stroke="#222" stroke-width="1.6"/><circle cx="${mood === "worry" ? -7 : -6}" cy="-4" r="2.8" fill="#222"/><circle cx="${mood === "worry" ? 9 : 10}" cy="-4" r="2.8" fill="#222"/><path d="M-15 -14q7 -5 13 -1M15 -14q-7 -5 -13 -1" stroke="#222" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  const mouth = mood === "hit" ? `<ellipse cx="0" cy="12" rx="6" ry="4.5" fill="#7a1f1f"/>` : mood === "worry" ? `<path d="M-9 13q4.5 -5 9 0t9 0" fill="none" stroke="#222" stroke-width="2.2" stroke-linecap="round"/>` : mood === "smug" ? `<path d="M-9 11q9 8 18 -2" fill="none" stroke="#222" stroke-width="2.4" stroke-linecap="round"/>` : `<path d="M-9 10q9 9 18 0" fill="none" stroke="#222" stroke-width="2.4" stroke-linecap="round"/>`;
  const ex = i === 0 ? `<path d="M-14 6q7 -7 14 0q7 -7 14 0q-7 6 -14 3q-7 3 -14 -3z" fill="#4a2b14"/>` : i === 1 ? `<circle cx="0" cy="3" r="5.5" fill="#d98c63" stroke="#b86d45" stroke-width="1"/>` : `<rect x="-5" y="13" width="4.5" height="6" rx="1" fill="#fff" stroke="#222" stroke-width="1"/><rect x="0.5" y="13" width="4.5" height="6" rx="1" fill="#fff" stroke="#222" stroke-width="1"/>`;
  return eyes + ex + mouth;
}
function hair(i) {
  return i === 0 ? `<path d="M-23 -8q0 -26 23 -26t23 26q-23 -9 -46 0z" fill="#c92a2a"/><rect x="-25" y="-10" width="50" height="6" rx="3" fill="#a31f1f"/>`
    : i === 1 ? `<path d="M-5 -22l5 -22l5 22z M-14 -20l-3 -18l9 16z M14 -20l3 -18l-9 16z" fill="#7a3fd1"/>`
    : `<path d="M-20 -14q20 -16 40 0" fill="none" stroke="#444" stroke-width="2.4"/><circle cx="-8" cy="-5" r="10" fill="none" stroke="#333" stroke-width="2"/><circle cx="8" cy="-5" r="10" fill="none" stroke="#333" stroke-width="2"/><path d="M-1 -5h2" stroke="#333" stroke-width="2"/>`;
}
const ears = i => `<circle cx="-24" cy="2" r="6.5" fill="${SKIN[i]}" stroke="#111" stroke-width="2"/><circle cx="24" cy="2" r="6.5" fill="${SKIN[i]}" stroke="#111" stroke-width="2"/>`;
const bodyOf = i => `<path d="M-27 20q0 -7 9 -7h36q9 0 9 7v46h-54z" fill="${COL[i]}" stroke="#111" stroke-width="2"/><path d="M-10 14l10 14l10 -14z" fill="#fff" opacity=".85"/><circle cx="-33" cy="40" r="12" fill="#e8c13a" stroke="#111" stroke-width="2"/><circle cx="33" cy="40" r="12" fill="#e8c13a" stroke="#111" stroke-width="2"/>`;
/* a full silly character centred on the head, with switchable faces */
function figure(i, withBody) {
  return `${withBody === false ? "" : bodyOf(i)}${ears(i)}<circle r="23" fill="${SKIN[i]}" stroke="#111" stroke-width="2.2"/>${hair(i)}<g class="fN">${face(i, "smug")}</g><g class="fH" style="display:none">${face(i, "hit")}</g><g class="fW" style="display:none">${face(i, "worry")}</g>`;
}
function mood(g, m) { const a = g.querySelector(".fN"), b = g.querySelector(".fH"), c = g.querySelector(".fW"); if (!a) return; a.style.display = m === "n" ? "" : "none"; b.style.display = m === "h" ? "" : "none"; c.style.display = m === "w" ? "" : "none"; }
const blob = (i, m) => `<circle r="22" fill="${SKIN[i]}" stroke="${COL[i]}" stroke-width="5"/>${face(i, m || "smug")}`;
function cream(n) {
  const P = [[-10, -14, 8], [9, -8, 9], [-4, 6, 8], [12, 9, 7], [-14, 2, 7]];
  let o = ""; for (let k = 0; k < 5; k++) { const p = P[k]; o += `<g class="cr" data-k="${k}" style="display:${k < n ? "" : "none"}"><circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="#fff" stroke="#e8d6b0" stroke-width="1.5"/><circle cx="${p[0] - 2}" cy="${p[1] - 2}" r="2" fill="#f2b8c6"/><path d="M${p[0]} ${p[1] + p[2] - 1}q2 7 0 10" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/></g>`; }
  return o;
}
const wait = (g, txt) => `<div class="pxsay g">${txt || "Locked in ✓"} <small>(${(g.acted || []).length}/3)</small></div>`;

/* ---------- Odd Fighter Out ---------- */
const ODDR = {
  wc: "The other two are the same weight class.", pct_hi: "The other two win 85%+ of their fights.", pct_lo: "The other two win 60% or less.",
  fights_hi: "The other two have 30+ fights.", fights_lo: "The other two have 12 or fewer fights.", loss_lo: "The other two have 1 loss or none.", loss_hi: "The other two have 7+ losses."
};
function oddCard(c, x) {
  const ph = c.photo(x.n), tot = x.w + x.l + x.d, pc = tot ? Math.round(100 * x.w / tot) : 0;
  return `<i style="${ph ? "background-image:url(" + ph + ")" : ""}">${ph ? "" : esc(String(x.n).charAt(0))}</i><b>${esc(x.n)}</b><small>${esc(x.wc || "")}<strong dir="ltr">${pc}% · ${tot}</strong><span dir="ltr">${x.w}-${x.l}-${x.d}</span></small>`;
}
function odd(g, c) {
  const cd = g.cards || [], res = g.res;
  if (g.phase === "act") {
    return `<div class="dlbox"><b>Round ${g.round}/${g.total} · Which one doesn't belong?</b></div>
<div class="pxcards">${cd.map((x, k) => `<button type="button" class="pxc${g.mine === String(k) ? " me" : ""}" data-a="px" data-id="${k}" ${g.mine != null ? "disabled" : ""}>${oddCard(c, x)}</button>`).join("")}</div>
${g.mine != null ? wait(g) : ""}${c.timer(g, 14000)}`;
  }
  const rs = ((res && res.rules) || []).map(r => ODDR[r]).filter(Boolean)[0] || "";
  const gain = (res && res.gain) || {}, ids = g.seats || [];
  return `<div class="pxcards">${cd.map((x, k) => `<div class="pxc${res && res.odd === k ? " odd" : (g.mine === String(k) ? " bad" : "")}">${oddCard(c, x)}${res && res.odd === k ? "<em>ODD ONE</em>" : ""}</div>`).join("")}</div>
${rs ? `<div class="pxsay g">${esc(rs)}</div>` : ""}
<div class="pxhud">${ids.map(id => `<div class="${id === c.ME ? "me" : ""}">${esc(short(c, id))}<b>${(g.score || {})[id] || 0}</b><span style="color:${gain[id] > 0 ? "var(--grn)" : "#777"}">${gain[id] > 0 ? "+" + gain[id] : "·"}${res && res.fast === id ? " ⚡" : ""}</span></div>`).join("")}</div>`;
}

/* ---------- live: HUD ---------- */
function hud(g, c, max) {
  const ids = g.seats || [], sc = g.score || {};
  return ids.map((id, k) => `<div class="${id === c.ME ? "me" : ""}" style="border-color:${COL[k]}">${esc(short(c, id))}<b>${sc[id] || 0}</b><u style="width:${Math.min(100, 100 * (sc[id] || 0) / max)}%"></u></div>`).join("");
}
const stopTouchScroll = svg => { svg.addEventListener("touchstart", e => e.preventDefault(), { passive: false }); svg.addEventListener("touchmove", e => e.preventDefault(), { passive: false }); };

/* ---------- Pie in the Face Press Conference (live) ---------- */
function pieHtml(g, c) {
  const ids = g.seats || [], sp = g.splat || {};
  let o = `<div class="pxhud" id="pxhud">${hud(g, c, 10)}</div><svg class="px" id="pxs" viewBox="0 0 300 230"><defs><linearGradient id="pxw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b1f31"/><stop offset="1" stop-color="#2a0f18"/></linearGradient><radialGradient id="pxsp" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#fff6c8" stop-opacity=".55"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient></defs>
<rect width="300" height="230" fill="url(#pxw)"/><path d="M0 0h42q-14 80 0 230h-42z M300 0h-42q14 80 0 230h42z" fill="#8a2a40"/><path d="M42 0q-14 80 0 230" stroke="#c6455f" stroke-width="3" fill="none"/><path d="M258 0q14 80 0 230" stroke="#c6455f" stroke-width="3" fill="none"/>
<polygon points="55,0 20,200 90,200" fill="url(#pxsp)"/><polygon points="150,0 112,200 188,200" fill="url(#pxsp)"/><polygon points="245,0 210,200 280,200" fill="url(#pxsp)"/>
<rect x="70" y="8" width="160" height="22" rx="4" fill="#111" stroke="#e6b422" stroke-width="2"/><text x="150" y="24" text-anchor="middle" fill="#e6b422" font-size="13" font-weight="900" font-family="Arial,sans-serif" letter-spacing="1.5">PRESS CONFERENCE</text>`;
  ids.forEach((id, k) => {
    o += `<g id="pxg${k}" transform="translate(${PXS[k]} 92)"><g id="pxw${k}">${figure(k)}<g id="pxo${k}">${cream(sp[id] || 0)}</g><g id="pxst${k}" style="display:none"><text x="-22" y="-30" font-size="14">⭐</text><text x="8" y="-34" font-size="14">💫</text><text x="-6" y="-42" font-size="12">⭐</text></g></g></g>`;
  });
  ids.forEach((id, k) => {
    o += `<rect x="${PXS[k] - 40}" y="134" width="80" height="80" rx="4" fill="#3a2a1c" stroke="#111" stroke-width="2"/><rect x="${PXS[k] - 40}" y="134" width="80" height="10" fill="#6a4a2c"/><rect x="${PXS[k] - 40}" y="134" width="80" height="80" fill="none" stroke="${COL[k]}" stroke-width="3" opacity=".8"/>
<rect x="${PXS[k] - 2}" y="118" width="4" height="18" fill="#222"/><ellipse cx="${PXS[k]}" cy="116" rx="6" ry="7" fill="#444" stroke="#111"/>
<text x="${PXS[k]}" y="168" text-anchor="middle" fill="${COL[k]}" font-size="13" font-weight="900" font-family="Arial,sans-serif" stroke="#000" stroke-width=".4">${esc(short(c, id))}${id === c.ME ? " ★" : ""}</text>`;
  });
  o += `<g id="pxp"></g><g id="pxfx"></g>`;
  ids.forEach((id, k) => { if (id !== c.ME) o += `<rect data-k="${k}" x="${PXS[k] - 42}" y="36" width="84" height="178" fill="transparent" style="cursor:pointer"/>`; });
  o += `</svg><div class="pxcd" id="pxcd"><u id="pxcdu"></u></div><button type="button" class="pxbig" id="pxduck">🙈 DUCK</button>`;
  return o;
}
function pieInit(g, c) {
  const svg = $("pxs"); if (!svg) return;
  stopTouchScroll(svg);
  L.me = (g.seats || []).indexOf(c.ME); L.loc = []; L.pies = {}; L.myCd = 0; L.myCdTot = 500; L.myDuck = null; L.burst = {}; L.nl = 0; L.cur = [0, 0, 0];
  const hit = e => { const t = e.target.closest ? e.target.closest("[data-k]") : null; if (t) { e.preventDefault(); pieThrow(Number(t.getAttribute("data-k"))); } };
  svg.onpointerdown = hit;
  const d = $("pxduck"); if (d) d.onpointerdown = e => { e.preventDefault(); pieDuck(); };
  const tok = TOK; (function loop() { if (tok !== TOK || !$("pxs")) return; try { pieFrame(); } catch (e) { console.error(e); } requestAnimationFrame(loop); })();
}
const act = (c, d, a) => { try { c.rpc("party_act", { p_room: c.room(), p_do: d, p_a: a }).catch(() => {}); } catch (e) {} };
function pieStunned(k, now) { const g = L.g; return ((g.inv || {})[k] || 0) > now; }
function pieThrow(k) {
  const g = L.g, c = L.c; if (!g || g.phase !== "live" || L.me < 0 || k === L.me) return; const now = c.srv();
  if (now < L.myCd || pieStunned(L.me, now)) return;
  L.myCd = now + 500; L.myCdTot = 500; L.nl++; L.loc.push({ id: "L" + L.nl, f: L.me, t: k, a: now, l: now + 450, r: -1, loc: 1 }); act(c, "throw", String(k));
}
function pieDuck() {
  const g = L.g, c = L.c; if (!g || g.phase !== "live" || L.me < 0) return; const now = c.srv();
  if (now < L.myCd || pieStunned(L.me, now)) return;
  L.myDuck = [now, now + 400]; L.myCd = now + 700; L.myCdTot = 700; act(c, "duck", "");
}
function burst(x, y, k) {
  const fx = $("pxfx"); if (!fx) return;
  for (let i = 0; i < 9; i++) {
    const p = mk("circle", { r: 2 + Math.random() * 3, fill: i % 3 ? "#fff" : "#f2b8c6", cx: x, cy: y }, fx), a = Math.random() * 6.28, d = 14 + Math.random() * 22;
    const an = anim(p, [{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 8}px)`, opacity: 0 }], { duration: 520, easing: "ease-out" }); if (an) an.onfinish = () => p.remove(); else p.remove();
  }
  const t = mk("text", { x: x, y: y - 30, "text-anchor": "middle", "font-size": "17", "font-weight": "900", fill: "#ffe066", stroke: "#a31f1f", "stroke-width": "1", "font-family": "Arial,sans-serif" }, fx); t.textContent = ["SPLAT!", "SPLORT!", "POW!", "BLAM!"][Math.floor(Math.random() * 4)];
  const an = anim(t, [{ transform: "scale(.4)", opacity: 0 }, { transform: "scale(1.2)", opacity: 1, offset: .25 }, { transform: "translateY(-14px) scale(1)", opacity: 0 }], { duration: 750 }); if (an) an.onfinish = () => t.remove(); else t.remove();
}
function pieFrame() {
  const g = L.g, c = L.c; if (!g || g.phase !== "live") return; const now = c.srv(), ids = g.seats || [], PL = $("pxp");
  if (g.cd != null && g.cd > L.myCd) L.myCd = g.cd;
  const bar = $("pxcdu"); if (bar) { const left = Math.max(0, L.myCd - now); bar.style.width = (L.myCdTot ? 100 * (1 - Math.min(1, left / L.myCdTot)) : 100) + "%"; bar.style.background = left > 0 ? "#e6b422" : "var(--grn)"; }
  ids.forEach((id, k) => {
    const gr = $("pxg" + k), w = $("pxw" + k); if (!gr) return;
    let dk = (g.duck || {})[k]; if (k === L.me && L.myDuck && (!dk || L.myDuck[0] > dk[0])) dk = L.myDuck;
    let dp = 0; if (dk && now >= dk[0] && now <= dk[1] + 60) dp = Math.min(ease((now - dk[0]) / 110), ease((dk[1] + 60 - now) / 110));
    const st = pieStunned(k, now), t = now / 1000;
    gr.setAttribute("transform", `translate(${PXS[k]} ${92 + 78 * dp})`);
    w.setAttribute("transform", st ? `rotate(${Math.sin(t * 22) * 9}) translate(${Math.sin(t * 30) * 2} 0)` : `rotate(${Math.sin(t * 2 + k) * 1.6}) translate(0 ${Math.sin(t * 3 + k) * 1.2})`);
    mood(w, st ? "h" : dp > .3 ? "w" : "n"); const s = $("pxst" + k); if (s) s.style.display = st ? "" : "none";
    const n = Math.min(5, (g.splat || {})[id] || 0); if (L.cur[k] !== n) { L.cur[k] = n; $("pxo" + k).querySelectorAll(".cr").forEach(e => { e.style.display = Number(e.dataset.k) < n ? "" : "none"; }); }
  });
  /* pies: server events plus my own optimistic throws */
  const sv = (g.ev || []).slice(); L.loc = L.loc.filter(le => { const m = sv.find(e => e.f === le.f && !e.m && Math.abs(e.a - le.a) < 1600); if (m) { m.m = 1; L.pies["s" + m.i] = L.pies[le.id]; delete L.pies[le.id]; (L.pies["s" + m.i] || (L.pies["s" + m.i] = {})).fa = le.a; return false; } return now - le.a < 2200; });
  const all = sv.map(e => ({ k: "s" + e.i, e: e })).concat(L.loc.map(le => ({ k: le.id, e: le })));
  const live = {};
  all.forEach(o => {
    const e = o.e, key = o.k; live[key] = 1; const a = (L.pies[key] && L.pies[key].fa) || e.a, l = a + 450, p = (now - a) / 450, f = e.f, t = e.t;
    const x0 = PXS[f], x1 = PXS[t], y0 = 118, y1 = 90;
    if (p > 1.6 && L.pies[key] && L.pies[key].el) { L.pies[key].el.remove(); L.pies[key].el = null; }
    if (p >= 0 && p <= 1.6 && PL) {
      let pe = L.pies[key]; if (!pe || !pe.el) { if (p > 1.1 && !(pe && pe.el)) { /* first seen long after landing: no flight */ } else { const el = mk("g", {}, PL); el.innerHTML = `<ellipse rx="10" ry="4.5" fill="#d9a35a" stroke="#111"/><ellipse cy="-3" rx="8.5" ry="3.8" fill="#fff" stroke="#e8d6b0"/><circle cy="-6" r="2" fill="#d1304a"/>`; pe = L.pies[key] = Object.assign(pe || {}, { el }); } }
      if (pe && pe.el) {
        const q = Math.min(p, 1), x = x0 + (x1 - x0) * q, y = y0 + (y1 - y0) * q - Math.sin(q * Math.PI) * 38; let ox = x, oy = y, op = 1;
        if (p > 1) { if (e.r === 0) { const m = p - 1; ox = x1 + (x1 > 150 ? 1 : -1) * 60 * m; oy = y1 - 60 * m; op = Math.max(0, 1 - m * 1.6); } else if (e.r === 1) op = 0; }
        pe.el.setAttribute("transform", `translate(${ox} ${oy}) rotate(${p * 540})`); pe.el.setAttribute("opacity", op);
      }
    }
    if (e.r === 1 && !L.burst[key] && now - l < 1800) { L.burst[key] = 1; burst(x1, 86, t); const w = $("pxw" + t); if (w) anim(w, [{ filter: "brightness(1)" }, { filter: "brightness(1.7)" }, { filter: "brightness(1)" }], { duration: 300 }); }
    if (e.r === 0 && !L.burst[key]) L.burst[key] = 1;
  });
  for (const key in L.pies) if (!live[key]) { if (L.pies[key].el) L.pies[key].el.remove(); delete L.pies[key]; }
}
function pieUpdate(g, c) { L.g = g; L.c = c; const h = $("pxhud"); if (h) h.innerHTML = hud(g, c, 10); }

/* ---------- Rubber Gloves (live) ---------- */
const R = 100, GR = 130, FR = 0.975;
function glHtml(g, c) {
  const ids = g.seats || [];
  let o = `<div class="pxhud" id="pxhud">${hud(g, c, 5)}</div><svg class="px" id="pxs" viewBox="-${GR} -${GR} ${GR * 2} ${GR * 2}"><defs>
<radialGradient id="glv" cx=".5" cy=".5" r=".75"><stop offset=".45" stop-color="#ff7a18"/><stop offset=".75" stop-color="#c1121f"/><stop offset="1" stop-color="#3a0510"/></radialGradient>
<radialGradient id="glt" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#f7f1dc"/><stop offset=".75" stop-color="#e2d6b0"/><stop offset="1" stop-color="#c9b985"/></radialGradient></defs>
<rect x="-${GR}" y="-${GR}" width="${GR * 2}" height="${GR * 2}" fill="#2b0a12"/><circle r="125" fill="url(#glv)" style="animation:pxlv 2.4s ease-in-out infinite"/>
<g id="glbub"></g><circle r="${R + 12}" fill="#2a1a12" opacity=".6" cx="3" cy="9"/><circle r="${R + 7}" fill="#6a4a2c" cy="6"/><circle r="${R + 7}" fill="#8a6338"/>
<circle r="${R + 2}" fill="#e6b422"/><circle r="${R - 3}" fill="url(#glt)"/>
<path d="M-${R - 8} 0h${(R - 8) * 2}M0 -${R - 8}v${(R - 8) * 2}" stroke="#d6c590" stroke-width="2" opacity=".7"/><circle r="${R * .5}" fill="none" stroke="#d6c590" stroke-width="2.5"/><circle r="${R * .18}" fill="#e23d3d" opacity=".75"/>`;
  for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; o += `<circle cx="${Math.cos(a) * (R + 2)}" cy="${Math.sin(a) * (R + 2)}" r="3" fill="${i % 2 ? "#e23d3d" : "#fff"}" stroke="#111" stroke-width=".6"/>`; }
  o += `<g id="glsh"></g><g id="glaim"></g><g id="glbx"></g><g id="glfx"></g></svg><div class="pxcd" id="pxcd"><u id="pxcdu"></u></div>`;
  return o;
}
function glBoxers(g, c) {
  const bx = $("glbx"), sh = $("glsh"); if (!bx) return;
  bx.innerHTML = ""; sh.innerHTML = ""; L.bg = []; L.sg = [];
  (g.seats || []).forEach((id, i) => {
    L.sg[i] = mk("ellipse", { rx: 13, ry: 6, fill: "#000", opacity: ".28" }, sh);
    const grp = mk("g", {}, bx); L.bg[i] = grp;
    grp.innerHTML = `<g class="sq"><ellipse cx="-17" cy="8" rx="9" ry="12" fill="#ffd21f" stroke="#111" stroke-width="2.2"/><ellipse cx="17" cy="8" rx="9" ry="12" fill="#ffd21f" stroke="#111" stroke-width="2.2"/><path d="M-21 2q-3 7 0 14M13 2q-3 7 0 14" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/><circle r="21" fill="${SKIN[i]}" stroke="${COL[i]}" stroke-width="5"/><g class="fc">${hair(i)}<g class="fN">${face(i, "smug")}</g><g class="fH" style="display:none">${face(i, "hit")}</g><g class="fW" style="display:none">${face(i, "worry")}</g></g></g><text y="-30" text-anchor="middle" fill="${COL[i]}" stroke="#000" stroke-width=".5" font-size="11" font-weight="900" font-family="Arial,sans-serif">${esc(short(c, id))}${id === c.ME ? " ★" : ""}</text>`;
    grp.querySelector(".sq").setAttribute("transform", "scale(.6)");
  });
}
function glSync(g, c) {
  const S = L.S || { x: [], y: [], vx: [], vy: [], al: [], rs: [] }, prev = L.S ? L.S.al.slice() : null;
  (g.bx || []).forEach((a, i) => { S.x[i] = a[0]; S.y[i] = a[1]; S.vx[i] = a[2]; S.vy[i] = a[3]; S.al[i] = a[4] === 1; S.rs[i] = a[5]; });
  L.tc = g.t0;
  if (L.pend && L.me >= 0) { if (g.cd > L.pend.at + 1000 || c.srv() - L.pend.at > 2600) L.pend = null; else if (S.al[L.me]) { S.vx[L.me] += L.pend.ix; S.vy[L.me] += L.pend.iy; } }
  if (g.cd != null && g.cd > L.myCd) L.myCd = g.cd;
  L.S = S; if (!prev) L.fell = [];
}
function glStep(S, ts) {
  for (let i = 0; i < 3; i++) if (!S.al[i] && ts >= S.rs[i]) { const a = (-90 + i * 120) * Math.PI / 180; S.x[i] = 55 * Math.cos(a); S.y[i] = 55 * Math.sin(a); S.vx[i] = 0; S.vy[i] = 0; S.al[i] = true; L.pop[i] = ts; }
  for (let i = 0; i < 3; i++) if (S.al[i]) { S.x[i] += S.vx[i]; S.y[i] += S.vy[i]; S.vx[i] *= FR; S.vy[i] *= FR; }
  for (let i = 0; i < 2; i++) for (let j = i + 1; j < 3; j++) if (S.al[i] && S.al[j]) {
    let dx = S.x[i] - S.x[j], dy = S.y[i] - S.y[j], d = Math.sqrt(dx * dx + dy * dy);
    if (d < 22) {
      if (d < .001) { dx = 1; dy = 0; d = 1; } const nx = dx / d, ny = dy / d, rv = (S.vx[i] - S.vx[j]) * nx + (S.vy[i] - S.vy[j]) * ny;
      if (rv < 0) { const imp = -(1.95) * rv / 2; S.vx[i] += imp * nx; S.vy[i] += imp * ny; S.vx[j] -= imp * nx; S.vy[j] -= imp * ny; if (-rv > .8 && !L.seen["h" + ts + i + j]) { L.seen["h" + ts + i + j] = 1; L.hits.push([(S.x[i] + S.x[j]) / 2, (S.y[i] + S.y[j]) / 2, -rv, ts]); } }
      const ov = (22 - d) / 2; S.x[i] += ov * nx; S.y[i] += ov * ny; S.x[j] -= ov * nx; S.y[j] -= ov * ny;
    }
  }
  for (let i = 0; i < 3; i++) if (S.al[i] && Math.sqrt(S.x[i] * S.x[i] + S.y[i] * S.y[i]) > R) { S.al[i] = false; S.rs[i] = ts + 1800; if (!L.seen["f" + ts + i]) { L.seen["f" + ts + i] = 1; L.fall[i] = { x: S.x[i], y: S.y[i], vx: S.vx[i], vy: S.vy[i], t: ts }; L.splash.push([S.x[i], S.y[i], ts]); } }
}
function glFx(kind, x, y) {
  const fx = $("glfx"); if (!fx) return;
  if (kind === "hit") {
    for (let i = 0; i < 6; i++) { const a = i * 1.047 + Math.random(), s = mk("text", { x, y, "font-size": "11", "text-anchor": "middle", fill: "#ffe066" }, fx); s.textContent = "✦"; const an = anim(s, [{ transform: "translate(0,0) scale(.5)", opacity: 1 }, { transform: `translate(${Math.cos(a) * 20}px,${Math.sin(a) * 20}px) scale(1.3)`, opacity: 0 }], { duration: 420 }); if (an) an.onfinish = () => s.remove(); else s.remove(); }
    const t = mk("text", { x, y: y - 8, "text-anchor": "middle", "font-size": "13", "font-weight": "900", fill: "#fff", stroke: "#c1121f", "stroke-width": "1", "font-family": "Arial,sans-serif" }, fx); t.textContent = "BONK!";
    const an = anim(t, [{ transform: "scale(.5)", opacity: 1 }, { transform: "translateY(-12px) scale(1.2)", opacity: 0 }], { duration: 500 }); if (an) an.onfinish = () => t.remove(); else t.remove();
  } else {
    for (let r = 0; r < 2; r++) { const ci = mk("circle", { cx: x, cy: y, r: 6, fill: "none", stroke: "#ffb347", "stroke-width": "3" }, fx); const an = anim(ci, [{ transform: "scale(.4)", opacity: 1 }, { transform: "scale(3)", opacity: 0 }], { duration: 700, delay: r * 150, fill: "backwards" }); ci.style.transformOrigin = x + "px " + y + "px"; if (an) an.onfinish = () => ci.remove(); else ci.remove(); }
  }
}
function glInit(g, c) {
  const svg = $("pxs"); if (!svg) return;
  stopTouchScroll(svg);
  L.me = (g.seats || []).indexOf(c.ME); L.S = null; L.pend = null; L.myCd = 0; L.aim = null; L.hits = []; L.fall = []; L.splash = []; L.pop = []; L.seen = {};
  glBoxers(g, c); glSync(g, c);
  const bub = $("glbub"); if (bub) for (let i = 0; i < 12; i++) { const b = mk("circle", { r: 2 + (i % 4), fill: "#ffb347", opacity: ".6", cx: -120 + i * 22 }, bub); anim(b, [{ transform: `translateY(${110 + (i % 3) * 8}px)`, opacity: 0 }, { transform: "translateY(60px)", opacity: .8, offset: .5 }, { transform: "translateY(" + (20 + (i % 5) * 10) + "px)", opacity: 0 }], { duration: 2200 + i * 170, iterations: Infinity, delay: -i * 300 }); }
  const pt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const m = svg.getScreenCTM(); return m ? p.matrixTransform(m.inverse()) : { x: 0, y: 0 }; };
  const pos = () => { const t = L.c.srv(), fr = Math.min(1, Math.max(0, (t - L.tc) / 40)); return [L.S.x[L.me] + L.S.vx[L.me] * fr, L.S.y[L.me] + L.S.vy[L.me] * fr]; };
  const set = e => { if (L.me < 0 || !L.S.al[L.me]) return; const q = pt(e), p = pos(), dx = q.x - p[0], dy = q.y - p[1], d = Math.hypot(dx, dy); if (d < 4) return; L.aim = { a: Math.atan2(dy, dx), p: Math.min(1, d / 80) }; };
  let down = false;
  svg.onpointerdown = e => { down = true; try { svg.setPointerCapture(e.pointerId); } catch (er) {} set(e); e.preventDefault(); };
  svg.onpointermove = e => { if (down) { set(e); e.preventDefault(); } };
  const up = e => { if (!down) return; down = false; const A = L.aim; L.aim = null; if (A && A.p > .12) glFling(A); };
  svg.onpointerup = up; svg.onpointercancel = () => { down = false; L.aim = null; };
  const tok = TOK; (function loop() { if (tok !== TOK || !$("pxs")) return; try { glFrame(); } catch (e) { console.error(e); } requestAnimationFrame(loop); })();
}
function glFling(A) {
  const c = L.c, now = c.srv(); if (L.me < 0 || !L.S.al[L.me] || now < L.myCd) return;
  const ix = Math.cos(A.a) * A.p * 3.4, iy = Math.sin(A.a) * A.p * 3.4; L.S.vx[L.me] += ix; L.S.vy[L.me] += iy; L.pend = { at: now, ix, iy }; L.myCd = now + 2000;
  act(c, "fling", A.a.toFixed(3) + "," + A.p.toFixed(2));
}
function glFrame() {
  const g = L.g, c = L.c, S = L.S; if (!g || g.phase !== "live" || !S) return; const now = c.srv();
  if (now - L.tc > 1500) L.tc = now - 40;
  let guard = 0; while (L.tc + 40 <= now && guard++ < 60) { L.tc += 40; glStep(S, L.tc); }
  const fr = Math.min(1, (now - L.tc) / 40);
  (L.hits || []).splice(0).forEach(h => { if (now - h[3] < 400) glFx("hit", h[0], h[1]); });
  (L.splash || []).splice(0).forEach(h => { if (now - h[2] < 400) glFx("splash", h[0], h[1]); });
  if (Object.keys(L.seen).length > 300) L.seen = {};
  const t = now / 1000;
  for (let i = 0; i < 3; i++) {
    const grp = L.bg[i], sh = L.sg[i]; if (!grp) continue;
    let x = S.x[i] + S.vx[i] * fr, y = S.y[i] + S.vy[i] * fr, sc = 1, rot = 0, op = 1;
    const sp = Math.hypot(S.vx[i], S.vy[i]);
    if (!S.al[i]) { const f = L.fall[i], k = f ? Math.min(1, (now - f.t) / 650) : 1; if (f) { x = f.x + f.vx * 14 * k; y = f.y + f.vy * 14 * k; } sc = Math.max(.05, 1 - k * .95); rot = k * 540; op = 1 - k * .6; if (k >= 1) op = 0; }
    else if (L.pop[i] && now - L.pop[i] < 450) { const k = (now - L.pop[i]) / 450; sc = .3 + .7 * ease(k) + Math.sin(k * 9) * .08 * (1 - k); }
    const ang = Math.atan2(S.vy[i], S.vx[i]) * 180 / Math.PI, sq = 1 + Math.min(.28, sp * .09), hov = S.al[i] ? Math.sin(t * 5 + i) * 1.4 : 0;
    grp.setAttribute("transform", `translate(${x.toFixed(2)} ${(y - 5 + hov).toFixed(2)}) rotate(${rot})`);
    const q = grp.querySelector(".sq"); q.setAttribute("transform", sp > .25 ? `rotate(${ang}) scale(${(.6 * sq * sc).toFixed(3)} ${(.6 / sq * sc).toFixed(3)}) rotate(${-ang})` : `scale(${(.6 * sc).toFixed(3)})`);
    grp.setAttribute("opacity", op); mood(grp, !S.al[i] ? "h" : sp > 1.4 ? "w" : "n");
    sh.setAttribute("cx", x + 3); sh.setAttribute("cy", y + 9); sh.setAttribute("opacity", S.al[i] ? .28 : 0); sh.setAttribute("rx", 12 * sc);
  }
  /* aim + cooldown ring */
  const ar = $("glaim"); if (ar) {
    let h = "";
    if (L.me >= 0 && S.al[L.me]) {
      const x = S.x[L.me] + S.vx[L.me] * fr, y = S.y[L.me] + S.vy[L.me] * fr, left = Math.max(0, L.myCd - now), A = L.aim;
      const cir = 2 * Math.PI * 17, ready = left <= 0;
      h += `<circle cx="${x}" cy="${y - 5}" r="17" fill="none" stroke="${ready ? "#3cc46c" : "#e6b422"}" stroke-width="${ready ? 3 : 4}" stroke-dasharray="${ready ? "none" : (cir * (1 - left / 2000)).toFixed(1) + " " + cir.toFixed(1)}" transform="rotate(-90 ${x} ${y - 5})" opacity="${ready ? .55 + .3 * Math.sin(t * 6) : .95}"/>`;
      if (A && ready) {
        const col = A.p > .66 ? "#e23d3d" : A.p > .33 ? "#ffb703" : "#3cc46c", len = 20 + A.p * 92, ex = x + Math.cos(A.a) * len, ey = y - 5 + Math.sin(A.a) * len;
        for (let k = 1; k <= 7; k++) { const d = 22 + (len - 22) * k / 7; h += `<circle cx="${x + Math.cos(A.a) * d}" cy="${y - 5 + Math.sin(A.a) * d}" r="${1.6 + k * .45}" fill="${col}" stroke="#111" stroke-width=".6"/>`; }
        h += `<path d="M${ex} ${ey}l${Math.cos(A.a + 2.6) * 14} ${Math.sin(A.a + 2.6) * 14}M${ex} ${ey}l${Math.cos(A.a - 2.6) * 14} ${Math.sin(A.a - 2.6) * 14}" stroke="${col}" stroke-width="5" stroke-linecap="round"/>`;
      }
    }
    ar.innerHTML = h;
  }
  const bar = $("pxcdu"); if (bar) { const left = Math.max(0, L.myCd - now); bar.style.width = (100 * (1 - Math.min(1, left / 2000))) + "%"; bar.style.background = left > 0 ? "#e6b422" : "var(--grn)"; }
}
function glUpdate(g, c) { L.g = g; L.c = c; if (L.S) glSync(g, c); const h = $("pxhud"); if (h) h.innerHTML = hud(g, c, 5); }

/* ---------- Dirty Corner ---------- */
const PROB = { cut: ["Cut eyebrow! 🩸", "jelly"], swell: ["Swollen eye! 🟣", "ice"], tired: ["Exhausted! 😮‍💨", "water"] };
const TOOL = { jelly: ["🫙", "Jelly"], ice: ["🧊", "Ice pack"], water: ["💧", "Water"] };
const hpColor = h => h > 60 ? "#3cc46c" : h > 35 ? "#e8b23a" : "#e23d3d";
/* damage on the fighter's face, driven by health: more bruises, blood and swelling the lower it goes */
function damage(hp, prob) {
  let o = "";
  if (hp < 90) o += `<ellipse cx="-17" cy="14" rx="6" ry="4" fill="#8f4fc2" opacity=".55"/>`;
  if (hp < 75) o += `<ellipse cx="-8" cy="-5" rx="11" ry="9" fill="#6b2f98" opacity=".6"/><ellipse cx="17" cy="12" rx="6" ry="4.5" fill="#a24a8f" opacity=".6"/>`;
  if (hp < 60) o += `<path d="M2 6q-2 8 0 14" stroke="#d11b1b" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="2" cy="20" r="2.6" fill="#d11b1b"/><ellipse cx="10" cy="-5" rx="11" ry="9" fill="#6b2f98" opacity=".6"/>`;
  if (hp < 45) o += `<rect x="-6" y="-20" width="14" height="5" rx="1" fill="#fff" stroke="#bbb" stroke-width="1" transform="rotate(-12)"/><path d="M-12 -1l-6 12" stroke="#d11b1b" stroke-width="3" stroke-linecap="round"/><ellipse cx="14" cy="8" rx="8" ry="7" fill="#c0568a" opacity=".6"/>`;
  if (hp < 30) o += `<path d="M-16 -24q6 4 4 14M14 -26q-2 8 -6 10" stroke="#d11b1b" stroke-width="3" fill="none"/><path d="M-6 12q6 9 12 0z" fill="#e0556b" stroke="#222" stroke-width="1.5"/><text x="-22" y="-27" font-size="10">💫</text><text x="10" y="-30" font-size="10">⭐</text>`;
  if (prob === "cut") o += `<path d="M-12 -17q2 8 0 15" stroke="#d11b1b" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="-12" cy="-1" r="3.3" fill="#d11b1b"/>`;
  else if (prob === "swell") o += `<circle cx="9" cy="-5" r="11" fill="#8f4fc2" opacity=".85"/><circle cx="9" cy="-5" r="6.5" fill="#5a1f85" opacity=".85"/>`;
  else o += `<path d="M21 -18q4 6 0 10q-4 -4 0 -10zM-23 -14q4 6 0 10q-4 -4 0 -10z" fill="#7fd0ff" stroke="#2a7ab0"/><path d="M-5 14q5 10 10 0z" fill="#e0556b"/>`;
  return o;
}
function dirtyScene(g, c, hp) {
  const ids = g.seats || [], pb = PROB[g.prob] || PROB.cut;
  let o = `<svg class="px" id="pxs" viewBox="0 0 300 250"><defs><linearGradient id="dgw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3a52"/><stop offset="1" stop-color="#141b27"/></linearGradient><radialGradient id="dgs" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#fff3b0" stop-opacity=".5"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient></defs>
<rect width="300" height="250" fill="url(#dgw)"/><polygon points="150,0 70,200 230,200" fill="url(#dgs)"/>
<g fill="#0c1018">${[18, 52, 86, 214, 248, 282].map((x, k) => `<circle cx="${x}" cy="${74 + (k % 2) * 8}" r="11"/><rect x="${x - 13}" y="${84 + (k % 2) * 8}" width="26" height="30" rx="8"/>`).join("")}</g>
<rect x="6" y="40" width="9" height="150" fill="#9aa"/><rect x="285" y="40" width="9" height="150" fill="#9aa"/><path d="M10 70h280M10 108h280M10 146h280" stroke="#d93a3a" stroke-width="5"/>
<rect x="0" y="196" width="300" height="54" fill="#34465e"/><rect x="95" y="168" width="110" height="14" rx="4" fill="#9a7440"/><rect x="104" y="182" width="8" height="30" fill="#6b4f27"/><rect x="188" y="182" width="8" height="30" fill="#6b4f27"/>
<g id="pxbx" transform="translate(150 108)"><g id="pxsh"><path d="M-45 52q0 -16 18 -16h54q18 0 18 16v38h-90z" fill="#e6b422" stroke="#111" stroke-width="3"/><path d="M-20 38l20 22l20 -22z" fill="#fff" opacity=".9"/><circle cx="-52" cy="70" r="19" fill="#d93a3a" stroke="#111" stroke-width="3"/><circle cx="52" cy="70" r="19" fill="#d93a3a" stroke="#111" stroke-width="3"/>
<g transform="scale(1.85)"><circle cx="-24" cy="2" r="6.5" fill="${SKIN[2]}" stroke="#111" stroke-width="1.5"/><circle cx="24" cy="2" r="6.5" fill="${SKIN[2]}" stroke="#111" stroke-width="1.5"/><circle r="23" fill="${SKIN[2]}" stroke="#111" stroke-width="1.5"/>${hair(2)}<g id="pxfc">${face(2, hp < 45 ? "hit" : hp < 75 ? "worry" : "smug")}</g><g id="pxdm">${damage(hp, g.prob)}</g></g></g></g>
<text x="150" y="22" text-anchor="middle" fill="#ffe066" font-size="15" font-weight="900" font-family="Arial,sans-serif" stroke="#000" stroke-width=".5">${esc(pb[0])}</text><g id="pxfx"></g>`;
  ids.forEach((id, k) => { o += `<g transform="translate(${PXS[k]} 214) scale(.4)">${figure(k)}</g><text x="${PXS[k]}" y="246" text-anchor="middle" fill="${COL[k]}" font-size="11" font-weight="900" font-family="Arial,sans-serif">${esc(short(c, id))}${id === c.ME ? " ★" : ""}</text>`; });
  return o + `</svg><div class="pxbar"><u id="pxhp" style="width:${hp}%;background:${hpColor(hp)}"></u><b id="pxhpn">❤ ${hp}%</b></div>`;
}
const badge = g => g.role === "sab" ? `<div class="pxsay r">😈 You're the SABOTEUR: use wrong tools, stay hidden.</div>` : `<div class="pxsay">🧑‍⚕️ Cornerman: fix it. One of you is a saboteur.</div>`;
function dirty(g, c) {
  const ph = g.phase, ids = g.seats || [], head = badge(g);
  if (ph === "act") {
    const m = g.mine != null;
    return head + dirtyScene(g, c, g.health) + `<div class="pxbtns">${["jelly", "ice", "water"].map(t => `<button type="button" class="pxt${g.mine === t ? " me" : ""}" data-a="px" data-id="${t}" ${m ? "disabled" : ""}><i>${TOOL[t][0]}</i>${TOOL[t][1]}</button>`).join("")}</div>${m ? wait(g) : ""}${c.timer(g, 8000)}`;
  }
  if (ph === "show") {
    const pk = g.peek, r = g.res || {};
    return head + dirtyScene(g, c, r.from == null ? g.health : r.from) + `<div class="pxsay" id="pxsay"></div>${pk ? `<div class="pxsay">🔍 ${esc(c.nm(pk.u))} used ${esc((TOOL[pk.tool] || ["", "?"])[1])}… looks ${pk.ok ? "right" : "wrong"}.</div>` : ""}`;
  }
  if (ph === "vote") {
    return head + `<div class="dlbox"><b>Who is the Saboteur? 😈</b></div><div class="pxbtns pxt2">${ids.filter(id => id !== c.ME).map(id => { const k = ids.indexOf(id); return `<button type="button" class="pxt${g.myvote === id ? " me" : ""}" data-a="px2" data-id="${id}" ${g.myvote ? "disabled" : ""}><svg viewBox="-30 -30 60 60" width="70" height="70">${blob(k)}</svg>${esc(c.nm(id))}</button>`; }).join("")}</div>${c.timer(g, 25000)}`;
  }
  const r = g.res || {}, gain = r.gain || {}, sk = ids.indexOf(r.sab);
  return `<div class="dlbox ${r.caught ? "dwin" : "dlose"}"><b>${r.caught ? "Saboteur caught! 😈" : "Saboteur got away! 😈"}</b><p>${esc(c.nm(r.sab))} · fighter ${g.health}%</p></div>
<svg class="px" viewBox="-60 -50 120 130" style="max-width:200px;margin:4px auto"><g>${figure(sk < 0 ? 0 : sk).replace('<g class="fN">', `<path d="M-22 -22l-6 -20l14 12zM22 -22l6 -20l-14 12z" fill="#d11b1b" stroke="#111" stroke-width="1.5"/><g class="fN">`)}</g></svg>
<div class="pxhud">${ids.map(id => `<div class="${id === c.ME ? "me" : ""}">${esc(short(c, id))}<b>${(g.score || {})[id] || 0}</b><span style="color:var(--grn)">+${gain[id] || 0}</span></div>`).join("")}</div>${c.final(g)}`;
}
function dirtyMount(g, c, el) {
  const r = g.res; if (!r) return; const say = $("pxsay"), fx = $("pxfx"), bx = $("pxsh"), hp = $("pxhp"), hn = $("pxhpn"), dm = $("pxdm"), fc = $("pxfc");
  const need = (PROB[g.prob] || PROB.cut)[1], items = [];
  for (let i = 0; i < r.c; i++) items.push(TOOL[need][0]); for (let i = 0; i < r.w; i++) items.push("🍌");
  const step = 560, tHit = 500 + Math.max(1, items.length) * step + 300, good = r.to >= r.from, delta = r.to - r.from;
  items.forEach((ic, n) => {
    const t = mk("text", { "font-size": "30", "text-anchor": "middle", opacity: "0" }, fx); t.textContent = ic; const x0 = PXS[n % 3];
    const a = anim(t, [{ transform: `translate(${x0}px,210px) rotate(0)`, opacity: 1 }, { transform: `translate(${(x0 + 150) / 2}px,110px) rotate(180deg)`, opacity: 1 }, { transform: "translate(150px,118px) rotate(360deg)", opacity: 1 }, { transform: "translate(150px,118px) rotate(360deg)", opacity: 0 }], { duration: 900, delay: 400 + n * step, fill: "both", easing: "ease-in-out" }); if (a) a.currentTime = el * 1000;
  });
  const a = anim(bx, [{ transform: "translate(0,0) rotate(0)" }, { transform: good ? "translate(0,-8px) rotate(3deg)" : "translate(-8px,2px) rotate(-6deg)" }, { transform: good ? "translate(0,0)" : "translate(8px,-2px) rotate(5deg)" }, { transform: "translate(0,0) rotate(0)" }], { duration: 650, delay: tHit, fill: "both" }); if (a) a.currentTime = el * 1000;
  if (hp) { const b = anim(hp, [{ width: r.from + "%", backgroundColor: hpColor(r.from) }, { width: r.to + "%", backgroundColor: hpColor(r.to) }], { duration: 800, delay: tHit, fill: "both", easing: "ease-out" }); if (b) b.currentTime = el * 1000; }
  const tm = Math.max(0, tHit - el * 1000);
  setTimeout(() => { if ($("pxhpn")) { hn.textContent = "❤ " + r.to + "%"; if (dm) dm.innerHTML = damage(r.to, g.prob); if (fc) fc.innerHTML = face(2, r.to < 45 ? "hit" : r.to < 75 ? "worry" : "smug");
    const f = document.createElement("div"); f.className = "pxfloat"; f.textContent = (delta >= 0 ? "+" : "") + delta + "%"; f.style.cssText += `color:${delta >= 0 ? "#3cc46c" : "#ff4d4d"};left:50%;top:30%;margin-left:-40px`; const sc = $("pxs"); if (sc && sc.parentNode) { sc.parentNode.style.position = "relative"; sc.parentNode.appendChild(f); const an = anim(f, [{ transform: "translateY(0) scale(.6)", opacity: 0 }, { transform: "translateY(-10px) scale(1.3)", opacity: 1, offset: .2 }, { transform: "translateY(-60px) scale(1)", opacity: 0 }], { duration: 1400 }); if (an) an.onfinish = () => f.remove(); } } }, tm);
  if (say) say.textContent = items.length ? `${r.c} right ✔ · ${r.w} wrong ✘` : "Nobody helped!";
}

/* ---------- public API used by party.js ---------- */
const FINAL = { oddout: 1, pie: 1, gloves: 1 };
window.PARTYX = {
  games: {
    oddout: { i: "🤔", t: "Odd Fighter Out", r: "Spot the odd fighter." },
    pie: { i: "🥧", t: "Pie Press Conference", r: "Tap a player to throw a pie. First to 10 wins." },
    gloves: { i: "🥊", t: "Rubber Gloves", r: "Flick your boxer to knock the others off. First to 5." },
    dirty: { i: "😈", t: "Dirty Corner", r: "Fix the fighter. Find the saboteur." }
  },
  html(g, c) {
    css(); L.c = c;
    if (g.phase === "intro") return c.intro(g);
    if (g.phase === "live") { L.g = g; return g.game === "pie" ? pieHtml(g, c) : glHtml(g, c); }
    if (g.phase === "over") return g.game === "dirty" ? dirty(g, c) : c.final(g);
    return g.game === "oddout" ? odd(g, c) : dirty(g, c);
  },
  mount(g, c) {
    TOK++; L.c = c; L.g = g;
    if (g.phase === "live") { if (g.game === "pie") pieInit(g, c); else glInit(g, c); return; }
    if (g.phase === "show" && g.game === "dirty") dirtyMount(g, c, Math.max(0, (c.srv() - (g.ends - SHOW.dirty)) / 1000));
  },
  update(g, c) { if (g.phase !== "live") return; if (g.game === "pie") pieUpdate(g, c); else glUpdate(g, c); },
  live(g) { return !!g && g.phase === "live"; },
  key(g) { return g.phase === "live" ? "live" : [(g.acted || []).join(), g.mine, g.prob, g.health, (g.voted || []).join(), g.myvote].join("~"); }
};
})();
