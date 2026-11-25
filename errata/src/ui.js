/* ===== Game layer: save, lanes, echoes, rendering ===== */
const $ = id => document.getElementById(id);
const KEY = 'errata-eot-save-1';
const HUES = ['#cfa650', '#62b0a3', '#d0603f', '#8fa3d6', '#a9bf6a', '#c48bb8'];
const LANES = ['Amber', 'Verdigris', 'Cinder', 'Salt', 'Lantern', 'Thistle', 'Marrow', 'Quill', 'Halcyon', 'Umber', 'Sable', 'Brine', 'Tallow', 'Rime'];
const RN = { food: 'Food', wood: 'Timber', vein: 'Ore vein', ore: 'Ore', metal: 'Bronze', arms: 'Arms', lore: 'Lore', awe: 'Awe', mem: 'Memory' };
const RC = { food: '#a9bf6a', wood: '#b08968', vein: '#6f7b80', ore: '#9aa6ab', metal: '#cfa650', arms: '#d0603f', lore: '#8fa3d6', awe: '#c48bb8', mem: '#e7e0cf' };
const SHOW = ['food', 'wood', 'lore', 'awe', 'vein', 'ore', 'metal', 'arms', 'mem'];
const JN = { farmer: 'Farmers', woodcutter: 'Woodcutters', miner: 'Miners', smith: 'Smiths', armorer: 'Armorers', scholar: 'Scholars', priest: 'Priests', forager: 'Foragers' };
const JD = { farmer: 'food, by the climate', woodcutter: 'timber', miner: 'vein into ore', smith: 'ore into bronze', armorer: 'bronze into arms', scholar: 'lore', priest: 'awe', forager: 'a little food, whatever the weather' };
const mul = (k, f) => m => { m[k] *= f; };
const ECHO = {
  hearth: { n: 'First Hearth', how: 'A lane holds 8 people.', fx: 'The horizon recedes 50% faster.', sp: .5 },
  stored: { n: 'Stored Summers', how: 'A lane of 12 or more comes through the Long Winter with no famine dead.', fx: 'Food storage ×2 in every lane.', sp: .1, m: mul('foodCap', 2), after: 'w' },
  hunger: { n: "Hunger's Lesson", how: 'A lane loses three people to famine.', fx: 'Foragers ×1.5 in every lane.', sp: .1, m: mul('forage', 1.5) },
  bronze: { n: 'Bronze Dawn', how: 'A lane holds 40 bronze.', fx: 'Miners and smiths ×1.25 in every lane.', sp: .1, m: m => { m.mine *= 1.25; m.smith *= 1.25; } },
  letters: { n: 'The First Letters', how: 'A lane holds 60 lore.', fx: 'Research takes 30% less time.', sp: .1, m: mul('research', .7) },
  sky: { n: 'Something in the Sky', how: 'A lane holds 60 awe.', fx: 'Every people grows 30% faster.', sp: .1, m: mul('growth', 1.3) },
  oath_blade: { n: 'Oath of the Blade', how: 'A lane swears to the Blade.', fx: 'One more lane. Armorers ×1.25 everywhere.', sp: .15, lane: 1, m: mul('arms', 1.25) },
  oath_bell: { n: 'Oath of the Bell', how: 'A lane swears to the Bell.', fx: 'One more lane. Priests ×1.25 everywhere.', sp: .15, lane: 1, m: mul('awe', 1.25) },
  oath_lens: { n: 'Oath of the Lens', how: 'A lane swears to the Lens.', fx: 'One more lane. Scholars ×1.25 everywhere.', sp: .15, lane: 1, m: mul('lore', 1.25) },
  unaligned: { n: 'The Unsworn', how: 'A lane with no creed outlasts the Ashen Host.', fx: 'One more lane.', sp: .1, lane: 1, after: 0 },
  shieldwall: { n: 'Shieldwall', how: 'Answer the Ashen Host with arms.', fx: 'Armorers ×1.5 in every lane.', sp: .2, m: mul('arms', 1.5), after: 0 },
  kneel: { n: 'The Host Kneels', how: 'Answer the Ashen Host with awe.', fx: 'Every lane begins with 4 more people and room for them.', sp: .2, m: m => { m.startPop += 4; m.housing += 4; }, after: 0 },
  fire: { n: 'Fire on Water', how: 'Answer the Ashen Host with lore.', fx: 'Woodcutters ×1.5 in every lane.', sp: .2, m: mul('wood', 1.5), after: 0 },
  cordon: { n: 'The Cordon', how: 'Answer the Glass Plague with arms.', fx: 'Everything costs 10% less.', sp: .3, m: mul('cost', .9), after: 1 },
  vigil: { n: 'The Nine-Year Vigil', how: 'Answer the Glass Plague with awe.', fx: 'Every people grows 50% faster.', sp: .3, m: mul('growth', 1.5), after: 1 },
  cure: { n: 'The Right Moss', how: 'Answer the Glass Plague with lore.', fx: 'Farmers ×1.5 in every lane.', sp: .3, m: mul('farm', 1.5), after: 1 },
  reg_sword: { n: 'The Unbroken Sword', how: 'A lane of the Blade forges its regalia after the Plague.', fx: 'Lanes of other creeds may Recall it.', sp: .3, after: 1 },
  reg_bell: { n: 'The Bell That Rings Backward', how: 'A lane of the Bell casts its regalia after the Plague.', fx: 'Lanes of other creeds may Recall it.', sp: .3, after: 1 },
  reg_lens: { n: 'The Lens of Last Light', how: 'A lane of the Lens grinds its regalia after the Plague.', fx: 'Lanes of other creeds may Recall it.', sp: .3, after: 1 },
  ruin: { n: 'Witness to Ruin', how: 'Watch a lane fall.', fx: 'The horizon recedes 20% faster. Ruin is also a record.', sp: .2 },
  dawn: { n: 'The Morning After the End', how: 'Bring one lane through the Unmaking.', fx: 'The horizon recedes twice as fast, into whatever comes next.', sp: 2, after: 2 },
  altered: { n: 'Altered Destinies', secret: 1, fx: 'A small salute to an old DOS game. Horizon +5%.', sp: .05 },
  shaken: { n: 'The Shaken Hourglass', secret: 1, fx: 'You shook it. Sand fell. Nothing else is different, probably.', sp: 0 },
  gardener: { n: "The Gardener's Ledger", secret: 1, fx: 'Three lanes pruned. The Archive keeps their names anyway. Horizon +10%.', sp: .1 }
};
let G, sims = new Map(), mods, dirty = true, undoStack = [], saveT = 0, panelT = 0, clicks = [], renaming = null, pruneAsk = null, cache = {};

/* --- helpers --- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const yr = t => Math.floor(t + 1e-6).toLocaleString('en-US');
function fmt(x) { const a = Math.abs(x); if (a >= 1e6) return (x / 1e6).toFixed(2) + 'M'; if (a >= 1e4) return (x / 1e3).toFixed(1) + 'k'; if (a >= 100) return Math.round(x).toLocaleString('en-US'); if (a >= 10) return x.toFixed(0); return x.toFixed(1); }
function fmtRate(x) { if (Math.abs(x) < 0.005) return ''; return (x > 0 ? '+' : '−') + (Math.abs(x) < 10 ? Math.abs(x).toFixed(2) : fmt(Math.abs(x))); }
const lane = id => G.br.find(b => b.id === id);
const act = () => lane(G.act) || G.br[0];
const sim = b => sims.get(b.id);
function civName(b) { const A = ['Vael', 'Oru', 'Ish', 'Tam', 'Kel', 'Sur', 'Ane', 'Dho', 'Myr', 'Eth', 'Ull', 'Pera'], B = ['in', 'ar', 'eth', 'uun', 'ai', 'os', 'im']; return 'The ' + A[(b.id * 7 + 3) % A.length] + B[(b.id * 5 + 1) % B.length]; }
function era(st) { if (st.dead) return 'Ash'; if (st.tr[2]) return 'The Morning'; if (st.creed) return { blade: 'Age of Banners', bell: 'Age of Bells', lens: 'Age of Glass' }[st.creed]; if (st.b.forge) return 'Age of Bronze'; if (st.b.farm) return 'Age of Furrows'; return 'Age of Hearths'; }
function toast(h, cls) { const d = document.createElement('div'); d.className = 'toast ' + (cls || ''); d.innerHTML = h; $('toasts').appendChild(d); setTimeout(() => d.remove(), 7000); }
function setHTML(id, h) { if (cache[id] !== h) { cache[id] = h; $(id).innerHTML = h; } }

/* --- save --- */
function modsOf() { const m = { E: G.echo, forage: 1, farm: 1, wood: 1, mine: 1, smith: 1, arms: 1, lore: 1, awe: 1, foodCap: 1, growth: 1, startPop: 0, housing: 0, research: 1, cost: 1 }; for (const k in G.echo) if (ECHO[k] && ECHO[k].m) ECHO[k].m(m); return m; }
function laneCap() { let n = 2; for (const k in G.echo) if (ECHO[k] && ECHO[k].lane) n++; return n; }
function newGame() {
  G = { v: 1, H: 25, last: Date.now(), born: Date.now(), echo: {}, br: [], act: 0, cur: 25, follow: true, pruned: [], seq: 1, shakes: 0, won: false, nl: 0, intro: true, view: null };
  addLane(null, 0, []);
}
function addLane(parent, forkT, orders) { const id = G.seq++, k = G.nl++; const b = { id, name: LANES[k % LANES.length] + (k >= LANES.length ? ' ' + (1 + Math.floor(k / LANES.length)) : ''), hue: k % HUES.length, parent, forkT, orders }; G.br.push(b); G.act = id; return b; }
function rebuild() { mods = modsOf(); sims.clear(); for (const b of G.br) sims.set(b.id, new Sim(b.orders, mods)); dirty = true; }
function save() { G.last = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) { } }
function load(raw) { try { const o = typeof raw === 'string' ? JSON.parse(raw) : raw; if (o && o.v === 1 && Array.isArray(o.br) && o.br.length) { G = o; return true; } } catch (e) { } return false; }

/* --- time --- */
function resonance(b) { const V = sim(b).at(G.H); return V.st.dead ? 0 : 0.25 * Math.log2(1 + V.v.mem / 200); }
function echoSpeed() { let s = 0; for (const k in G.echo) if (ECHO[k]) s += ECHO[k].sp; return s; }
function speed() { let r = 0; for (const b of G.br) r += resonance(b); return (1 + echoSpeed()) * (1 + r); }
function latch(k) {
  if (G.echo[k] || !ECHO[k]) return false; G.echo[k] = Math.round(G.H);
  toast('<b>Echo recorded</b><span>' + ECHO[k].n + '</span><small>' + ECHO[k].fx + '</small>', 'echo'); return true;
}
function checkEchoes() {
  for (let pass = 0; pass < 6; pass++) {
    let got = false;
    for (const b of G.br) { const s = sim(b); s.extend(G.H); for (const f of s.feats) if (f.t <= G.H && latch(f.k)) got = true; }
    if (!got) break;
    rebuild(); // an echo changes every lane, from year 0
  }
  if (G.echo.dawn && !G.won) { G.won = true; openModal(endingHTML()); }
}
function advance(dt) {
  const n = Math.min(4000, Math.max(1, Math.ceil(dt / 2))), h = dt / n;
  for (let i = 0; i < n; i++) { G.H += speed() * h; checkEchoes(); }
}

/* --- editing a lane's orders --- */
function edit(b, t, fn) {
  undoStack.push({ id: b.id, orders: JSON.stringify(b.orders) }); if (undoStack.length > 80) undoStack.shift();
  fn(b.orders); sim(b).invalidate(t); checkEchoes(); dirty = true; saveT = 0;
}
function insert(arr, o) { const i = arr.findIndex(x => x.t > o.t); if (i < 0) arr.push(o); else arr.splice(i, 0, o); }
function place(o) {
  const b = act(), t = G.cur; o.t = t; o.id = G.seq++;
  edit(b, t, arr => { if (o.k === 'l' || o.k === 'p') { const i = arr.findIndex(x => x.t === t && x.k === o.k && (o.k === 'p' || x.x === o.x)); if (i >= 0) arr.splice(i, 1); } insert(arr, o); });
}
function undo() {
  const u = undoStack.pop(); if (!u) return; const b = lane(u.id); if (!b) return;
  b.orders = JSON.parse(u.orders); const s = sim(b); s.orders = b.orders; s.reset(); checkEchoes(); dirty = true;
}
function describe(o) {
  if (o.k === 'b') return 'Build ' + BLD[o.x].n;
  if (o.k === 'u') return UPG[o.x].n;
  if (o.k === 'l') return JN[o.x] + ': ' + (o.n == null ? 'fill every post' : 'at most ' + o.n);
  return 'Staff first: ' + o.list.slice(0, 3).map(j => JN[j].toLowerCase()).join(', ') + '…';
}

/* --- lanes --- */
function fork() {
  if (G.br.length >= laneCap()) return toast('<b>No room for another lane</b><small>Creeds open more. Each oath a lane swears adds one.</small>');
  const p = act(), t = G.cur, orders = p.orders.filter(o => o.t <= t).map(o => ({ ...o, id: G.seq++ }));
  const b = addLane(p.id, t, orders); sims.set(b.id, new Sim(b.orders, mods)); dirty = true; saveT = 0;
  toast('<b>' + esc(b.name) + '</b><small>Forked from ' + esc(p.name) + ' at year ' + yr(t) + '. Everything before that came with it.</small>');
}
function prune(id) {
  if (G.br.length < 2) return; const b = lane(id); G.pruned.push(b.name);
  G.br = G.br.filter(x => x !== b); sims.delete(id); for (const c of G.br) if (c.parent === id) c.parent = null;
  if (G.act === id) G.act = G.br[0].id; undoStack = undoStack.filter(u => u.id !== id);
  if (G.pruned.length >= 3) latch('gardener'); dirty = true; saveT = 0;
}
function rename(id, name) { const b = lane(id); name = name.trim().slice(0, 24); if (b && name) { b.name = name; if (/millenni|altered\s*destin/i.test(name)) latch('altered'); } renaming = null; dirty = true; saveT = 0; }

/* --- the river (canvas) --- */
const TOP = 40, ROW = 46;
function getView() { const H = Math.max(G.H, 1); if (!G.view) return [0, H]; let [a, b] = G.view; if (G.follow && b < H) { a += H - b; b = H; } return [a, b]; }
function hatch(c) { if (hatch.p) return hatch.p; const k = document.createElement('canvas'); k.width = k.height = 8; const x = k.getContext('2d'); x.strokeStyle = 'rgba(140,146,148,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 8); x.lineTo(8, 0); x.stroke(); return hatch.p = c.createPattern(k, 'repeat'); }
function drawRiver() {
  const cv = $('cv'), W = cv.clientWidth, n = G.br.length, Hp = TOP + n * ROW + 6, dpr = window.devicePixelRatio || 1;
  if (!W) return;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hp * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(Hp * dpr); cv.style.height = Hp + 'px'; }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, Hp);
  const [v0, v1] = getView(), X = t => (t - v0) / (v1 - v0) * W, T = x => v0 + x / W * (v1 - v0), xH = Math.min(W, X(G.H)), xa = Math.max(0, X(0));
  c.font = '11px "Alegreya Sans", sans-serif'; c.textBaseline = 'middle';
  // seasons strip
  c.beginPath(); c.moveTo(xa, 20);
  for (let x = xa; x <= xH; x += 2) c.lineTo(x, 20 - 14 * climAt(Math.max(0, T(x)))[0]);
  c.lineTo(xH, 20); c.closePath(); c.fillStyle = 'rgba(207,166,80,.28)'; c.fill();
  c.fillStyle = '#8d9a9c'; c.fillText('seasons', 4, 9);
  // axis
  const span = v1 - v0, steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]; let step = steps.find(s => span / s <= W / 70) || 10000;
  c.strokeStyle = '#2a363d'; c.lineWidth = 1; c.textAlign = 'center';
  for (let t = Math.ceil(v0 / step) * step; t <= Math.min(v1, G.H); t += step) { const x = Math.round(X(t)) + .5; c.beginPath(); c.moveTo(x, 22); c.lineTo(x, Hp); c.stroke(); c.fillStyle = '#8d9a9c'; if (x > 20 && x < W - 20) c.fillText(t.toLocaleString('en-US'), x, 31); }
  c.textAlign = 'left';
  let maxPop = 20; for (const b of G.br) { const st = sim(b).at(G.H).st; maxPop = Math.max(maxPop, st.pop); }
  G.br.forEach((b, i) => {
    const s = sim(b), y = TOP + i * ROW, hue = HUES[b.hue], on = b.id === G.act;
    c.globalAlpha = on ? .2 : .1; c.fillStyle = hue; c.fillRect(xa, y + 3, xH - xa, ROW - 6); c.globalAlpha = 1;
    // population silhouette, famine underline, ash after a fall
    let dead = Infinity; const base = y + ROW - 4, hh = ROW - 12; c.beginPath(); c.moveTo(xa, base); let fam = [];
    for (let x = xa; x <= xH; x += 2) { const sg = s.segs[s.idx(Math.max(0, T(x)))], st = sg.st; if (st.dead) { dead = st.dead; c.lineTo(x, base); break; } c.lineTo(x, base - hh * Math.min(1, st.pop / maxPop)); if (sg.starving) fam.push(x); if (x + 2 > xH) c.lineTo(x, base); }
    c.closePath(); c.globalAlpha = on ? .75 : .4; c.fillStyle = hue; c.fill(); c.globalAlpha = 1;
    c.fillStyle = '#d0603f'; for (const x of fam) c.fillRect(x, base, 2, 2);
    if (dead <= G.H) { const xd = Math.max(xa, X(dead)); c.fillStyle = 'rgba(20,24,26,.6)'; c.fillRect(xd, y + 3, xH - xd, ROW - 6); c.fillStyle = hatch(c); c.fillRect(xd, y + 3, xH - xd, ROW - 6); }
    if (b.parent != null) { const pi = G.br.findIndex(p => p.id === b.parent), xf = X(b.forkT); if (pi >= 0) { c.fillStyle = 'rgba(15,21,24,.55)'; c.fillRect(xa, y + 3, Math.max(0, Math.min(xf, xH) - xa), ROW - 6); const py = TOP + pi * ROW + ROW / 2; c.strokeStyle = hue; c.lineWidth = 1.5; c.beginPath(); c.moveTo(xf, py); c.bezierCurveTo(xf + 14, py, xf - 2, y + ROW / 2, xf + 14, y + ROW / 2); c.stroke(); c.beginPath(); c.arc(xf, py, 3, 0, 7); c.fillStyle = hue; c.fill(); } }
    const done = new Map(); for (const r of s.recs) if (r.t <= G.H) done.set(r.id, r);
    for (const o of b.orders) { const x = X(o.t); if (x < -2 || x > xH + 1) continue; const r = done.get(o.id); c.fillStyle = !r ? '#8d9a9c' : r.s === 'void' ? '#d0603f' : '#e7e0cf'; c.fillRect(Math.round(x), y + 5, 1.5, r ? 7 : 4); }
    for (const f of s.feats) if (f.t <= G.H && ECHO[f.k]) { const x = X(f.t), m = y + 16; if (x < 0 || x > W) continue; c.beginPath(); c.moveTo(x, m - 5); c.lineTo(x + 4, m); c.lineTo(x, m + 5); c.lineTo(x - 4, m); c.closePath(); c.fillStyle = f.k === 'ruin' ? '#d0603f' : '#f0d898'; c.fill(); c.strokeStyle = '#0f1518'; c.lineWidth = 1; c.stroke(); }
    if (on) { c.strokeStyle = hue; c.lineWidth = 1; c.strokeRect(xa + .5, y + 3.5, Math.max(0, xH - xa - 1), ROW - 7); }
  });
  // trials already witnessed
  c.setLineDash([3, 4]); c.strokeStyle = '#d0603f'; c.fillStyle = '#d0603f';
  [...TRIALS, { t: FINAL_T, n: 'The Unmaking' }].forEach(tr => { if (tr.t > G.H) return; const x = Math.round(X(tr.t)) + .5; if (x < 0 || x > W) return; c.beginPath(); c.moveTo(x, 4); c.lineTo(x, Hp); c.stroke(); const w = c.measureText(tr.n).width; c.fillText(tr.n, x + w + 8 > W ? x - w - 5 : x + 5, 9); });
  c.setLineDash([]);
  // fog past the horizon, and the horizon itself
  if (xH < W) { c.fillStyle = hatch(c); c.globalAlpha = .5; c.fillRect(xH, 0, W - xH, Hp); c.globalAlpha = 1; }
  const g = c.createLinearGradient(xH - 26, 0, xH, 0); g.addColorStop(0, 'rgba(240,216,152,0)'); g.addColorStop(1, 'rgba(240,216,152,.4)'); c.fillStyle = g; c.fillRect(xH - 26, 22, 26, Hp - 22);
  c.fillStyle = '#f0d898'; c.fillRect(xH - 1.5, 22, 1.5, Hp - 22);
  // cursor
  const xc = Math.round(X(G.cur)); if (xc >= 0 && xc <= W) { c.fillStyle = '#e7e0cf'; c.fillRect(xc - .5, 22, 1, Hp - 22); c.beginPath(); c.moveTo(xc - 5, 22); c.lineTo(xc + 5, 22); c.lineTo(xc, 29); c.closePath(); c.fill(); }
}
function scrubTo(e) {
  const cv = $('cv'), r = cv.getBoundingClientRect(), [v0, v1] = getView(), x = e.clientX - r.left, t = v0 + x / r.width * (v1 - v0);
  if (t >= G.H - (v1 - v0) / r.width * 3) { G.follow = true; G.cur = G.H; } else { G.follow = false; G.cur = Math.max(0, Math.round(t)); }
  dirty = true;
}

/* --- panels --- */
function costHTML(c, v) { let h = ''; for (const r in c) h += '<span class="c' + (v[r] < c[r] - 1e-6 ? ' no' : '') + '" title="' + RN[r] + '"><i style="background:' + RC[r] + '"></i>' + fmt(c[r]).replace('.0', '') + '</span>'; return h; }
function renderLanes() {
  if (renaming != null) return;
  let h = '<div class="lhead">' + G.br.length + ' of ' + laneCap() + ' lanes</div>';
  for (const b of G.br) {
    const V = sim(b).at(G.cur), on = b.id === G.act, r = resonance(b);
    h += '<div class="lane' + (on ? ' on' : '') + '" data-a="sel" data-id="' + b.id + '" style="--h:' + HUES[b.hue] + '"><b>' + esc(b.name) + '</b><small>' +
      (V.st.dead ? 'fallen ' + yr(V.st.dead) : V.st.pop + ' people') + ' · ' + (r ? 'resonance +' + r.toFixed(2) : 'silent') + '</small><span class="lt">' +
      '<button data-a="ren" data-id="' + b.id + '" title="Rename this lane" aria-label="Rename">✎</button>' +
      (G.br.length > 1 ? '<button data-a="prune" data-id="' + b.id + '" title="Prune this lane" class="' + (pruneAsk === b.id ? 'ask' : '') + '">' + (pruneAsk === b.id ? 'prune?' : '✕') + '</button>' : '') + '</span></div>';
  }
  setHTML('lanes', h);
}
function renderState(b, V) {
  const st = V.st, d = V.d;
  let h = '<div class="civ"><h2>' + civName(b) + '</h2><p>' + esc(b.name) + ' lane · year ' + yr(G.cur) + ' · ' + era(st) + '</p></div>';
  if (st.dead) h += '<div class="fallen"><b>Fallen in year ' + yr(st.dead) + '</b>' + esc(st.by) + ' ended this lane. Nothing after that year can be ordered. Drag the cursor back before it and prepare, or fork an earlier year into a new lane.</div>';
  else {
    const g = V.seg.starving ? '<span class="bad">famine</span>' : st.pop >= d.housing ? 'housing is full' : st.grow < Infinity ? 'next birth in ' + Math.max(0, st.grow - G.cur).toFixed(0) + ' yr' : '';
    h += '<div class="people"><b>' + st.pop + '</b> people <span class="dim">of ' + d.housing + ' housed</span><span class="g">' + g + '</span></div>';
    if (V.clim < .995) h += '<div class="clim">Failing harvests. Farms yield ' + Math.round(V.clim * 100) + '%.</div>';
  }
  h += '<table class="res">';
  for (const r of SHOW) {
    if (r !== 'food' && r !== 'wood' && r !== 'mem' && r !== 'vein' && !(V.v[r] > 0.05) && !Math.abs(V.dv[r])) { if (!(st.b.mine && (r === 'ore'))) continue; }
    if (r === 'vein' && !st.b.mine) continue;
    const cap = d && d.cap[r], m = V.mode[r];
    let note = m === 'empty' ? (r === 'food' ? 'none left' : r === 'vein' ? 'exhausted' : 'used as it comes') : m === 'full' ? 'stores full' : (V.dv[r] < -0.005 && r !== 'vein' ? 'gone in ~' + Math.ceil(V.v[r] / -V.dv[r]) + ' yr' : '');
    if (r === 'vein' && !m && V.dv[r] < 0) note = '~' + fmt(V.v[r] / -V.dv[r]) + ' yr left';
    h += '<tr class="' + (m === 'empty' && r !== 'ore' && r !== 'metal' ? 'warn' : '') + '"><td><i style="background:' + RC[r] + '"></i>' + RN[r] + '</td><td class="num">' + fmt(V.v[r]) + (cap ? '<span class="dim"> / ' + fmt(cap) + '</span>' : '') + '</td><td class="num rate">' + fmtRate(V.dv[r]) + '</td><td class="note">' + note + '</td></tr>';
  }
  h += '</table>';
  setHTML('pState', h);
}
function renderJobs(V) {
  const st = V.st, d = V.d; if (st.dead) return setHTML('pJobs', '');
  let h = '<h3>Work <span class="dim">top of the list is staffed first</span></h3><table class="jobs">';
  st.prio.forEach((j, i) => {
    const sl = d.slots[j]; if (!sl && j !== 'woodcutter') return;
    const lim = st.lim[j];
    h += '<tr><td class="ud"><button data-a="up" data-x="' + j + '" title="Staff earlier" aria-label="Move up"' + (i ? '' : ' disabled') + '>▲</button><button data-a="dn" data-x="' + j + '" title="Staff later" aria-label="Move down"' + (i < st.prio.length - 1 ? '' : ' disabled') + '>▼</button></td>' +
      '<td><b>' + JN[j] + '</b><small>' + JD[j] + '</small></td><td class="num">' + V.w[j] + '<span class="dim"> / ' + sl + '</span></td>' +
      '<td class="lim"><button data-a="lim" data-x="' + j + '" data-d="-1" title="Allow one fewer" aria-label="Fewer">−</button><span title="Most this lane will put here">' + (lim == null ? 'all' : lim) + '</span><button data-a="lim" data-x="' + j + '" data-d="1" title="Allow one more" aria-label="More">+</button></td></tr>';
  });
  h += '<tr><td></td><td><b>' + JN.forager + '</b><small>' + JD.forager + '</small></td><td class="num">' + V.w.forager + '</td><td class="dim">everyone else</td></tr></table>';
  setHTML('pJobs', h);
}
function renderWorks(V) {
  const st = V.st; if (st.dead) return setHTML('pWorks', '<p class="dim">Ash does not take orders.</p>');
  let h = '<h3>Build <span class="dim">shift-click for five</span></h3><div class="grid">';
  for (const x in BLD) { const o = { k: 'b', x }; if (!reqOk(st, o, mods)) continue; const c = costOf(st, o, mods), ok = Object.keys(c).every(r => V.v[r] >= c[r] - 1e-6);
    h += '<button class="w' + (ok ? '' : ' short') + '" data-a="b" data-x="' + x + '" title="' + BLD[x].d + (ok ? '' : ' Not affordable yet: ordering it now queues it until the lane can pay.') + '"><b>' + BLD[x].n + '<span class="n">' + (st.b[x] || '') + '</span></b><span class="cost">' + costHTML(c, V.v) + '</span><small>' + BLD[x].d + '</small></button>'; }
  h += '</div>';
  let up = '', cr = '';
  for (const x in UPG) { const o = { k: 'u', x }, U = UPG[x]; if (isVoid(st, o) || !reqOk(st, o, mods)) continue; const c = costOf(st, o, mods), ok = Object.keys(c).every(r => V.v[r] >= c[r] - 1e-6);
    const s = '<button class="w wide' + (ok ? '' : ' short') + (U.creed ? ' creed' : '') + (U.reg ? ' reg' : '') + '" data-a="u" data-x="' + x + '"><b>' + U.n + '<span class="n">' + Math.round(U.t * V.d.research) + ' yr</span></b><span class="cost">' + costHTML(c, V.v) + '</span><small>' + U.d + '</small></button>';
    if (U.creed) cr += s; else up += s; }
  if (st.proj.length) { h += '<h3>Under way</h3>'; for (const p of st.proj) h += '<div class="proj"><span>' + UPG[p.x].n + '</span><span class="dim">' + Math.max(0, p.done - G.cur).toFixed(0) + ' yr</span><div><i style="width:' + (100 * Math.min(1, (G.cur - p.t0) / (p.done - p.t0))).toFixed(1) + '%"></i></div></div>'; }
  if (up) h += '<h3>Learn</h3><div class="grid one">' + up + '</div>';
  if (cr) h += '<h3>Swear a creed <span class="dim">one per lane</span></h3><div class="grid one">' + cr + '</div>';
  const known = Object.keys(st.up); if (known.length) h += '<h3>Known</h3><p class="tags">' + known.map(k => '<span>' + UPG[k].n + '</span>').join('') + '</p>';
  setHTML('pWorks', h);
}
function renderOrders(b) {
  const s = sim(b), done = new Map(); for (const r of s.recs) if (r.t <= G.H) done.set(r.id, r);
  const end = s.at(G.H).st.dead;
  let h = '<h3>Orders in this lane <span class="dim">' + b.orders.length + '</span></h3>';
  if (!b.orders.length) h += '<p class="dim">Nothing yet. Whatever you order is carried out at the cursor\'s year, and everything after it is recomputed.</p>';
  h += '<ol class="orders">'; let marked = false;
  const mark = () => { if (!marked) { marked = true; h += '<li class="now">cursor · year ' + yr(G.cur) + '</li>'; } };
  for (const o of b.orders) {
    if (o.t > G.cur) mark();
    const r = done.get(o.id); let s2, cls = '';
    if (!r) { cls = 'wait'; s2 = end && end <= G.H ? 'lost with the lane' : 'waiting'; }
    else if (r.s === 'void') { cls = 'void'; s2 = 'void'; }
    else { s2 = r.t - o.t > .5 ? 'done ' + yr(r.t) : '✓'; if (r.done && r.done > G.H) s2 = 'begun'; }
    h += '<li class="' + cls + '" data-a="goto" data-t="' + o.t + '"><span class="y">' + yr(o.t) + '</span><span class="what">' + describe(o) + '</span><span class="s">' + s2 + '</span><button data-a="del" data-id="' + o.id + '" title="Remove this order" aria-label="Remove">✕</button></li>';
  }
  mark(); h += '</ol>';
  setHTML('pOrders', h);
}
function renderLog(b) {
  const s = sim(b), L = []; for (let i = s.log.length - 1; i >= 0 && L.length < 9; i--) if (s.log[i].t <= G.cur) L.push(s.log[i]);
  let h = '<h3>Chronicle</h3>'; if (!L.length) h += '<p class="dim">Year ' + yr(G.cur) + '. Nothing worth a line yet.</p>';
  h += '<ul class="log">' + L.map(e => '<li class="' + (e.c || '') + '"><span class="y">' + yr(e.t) + '</span>' + e.x + '</li>').join('') + '</ul>';
  setHTML('pLog', h);
}
function hint(b, V) {
  const s = sim(b), st = V.st, endSt = s.at(G.H).st;
  if (endSt.dead && endSt.dead <= G.H && G.cur >= endSt.dead) return 'This lane has fallen. Drag the cursor back to a year before it fell and change what led here. The past is not locked.';
  if (V.seg.starving) return 'Famine. Scrub back to before it began: more farms, a granary filled in the good years, or fewer huts.';
  if (!b.orders.length) return 'You are riding the horizon, the latest year the Archive can see. Two woodcutters are stacking timber. Order a Hut and a Farm.';
  if (st.pend.length && !G.follow) return 'An order here is waiting for resources. It will be carried out the moment this lane can pay.';
  if (!G.follow) return 'You are in this lane\'s past. Any order placed here rewrites everything after year ' + yr(G.cur) + '. Press End to ride the horizon again.';
  if (G.br.length === 1 && G.H > 150) return 'Fork here copies this lane up to the cursor into a second lane. Lanes run side by side and share every Echo.';
  if (st.b.script + st.b.shrine === 0 && st.pop >= 8) return 'A Scriptorium makes lore and a Shrine makes awe. Both lead to things the Archive would like to record.';
  return '';
}
function renderAll() {
  const b = act(), V = sim(b).at(G.cur), sp = speed();
  setHTML('hz', 'Horizon <b>year ' + yr(G.H) + '</b><span>+' + sp.toFixed(sp < 10 ? 2 : 1) + ' yr/s</span>');
  setHTML('nEcho', String(Object.keys(G.echo).length));
  setHTML('curY', 'Year <b>' + yr(G.cur) + '</b>' + (G.follow ? '<span>riding the horizon</span>' : '<span>' + yr(G.H - G.cur) + ' yr before the horizon</span>'));
  $('bFollow').classList.toggle('on', G.follow);
  $('bFit').hidden = !G.view;
  setHTML('hint', hint(b, V));
  renderLanes(); renderState(b, V); renderJobs(V); renderWorks(V); renderOrders(b); renderLog(b);
}

/* --- archive, intro, ending --- */
function openModal(h) { $('mBody').innerHTML = h; $('modal').hidden = false; }
function closeModal() { $('modal').hidden = true; if (G.intro) { G.intro = false; save(); } }
function archiveHTML() {
  const sp = echoSpeed(); let res = 0; const rows = G.br.map(b => { const r = resonance(b); res += r; return '<li class="sub"><span><i style="background:' + HUES[b.hue] + '"></i>' + esc(b.name) + '</span><span>+' + r.toFixed(2) + '</span></li>'; }).join('');
  let h = '<h2>The Archive</h2><p class="lede">It stands at the end of time, so it is finished with time. What a lane does once, in any year the horizon has passed, is recorded here for good, even if you later rewrite that lane or prune it.</p>';
  h += '<div class="cols"><div><h3>How fast the horizon recedes</h3><ul class="sum"><li>One year each second<span>1.00</span></li><li>Echoes<span>×' + (1 + sp).toFixed(2) + '</span></li><li>Resonance of living lanes<span>×' + (1 + res).toFixed(2) + '</span></li>' + rows + '<li class="tot">Now<span>' + speed().toFixed(2) + ' yr/s</span></li></ul><p class="dim">A lane resonates with the Memory it holds at the horizon. Memory comes from people living, and from lore and awe left unspent. Fallen lanes are silent.</p></div><div><h3>Trials witnessed</h3>';
  const seen = TRIALS.filter(T => G.H >= T.t - 45);
  if (!seen.length) h += '<p class="dim">None yet. The horizon has not reached one.</p>';
  for (const T of seen) h += '<div class="trial"><b>' + T.n + ' · year ' + T.t + '</b>' + (G.H < T.t ? '<p class="dim">Something is coming.</p>' : '<p>A lane must hold one of: ' + Object.keys(T.ans).map(k => fmt(T.ans[k].need) + ' ' + RN[T.ans[k].r].toLowerCase()).join(', ') + '. It pays that and lives. A sworn lane tries its own creed\'s answer first.</p>') + '</div>';
  if (G.H >= FINAL_T - 60) h += '<div class="trial"><b>The Unmaking · year ' + FINAL_T + '</b><p>' + (G.H < FINAL_T ? 'Something is coming, and it is the last thing.' : 'It asks for three regalia in one lane: the Sword, the Bell and the Lens. No single creed can make all three. One lane can make its own and Recall the others, once other lanes have made them.') + '</p></div>';
  h += '</div></div><h3>Echoes <span class="dim">' + Object.keys(G.echo).length + ' recorded</span></h3><div class="echoes">';
  const gate = e => e.after === undefined || (e.after === 'w' ? G.H > 300 : e.after === 2 ? G.H >= FINAL_T : G.H >= TRIALS[e.after].t);
  for (const k in ECHO) { const e = ECHO[k];
    if (G.echo[k]) h += '<div class="echo got"><b>' + e.n + '</b><p>' + e.fx + '</p><small>horizon year ' + yr(G.echo[k]) + '</small></div>';
    else if (!e.secret && gate(e)) h += '<div class="echo"><b>Unrecorded</b><p>' + e.how + '</p></div>'; }
  h += '</div><p class="dim">Some echoes leave no outline until they are found.</p>';
  h += '<h3>Save</h3><p class="dim">The game saves in this browser. Copy the save text to keep a backup or move it elsewhere.</p><div class="saverow"><button data-a="copy">Copy save text</button><input id="saveIn" placeholder="Paste save text here" aria-label="Save text to load"><button data-a="loadsave">Load</button><button data-a="reset" class="danger">Start over</button></div>';
  return h;
}
function introHTML() {
  return '<h2>Errata at the End of Time</h2><div class="story"><p>Everything has already happened. You keep the Archive at the far end of it, where the last light is filed.</p><p>One small people, four of them, start beside a river in year 0. Their history is short and ends badly. You are permitted to make corrections.</p><p>The <b>horizon</b> is the latest year you can see. It recedes on its own, about a year each second, whether you watch or not. Drag along the river to visit any year behind it. Whatever you order there happens in that year, and every later year is rewritten at once.</p><p>When one history is not enough, <b>fork</b> it. Lanes run side by side. What any lane achieves is recorded as an <b>Echo</b>, and Echoes change every lane.</p></div><button data-a="close" class="primary">Open the Archive</button>';
}
function endingHTML() {
  const mins = Math.round((Date.now() - G.born) / 60000), w = G.br.find(b => sim(b).at(G.H).st.tr[2]);
  return '<h2>The Morning After the End</h2><div class="story"><p>In year ' + FINAL_T + ' of the ' + esc(w ? w.name : 'last') + ' lane, the Unmaking arrived on schedule and found three things waiting that could not all have been made in one history.</p><p>It was shown its own face. It rang backward. It broke on an edge. Then it was morning, which the Archive has no shelf for.</p><p>' + (w ? civName(w) : 'They') + ' will never know there was an Archivist. They left you a line anyway, carved where the horizon would reach it: <i>to whoever kept correcting us, thank you for not stopping at the first draft.</i></p>' +
    '<p class="dim">Lanes kept: ' + G.br.map(b => esc(b.name)).join(', ') + '.' + (G.pruned.length ? ' Lanes pruned, and remembered here anyway: ' + G.pruned.map(esc).join(', ') + '.' : ' No lane was pruned.') + ' ' + Object.keys(G.echo).length + ' echoes, ' + mins + ' minutes of your own time.</p><p>The horizon keeps receding. The lanes are still yours.</p></div><button data-a="close" class="primary">Keep reading</button>';
}

/* --- input --- */
function eventTimes(b) { const s = sim(b), a = new Set([0]); for (const r of s.recs) a.add(r.t); for (const o of b.orders) a.add(o.t); for (const l of s.log) a.add(l.t); for (const f of s.feats) a.add(f.t); return [...a].filter(t => t <= G.H).sort((x, y) => x - y); }
function jump(dir) { const ts = eventTimes(act()); let t = dir > 0 ? ts.find(x => x > G.cur + 1e-6) : [...ts].reverse().find(x => x < G.cur - 1e-6); if (t === undefined) { if (dir > 0) { G.follow = true; G.cur = G.H; } } else { G.cur = t; G.follow = false; } dirty = true; }
function nudge(d) { G.cur = Math.max(0, Math.min(G.H, (d > 0 ? Math.floor(G.cur) : Math.ceil(G.cur)) + d)); G.follow = G.cur >= G.H; dirty = true; }
function shake() {
  G.shakes++; G.H += 300; latch('shaken'); checkEchoes(); dirty = true;
  const q = ['Three centuries fall through at once.', 'Again? The sand does not mind.', 'The Archive pretends not to notice.', 'You could also just wait. You know that.', 'At this point it is less an hourglass than a maraca.'];
  toast('<b>You shook the hourglass</b><small>' + q[Math.min(q.length - 1, G.shakes - 1)] + '</small>');
}
function onClick(e) {
  const el = e.target.closest('[data-a]'); if (!el) return; const a = el.dataset.a, x = el.dataset.x, b = act();
  if (a !== 'prune') pruneAsk = null;
  if (a === 'b') { const n = e.shiftKey ? 5 : 1; for (let i = 0; i < n; i++) place({ k: 'b', x }); }
  else if (a === 'u') place({ k: 'u', x });
  else if (a === 'lim') { const V = sim(b).at(G.cur), sl = V.d.slots[x], cur = V.st.lim[x] == null ? sl : Math.min(sl, V.st.lim[x]); let n = Math.max(0, cur + (+el.dataset.d)); place({ k: 'l', x, n: n >= sl ? null : n }); }
  else if (a === 'up' || a === 'dn') { const list = sim(b).at(G.cur).st.prio.slice(), i = list.indexOf(x), j = i + (a === 'up' ? -1 : 1); if (j < 0 || j >= list.length) return;[list[i], list[j]] = [list[j], list[i]]; place({ k: 'p', list }); }
  else if (a === 'del') { e.stopPropagation(); const id = +el.dataset.id, o = b.orders.find(o => o.id === id); if (o) edit(b, o.t, arr => arr.splice(arr.indexOf(o), 1)); }
  else if (a === 'goto') { G.cur = Math.min(G.H, +el.dataset.t); G.follow = false; }
  else if (a === 'sel') { G.act = +el.dataset.id; }
  else if (a === 'ren') { e.stopPropagation(); const id = +el.dataset.id, row = el.closest('.lane'), bb = lane(id); renaming = id; row.innerHTML = '<input id="renIn" maxlength="24" aria-label="Lane name" value="' + esc(bb.name) + '">'; cache.lanes = null; const inp = $('renIn'); inp.focus(); inp.select(); inp.onkeydown = ev => { ev.stopPropagation(); if (ev.key === 'Enter') rename(id, inp.value); if (ev.key === 'Escape') { renaming = null; dirty = true; } }; inp.onblur = () => { if (renaming === id) rename(id, inp.value); }; inp.onclick = ev => ev.stopPropagation(); return; }
  else if (a === 'prune') { e.stopPropagation(); const id = +el.dataset.id; if (pruneAsk === id) { pruneAsk = null; prune(id); } else pruneAsk = id; }
  else if (a === 'fork') fork();
  else if (a === 'unravel') { const t = G.cur; if (b.orders.some(o => o.t > t)) edit(b, t, arr => { for (let i = arr.length - 1; i >= 0; i--) if (arr[i].t > t) arr.splice(i, 1); }); }
  else if (a === 'undo') undo();
  else if (a === 'follow') { G.follow = !G.follow; if (G.follow) G.cur = G.H; else G.cur = Math.floor(G.cur); }
  else if (a === 'fit') G.view = null;
  else if (a === 'prev') jump(-1); else if (a === 'next') jump(1);
  else if (a === 'back') nudge(-1); else if (a === 'fwd') nudge(1);
  else if (a === 'archive') openModal(archiveHTML());
  else if (a === 'close') closeModal();
  else if (a === 'copy') { const t = JSON.stringify(G); const done = () => { el.textContent = 'Copied'; }; try { navigator.clipboard.writeText(t).then(done, () => { $('saveIn').value = t; $('saveIn').select(); }); } catch (err) { $('saveIn').value = t; $('saveIn').select(); } }
  else if (a === 'loadsave') { if (load($('saveIn').value.trim())) { G.last = Date.now(); undoStack = []; rebuild(); checkEchoes(); closeModal(); toast('<b>Save loaded</b>'); } else toast('<b>That text is not a save</b><small>Paste the whole thing, from the first brace to the last.</small>'); }
  else if (a === 'reset') { if (el.dataset.sure) { newGame(); undoStack = []; rebuild(); save(); openModal(introHTML()); } else { el.dataset.sure = 1; el.textContent = 'Erase everything?'; } }
  else if (a === 'glass') { const now = Date.now(); clicks = clicks.filter(t => now - t < 2500); clicks.push(now); el.classList.remove('tilt'); void el.offsetWidth; el.classList.add('tilt'); if (clicks.length >= 7) { clicks = []; shake(); } }
  dirty = true;
}
function onKey(e) {
  if (e.target.tagName === 'INPUT' || e.metaKey || e.altKey) return;
  if (!$('modal').hidden) { if (e.key === 'Escape') closeModal(); return; }
  const k = e.key;
  if (k === 'ArrowLeft') nudge(e.shiftKey ? -10 : -1); else if (k === 'ArrowRight') nudge(e.shiftKey ? 10 : 1);
  else if (k === 'Home') { G.cur = 0; G.follow = false; } else if (k === 'End') { G.follow = true; G.cur = G.H; }
  else if (k === ',' || k === '<') jump(-1); else if (k === '.' || k === '>') jump(1);
  else if ((k === 'z' || k === 'Z') && e.ctrlKey) undo(); else if (k === 'f' && !e.ctrlKey) fork();
  else if (k >= '1' && k <= '9' && G.br[+k - 1]) G.act = G.br[+k - 1].id;
  else return;
  e.preventDefault(); dirty = true;
}
function frame() {
  const now = Date.now(), dt = Math.max(0, (now - G.last) / 1000); G.last = now;
  advance(dt); if (G.follow) G.cur = G.H; if (G.cur > G.H) G.cur = G.H;
  if (!lane(G.act)) G.act = G.br[0].id;
  drawRiver();
  if (dirty || now - panelT > 200) { renderAll(); panelT = now; dirty = false; }
  if (now - saveT > 8000) { save(); saveT = now; }
  requestAnimationFrame(frame);
}
function start(hot) {
  let raw = null; try { raw = localStorage.getItem(KEY); } catch (e) { }
  if (!(hot && load(hot)) && !load(raw)) newGame();
  rebuild();
  const away = (Date.now() - G.last) / 1000, H0 = G.H;
  if (away > 0) { advance(away); G.last = Date.now(); if (away > 60 && !G.intro) toast('<b>While you were away</b><small>' + yr(G.H - H0) + ' years went by at the horizon.</small>'); }
  checkEchoes();
  document.addEventListener('click', onClick); document.addEventListener('keydown', onKey);
  const cv = $('cv'); let drag = false;
  cv.addEventListener('pointerdown', e => { drag = true; cv.setPointerCapture(e.pointerId); const r = cv.getBoundingClientRect(), i = Math.floor((e.clientY - r.top - TOP) / ROW); if (G.br[i]) G.act = G.br[i].id; scrubTo(e); });
  cv.addEventListener('pointermove', e => { if (drag) scrubTo(e); });
  cv.addEventListener('pointerup', () => { drag = false; }); cv.addEventListener('pointercancel', () => { drag = false; });
  cv.addEventListener('dblclick', () => { G.view = null; });
  cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(), [v0, v1] = getView(), tm = v0 + (e.clientX - r.left) / r.width * (v1 - v0), f = Math.exp(e.deltaY * 0.0015); let a = tm - (tm - v0) * f, b = tm + (v1 - tm) * f; if (b - a < 20) { const m = (a + b) / 2; a = m - 10; b = m + 10; } a = Math.max(0, a); b = Math.min(G.H, b); G.view = (a <= 0 && b >= G.H) ? null : [a, b]; }, { passive: false });
  window.addEventListener('beforeunload', save); document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => JSON.parse(JSON.stringify(G)));
  if (G.intro) openModal(introHTML());
  window.errata = { state: () => G, sims, skip: y => { G.H += y; checkEchoes(); dirty = true; } };
  requestAnimationFrame(frame);
}
