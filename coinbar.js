/* Coin counter that stays at the top of the screen, plus a coin animation whenever you win coins. Loaded after the main script (shares its globals). */
(function () {
"use strict";
let el = null, num = null, shown = null, seen = null, t0 = 0, raf = 0;
const calm = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
const fmt = n => String(Math.round(n));

function make() {
  el = document.createElement("button");
  el.id = "cbar"; el.type = "button"; el.hidden = true; el.setAttribute("aria-label", "Your coins");
  el.innerHTML = '<i class="coin"></i><b id="cbn">0</b>';
  el.onclick = () => { try { openPage("score"); } catch (e) {} };
  document.body.appendChild(el); num = el.querySelector("#cbn");
}
function setNum(v, anim) {
  cancelAnimationFrame(raf);
  if (!anim || calm() || shown === null) { shown = v; num.textContent = fmt(v); return; }
  const a = shown, b = v, st = performance.now(), d = 900;
  const f = now => { const k = Math.min(1, (now - st) / d), e = 1 - Math.pow(1 - k, 3); num.textContent = fmt(a + (b - a) * e); if (k < 1) raf = requestAnimationFrame(f); else shown = b; };
  raf = requestAnimationFrame(f);
}
function burst(gain) {
  if (!el || el.hidden) return;
  const r = el.getBoundingClientRect(), tx = r.left + r.width / 2, ty = r.top + r.height / 2;
  const lab = document.createElement("div");
  lab.className = "cfxl"; lab.textContent = "+" + gain + " coins"; lab.setAttribute("aria-hidden", "true");
  document.body.appendChild(lab);
  const L = lab.animate ? lab.animate([{ transform: "translate(-50%,10px) scale(.6)", opacity: 0 }, { transform: "translate(-50%,-6px) scale(1.15)", opacity: 1, offset: .25 }, { transform: "translate(-50%,-30px) scale(1)", opacity: 1, offset: .75 }, { transform: "translate(-50%,-50px) scale(.95)", opacity: 0 }], { duration: 1700, easing: "ease-out" }) : null;
  setTimeout(() => lab.remove(), 1800);
  if (calm() || !lab.animate) return;
  const n = Math.min(16, 6 + Math.round(Math.log2(gain + 1) * 1.6)), cx = innerWidth / 2, cy = innerHeight * 0.42;
  for (let i = 0; i < n; i++) {
    const c = document.createElement("i");
    c.className = "coin cfx"; c.setAttribute("aria-hidden", "true");
    c.style.left = cx + "px"; c.style.top = cy + "px";
    document.body.appendChild(c);
    const ang = Math.random() * Math.PI * 2, rad = 40 + Math.random() * 90, mx = Math.cos(ang) * rad, my = Math.sin(ang) * rad - 30;
    const dl = i * 55, a = c.animate([
      { transform: "translate(-50%,-50%) scale(.2)", opacity: 0 },
      { transform: `translate(calc(-50% + ${mx}px),calc(-50% + ${my}px)) scale(1) rotateY(180deg)`, opacity: 1, offset: .35 },
      { transform: `translate(calc(-50% + ${tx - cx}px),calc(-50% + ${ty - cy}px)) scale(.55) rotateY(540deg)`, opacity: 1, offset: .95 },
      { transform: `translate(calc(-50% + ${tx - cx}px),calc(-50% + ${ty - cy}px)) scale(.2)`, opacity: 0 }
    ], { duration: 1100, delay: dl, easing: "cubic-bezier(.3,.7,.3,1)", fill: "both" });
    a.onfinish = () => c.remove();
    setTimeout(() => c.remove(), 2600 + dl);
  }
  try { el.animate([{ transform: "scale(1)" }, { transform: "scale(1.22)", offset: .5 }, { transform: "scale(1)" }], { duration: 420, delay: 750, easing: "ease-out" }); } catch (e) {}
}
window.coinFx = burst;

function tick() {
  if (!el) make();
  let ok = false; try { ok = !!(ME && DB && READY); } catch (e) {}
  el.hidden = !ok;
  if (!ok) { t0 = 0; seen = null; return; }
  let t; try { t = coins(ME); } catch (e) { return; }
  if (typeof t !== "number" || isNaN(t)) return;
  if (!t0) t0 = Date.now();
  if (Date.now() - t0 < 9000 || seen === null) {      /* still loading: follow the total without any animation */
    seen = t; setNum(t, false); return;
  }
  if (t !== shown) setNum(t, t > seen);
  if (t > seen && document.visibilityState === "visible") burst(t - seen);
  seen = t;
}
setInterval(tick, 600);
})();
