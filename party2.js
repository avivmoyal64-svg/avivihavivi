/* Party games, part 2: Odd Fighter Out, Pie in the Face Press Conference, Rubber Gloves, Dirty Corner.
   Animated SVG scenes with silly characters. The server decides every result; this file only draws it. Loaded after party.js. */
(function () {
"use strict";
const COL = ["#e23d3d", "#3d8be2", "#3db36b"], SKIN = ["#f6c9a0", "#e8b48a", "#cf9a6c"], PXS = [55, 150, 245];
const SHOW = { oddout: 5500, pie: 7500, gloves: 8500, dirty: 7000 };
let TOK = 0, AIM = null, STY = false;

function css() {
  if (STY) return; STY = true;
  const s = document.createElement("style");
  s.textContent = `
.px{display:block;width:100%;height:auto;margin:6px 0 10px;background:#17181b;border:2px solid var(--gold);border-radius:6px;touch-action:none;user-select:none;-webkit-user-select:none}
.pxwob{animation:pxw 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
@keyframes pxw{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
.pxbob{animation:pxb 1.2s ease-in-out infinite}@keyframes pxb{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.pxcards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}
.pxc{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;align-items:center;text-align:center;padding:8px 4px 10px;background:linear-gradient(160deg,#34353b,#26272b);border:3px solid #5a5b63;color:#fff;min-width:0;position:relative;transition:transform .15s}
.pxc:active{transform:scale(.96)}
.pxc.me{border-color:var(--gold);box-shadow:0 0 18px rgba(var(--rgb),.5)}.pxc.odd{border-color:var(--grn);box-shadow:0 0 22px rgba(60,220,120,.55);animation:pxp .6s ease-in-out 3}.pxc.bad{border-color:var(--red2);opacity:.75}
@keyframes pxp{50%{transform:scale(1.06)}}
.pxc i{display:block;width:100%;aspect-ratio:3/4;background:#3a3b42 center top/cover no-repeat;border:1px solid #6b6c75;margin-bottom:6px;font-style:normal;display:grid;place-items:center;font:italic 900 40px "Barlow Condensed",Arial,sans-serif;color:#888}
.pxc b{display:block;font:italic 900 15px/1.05 "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;overflow-wrap:break-word;hyphens:auto}
.pxc small{display:block;margin-top:3px;color:#cfcfd6;font:13px/1.25 Barlow,Heebo,Arial,sans-serif}
.pxc em{position:absolute;top:-10px;inset-inline-end:-6px;font:700 12px Barlow,Arial,sans-serif;font-style:normal;background:var(--gold);color:#111;border-radius:10px;padding:1px 7px}
.pxbtns{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0}
.pxt{all:unset;box-sizing:border-box;cursor:pointer;text-align:center;padding:12px 4px;background:#2c2d32;border:2px solid #5a5b63;color:#fff;font:italic 900 17px/1.1 "Barlow Condensed","Heebo",Arial,sans-serif;text-transform:uppercase;letter-spacing:.5px;min-width:0}
.pxt i{display:block;font-style:normal;font-size:34px;margin-bottom:2px}.pxt.me{border-color:var(--gold);background:#3a2f1f}.pxt:disabled{opacity:.55}
.pxt2{grid-template-columns:repeat(2,1fr)}
.pxhp{height:16px;background:#3a3b42;border:1px solid #6b6c75;margin:4px 0 8px;overflow:hidden}.pxhp u{display:block;height:100%;background:linear-gradient(90deg,#d93a3a,#e8c13a 55%,#3cc46c);background-size:300px 100%;transition:width .3s}
.pxsay{margin:8px 0;padding:10px 12px;background:#2c2d32;border-inline-start:5px solid var(--gold);font:16px/1.35 Barlow,Heebo,Arial,sans-serif}
.pxsay.g{border-color:var(--grn);background:#233127}.pxsay.r{border-color:var(--red2);background:#3a2323}`;
  document.head.appendChild(s);
}

/* ---------- silly characters ---------- */
function face(i, mood) {
  const eyes = mood === "hit"
    ? `<path d="M-13 -9l9 8M-4 -9l-9 8M4 -9l9 8M13 -9l-9 8" stroke="#222" stroke-width="2.6" stroke-linecap="round"/>`
    : `<circle cx="-8" cy="-5" r="7" fill="#fff" stroke="#222" stroke-width="1.6"/><circle cx="8" cy="-5" r="7" fill="#fff" stroke="#222" stroke-width="1.6"/><circle cx="${mood === "worry" ? -7 : -6}" cy="-4" r="2.8" fill="#222"/><circle cx="${mood === "worry" ? 9 : 10}" cy="-4" r="2.8" fill="#222"/>`;
  const mouth = mood === "hit" ? `<ellipse cx="0" cy="12" rx="6" ry="4.5" fill="#7a1f1f"/>` : mood === "worry" ? `<path d="M-9 13q4.5 -5 9 0t9 0" fill="none" stroke="#222" stroke-width="2.2" stroke-linecap="round"/>` : mood === "smug" ? `<path d="M-9 11q9 8 18 -2" fill="none" stroke="#222" stroke-width="2.4" stroke-linecap="round"/>` : `<path d="M-9 10q9 9 18 0" fill="none" stroke="#222" stroke-width="2.4" stroke-linecap="round"/>`;
  const ex = i === 0 ? `<path d="M-14 6q7 -7 14 0q7 -7 14 0q-7 6 -14 3q-7 3 -14 -3z" fill="#4a2b14"/>` : i === 1 ? `<circle cx="0" cy="3" r="5.5" fill="#d98c63" stroke="#b86d45" stroke-width="1"/>` : `<rect x="-5" y="13" width="4.5" height="6" rx="1" fill="#fff" stroke="#222" stroke-width="1"/><rect x="0.5" y="13" width="4.5" height="6" rx="1" fill="#fff" stroke="#222" stroke-width="1"/>`;
  return eyes + ex + (mood === "hit" || mood === "worry" ? "" : "") + mouth;
}
function hair(i) {
  return i === 0 ? `<path d="M-23 -8q0 -26 23 -26t23 26q-23 -9 -46 0z" fill="#c92a2a"/><rect x="-25" y="-10" width="50" height="6" rx="3" fill="#a31f1f"/>`
    : i === 1 ? `<path d="M-5 -22l5 -22l5 22z M-14 -20l-3 -18l9 16z M14 -20l3 -18l-9 16z" fill="#7a3fd1"/>`
    : `<path d="M-20 -14q20 -16 40 0" fill="none" stroke="#444" stroke-width="2.4"/><circle cx="-8" cy="-5" r="10" fill="none" stroke="#333" stroke-width="2"/><circle cx="8" cy="-5" r="10" fill="none" stroke="#333" stroke-width="2"/><path d="M-1 -5h2" stroke="#333" stroke-width="2"/>`;
}
/* a full silly boxer centred on the head (0,0); the body hangs below */
function guy(i, mood, extra) {
  return `<g>${extra || ""}<path d="M-26 20q0 -6 8 -6h36q8 0 8 6v40h-52z" fill="${COL[i]}" stroke="#111" stroke-width="2"/><circle cx="-31" cy="38" r="11" fill="#d93a3a" stroke="#111" stroke-width="2"/><circle cx="31" cy="38" r="11" fill="#d93a3a" stroke="#111" stroke-width="2"/>
<circle r="23" fill="${SKIN[i]}" stroke="#111" stroke-width="2.2"/>${hair(i)}${face(i, mood)}</g>`;
}
/* just the head, for the small ring fighters */
function blob(i, mood) { return `<circle r="22" fill="${SKIN[i]}" stroke="${COL[i]}" stroke-width="5"/>${face(i, mood)}`; }
function cream(n, base) {
  const P = [[-10, -14, 8], [9, -8, 9], [-4, 6, 8], [12, 9, 7], [-14, 2, 7]];
  let o = ""; for (let k = 0; k < Math.min(n, 5); k++) { const p = P[k]; o += `<g class="${base || ""}"><circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="#fff" stroke="#e8d6b0" stroke-width="1.5"/><circle cx="${p[0] - 2}" cy="${p[1] - 2}" r="2" fill="#f2b8c6"/></g>`; }
  return o;
}
const seatI = (g, id) => Math.max(0, (g.seats || []).indexOf(id));
const short = (c, id) => { const n = c.nm(id); return n.length > 9 ? n.slice(0, 8) + "…" : n; };
const wait = (g, c, txt) => `<div class="pxsay g">${txt || "Locked in. Waiting for the others…"} <small>(${(g.acted || []).length} of 3)</small></div>`;
function dirtyBadge(g) { return g.role === "sab" ? `<div class="pxsay r">😈 You are the SABOTEUR. Quietly use the wrong tool, and don't get caught.</div>` : `<div class="pxsay">🧑‍⚕️ You are a CORNERMAN. Fix the problem. One of you is secretly a saboteur.</div>`; }

/* ---------- Odd Fighter Out ---------- */
const ODDR = {
  wc: "The other two fight in the same weight class.", pct_hi: "The other two have a win rate of 80% or more.", pct_lo: "The other two have a win rate of 70% or less.",
  fights_hi: "The other two have 25 or more fights.", fights_lo: "The other two have 15 or fewer fights.", loss_lo: "The other two have 2 or fewer losses.", loss_hi: "The other two have 6 or more losses."
};
function card(c, n, cls, tag) {
  const ph = c.photo(n);
  return `<i style="${ph ? "background-image:url(" + ph + ")" : ""}">${ph ? "" : esc(String(n).charAt(0))}</i><b>${esc(n)}</b>`;
}
function odd(g, c) {
  const cd = g.cards || [], res = g.res, ph = g.phase;
  const rec = x => `<small>${esc(x.wc || "")}<br><span dir="ltr">${x.w}-${x.l}-${x.d}</span></small>`;
  if (ph === "act") {
    return `<div class="dlbox"><b>Round ${g.round} of ${g.total} · Which fighter does not belong?</b><p>Tap the odd one out. Right gets 2 points, the fastest right gets +1.</p></div>
<div class="pxcards">${cd.map((x, k) => `<button type="button" class="pxc${g.mine === String(k) ? " me" : ""}" data-a="px" data-id="${k}" ${g.mine != null ? "disabled" : ""}>${card(c, x.n)}${rec(x)}</button>`).join("")}</div>
${g.mine != null ? wait(g, c) : ""}${c.timer(g, 14000)}`;
  }
  const rs = (res && res.rules || []).map(r => ODDR[r]).filter(Boolean)[0] || "";
  const gain = (res && res.gain) || {}, ids = g.seats || [];
  return `<div class="dlbox"><b>Round ${g.round} of ${g.total}</b></div>
<div class="pxcards">${cd.map((x, k) => `<div class="pxc${res && res.odd === k ? " odd" : (g.mine === String(k) ? " bad" : "")}">${card(c, x.n)}${rec(x)}${res && res.odd === k ? "<em>ODD ONE</em>" : ""}</div>`).join("")}</div>
${rs ? `<div class="pxsay g">${esc(rs)} The odd one is different.</div>` : ""}
${ids.map(id => { const p = res && res.picks ? res.picks[id] : null; return `<div class="ptrow${gain[id] > 0 ? " w" : ""}"><div><b>${esc(c.nm(id))}${id === c.ME ? " (you)" : ""}</b><small>${p == null ? "No answer" : p === String(res.odd) ? "Got it" + (res.fast === id ? " · fastest ⚡" : "") : "Missed"}</small></div><strong>+${gain[id] || 0}</strong></div>`; }).join("")}
${c.board(g, false)}<div class="pfn" style="text-align:center">${g.round >= g.total ? "Final scores next" : "Next round in"} <span data-end="${g.ends}">${c.secs(g.ends)}</span>s</div>`;
}

/* ---------- Pie in the Face Press Conference ---------- */
function pieScene(g, c, show) {
  const sp = g.splat || {}, ids = g.seats || [], thr = (show && g.res && g.res.thr) || [];
  let hits = [0, 0, 0]; thr.forEach(t => { if (t.h >= 0) hits[t.h]++; });
  let o = `<svg class="px" id="pxs" viewBox="0 0 300 200"><defs><linearGradient id="pxw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b1b2a"/><stop offset="1" stop-color="#2a0f18"/></linearGradient></defs>
<rect width="300" height="200" fill="url(#pxw)"/><path d="M0 0h40q-12 70 0 200h-40z M300 0h-40q12 70 0 200h40z" fill="#7d2438" opacity=".85"/>
<rect x="70" y="8" width="160" height="22" rx="4" fill="#111" stroke="var(--gold,#e6b422)" stroke-width="2"/><text x="150" y="24" text-anchor="middle" fill="#e6b422" font-size="13" font-weight="900" font-family="Arial,sans-serif" letter-spacing="1.5">PRESS CONFERENCE</text>`;
  ids.forEach((id, k) => {
    const pre = (sp[id] || 0) - (show ? hits[k] : 0), cur = sp[id] || 0, ducked = show && g.res && g.res.duck && g.res.duck[k];
    o += `<g id="pxg${k}" transform="translate(${PXS[k]} 84)"><g id="pxh${k}">${guy(k, cur > 1 ? "hit" : "smug")}<g id="pxo${k}">${cream(pre, "")}${show ? `<g id="pxn${k}" opacity="0">${cream(cur, "").replace(/<g class="">/g, "<g>")}</g>` : ""}</g></g></g>`;
  });
  ids.forEach((id, k) => {
    o += `<rect x="${PXS[k] - 38}" y="124" width="76" height="62" rx="4" fill="#3a2a1c" stroke="#111" stroke-width="2"/><rect x="${PXS[k] - 38}" y="124" width="76" height="9" fill="#5a3f27"/>
<rect x="${PXS[k] - 2}" y="110" width="4" height="16" fill="#222"/><ellipse cx="${PXS[k]}" cy="108" rx="6" ry="7" fill="#444" stroke="#111"/>
<text x="${PXS[k]}" y="156" text-anchor="middle" fill="${COL[k]}" font-size="12" font-weight="900" font-family='Arial,sans-serif'>${esc(short(c, id))}</text><text x="${PXS[k]}" y="174" text-anchor="middle" fill="#fff" font-size="15" font-weight="900" font-family="Arial,sans-serif">${(g.score || {})[id] || 0}</text>`;
  });
  o += `<g id="pxp"></g></svg>`; return o;
}
function pie(g, c) {
  const ph = g.phase, ids = g.seats || [], me = g.mine;
  if (ph === "act") {
    const mine = me != null, others = ids.filter(id => id !== c.ME);
    return `<div class="dlbox"><b>Round ${g.round} of ${g.total}</b><p>Throw a pie at someone, or duck. Hit +1, hit by a pie −1.</p></div>${pieScene(g, c, false)}
<div class="pxbtns">${others.map(id => `<button type="button" class="pxt${me === id ? " me" : ""}" data-a="px" data-id="${id}" ${mine ? "disabled" : ""}><i>🥧</i>${esc(short(c, id))}</button>`).join("")}<button type="button" class="pxt${me === "D" ? " me" : ""}" data-a="px" data-id="D" ${mine ? "disabled" : ""}><i>🙈</i>Duck</button></div>
${mine ? wait(g, c) : ""}${c.timer(g, 8000)}`;
  }
  const gain = (g.res && g.res.gain) || {};
  return `${pieScene(g, c, true)}<div class="pxsay" id="pxsay">Pies are flying…</div>${ids.map(id => `<div class="ptrow${gain[id] > 0 ? " w" : ""}"><div><b>${esc(c.nm(id))}${id === c.ME ? " (you)" : ""}</b></div><strong>${gain[id] > 0 ? "+" : ""}${gain[id] || 0}</strong></div>`).join("")}
<div class="pfn" style="text-align:center">${g.round >= g.total ? "Final scores next" : "Next round in"} <span data-end="${g.ends}">${c.secs(g.ends)}</span>s</div>`;
}
function pieMount(g, c, el) {
  const r = g.res; if (!r) return; const ids = g.seats, thr = r.thr || [], PL = document.getElementById("pxp"), say = document.getElementById("pxsay");
  const play = (node, kf, o) => { try { const a = node.animate(kf, Object.assign({ fill: "both", easing: "ease-in-out" }, o)); a.currentTime = el * 1000; return a; } catch (e) { return null; } };
  const nDuck = (r.duck || []).filter(Boolean).length, T = 600 + thr.length * 1700 + 300;
  (r.duck || []).forEach((d, k) => { if (d) play(document.getElementById("pxg" + k), [{ transform: `translate(${PXS[k]}px,84px)` }, { transform: `translate(${PXS[k]}px,150px)` }, { transform: `translate(${PXS[k]}px,150px)` }, { transform: `translate(${PXS[k]}px,84px)` }], { duration: T, delay: 200, offset: [0, .08, .9, 1] }); });
  thr.forEach((t, n) => {
    const T0 = 600 + n * 1700, x0 = PXS[t.f], x1 = PXS[t.t], pie = document.createElementNS("http://www.w3.org/2000/svg", "g");
    pie.innerHTML = `<ellipse rx="10" ry="4.5" fill="#d9a35a" stroke="#111"/><ellipse cy="-3" rx="8.5" ry="3.8" fill="#fff" stroke="#e8d6b0"/><circle cy="-6" r="2" fill="#d1304a"/>`; pie.setAttribute("opacity", "0"); PL.appendChild(pie);
    const at = (x, y) => `translate(${x}px,${y}px)`;
    let kf, dur = 650;
    if (t.h === t.t) kf = [{ transform: at(x0, 112), opacity: 1 }, { transform: at((x0 + x1) / 2, 50), opacity: 1 }, { transform: at(x1, 84), opacity: 1 }, { transform: at(x1, 84), opacity: 0 }];
    else if (t.h >= 0) { const x2 = PXS[t.h]; dur = 1250; kf = [{ transform: at(x0, 112), opacity: 1 }, { transform: at((x0 + x1) / 2, 40), opacity: 1 }, { transform: at(x1, 70), opacity: 1 }, { transform: at((x1 + x2) / 2, 38), opacity: 1 }, { transform: at(x2, 84), opacity: 1 }, { transform: at(x2, 84), opacity: 0 }]; }
    else { dur = 1100; kf = [{ transform: at(x0, 112), opacity: 1 }, { transform: at(x1, 70), opacity: 1 }, { transform: at(x1 + (x1 > 150 ? 60 : -60), -30), opacity: 1 }, { transform: at(x1 + (x1 > 150 ? 60 : -60), -30), opacity: 0 }]; }
    play(pie, kf, { duration: dur, delay: T0, easing: "linear" });
    /* the pie holder winds up */
    play(document.getElementById("pxh" + t.f), [{ transform: "translate(0,0) rotate(0)" }, { transform: "translate(0,-4px) rotate(-8deg)" }, { transform: "translate(0,0) rotate(0)" }], { duration: 500, delay: T0 - 200 });
    if (t.h >= 0) {
      const hd = document.getElementById("pxh" + t.h), nn = document.getElementById("pxn" + t.h);
      play(nn, [{ opacity: 0 }, { opacity: 0, offset: .01 }, { opacity: 1 }], { duration: 400, delay: T0 + dur - 50 });
      play(hd, [{ transform: "translate(0,0) rotate(0)" }, { transform: "translate(0,-6px) rotate(-12deg)" }, { transform: "translate(0,0) rotate(7deg)" }, { transform: "translate(0,0) rotate(0)" }], { duration: 500, delay: T0 + dur - 60 });
    }
  });
  if (say) {
    const mine = thr.find(t => t.h === ids.indexOf(c.ME));
    const msgs = [];
    thr.forEach(t => { const f = c.nm(ids[t.f]), a = c.nm(ids[t.t]); msgs.push(t.h === t.t ? `${f} splatted ${a}!` : t.h >= 0 ? `${a} ducked, so the pie hit ${c.nm(ids[t.h])}!` : `${f}'s pie missed everybody!`); });
    say.textContent = msgs.join(" ") || "Nobody threw a pie. Boring!";
  }
}

/* ---------- Rubber Gloves ---------- */
const GLR = 130;
function glStart(g, k) { const a = (-90 + k * 120) * Math.PI / 180, R = g.ring || 100; return [0.55 * R * Math.cos(a), 0.55 * R * Math.sin(a)]; }
function glScene(g, c, show) {
  const ids = g.seats || [], R = show ? g.res.R : g.ring;
  let o = `<svg class="px" id="pxs" viewBox="-${GLR} -${GLR} ${GLR * 2} ${GLR * 2}" style="background:#0e2a3a"><defs><radialGradient id="pxr" cx=".5" cy=".5" r=".5"><stop offset=".8" stop-color="#e8e1cf"/><stop offset="1" stop-color="#b9a97d"/></radialGradient></defs>
<circle id="pxring" r="${R + 14}" fill="#12384f" stroke="#2c6a8c" stroke-width="3" stroke-dasharray="8 6"/><circle r="${R}" fill="url(#pxr)" stroke="#e6b422" stroke-width="5"/><circle r="${R * .55}" fill="none" stroke="#c9bd98" stroke-width="1.5" stroke-dasharray="3 5"/>
<text y="4" text-anchor="middle" fill="#c9bd98" font-size="11" font-weight="900" font-family="Arial,sans-serif" opacity=".6">RUBBER GLOVES</text><g id="pxarrow"></g>`;
  ids.forEach((id, k) => { const p = glStart({ ring: R }, k); o += `<g id="pxf${k}" transform="translate(${p[0]} ${p[1]}) scale(.5)"><g id="pxfi${k}">${blob(k, "smug")}</g></g><text id="pxn${k}" x="${p[0]}" y="${p[1] - 17}" text-anchor="middle" fill="${COL[k]}" stroke="#111" stroke-width=".4" font-size="10" font-weight="900" font-family="Arial,sans-serif">${esc(short(c, id))}${id === c.ME ? " ★" : ""}</text>`; });
  return o + `</svg>`;
}
function gloves(g, c) {
  const ph = g.phase, ids = g.seats || [];
  if (ph === "act") {
    const mine = g.mine != null;
    return `<div class="dlbox"><b>Round ${g.round} of ${g.total}</b><p>Drag on the ring to aim your boxer ★ and choose how hard. The last one standing scores. Knock others off for +1.</p></div>${glScene(g, c, false)}
${mine ? wait(g, c, "Flung! Waiting for the others…") : `<button class="ptgo" style="width:100%" type="button" data-a="fling" id="pxgo">Fling!</button>`}${c.timer(g, 12000)}`;
  }
  const gain = (g.res && g.res.gain) || {};
  return `${glScene(g, c, true)}<div class="pxsay" id="pxsay">Hold on tight…</div><div id="pxrs" style="display:none">${ids.map(id => `<div class="ptrow${gain[id] > 0 ? " w" : ""}"><div><b>${esc(c.nm(id))}${id === c.ME ? " (you)" : ""}</b></div><strong>+${gain[id] || 0}</strong></div>`).join("")}</div>
<div class="pfn" style="text-align:center">${g.round >= g.total ? "Final scores next" : "Next round in"} <span data-end="${g.ends}">${c.secs(g.ends)}</span>s</div>`;
}
function glAim(g, c) {
  const svg = document.getElementById("pxs"); if (!svg || g.mine != null) return;
  const k = (g.seats || []).indexOf(c.ME), s = glStart(g, k), ar = document.getElementById("pxarrow"); AIM = AIM && AIM.r === g.round ? AIM : null;
  const draw = () => { if (!AIM) { ar.innerHTML = ""; return; } const L = 18 + AIM.p * 62, ex = s[0] + Math.cos(AIM.a) * L, ey = s[1] + Math.sin(AIM.a) * L; ar.innerHTML = `<line x1="${s[0]}" y1="${s[1]}" x2="${ex}" y2="${ey}" stroke="${AIM.p > .66 ? "#e23d3d" : AIM.p > .33 ? "#e6b422" : "#3db36b"}" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 8"/><circle cx="${ex}" cy="${ey}" r="6" fill="#fff" stroke="#111"/>`; };
  const pt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const m = svg.getScreenCTM(); return m ? p.matrixTransform(m.inverse()) : { x: 0, y: 0 }; };
  const set = e => { const q = pt(e), dx = q.x - s[0], dy = q.y - s[1], d = Math.hypot(dx, dy); if (d < 3) return; AIM = { r: g.round, a: Math.atan2(dy, dx), p: Math.min(1, d / 75) }; draw(); };
  let down = false;
  svg.onpointerdown = e => { down = true; try { svg.setPointerCapture(e.pointerId); } catch (er) {} set(e); e.preventDefault(); };
  svg.onpointermove = e => { if (down) set(e); };
  svg.onpointerup = svg.onpointercancel = () => { down = false; };
  draw();
}
function glMount(g, c, el) {
  const r = g.res; if (!r) return; const ids = g.seats, F = r.frames || [], tok = ++TOK, T0 = 700, STEP = 45, k0 = (r.has || []).map(Boolean);
  const say = document.getElementById("pxsay"), rs = document.getElementById("pxrs"), ring = document.getElementById("pxring");
  const ang = i => { return 0; };
  const outAt = i => (r.outs[i] >= 0 ? Math.floor(r.outs[i] / 2) : 999);
  let done = false;
  const tickf = () => {
    if (tok !== TOK || !document.getElementById("pxs")) return;
    const t = c.srv() - (g.ends - SHOW.gloves) - T0, idx = Math.max(0, Math.min(F.length - 1, Math.floor(t / STEP))), f = F[idx];
    ids.forEach((id, i) => {
      const gEl = document.getElementById("pxf" + i), nEl = document.getElementById("pxn" + i); if (!gEl) return;
      const x = f[i * 2], y = f[i * 2 + 1], o = outAt(i), fall = idx >= o ? Math.min(1, (idx - o) / 10) : 0;
      gEl.setAttribute("transform", `translate(${x} ${y}) scale(${(.5 * (1 - .7 * fall)).toFixed(3)}) rotate(${(fall * 540).toFixed(0)})`); gEl.setAttribute("opacity", (1 - fall * .85).toFixed(2));
      if (nEl) { nEl.setAttribute("x", x); nEl.setAttribute("y", y - 17); nEl.setAttribute("opacity", fall > 0 ? 0 : 1); }
      const fi = document.getElementById("pxfi" + i); if (fi && !fi.dataset.m && idx >= o) { fi.dataset.m = 1; fi.innerHTML = blob(i, "hit"); }
    });
    if (idx >= F.length - 1 && !done) {
      done = true;
      const alive = ids.filter((id, i) => r.outs[i] < 0).map(id => c.nm(id));
      if (say) say.textContent = alive.length ? (alive.length === 3 ? "Nobody fell off! Everybody survives (+1 each)." : alive.join(" and ") + (alive.length > 1 ? " survived the round!" : " survived the round!")) : "Everybody flew off the ring!";
      if (rs) rs.style.display = "block";
    }
    requestAnimationFrame(tickf);
  };
  requestAnimationFrame(tickf);
}

/* ---------- Dirty Corner ---------- */
const PROB = { cut: ["A bleeding eyebrow! 🩸", "jelly"], swell: ["A swollen eye! 🟣", "ice"], tired: ["Totally exhausted! 😮‍💨", "water"] };
const TOOL = { jelly: ["🫙", "Jelly"], ice: ["🧊", "Ice pack"], water: ["💧", "Water"] };
function boxer(prob, mood, hit) {
  const prob2 = prob === "cut" ? `<path d="M-12 -17q2 8 0 14" stroke="#d11b1b" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="-12" cy="-1" r="3" fill="#d11b1b"/>`
    : prob === "swell" ? `<circle cx="8" cy="-5" r="10" fill="#8f4fc2" opacity=".85"/><circle cx="8" cy="-5" r="6" fill="#6b2f98" opacity=".8"/>`
    : `<path d="M20 -18q4 6 0 10q-4 -4 0 -10z M-22 -14q4 6 0 10q-4 -4 0 -10z" fill="#7fd0ff" stroke="#2a7ab0"/><path d="M-5 14q5 10 10 0z" fill="#e0556b"/>`;
  return `<g class="pxwob"><g>${guy(2, mood).replace(/fill="#3db36b"/g, 'fill="#e6b422"')}</g>${prob2}</g>`;
}
function dirtyScene(g, c, show) {
  const ids = g.seats || [], pb = PROB[g.prob] || PROB.cut, r = g.res, hp = show && r ? r.from : g.health;
  let o = `<svg class="px" id="pxs" viewBox="0 0 300 220"><rect width="300" height="220" fill="#1c2733"/><path d="M0 150h300v70h-300z" fill="#2c3b4c"/>
<rect x="8" y="30" width="10" height="130" fill="#888"/><rect x="282" y="30" width="10" height="130" fill="#888"/><path d="M13 55h280M13 85h280M13 115h280" stroke="#d93a3a" stroke-width="4"/>
<rect x="110" y="125" width="80" height="12" rx="3" fill="#8a6a3a"/><rect x="118" y="137" width="6" height="30" fill="#6b4f27"/><rect x="176" y="137" width="6" height="30" fill="#6b4f27"/>
<g id="pxbx" transform="translate(150 70)">${boxer(g.prob, "worry")}</g>
<text x="150" y="20" text-anchor="middle" fill="#e6b422" font-size="14" font-weight="900" font-family="Arial,sans-serif">${esc(pb[0])}</text><g id="pxfx"></g>`;
  ids.forEach((id, k) => { o += `<g transform="translate(${PXS[k]} 178) scale(.42)">${guy(k, "smug")}</g><text x="${PXS[k]}" y="212" text-anchor="middle" fill="${COL[k]}" font-size="10" font-weight="900" font-family="Arial,sans-serif">${esc(short(c, id))}${id === c.ME ? " ★" : ""}</text>`; });
  return o + `</svg><div class="pxhp"><u id="pxhp" style="width:${hp}%"></u></div>`;
}
function dirty(g, c) {
  const ph = g.phase, ids = g.seats || [], head = ph === "intro" ? "" : dirtyBadge(g);
  if (ph === "act") {
    const mine = g.mine != null;
    return head + `<div class="dlbox"><b>Round ${g.round} of ${g.total} · Fighter health ${g.health}%</b><p>Pick the right tool for the problem.</p></div>${dirtyScene(g, c, false)}
<div class="pxbtns">${["jelly", "ice", "water"].map(t => `<button type="button" class="pxt${g.mine === t ? " me" : ""}" data-a="px" data-id="${t}" ${mine ? "disabled" : ""}><i>${TOOL[t][0]}</i>${TOOL[t][1]}</button>`).join("")}</div>${mine ? wait(g, c) : ""}${c.timer(g, 8000)}`;
  }
  if (ph === "show") {
    const r = g.res || {}, pk = g.peek;
    return head + dirtyScene(g, c, true) + `<div class="pxsay" id="pxsay">The cornermen get to work…</div>${pk ? `<div class="pxsay">🔍 Secret peek: you saw ${esc(c.nm(pk.u))} grab <b>${esc((TOOL[pk.tool] || ["", "something"])[1])}</b>… it looked ${pk.ok ? "right" : "wrong"}.</div>` : ""}
<div class="pfn" style="text-align:center">${g.round >= g.total ? "Time to find the saboteur in" : "Next round in"} <span data-end="${g.ends}">${c.secs(g.ends)}</span>s</div>`;
  }
  if (ph === "vote") {
    const voted = g.myvote;
    return head + `<div class="dlbox"><b>Who is the Saboteur? 😈</b><p>Fighter health ended at ${g.health}%. Tap who you think was sabotaging.</p></div>
<div class="pxbtns pxt2">${ids.filter(id => id !== c.ME).map(id => { const k = ids.indexOf(id); return `<button type="button" class="pxt${voted === id ? " me" : ""}" data-a="px2" data-id="${id}" ${voted ? "disabled" : ""}><svg viewBox="-30 -30 60 60" width="64" height="64">${blob(k, "smug")}</svg>${esc(c.nm(id))}</button>`; }).join("")}</div>
<div class="pfn" style="text-align:center">${(g.voted || []).length} of 3 voted</div>${c.timer(g, 25000)}`;
  }
  const r = g.res || {}, gain = r.gain || {}, sk = ids.indexOf(r.sab), v = g.votes || {};
  return `<div class="dlbox ${r.caught ? "dwin" : "dlose"}"><b>${r.caught ? "The Saboteur was caught! 😈" : "The Saboteur got away! 😈"}</b><p>${esc(c.nm(r.sab))} was the Saboteur. Your fighter ${r.ok ? "stayed healthy" : "was in bad shape"} (${g.health}%).</p></div>
<svg class="px" viewBox="-60 -50 120 130" style="max-width:240px;margin:6px auto"><g transform="translate(0 0)">${guy(sk < 0 ? 0 : sk, "smug", `<path d="M-22 -22l-6 -20l14 12z M22 -22l6 -20l-14 12z" fill="#d11b1b" stroke="#111" stroke-width="1.5"/>`)}</g></svg>
${ids.map(id => `<div class="ptrow${gain[id] > 0 ? " w" : ""}"><div><b>${esc(c.nm(id))}${id === c.ME ? " (you)" : ""}${id === r.sab ? " 😈" : ""}</b><small>${v[id] ? "Accused " + esc(c.nm(v[id])) : "No vote"}</small></div><strong>+${gain[id] || 0}</strong></div>`).join("")}${c.final(g)}`;
}
function dirtyMount(g, c, el) {
  const r = g.res; if (!r) return; const ids = g.seats, say = document.getElementById("pxsay"), fx = document.getElementById("pxfx"), bx = document.getElementById("pxbx"), hp = document.getElementById("pxhp");
  const play = (node, kf, o) => { try { const a = node.animate(kf, Object.assign({ fill: "both", easing: "ease-out" }, o)); a.currentTime = el * 1000; return a; } catch (e) { return null; } };
  const need = (PROB[g.prob] || PROB.cut)[1], items = [];
  for (let i = 0; i < r.c; i++) items.push(TOOL[need][0]); for (let i = 0; i < r.w; i++) items.push("🍌");
  items.sort(() => 0); const order = [0, 1, 2].slice(0, items.length);
  items.forEach((ic, n) => {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text"); t.setAttribute("font-size", "26"); t.setAttribute("text-anchor", "middle"); t.textContent = ic; t.setAttribute("opacity", "0"); fx.appendChild(t);
    const x0 = PXS[order[n]];
    play(t, [{ transform: `translate(${x0}px,170px)`, opacity: 1 }, { transform: `translate(${(x0 + 150) / 2}px,60px) rotate(180deg)`, opacity: 1 }, { transform: `translate(150px,78px) rotate(360deg)`, opacity: 1 }, { transform: `translate(150px,78px) rotate(360deg)`, opacity: 0 }], { duration: 1100, delay: 500 + n * 750, easing: "ease-in-out" });
  });
  const good = r.to >= r.from;
  play(bx, [{ transform: "translate(150px,70px) rotate(0)" }, { transform: "translate(150px,64px) rotate(" + (good ? 4 : -9) + "deg)" }, { transform: "translate(150px,70px) rotate(0)" }], { duration: 700, delay: 500 + items.length * 750 });
  if (hp) play(hp, [{ width: r.from + "%" }, { width: r.to + "%" }], { duration: 900, delay: 700 + items.length * 750 });
  if (say) say.textContent = items.length ? `${r.c} right tool${r.c === 1 ? "" : "s"}, ${r.w} wrong. Health ${r.from}% → ${r.to}%.` : `Nobody did anything! Health ${r.from}% → ${r.to}%.`;
}

/* ---------- public API used by party.js ---------- */
const MAP = { oddout: odd, pie: pie, gloves: gloves, dirty: dirty };
window.PARTYX = {
  games: {
    oddout: { i: "🤔", t: "Odd Fighter Out", s: "Three fighters. Spot the one that doesn't belong.", r: "Three fighters appear. Tap the one that doesn't belong. Right is 2 points, the fastest right answer gets +1. 6 rounds." },
    pie: { i: "🥧", t: "Pie Press Conference", s: "Throw pies or duck. Don't get splatted.", r: "Throw a pie at someone, or duck. A hit is +1, getting hit is −1. If your target ducks, the pie flies on to the third player! 6 rounds." },
    gloves: { i: "🥊", t: "Rubber Gloves", s: "Fling your boxer and knock the others off the ring.", r: "Drag to aim and set the power, then fling your boxer. Stay on the ring to score, knock others off for +1. The ring shrinks. 5 rounds." },
    dirty: { i: "😈", t: "Dirty Corner", s: "Patch up your fighter. One of you is a saboteur.", r: "Pick the right tool to fix your fighter's problem. One of you is secretly a saboteur. After 4 rounds, vote out the saboteur." }
  },
  html(g, c) { css(); const f = MAP[g.game]; if (!f) return ""; if (g.phase === "intro") return c.intro(g); if (g.phase === "over") return (g.game === "dirty" ? dirty(g, c) : c.final(g)); return f(g, c); },
  mount(g, c) {
    TOK++; if (g.phase === "act" && g.game === "gloves") glAim(g, c);
    if (g.phase === "show") {
      const el = Math.max(0, (c.srv() - (g.ends - SHOW[g.game])) / 1000);
      if (g.game === "pie") pieMount(g, c, el); else if (g.game === "gloves") glMount(g, c, el); else if (g.game === "dirty") dirtyMount(g, c, el);
    }
  },
  aim() { return AIM; },
  key(g) { return [(g.acted || []).join(), g.mine, g.prob, g.health, (g.voted || []).join(), g.myvote].join("~"); }
};
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
})();
