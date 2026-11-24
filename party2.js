/* Party games, part 2: Odd Fighter Out, Pie in the Face Press Conference (live), Rubber Gloves (live), Dirty Corner.
   Animated SVG scenes with silly characters. The server decides every result; this file only draws it. Loaded before party.js. */
(function () {
"use strict";
const NS = "http://www.w3.org/2000/svg";
const COL = ["#e23d3d", "#3d8be2", "#3db36b"], SKIN = ["#f6c9a0", "#e8b48a", "#cf9a6c"], PXS = [55, 150, 245];

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
const wait = (g, txt) => `<div class="pxsay g">${txt || "Locked in ✓"} <small>(${(g.acted || []).length}/${(g.seats || []).length || 3})</small></div>`;

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

function hud(g, c, max) {
  const ids = g.seats || [], sc = g.score || {};
  return ids.map((id, k) => `<div class="${id === c.ME ? "me" : ""}" style="border-color:${COL[k]}">${esc(short(c, id))}<b>${sc[id] || 0}</b><u style="width:${Math.min(100, 100 * (sc[id] || 0) / max)}%"></u></div>`).join("");
}
const stopTouchScroll = el => { el.addEventListener("touchstart", e => e.preventDefault(), { passive: false }); el.addEventListener("touchmove", e => e.preventDefault(), { passive: false }); };
/* ---------- 3D-style canvas toolkit (shaded spheres, perspective floors, cached sprites, no DOM per frame) ---------- */
const DPR = Math.min(2, window.devicePixelRatio || 1);
const TAU = Math.PI * 2;
const SK = ["#f6c9a0", "#e8b48a", "#cf9a6c"];
function rgb(h) { h = h.replace("#", ""); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function shade(h, a) { const [r, g, b] = rgb(h), f = a < 0 ? 0 : 255, p = Math.abs(a); return "rgb(" + Math.round(r + (f - r) * p) + "," + Math.round(g + (f - g) * p) + "," + Math.round(b + (f - b) * p) + ")"; }
function sphere(c, x, y, r, col, ow) {
  const g = c.createRadialGradient(x - r * .35, y - r * .42, r * .08, x, y, r * 1.02);
  g.addColorStop(0, shade(col, .6)); g.addColorStop(.4, col); g.addColorStop(1, shade(col, -.55));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  if (ow !== 0) { c.lineWidth = ow || 1.4; c.strokeStyle = "rgba(10,10,14,.85)"; c.stroke(); }
}
function ell(c, x, y, rx, ry, col, a) { c.save(); c.globalAlpha = a == null ? 1 : a; c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); c.restore(); }
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const off = (w, h) => { const o = document.createElement("canvas"); o.width = Math.round(w * DPR); o.height = Math.round(h * DPR); const c = o.getContext("2d"); c.scale(DPR, DPR); return [o, c]; };
function text(c, t, x, y, size, fill, stroke) { c.font = "900 " + size + "px Arial,sans-serif"; c.textAlign = "center"; c.lineJoin = "round"; if (stroke) { c.lineWidth = size / 4; c.strokeStyle = stroke; c.strokeText(t, x, y); } c.fillStyle = fill; c.fillText(t, x, y); }

/* faces drawn on a head of radius 24 centred on (0,0) */
function drawFace(c, i, mood) {
  c.lineCap = "round"; c.lineJoin = "round";
  if (mood === "h") {
    c.strokeStyle = "#1a1a1a"; c.lineWidth = 3; c.beginPath(); c.moveTo(-14, -11); c.lineTo(-4, -1); c.moveTo(-4, -11); c.lineTo(-14, -1); c.moveTo(4, -11); c.lineTo(14, -1); c.moveTo(14, -11); c.lineTo(4, -1); c.stroke();
  } else {
    sphere(c, -9, -5, 7.6, "#ffffff", 1.6); sphere(c, 9, -5, 7.6, "#ffffff", 1.6);
    const dx = mood === "w" ? -1 : 1; c.fillStyle = "#111"; c.beginPath(); c.arc(-8 + dx, -4, 3, 0, TAU); c.arc(10 + dx, -4, 3, 0, TAU); c.fill();
    c.fillStyle = "#fff"; c.beginPath(); c.arc(-7 + dx, -5, 1, 0, TAU); c.arc(11 + dx, -5, 1, 0, TAU); c.fill();
    c.strokeStyle = "#222"; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-17, mood === "w" ? -10 : -15); c.quadraticCurveTo(-9, -19, -2, mood === "w" ? -17 : -13); c.moveTo(17, mood === "w" ? -10 : -15); c.quadraticCurveTo(9, -19, 2, mood === "w" ? -17 : -13); c.stroke();
  }
  if (i === 1) sphere(c, 0, 3, 5.6, "#d98c63", 1);
  c.strokeStyle = "#1a1a1a"; c.lineWidth = 2.4;
  if (mood === "h") { c.fillStyle = "#7a1f1f"; c.beginPath(); c.ellipse(0, 13, 6.5, 5, 0, 0, TAU); c.fill(); c.stroke(); }
  else { c.beginPath(); if (mood === "w") { c.moveTo(-9, 14); c.quadraticCurveTo(-4.5, 8, 0, 14); c.quadraticCurveTo(4.5, 20, 9, 14); } else if (mood === "s") { c.moveTo(-9, 11); c.quadraticCurveTo(0, 22, 10, 9); } else { c.moveTo(-10, 10); c.quadraticCurveTo(0, 21, 10, 10); } c.stroke(); }
  if (i === 0) { c.fillStyle = "#4a2b14"; c.beginPath(); c.moveTo(-15, 7); c.quadraticCurveTo(-7, -1, 0, 6); c.quadraticCurveTo(7, -1, 15, 7); c.quadraticCurveTo(8, 12, 0, 9); c.quadraticCurveTo(-8, 12, -15, 7); c.fill(); }
  if (i === 2 && mood !== "h") { c.fillStyle = "#fff"; c.strokeStyle = "#222"; c.lineWidth = 1.2; rr(c, -5, 14, 5, 7, 1.2); c.fill(); c.stroke(); rr(c, .5, 14, 5, 7, 1.2); c.fill(); c.stroke(); }
}
function drawHair(c, i) {
  if (i === 0) { const g = c.createLinearGradient(-20, -30, 20, -4); g.addColorStop(0, "#ff5a5a"); g.addColorStop(1, "#a31f1f"); c.fillStyle = g; c.strokeStyle = "#111"; c.lineWidth = 1.8; c.beginPath(); c.arc(0, -8, 24.5, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#8a1818"; rr(c, -27, -11, 54, 7, 3.5); c.fill(); c.stroke(); sphere(c, 0, -33, 4, "#ffffff", 1); }
  else if (i === 1) { [[-12, -22, -16], [0, -26, -2], [12, -22, 14]].forEach(p => { const g = c.createLinearGradient(p[0], p[1] - 22, p[0], p[1]); g.addColorStop(0, "#c9a0ff"); g.addColorStop(1, "#6b2fc0"); c.fillStyle = g; c.strokeStyle = "#111"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(p[0] - 7, p[1] + 3); c.lineTo(p[0] + p[2] * .4, p[1] - 24); c.lineTo(p[0] + 7, p[1] + 3); c.closePath(); c.fill(); c.stroke(); }); }
  else { c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, 17, 3.7, 4.5); c.stroke(); }
}
function glassesFor(c, i) { if (i !== 2) return; c.strokeStyle = "#222"; c.lineWidth = 2.2; c.beginPath(); c.arc(-9, -5, 10, 0, TAU); c.moveTo(19, -5); c.arc(9, -5, 10, 0, TAU); c.moveTo(-1, -5); c.lineTo(1, -5); c.stroke(); c.fillStyle = "rgba(180,220,255,.22)"; c.beginPath(); c.arc(-9, -5, 10, 0, TAU); c.arc(9, -5, 10, 0, TAU); c.fill(); }
/* a silly boxer, head centre = (0,0); body hangs below */
function drawChar(c, i, mood) {
  ell(c, 0, 76, 34, 8, "#000", .2);
  const bg = c.createLinearGradient(-30, 0, 30, 0); bg.addColorStop(0, shade(COL[i], .35)); bg.addColorStop(.5, COL[i]); bg.addColorStop(1, shade(COL[i], -.5));
  c.fillStyle = bg; c.strokeStyle = "#111"; c.lineWidth = 2; rr(c, -26, 16, 52, 58, 16); c.fill(); c.stroke();
  c.fillStyle = "rgba(255,255,255,.9)"; c.beginPath(); c.moveTo(-9, 16); c.lineTo(0, 30); c.lineTo(9, 16); c.closePath(); c.fill();
  c.fillStyle = "#222"; rr(c, -26, 56, 52, 7, 3); c.fill();
  sphere(c, -33, 44, 13, "#ffd21f"); sphere(c, 33, 44, 13, "#ffd21f");
  sphere(c, -26, 8, 7, SK[i], 1.2); sphere(c, 26, 8, 7, SK[i], 1.2);
  sphere(c, -24.5, 3, 6.5, SK[i], 1.5); sphere(c, 24.5, 3, 6.5, SK[i], 1.5);
  sphere(c, 0, 0, 24, SK[i], 2);
  drawHair(c, i); drawFace(c, i, mood); glassesFor(c, i);
}
const SPR = {};
function sprite(i, mood) {
  const k = i + mood; if (SPR[k]) return SPR[k];
  const o = document.createElement("canvas"); o.width = 200; o.height = 260; const c = o.getContext("2d"); c.translate(100, 92); c.scale(2, 2); drawChar(c, i, mood); return SPR[k] = o;
}
const drawSprite = (c, s, x, y, k) => c.drawImage(s, x - 50 * k, y - 46 * k, 100 * k, 130 * k);
function setup(id, W, H) {
  const cv = $(id); if (!cv) return null;
  const w = cv.clientWidth || 340, k = w * DPR / W; cv.width = Math.round(w * DPR); cv.height = Math.round(H * k);
  const c = cv.getContext("2d"); return { cv, c, k, W, H };
}
function loop(tok, fn) { let last = performance.now(); (function f(t) { if (tok !== TOK || !$("pxs")) return; const dt = Math.min(50, t - last); last = t; try { fn(dt); } catch (e) { console.error(e); } requestAnimationFrame(f); })(last); }
const PART = [];
function spawn(x, y, vx, vy, life, kind, col, r) { PART.push({ x, y, vx, vy, life, max: life, kind, col, r }); if (PART.length > 140) PART.shift(); }
function drawParts(c, dt) {
  for (let i = PART.length - 1; i >= 0; i--) {
    const p = PART[i]; p.life -= dt; if (p.life <= 0) { PART.splice(i, 1); continue; }
    const a = p.life / p.max; p.x += p.vx * dt / 16; p.y += p.vy * dt / 16; if (p.kind === "c") p.vy += .22 * dt / 16;
    c.globalAlpha = Math.min(1, a * 1.6);
    if (p.kind === "t") text(c, p.col[0], p.x, p.y, p.r, p.col[1], p.col[2]); else if (p.kind === "c") sphere(c, p.x, p.y, p.r, p.col, 0); else { c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r * a + .5, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
  }
}
const stunStars = (c, x, y, t) => { for (let s = 0; s < 3; s++) { const a = t * 6 + s * 2.09; c.font = "16px Arial"; c.textAlign = "center"; c.fillText("⭐", x + Math.cos(a) * 26, y + Math.sin(a) * 7); } };

/* ---------- Pie in the Face Press Conference (live) ---------- */
const PW = 320, PH = 360, HEAD_Y = 172, CK = 1.22;
let PX3 = [64, 160, 256];
const pieSeats = n => { PX3 = n === 2 ? [96, 224] : [64, 160, 256]; };
function pieBg(g, c) {
  const [o, x] = off(PW, PH), ids = g.seats || [];
  let gr = x.createLinearGradient(0, 0, 0, PH); gr.addColorStop(0, "#4a1424"); gr.addColorStop(.6, "#7a2438"); gr.addColorStop(1, "#2a0f18"); x.fillStyle = gr; x.fillRect(0, 0, PW, PH);
  for (let i = 0; i < 9; i++) { x.fillStyle = i % 2 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.08)"; x.fillRect(i * 36, 0, 18, 250); }
  [0, 1].forEach(sd => { const gx = sd ? PW - 46 : 0; const cg = x.createLinearGradient(gx, 0, gx + 46, 0); cg.addColorStop(sd ? 1 : 0, "#5c1021"); cg.addColorStop(sd ? 0 : 1, "#b03a55"); x.fillStyle = cg; x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx + 46, 0); x.quadraticCurveTo(gx + (sd ? 22 : 24), 130, gx + 46, 270); x.lineTo(gx, 270); x.fill(); });
  const fl = x.createLinearGradient(0, 250, 0, PH); fl.addColorStop(0, "#6b4a2e"); fl.addColorStop(1, "#2b1c10"); x.fillStyle = fl; x.beginPath(); x.moveTo(0, 262); x.lineTo(PW, 262); x.lineTo(PW, PH); x.lineTo(0, PH); x.fill();
  x.strokeStyle = "rgba(255,220,160,.12)"; x.lineWidth = 1.5; for (let i = -4; i <= 8; i++) { x.beginPath(); x.moveTo(PW / 2 + (i - 2) * 22, 262); x.lineTo(PW / 2 + (i - 2) * 70, PH); x.stroke(); }
  PX3.forEach(sx => { const sg = x.createRadialGradient(sx, 262, 8, sx, 262, 120); sg.addColorStop(0, "rgba(255,246,200,.28)"); sg.addColorStop(1, "rgba(255,246,200,0)"); x.fillStyle = sg; x.beginPath(); x.moveTo(sx - 6, 0); x.lineTo(sx + 6, 0); x.lineTo(sx + 70, 300); x.lineTo(sx - 70, 300); x.fill(); });
  x.fillStyle = "#111"; rr(x, 76, 10, 168, 26, 6); x.fill(); x.strokeStyle = "#e6b422"; x.lineWidth = 2.5; x.stroke(); text(x, "PRESS CONFERENCE", 160, 29, 14, "#e6b422");
  return o;
}
function piePod(g, c) {
  const [o, x] = off(PW, PH), ids = g.seats || [];
  ids.forEach((id, k) => {
    const px = PX3[k], w = 84, top = 254;
    ell(x, px, 356, 52, 9, "#000", .3);
    const fg = x.createLinearGradient(px - w / 2, 0, px + w / 2, 0); fg.addColorStop(0, "#7a5230"); fg.addColorStop(.5, "#5a3b20"); fg.addColorStop(1, "#3a2412"); x.fillStyle = fg; rr(x, px - w / 2, top + 10, w, 98, 5); x.fill(); x.strokeStyle = "#1a0f08"; x.lineWidth = 2; x.stroke();
    const tg = x.createLinearGradient(0, top, 0, top + 12); tg.addColorStop(0, "#c89a64"); tg.addColorStop(1, "#8a6238"); x.fillStyle = tg; x.beginPath(); x.moveTo(px - w / 2 - 6, top + 12); x.lineTo(px - w / 2 + 4, top); x.lineTo(px + w / 2 - 4, top); x.lineTo(px + w / 2 + 6, top + 12); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = COL[k]; rr(x, px - w / 2 + 6, top + 24, w - 12, 6, 3); x.fill();
    sphere(x, px, top - 6, 5, "#555", 1); x.fillStyle = "#222"; x.fillRect(px - 1.5, top - 6, 3, 8);
    text(x, short(c, id) + (id === c.ME ? " ★" : ""), px, top + 56, 15, COL[k], "#000");
  });
  return o;
}
function pieInit(g, c) {
  pieSeats((g.seats || []).length);
  const S = setup("pxs", PW, PH); if (!S) return; const cv = S.cv;
  cv.style.touchAction = "none"; stopTouchScroll(cv);
  Object.assign(L, { S, me: (g.seats || []).indexOf(c.ME), loc: [], pies: {}, myCd: 0, myCdTot: 500, myDuck: null, burst: {}, nl: 0, cr: [0, 0, 0], stun: [0, 0, 0], shake: 0, pop: [], bg: pieBg(g, c), pod: piePod(g, c) });
  PART.length = 0;
  cv.onpointerdown = e => { e.preventDefault(); const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * PW; let best = -1, bd = 60; PX3.forEach((px, k) => { const d = Math.abs(px - x); if (d < bd) { bd = d; best = k; } }); if (best >= 0) pieThrow(best); };
  const d = $("pxduck"); if (d) d.onpointerdown = e => { e.preventDefault(); pieDuck(); };
  loop(TOK, pieFrame);
}
const act = (c, d, a) => { try { const t0 = Date.now(); c.rpc("party_act", { p_room: c.room(), p_do: d, p_a: a }).then(r => { if (r && r.view && c.take) c.take(r.view, t0); }).catch(() => {}); } catch (e) {} };
const pieStunned = (k, now) => Math.max(((L.g.inv || {})[k] || 0), L.stun[k] || 0) > now;
function pieThrow(k) {
  const g = L.g, c = L.c; if (!g || g.phase !== "live" || L.me < 0 || k === L.me) return; const now = c.srv();
  if (now < L.myCd || pieStunned(L.me, now)) return;
  L.myCd = now + 500; L.myCdTot = 500; L.nl++; L.loc.push({ id: "L" + L.nl, f: L.me, t: k, a: now, l: now + 450, r: -1 }); act(c, "throw", String(k));
}
function pieDuck() {
  const g = L.g, c = L.c; if (!g || g.phase !== "live" || L.me < 0) return; const now = c.srv();
  if (now < L.myCd || pieStunned(L.me, now)) return;
  L.myDuck = [now, now + 400]; L.myCd = now + 700; L.myCdTot = 700; act(c, "duck", "");
}
function ducking(k, now) { let dk = (L.g.duck || {})[k]; if (k === L.me && L.myDuck && (!dk || L.myDuck[0] > dk[0])) dk = L.myDuck; return dk; }
function pieFrame(dt) {
  const g = L.g, c = L.c, S = L.S; if (!g || g.phase !== "live") return; const x = S.c, now = c.srv(), ids = g.seats || [], t = now / 1000;
  if (g.cd != null && g.cd > L.myCd) L.myCd = g.cd;
  const bar = $("pxcdu"); if (bar) { const left = Math.max(0, L.myCd - now); bar.style.width = (L.myCdTot ? 100 * (1 - Math.min(1, left / L.myCdTot)) : 100) + "%"; bar.style.background = left > 0 ? "#e6b422" : "var(--grn)"; }
  /* events: server ones plus my optimistic throws, with an instant predicted outcome */
  const sv = (g.ev || []).map(e => Object.assign({}, e)), used = {};
  L.loc = L.loc.filter(le => { const m = sv.find(e => e.f === le.f && !used[e.i] && Math.abs(e.a - le.a) < 1600); if (m) { used[m.i] = 1; L.pies["s" + m.i] = L.pies[le.id] || { fa: le.a }; L.pies["s" + m.i].fa = le.a; delete L.pies[le.id]; return false; } return now - le.a < 2200; });
  const all = sv.map(e => ({ k: "s" + e.i, e })).concat(L.loc.map(e => ({ k: e.id, e })));
  const live = {};
  all.forEach(o => {
    const e = o.e, key = o.k; live[key] = 1; const pe = L.pies[key] || (L.pies[key] = {}), a = pe.fa || e.a, l = a + 450;
    if (e.r === -1 && now >= l) { const dk = (g.duck || {})[e.t], inv = Math.max(((g.inv || {})[e.t] || 0), L.stun[e.t] || 0); e.r = (inv > l || (dk && dk[0] <= l && dk[1] >= l)) ? 0 : 1; }
    pe.e = e; pe.a = a;
    if (now >= l && e.r >= 0 && !L.burst[key]) {
      L.burst[key] = 1;
      if (e.r === 1 && now - l < 2200) { const tx = PX3[e.t], ty = HEAD_Y; L.cr[e.t] = Math.min(5, L.cr[e.t] + 1); L.stun[e.t] = Math.max(L.stun[e.t], l + 1000); L.shake = 7; L.pop[e.t] = now;
        for (let i = 0; i < 14; i++) spawn(tx, ty, (Math.random() - .5) * 7, -Math.random() * 6 - 1, 700, "c", i % 3 ? "#ffffff" : "#f2b8c6", 3 + Math.random() * 4);
        spawn(tx, ty - 46, 0, -.6, 800, "t", [["SPLAT!", "BLAM!", "POW!", "SPLORT!"][Math.floor(Math.random() * 4)], "#ffe066", "#a31f1f"], 22); }
    }
  });
  for (const k in L.pies) if (!live[k]) delete L.pies[k];
  ids.forEach((id, k) => { const n = Math.min(5, (g.splat || {})[id] || 0); if (n > L.cr[k]) L.cr[k] = n; });
  /* draw */
  x.setTransform(S.k, 0, 0, S.k, 0, 0); L.shake *= .86; const sh = L.shake > .3 ? L.shake : 0;
  x.save(); x.translate((Math.random() - .5) * sh, (Math.random() - .5) * sh);
  x.drawImage(L.bg, 0, 0, PW, PH);
  ids.forEach((id, k) => {
    const dk = ducking(k, now); let dp = 0; if (dk && now >= dk[0] && now <= dk[1] + 60) dp = Math.min(ease((now - dk[0]) / 110), ease((dk[1] + 60 - now) / 110));
    const st = pieStunned(k, now); let sc = CK; if (L.pop[k] && now - L.pop[k] < 260) sc *= 1 + .12 * Math.sin((now - L.pop[k]) / 260 * Math.PI);
    const yy = HEAD_Y + dp * 120 + Math.sin(t * 3 + k) * 1.5;
    x.save(); x.translate(PX3[k], yy); x.rotate(st ? Math.sin(t * 24) * .13 : Math.sin(t * 2 + k) * .025);
    drawSprite(x, sprite(k, st ? "h" : dp > .3 ? "w" : "n"), 0, 0, sc);
    const n = L.cr[k]; if (n) { const P = [[-9, -14, 8], [9, -9, 9], [-3, 7, 8], [13, 9, 7], [-14, 2, 7]]; for (let q = 0; q < n; q++) { const p = P[q]; x.save(); x.scale(sc, sc); sphere(x, p[0], p[1], p[2], "#fff6e8", 1); sphere(x, p[0] - 2, p[1] - 3, 2, "#f2b8c6", 0); x.fillStyle = "#fff"; x.fillRect(p[0] - 1.5, p[1] + p[2] - 2, 3, 6 + q * 1.5); x.restore(); } }
    if (st) stunStars(x, 0, -34 * sc, t);
    x.restore();
  });
  x.drawImage(L.pod, 0, 0, PW, PH);
  for (const key in L.pies) {
    const pe = L.pies[key], e = pe.e, p = (now - pe.a) / 450; if (!e || p < 0 || p > 1.5) continue;
    const q = Math.min(p, 1), x0 = PX3[e.f], x1 = PX3[e.t], px = x0 + (x1 - x0) * q, gy = 232 + (HEAD_Y + 6 - 232) * q, py = gy - Math.sin(q * Math.PI) * 46, s = .75 + .55 * q;
    let ox = px, oy = py, al = 1; if (p > 1) { al = 0; if (e.r === 0) { const m = p - 1; ox = x1 + (x1 > 160 ? 1 : -1) * 90 * m; oy = py - 70 * m; al = Math.max(0, 1 - m * 2); } }
    if (al <= 0) continue;
    ell(x, px, 330 - (1 - q) * 6, 15 * s, 4 * s, "#000", .25 * al);
    x.save(); x.globalAlpha = al; x.translate(ox, oy); x.scale(s * Math.cos(p * 11) * .35 + s * .65, s); x.rotate(Math.sin(p * 8) * .3);
    ell(x, 0, 3, 14, 6, "#9c6a2c"); ell(x, 0, 0, 14, 6, "#d9a35a"); ell(x, 0, -2, 11, 5, "#fff6e8"); sphere(x, 0, -8, 6, "#fff6e8", 0.8); sphere(x, 2, -13, 3, "#d1304a", .8); x.restore();
  }
  drawParts(x, dt);
  x.restore();
}
function pieHtml(g, c) { return `<div class="pxhud" id="pxhud">${hud(g, c, 10)}</div><canvas class="px" id="pxs"></canvas><div class="pxcd" id="pxcd"><u id="pxcdu"></u></div><button type="button" class="pxbig" id="pxduck">🙈 DUCK</button>`; }
function pieUpdate(g, c) { L.g = g; L.c = c; hudSet(g, c, 10); }
let HK = "";
function hudSet(g, c, max) { const h = $("pxhud"); if (!h) return; const k = JSON.stringify(g.score); if (k === HK) return; HK = k; h.innerHTML = hud(g, c, max); }

/* ---------- Rubber Gloves (live) ---------- */
const GW = 320, GH = 340, GCX = 160, GCY = 168, GS = 1.4, GT = .56, RING = 100, FR = .975, TH = 20;
const gx = x => GCX + x * GS, gy = y => GCY + y * GS * GT, gp = y => .86 + .3 * (y + 100) / 200;
function glBg() {
  const [o, x] = off(GW, GH);
  let g = x.createLinearGradient(0, 0, 0, GH); g.addColorStop(0, "#120309"); g.addColorStop(.5, "#3a0a12"); g.addColorStop(1, "#8a1d0a"); x.fillStyle = g; x.fillRect(0, 0, GW, GH);
  const lava = x.createRadialGradient(GCX, GCY + 20, 40, GCX, GCY + 20, 190); lava.addColorStop(0, "rgba(255,170,40,.95)"); lava.addColorStop(.45, "rgba(235,70,20,.8)"); lava.addColorStop(1, "rgba(80,10,10,0)"); x.fillStyle = lava; x.fillRect(0, 0, GW, GH);
  for (let i = 0; i < 26; i++) { x.fillStyle = "rgba(255,210,90," + (.08 + (i % 4) * .05) + ")"; x.beginPath(); x.ellipse((i * 53) % GW, 40 + (i * 37) % 280, 12 + i % 9, 4 + i % 3, 0, 0, TAU); x.fill(); }
  /* platform: shadow, rim thickness, top */
  ell(x, GCX + 4, GCY + TH + 10, RING * GS + 6, RING * GS * GT + 6, "#000", .45);
  const sd = x.createLinearGradient(GCX - RING * GS, 0, GCX + RING * GS, 0); sd.addColorStop(0, "#6a4a2c"); sd.addColorStop(.35, "#b98c52"); sd.addColorStop(1, "#4a2f18");
  x.fillStyle = sd; x.beginPath(); x.ellipse(GCX, GCY + TH, RING * GS + 8, RING * GS * GT + 8, 0, 0, Math.PI); x.lineTo(GCX - RING * GS - 8, GCY); x.ellipse(GCX, GCY, RING * GS + 8, RING * GS * GT + 8, 0, Math.PI, 0, true); x.closePath(); x.fill();
  x.strokeStyle = "#2a1a0c"; x.lineWidth = 2; x.stroke();
  x.fillStyle = "#e6b422"; x.beginPath(); x.ellipse(GCX, GCY, RING * GS + 8, RING * GS * GT + 8, 0, 0, TAU); x.fill();
  const tg = x.createRadialGradient(GCX - 40, GCY - 30, 10, GCX, GCY, RING * GS); tg.addColorStop(0, "#fbf6e2"); tg.addColorStop(.7, "#e7dcb6"); tg.addColorStop(1, "#c3b184"); x.fillStyle = tg; x.beginPath(); x.ellipse(GCX, GCY, RING * GS + 2, RING * GS * GT + 2, 0, 0, TAU); x.fill();
  x.strokeStyle = "rgba(150,120,60,.55)"; x.lineWidth = 2; x.beginPath(); x.ellipse(GCX, GCY, RING * GS * .5, RING * GS * GT * .5, 0, 0, TAU); x.stroke();
  x.beginPath(); x.moveTo(GCX - RING * GS + 6, GCY); x.lineTo(GCX + RING * GS - 6, GCY); x.moveTo(GCX, GCY - RING * GS * GT + 6); x.lineTo(GCX, GCY + RING * GS * GT - 6); x.stroke();
  ell(x, GCX, GCY, 22, 12, "#e23d3d", .8); text(x, "★", GCX, GCY + 6, 16, "#fff");
  for (let i = 0; i < 28; i++) { const a = i * TAU / 28, px = GCX + Math.cos(a) * (RING * GS + 4), py = GCY + Math.sin(a) * (RING * GS * GT + 4); sphere(x, px, py, 3.4, i % 2 ? "#e23d3d" : "#ffffff", .8); }
  return o;
}
function glBoxers(g, c) { L.ids = g.seats || []; }
function glSync(g, c) {
  const S = L.Sim || { x: [], y: [], vx: [], vy: [], al: [], rs: [] };
  (g.bx || []).forEach((a, i) => { S.x[i] = a[0]; S.y[i] = a[1]; S.vx[i] = a[2]; S.vy[i] = a[3]; S.al[i] = a[4] === 1; S.rs[i] = a[5]; });
  L.tc = g.t0;
  if (L.pend && L.me >= 0) { if (g.cd > L.pend.at + 1000 || c.srv() - L.pend.at > 2600) L.pend = null; else if (S.al[L.me]) { S.vx[L.me] += L.pend.ix; S.vy[L.me] += L.pend.iy; } }
  if (g.cd != null && g.cd > L.myCd) L.myCd = g.cd;
  L.Sim = S;
}
function glStep(S, ts) {
  const N = S.x.length;
  for (let i = 0; i < N; i++) if (!S.al[i] && ts >= S.rs[i]) { const a = (-90 + i * 360 / N) * Math.PI / 180; S.x[i] = 55 * Math.cos(a); S.y[i] = 55 * Math.sin(a); S.vx[i] = 0; S.vy[i] = 0; S.al[i] = true; L.pop[i] = ts; }
  for (let i = 0; i < N; i++) if (S.al[i]) { S.x[i] += S.vx[i]; S.y[i] += S.vy[i]; S.vx[i] *= FR; S.vy[i] *= FR; }
  for (let i = 0; i < N - 1; i++) for (let j = i + 1; j < N; j++) if (S.al[i] && S.al[j]) {
    let dx = S.x[i] - S.x[j], dy = S.y[i] - S.y[j], d = Math.sqrt(dx * dx + dy * dy);
    if (d < 22) {
      if (d < .001) { dx = 1; dy = 0; d = 1; } const nx = dx / d, ny = dy / d, rv = (S.vx[i] - S.vx[j]) * nx + (S.vy[i] - S.vy[j]) * ny;
      if (rv < 0) { const imp = -1.95 * rv / 2; S.vx[i] += imp * nx; S.vy[i] += imp * ny; S.vx[j] -= imp * nx; S.vy[j] -= imp * ny; if (-rv > .8 && !L.seen["h" + ts + i + j]) { L.seen["h" + ts + i + j] = 1; L.hits.push([(S.x[i] + S.x[j]) / 2, (S.y[i] + S.y[j]) / 2, ts]); } }
      const ov = (22 - d) / 2; S.x[i] += ov * nx; S.y[i] += ov * ny; S.x[j] -= ov * nx; S.y[j] -= ov * ny;
    }
  }
  for (let i = 0; i < N; i++) if (S.al[i] && Math.sqrt(S.x[i] * S.x[i] + S.y[i] * S.y[i]) > RING) { S.al[i] = false; S.rs[i] = ts + 1800; if (!L.seen["f" + ts + i]) { L.seen["f" + ts + i] = 1; L.fall[i] = { x: S.x[i], y: S.y[i], vx: S.vx[i], vy: S.vy[i], t: ts }; L.splash.push([S.x[i], S.y[i], ts]); } }
}
function glInit(g, c) {
  const S = setup("pxs", GW, GH); if (!S) return; const cv = S.cv;
  stopTouchScroll(cv);
  Object.assign(L, { S, me: (g.seats || []).indexOf(c.ME), Sim: null, pend: null, myCd: 0, aim: null, hits: [], fall: [], splash: [], pop: [], seen: {}, bg: glBg(), ids: g.seats || [] });
  PART.length = 0; glSync(g, c);
  const pos = e => { const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * GW, py = (e.clientY - r.top) / r.height * GH; return [(px - GCX) / GS, (py - GCY) / (GS * GT)]; };
  const mine = () => { const t = L.c.srv(), fr = Math.min(1, Math.max(0, (t - L.tc) / 40)), Q = L.Sim; return [Q.x[L.me] + Q.vx[L.me] * fr, Q.y[L.me] + Q.vy[L.me] * fr]; };
  const set = e => { if (L.me < 0 || !L.Sim.al[L.me]) return; const q = pos(e), p = mine(), dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy); if (d < 4) return; L.aim = { a: Math.atan2(dy, dx), p: Math.min(1, d / 75) }; };
  let down = false;
  cv.onpointerdown = e => { down = true; try { cv.setPointerCapture(e.pointerId); } catch (er) {} set(e); e.preventDefault(); };
  cv.onpointermove = e => { if (down) { set(e); e.preventDefault(); } };
  cv.onpointerup = () => { if (!down) return; down = false; const A = L.aim; L.aim = null; if (A && A.p > .12) glFling(A); };
  cv.onpointercancel = () => { down = false; L.aim = null; };
  loop(TOK, glFrame);
}
function glFling(A) {
  const c = L.c, now = c.srv(); if (L.me < 0 || !L.Sim.al[L.me] || now < L.myCd) return;
  const ix = Math.cos(A.a) * A.p * 3.4, iy = Math.sin(A.a) * A.p * 3.4; L.Sim.vx[L.me] += ix; L.Sim.vy[L.me] += iy; L.pend = { at: now, ix, iy }; L.myCd = now + 2000;
  act(c, "fling", A.a.toFixed(3) + "," + A.p.toFixed(2));
}
function glFrame(dt) {
  const g = L.g, c = L.c, Sm = L.Sim, S = L.S; if (!g || g.phase !== "live" || !Sm) return; const now = c.srv(), x = S.c, t = now / 1000;
  if (now - L.tc > 1500) L.tc = now - 40;
  let guard = 0; while (L.tc + 40 <= now && guard++ < 60) { L.tc += 40; glStep(Sm, L.tc); }
  const fr = Math.min(1, (now - L.tc) / 40);
  if (Object.keys(L.seen).length > 300) L.seen = {};
  L.hits.splice(0).forEach(h => { if (now - h[2] < 400) { const X = gx(h[0]), Y = gy(h[1]) - 14; for (let i = 0; i < 8; i++) spawn(X, Y, (Math.random() - .5) * 6, -Math.random() * 4, 450, "s", "#ffe066", 4); spawn(X, Y - 12, 0, -.7, 520, "t", ["BONK!", "#fff", "#c1121f"], 17); } });
  L.splash.splice(0).forEach(h => { if (now - h[2] < 400) { const X = gx(h[0]), Y = gy(h[1]) + 14; for (let i = 0; i < 12; i++) spawn(X, Y, (Math.random() - .5) * 6, -Math.random() * 7, 700, "c", i % 2 ? "#ffb347" : "#ff5a1f", 2.5 + Math.random() * 3); } });
  x.setTransform(S.k, 0, 0, S.k, 0, 0);
  x.drawImage(L.bg, 0, 0, GW, GH);
  for (let i = 0; i < 9; i++) { const ph = (t * .45 + i * .37) % 1; x.fillStyle = "rgba(255,200,80," + (.7 * (1 - ph)) + ")"; x.beginPath(); x.arc(30 + i * 33 + Math.sin(t + i) * 6, 330 - ph * 120, 2 + (i % 3), 0, TAU); x.fill(); }
  const order = Sm.x.map((_, i) => i).sort((a, b) => Sm.y[a] - Sm.y[b]);
  /* ready ring / aim go under the boxers */
  const drawAim = () => {
    if (L.me < 0 || !Sm.al[L.me]) return; const X = Sm.x[L.me] + Sm.vx[L.me] * fr, Y = Sm.y[L.me] + Sm.vy[L.me] * fr, left = Math.max(0, L.myCd - now), ready = left <= 0, sx = gx(X), sy = gy(Y) + 8;
    x.lineWidth = ready ? 3 : 4; x.strokeStyle = ready ? "rgba(60,230,120," + (.6 + .3 * Math.sin(t * 6)) + ")" : "#e6b422"; x.beginPath();
    if (ready) x.ellipse(sx, sy, 22, 12, 0, 0, TAU); else x.ellipse(sx, sy, 22, 12, 0, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - left / 2000)); x.stroke();
    const A = L.aim; if (A && ready) {
      const col = A.p > .66 ? "#ff3b3b" : A.p > .33 ? "#ffb703" : "#3cd67a", len = 18 + A.p * 100;
      for (let k = 1; k <= 8; k++) { const d = 20 + (len - 20) * k / 8, wx = X + Math.cos(A.a) * d, wy = Y + Math.sin(A.a) * d; x.fillStyle = col; x.strokeStyle = "#111"; x.lineWidth = .8; x.beginPath(); x.ellipse(gx(wx), gy(wy) + 8, 2 + k * .55, (2 + k * .55) * .6, 0, 0, TAU); x.fill(); x.stroke(); }
      const ex = X + Math.cos(A.a) * len, ey = Y + Math.sin(A.a) * len, ax = gx(ex), ay = gy(ey) + 8, a2 = Math.atan2(gy(ey) - gy(Y), gx(ex) - gx(X));
      x.fillStyle = col; x.strokeStyle = "#111"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(ax + Math.cos(a2) * 16, ay + Math.sin(a2) * 16); x.lineTo(ax + Math.cos(a2 + 2.4) * 12, ay + Math.sin(a2 + 2.4) * 12); x.lineTo(ax + Math.cos(a2 - 2.4) * 12, ay + Math.sin(a2 - 2.4) * 12); x.closePath(); x.fill(); x.stroke();
    }
  };
  drawAim();
  order.forEach(i => {
    if (!Sm.al[i]) return; const X = Sm.x[i] + Sm.vx[i] * fr, Y = Sm.y[i] + Sm.vy[i] * fr, sp = Math.hypot(Sm.vx[i], Sm.vy[i]), pers = gp(Y);
    let sc = 17 / 24 * pers * 1.1; if (L.pop[i] && now - L.pop[i] < 450) { const k = (now - L.pop[i]) / 450; sc *= .3 + .7 * ease(k) + Math.sin(k * 9) * .1 * (1 - k); }
    const sx = gx(X), sy = gy(Y); ell(x, sx + 2, sy + 4, 17 * pers, 7 * pers, "#000", .3);
    x.save(); x.translate(sx, sy - 22 * pers + Math.sin(t * 5 + i) * 1.2);
    if (sp > .3) { const ang = Math.atan2(Sm.vy[i] * GT, Sm.vx[i]), sq = 1 + Math.min(.25, sp * .08); x.rotate(ang); x.scale(sq, 1 / sq); x.rotate(-ang); }
    drawSprite(x, sprite(i, sp > 1.4 ? "w" : "n"), 0, 0, sc * 1.25); x.restore();
    text(x, short(c, L.ids[i]) + (i === L.me ? " ★" : ""), sx, sy - 54 * pers, 11, COL[i], "#000");
  });
  /* fallen boxers tumble into the lava, in front of the rim */
  for (let i = 0; i < Sm.x.length; i++) if (!Sm.al[i] && L.fall[i]) { const f = L.fall[i], k = Math.min(1, (now - f.t) / 700); if (k >= 1) continue; const X = f.x + f.vx * 12 * k, Y = f.y + f.vy * 12 * k, pers = gp(Y); x.save(); x.globalAlpha = 1 - k * .8; x.translate(gx(X), gy(Y) - 20 * pers + k * 70); x.rotate(k * 7); drawSprite(x, sprite(i, "h"), 0, 0, 17 / 24 * pers * 1.1 * 1.25 * (1 - k * .6)); x.restore(); }
  drawParts(x, dt);
}
function glHtml(g, c) { return `<div class="pxhud" id="pxhud">${hud(g, c, 5)}</div><canvas class="px" id="pxs"></canvas><div class="pxcd" id="pxcd"><u id="pxcdu"></u></div>`; }
function glUpdate(g, c) { L.g = g; L.c = c; if (L.Sim) glSync(g, c); hudSet(g, c, 5); const bar = $("pxcdu"); if (bar && L.c) { const left = Math.max(0, L.myCd - c.srv()); bar.style.width = (100 * (1 - Math.min(1, left / 2000))) + "%"; bar.style.background = left > 0 ? "#e6b422" : "var(--grn)"; } }

/* ---------- Dirty Corner ---------- */
const DW = 320, DH = 300;
const PROB = { cut: ["Cut eyebrow! 🩸", "jelly"], swell: ["Swollen eye! 🟣", "ice"], tired: ["Exhausted! 😮‍💨", "water"] };
const TOOL = { jelly: ["🫙", "Jelly"], ice: ["🧊", "Ice pack"], water: ["💧", "Water"] };
const hpColor = h => h > 60 ? "#3cc46c" : h > 35 ? "#e8b23a" : "#e23d3d";
function dBg(g, c) {
  const [o, x] = off(DW, DH);
  let gr = x.createLinearGradient(0, 0, 0, DH); gr.addColorStop(0, "#1a2436"); gr.addColorStop(.7, "#2a3a52"); gr.addColorStop(1, "#141b27"); x.fillStyle = gr; x.fillRect(0, 0, DW, DH);
  for (let i = 0; i < 30; i++) { x.fillStyle = "rgba(255,255,255," + (.04 + (i % 5) * .02) + ")"; x.beginPath(); x.arc((i * 47) % DW, 30 + (i * 29) % 110, 6 + i % 6, 0, TAU); x.fill(); }
  x.fillStyle = "#0b0f18"; for (let i = 0; i < 9; i++) { const cx = 20 + i * 35; x.beginPath(); x.arc(cx, 100 + (i % 2) * 7, 12, 0, TAU); x.fill(); rr(x, cx - 15, 110 + (i % 2) * 7, 30, 40, 10); x.fill(); }
  const sp = x.createRadialGradient(160, 0, 10, 160, 140, 230); sp.addColorStop(0, "rgba(255,243,176,.55)"); sp.addColorStop(1, "rgba(255,243,176,0)"); x.fillStyle = sp; x.beginPath(); x.moveTo(130, 0); x.lineTo(190, 0); x.lineTo(310, 250); x.lineTo(10, 250); x.fill();
  const fl = x.createLinearGradient(0, 190, 0, DH); fl.addColorStop(0, "#3d5170"); fl.addColorStop(1, "#1d2a3e"); x.fillStyle = fl; x.beginPath(); x.moveTo(0, 196); x.lineTo(DW, 196); x.lineTo(DW, DH); x.lineTo(0, DH); x.fill();
  [[8, 40, 14, 190], [DW - 22, 40, 14, 190]].forEach(p => { const pg = x.createLinearGradient(p[0], 0, p[0] + p[2], 0); pg.addColorStop(0, "#d7dde4"); pg.addColorStop(1, "#6d7680"); x.fillStyle = pg; x.fillRect(p[0], p[1], p[2], p[3]); });
  [60, 100, 140].forEach((yy, k) => { x.strokeStyle = "#d93a3a"; x.lineWidth = 6 - k; x.beginPath(); x.moveTo(16, yy); x.lineTo(DW - 16, yy + (k - 1) * 4); x.stroke(); x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(16, yy - 1.5); x.lineTo(DW - 16, yy - 1.5 + (k - 1) * 4); x.stroke(); });
  const st = x.createLinearGradient(0, 214, 0, 240); st.addColorStop(0, "#b98c52"); st.addColorStop(1, "#6b4f27"); x.fillStyle = st; rr(x, 78, 206, 164, 20, 7); x.fill(); x.strokeStyle = "#2a1a0c"; x.lineWidth = 2; x.stroke(); x.fillStyle = "#5a3f1f"; x.fillRect(92, 226, 10, 34); x.fillRect(218, 226, 10, 34);
  return o;
}
function dFace(hp, prob, mood) {
  const k = hp + prob + mood; L.fc = L.fc || {}; if (L.fc[k]) return L.fc[k];
  const o = document.createElement("canvas"); o.width = 300; o.height = 300; const c = o.getContext("2d"); c.translate(150, 130); c.scale(2.1, 2.1);
  /* neck + shoulders + gloves */
  const bg = c.createLinearGradient(-50, 0, 50, 0); bg.addColorStop(0, "#f7d34d"); bg.addColorStop(.5, "#e6b422"); bg.addColorStop(1, "#8a6a10"); c.fillStyle = bg; c.strokeStyle = "#111"; c.lineWidth = 2; rr(c, -42, 20, 84, 36, 14); c.fill(); c.stroke();
  sphere(c, -48, 40, 15, "#d93a3a"); sphere(c, 48, 40, 15, "#d93a3a");
  sphere(c, -26, 3, 6.5, SK[2], 1.4); sphere(c, 26, 3, 6.5, SK[2], 1.4); sphere(c, 0, 0, 24, SK[2], 1.8); drawHair(c, 2); drawFace(c, 2, mood); glassesFor(c, 2);
  /* damage layers, worse as health drops */
  const blob = (x, y, rx, ry, col, a) => { const g = c.createRadialGradient(x, y, 1, x, y, Math.max(rx, ry)); g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)"); c.save(); c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); c.restore(); };
  const bump = (x, y, r, col) => { sphere(c, x, y, r, col, 0); c.strokeStyle = "rgba(60,10,70,.5)"; c.lineWidth = 1; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); };
  if (hp < 90) blob(-16, 14, 9, 6, "#8f4fc2", .7);
  if (hp < 75) { blob(-9, -5, 13, 11, "#5a2a85", .8); blob(17, 12, 8, 6, "#a24a8f", .7); }
  if (hp < 60) { blob(10, -5, 13, 11, "#5a2a85", .8); c.strokeStyle = "#d11b1b"; c.lineWidth = 3; c.beginPath(); c.moveTo(3, 7); c.quadraticCurveTo(1, 14, 3, 20); c.stroke(); sphere(c, 3, 21, 2.6, "#d11b1b", 0); }
  if (hp < 45) { bump(15, 9, 7, "#c0568a"); c.fillStyle = "#fff"; c.strokeStyle = "#aaa"; c.lineWidth = 1; c.save(); c.rotate(-.2); rr(c, -6, -22, 15, 6, 1.5); c.fill(); c.stroke(); c.restore(); c.strokeStyle = "#d11b1b"; c.lineWidth = 3; c.beginPath(); c.moveTo(-13, -2); c.lineTo(-17, 10); c.stroke(); }
  if (hp < 30) { c.fillStyle = "#e0556b"; c.strokeStyle = "#222"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-6, 14); c.quadraticCurveTo(0, 28, 6, 14); c.fill(); c.stroke(); c.font = "12px Arial"; c.textAlign = "center"; c.fillText("💫", -22, -26); c.fillText("⭐", 14, -30); }
  if (prob === "cut") { c.strokeStyle = "#d11b1b"; c.lineWidth = 4.2; c.beginPath(); c.moveTo(-12, -17); c.quadraticCurveTo(-9, -8, -12, -1); c.stroke(); sphere(c, -12, 0, 3.4, "#d11b1b", 0); }
  else if (prob === "swell") { bump(9, -5, 11.5, "#9a55cf"); bump(9, -5, 6.5, "#5a1f85"); }
  else { c.fillStyle = "#7fd0ff"; c.strokeStyle = "#2a7ab0"; c.lineWidth = 1; [[21, -16], [-23, -12], [18, 2]].forEach(p => { c.beginPath(); c.moveTo(p[0], p[1] - 5); c.quadraticCurveTo(p[0] + 4, p[1], p[0], p[1] + 3); c.quadraticCurveTo(p[0] - 4, p[1], p[0], p[1] - 5); c.fill(); c.stroke(); }); }
  return L.fc[k] = o;
}
const dMood = hp => hp < 40 ? "h" : hp < 75 ? "w" : "n";
function dirtyInit(g, c, el) {
  const S = setup("pxs", DW, DH); if (!S) return; const r = g.res, show = g.phase === "show" && r;
  Object.assign(L, { S, bg: dBg(g, c), ids: g.seats || [], fc: {}, d: { t0: performance.now() - (show ? el * 1000 : 0), hp: show ? r.from : g.health, show: !!show, r, prob: g.prob, hit: false, shake: 0, flash: 0, items: [] } });
  PART.length = 0; const D = L.d;
  if (show) {
    const need = (PROB[g.prob] || PROB.cut)[1];
    for (let i = 0; i < r.c; i++) D.items.push(TOOL[need][0]); for (let i = 0; i < r.w; i++) D.items.push("🍌");
    D.tHit = 450 + Math.max(1, D.items.length) * 540 + 250;
    const hp = $("pxhp"); if (hp) { hp.style.transition = "none"; }
  }
  loop(TOK, dirtyFrame);
}
function dirtyFrame(dt) {
  const D = L.d, S = L.S, x = S.c, g = L.g; if (!D || !g) return; const ms = performance.now() - D.t0, t = ms / 1000, r = D.r;
  x.setTransform(S.k, 0, 0, S.k, 0, 0);
  if (D.show && !D.hit && ms >= D.tHit) { D.hit = true; D.hp = r.to; D.shake = r.to < r.from ? 12 : 4; D.flash = r.to < r.from ? 1 : -1; const hb = $("pxhp"), hn = $("pxhpn"); if (hb) { hb.style.transition = "width .6s ease-out, background-color .6s"; hb.style.width = r.to + "%"; hb.style.backgroundColor = hpColor(r.to); } if (hn) hn.textContent = "❤ " + r.to + "%";
    const d = r.to - r.from; spawn(160, 70, 0, -1, 1300, "t", [(d >= 0 ? "+" : "") + d + "%", d >= 0 ? "#3cc46c" : "#ff4d4d", "#000"], 34);
    for (let i = 0; i < 16; i++) spawn(160 + (Math.random() - .5) * 60, 120, (Math.random() - .5) * 6, -Math.random() * 5, 700, d >= 0 ? "s" : "c", d >= 0 ? "#7dffa8" : "#d11b1b", 3 + Math.random() * 3); }
  x.drawImage(L.bg, 0, 0, DW, DH);
  text(x, (PROB[D.prob] || PROB.cut)[0], 160, 24, 16, "#ffe066", "#000");
  D.shake *= .9; const sh = D.shake > .4 ? D.shake : 0;
  const mood = dMood(D.hp), face = dFace(D.hp, D.prob, mood), br = Math.sin(t * 2.2) * 2;
  x.save(); x.translate(160 + (Math.random() - .5) * sh, 138 + br + (Math.random() - .5) * sh); x.rotate(Math.sin(t * 1.3) * .02 + (D.hp < 35 ? Math.sin(t * 2) * .05 : 0)); ell(x, 0, 104, 82, 12, "#000", .3);
  x.drawImage(face, -110, -100, 220, 220); x.restore();
  if (D.hp < 40) { x.font = "18px Arial"; x.textAlign = "center"; for (let s = 0; s < 3; s++) { const a = t * 4 + s * 2.09; x.fillText("💫", 160 + Math.cos(a) * 64, 52 + Math.sin(a) * 9); } }
  /* cornermen */
  L.ids.forEach((id, k) => { const px = PX3[k], bob = Math.sin(t * 3 + k) * 1.5; drawSprite(x, sprite(k, "n"), px, 262 + bob, .62); text(x, short(L.c, id) + (id === L.c.ME ? " ★" : ""), px, 296, 10, COL[k], "#000"); if ((g.acted || []).includes(id) && !D.show) text(x, "✔", px + 22, 232, 18, "#3cc46c", "#000"); });
  /* tools flying in */
  if (D.show) D.items.forEach((ic, n) => { const st = 400 + n * 540, p = (ms - st) / 800; if (p < 0 || p > 1) return; const x0 = PX3[n % 3], y0 = 240, X = x0 + (160 - x0) * p, Y = y0 + (130 - y0) * p - Math.sin(p * Math.PI) * 60; x.save(); x.translate(X, Y); x.rotate(p * 6); x.font = (28 - p * 6) + "px Arial"; x.textAlign = "center"; x.fillText(ic, 0, 0); x.restore(); });
  if (D.flash) { x.fillStyle = D.flash > 0 ? "rgba(255,30,30," + Math.min(.4, D.flash * .4) + ")" : "rgba(60,255,120," + Math.min(.3, -D.flash * .3) + ")"; x.fillRect(0, 0, DW, DH); D.flash *= .92; if (Math.abs(D.flash) < .02) D.flash = 0; }
  drawParts(x, dt);
}
const badge = g => g.role === "sab" ? `<div class="pxsay r">😈 You're the SABOTEUR: use wrong tools, stay hidden.</div>` : `<div class="pxsay">🧑‍⚕️ Cornerman: fix it. One of you is a saboteur.</div>`;
const dBar = hp => `<div class="pxbar"><u id="pxhp" style="width:${hp}%;background:${hpColor(hp)}"></u><b id="pxhpn">❤ ${hp}%</b></div>`;
function dirty(g, c) {
  const ph = g.phase, ids = g.seats || [], head = badge(g);
  if (ph === "act") {
    const m = g.mine != null;
    return head + `<canvas class="px" id="pxs"></canvas>` + dBar(g.health) + `<div class="pxbtns">${["jelly", "ice", "water"].map(t => `<button type="button" class="pxt${g.mine === t ? " me" : ""}" data-a="px" data-id="${t}" ${m ? "disabled" : ""}><i>${TOOL[t][0]}</i>${TOOL[t][1]}</button>`).join("")}</div>${c.timer(g, 8000)}`;
  }
  if (ph === "show") {
    const pk = g.peek, r = g.res || {};
    return head + `<canvas class="px" id="pxs"></canvas>` + dBar(r.from == null ? g.health : r.from) + `<div class="pxsay">${r.c || 0} right ✔ · ${r.w || 0} wrong ✘${pk ? ` · 🔍 ${esc(c.nm(pk.u))}: ${pk.ok ? "right" : "wrong"}` : ""}</div>`;
  }
  if (ph === "vote") {
    return head + `<div class="dlbox"><b>Who is the Saboteur? 😈</b></div><div class="pxbtns pxt2">${ids.filter(id => id !== c.ME).map(id => { const k = ids.indexOf(id); return `<button type="button" class="pxt${g.myvote === id ? " me" : ""}" data-a="px2" data-id="${id}" ${g.myvote ? "disabled" : ""}><i>${["🧔", "🤪", "🤓"][k]}</i>${esc(c.nm(id))}</button>`; }).join("")}</div>${c.timer(g, 25000)}`;
  }
  const r = g.res || {}, gain = r.gain || {};
  return `<div class="dlbox ${r.caught ? "dwin" : "dlose"}"><b>${r.caught ? "Saboteur caught! 😈" : "Saboteur got away! 😈"}</b><p>${esc(c.nm(r.sab))} · fighter ${g.health}%</p></div>
<div class="pxhud">${ids.map(id => `<div class="${id === c.ME ? "me" : ""}">${esc(short(c, id))}<b>${(g.score || {})[id] || 0}</b><span style="color:var(--grn)">+${gain[id] || 0}${id === r.sab ? " 😈" : ""}</span></div>`).join("")}</div>${c.final(g)}`;
}

/* ---------- public API used by party.js ---------- */
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
    TOK++; L.c = c; L.g = g; HK = "";
    if (g.phase === "live") { if (g.game === "pie") pieInit(g, c); else glInit(g, c); return; }
    if (g.game === "dirty" && (g.phase === "act" || g.phase === "show")) dirtyInit(g, c, Math.max(0, (c.srv() - (g.ends - 4000)) / 1000));
  },
  update(g, c) { if (g.phase !== "live") return; if (g.game === "pie") pieUpdate(g, c); else glUpdate(g, c); },
  live(g) { return !!g && g.phase === "live"; },
  key(g) { return g.phase === "live" ? "live" : [(g.acted || []).join(), g.mine, g.prob, g.health, (g.voted || []).join(), g.myvote].join("~"); }
};
})();
