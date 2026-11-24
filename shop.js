/* Shop: reaction emojis, color themes and name stickers. Loaded after the main script (shares its globals). */
(function () {
"use strict";
const IT = {
  t_pink:{v:"pink",n:"Pink",c:"#e0197d"}, t_blue:{v:"blue",n:"Blue",c:"#1a6fe0"}, t_green:{v:"green",n:"Green",c:"#12a150"},
  s_champ:{i:"👑",n:"CHAMP"}, s_ko:{i:"🥊",n:"KO KING"}, s_pick:{i:"🎯",n:"PICK MASTER"}, s_goat:{i:"🐐",n:"THE GOAT"}, s_one:{i:"⭐",n:"THE ONE & ONLY"}
};
IT.b_banner = { n: "Profile banner" };
window.SHOPIT = IT;
const kind = id => id[0] === "b" ? "banner" : id[0] === "t" ? "theme" : "sticker";
const SHOP = { ok: false, price: {}, owned: new Set(), prof: {}, wallet: 0, msg: "" };
const $ = id => document.getElementById(id);
const owned = id => SHOP.price[id] === 0 || SHOP.owned.has(id);

function applyTheme(id) {
  const v = (IT[id] || {}).v || "", r = document.documentElement;
  if (v) r.dataset.theme = v; else delete r.dataset.theme;
  try { v ? localStorage.setItem("ufctheme", v) : localStorage.removeItem("ufctheme"); } catch (e) {}
}
window.stk = id => { const p = SHOP.prof[id], s = p && IT[p.sticker]; return s ? `<span class="stk ${p.sticker}">${s.i} ${s.n}</span>` : ""; };

/* ---------- loading ---------- */
window.reactLoad = () => {};
async function shopLoad() {
  if (!SB || !ME) return;
  try {
    const [c, o, p, w] = await Promise.all([
      SB.from("shop_catalog").select("item,price"), SB.from("shop_owned").select("item"),
      SB.from("shop_profile").select("*"), SB.rpc("shop_wallet")]);
    try { const sp = await SB.rpc("shop_spent"); if (!sp.error && Array.isArray(sp.data)) { window.SPENT = {}; sp.data.forEach(x => { window.SPENT[x.user_id] = Number(x.spent) || 0; }); } } catch (e) {}
    if (c.error || !c.data || !c.data.length) return;
    SHOP.ok = true; SHOP.price = {}; c.data.forEach(x => { SHOP.price[x.item] = x.price; });
    SHOP.owned = new Set((o.data || []).map(x => x.item));
    SHOP.prof = {}; (p.data || []).forEach(x => { SHOP.prof[x.user_id] = x; });
    if (!w.error && typeof w.data === "number") SHOP.wallet = w.data;
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
  <div class="pgl">Color themes</div><div class="shgrid"><div class="shc own"><div class="shg"><span class="shw" style="background:#d20a0a"></span></div><b>Red</b>${!th ? '<span class="shb on">In use</span>' : '<button type="button" class="shb use" data-k="theme" onclick="shopOff(this.dataset.k)">Use</button>'}</div>${by("theme").map(cardTh).join("")}</div>
  <div class="pgl">Stickers</div><div class="gnote" style="margin:0 0 8px">A sticker sits next to your name for everyone to see.</div><div class="shgrid shone">${by("sticker").map(cardSt).join("")}</div>`;
};

/* ---------- profile banner (a fighter + a colour on your profile) ---------- */
window.hasBanner = () => SHOP.owned.has("b_banner");
window.bannerOf = uid => { const p = SHOP.prof[uid]; return p && (p.banner_fighter || p.banner_color) ? { f: p.banner_fighter || "", c: p.banner_color || "" } : null; };
window.setBanner = async function (f, c) {
  if (!SB || !ME) return false;
  const { error } = await SB.rpc("set_banner", { p_fighter: f || "", p_color: c || "" });
  if (error) { fail(error); return false; }
  const p = SHOP.prof[ME] = SHOP.prof[ME] || { user_id: ME }; p.banner_fighter = f || null; p.banner_color = c || null;
  return true;
};

const SWATCH = ["#d20a0a", "#ff6a00", "#ffcc33", "#3fbf6a", "#1a9fe0", "#3d5afe", "#9b5cff", "#f253b8", "#e8e8ec"];
function bannerUI() {
  if (!window.hasBanner()) return SHOP.ok ? '<div class="pfn" style="margin-bottom:12px">🖼️ Win a <b>Profile banner</b> in the daily case to show a fighter and your own colour on your profile.</div>' : "";
  const b = window.bannerOf(ME) || { f: "", c: "" };
  return `<div class="pfcz"><h3>Your profile banner</h3><div class="pfn">Pick a fighter to show big on your profile and choose your colour.</div>
  <input class="gpq" id="pfq" type="search" placeholder="Search a fighter" autocomplete="off" oninput="pfbList(this.value)"><div class="dlfl" id="pfl"></div>
  <div class="pfsw">${SWATCH.map(c => `<button type="button" style="background:${c}" class="${b.c === c ? "on" : ""}" aria-label="${c}" onclick="pfbColor('${c}')"></button>`).join("")}<input type="color" value="${/^#[0-9a-f]{6}$/i.test(b.c) ? b.c : "#d20a0a"}" aria-label="Custom colour" onchange="pfbColor(this.value)"></div>
  ${b.f || b.c ? '<button type="button" class="fvb" onclick="pfbClear()">Remove banner</button>' : ""}</div>`;
}
function stickerUI() {
  if (!SHOP.ok) return "";
  const mine = Object.keys(IT).filter(i => kind(i) === "sticker" && SHOP.price[i] !== undefined && owned(i)), cur = (SHOP.prof[ME] || {}).sticker || "";
  if (!mine.length) return '<div class="pfn" style="margin-bottom:12px">⭐ Get a <b>sticker</b> in the daily case or the shop to show it next to your name.</div>';
  return `<div class="pfcz"><h3>Your sticker</h3><div class="pfn">The sticker next to your name. Tap one to use it.</div><div class="pfstk">${mine.map(i => `<button type="button" class="${cur === i ? "on" : ""}" data-i="${i}" onclick="pfsPick(this.dataset.i)"><span class="stk ${i}">${IT[i].i} ${IT[i].n}</span></button>`).join("")}${cur ? '<button type="button" class="none" data-i="" onclick="pfsPick(\'\')">No sticker</button>' : ""}</div></div>`;
}
window.pfBannerUI = function (id) {
  if (id !== ME || !SB) return "";
  return bannerUI() + stickerUI();
};
window.pfsPick = async function (i) {
  try { if (i) await window.shopAct(i); else await window.shopOff("sticker"); } catch (e) {}
  try { openProf(ME, 1); } catch (e) {}
};
window.pfbList = function (v) {
  const out = $("pfl"); if (!out) return; const k = nz(v || ""), all = [];
  for (const c in D) D[c].forEach(f => all.push(f.n));
  if (!k) { out.innerHTML = ""; return; }
  out.innerHTML = all.filter(n => nz(n).includes(k)).sort().slice(0, 8).map(n => `<button type="button" data-n="${esc(n)}" onclick="pfbPick(this.dataset.n)">${avZ(n).replace("<i ", '<i class="ga" ')}<span>${esc(n)}</span></button>`).join("") || '<div class="pfn">No match.</div>';
};
const pfbSave = async (f, c) => { if (await window.setBanner(f, c)) { try { openProf(ME, 1); } catch (e) {} } };
window.pfbPick = n => pfbSave(n, (window.bannerOf(ME) || {}).c || "");
window.pfbColor = c => pfbSave((window.bannerOf(ME) || {}).f || "", c);
window.pfbClear = () => pfbSave("", "");

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
      SHOP.owned.add(id); window.SPENT = window.SPENT || {}; window.SPENT[ME] = (window.SPENT[ME] || 0) + pr; SHOP.wallet = typeof data === "number" ? data : SHOP.wallet - pr;
      if (kind(id) !== "emoji") await equip(kind(id), id);
      SHOP.msg = "🎉 " + it.n + " is yours!";
      try { ren(); } catch (e) {}
    } else if (kind(id) !== "emoji") { await equip(kind(id), id); SHOP.msg = ""; try { ren(); } catch (e) {} }
  } catch (e) { fail(e); }
  drawPage();
};
window.shopOff = async function (k) { try { if (await equip(k, "")) { SHOP.msg = ""; try { ren(); } catch (e) {} } } catch (e) { fail(e); } drawPage(); };

/* reaction emojis were removed from the site */
window.rxStrip = () => "";

/* ---------- start ---------- */
(function w(n) { try { if (ME && SB) { shopLoad(); return; } } catch (e) {} setTimeout(() => w(n + 1), n < 40 ? 400 : 2000); })(0);
})();

/* keep everybody's spent coins fresh so the leaderboard and the wallet show the same number */
setInterval(async () => { try { if (!ME || !SB || document.hidden) return; const sp = await SB.rpc("shop_spent"); if (!sp.error && Array.isArray(sp.data)) { const m = {}; sp.data.forEach(x => { m[x.user_id] = Number(x.spent) || 0; }); const ch = JSON.stringify(m) !== JSON.stringify(window.SPENT || {}); window.SPENT = m; if (ch) { try { ren(); } catch (e) {} } } } catch (e) {} }, 60000);
