/* Shop: reaction emojis, color themes and name stickers. Loaded after the main script (shares its globals). */
(function () {
"use strict";
const IT = {
  e_thumb:{g:"🥊",n:"Nice pick"}, e_fire:{g:"🔥",n:"Fire"}, e_laugh:{g:"😂",n:"Laugh"}, e_clap:{g:"👏",n:"Clap"}, e_eyes:{g:"🧠",n:"Big brain"},
  e_skull:{g:"🪦",n:"Dead pick"}, e_clown:{g:"🤡",n:"Clown"}, e_shock:{g:"💥",n:"Boom"}, e_ice:{g:"🥱",n:"Boring"}, e_rocket:{g:"🔒",n:"Lock"},
  e_crown:{g:"👑",n:"Crown"}, e_goat:{g:"🐐",n:"Goat"},
  t_pink:{v:"pink",n:"Pink",c:"#e0197d"}, t_blue:{v:"blue",n:"Blue",c:"#1a6fe0"}, t_green:{v:"green",n:"Green",c:"#12a150"},
  s_champ:{i:"👑",n:"CHAMP"}, s_ko:{i:"🥊",n:"KO KING"}, s_pick:{i:"🎯",n:"PICK MASTER"}, s_goat:{i:"🐐",n:"THE GOAT"}, s_one:{i:"⭐",n:"THE ONE & ONLY"}
};
window.SHOPIT = IT;
const kind = id => id[0] === "e" ? "emoji" : id[0] === "t" ? "theme" : "sticker";
const SHOP = { ok: false, price: {}, owned: new Set(), prof: {}, wallet: 0, msg: "" };
let REACT = {};
const $ = id => document.getElementById(id);
const owned = id => SHOP.price[id] === 0 || SHOP.owned.has(id);

function applyTheme(id) {
  const v = (IT[id] || {}).v || "", r = document.documentElement;
  if (v) r.dataset.theme = v; else delete r.dataset.theme;
  try { v ? localStorage.setItem("ufctheme", v) : localStorage.removeItem("ufctheme"); } catch (e) {}
}
window.stk = id => { const p = SHOP.prof[id], s = p && IT[p.sticker]; return s ? `<span class="stk ${p.sticker}">${s.i} ${s.n}</span>` : ""; };

/* ---------- loading ---------- */
function setReact(rows) { REACT = {}; (rows || []).forEach(x => { (REACT[x.target_id + "|" + x.fight_id] = REACT[x.target_id + "|" + x.fight_id] || []).push({ u: x.user_id, e: x.emoji }); }); }
async function reactLoad() { if (!SB || !SHOP.ok) return; try { const { data, error } = await SB.from("reactions").select("user_id,target_id,fight_id,emoji"); if (!error) { setReact(data); document.querySelectorAll(".rxb").forEach(fill); } } catch (e) {} }
window.reactLoad = reactLoad;
async function shopLoad() {
  if (!SB || !ME) return;
  try {
    const [c, o, p, r, w] = await Promise.all([
      SB.from("shop_catalog").select("item,price"), SB.from("shop_owned").select("item"),
      SB.from("shop_profile").select("user_id,sticker,theme"), SB.from("reactions").select("user_id,target_id,fight_id,emoji"), SB.rpc("shop_wallet")]);
    if (c.error || !c.data || !c.data.length) return;
    SHOP.ok = true; SHOP.price = {}; c.data.forEach(x => { SHOP.price[x.item] = x.price; });
    SHOP.owned = new Set((o.data || []).map(x => x.item));
    SHOP.prof = {}; (p.data || []).forEach(x => { SHOP.prof[x.user_id] = x; });
    if (!w.error && typeof w.data === "number") SHOP.wallet = w.data;
    setReact(r.data);
    const mine = SHOP.prof[ME]; if (mine && mine.theme) applyTheme(mine.theme); else if (mine) applyTheme(null);
    try { ren(); } catch (e) {}
    if (!$("pgH").hidden) drawPage();
  } catch (e) {}
}
window.shopLoad = shopLoad;

/* ---------- shop page ---------- */
function cardEm(id) { const it = IT[id], pr = SHOP.price[id], has = owned(id);
  return `<div class="shc${has ? " own" : ""}"><div class="shg">${it.g}</div><b>${it.n}</b>${has ? '<span class="shb on">Owned</span>' : `<button type="button" class="shb" data-i="${id}" onclick="shopAct(this.dataset.i)">${pr} <i class="coin"></i></button>`}</div>`; }
function cardTh(id) { const it = IT[id], pr = SHOP.price[id], has = owned(id), on = (SHOP.prof[ME] || {}).theme === id;
  return `<div class="shc${has ? " own" : ""}"><div class="shg"><span class="shw" style="background:${it.c}"></span></div><b>${it.n}</b>${!has ? `<button type="button" class="shb" data-i="${id}" onclick="shopAct(this.dataset.i)">${pr} <i class="coin"></i></button>` : on ? '<span class="shb on">In use</span>' : `<button type="button" class="shb use" data-i="${id}" onclick="shopAct(this.dataset.i)">Use</button>`}</div>`; }
function cardSt(id) { const pr = SHOP.price[id], has = owned(id), on = (SHOP.prof[ME] || {}).sticker === id;
  return `<div class="shc wide${has ? " own" : ""}"><div class="shg"><span class="stk ${id}">${IT[id].i} ${IT[id].n}</span></div>${!has ? `<button type="button" class="shb" data-i="${id}" onclick="shopAct(this.dataset.i)">${pr} <i class="coin"></i></button>` : on ? `<button type="button" class="shb use" data-i="" data-k="sticker" onclick="shopOff(this.dataset.k)">Remove</button>` : `<button type="button" class="shb use" data-i="${id}" onclick="shopAct(this.dataset.i)">Use</button>`}</div>`; }
window.shopHtml = function () {
  if (!ME || !SB) return '<div class="box"><div class="pfn">Log in to use the shop.</div></div>';
  if (!SHOP.ok) return '<div class="box"><div class="pfn">The shop is not open yet.</div></div>';
  const ids = Object.keys(IT).filter(i => SHOP.price[i] !== undefined), by = k => ids.filter(i => kind(i) === k);
  const th = (SHOP.prof[ME] || {}).theme;
  return `<div class="shwal"><span>Your wallet</span><b>${SHOP.wallet} <i class="coin"></i></b></div>
  <div class="gnote" style="margin-top:6px">Spending coins does not lower your rank.</div>${SHOP.msg ? `<div class="gnote" style="color:#fff;font-weight:700">${SHOP.msg}</div>` : ""}
  <div class="pgl">Reaction emojis</div><div class="gnote" style="margin:0 0 8px">Use them to react to other players' picks.</div><div class="shgrid">${by("emoji").map(cardEm).join("")}</div>
  <div class="pgl">Color themes</div><div class="shgrid"><div class="shc own"><div class="shg"><span class="shw" style="background:#d20a0a"></span></div><b>Red</b>${!th ? '<span class="shb on">In use</span>' : '<button type="button" class="shb use" data-k="theme" onclick="shopOff(this.dataset.k)">Use</button>'}</div>${by("theme").map(cardTh).join("")}</div>
  <div class="pgl">Stickers</div><div class="gnote" style="margin:0 0 8px">A sticker sits next to your name for everyone to see.</div><div class="shgrid shone">${by("sticker").map(cardSt).join("")}</div>`;
};

/* ---------- buy / use ---------- */
const MSG = { "not enough coins": "Not enough coins.", "already owned": "You already own this." };
function fail(e) { const m = String((e && e.message) || e || ""); alert(MSG[m] || "Something went wrong: " + m); }
async function equip(k, id) {
  const { error } = await SB.rpc("shop_equip", { p_kind: k, p_item: id || "" }); if (error) { fail(error); return false; }
  const p = SHOP.prof[ME] = SHOP.prof[ME] || { user_id: ME }; p[k] = id || null;
  if (k === "theme") applyTheme(id); return true;
}
window.shopAct = async function (id) {
  if (!IT[id] || !SB || !ME) return;
  try {
    if (!owned(id)) {
      const it = IT[id], pr = SHOP.price[id];
      if (pr > SHOP.wallet) { alert("Not enough coins."); return; }
      if (!confirm("Buy " + ((it.g || it.i || "") + " " + it.n).trim() + " for " + pr + " coins?")) return;
      const { data, error } = await SB.rpc("shop_buy", { p_item: id }); if (error) { fail(error); return; }
      SHOP.owned.add(id); SHOP.wallet = typeof data === "number" ? data : SHOP.wallet - pr;
      if (kind(id) !== "emoji") await equip(kind(id), id);
      SHOP.msg = "🎉 " + it.n + " is yours!";
      try { ren(); } catch (e) {}
    } else if (kind(id) !== "emoji") { await equip(kind(id), id); SHOP.msg = ""; try { ren(); } catch (e) {} }
  } catch (e) { fail(e); }
  drawPage();
};
window.shopOff = async function (k) { try { if (await equip(k, "")) { SHOP.msg = ""; try { ren(); } catch (e) {} } } catch (e) { fail(e); } drawPage(); };

/* ---------- reactions ---------- */
function inner(uid, k) {
  const L = REACT[uid + "|" + k] || [], g = {}; L.forEach(x => { const o = g[x.e] = g[x.e] || { n: 0, me: false }; o.n++; if (x.u === ME) o.me = true; });
  const can = !!ME && uid !== ME && SHOP.ok;
  let o = Object.keys(g).filter(e => IT[e]).map(e => can ? `<button type="button" class="rx${g[e].me ? " me" : ""}" data-e="${e}">${IT[e].g}<small>${g[e].n}</small></button>` : `<span class="rx">${IT[e].g}<small>${g[e].n}</small></span>`).join("");
  if (can) o += '<button type="button" class="rx add" data-add="1" aria-label="React">☺<small>+</small></button>';
  return o;
}
function fill(b) { b.innerHTML = inner(b.dataset.u, b.dataset.f); }
window.rxStrip = (uid, k) => SHOP.ok && uid ? `<div class="rxb" data-u="${esc(uid)}" data-f="${esc(k)}">${inner(uid, k)}</div>` : "";
function mineOf(uid, k) { const x = (REACT[uid + "|" + k] || []).find(r => r.u === ME); return x ? x.e : ""; }
async function setR(uid, k, e) {
  const key = uid + "|" + k, old = (REACT[key] || []).slice();
  REACT[key] = old.filter(x => x.u !== ME); if (e) REACT[key].push({ u: ME, e });
  document.querySelectorAll(".rxb").forEach(b => { if (b.dataset.u === uid && b.dataset.f === k) fill(b); });
  try { const { error } = await SB.rpc("shop_react", { p_target: uid, p_fight: k, p_emoji: e || "" }); if (error) throw error; }
  catch (x) { REACT[key] = old; document.querySelectorAll(".rxb").forEach(b => { if (b.dataset.u === uid && b.dataset.f === k) fill(b); }); fail(x); }
}
function palette(uid, k) {
  const have = Object.keys(IT).filter(i => kind(i) === "emoji" && SHOP.price[i] !== undefined && owned(i)), cur = mineOf(uid, k);
  $("rpb").innerHTML = `<h2>React</h2><div class="rpg">${have.map(i => `<button type="button" class="${cur === i ? "me" : ""}" data-e="${i}">${IT[i].g}</button>`).join("")}</div>${cur ? '<button type="button" class="btn" data-e="">Remove my reaction</button>' : ""}<div class="gnote">More emojis are in the Shop on the home screen.</div>`;
  $("rpb").dataset.u = uid; $("rpb").dataset.f = k; const d = $("rp"); if (!d.open) d.showModal();
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest(".rxb button"); if (b) {
    const w = b.closest(".rxb"), uid = w.dataset.u, k = w.dataset.f;
    if (b.dataset.add) palette(uid, k); else setR(uid, k, mineOf(uid, k) === b.dataset.e ? "" : b.dataset.e);
    return;
  }
  const p = e.target.closest && e.target.closest("#rpb button[data-e]"); if (p) { const r = $("rpb"); $("rp").close(); setR(r.dataset.u, r.dataset.f, p.dataset.e); }
});
$("rp") && $("rp").addEventListener("click", e => { if (e.target === $("rp")) $("rp").close(); });

/* ---------- start ---------- */
(function w(n) { try { if (ME && SB) { shopLoad(); return; } } catch (e) {} if (n < 40) setTimeout(() => w(n + 1), 400); })(0);
})();
