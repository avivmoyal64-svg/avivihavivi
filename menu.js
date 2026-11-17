/* Side menu: a shortcut to every page, plus a Users tab with every player's profile. Loaded last (shares the main script's globals). */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const ITEMS = [["home", "🏠", "Home"], ["picks", "🥊", "This week's picks"], ["score", "🏆", "Scoreboard"], ["goat", "🐐", "GOAT list"], ["shop", "🛍️", "Shop"], ["case", "🎁", "Daily case"], ["duel", "⚔️", "Trivia duel"], ["guess", "🕵️", "Guess the fighter"]];
let TAB = "menu", Q = "", built = false;
const isOpen = () => { const d = $("smd"); return !!(d && d.classList.contains("on")); };

function build() {
  if (built) return; built = true;
  const h = document.createElement("button"); h.id = "smh"; h.type = "button"; h.setAttribute("aria-label", "Open menu"); h.textContent = "☰"; h.hidden = true; h.onclick = () => window.smOpen();
  const o = document.createElement("div"); o.id = "smo"; o.onclick = () => window.smClose();
  const d = document.createElement("aside"); d.id = "smd"; d.setAttribute("aria-label", "Menu");
  document.body.appendChild(h); document.body.appendChild(o); document.body.appendChild(d);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen()) window.smClose(); });
}
function draw() {
  const d = $("smd"); if (!d) return;
  const me = (typeof NAMES !== "undefined" && NAMES[ME]) || "";
  d.innerHTML = `<div class="smt"><div><b>UFC Fighter Roster</b><small>${esc(me)}${me ? " · " : ""}${typeof coins === "function" && ME ? coins(ME) + " coins" : ""}</small></div><button type="button" class="smx" aria-label="Close menu" onclick="smClose()">✕</button></div>
  <div class="smtb"><button type="button" class="${TAB === "menu" ? "on" : ""}" onclick="smTab('menu')">Menu</button><button type="button" class="${TAB === "users" ? "on" : ""}" onclick="smTab('users')">Users</button></div>
  <div class="smb">${TAB === "menu" ? ITEMS.map(([k, i, t]) => `<button type="button" class="smi" onclick="smGo('${k}')"><i>${i}</i><span>${esc(t)}</span><em>›</em></button>`).join("") : `<input class="gpq" id="smq" type="search" placeholder="Search a user" autocomplete="off" value="${esc(Q)}" oninput="smSearch(this.value)"><div id="sml"></div>`}</div>`;
  if (TAB === "users") list();
}
function list() {
  const out = $("sml"); if (!out) return;
  const ids = Array.from(new Set(Object.keys(NAMES || {}).concat(Object.keys(PICKS || {})))), k = nz(Q);
  const rows = ids.map(id => ({ id, n: NAMES[id] || (PICKS[id] || {}).name || "Fight fan", c: coins(id) })).filter(x => !k || nz(x.n).includes(k)).sort((a, b) => b.c - a.c || a.n.localeCompare(b.n));
  out.innerHTML = rows.map((x, i) => {
    const bn = window.bannerOf ? window.bannerOf(x.id) : null, bf = bn && bn.f && findF(bn.f) ? bn.f : "", ph = bf && typeof photoZ === "function" ? photoZ(bf) : "";
    const av = ph ? `<i class="ga" style="background-image:url(${ph})"></i>` : `<i class="ga">${esc(ini(x.n))}</i>`;
    return `<button type="button" class="smu" data-id="${esc(x.id)}" style="${bn && /^#[0-9a-f]{6}$/i.test(bn.c) ? "border-inline-start-color:" + bn.c : ""}"><span class="n">${i + 1}</span>${av}<span class="nm">${esc(x.n)}${x.id === ME ? " (you)" : ""}${SK(x.id)}</span><b>${x.c}<i class="coin"></i></b></button>`;
  }).join("") || '<div class="pfn">No users found.</div>';
  out.querySelectorAll(".smu").forEach(b => { b.onclick = () => { const id = b.dataset.id; window.smClose(); try { openProf(id); } catch (e) {} }; });
}
window.smSearch = v => { Q = v; list(); };
window.smTab = t => { TAB = t; Q = ""; draw(); if (t === "users") { try { $("smq").focus(); } catch (e) {} } };
window.smOpen = () => { build(); draw(); $("smd").classList.add("on"); $("smo").classList.add("on"); };
window.smClose = () => { const d = $("smd"), o = $("smo"); if (d) d.classList.remove("on"); if (o) o.classList.remove("on"); };
window.smGo = k => {
  window.smClose();
  if (k === "home") { try { closePage(); } catch (e) {} try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); } return; }
  try { openPage(k); } catch (e) {}
};
build();
setInterval(() => { const h = $("smh"); if (h) h.hidden = !(typeof ME !== "undefined" && ME && typeof READY !== "undefined" && READY); }, 800);
})();
