/* ===== Game layer: save, lanes, the Archive, rendering ===== */
const $ = id => document.getElementById(id);
const KEY = 'palimpsest-eot-save-2';
const HUES = ['#cfa650', '#62b0a3', '#d0603f', '#8fa3d6', '#a9bf6a'];
const LANES = ['Amber', 'Verdigris', 'Cinder', 'Salt', 'Lantern', 'Thistle', 'Marrow', 'Quill', 'Halcyon', 'Umber', 'Sable', 'Brine', 'Tallow', 'Rime'];
const RN = { food: 'Food', wood: 'Timber', vein: 'Ore veins', ore: 'Ore', metal: 'Bronze', arms: 'Arms', lore: 'Lore', awe: 'Awe', mem: 'Memory' };
const RC = { food: '#a9bf6a', wood: '#b08968', vein: '#6f7b80', ore: '#9aa6ab', metal: '#cfa650', arms: '#d0603f', lore: '#8fa3d6', awe: '#c48bb8', mem: '#e7e0cf' };
const SHOW = ['food', 'wood', 'lore', 'awe', 'vein', 'ore', 'metal', 'arms', 'mem'];
const JN = { farmer: 'Farmers', woodcutter: 'Woodcutters', miner: 'Miners', smith: 'Smiths', armorer: 'Armorers', scholar: 'Scholars', priest: 'Priests', forager: 'Foragers' };
const JD = { farmer: 'food, by the climate', woodcutter: 'timber', miner: 'veins into ore', smith: 'ore into bronze', armorer: 'bronze into arms', scholar: 'lore', priest: 'awe', forager: 'a little food, whatever the weather' };
const RK = { sword: 'Sword', bell: 'Bell', lens: 'Lens' };
const mul = (k, f) => m => { m[k] *= f; };
const ENTRY = {
  hearth: { n: 'First Hearth', how: 'A lane holds 8 people.', fx: 'The horizon recedes 50% faster.', sp: .5 },
  second: { n: 'A Second Fire', how: 'A lane settles a second site.', fx: 'The horizon recedes 20% faster.', sp: .2 },
  stored: { n: 'Stored Summers', how: 'A lane of 12 or more comes through the Long Winter with no famine dead.', fx: 'Food storage ×2 in every lane.', sp: .1, m: mul('foodCap', 2), gate: () => G.H > 260 },
  hunger: { n: "Hunger's Lesson", how: 'A lane loses three people to famine.', fx: 'Foragers ×1.5 in every lane.', sp: .1, m: mul('forage', 1.5) },
  bronze: { n: 'Bronze Dawn', how: 'A lane holds 40 bronze.', fx: 'Miners and smiths ×1.25 in every lane.', sp: .1, m: m => { m.mine *= 1.25; m.smith *= 1.25; } },
  letters: { n: 'The First Letters', how: 'A lane holds 60 lore.', fx: 'Research takes 30% less time.', sp: .1, m: mul('research', .7) },
  sky: { n: 'Something in the Sky', how: 'A lane holds 60 awe.', fx: 'Every people grows 30% faster.', sp: .1, m: mul('growth', 1.3) },
  host: { n: 'Shieldwall', how: 'A lane stops the Ashen Host somewhere, behind a palisade or in the field.', fx: 'Horizon +20%.', sp: .2, gate: () => G.H >= 700 },
  plague: { n: 'Not One Window Dark', how: 'A lane comes through the Glass Plague without losing a single site.', fx: 'Horizon +20%.', sp: .2, gate: () => G.H >= 1500 },
  hint_terrace: { n: 'The Old Terraces', secret: 1, fx: 'Terracing can now be researched, in any lane. Horizon +5%.', sp: .05 },
  hint_mill: { n: 'The Cracked Millstone', secret: 1, fx: 'The Great Wheel can now be researched, in any lane. Horizon +5%.', sp: .05 },
  hint_lib: { n: 'The Empty Shelves', secret: 1, fx: 'Shelving the World can now be researched, in any lane. Horizon +5%.', sp: .05 },
  hint_temple: { n: 'The Roofless Nave', secret: 1, fx: 'The Long Liturgy can now be researched, in any lane. Horizon +5%.', sp: .05 },
  hint_foundry: { n: 'The Casting Pit', secret: 1, fx: 'Casting in the Round can now be researched, in any lane. Horizon +5%.', sp: .05 },
  bleed: { n: 'Bleed-through', how: 'One lane wakes knowing what another lane worked out.', fx: 'The horizon recedes 20% faster.', sp: .2 },
  pit: { n: 'A Warning in the Margin', how: 'A lane settles somewhere it should not have.', fx: 'The place is marked on every map, and what killed them can be studied: Quarantine can now be researched. Horizon +10%.', sp: .1 },
  carto: { n: 'The Whole Valley', how: 'Every site has been lived in by some lane, at some time.', fx: 'Everything costs 10% less. Horizon +30%.', sp: .3, m: mul('cost', .9) },
  found_sword: { n: 'Where the Sword Lies', how: 'A lane settles the site of a relic.', fx: 'Horizon +10%. The first relic found opens one more lane.', sp: .1, rel: 1 },
  found_bell: { n: 'Where the Bell Lies', how: 'A lane settles the site of a relic.', fx: 'Horizon +10%. The first relic found opens one more lane.', sp: .1, rel: 1 },
  found_lens: { n: 'Where the Lens Lies', how: 'A lane settles the site of a relic.', fx: 'Horizon +10%. The first relic found opens one more lane.', sp: .1, rel: 1 },
  woke: { n: 'What Sleeps Under the Hill', how: 'A lane digs where the vein is too rich.', fx: 'One more lane. Horizon +20%.', sp: .2, gate: () => Object.keys(G.known).some(s => MAP.sites[s].feat === 'deep') },
  raised_sword: { n: 'The Unbroken Sword', how: 'A lane finishes the relic it found.', fx: 'Horizon +25%. The first relic raised opens one more lane.', sp: .25, gate: () => G.echo.found_sword },
  raised_bell: { n: 'The Bell That Rings Backward', how: 'A lane finishes the relic it found.', fx: 'Horizon +25%. The first relic raised opens one more lane.', sp: .25, gate: () => G.echo.found_bell },
  raised_lens: { n: 'The Lens of Last Light', how: 'A lane finishes the relic it found.', fx: 'Horizon +25%. The first relic raised opens one more lane.', sp: .25, gate: () => G.echo.found_lens },
  shadow: { n: 'A Shadow Answered', how: 'A lane pays what another lane\'s relic asks of it.', fx: 'Horizon +15%.', sp: .15, gate: () => G.echo.raised_sword || G.echo.raised_bell || G.echo.raised_lens },
  ruin: { n: 'Witness to Ruin', how: 'Watch a lane end.', fx: 'Horizon +20%. Ruin is also a record.', sp: .2, gate: () => G.H >= FINAL_T - 60 },
  dawn: { n: 'The Morning After the End', how: 'Bring a lane through the Unwriting.', fx: 'The horizon recedes twice as fast, into whatever comes next.', sp: 2, gate: () => G.H >= FINAL_T },
  redacted: { n: 'Someone Else Is Editing', secret: 1, fx: 'A line was struck out, and not by you. The Archive now shows where the other hand is looking.', sp: .1 },
  whole: { n: 'The Whole Hand', secret: 1, fx: 'One lane raised all three relics by itself. That was not supposed to be possible. Horizon +50%.', sp: .5 },
  errata: { n: 'Errata', secret: 1, fx: 'A lane named for the first draft. Horizon +5%.', sp: .05 },
  shaken: { n: 'The Shaken Hourglass', secret: 1, fx: 'It still works. It still should not.', sp: 0 }
};
let G, world, mods, dirty = true, undoStack = [], saveT = 0, panelT = 0, clicks = [], renaming = null, pruneAsk = null, cache = {};

/* --- helpers --- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const yr = t => Math.floor(t + 1e-6).toLocaleString('en-US');
function fmt(x) { const a = Math.abs(x); if (a >= 1e6) return (x / 1e6).toFixed(2) + 'M'; if (a >= 1e4) return (x / 1e3).toFixed(1) + 'k'; if (a >= 100) return Math.round(x).toLocaleString('en-US'); if (a >= 10) return x.toFixed(0); return x.toFixed(1); }
function fmtRate(x) { if (Math.abs(x) < 0.005) return ''; return (x > 0 ? '+' : '−') + (Math.abs(x) < 10 ? Math.abs(x).toFixed(2) : fmt(Math.abs(x))); }
const lane = id => G.br.find(b => b.id === id);
const act = () => lane(G.act) || G.br[0];
const sim = b => world.sims.get(b.id);
const sname = s => MAP.sites[s].name;
function civName(b) { const A = ['Vael', 'Oru', 'Ish', 'Tam', 'Kel', 'Sur', 'Ane', 'Dho', 'Myr', 'Eth', 'Ull', 'Pera'], B = ['in', 'ar', 'eth', 'uun', 'ai', 'os', 'im']; return 'The ' + A[(b.id * 7 + G.seed) % A.length] + B[(b.id * 5 + 1) % B.length]; }
function era(st) { if (st.dead) return st.by === 'The Ashen Host' ? 'Ash' : st.by === 'The Glass Plague' ? 'Glass' : 'Unwritten'; if (st.won) return 'The Morning'; const n = Object.keys(st.own).length; if (Object.keys(st.rel).length) return 'Age of Relics'; if (n >= 6) return 'Age of Roads'; if (st.b.forge) return 'Age of Bronze'; if (n > 1) return 'Age of Settlers'; if (st.b.farm) return 'Age of Furrows'; return 'Age of Hearths'; }
function toast(h, cls) { const d = document.createElement('div'); d.className = 'toast ' + (cls || ''); d.innerHTML = h; const box = $('toasts'); box.appendChild(d); while (box.children.length > 4) box.firstChild.remove(); setTimeout(() => d.remove(), 7500); }
function discovery(h) { const d = document.createElement('div'); d.className = 'disc'; d.innerHTML = h + '<button data-a="dismiss">Noted</button>'; $('discs').appendChild(d); }
function setHTML(id, h) { if (cache[id] !== h) { cache[id] = h; $(id).innerHTML = h; } }
const visible = s => s === 0 || G.known[s] || MAP.sites[s].adj.some(e => G.known[e.to]);

/* --- save --- */
function modsOf() { const m = { E: G.echo, forage: 1, farm: 1, wood: 1, mine: 1, smith: 1, foodCap: 1, growth: 1, startPop: 0, housing: 0, research: 1, cost: 1, red: G.red }; for (const k in G.echo) if (ENTRY[k] && ENTRY[k].m) ENTRY[k].m(m); return m; }
function laneCap() { const E = G.echo; return 2 + (E.found_sword || E.found_bell || E.found_lens ? 1 : 0) + (E.raised_sword || E.raised_bell || E.raised_lens ? 1 : 0) + (E.woke ? 1 : 0); }
function newGame() {
  G = { v: 3, seed: 1 + Math.floor(Math.random() * 1e9), H: 25, last: Date.now(), born: Date.now(), echo: {}, known: { 0: 1 }, rumor: {}, red: [], br: [], act: 0, sel: 0, cur: 25, follow: true, pruned: [], seq: 1, shakes: 0, won: false, nl: 0, intro: true, view: null };
  MAP = makeMap(G.seed); addLane(null, 0, []);
}
function addLane(parent, forkT, orders) { const id = G.seq++, k = G.nl++; const b = { id, name: LANES[k % LANES.length] + (k >= LANES.length ? ' ' + (1 + Math.floor(k / LANES.length)) : ''), hue: k % HUES.length, parent, forkT, orders }; G.br.push(b); G.act = id; return b; }
function rebuild() { mods = modsOf(); world = new World(mods); for (const b of G.br) world.add(b.id, b.orders); world.ensure(G.H); dirty = true; }
function save() { G.last = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) { } }
function load(raw) { try { const o = typeof raw === 'string' ? JSON.parse(raw) : raw; if (o && o.v === 3 && o.seed && Array.isArray(o.br) && o.br.length) { G = o; G.rumor = G.rumor || {}; MAP = makeMap(G.seed); return true; } } catch (e) { } return false; }

/* --- time, the Archive, and the other hand --- */
function resonance(b) { const V = sim(b).at(G.H); return V.st.dead ? 0 : 0.25 * Math.log2(1 + V.v.mem / 200); }
function echoSpeed() { let s = 0; for (const k in G.echo) if (ENTRY[k]) s += ENTRY[k].sp; return s; }
function speed() { let r = 0; for (const b of G.br) r += resonance(b); return (1 + echoSpeed()) * (1 + r); }
function eye() { /* the most built-up site across every lane at the horizon; never home, never a relic site */
  let best = -1, bv = 0;
  for (const S of MAP.sites) { if (!S.id || (S.feat && S.feat.startsWith('relic')) || G.red.some(r => r.s === S.id)) continue; let n = 0; for (const b of G.br) { const sb = sim(b).at(G.H).st.sb[S.id]; if (sb) for (const k in sb) n += sb[k]; } if (n > bv) { bv = n; best = S.id; } }
  return best;
}
function latch(k, t) {
  if (G.echo[k] || !ENTRY[k]) return false; G.echo[k] = Math.round(G.H);
  const DISC = { hint_terrace: 'terracing', hint_mill: 'milling', hint_lib: 'archives', hint_temple: 'liturgy', hint_foundry: 'casting', pit: 'quar' }[k];
  if (DISC) { const S = MAP.sites.find(x => x.feat === k); discovery('<b>Discovery at ' + S.name + '</b><p>' + FEAT[k] + '</p><p class="un">New research in every lane: <b>' + UPG[DISC].n + '</b>. ' + UPG[DISC].d + '</p>'); }
  else toast('<b>The Archive records</b><span>' + ENTRY[k].n + '</span><small>' + ENTRY[k].fx + '</small>', 'echo');
  if (k.startsWith('raised_')) { const s = eye(); if (s >= 0) { G.red.push({ s, t: Math.round(t) + BLEED }); G.red.sort((a, b) => a.t - b.t); const first = !G.echo.redacted; latch('redacted'); toast('<b>' + (first ? 'A line has been struck out. Not by you.' : 'The other hand strikes again') + '</b><span>' + sname(s) + '</span><small>From year ' + yr(Math.round(t) + BLEED) + ', in every lane, its posts yield nothing.</small>', 'red'); } }
  return true;
}
function checkEchoes() {
  for (let pass = 0; pass < 8; pass++) {
    let got = false; world.ensure(G.H);
    for (const b of G.br) for (const f of sim(b).feats) { if (f.t > G.H) continue; if (f.k.startsWith('own:')) { const s = +f.k.slice(4); if (!G.known[s]) { G.known[s] = 1; dirty = true; } } else if (f.k.startsWith('rum:')) { const s = +f.k.slice(4); if (!G.rumor[s]) { G.rumor[s] = 1; dirty = true; } } else if (latch(f.k, f.t)) got = true; }
    if (MAP.sites.every(S => S.shore || G.known[S.id]) && latch('carto')) got = true;
    if (!got) break;
    rebuild(); // what the Archive records changes every lane, from year 0
  }
  if (G.echo.dawn && !G.won) { G.won = true; openModal(endingHTML()); }
}
function advance(dt) { const n = Math.min(4000, Math.max(1, Math.ceil(dt / 2))), h = dt / n; for (let i = 0; i < n; i++) { G.H += speed() * h; checkEchoes(); } }

/* --- editing a lane's orders --- */
function edit(b, t, fn) {
  undoStack.push({ id: b.id, orders: JSON.stringify(b.orders) }); if (undoStack.length > 80) undoStack.shift();
  fn(b.orders); world.edit(b.id, t); checkEchoes(); dirty = true; saveT = 0;
}
function insert(arr, o) { const i = arr.findIndex(x => x.t > o.t); if (i < 0) arr.push(o); else arr.splice(i, 0, o); }
function place(o) {
  const b = act(), t = G.cur; o.t = t; o.id = G.seq++;
  edit(b, t, arr => { if (o.k === 'l' || o.k === 'p') { const i = arr.findIndex(x => x.t === t && x.k === o.k && (o.k === 'p' || x.x === o.x)); if (i >= 0) arr.splice(i, 1); } insert(arr, o); });
}
function undo() { const u = undoStack.pop(); if (!u) return; const b = lane(u.id); if (!b) return; b.orders = JSON.parse(u.orders); sim(b).orders = b.orders; world.edit(b.id, 0); checkEchoes(); dirty = true; }
function describe(o) {
  if (o.k === 'b') return BLD[o.x].n + ' at ' + sname(o.s);
  if (o.k === 'd') return 'Raze a ' + BLD[o.x].n + ' at ' + sname(o.s);
  if (o.k === 'u') return UPG[o.x].n;
  if (o.k === 's') return 'Settle ' + sname(o.s);
  if (o.k === 'r') return RELIC[MAP.sites[o.s].feat.slice(6)].verb + ' ' + RELIC[MAP.sites[o.s].feat.slice(6)].n;
  if (o.k === 'l') return JN[o.x] + ': ' + (o.n == null ? 'fill every post' : 'at most ' + o.n);
  return 'Staff first: ' + o.list.slice(0, 3).map(j => JN[j].toLowerCase()).join(', ') + '…';
}

/* --- lanes --- */
function fork() {
  if (G.br.length >= laneCap()) return toast('<b>No shelf for another lane</b><small>Finding a relic opens one. So does finishing one.</small>');
  const p = act(), t = G.cur, orders = p.orders.filter(o => o.t <= t).map(o => ({ ...o, id: G.seq++ }));
  const b = addLane(p.id, t, orders); world.add(b.id, b.orders); checkEchoes(); dirty = true; saveT = 0;
  toast('<b>' + esc(b.name) + '</b><small>Forked from ' + esc(p.name) + ' at year ' + yr(t) + '. Everything before that came with it.</small>');
}
function prune(id) {
  if (G.br.length < 2) return; const b = lane(id); G.pruned.push(b.name);
  G.br = G.br.filter(x => x !== b); world.remove(id); for (const c of G.br) if (c.parent === id) c.parent = null;
  if (G.act === id) G.act = G.br[0].id; undoStack = undoStack.filter(u => u.id !== id); checkEchoes(); dirty = true; saveT = 0;
}
function rename(id, name) { const b = lane(id); name = name.trim().slice(0, 24); if (b && name) { b.name = name; if (/^errata$/i.test(name)) latch('errata'); } renaming = null; dirty = true; saveT = 0; }

/* --- the river (canvas) --- */
const TOP = 40, ROW = 46;
function getView() { const H = Math.max(G.H, 1); if (!G.view) return [0, H]; let [a, b] = G.view; if (G.follow && b < H) { a += H - b; b = H; } return [a, b]; }
function hatch(c) { if (hatch.p) return hatch.p; const k = document.createElement('canvas'); k.width = k.height = 8; const x = k.getContext('2d'); x.strokeStyle = 'rgba(140,146,148,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 8); x.lineTo(8, 0); x.stroke(); return hatch.p = c.createPattern(k, 'repeat'); }
function fit(cv, Hp) { const W = cv.clientWidth, dpr = window.devicePixelRatio || 1; if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hp * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(Hp * dpr); cv.style.height = Hp + 'px'; } const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, Hp); return [c, W]; }
function drawRiver() {
  const cv = $('cv'), n = G.br.length, Hp = TOP + n * ROW + 6; if (!cv.clientWidth) return;
  const [c, W] = fit(cv, Hp);
  const [v0, v1] = getView(), X = t => (t - v0) / (v1 - v0) * W, T = x => v0 + x / W * (v1 - v0), xH = Math.min(W, X(G.H)), xa = Math.max(0, X(0));
  c.font = '11px "Alegreya Sans", sans-serif'; c.textBaseline = 'middle';
  c.beginPath(); c.moveTo(xa, 20); for (let x = xa; x <= xH; x += 2) c.lineTo(x, 20 - 14 * climAt(Math.max(0, T(x)))[0]); c.lineTo(xH, 20); c.closePath(); c.fillStyle = 'rgba(207,166,80,.28)'; c.fill();
  c.fillStyle = '#8d9a9c'; c.fillText('seasons', 4, 9);
  const span = v1 - v0, step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find(s => span / s <= W / 70) || 10000;
  c.strokeStyle = '#2a363d'; c.lineWidth = 1; c.textAlign = 'center';
  for (let t = Math.ceil(v0 / step) * step; t <= Math.min(v1, G.H); t += step) { const x = Math.round(X(t)) + .5; c.beginPath(); c.moveTo(x, 22); c.lineTo(x, Hp); c.stroke(); c.fillStyle = '#8d9a9c'; if (x > 20 && x < W - 20) c.fillText(t.toLocaleString('en-US'), x, 31); }
  c.textAlign = 'left';
  let maxPop = 20; for (const b of G.br) { const s = sim(b); for (let x = xa; x <= xH; x += 2) { const st = s.segs[s.idx(Math.max(0, T(x)))].st; if (!st.dead && st.pop > maxPop) maxPop = st.pop; } } // scale to the tallest moment in view, so losses show
  G.br.forEach((b, i) => {
    const s = sim(b), y = TOP + i * ROW, hue = HUES[b.hue], on = b.id === G.act;
    c.globalAlpha = on ? .2 : .1; c.fillStyle = hue; c.fillRect(xa, y + 3, xH - xa, ROW - 6); c.globalAlpha = 1;
    let dead = Infinity; const base = y + ROW - 4, hh = ROW - 12, fam = []; c.beginPath(); c.moveTo(xa, base);
    for (let x = xa; x <= xH; x += 2) { const sg = s.segs[s.idx(Math.max(0, T(x)))], st = sg.st; if (st.dead) { dead = st.dead; c.lineTo(x, base); break; } c.lineTo(x, base - hh * Math.min(1, st.pop / maxPop)); if (sg.starving) fam.push(x); if (x + 2 > xH) c.lineTo(x, base); }
    c.closePath(); c.globalAlpha = on ? .75 : .4; c.fillStyle = hue; c.fill(); c.globalAlpha = 1;
    c.fillStyle = '#d0603f'; for (const x of fam) c.fillRect(x, base, 2, 2);
    if (dead <= G.H) { const xd = Math.max(xa, X(dead)); c.fillStyle = 'rgba(20,24,26,.6)'; c.fillRect(xd, y + 3, xH - xd, ROW - 6); c.fillStyle = hatch(c); c.fillRect(xd, y + 3, xH - xd, ROW - 6); }
    if (b.parent != null) { const pi = G.br.findIndex(p => p.id === b.parent), xf = X(b.forkT); if (pi >= 0) { c.fillStyle = 'rgba(15,21,24,.55)'; c.fillRect(xa, y + 3, Math.max(0, Math.min(xf, xH) - xa), ROW - 6); const py = TOP + pi * ROW + ROW / 2; c.strokeStyle = hue; c.lineWidth = 1.5; c.beginPath(); c.moveTo(xf, py); c.bezierCurveTo(xf + 14, py, xf - 2, y + ROW / 2, xf + 14, y + ROW / 2); c.stroke(); c.beginPath(); c.arc(xf, py, 3, 0, 7); c.fillStyle = hue; c.fill(); } }
    const done = new Map(); for (const r of s.recs) if (r.t <= G.H) done.set(r.id, r);
    for (const o of b.orders) { const x = X(o.t); if (x > xH + 1) continue; const r = done.get(o.id), late = r ? r.s === 'ok' && r.t - o.t > .5 : !(dead <= G.H) && o.k !== 'l' && o.k !== 'p' && o.k !== 'd';
      if (late) { const x2 = r ? X(r.t) : xH; if (x2 - x > 2) { c.strokeStyle = r ? '#cfa650' : '#d0603f'; c.lineWidth = 1.5; if (!r) c.setLineDash([3, 3]); c.beginPath(); c.moveTo(x, y + 8.5); c.lineTo(x2, y + 8.5); c.stroke(); c.setLineDash([]); if (r) { c.fillStyle = '#cfa650'; c.fillRect(Math.round(x2) - 1, y + 5, 2.5, 7); } } }
      if (x < -2) continue; c.fillStyle = !r ? '#d0603f' : r.s === 'void' ? '#d0603f' : late ? '#cfa650' : '#e7e0cf'; c.fillRect(Math.round(x), y + 5, 1.5, r ? 7 : 4); }
    for (const f of s.feats) if (f.t <= G.H && ENTRY[f.k]) { const x = X(f.t), m = y + 16; if (x < 0 || x > W) continue; c.beginPath(); c.moveTo(x, m - 5); c.lineTo(x + 4, m); c.lineTo(x, m + 5); c.lineTo(x - 4, m); c.closePath(); c.fillStyle = f.k === 'ruin' ? '#d0603f' : '#f0d898'; c.fill(); c.strokeStyle = '#0f1518'; c.lineWidth = 1; c.stroke(); }
    if (on) { c.strokeStyle = hue; c.lineWidth = 1; c.strokeRect(xa + .5, y + 3.5, Math.max(0, xH - xa - 1), ROW - 7); }
  });
  // the bleed: what crosses from lane to lane, BLEED years late
  c.save(); c.beginPath(); c.rect(0, TOP, xH, Hp - TOP); c.clip();
  G.br.forEach((b, i) => { for (const e of sim(b).emit) { if (e.t > G.H) continue; const x0 = X(e.t), x1 = X(e.t + BLEED), y0 = TOP + i * ROW + ROW / 2; if (x1 < 0 || x0 > W) continue;
    c.strokeStyle = e.k === 'tech' ? 'rgba(98,176,163,.4)' : e.k === 'light' ? 'rgba(240,216,152,.95)' : e.k === 'sleeper' ? 'rgba(208,96,63,.95)' : 'rgba(141,154,156,.6)'; c.lineWidth = e.k === 'tech' ? 1 : 2;
    G.br.forEach((o, j) => { if (j === i) return; const y1 = TOP + j * ROW + ROW / 2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); if (e.k !== 'tech') { c.beginPath(); c.arc(x1, y1, 3, 0, 7); c.fillStyle = c.strokeStyle; c.fill(); } }); } });
  c.restore();
  c.setLineDash([3, 4]); c.strokeStyle = '#d0603f'; c.fillStyle = '#d0603f';
  [{ t: 260, n: 'The Long Winter' }, { t: DRY_T, n: 'The Drying' }, ...TIDES, { t: FINAL_T, n: 'The Unwriting' }].forEach(tr => { if (tr.t > G.H) return; const x = Math.round(X(tr.t)) + .5; if (x < 0 || x > W) return; if (tr.t !== 260 && tr.t !== DRY_T) { c.beginPath(); c.moveTo(x, 4); c.lineTo(x, Hp); c.stroke(); } const w = c.measureText(tr.n).width; c.fillText(tr.n, x + w + 8 > W ? x - w - 5 : x + 5, 9); });
  c.setLineDash([]);
  if (xH < W) { c.fillStyle = hatch(c); c.globalAlpha = .5; c.fillRect(xH, 0, W - xH, Hp); c.globalAlpha = 1; }
  const g = c.createLinearGradient(xH - 26, 0, xH, 0); g.addColorStop(0, 'rgba(240,216,152,0)'); g.addColorStop(1, 'rgba(240,216,152,.4)'); c.fillStyle = g; c.fillRect(xH - 26, 22, 26, Hp - 22);
  c.fillStyle = '#f0d898'; c.fillRect(xH - 1.5, 22, 1.5, Hp - 22);
  const xc = Math.round(X(G.cur)); if (xc >= 0 && xc <= W) { c.fillStyle = '#e7e0cf'; c.fillRect(xc - .5, 22, 1, Hp - 22); c.beginPath(); c.moveTo(xc - 5, 22); c.lineTo(xc + 5, 22); c.lineTo(xc, 29); c.closePath(); c.fill(); }
}
function scrubTo(e) {
  const cv = $('cv'), r = cv.getBoundingClientRect(), [v0, v1] = getView(), x = e.clientX - r.left, t = v0 + x / r.width * (v1 - v0);
  if (t >= G.H - (v1 - v0) / r.width * 3) { G.follow = true; G.cur = G.H; } else { G.follow = false; G.cur = Math.max(0, Math.round(t)); }
  dirty = true;
}

/* --- the map (canvas): the active lane's ground at the cursor's year --- */
function mapXY(S, W, Hp) { return [(S.x + 1.13) / 2.56 * W, (S.y + .78) / 1.56 * Hp]; }
function drawMap() {
  const cv = $('map'); if (!cv.clientWidth) return; const Hp = Math.round(Math.min(460, cv.clientWidth * .62)), [c, W] = fit(cv, Hp);
  const b = act(), st = sim(b).at(G.cur).st, hue = HUES[b.hue], P = S => mapXY(S, W, Hp), target = G.red.length ? eye() : -1;
  c.font = '11px "Alegreya Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const S of MAP.sites) { if (!visible(S.id)) continue; const [x, y] = P(S);
    for (const e of S.adj) { const O = MAP.sites[e.to], [x2, y2] = P(O);
      if (!visible(e.to)) { c.setLineDash([2, 4]); c.strokeStyle = '#2a363d'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (x2 - x) * .45, y + (y2 - y) * .45); c.stroke(); c.setLineDash([]); continue; }
      if (e.to < S.id) continue; const both = st.own[S.id] && st.own[e.to];
      c.strokeStyle = both ? hue : '#3a4850'; c.lineWidth = both ? 2 : 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
      c.fillStyle = '#0f1518'; const mx = (x + x2) / 2, my = (y + y2) / 2; c.fillRect(mx - 9, my - 6, 18, 12); c.fillStyle = '#8d9a9c'; c.fillText(e.len, mx, my); } }
  for (const S of MAP.sites) { if (!visible(S.id)) continue; const [x, y] = P(S), col = TER[S.ter].c, own = st.own[S.id], R = 15;
    const pj = st.proj.find(p => p.x === 'settle' && p.s === S.id);
    if (S.shore) { c.setLineDash([3, 3]); c.beginPath(); c.arc(x, y, R - 3, 0, 7); c.lineWidth = 1.5; c.strokeStyle = G.H >= 700 ? '#d0603f' : '#6f7b80'; c.stroke(); c.setLineDash([]); if (st.ha[S.id] !== undefined && G.cur - st.ha[S.id] < 60) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fillStyle = '#d0603f'; c.fill(); }
      const nm = S.name, nw = c.measureText(nm).width; c.fillStyle = 'rgba(23,32,38,.85)'; c.fillRect(x - nw / 2 - 3, y + R + 4, nw + 6, 14); c.fillStyle = S.id === G.sel ? '#e7e0cf' : '#8d9a9c'; c.fillText(G.H >= 700 ? nm : 'An empty strand', x, y + R + 11);
      if (S.id === G.sel) { c.beginPath(); c.arc(x, y, R + 7, 0, 7); c.lineWidth = 1.5; c.strokeStyle = '#e7e0cf'; c.stroke(); } continue; }
    c.beginPath(); c.arc(x, y, R, 0, 7); c.fillStyle = own ? col : '#172026'; c.fill(); c.lineWidth = 2; c.strokeStyle = col; c.stroke();
    if (S.id === 0) { c.beginPath(); c.arc(x, y, R + 4, 0, 7); c.lineWidth = 1; c.strokeStyle = col; c.stroke(); }
    if (pj) { c.beginPath(); c.arc(x, y, R + 4, -1.57, -1.57 + 6.283 * Math.min(1, (G.cur - pj.t0) / (pj.done - pj.t0))); c.lineWidth = 2.5; c.strokeStyle = hue; c.stroke(); }
    c.font = '13px "Alegreya Sans", sans-serif'; c.fillStyle = own ? '#0f1518' : '#8d9a9c';
    if (own) { let n = 0; for (const k in st.sb[S.id]) n += st.sb[S.id][k]; c.fillText(n, x, y + 1); } else if (!G.known[S.id]) { if (G.rumor[S.id]) c.fillStyle = '#f0d898'; c.fillText(G.rumor[S.id] ? '!' : '?', x, y + 1); }
    c.font = '11px "Alegreya Sans", sans-serif';
    if (G.known[S.id] && S.feat) { const bx = x + 12, by = y - 12, f = S.feat; c.beginPath();
      if (f.startsWith('relic')) { c.moveTo(bx, by - 6); c.lineTo(bx + 5, by); c.lineTo(bx, by + 6); c.lineTo(bx - 5, by); c.closePath(); c.fillStyle = st.rel[f.slice(6)] ? '#f0d898' : '#172026'; c.fill(); c.strokeStyle = '#f0d898'; c.lineWidth = 1.5; c.stroke(); }
      else if (f === 'pit' || f === 'deep') { c.arc(bx, by, 5, 0, 7); c.fillStyle = '#172026'; c.fill(); c.strokeStyle = '#d0603f'; c.lineWidth = 1.5; c.stroke(); if (f === 'pit') { c.beginPath(); c.moveTo(bx - 3, by - 3); c.lineTo(bx + 3, by + 3); c.moveTo(bx + 3, by - 3); c.lineTo(bx - 3, by + 3); c.stroke(); } else { c.beginPath(); c.arc(bx, by, 1.5, 0, 7); c.fillStyle = '#d0603f'; c.fill(); } }
      else { c.arc(bx, by, 3.5, 0, 7); c.fillStyle = '#62b0a3'; c.fill(); } }
    if (own) { const sb = st.sb[S.id]; if (sb.palisade) { c.strokeStyle = '#e7e0cf'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, R + 3, .6, 2.54); c.stroke(); } if (sb.lazaret) { c.fillStyle = '#62b0a3'; c.fillRect(x - R - 5, y - 4, 5, 8); } }
    if (st.ha[S.id] !== undefined && G.cur - st.ha[S.id] < 60) { c.strokeStyle = '#d0603f'; c.lineWidth = 2; c.setLineDash([4, 3]); c.beginPath(); c.arc(x, y, R + 9, 0, 7); c.stroke(); c.setLineDash([]); }
    if (st.lost[S.id]) { c.strokeStyle = '#d0603f'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - 10, y - 10); c.lineTo(x + 10, y + 10); c.moveTo(x + 10, y - 10); c.lineTo(x - 10, y + 10); c.stroke(); }
    if (st.red[S.id]) { c.fillStyle = '#0f1518'; c.fillRect(x - R - 5, y - 4, 2 * R + 10, 8); }
    if (S.id === target) { c.strokeStyle = '#d0603f'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, y - R - 9, 8, 4.5, 0, 0, 7); c.stroke(); c.beginPath(); c.arc(x, y - R - 9, 2, 0, 7); c.fillStyle = '#d0603f'; c.fill(); }
    if (S.id === G.sel) { c.beginPath(); c.arc(x, y, R + 7, 0, 7); c.lineWidth = 1.5; c.strokeStyle = '#e7e0cf'; c.stroke(); }
    const nm = st.red[S.id] ? '▬▬▬▬▬' : S.name, nw = c.measureText(nm).width; c.fillStyle = 'rgba(23,32,38,.85)'; c.fillRect(x - nw / 2 - 3, y + R + 4, nw + 6, 14);
    c.fillStyle = S.id === G.sel ? '#e7e0cf' : '#8d9a9c'; c.fillText(nm, x, y + R + 11); }
}
function pickSite(e) { const cv = $('map'), r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let best = -1, bd = 26; for (const S of MAP.sites) { if (!visible(S.id)) continue; const [sx, sy] = mapXY(S, r.width, r.height), d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = S.id; } } if (best >= 0) { G.sel = best; dirty = true; } }

/* --- panels --- */
function costHTML(c, v) { let h = ''; for (const r in c) h += '<span class="c' + (v[r] < c[r] - 1e-6 ? ' no' : '') + '" title="' + RN[r] + '"><i style="background:' + RC[r] + '"></i>' + fmt(c[r]).replace('.0', '') + '</span>'; return h; }
const canPay = (c, v) => Object.keys(c).every(r => v[r] >= c[r] - 1e-6);
function renderLanes() {
  if (renaming != null) return;
  let h = '<div class="lhead">' + G.br.length + ' of ' + laneCap() + ' lanes</div>';
  for (const b of G.br) {
    const V = sim(b).at(G.cur), on = b.id === G.act, r = resonance(b);
    h += '<div class="lane' + (on ? ' on' : '') + '" data-a="sel" data-id="' + b.id + '" style="--h:' + HUES[b.hue] + '"><b>' + esc(b.name) + '</b><small>' +
      (V.st.dead ? 'ended ' + yr(V.st.dead) : V.st.pop + ' people') + ' · ' + (r ? 'resonance +' + r.toFixed(2) : 'silent') + '</small><span class="lt">' +
      '<button data-a="ren" data-id="' + b.id + '" title="Rename this lane" aria-label="Rename">✎</button>' +
      (G.br.length > 1 ? '<button data-a="prune" data-id="' + b.id + '" title="Prune this lane" class="' + (pruneAsk === b.id ? 'ask' : '') + '">' + (pruneAsk === b.id ? 'prune?' : '✕') + '</button>' : '') + '</span></div>';
  }
  setHTML('lanes', h);
}
function incoming(b) { /* what is already on its way to this lane: emitted behind the horizon, arriving after the cursor */
  const out = []; for (const o of G.br) if (o !== b) for (const e of sim(o).emit) if (e.t <= G.H && e.t + BLEED > G.cur) out.push({ ...e, ta: e.t + BLEED, from: o.name });
  return out.sort((a, b) => a.ta - b.ta);
}
function renderState(b, V) {
  const st = V.st, d = V.d;
  let h = '<div class="civ"><h2>' + civName(b) + '</h2><p>' + esc(b.name) + ' lane · year ' + yr(G.cur) + ' · ' + era(st) + '</p></div>';
  if (st.dead) h += '<div class="fallen"><b>Ended in year ' + yr(st.dead) + '</b>' + (st.by === 'The Unwriting' ? 'This lane met the Unwriting without all three relics, its own or lit from another lane.' : st.by + ' ended this lane at Hearthford.') + ' Drag the cursor back and prepare.</div>';
  else {
    const g = V.seg.starving ? '<span class="bad">famine</span>' : st.pop > d.housing ? '<span class="bad">' + (st.pop - d.housing) + ' unhoused, leaving</span>' : st.fam ? '<span class="bad">hungry: farms are staffed first</span>' : st.pop >= d.housing ? 'housing is full' : st.grow < Infinity ? 'next birth in ' + Math.max(0, st.grow - G.cur).toFixed(0) + ' yr' : '';
    h += '<div class="people"><b>' + st.pop + '</b> people <span class="dim">of ' + d.housing + ' housed</span><span class="g">' + g + '</span></div>';
    if (V.clim < .995) h += '<div class="clim">Failing harvests. Farms yield ' + Math.round(V.clim * 100) + '%.</div>';
  }
  h += '<table class="res">';
  for (const r of SHOW) {
    if (r === 'vein' ? !st.b.mine && !(V.v.vein > 0) : (r !== 'food' && r !== 'wood' && r !== 'mem' && !(V.v[r] > 0.05) && !Math.abs(V.dv[r]) && !(st.b.mine && r === 'ore'))) continue;
    const cap = d && d.cap[r], m = V.mode[r];
    let note = m === 'empty' ? (r === 'food' ? 'none left' : r === 'vein' ? 'exhausted' : 'used as it comes') : m === 'full' ? 'stores full' : (V.dv[r] < -0.005 && r !== 'vein' ? 'gone in ~' + Math.ceil(V.v[r] / -V.dv[r]) + ' yr' : '');
    if (r === 'vein' && !m && V.dv[r] < 0) note = '~' + fmt(V.v[r] / -V.dv[r]) + ' yr left';
    h += '<tr class="' + (m === 'empty' && r !== 'ore' && r !== 'metal' ? 'warn' : '') + '"><td><i style="background:' + RC[r] + '"></i>' + RN[r] + '</td><td class="num">' + fmt(V.v[r]) + (cap ? '<span class="dim"> / ' + fmt(cap) + '</span>' : '') + '</td><td class="num rate">' + fmtRate(V.dv[r]) + '</td><td class="note">' + note + '</td></tr>';
  }
  h += '</table>';
  if (G.echo.found_sword || G.echo.found_bell || G.echo.found_lens) {
    h += '<div class="relics">'; for (const k in RK) { const own = st.rel[k], lit = !own && has(st, k), owed = st.pend.includes('sh:' + k), c = RELIC[k].sh, r = Object.keys(c)[0];
      h += '<span class="' + (own ? 'own' : lit ? 'lit' : owed ? 'owed' : '') + '" title="' + RELIC[k].buff + '"><b>' + RK[k] + '</b>' + (own ? 'raised here' : lit ? 'lit from another lane' : owed ? 'shadow unpaid: ' + c[r] + ' ' + RN[r].toLowerCase() : 'dark') + '</span>'; } h += '</div>'; }
  const inc = st.dead ? [] : incoming(b).filter(e => !(e.k === 'tech' && st.up[e.x])).slice(0, 5);
  if (inc.length) { h += '<h3>Bleeding through <span class="dim">from other lanes</span></h3><ul class="inc">';
    for (const e of inc) { let x; if (e.k === 'tech') x = UPG[e.x].n + ', learned for nothing'; else if (e.k === 'light') { const c = RELIC[e.x].sh, r = Object.keys(c)[0]; x = (st.rel[e.x] ? 'Light of ' + RELIC[e.x].n : 'Shadow of ' + RELIC[e.x].n + ': have ' + c[r] + ' ' + RN[r].toLowerCase() + ' ready'); } else if (e.k === 'sleeper') x = 'The Sleeper walks through: have ' + SLEEPER + ' arms ready'; else x = 'The light of ' + RELIC[e.x].n + ' goes out';
      h += '<li class="' + e.k + '"><span class="y">' + yr(e.ta) + '</span>' + x + '<small>' + esc(e.from) + '</small></li>'; } h += '</ul>'; }
  setHTML('pState', h);
}
function renderJobs(V) {
  const st = V.st, d = V.d; if (st.dead) return setHTML('pJobs', '');
  let h = '<h3>Work <span class="dim">top of the list is staffed first, best ground first</span></h3><table class="jobs">';
  st.prio.forEach((j, i) => {
    const sl = d.slots[j]; if (!sl) return; const lim = st.lim[j];
    h += '<tr><td class="ud"><button data-a="up" data-x="' + j + '" title="Staff earlier" aria-label="Move up"' + (i ? '' : ' disabled') + '>▲</button><button data-a="dn" data-x="' + j + '" title="Staff later" aria-label="Move down"' + (i < st.prio.length - 1 ? '' : ' disabled') + '>▼</button></td>' +
      '<td><b>' + JN[j] + '</b><small>' + JD[j] + '</small></td><td class="num">' + V.w[j] + '<span class="dim"> / ' + sl + '</span></td>' +
      '<td class="lim"><button data-a="lim" data-x="' + j + '" data-d="-1" title="Allow one fewer" aria-label="Fewer">−</button><span title="Most this lane will put here">' + (lim == null ? 'all' : lim) + '</span><button data-a="lim" data-x="' + j + '" data-d="1" title="Allow one more" aria-label="More">+</button></td></tr>';
  });
  h += '<tr><td></td><td><b>' + JN.forager + '</b><small>' + JD.forager + '</small></td><td class="num">' + V.w.forager + '</td><td class="dim">everyone else</td></tr></table>';
  let up = '';
  for (const x in UPG) { const o = { k: 'u', x }, U = UPG[x]; if (isVoid(st, o) || !reqOk(st, o, mods)) continue; const c = costOf(st, o, mods);
    const src = { terracing: 'hint_terrace', milling: 'hint_mill', archives: 'hint_lib', liturgy: 'hint_temple', casting: 'hint_foundry', quar: 'pit' }[x], at = src && MAP.sites.find(q => q.feat === src);
    up += '<button class="w wide' + (canPay(c, V.v) ? '' : ' short') + (at ? ' found' : '') + '" data-a="u" data-x="' + x + '"><b>' + (at ? '<span class="tag">found at ' + at.name + '</span>' : '') + U.n + '<span class="n">' + Math.round(U.t * d.research) + ' yr</span></b><span class="cost">' + costHTML(c, V.v) + '</span><small>' + U.d + '</small></button>'; }
  if (st.proj.length) { h += '<h3>Under way</h3>'; for (const p of st.proj) h += '<div class="proj"><span>' + (p.x === 'settle' ? 'Settlers walking to ' + sname(p.s) : p.x === 'raise' ? RELIC[MAP.sites[p.s].feat.slice(6)].n : UPG[p.x].n) + '</span><span class="dim">' + Math.max(0, p.done - G.cur).toFixed(0) + ' yr</span><div><i style="width:' + (100 * Math.min(1, (G.cur - p.t0) / (p.done - p.t0))).toFixed(1) + '%"></i></div></div>'; }
  if (!G.echo.pit && MAP.hasPit && G.H >= 1455 && !st.up.quar) up += '<div class="w wide locked"><b>Quarantine<span class="n">nobody knows how</span></b><small>The Plague is an old sickness. Somewhere in the valley its dead are buried, and people who lived over them would learn what it does. Settlers next door to such a place hear about it: watch the Chronicle and the map for a rumour.</small></div>';
  if (up) h += '<h3>Learn <span class="dim">other lanes get it free, 50 years on</span></h3><div class="grid one">' + up + '</div>';
  const known = Object.keys(st.up); if (known.length) h += '<h3>Known</h3><p class="tags">' + known.map(k => '<span>' + UPG[k].n + '</span>').join('') + '</p>';
  setHTML('pJobs', h);
}
function renderSite(V) {
  const st = V.st, s = visible(G.sel) ? G.sel : 0, S = MAP.sites[s], T = TER[S.ter], own = st.own[s], d = V.d;
  if (S.shore) return setHTML('pSite', '<div class="civ"><h2>' + (G.H >= 700 ? S.name : 'An empty strand') + '</h2><p>Shingle and wind · nothing can be built here</p></div><p class="feat' + (G.H >= 700 ? ' bad' : '') + '">' + (G.H >= 700 ? 'The Ashen Host lands here in year 700 and takes every road out: toward ' + S.adj.map(e => visible(e.to) ? sname(e.to) : 'somewhere unmapped').join(', ') + '. A palisade on each of those roads, or at any choke point between here and what you care about, stops it.' : 'A long empty beach facing east. No fresh water, no soil. Settlers will not go.') + '</p>');
  let h = '<div class="civ"><h2>' + (st.red[s] ? '<s>' + S.name + '</s>' : S.name) + '</h2><p>' + T.n + (T.fav.length ? ' · good ground for ' + T.fav.map(j => JN[j].toLowerCase()).join(' and ') : ' · good ground for nothing') + (s ? ' · ' + S.dist + ' yr from home' : ' · home') + '</p></div>';
  h += '<p class="feat' + (G.known[s] && (S.feat === 'pit' || S.feat === 'deep') ? ' bad' : '') + '">' + (!G.known[s] ? (G.rumor[s] ? 'Rumour: ' + rumour(S) : 'No lane has lived here yet, so the Archive cannot say what is under it.') : S.feat ? FEAT[S.feat] : s ? 'Nothing unusual under it.' : 'Where the four of them started.') + '</p>';
  if (st.dead) return setHTML('pSite', h + '<p class="dim">A lane that has ended takes no orders.</p>');
  const pj = st.proj.find(p => p.x === 'settle' && p.s === s);
  if (st.red[s]) h += '<p class="bad">Struck out. Its posts yield nothing from here on, in every lane.</p>';
  if (st.lost[s]) h += '<p class="bad">Lost to the Sleeper in this lane.</p>';
  else if (pj) h += '<p class="dim">Settlers are on the road. They arrive in ' + Math.max(0, pj.done - G.cur).toFixed(0) + ' years. Building orders placed now will wait for them.</p>';
  else if (!own) { const o = { k: 's', s }; if (reqOk(st, o, mods)) { const c = costOf(st, o, mods);
      h += '<div class="grid one"><button class="w wide settle' + (canPay(c, V.v) ? '' : ' short') + '" data-a="s"><b>Settle ' + S.name + '<span class="n">' + Math.round(settleTime(st, s)) + ' yr walk</span></b><span class="cost">' + costHTML(c, V.v) + '</span><small>Each site costs more than the last. ' + plots(st, s) + ' plots.</small></button></div>'; }
    else h += '<p class="dim">Too far. Settlers only set out for a site next to one this lane already holds.</p>'; }
  if (own || pj) {
    const f = S.feat, k = f && f.startsWith('relic_') ? f.slice(6) : null;
    if (k && own && !st.rel[k] && !st.proj.some(p => p.x === 'raise' && p.s === s)) { const c = costOf(st, { k: 'r', s }, mods);
      h += '<div class="grid one"><button class="w wide reg' + (canPay(c, V.v) ? '' : ' short') + '" data-a="r"><b>' + RELIC[k].verb + ' ' + RELIC[k].n + '<span class="n">' + RAISE_T + ' yr</span></b><span class="cost">' + costHTML(c, V.v) + '</span><small>' + RELIC[k].buff + (relicLoad(st) ? ' This lane already carries a relic, so this one is ' + Math.pow(3, relicLoad(st)) + ' times as heavy.' : '') + ' Its light reaches the other lanes 50 years after it is finished, and its shadow arrives first.</small></button></div>'; }
    const used = own ? d.used[s] || 0 : 0, cap = plots(st, s);
    h += '<h3>Build here <span class="' + (used >= cap ? 'bad' : 'dim') + '">' + used + ' of ' + cap + ' plots' + (used >= cap ? ' · full, settle another site' : ' · shift-click for five') + '</span></h3><div class="grid">';
    for (const x in BLD) { const B = BLD[x]; if (B.ter && B.ter !== S.ter) continue; if (B.req && !B.req(st)) continue; if (B.uniq && st.b[x] > 0) continue;
      const c = costOf(st, { k: 'b', x, s }, mods), ok = own && canPay(c, V.v) && used < cap && !st.red[s], n = own && st.sb[s][x] || '';
      let m = ''; if (BJ[x] && own) { const v = siteMult(st, d, s, BJ[x][0]); m = '<em class="' + (v >= 1.2 ? 'hi' : v < .8 ? 'lo' : '') + '">×' + v.toFixed(2) + ' here</em>'; }
      h += '<button class="w' + (ok ? '' : ' short') + '" data-a="b" data-x="' + x + '" title="' + B.d + (own && used >= cap ? ' This site has no free plot, so the order would wait. Settle another site.' : '') + '"><b>' + B.n + '<span class="n">' + n + '</span></b><span class="cost">' + costHTML(c, V.v) + m + '</span><small>' + B.d + '</small></button>'; }
    h += '</div>';
    if (own && used) { h += '<h3>Standing here <span class="dim">razing frees the plot and returns nothing</span></h3><p class="tags raze">'; for (const x in st.sb[s]) h += '<span>' + BLD[x].n + (st.sb[s][x] > 1 ? ' ×' + st.sb[s][x] : '') + '<button data-a="raze" data-x="' + x + '" title="Raze one ' + BLD[x].n + ' here, at the cursor\'s year" aria-label="Raze one ' + BLD[x].n + '">raze</button></span>'; h += '</p>'; }
  }
  setHTML('pSite', h);
}
function whyWait(st, v, o) { /* why an order has not happened yet, as of the given state */
  if (o.k === 'b') { if (!st.own[o.s]) return 'site not settled'; if (st.red[o.s]) return 'site struck out'; if (room(st, o.s) <= 0) return 'no free plot'; const B = BLD[o.x]; if (B.req && !B.req(st)) return o.x === 'forge' ? 'needs a mine' : o.x === 'armory' ? 'needs a forge' : o.x === 'stele' ? 'needs a scriptorium and a shrine' : 'not researched yet'; }
  else if (o.k === 's' && !reqOk(st, o, mods)) return 'no settled neighbour';
  else if (o.k === 'r' && !st.own[o.s]) return 'site not settled';
  else if (o.k === 'u' && !reqOk(st, o, mods)) return 'not possible yet';
  const c = costOf(st, o, mods); for (const r in c) if (v[r] < c[r] - 1e-6) return 'needs ' + fmt(c[r]).replace('.0', '') + ' ' + RN[r].toLowerCase();
  return 'waiting';
}
function renderOrders(b) {
  const s = sim(b), done = new Map(); for (const r of s.recs) if (r.t <= G.H) done.set(r.id, r);
  const end = s.at(G.H).st.dead;
  let nLate = 0, nWait = 0; for (const o of b.orders) { const r = done.get(o.id); if (!r) nWait++; else if (r.s === 'ok' && r.t - o.t > .5) nLate++; }
  let h = '<h3>Orders in this lane <span class="dim">' + b.orders.length + (nLate ? ' · ' + nLate + ' carried out late' : '') + (nWait && !(end && end <= G.H) ? ' · ' + nWait + ' still waiting' : '') + '</span></h3>';
  if (!b.orders.length) h += '<p class="dim">Nothing yet. Whatever you order is carried out at the cursor\'s year, and everything after it is recomputed.</p>';
  h += '<ol class="orders">'; let marked = false;
  const mark = () => { if (!marked) { marked = true; h += '<li class="now">cursor · year ' + yr(G.cur) + '</li>'; } };
  for (const o of b.orders) {
    if (o.t > G.cur) mark();
    const r = done.get(o.id); let s2, cls = '';
    if (!r) { cls = 'wait'; if (end && end <= G.H) s2 = 'lane ended'; else { const W = s.at(Math.max(G.cur, o.t)); s2 = W.st.dead ? 'lane ended' : whyWait(W.st, W.v, o); } }
    else if (r.s === 'void') { cls = 'void'; s2 = 'void'; }
    else { const w = r.t - o.t; s2 = w > .5 ? '+' + Math.round(w) + ' yr, in ' + yr(r.t) : '✓'; if (w > .5) cls = 'late'; if (r.done && r.done > G.H) s2 = w > .5 ? '+' + Math.round(w) + ' yr, begun' : 'begun'; }
    h += '<li class="' + cls + '" data-a="goto" data-t="' + o.t + '"><span class="y">' + yr(o.t) + '</span><span class="what">' + describe(o) + '</span><span class="s">' + s2 + '</span><button data-a="del" data-id="' + o.id + '" title="Remove this order" aria-label="Remove">✕</button></li>';
  }
  mark(); h += '</ol>';
  const old = $('pOrders').querySelector('.orders'), top = old ? old.scrollTop : 0; setHTML('pOrders', h); const nu = $('pOrders').querySelector('.orders'); if (nu && nu.scrollTop !== top) nu.scrollTop = top;
}
function renderLog(b) {
  const s = sim(b), L = []; for (let i = s.log.length - 1; i >= 0 && L.length < 9; i--) if (s.log[i].t <= G.cur) L.push(s.log[i]);
  let h = '<h3>Chronicle</h3>'; if (!L.length) h += '<p class="dim">Year ' + yr(G.cur) + '. Nothing worth a line yet.</p>';
  h += '<ul class="log">' + L.map(e => '<li class="' + (e.c || '') + '"><span class="y">' + yr(e.t) + '</span>' + e.x + '</li>').join('') + '</ul>';
  setHTML('pLog', h);
}
function hint(b, V) {
  const st = V.st, endSt = sim(b).at(G.H).st;
  if (endSt.dead && G.cur >= endSt.dead) return endSt.by === 'The Unwriting' ? 'This lane was unwritten. Drag the cursor back and change what led here. Three relics, raised here or lit from other lanes, hold a lane down.' : endSt.by + ' ended this lane. Drag the cursor back before it and prepare. The Archive now knows what it does.';
  if (V.seg.starving) return 'Famine. Scrub back to before it began: more farms on good ground, a granary filled in the good years, or fewer huts.';
  if (!b.orders.length) return 'You are riding the horizon, the latest year the Archive can see. Order a Hut and a Farm at Hearthford. Two woodcutters are already stacking timber.';
  if (st.pend.some(x => typeof x === 'string')) return 'A relic\'s shadow is unpaid here. The lane pays the moment it can, and only then does the light count.';
  if (Object.keys(st.own).length === 1 && G.H > 90) return 'Hearthford has twelve plots and no hills. When it fills, raze something or spread out. Pick a neighbouring site on the map and settle it. Ground matters: each kind of post works best on its own kind of ground.';
  if (st.pend.length && !G.follow) return 'An order here is waiting. It will be carried out the moment this lane can pay for it and has somewhere to put it.';
  if (!G.follow) return 'You are in this lane\'s past. Any order placed here rewrites everything after year ' + yr(G.cur) + ', and whatever bled from it into other lanes. Press End to ride the horizon again.';
  if (G.br.length === 1 && G.H > 200) return 'Fork here copies this lane up to the cursor into a second lane. Whatever one lane learns reaches the others fifty years later.';
  return '';
}
function renderAll() {
  const b = act(), V = sim(b).at(G.cur), sp = speed();
  setHTML('hz', 'Horizon <b>year ' + yr(G.H) + '</b><span>+' + sp.toFixed(sp < 10 ? 2 : 1) + ' yr/s</span>');
  setHTML('nEcho', String(Object.keys(G.echo).length));
  setHTML('curY', 'Year <b>' + yr(G.cur) + '</b>' + (G.follow ? '<span>riding the horizon</span>' : '<span>' + yr(G.H - G.cur) + ' yr before the horizon</span>'));
  $('bFollow').classList.toggle('on', G.follow); $('bFit').hidden = !G.view;
  setHTML('hint', hint(b, V));
  renderLanes(); renderState(b, V); renderJobs(V); renderSite(V); renderOrders(b); renderLog(b);
}

/* --- archive, intro, ending --- */
function openModal(h) { $('mBody').innerHTML = h; $('modal').hidden = false; }
function closeModal() { $('modal').hidden = true; if (G.intro) { G.intro = false; save(); } }
function archiveHTML() {
  const sp = echoSpeed(), E = G.echo; let res = 0; const rows = G.br.map(b => { const r = resonance(b); res += r; return '<li class="sub"><span><i style="background:' + HUES[b.hue] + '"></i>' + esc(b.name) + '</span><span>+' + r.toFixed(2) + '</span></li>'; }).join('');
  let h = '<h2>The Archive</h2><p class="lede">Two kinds of thing happen here. What the Archive records is permanent, even if you rewrite or prune the lane that earned it. What bleeds between lanes is not: it exists only while the lane it came from still does it.</p>';
  h += '<div class="cols"><div><h3>How fast the horizon recedes</h3><ul class="sum"><li>One year each second<span>1.00</span></li><li>Recorded entries<span>×' + (1 + sp).toFixed(2) + '</span></li><li>Resonance of living lanes<span>×' + (1 + res).toFixed(2) + '</span></li>' + rows + '<li class="tot">Now<span>' + speed().toFixed(2) + ' yr/s</span></li></ul><p class="dim">A lane resonates with the Memory it holds at the horizon: people living, and lore and awe left unspent.</p></div><div><h3>What the Archive has worked out</h3>';
  h += '<div class="trial"><b>The bleed</b><p>Lanes are shelved side by side and the ink soaks through. Whatever one lane learns, raises or wakes reaches every other lane ' + BLEED + ' years later. Change the source and everything that bled from it changes too. The river draws each crossing as a slanted line.</p></div>';
  h += '<div class="trial"><b>The valley</b><p>' + Object.keys(G.known).length + ' of ' + (MAP.sites.length - 1) + ' sites have been lived in by some lane. Nobody knows what is under a place until people live on it, and then every lane\'s map shows it.</p></div>';
  if (G.H >= DRY_T + 60) h += '<div class="trial"><b>The Drying · from year ' + DRY_T + '</b><p>The river never comes back. Farm yields slide from year ' + DRY_T + ' to about half by year 1500 and stay there, with the second winter cutting deeper on the way. The seasons strip above the river shows it. Foragers are not affected.</p></div>';
  if (G.H >= 655) h += '<div class="trial"><b>The Ashen Host · year 700</b><p>' + (G.H < 700 ? 'Something is coming from the east.' : 'It lands on the Ashen Strand in year 700 and marches the roads at twice a settler\'s pace, for ' + HOST_SPAN + ' years. Unsettled ground does not slow it. At each settled site it is stopped by a Palisade, or by ' + HOST_ARMS + ' arms spent in the field. Otherwise it burns the site and goes on. The Strand has ' + MAP.sites[MAP.east].adj.length + ' roads out of it. If it reaches Hearthford unopposed, the lane ends. A site that stops it also shields whatever lies behind it on that road.') + '</p></div>';
  if (G.H >= 1455) h += '<div class="trial"><b>The Glass Plague · year 1500</b><p>' + (G.H < 1500 ? 'Something is coming, and it chimes.' : 'In year 1500 every site without a Lazaret turns to glass and is never lived in again, and the lane loses that share of its people. Hearthford without one ends the lane. ' + (E.pit || !MAP.hasPit ? 'Lazarets need Quarantine, which any lane can now research.' : 'Lazarets need Quarantine, and nobody can study that until some lane has lived, briefly, on top of the old dead.')) + '</p></div>';
  if (E.found_sword || E.found_bell || E.found_lens) h += '<div class="trial"><b>Relics</b><p>A relic is finished where it lies, over ' + RAISE_T + ' years. Each relic a lane already carries makes the next one three times as costly for that lane. ' + BLEED + ' years after that its shadow reaches every other lane, and each must pay it once: the Sword asks 600 awe, the Bell 600 lore, the Lens 300 arms. A lane that cannot pay loses a quarter of its people and pays later. Once paid, that lane holds the relic\'s light for as long as the source lane still has it.</p></div>';
  if (E.woke) h += '<div class="trial"><b>The Sleeper</b><p>It wakes ' + WAKE_T + ' years after the first mine is sunk on its hill, and ' + BLEED + ' years later it walks through every other lane. ' + SLEEPER + ' arms turn it back. Otherwise it takes a quarter of the people, and in the lane that woke it, the hill.</p></div>';
  if (G.H >= FINAL_T - 60) h += '<div class="trial"><b>The Unwriting · year ' + FINAL_T + '</b><p>' + (G.H < FINAL_T ? 'Something is coming, and it is the last thing.' : 'It unwrites any lane that does not hold all three relics in year ' + FINAL_T + ', raised there or lit from another lane. Light takes ' + BLEED + ' years to cross, so the latest a relic can be finished and still count elsewhere is year ' + (FINAL_T - BLEED) + '.') + '</p></div>';
  if (G.red.length) { const t = eye(); h += '<div class="trial"><b>The other hand</b><p>Each time a relic is first finished, somebody strikes one site out of every lane, from ' + BLEED + ' years after that relic was finished. It is always the most built-up site across all your lanes at the horizon, never home and never a relic\'s site. Struck so far: ' + G.red.map(r => sname(r.s) + ' from year ' + yr(r.t)).join('; ') + '. ' + (t >= 0 ? 'Its eye is on ' + sname(t) + ' now, and the map shows it.' : 'It has nothing to look at.') + '</p></div>'; }
  h += '</div></div><h3>Recorded <span class="dim">' + Object.keys(E).length + ' entries</span></h3><div class="echoes">';
  for (const k in ENTRY) { const e = ENTRY[k];
    if (E[k]) h += '<div class="echo got"><b>' + e.n + '</b><p>' + e.fx + '</p><small>horizon year ' + yr(E[k]) + '</small></div>';
    else if (!e.secret && (!e.gate || e.gate())) h += '<div class="echo"><b>Unrecorded</b><p>' + e.how + '</p></div>'; }
  h += '</div><p class="dim">Some entries leave no outline until they are found.</p>';
  h += '<h3>Save</h3><p class="dim">The game saves in this browser. Copy the save text to keep a backup or move it elsewhere.</p><div class="saverow"><button data-a="copy">Copy save text</button><input id="saveIn" placeholder="Paste save text here" aria-label="Save text to load"><button data-a="loadsave">Load</button><button data-a="reset" class="danger">Start over</button></div>';
  return h;
}
function introHTML() {
  return '<h2>Palimpsest at the End of Time</h2><div class="story"><p>A palimpsest is a page that was scraped and written over, where the old text still shows through.</p><p>You keep the Archive at the far end of everything. Four people start beside a river in year 0, in a valley nobody has mapped. The <b>horizon</b> is the latest year you can see. It recedes about a year each second. Drag along the river to visit any year behind it, and whatever you order there rewrites every later year at once.</p><p>This time there is <b>ground</b>. Sites have plots, and each kind of work does best on its own kind of ground. Nobody knows what is under a place until some lane has lived on it.</p><p>And this time the lanes <b>bleed</b>. What one history learns, or raises, or wakes, soaks through to the others fifty years later, and stops soaking through if you rewrite its source.</p></div><button data-a="close" class="primary">Open the Archive</button>';
}
function endingHTML() {
  const mins = Math.round((Date.now() - G.born) / 60000), w = G.br.filter(b => sim(b).at(G.H).st.won);
  return '<h2>The Morning After the End</h2><div class="story"><p>In year ' + FINAL_T + ' the Unwriting read ' + (w.length > 1 ? w.length + ' lanes' : 'the ' + esc(w[0] ? w[0].name : 'last') + ' lane') + ' and could not lift the page. It was held down at three corners by things that had not all been made in any one history.</p><p>' + (w.length > 1 ? 'Each of them was holding up part of another\'s sky, fifty years late, and none of them will ever know it.' : 'One lane held, on light borrowed from histories that did not.') + '</p>' +
    (G.red.length ? '<p>About the other hand. The Archive has compared the strokes that struck out ' + G.red.map(r => sname(r.s)).join(', ') + ' against every hand it has on file, and there is only one on file. The corrections are yours, from a pass over these pages you have not made yet. You were, it seems, not happy with how crowded those places got.</p>' : '') +
    '<p class="dim">Lanes kept: ' + G.br.map(b => esc(b.name)).join(', ') + '.' + (G.pruned.length ? ' Pruned, and remembered here anyway: ' + G.pruned.map(esc).join(', ') + '.' : '') + ' ' + Object.keys(G.echo).length + ' entries, ' + Object.keys(G.known).length + ' of ' + (MAP.sites.length - 1) + ' sites, ' + mins + ' minutes of your own time.</p><p>The horizon keeps receding. The lanes are still yours.</p></div><button data-a="close" class="primary">Keep reading</button>';
}

/* --- input --- */
function eventTimes(b) { const s = sim(b), a = new Set([0]); for (const r of s.recs) a.add(r.t); for (const o of b.orders) a.add(o.t); for (const l of s.log) a.add(l.t); return [...a].filter(t => t <= G.H).sort((x, y) => x - y); }
function jump(dir) { const ts = eventTimes(act()); let t = dir > 0 ? ts.find(x => x > G.cur + 1e-6) : [...ts].reverse().find(x => x < G.cur - 1e-6); if (t === undefined) { if (dir > 0) { G.follow = true; G.cur = G.H; } } else { G.cur = t; G.follow = false; } dirty = true; }
function nudge(d) { G.cur = Math.max(0, Math.min(G.H, (d > 0 ? Math.floor(G.cur) : Math.ceil(G.cur)) + d)); G.follow = G.cur >= G.H; dirty = true; }
function shake() {
  G.shakes++; G.H += 300; latch('shaken'); checkEchoes(); dirty = true;
  const q = ['Three centuries fall through at once. You remembered.', 'The sand does not mind.', 'The Archive pretends not to notice.', 'Somewhere a shadow is now fifty years closer than you planned.', 'At this point it is less an hourglass than a maraca.'];
  toast('<b>You shook the hourglass</b><small>' + q[Math.min(q.length - 1, G.shakes - 1)] + '</small>');
}
function onClick(e) {
  const el = e.target.closest('[data-a]'); if (!el) return; const a = el.dataset.a, x = el.dataset.x, b = act(), s = visible(G.sel) ? G.sel : 0;
  if (a !== 'prune') pruneAsk = null;
  if (a === 'b') { const n = e.shiftKey ? 5 : 1; for (let i = 0; i < n; i++) place({ k: 'b', x, s }); }
  else if (a === 'u') place({ k: 'u', x });
  else if (a === 's') place({ k: 's', s });
  else if (a === 'raze') place({ k: 'd', x, s });
  else if (a === 'dismiss') { el.closest('.disc').remove(); return; }
  else if (a === 'r') place({ k: 'r', s });
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
  drawRiver(); drawMap();
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
  $('map').addEventListener('pointerdown', pickSite);
  window.addEventListener('beforeunload', save); document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => JSON.parse(JSON.stringify(G)));
  if (G.intro) openModal(introHTML());
  window.palimpsest = { state: () => G, world: () => world, map: () => MAP, skip: y => { G.H += y; checkEchoes(); dirty = true; } };
  requestAnimationFrame(frame);
}
