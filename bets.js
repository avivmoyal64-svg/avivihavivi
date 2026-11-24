/* Bets on fights + favorite fighter. Loaded after the main script (shares its globals). */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const FAV = {};
window.FAVMAP = FAV;
let FAVOK = false, BW = null, T = 0;

function redraw() { try { const d = $("pk"); if (d && d.open && CF) drawPk(); } catch (e) {} }
function setBets(rows) {
  Object.keys(BETS).forEach(k => delete BETS[k]);
  (rows || []).forEach(x => { (BETS[x.user_id] = BETS[x.user_id] || {})[x.fight_id] = x.stake; });
}

/* ---------- loading ---------- */
async function legLoad() {
  try {
    const q = await fetch(SUPA_URL + "/rest/v1/site_data?key=eq.legacy_main&select=value", { headers: { apikey: SUPA_KEY }, cache: "no-store" });
    if (!q.ok) return;
    const a = await q.json();
    if (a[0] && Array.isArray(a[0].value)) { LEGM = new Set(a[0].value); try { ren(); } catch (e) {} }
  } catch (e) {}
}
async function betLoad() {
  if (!SB || !ME) return;
  try { const b = await SB.from("bets").select("user_id,fight_id,stake"); if (b.error) BETOK = false; else { BETOK = true; setBets(b.data); } } catch (e) { BETOK = false; }
  try {
    const f = await SB.from("profile_fav").select("user_id,fighter");
    if (!f.error) { FAVOK = true; Object.keys(FAV).forEach(k => delete FAV[k]); (f.data || []).forEach(x => { FAV[x.user_id] = x.fighter; }); }
  } catch (e) {}
  if (BETOK) { try { const w = await SB.rpc("shop_wallet"); if (!w.error && typeof w.data === "number") BW = w.data; } catch (e) {} }
  try { ren(); } catch (e) {}
  try { const p = $("pf"); if (p && p.open && p.dataset.id) openProf(p.dataset.id, 1); } catch (e) {}
  redraw();
}
window.betLoad = betLoad;

/* ---------- bets ---------- */
window.betBox = (f, sv, can) => {
  if (!BETOK || !ME) return "";
  const has = betOf(ME, f.id), S = BSTAKE, id = esc(f.id);
  if (has) {
    return `<div class="bbx on"><h4>🎲 Bet placed · ${S} coins</h4><p>Every right answer on this fight pays double. A wrong winner loses the ${S} coins. A no contest or a draw gives them back.</p>${can ? `<button class="bbb" type="button" onclick="betDo('${id}',0)">Take my bet back</button>` : ""}<div class="bbm" id="bbm" role="status"></div></div>`;
  }
  if (!can) return "";
  const low = BW !== null && BW < S, ok = !!sv && !low;
  const note = !sv ? "Lock in your pick first, then you can bet on it." : low ? `You need ${S} free coins to bet (you have ${Math.max(BW, 0)}).` : BW !== null ? `You have ${BW} coins to bet with.` : "";
  return `<div class="bbx"><h4>🎲 Bet ${S} coins on this fight</h4><p>Every right answer pays double: winner, method and round. If your winner is wrong you lose the ${S} coins. A no contest or a draw gives them back.</p><button class="bbb" type="button" ${ok ? "" : "disabled"} onclick="betDo('${id}',1)">Bet ${S} coins</button><div class="bbm" id="bbm" role="status">${note}</div></div>`;
};
window.betDo = async (id, on) => {
  const m = $("bbm"), say = t => { const e = $("bbm"); if (e) e.textContent = t; };
  try {
    const r = await SB.rpc(on ? "place_bet" : "cancel_bet", { p_fight: id });
    if (r.error) throw r.error;
    if (typeof r.data === "number") BW = r.data;
    if (on) (BETS[ME] = BETS[ME] || {})[id] = BSTAKE; else if (BETS[ME]) delete BETS[ME][id];
    try { ren(); } catch (e) {}
    redraw();
  } catch (e) {
    const t = String((e && e.message) || e);
    say(/not enough/i.test(t) ? "You need " + BSTAKE + " free coins to bet." : /locked/i.test(t) ? "Picks are locked, so bets can't change any more." : /pick/i.test(t) ? "Lock in your pick first." : "Could not change the bet. Try again.");
  }
};

/* ---------- favorite fighter ---------- */
window.favBlock = id => {
  if (!FAVOK) return "";
  const n = FAV[id], mine = id === ME;
  if (!n && !mine) return "";
  if (!n) return `<div class="fvt empty"><div><small>Favorite fighter</small><b>Not chosen yet</b></div><button class="fvb" type="button" onclick="favPick()">Choose</button></div>`;
  return `<div class="fvt"><span class="fva" ${fa(n)}>${avZ(n)}</span><div><small>Favorite fighter</small><b>${esc(n)}</b></div>${mine ? `<button class="fvb" type="button" onclick="favPick()">Change</button>` : ""}</div>`;
};
function favList(q) {
  const k = nz(q), all = [];
  for (const c in D) D[c].forEach(f => all.push([f.n, c]));
  const seen = new Set();
  const r = all.filter(x => { const z = nz(x[0]); if (seen.has(z)) return false; seen.add(z); return !k || z.includes(k); }).sort((a, b) => a[0].localeCompare(b[0])).slice(0, 30);
  $("gpl").innerHTML = r.map(x => `<button type="button" data-n="${esc(x[0])}" onclick="favChoose(this.dataset.n)">${avZ(x[0]).replace("<i ", '<i class="ga" ')}<span>${esc(x[0])}</span><small>${esc(x[1])}</small></button>`).join("") || '<div class="pfn">No match.</div>';
}
window.favPick = () => {
  const cur = FAV[ME];
  $("gpb").innerHTML = `<h2>Favorite fighter</h2>${cur ? `<div class="gact"><button type="button" class="rm" onclick="favChoose('')">Remove</button></div>` : ""}<div class="gps"><input class="gpq" id="gpq" type="search" placeholder="Search a fighter" autocomplete="off"></div><div class="gpl" id="gpl"></div>`;
  $("gpq").addEventListener("input", e => favList(e.target.value));
  const d = $("gp"); if (!d.open) d.showModal();
  favList("");
};
window.favChoose = async n => {
  try { $("gp").close(); } catch (e) {}
  if (!SB || !ME) return;
  const old = FAV[ME];
  if (n) FAV[ME] = n; else delete FAV[ME];
  try { const p = $("pf"); if (p && p.open && p.dataset.id) openProf(p.dataset.id, 1); } catch (e) {}
  try {
    const r = n ? await SB.from("profile_fav").upsert({ user_id: ME, fighter: n }) : await SB.from("profile_fav").delete().eq("user_id", ME);
    if (r.error) throw r.error;
  } catch (e) {
    if (old) FAV[ME] = old; else delete FAV[ME];
    try { const p = $("pf"); if (p && p.open && p.dataset.id) openProf(p.dataset.id, 1); } catch (e2) {}
    alert("Could not save your favorite fighter. Try again.");
  }
};

/* ---------- start ---------- */
legLoad();
(function w(n) {
  try { if (ME && SB) { betLoad(); SB.channel("bets").on("postgres_changes", { event: "*", schema: "public", table: "bets" }, () => { clearTimeout(T); T = setTimeout(betLoad, 400); }).subscribe(); return; } } catch (e) {}
  setTimeout(() => w(n + 1), n < 40 ? 400 : 2000);
})(0);
document.addEventListener("visibilitychange", () => { if (!document.hidden && ME) { try { betLoad(); } catch (e) {} } });
})();
