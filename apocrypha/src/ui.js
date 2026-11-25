/* ===== Game layer: save, lanes, the Archive, rendering ===== */
const $ = id => document.getElementById(id);
const KEY = 'apocrypha-eot-save-1';
const HUES = ['#cfa650', '#62b0a3', '#d0603f', '#8fa3d6', '#a9bf6a'], INKS = ['#8a5a14', '#1f6f63', '#a23c22', '#3d57a0', '#55701f']; // lanes on the dark river, and the same lanes in ink on the map
const LANES = ['Amber', 'Verdigris', 'Cinder', 'Salt', 'Lantern', 'Thistle', 'Marrow', 'Quill', 'Halcyon', 'Umber', 'Sable', 'Brine', 'Tallow', 'Rime'];
const RN = { food: 'Food', wood: 'Timber', vein: 'Ore veins', ore: 'Ore', metal: 'Bronze', arms: 'Arms', lore: 'Lore', awe: 'Awe', mem: 'Memory' };
const RC = { food: '#a9bf6a', wood: '#b08968', vein: '#6f7b80', ore: '#9aa6ab', metal: '#cfa650', arms: '#d0603f', lore: '#8fa3d6', awe: '#c48bb8', mem: '#e7e0cf' };
const SHOW = ['food', 'wood', 'lore', 'awe', 'vein', 'ore', 'metal', 'arms', 'mem'];
const JN = { farmer: 'Farmers', woodcutter: 'Woodcutters', miner: 'Miners', smith: 'Smiths', armorer: 'Armorers', scholar: 'Scholars', priest: 'Priests', forager: 'Foragers', guard: 'Guards' };
const JD = { farmer: 'food, by the climate', woodcutter: 'timber', miner: 'veins into ore', smith: 'ore into bronze', armorer: 'bronze into arms', scholar: 'lore', priest: 'awe', forager: 'a little food, whatever the weather', guard: 'hold the stair; eat three shares, wear out arms' };
const RK = { sword: 'Sword', bell: 'Bell', lens: 'Lens' };
const mul = (k, f) => m => { m[k] *= f; };
const anyRelic = () => G.echo.raised_sword || G.echo.raised_bell || G.echo.raised_lens;
const ENTRY = {
  hearth: { n: 'First Hearth', how: 'A lane holds 8 people.', fx: 'The horizon recedes 50% faster.', sp: .5 },
  second: { n: 'A Second Fire', how: 'A lane settles a second site.', fx: 'The horizon recedes 20% faster.', sp: .2 },
  stored: { n: 'Stored Summers', how: 'A lane of 12 or more comes through the Long Winter with no famine dead.', fx: 'Food storage ×2 in every lane.', sp: .1, m: mul('foodCap', 2), gate: () => G.H > 260 },
  hunger: { n: "Hunger's Lesson", how: 'A lane loses three people to famine.', fx: 'Foragers ×1.5 in every lane.', sp: .1, m: mul('forage', 1.5) },
  bronze: { n: 'Bronze Dawn', how: 'A lane holds 40 bronze.', fx: 'Miners and smiths ×1.25 in every lane.', sp: .1, m: m => { m.mine *= 1.25; m.smith *= 1.25; } },
  letters: { n: 'The First Letters', how: 'A lane holds 60 lore.', fx: 'Horizon +10%.', sp: .1 },
  sky: { n: 'Something in the Sky', how: 'A lane holds 60 awe.', fx: 'Every people grows 30% faster.', sp: .1, m: mul('growth', 1.3) },
  bleed: { n: 'Bleed-through', how: 'One lane wakes knowing what another lane worked out.', fx: 'The horizon recedes 20% faster.', sp: .2 },
  pit: { n: 'A Warning in the Margin', how: 'A lane settles somewhere it should not have.', fx: 'The place is marked on every map, and what killed them can be studied: Quarantine can now be researched. Horizon +10%.', sp: .1 },
  carto: { n: 'The Whole Valley', how: 'Every site has been lived in by some lane, at some time.', fx: 'Everything costs 10% less. Horizon +30%.', sp: .3, m: mul('cost', .9) },
  host: { n: 'Shieldwall', how: 'A lane stops the Ashen Host somewhere, behind a palisade or in the field.', fx: 'Horizon +20%.', sp: .2, gate: () => G.H >= 700 },
  stair: { n: 'The Stair Down', how: 'A lane settles the place where the Undercroft opens.', fx: 'Delving can now be researched. Opens another lane, if nothing has yet. Horizon +10%.', sp: .1 },
  deep4: { n: 'Four Floors Down', how: 'A lane opens the fourth floor of the Undercroft.', fx: 'Horizon +15%.', sp: .15, gate: () => G.echo.stair },
  deep8: { n: 'Eight Floors Down', how: 'A lane opens the eighth floor of the Undercroft.', fx: 'Horizon +20%.', sp: .2, gate: () => G.echo.deep4 },
  rite1: { n: 'The First Hollow', how: 'A lane sings the first rite of the Bell.', fx: 'The second hollow is known. Opens another lane, if nothing has yet. Horizon +10%.', sp: .1, gate: () => G.trail >= 1 },
  rite2: { n: 'The Second Hollow', how: 'A lane sings the second rite.', fx: 'The third hollow is known. Horizon +10%.', sp: .1, gate: () => G.echo.rite1 },
  rite3: { n: 'The Third Hollow', how: 'A lane sings the third rite.', fx: 'The last hollow is known. Horizon +15%.', sp: .15, gate: () => G.echo.rite2 },
  glass: { n: 'Clear Glass', how: 'A lane learns Glassblowing.', fx: 'Other lanes show through on the map, as small scratched houses. Opens another lane, if nothing has yet.', sp: .1 },
  annals: { n: 'Annals', how: 'A lane learns to keep annals.', fx: 'The Archive can now list what it has not yet recorded.', sp: 0 },
  optics: { n: 'Far Sight', how: 'A lane learns to grind lenses.', fx: 'Every map shows the ground two roads beyond the last place lived in.', sp: 0, gate: () => G.echo.glass },
  margin: { n: 'The Margin', how: 'A lane learns to read the notes beside its own annals.', fx: 'The Archive lists every dated thing still to come.', sp: 0, gate: () => G.echo.counterfact },
  counterfact: { n: 'What Would Have Happened', how: 'A lane learns Counterfactuals.', fx: 'One more lane. The scholars insist there always was one.', sp: .15, gate: () => G.echo.glass },
  raised_sword: { n: 'The Unbroken Sword', how: 'A lane reaches the bottom of the Undercroft.', fx: 'Horizon +30%. The first relic opens another lane.', sp: .3, gate: () => G.echo.stair },
  raised_bell: { n: 'The Bell That Rings Backward', how: 'A lane sings all four rites.', fx: 'Horizon +30%. The first relic opens another lane.', sp: .3, gate: () => G.echo.rite1 },
  raised_lens: { n: 'The Lens of Last Light', how: 'A lane follows two lines of study to where they meet.', fx: 'Horizon +30%. The first relic opens another lane.', sp: .3, gate: () => G.echo.glass },
  plague: { n: 'Not One Window Dark', how: 'A lane comes through the Glass Plague without losing a single site.', fx: 'Horizon +20%.', sp: .2, gate: anyRelic },
  kept: { n: 'Nothing Forgotten', how: 'A lane ends the Forgetting having lost no more than one thing.', fx: 'Horizon +20%.', sp: .2, gate: () => G.seenMal >= 2 },
  ruin: { n: 'Witness to Ruin', how: 'Watch a lane end.', fx: 'Horizon +20%. Ruin is also a record.', sp: .2, gate: () => G.H >= 700 },
  dawn: { n: 'The Morning After the End', how: 'Bring a lane through the Unwriting.', fx: 'The horizon recedes twice as fast, into whatever comes next.', sp: 2, gate: () => G.H >= FINAL_T },
  breach: { n: 'What Came Up', secret: 1, fx: 'A stair was left unheld, and the other lanes heard about it fifty years later. Horizon +10%.', sp: .1 },
  night: { n: 'The Sunless Years', secret: 1, fx: 'The third malady has a name now. Horizon +10%.', sp: .1 },
  whole: { n: 'The Whole Hand', secret: 1, fx: 'One lane made all three relics by itself: delved, sang and studied. Horizon +50%.', sp: .5 },
  hint_terrace: { n: 'The Old Terraces', secret: 1, fx: 'Terracing can now be researched, in any lane. Horizon +5%.', sp: .05 },
  hint_mill: { n: 'The Cracked Millstone', secret: 1, fx: 'The Great Wheel can now be researched, in any lane. Horizon +5%.', sp: .05 },
  hint_lib: { n: 'The Empty Shelves', secret: 1, fx: 'Shelving the World can now be researched, in any lane. Horizon +5%.', sp: .05 },
  hint_temple: { n: 'The Roofless Nave', secret: 1, fx: 'The Long Liturgy can now be researched, in any lane. Horizon +5%.', sp: .05 },
  hint_foundry: { n: 'The Casting Pit', secret: 1, fx: 'Casting in the Round can now be researched, in any lane. Horizon +5%.', sp: .05 },
  drafts: { n: 'Earlier Drafts', secret: 1, fx: 'A lane named for one of the first two attempts. Horizon +5%.', sp: .05 },
  shaken: { n: 'The Shaken Hourglass', secret: 1, fx: 'Third time. It has stopped pretending to be surprised.', sp: 0 }
};
const BASE_FINAL = 1860, YRS = { hearth: 20, second: 20, stored: 30, hunger: 20, bronze: 20, letters: 20, sky: 20, bleed: 30, pit: 20, carto: 40, host: 30, stair: 20, deep4: 20, deep8: 30, rite1: 20, rite2: 20, rite3: 20, glass: 20, counterfact: 20, plague: 30, kept: 30, ruin: 10, annals: 10, optics: 10, margin: 10 };
for (const k in ENTRY) { const e = ENTRY[k]; e.y = YRS[k] || (e.secret ? 10 : 0); e.fx = e.fx.split(/(?<=\.) /).filter(s => !/orizon/.test(s)).join(' '); if (e.y) e.fx += (e.fx ? ' ' : '') + 'The Unwriting comes ' + e.y + ' years later.'; }
const DISC = { hint_terrace: 'terracing', hint_mill: 'milling', hint_lib: 'archives', hint_temple: 'liturgy', hint_foundry: 'casting', pit: 'quar', stair: 'delving' };
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
function era(st) { if (st.dead) return st.by === 'The Ashen Host' ? 'Ash' : st.by === 'The Glass Plague' ? 'Glass' : 'Unwritten'; if (st.won) return 'The Morning'; const n = Object.keys(st.own).length; if (Object.keys(st.rel).length) return 'Age of Relics'; if (st.depth) return 'Age of the Stair'; if (st.rite) return 'Age of Echoes'; if (st.up.glass) return 'Age of Glass'; if (n >= 6) return 'Age of Roads'; if (st.b.forge) return 'Age of Bronze'; if (n > 1) return 'Age of Settlers'; if (st.b.farm) return 'Age of Furrows'; return 'Age of Hearths'; }
function toast(h, cls) { const d = document.createElement('div'); d.className = 'toast ' + (cls || ''); d.innerHTML = h; const box = $('toasts'); box.appendChild(d); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => d.remove(), 5000); }
function discovery(h) { const d = document.createElement('div'); d.className = 'disc'; d.innerHTML = h + '<button data-a="dismiss">Noted</button>'; $('discs').appendChild(d); }
/* A click only happens if the thing pressed is still there when the button comes up. These panels are rewritten as the
   years go by (the header ten times a second at full speed), so a press of ordinary human length used to land on a
   button that no longer existed, and nothing happened. Or the panel above grew a line and the button slid out from under
   the pointer, which comes to the same thing. So while a press is down on anything but a canvas, no panel is rewritten.
   (Presses on the river and the map are drags and picks, and the panels have to follow those as they happen.) */
let press = 0;
function setHTML(id, h) { if (cache[id] === h || Date.now() - press < 1500) return; cache[id] = h; $(id).innerHTML = h; }
const near1 = s => s === 0 || G.known[s] || MAP.sites[s].adj.some(e => G.known[e.to]);
const visible = s => near1(s) || (!!G.echo.optics && MAP.sites[s].adj.some(e => !MAP.sites[e.to].shore && near1(e.to)));

/* --- save --- */
function modsOf() { const m = { E: G.echo, forage: 1, farm: 1, wood: 1, mine: 1, smith: 1, foodCap: 1, growth: 1, startPop: 0, housing: 0, research: 1, cost: 1, final: BASE_FINAL, mal: 0 }; for (const k in G.echo) if (ENTRY[k]) { m.final += ENTRY[k].y; if (ENTRY[k].m) ENTRY[k].m(m); if (k.startsWith('raised_')) m.mal++; } return m; }
function laneCap() { const E = G.echo; return 2 + (E.stair || E.rite1 || E.glass ? 1 : 0) + (anyRelic() ? 1 : 0) + (E.counterfact ? 1 : 0); }
function newGame() {
  G = { v: 4, seed: 1 + Math.floor(Math.random() * 1e9), H: 25, last: Date.now(), born: Date.now(), echo: {}, known: { 0: 1 }, rumor: {}, trail: 0, floor: 0, seenMal: 0, br: [], act: 0, sel: 0, cur: 25, follow: true, pruned: [], seq: 1, shakes: 0, won: false, nl: 0, intro: true, view: null };
  MAP = makeMap(G.seed); addLane(null, 0, []);
}
function addLane(parent, forkT, orders) { const id = G.seq++, k = G.nl++; const b = { id, name: LANES[k % LANES.length] + (k >= LANES.length ? ' ' + (1 + Math.floor(k / LANES.length)) : ''), hue: k % HUES.length, parent, forkT, orders }; G.br.push(b); G.act = id; return b; }
function rebuild() { mods = modsOf(); setTimeline(mods.final, mods.mal); world = new World(mods); for (const b of G.br) world.add(b.id, b.orders); world.ensure(G.H); dirty = true; }
function save() { G.last = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) { } }
function load(raw) { try { const o = typeof raw === 'string' ? JSON.parse(raw) : raw; if (o && o.v === 4 && o.seed && Array.isArray(o.br) && o.br.length) { G = o; G.rumor = G.rumor || {}; G.view = null; G.trail = G.trail || 0; G.floor = G.floor || 0; G.seenMal = G.seenMal || 0; MAP = makeMap(G.seed); return true; } } catch (e) { } return false; }

/* --- time, the Archive, and the other hand --- */
const heard = (b, t) => bleedDelay(sim(b).at(t).v.mem); /* how long this lane's news takes to reach the others, as of year t */
function speed() { return G.rate == null ? 3 : G.rate; }
function latch(k, t) {
  if (G.echo[k] || !ENTRY[k]) return false; G.echo[k] = Math.round(G.H);
  if (DISC[k]) { const S = MAP.sites.find(x => x.feat === (k === 'stair' ? 'dun' : k)); discovery('<b>Discovery at ' + S.name + '</b><p>' + FEAT[S.feat] + '</p><p class="un">New research in every lane: <b>' + UPG[DISC[k]].n + '</b>. ' + UPG[DISC[k]].d + '</p>'); }
  else toast('<b>The Archive records</b><span>' + ENTRY[k].n + '</span><small>' + ENTRY[k].fx + '</small>', 'echo');
  if (k.startsWith('raised_')) { const n = Object.keys(G.echo).filter(q => q.startsWith('raised_')).length; toast('<b>Something has been let in</b><span>' + MALADY[n] + '</span><small>Year ' + MAL_T[n] + ', in every lane, including this one\'s own past.</small>', 'red'); }
  return true;
}
function checkEchoes() {
  for (let pass = 0; pass < 8; pass++) {
    let got = false; world.ensure(G.H);
    for (const b of G.br) { const s = sim(b);
      for (const f of s.feats) { if (f.t > G.H) continue; const k = f.k;
        if (k.startsWith('own:')) { const q = +k.slice(4); if (!G.known[q]) { G.known[q] = 1; dirty = true; } }
        else if (k.startsWith('rum:')) { const q = +k.slice(4); if (!G.rumor[q]) { G.rumor[q] = 1; dirty = true; } }
        else if (k.startsWith('trail')) { const n = Math.min(4, +k.slice(5)); if (n > G.trail) { G.trail = n; dirty = true; if (n > 1) discovery('<b>The trail goes on</b><p>The echo of the rite came back from somewhere else.</p><p class="un">The next hollow is at <b>' + sname(MAP.rites[n - 1]) + '</b>. The map marks it in every lane.</p>'); else discovery('<b>The first hollow</b><p>' + FEAT.rite + '</p><p class="un">A rite can be sung at <b>' + sname(MAP.rites[0]) + '</b> by a lane that holds it. Where the trail goes after that, nobody knows yet.</p>'); } }
        else if (k.startsWith('floor')) { const n = +k.slice(5); if (n > G.floor) { G.floor = n; dirty = true; } }
        else if (latch(k, f.t)) got = true; }
    }
    G.seenMal = 0; for (let o = 1; o <= mods.mal; o++) if (G.H >= MAL_T[o] - 45) G.seenMal = o;
    if (MAP.sites.every(S => S.shore || G.known[S.id]) && latch('carto')) got = true;
    if (!got) break;
    rebuild(); // what the Archive records changes every lane, from year 0
  }
  if (G.echo.dawn && !G.won) { G.won = true; openModal(endingHTML()); }
}
function advance(dt) { if (G.intro) return; /* the horizon waits until the introduction has been read */ const n = Math.min(4000, Math.max(1, Math.ceil(dt / 2))), h = dt / n; for (let i = 0; i < n; i++) { G.H += speed() * h; checkEchoes(); } }

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
let flash = null; /* a short note shown in an order's own row, in place of a notification */
function tighten(id) { /* move one order as early as it can go: still carried out the year it is placed, and no other order made later */
  const b = act(), s = sim(b), o = b.orders.find(x => x.id === id); if (!o) return;
  const execs = sm => { const m = new Map(); for (const r of sm.recs) m.set(r.id, r); return m; }, E0 = execs(s), T = G.H;
  const trial = b.orders.map(x => ({ ...x })), to = trial.find(x => x.id === id), ts = new Sim(trial, mods, b.id); ts.inbox = s.inbox; // a private copy of the lane, hearing the same things from the others
  const ok = t => { const old = to.t; trial.splice(trial.indexOf(to), 1); to.t = t; insert(trial, to); ts.byId = null; ts.invalidate(Math.min(old, t)); ts.extendTo(T);
    const E = execs(ts), r = E.get(id); if (!r || r.s !== 'ok' || r.t > t + .5) return false;
    for (const x of trial) { if (x.id === id) continue; const a = E0.get(x.id), c = E.get(x.id); if (a && a.s === 'ok' && (!c || c.s !== 'ok' || c.t > a.t + 1e-6)) return false; } return true; };
  const t0 = o.t;
  if (!ok(t0)) { flash = { id, x: 'waiting: cannot tighten', t: Date.now() + 2500 }; dirty = true; return; }
  let lo = 0, hi = Math.floor(t0); while (lo < hi) { const mid = (lo + hi) >> 1; if (ok(mid)) hi = mid; else lo = mid + 1; }
  if (hi >= t0 - .5 || !ok(hi)) { flash = { id, x: 'already tight', t: Date.now() + 2500 }; dirty = true; return; }
  edit(b, hi, arr => { arr.splice(arr.indexOf(o), 1); o.t = hi; insert(arr, o); });
  flash = { id, x: 'moved from ' + yr(t0), t: Date.now() + 3000 };
}
function undo() { const u = undoStack.pop(); if (!u) return; const b = lane(u.id); if (!b) return; b.orders = JSON.parse(u.orders); sim(b).orders = b.orders; world.edit(b.id, 0); checkEchoes(); dirty = true; }
function describe(o) {
  if (o.k === 'b') return BLD[o.x].n + ' at ' + sname(o.s);
  if (o.k === 'd') return 'Raze a ' + BLD[o.x].n + ' at ' + sname(o.s);
  if (o.k === 'u') return 'Study ' + UPG[o.x].n;
  if (o.k === 's') return 'Settle ' + sname(o.s);
  if (o.k === 'rt') return 'Sing the rite at ' + sname(o.s);
  if (o.k === 'dv') return 'Send a delve down';
  if (o.k === 'rm') return 'Hold the Remembering';
  if (o.k === 'l') return JN[o.x] + ': ' + (o.n == null ? 'fill every post' : 'at most ' + o.n);
  return 'Staff first: ' + o.list.slice(0, 3).map(j => JN[j].toLowerCase()).join(', ') + '…';
}
/* --- lanes --- */
function fork() {
  if (G.br.length >= laneCap()) return toast('<b>No shelf for another lane</b><small>The first step toward any relic opens one. So does finishing a relic, and so does a certain line of study.</small>');
  const p = act(), t = G.cur, orders = p.orders.filter(o => o.t <= t).map(o => ({ ...o, id: G.seq++ }));
  const b = addLane(p.id, t, orders); world.add(b.id, b.orders); checkEchoes(); dirty = true; saveT = 0;
  toast('<b>' + esc(b.name) + '</b><small>Forked from ' + esc(p.name) + ' at year ' + yr(t) + '. Everything before that came with it.</small>');
}
function prune(id) {
  if (G.br.length < 2) return; const b = lane(id); G.pruned.push(b.name);
  G.br = G.br.filter(x => x !== b); world.remove(id); for (const c of G.br) if (c.parent === id) c.parent = null;
  if (G.act === id) G.act = G.br[0].id; undoStack = undoStack.filter(u => u.id !== id); checkEchoes(); dirty = true; saveT = 0;
}
function rename(id, name) { const b = lane(id); name = name.trim().slice(0, 24); if (b && name) { b.name = name; if (/^(errata|palimpsest)$/i.test(name)) latch('drafts'); } renaming = null; dirty = true; saveT = 0; }

/* --- the river (canvas) --- */
const TOP = 40, ROW = 46, OV = 14, WIN = 1000; // OV: height of the whole-history strip; WIN: most years the river shows at once
function getView() { /* the stretch of years the river shows. Its width is WIN, or whatever the player zoomed to; it always moves to keep the cursor in sight */
  const H = Math.max(G.H, 1), w = Math.min(H, G.vw || WIN);
  if (w >= H) return [0, H];
  let a = G.vs == null ? H - w : G.vs;
  if (G.follow) a = H - w; else { if (G.cur < a + w * .04) a = G.cur - w * .04; if (G.cur > a + w * .96) a = G.cur - w * .96; }
  a = Math.max(0, Math.min(H - w, a)); G.vs = a; return [a, a + w];
}
function hatch(c) { if (hatch.p) return hatch.p; const k = document.createElement('canvas'); k.width = k.height = 8; const x = k.getContext('2d'); x.strokeStyle = 'rgba(140,146,148,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 8); x.lineTo(8, 0); x.stroke(); return hatch.p = c.createPattern(k, 'repeat'); }
function fit(cv, Hp) { const W = cv.clientWidth, dpr = window.devicePixelRatio || 1; if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hp * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(Hp * dpr); cv.style.height = Hp + 'px'; } const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, Hp); return [c, W]; }
function drawRiver() {
  const cv = $('cv'), n = G.br.length, Hp = TOP + n * ROW + 6; if (!cv.clientWidth) return;
  const [c, W] = fit(cv, Hp + OV);
  const [v0, v1] = getView();
  { // the whole of history in one thin strip: where the window is, where the cursor is, and the dated things
    const XO = t => t / Math.max(G.H, 1) * W; c.fillStyle = '#1d2930'; c.fillRect(0, 2, W, OV - 6);
    G.br.forEach((b, i) => { const s = sim(b), st = s.at(G.H).st, h = (OV - 6) / G.br.length; c.fillStyle = HUES[b.hue]; c.globalAlpha = .55; c.fillRect(0, 2 + i * h, st.dead ? XO(st.dead) : W, Math.max(1, h - .5)); c.globalAlpha = 1; });
    c.fillStyle = '#d0603f'; for (const t of [700, ...[1, 2, 3].filter(o => o <= mods.mal).map(o => MAL_T[o]), FINAL_T]) if (t <= G.H) c.fillRect(XO(t) - .5, 0, 1.5, OV - 2);
    c.strokeStyle = '#f0d898'; c.lineWidth = 1.5; c.strokeRect(XO(v0) + .75, .75, Math.max(3, XO(v1) - XO(v0) - 1.5), OV - 3.5);
    c.fillStyle = '#e7e0cf'; c.fillRect(XO(G.cur) - 1, 0, 2, OV - 2); }
  c.translate(0, OV);
  const  X = t => (t - v0) / (v1 - v0) * W, T = x => v0 + x / W * (v1 - v0), xH = Math.min(W, X(G.H)), xa = Math.max(0, X(0));
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
  // the bleed: what crosses from lane to lane, later; steeper lines from better-remembered lanes
  c.save(); c.beginPath(); c.rect(0, TOP, xH, Hp - TOP); c.clip();
  G.br.forEach((b, i) => { for (const e of sim(b).emit) { if (e.t > G.H) continue; const x0 = X(e.t), x1 = X(e.t + e.d), y0 = TOP + i * ROW + ROW / 2; if (x1 < 0 || x0 > W) continue;
    c.strokeStyle = e.k === 'tech' ? 'rgba(98,176,163,.4)' : e.k === 'light' ? 'rgba(240,216,152,.95)' : e.k === 'breach' ? 'rgba(208,96,63,.95)' : 'rgba(141,154,156,.6)'; c.lineWidth = e.k === 'tech' ? 1 : 2;
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
function scrubTo(e, strip) {
  const cv = $('cv'), r = cv.getBoundingClientRect(), x = e.clientX - r.left, [v0, v1] = strip ? [0, Math.max(G.H, 1)] : getView(), t = v0 + x / r.width * (v1 - v0);
  if (t >= G.H - (v1 - v0) / r.width * 3) { G.follow = true; G.cur = G.H; } else { G.follow = false; G.cur = Math.max(0, Math.round(t)); }
  dirty = true;
}
/* --- the map (canvas): the active lane's ground at the cursor's year --- */
const WIDE = '(min-width: 1250px) and (min-height: 700px)'; /* on a big enough screen everything fits without scrolling the page */
const PAPER = { paper: [219, 207, 178], sea: [190, 196, 180], ink: [58, 44, 32], wash: .30 };
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
let base = null, baseKey = '', V = null, K = null;
function halo(c, P, x, y, w, h, u) { c.save(); c.shadowColor = rgba(P.paper, .95); c.shadowBlur = u * 3; c.fillStyle = rgba(P.paper, .6); const i = u * 1.2; for (let k = 0; k < 2; k++) c.fillRect(x + i, y + i, Math.max(1, w - 2 * i), Math.max(1, h - 2 * i)); c.restore(); }
function drawBase() {
  const cv = $('map'), cssW = cv.clientWidth, wide = window.matchMedia(WIDE).matches, cssH = Math.round(wide ? Math.max(260, Math.min($('stage').clientHeight - 28, cssW * .7)) : Math.min(680, cssW * .62)), /* never taller than about 10:7 */ dpr = Math.min(1.5, window.devicePixelRatio || 1), W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
  cv.width = W; cv.height = H; cv.style.height = cssH + 'px';
  const S = MAP.sites, P = PAPER, seed = MAP.seed, fog = true; K = { known: G.known, vis: {} }; for (const q of S) if (visible(q.id)) K.vis[q.id] = 1;
  // the sheet shows what has been surveyed, with room around it, and unrolls as more is walked
  let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for (const s of S) if (K.vis[s.id]) { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y); }
  x0 -= .3; x1 += .3; y0 -= .26; y1 += .3; if (K.known[MAP.east] || K.vis[MAP.east]) x1 += .45;
  { const cxm = (x0 + x1) / 2, cym = (y0 + y1) / 2, ar = W / H; let w = Math.max(1.5, x1 - x0), h = Math.max(1.5 / ar, y1 - y0); if (w / h < ar) w = h * ar; else h = w / ar; x0 = cxm - w / 2; x1 = cxm + w / 2; y0 = cym - h / 2; y1 = cym + h / 2; }
  const sc = W / (x1 - x0), ox = -x0 * sc, oy = -y0 * sc;
  V = { W, H, sc, ox, oy, dpr, X: x => x * sc + ox, Y: y => y * sc + oy };
  const off = document.createElement('canvas'); off.width = W; off.height = H; const c = off.getContext('2d'), img = c.createImageData(W, H), D = img.data;
  const strand = S[MAP.east], Gq = MAP.geo, col = k => hex(TER[k].c), cP = col('plain'), cF = col('forest'), cM = col('marsh'), cH = col('hills'), cK = col('peak'), cS = [214, 170, 120];
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // fields at half resolution: distance to the coast, height, wetness, and how well surveyed the spot is
  const hw = (W >> 1) + 2, hh = (H >> 1) + 2, fL = new Float32Array(hw * hh), fE = new Float32Array(hw * hh), fM = new Float32Array(hw * hh), fV = new Float32Array(hw * hh), fS = new Float32Array(hw * hh);
  const lit = []; for (const s of S) { if (K.known[s.id]) lit.push([s.x, s.y, s.x, s.y, .3]); else if (K.vis[s.id]) lit.push([s.x, s.y, s.x, s.y, .1]); for (const e of s.adj) if (e.to > s.id && K.known[s.id] && K.known[e.to]) lit.push([s.x, s.y, S[e.to].x, S[e.to].y, .15]); }
  for (let qy = 0; qy < hh; qy++) for (let qx = 0; qx < hw; qx++) { const mx = (qx * 2 - ox) / sc, my = (qy * 2 - oy) / sc, k = qy * hw + qx;
    fL[k] = Gq.sea(mx, my); fS[k] = Gq.sand(mx, my); fE[k] = Gq.elev(mx, my); fM[k] = Gq.moist(mx, my);
    let v = fog ? 0 : 1; if (fog) { const wob = .07 * fbm(mx * 5 + 2, my * 5, seed + 51); for (const q of lit) { const dx = q[2] - q[0], dy = q[3] - q[1], dd = dx * dx + dy * dy, t = dd ? Math.max(0, Math.min(1, ((mx - q[0]) * dx + (my - q[1]) * dy) / dd)) : 0, d = Math.hypot(mx - q[0] - dx * t, my - q[1] - dy * t) + wob, a = 1 - sm(q[4] - .06, q[4] + .06, d); if (a > v) v = a; } }
    fV[k] = v; }
  const bil = (f, px, py) => { const qx = px >> 1, qy = py >> 1, fx = (px & 1) * .5, fy = (py & 1) * .5, k = qy * hw + qx; return (f[k] * (1 - fx) + f[k + 1] * fx) * (1 - fy) + (f[k + hw] * (1 - fx) + f[k + hw + 1] * fx) * fy; };
  const land = new Float32Array(W * H), vis = new Float32Array(W * H);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const i = py * W + px, L = bil(fL, px, py), g = (hash2(px, py, seed) - .5) * 5; land[i] = L; vis[i] = bil(fV, px, py); let r, gg, b;
    if (L < 0) { const e = bil(fE, px, py), m = bil(fM, px, py);
      let t = [cP[0], cP[1], cP[2]]; const mix = (cc, a) => { t[0] += (cc[0] - t[0]) * a; t[1] += (cc[1] - t[1]) * a; t[2] += (cc[2] - t[2]) * a; };
      mix(cF, sm(Gq.tForest - .03, Gq.tForest + .03, m)); mix(cM, sm(Gq.tMarsh - .03, Gq.tMarsh + .03, m)); mix(cH, sm(Gq.tHill - .04, Gq.tHill + .04, e)); mix(cK, sm(Gq.tPeak - .05, Gq.tPeak + .05, e)); mix(cS, Math.max(sm(-.07, -.015, L), bil(fS, px, py)));
      const a = P.wash * (.8 + .4 * vnoise(px / 26, py / 26, seed + 5)); r = P.paper[0] + (t[0] - P.paper[0]) * a + g; gg = P.paper[1] + (t[1] - P.paper[1]) * a + g; b = P.paper[2] + (t[2] - P.paper[2]) * a + g;
      if (L > -.008) { r += (P.ink[0] - r) * .85; gg += (P.ink[1] - gg) * .85; b += (P.ink[2] - b) * .85; }
    } else { r = P.sea[0] + g; gg = P.sea[1] + g; b = P.sea[2] + g; const band = L * sc / dpr; if (band < 30 && Math.floor(band) % 7 === 3) { const k = .32 * (1 - band / 30); r += (P.ink[0] - r) * k; gg += (P.ink[1] - gg) * k; b += (P.ink[2] - b) * k; } }
    const q = i * 4; D[q] = r; D[q + 1] = gg; D[q + 2] = b; D[q + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  const u = Math.min(W / 2.9, H / 1.75) * .011, ink = a => rgba(P.ink, a), R = rng(seed ^ 0x5bd1e995); V.u = u;
  c.lineCap = 'round'; c.lineJoin = 'round';
  // rivers: inked banks on land, open water running straight out into the sea
  for (const pass of [0, 1]) for (const pts of Gq.rivers) { const n = pts.length, wAt = i => sc * .0142 * (.3 + .9 * i / n);
    for (let i = 0; i + 1 < n; i += 6) { const j = Math.min(n - 1, i + 7), sea = Gq.sea(pts[Math.min(n - 1, i + 3)][0], pts[Math.min(n - 1, i + 3)][1]) > -.004; if (!pass && sea) continue;
      c.beginPath(); for (let k = i; k <= j; k++) { const x = V.X(pts[k][0]), y = V.Y(pts[k][1]); if (k === i) c.moveTo(x, y); else c.lineTo(x, y); } c.lineWidth = wAt(i) + (pass ? 0 : sc * .01); c.strokeStyle = pass ? rgba(P.sea, 1) : ink(.6); c.stroke(); } }
  // terrain signs, scattered by what the ground actually is at each spot
  const GLY = {
    forest(x, y, s) { c.beginPath(); c.arc(x, y - 3 * s, 2.6 * s, Math.PI * .9, Math.PI * 2.1); c.arc(x + 1.6 * s, y - 1.4 * s, 2 * s, -1.2, 1.5); c.arc(x - 1.6 * s, y - 1.2 * s, 2 * s, 1.6, 4.3); c.fillStyle = rgba(P.paper, .9); c.fill(); c.stroke(); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 2.6 * s); c.stroke(); },
    hills(x, y, s) { c.beginPath(); c.moveTo(x - 5 * s, y); c.quadraticCurveTo(x, y - 6 * s, x + 5 * s, y); c.stroke(); for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x + (1 + i * 1.4) * s, y - (2.6 - i * .9) * s); c.lineTo(x + (2.2 + i * 1.4) * s, y - .3 * s); c.stroke(); } },
    peak(x, y, s) { c.beginPath(); c.moveTo(x - 6 * s, y); c.lineTo(x - .5 * s, y - 10 * s); c.lineTo(x + 1.5 * s, y - 6.5 * s); c.lineTo(x + 3 * s, y - 8 * s); c.lineTo(x + 7 * s, y); c.fillStyle = rgba(P.paper, .9); c.fill(); c.stroke(); for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x + (.2 + i * .9) * s, y - (8.2 - i * 1.7) * s); c.lineTo(x + (1.6 + i * 1.1) * s, y - .6 * s); c.stroke(); } },
    plain(x, y, s) { for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + i * 1.6 * s, y); c.lineTo(x + i * 2.6 * s, y - 3.2 * s); c.stroke(); } },
    marsh(x, y, s) { c.beginPath(); c.moveTo(x - 4 * s, y); c.lineTo(x + 4 * s, y); c.stroke(); for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + i * 1.8 * s, y); c.lineTo(x + i * 2.2 * s, y - (3 - Math.abs(i)) * s); c.stroke(); } },
    ruins(x, y, s) { c.beginPath(); c.moveTo(x - 3 * s, y); c.lineTo(x - 3 * s, y - 6 * s); c.moveTo(x, y); c.lineTo(x, y - 4 * s); c.moveTo(x + 3 * s, y); c.lineTo(x + 3 * s, y - 2.2 * s); c.moveTo(x - 3.8 * s, y - 6 * s); c.lineTo(x + .8 * s, y - 6 * s); c.moveTo(x - 4.5 * s, y); c.lineTo(x + 5 * s, y); c.stroke(); },
    shore(x, y, s) { c.beginPath(); c.arc(x, y, .5 * s, 0, 7); c.arc(x + 2.5 * s, y + s, .5 * s, 0, 7); c.fillStyle = ink(.6); c.fill(); }
  };
  const gap = { forest: .026, hills: .042, peak: .06, plain: .042, marsh: .04, shore: .045 }, marks = [], cell = new Map(), key = (x, y) => Math.floor(x / .06) + ',' + Math.floor(y / .06);
  const mx0 = (0 - ox) / sc, mx1 = (W - ox) / sc, my0 = (0 - oy) / sc, my1 = (H - oy) / sc;
  for (let t = 0; t < 9000; t++) { const mx = mx0 + R() * (mx1 - mx0), my = my0 + R() * (my1 - my0), ter = Gq.cls(mx, my); if (Gq.sea(mx, my) > -.012) continue; if (ter === 'plain' && R() < .45) continue;
    if (S.some(q => Math.hypot(q.x - mx, q.y - my - .012) < .05)) continue;
    let near = false; for (const q of S) { for (const e of q.adj) if (e.to > q.id) { const o = S[e.to], dx = o.x - q.x, dy = o.y - q.y, tt = Math.max(0, Math.min(1, ((mx - q.x) * dx + (my - q.y) * dy) / (dx * dx + dy * dy))); if (Math.hypot(mx - q.x - dx * tt, my - q.y - dy * tt) < .02) { near = true; break; } } if (near) break; } if (near) continue;
    const gx = Math.floor(mx / .06), gy = Math.floor(my / .06); let clash = false; for (let a = -1; a <= 1 && !clash; a++) for (let b = -1; b <= 1 && !clash; b++) for (const m of cell.get((gx + a) + ',' + (gy + b)) || []) if (Math.hypot(m[0] - mx, m[1] - my) < Math.max(gap[ter], gap[m[2]]) ) { clash = true; break; } if (clash) continue;
    const m = [mx, my, ter, .8 + R() * .5]; marks.push(m); const kk = key(mx, my); if (!cell.has(kk)) cell.set(kk, []); cell.get(kk).push(m); }
  for (const s of S) if (s.ruin) for (let i = 0; i < 4; i++) marks.push([s.x + (R() - .5) * .16, s.y + (i < 2 ? -.06 : .075) + (R() - .5) * .03, 'ruins', 1 + R() * .3]);
  marks.sort((a, b) => a[1] - b[1]); c.lineWidth = Math.max(1, sc * .0026); c.strokeStyle = ink(.62);
  for (const [mx, my, ter, sz] of marks) GLY[ter](V.X(mx), V.Y(my), sc * .0071 * sz);
  // roads
  c.font = 'italic ' + Math.round(u * 3.3) + 'px "IM Fell English", Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const s of S) for (const e of s.adj) { if (e.to < s.id) continue; const o = S[e.to], both = K.known[s.id] && K.known[o.id];
    const xa = V.X(s.x), ya = V.Y(s.y), xb = V.X(o.x), yb = V.Y(o.y), nx = -(yb - ya), ny = xb - xa, nl = Math.hypot(nx, ny), w = (hash2(s.id, o.id, seed) - .5) * .16, cx2 = (xa + xb) / 2 + nx * w, cy2 = (ya + yb) / 2 + ny * w;
    c.setLineDash([u * 1.9, u * 1.5]); c.lineWidth = u * .5; c.strokeStyle = ink(.9); c.beginPath(); c.moveTo(xa, ya); c.quadraticCurveTo(cx2, cy2, xb, yb); c.stroke(); c.setLineDash([]);
    if (both || !fog) { const lx = (xa + xb) / 2 + nx * w * .5 + nx / nl * u * 3, ly = (ya + yb) / 2 + ny * w * .5 + ny / nl * u * 3; halo(c, P, lx - u * 3.4, ly - u * 2.6, u * 6.8, u * 5.2, u); c.fillStyle = ink(.85); c.fillText(e.len, lx, ly); } }
  // the unsurveyed: everything drawn so far fades back to bare paper, with a soft uneven edge
  if (fog) { const im = c.getImageData(0, 0, W, H), d = im.data; for (let i = 0; i < W * H; i++) { const v = vis[i]; if (v >= .999) continue; const q = i * 4, g = (hash2(i % W, (i / W) | 0, seed) - .5) * 5; d[q] = P.paper[0] + g + (d[q] - P.paper[0] - g) * v; d[q + 1] = P.paper[1] + g + (d[q + 1] - P.paper[1] - g) * v; d[q + 2] = P.paper[2] + g + (d[q + 2] - P.paper[2] - g) * v; } c.putImageData(im, 0, 0); }
  // furniture: a name for the sea, a rose, a scale, and one thing that should not be there
  c.fillStyle = ink(.5); c.font = 'italic ' + Math.round(u * 5) + 'px "IM Fell English", Georgia, serif';
  c.save(); c.translate(W - u * 11, H / 2); c.rotate(-Math.PI / 2); c.fillText('T H E   A S H E N   S E A', 0, 0); c.restore();
  const rx = u * 15, ry = H - u * 17; c.fillStyle = rgba(P.paper, .7); c.beginPath(); c.arc(rx, ry, u * 9, 0, 7); c.fill(); c.strokeStyle = ink(.6); c.lineWidth = u * .5; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, l = i % 2 ? u * 3.5 : u * 7; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx + Math.sin(a) * l, ry - Math.cos(a) * l); c.lineTo(rx + Math.sin(a + .35) * l * .35, ry - Math.cos(a + .35) * l * .35); c.closePath(); c.stroke(); } c.font = Math.round(u * 4) + 'px "IM Fell English SC", Georgia, serif'; c.fillStyle = ink(.7); c.fillText('N', rx, ry - u * 9.5);
  const bar = 50 / 110 * sc, bx = u * 28, byy = H - u * 11; halo(c, P, bx - u * 3, byy - u * 5, bar + u * 6, u * 12, u); c.strokeStyle = ink(.7); c.lineWidth = u * .6; c.beginPath(); c.moveTo(bx, byy - u * 2); c.lineTo(bx, byy); c.lineTo(bx + bar, byy); c.lineTo(bx + bar, byy - u * 2); c.moveTo(bx + bar / 2, byy); c.lineTo(bx + bar / 2, byy - u * 1.4); c.stroke(); c.fillStyle = ink(.7); c.font = 'italic ' + Math.round(u * 3.4) + 'px "IM Fell English", Georgia, serif'; c.fillText('fifty years’ walk', bx + bar / 2, byy + u * 3.4);
  for (let t = 0; t < 400; t++) { const mx = mx1 - .06 - R() * .2, my = my0 + .15 + R() * (my1 - my0 - .3); if (Gq.sea(mx, my) > .1 && Math.abs(my - strand.y) > .12 && Math.abs(V.Y(my) - H / 2) > u * 40) { const x = V.X(mx), y = V.Y(my); c.strokeStyle = ink(.5); c.lineWidth = u * .6; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + i * u * 5.5, y, u * (2.4 - i * .5), Math.PI, 0); c.stroke(); } c.beginPath(); c.moveTo(x - u * 2.4, y); c.quadraticCurveTo(x - u * 5, y - u * 4, x - u * 6.5, y - u * 2.2); c.stroke(); break; } }
  c.strokeStyle = ink(.5); c.lineWidth = u * .5; c.strokeRect(u * 3, u * 3, W - u * 6, H - u * 6); c.lineWidth = u * 1.1; c.strokeRect(u * 5, u * 5, W - u * 10, H - u * 10);
  c.textAlign = 'left'; const tw = u * 62; halo(c, P, u * 6, u * 6, tw, u * 16, u); c.fillStyle = ink(.85); c.font = Math.round(u * 6.5) + 'px "IM Fell English SC", Georgia, serif'; c.fillText('The Valley', u * 9, u * 12); c.font = 'italic ' + Math.round(u * 3.6) + 'px "IM Fell English", Georgia, serif'; c.fillStyle = ink(.6); c.fillText('as far as any lane has walked it', u * 9, u * 17);
  base = off;
}

function drawMap() {
  const cv = $('map'); if (!cv.clientWidth) return;
  const key = MAP.seed + '|' + Object.keys(G.known).join(',') + '|' + cv.clientWidth + '|' + (window.matchMedia(WIDE).matches ? $('stage').clientHeight : 0) + '|' + (G.echo.optics ? 1 : 0);
  if (key !== baseKey) { baseKey = key; drawBase(); }
  const c = cv.getContext('2d'), P = PAPER, S = MAP.sites, u = V.u, ink = a => rgba(P.ink, a), b = act(), st = sim(b).at(G.cur).st, lane = INKS[b.hue];
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(base, 0, 0); c.lineCap = 'round'; c.textAlign = 'center'; c.textBaseline = 'middle';
  // other lanes show through as small scratched houses
  if (G.echo.glass) G.br.forEach((o, gi) => { if (o === b) return; const so = sim(o).at(G.cur).st, side = gi % 2 ? 1 : -1; c.strokeStyle = INKS[o.hue]; c.globalAlpha = .6; c.lineWidth = u * .45;
    for (const id in so.own) { if (+id === 0 || !visible(+id)) continue; const s = S[id], g = u * .6, x = V.X(s.x) + side * u * (4.6 + (gi > 2 ? 2.4 : 0)), y = V.Y(s.y) - u * 3.8; c.beginPath(); c.moveTo(x - g * 2.4, y + g * 2); c.lineTo(x - g * 2.4, y - g); c.lineTo(x, y - g * 3); c.lineTo(x + g * 2.4, y - g); c.lineTo(x + g * 2.4, y + g * 2); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(x - g * 3.4, y + g * .8); c.lineTo(x + g * 3.4, y - g * .8); c.stroke(); } c.globalAlpha = 1; });
  for (const k in st.hp) { const from = S[st.hp[k]], to = S[k], t0 = st.ha[from.id]; if (t0 === undefined || G.cur - t0 > 90 || (!visible(from.id) && !visible(to.id))) continue; // the roads the Host took, mapped or not
    const xa = V.X(from.x), ya = V.Y(from.y), xb = V.X(to.x), yb = V.Y(to.y), a = Math.atan2(yb - ya, xb - xa), stop = st.hb[k] !== undefined; c.strokeStyle = c.fillStyle = '#b0401f'; c.lineWidth = u * .9; c.globalAlpha = .75; c.beginPath(); c.moveTo(xa, ya); c.lineTo(xb, yb); c.stroke();
    const mx = xa + (xb - xa) * .6, my = ya + (yb - ya) * .6; c.beginPath(); c.moveTo(mx + Math.cos(a) * u * 2.2, my + Math.sin(a) * u * 2.2); c.lineTo(mx + Math.cos(a + 2.5) * u * 2, my + Math.sin(a + 2.5) * u * 2); c.lineTo(mx + Math.cos(a - 2.5) * u * 2, my + Math.sin(a - 2.5) * u * 2); c.closePath(); c.fill(); if (stop) { c.lineWidth = u * 1.2; c.beginPath(); c.moveTo(xb + Math.cos(a + 1.57) * u * 4 - Math.cos(a) * u * 4, yb + Math.sin(a + 1.57) * u * 4 - Math.sin(a) * u * 4); c.lineTo(xb - Math.cos(a + 1.57) * u * 4 - Math.cos(a) * u * 4, yb - Math.sin(a + 1.57) * u * 4 - Math.sin(a) * u * 4); c.stroke(); } c.globalAlpha = 1; }
  for (const s of S) { if (!visible(s.id)) continue; const x = V.X(s.x), y = V.Y(s.y), R = u * (s.id ? 2.7 : 3.3), own = st.own[s.id], col = TER[s.ter].c;
    if (s.shore) { c.setLineDash([u * 1.4, u * 1.4]); c.lineWidth = u * .8; c.strokeStyle = G.H >= 700 ? '#b0401f' : ink(.6); c.beginPath(); c.arc(x, y, R * .8, 0, 7); c.stroke(); c.setLineDash([]); if (st.ha[s.id] !== undefined && G.cur - st.ha[s.id] < 60) { c.beginPath(); c.arc(x, y, R * .4, 0, 7); c.fillStyle = '#b0401f'; c.fill(); } }
    else { c.beginPath(); c.arc(x, y, R, 0, 7); c.fillStyle = own ? col : rgba(P.paper, 1); c.fill(); c.lineWidth = u * (own ? .8 : .5); c.strokeStyle = own ? lane : ink(.9); c.stroke();
      if (!s.id) { c.beginPath(); c.arc(x, y, R + u * 1.2, 0, 7); c.lineWidth = u * .4; c.stroke(); }
      c.font = '500 ' + Math.round(u * 3.4) + 'px "Alegreya Sans", sans-serif'; c.fillStyle = own ? '#10171a' : G.rumor[s.id] && !G.known[s.id] ? '#a23c22' : ink(.75);
      if (own) { let n = 0; for (const k in st.sb[s.id]) n += st.sb[s.id][k]; c.fillText(n, x, y + u * .2); if (st.sb[s.id].palisade) { c.strokeStyle = ink(1); c.lineWidth = u * .9; c.beginPath(); c.arc(x, y, R + u * 1, .6, 2.54); c.stroke(); } if (st.sb[s.id].lazaret) { c.fillStyle = '#1f6f63'; c.fillRect(x - R - u * 1.8, y - u * 1.2, u * 1.4, u * 2.4); } }
      else if (!G.known[s.id]) c.fillText(G.rumor[s.id] ? '!' : '?', x, y + u * .2);
      const pj = st.proj.find(p => p.x === 'settle' && p.s === s.id); if (pj) { c.beginPath(); c.arc(x, y, R + u * 1.3, -1.57, -1.57 + 6.283 * Math.min(1, (G.cur - pj.t0) / (pj.done - pj.t0))); c.lineWidth = u * .9; c.strokeStyle = lane; c.stroke(); }
      if (st.ha[s.id] !== undefined && G.cur - st.ha[s.id] < 60) { c.strokeStyle = '#b0401f'; c.lineWidth = u * .7; c.setLineDash([u * 1.4, u]); c.beginPath(); c.arc(x, y, R + u * 2.6, 0, 7); c.stroke(); c.setLineDash([]); }
      if (st.lost[s.id]) { c.strokeStyle = '#b0401f'; c.lineWidth = u * .9; c.beginPath(); c.moveTo(x - R, y - R); c.lineTo(x + R, y + R); c.moveTo(x + R, y - R); c.lineTo(x - R, y + R); c.stroke(); }
      // what is known to be under the place
      const bx = x + R * 1.05, by = y - R * 1.05, ri = MAP.rites.indexOf(s.id); c.lineWidth = u * .55;
      if (s.feat === 'dun' && G.known[s.id]) { c.strokeStyle = ink(1); c.beginPath(); c.moveTo(bx - u * 1.6, by - u * 1.2); c.lineTo(bx - u * .5, by - u * 1.2); c.lineTo(bx - u * .5, by); c.lineTo(bx + u * .6, by); c.lineTo(bx + u * .6, by + u * 1.2); c.lineTo(bx + u * 1.7, by + u * 1.2); c.stroke(); }
      else if (ri >= 0 && ri < G.trail) { const next = ri === st.rite, done = ri < st.rite; c.strokeStyle = c.fillStyle = next ? '#a23c22' : ink(done ? 1 : .7); c.beginPath(); c.arc(bx, by, u * 1.5, Math.PI, 0); c.lineTo(bx + u * 1.9, by + u * .9); c.lineTo(bx - u * 1.9, by + u * .9); c.closePath(); if (done) c.fill(); c.stroke(); c.beginPath(); c.arc(bx, by + u * 1.6, u * .45, 0, 7); c.fill(); }
      else if (s.feat === 'pit' && G.known[s.id]) { c.strokeStyle = '#b0401f'; c.beginPath(); c.arc(bx, by, u * 1.3, 0, 7); c.moveTo(bx - u * .8, by - u * .8); c.lineTo(bx + u * .8, by + u * .8); c.moveTo(bx + u * .8, by - u * .8); c.lineTo(bx - u * .8, by + u * .8); c.stroke(); }
      else if (s.feat && s.feat !== 'rite' && G.known[s.id]) { c.beginPath(); c.arc(bx, by, u * .8, 0, 7); c.fillStyle = '#1f6f63'; c.fill(); } }
    if (s.id === G.sel) { c.beginPath(); c.arc(x, y, R + u * 2.4, 0, 7); c.lineWidth = u * .6; c.strokeStyle = '#a23c22'; c.stroke(); }
    const nm = s.shore ? (G.H >= 700 ? 'The Ashen Strand' : 'An empty strand') : s.name; c.font = (s.id ? 'italic ' : '') + Math.round(u * (s.id ? 3.7 : 4.4)) + 'px ' + (s.id ? '"IM Fell English"' : '"IM Fell English SC"') + ', Georgia, serif';
    const w = c.measureText(nm).width, ly = y + R + u * 3.1; halo(c, P, x - w / 2 - u * 2, ly - u * 2.8, w + u * 4, u * 5.6, u); c.fillStyle = s.shore ? '#b0401f' : ink(s.id === G.sel ? 1 : .9); c.fillText(nm, x, ly); }
}
function pickSite(e) { const cv = $('map'), r = cv.getBoundingClientRect(), k = cv.width / r.width, x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k; let best = -1, bd = V.u * 7; for (const S of MAP.sites) { if (!visible(S.id)) continue; const d = Math.hypot(V.X(S.x) - x, V.Y(S.y) - y); if (d < bd) { bd = d; best = S.id; } } if (best >= 0) { G.sel = best; dirty = true; } }
/* --- panels --- */
function costHTML(c, v) { /* a colour means nothing until the resource panel has a line in that colour, so a cost in something this lane has none of is spelled out */
  let h = ''; for (const r in c) { const none = r !== 'food' && r !== 'wood' && !(v[r] > .05); h += '<span class="c' + (v[r] < c[r] - 1e-6 ? ' no' : '') + '" title="' + RN[r] + '"><i style="background:' + RC[r] + '"></i>' + fmt(c[r]).replace('.0', '') + (none ? ' ' + RN[r].toLowerCase() : '') + '</span>'; } return h; }
const canPay = (c, v) => Object.keys(c).every(r => v[r] >= c[r] - 1e-6);
function renderLanes() {
  if (renaming != null) return;
  let h = '<div class="lhead" title="Fork a lane to start another. The first step toward any relic makes room for one more.">' + (G.br.length > 1 ? G.br.length + ' lanes' : '1 lane') + ' · the shelf holds ' + laneCap() + '</div>';
  for (const b of G.br) {
    const V = sim(b).at(G.cur), on = b.id === G.act, r = bleedDelay(V.v.mem);
    h += '<div class="lane' + (on ? ' on' : '') + '" data-a="sel" data-id="' + b.id + '" style="--h:' + HUES[b.hue] + '"><b>' + esc(b.name) + '</b><small>' +
      (V.st.dead ? 'ended ' + yr(V.st.dead) : V.st.pop + ' people · heard in ' + Math.round(r) + ' yr') + '</small><span class="lt">' +
      '<button data-a="ren" data-id="' + b.id + '" title="Rename this lane" aria-label="Rename">✎</button>' +
      (G.br.length > 1 ? '<button data-a="prune" data-id="' + b.id + '" title="Prune this lane" class="' + (pruneAsk === b.id ? 'ask' : '') + '">' + (pruneAsk === b.id ? 'prune?' : '✕') + '</button>' : '') + '</span></div>';
  }
  setHTML('lanes', h);
}
function incoming(b) { /* what is already on its way to this lane: emitted behind the horizon, arriving after the cursor */
  const out = []; for (const o of G.br) if (o !== b) for (const e of sim(o).emit) if (e.t <= G.H && e.t + e.d > G.cur) out.push({ ...e, ta: e.t + e.d, from: o.name });
  return out.sort((a, b) => a.ta - b.ta);
}
function renderState(b, V) {
  const st = V.st, d = V.d;
  let h = '<div class="civ"><h2>' + civName(b) + '</h2><p>' + esc(b.name) + ' lane · year ' + yr(G.cur) + ' · ' + era(st) + '</p></div>';
  if (st.dead) h += '<div class="fallen"><b>Ended in year ' + yr(st.dead) + '</b>' + (st.by === 'The Unwriting' ? 'This lane met the Unwriting without all three relics, its own or lit from another lane.' : st.by + ' ended this lane at Hearthford.') + ' Drag the cursor back and prepare.</div>';
  else {
    const g = V.seg.starving ? '<span class="bad">famine</span>' : st.pop > d.housing ? '<span class="bad">' + (st.pop - d.housing) + ' unhoused, leaving</span>' : st.fam ? '<span class="bad">hungry: farms are staffed first</span>' : st.pop >= d.housing ? 'housing is full' : st.grow < Infinity ? 'next birth in ' + Math.max(0, st.grow - G.cur).toFixed(0) + ' yr' : '';
    h += '<div class="people"><b>' + st.pop + '</b> people <span class="dim">of ' + d.housing + ' housed</span><span class="g">' + g + '</span></div>';
    if (st.night) h += '<div class="clim">The Sunless Years. Farms yield a quarter, for ' + Math.ceil(st.night - G.cur) + ' more years.</div>';
    if (st.forget < Infinity) h += '<div class="clim">The Forgetting. The newest thing known goes in ' + Math.ceil(st.forget - G.cur) + ' yr' + (busy(st, 'remember') ? '; the Remembering ends it in ' + Math.ceil(st.proj.find(p => p.x === 'remember').done - G.cur) + ' yr.' : ', and again every ' + FORGET_EVERY + ' after. Hold a Remembering (Study tab).') + '</div>';
    if (!st.night && V.clim < .995) h += '<div class="clim">Failing harvests. Farms yield ' + Math.round(V.clim * 100) + '%.</div>';
    if (st.depth > 0 && !st.rel.sword) h += '<div class="clim' + (V.seg.held ? ' ok' : '') + '">The stair: ' + st.depth + ' floors open, ' + V.w.guard + ' of ' + st.depth + ' guards standing' + (V.seg.held ? '. Held.' : V.mode.arms === 'empty' && V.w.guard >= st.depth ? ', with nothing in their hands. Breach in ' + Math.ceil(st.breach - G.cur) + ' yr.' : '. Breach in ' + Math.ceil(st.breach - G.cur) + ' yr.') + '</div>';
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
  h += '<p class="heard">This lane holds ' + fmt(V.v.mem) + ' Memory, so what it does now reaches the others in <b>' + Math.round(bleedDelay(V.v.mem)) + ' years</b>' + (G.cur + bleedDelay(V.v.mem) > FINAL_T ? ', which is after the Unwriting.' : '.') + '</p>';
  if (G.echo.stair || G.trail || G.echo.glass) {
    h += '<div class="relics">'; const prog = { sword: st.depth ? 'floor ' + st.depth + ' of ' + FLOORS : G.echo.stair ? 'the Undercroft' : 'unknown', bell: st.rite ? st.rite + ' of 4 rites' : G.trail ? 'the hollows' : 'unknown', lens: st.up.margin || st.up.parallax ? 'one line done' : st.up.glass || st.up.annals ? 'in study' : G.echo.glass ? 'two lines of study' : 'unknown' };
    for (const k in RK) { const own = st.rel[k], lit = !own && has(st, k); h += '<span class="' + (own ? 'own' : lit ? 'lit' : '') + '" title="' + RELIC[k].buff + '"><b>' + RK[k] + '</b>' + (own ? 'made here' : lit ? 'lit from another lane' : prog[k]) + '</span>'; } h += '</div>'; }
  if (!st.dead) { const prep = [, 'a lazaret at every site worth keeping', REMEMBER_C + ' lore for a Remembering', 'full granaries'], due = []; for (let o = 1; o <= mods.mal; o++) if (!st.mal[o] && MAL_T[o] > G.cur && (G.H >= MAL_T[o] - 45 || G.echo.margin)) due.push('<li class="sleeper"><span class="y">' + MAL_T[o] + '</span><span>' + MALADY[o] + (G.H >= MAL_T[o] || G.echo.margin ? ': ' + prep[o] : ': something is coming') + '</span><small>every lane</small></li>');
    if (due.length) h += '<h3>Let in by the relics</h3><ul class="inc">' + due.join('') + '</ul>'; }
  const inc = st.dead ? [] : incoming(b).filter(e => !(e.k === 'tech' && st.up[e.x])).slice(0, 6);
  if (inc.length) { h += '<h3>Bleeding through <span class="dim">from other lanes</span></h3><ul class="inc">';
    for (const e of inc) { let x; if (e.k === 'tech') x = UPG[e.x].n + ', already paid for'; else if (e.k === 'light') x = 'Light of ' + RELIC[e.x].n + '. ' + RELIC[e.x].buff; else if (e.k === 'breach') x = 'What came up another lane\'s stair: have ' + BREACH_ARMS + ' arms ready'; else x = 'The light of ' + RELIC[e.x].n + ' goes out';
      h += '<li class="' + (e.k === 'breach' ? 'sleeper' : e.k) + '"><span class="y">' + yr(e.ta) + '</span><span>' + x + '</span><small>' + esc(e.from) + '</small></li>'; } h += '</ul>'; }
  setHTML('pState', h);
}
function renderJobs(V) {
  const st = V.st, d = V.d; if (st.dead) { setHTML('pWork', '<p class="dim">A lane that has ended does no work.</p>'); return setHTML('pStudy', ''); }
  let h = '<h3>Work <span class="dim">top of the list is staffed first, best ground first</span></h3><table class="jobs">';
  st.prio.forEach((j, i) => {
    const sl = d.slots[j]; if (!sl) return; const lim = st.lim[j];
    h += '<tr><td class="ud"><button data-a="up" data-x="' + j + '" title="Staff earlier" aria-label="Move up"' + (i ? '' : ' disabled') + '>▲</button><button data-a="dn" data-x="' + j + '" title="Staff later" aria-label="Move down"' + (i < st.prio.length - 1 ? '' : ' disabled') + '>▼</button></td>' +
      '<td><b>' + JN[j] + '</b><small>' + JD[j] + '</small></td><td class="num">' + V.w[j] + '<span class="dim"> / ' + (j === 'guard' ? Math.min(sl, st.rel.sword ? 0 : st.depth) + ' needed' : sl) + '</span></td>' +
      '<td class="lim"><button data-a="lim" data-x="' + j + '" data-d="-1" title="Allow one fewer" aria-label="Fewer">−</button><span title="Most this lane will put here">' + (lim == null ? 'all' : lim) + '</span><button data-a="lim" data-x="' + j + '" data-d="1" title="Allow one more" aria-label="More">+</button></td></tr>';
  });
  h += '<tr><td></td><td><b>' + JN.forager + '</b><small>' + JD.forager + '</small></td><td class="num">' + V.w.forager + '</td><td class="dim">everyone else</td></tr></table>';
  const others = st.proj.filter(p => !UPG[p.x]);
  if (others.length) { h += '<h3>Under way</h3>'; for (const p of others) h += '<div class="proj"><span>' + (p.x === 'settle' ? 'Settlers walking to ' + sname(p.s) : p.x === 'rite' ? 'The rite at ' + sname(p.s) : p.x === 'remember' ? 'The Remembering' : 'A delve, below') + '</span><span class="dim">' + Math.max(0, p.done - G.cur).toFixed(0) + ' yr</span><div><i style="width:' + (100 * Math.min(1, (G.cur - p.t0) / (p.done - p.t0))).toFixed(1) + '%"></i></div></div>'; }
  const cur = st.proj.find(p => UPG[p.x]), queued = st.pend.map(id => sim(act()).order(id)).filter(o => o && o.k === 'u');
  setHTML('pWork', h);
  h = '<h3>Study <span class="dim">one thing at a time</span><button class="mini" data-a="tree">The whole tree</button></h3>';
  const fgIn = mods.mal >= 2 && !st.mal[2] && (G.H >= MAL_T[2] || G.echo.margin);
  if ((st.forget < Infinity || fgIn) && !busy(st, 'remember')) { const c = costOf(st, { k: 'rm' }, mods); h += '<div class="grid one"><button class="w wide settle' + (st.forget < Infinity && canPay(c, V.v) ? '' : ' short') + '" data-a="rm"><b>Hold the Remembering<span class="n">' + rememberTime(st) + ' yr</span></b><span class="cost">' + costHTML(c, V.v) + '</span><small>Ends the Forgetting. It does not use the lane\'s one line of study. Each Scriptorium takes ten years off it.' + (st.forget < Infinity ? '' : ' Ordered now, it waits and begins the year the Forgetting arrives.') + '</small></button></div>'; }
  if (cur) h += '<div class="proj"><span>' + UPG[cur.x].n + '</span><span class="dim">' + Math.max(0, cur.done - G.cur).toFixed(0) + ' yr</span><div><i style="width:' + (100 * Math.min(1, (G.cur - cur.t0) / (cur.done - cur.t0))).toFixed(1) + '%"></i></div></div>';
  if (queued.length) h += '<p class="dim q">' + (cur ? 'Waiting their turn: ' + queued.map(o => UPG[o.x].n).join(', ') : 'Ordered and waiting: ' + queued.map(o => UPG[o.x].n + ' (' + whyWait(st, V.v, o) + ')').join(', ')) + '.</p>';
  let up = '';
  for (const x in UPG) { const U = UPG[x]; if (st.up[x] || (cur && cur.x === x) || queued.some(o => o.x === x) || (U.relic && st.rel[U.relic])) continue; if (!(U.pre || []).every(p => st.up[p]) || (U.req && !U.req(st, mods))) continue; const c = costOf(st, { k: 'u', x }, mods), at = DISCSRC[x] && MAP.sites.find(q => q.feat === DISCSRC[x]);
    up += '<button class="w wide' + (canPay(c, V.v) && !cur ? '' : ' short') + (at ? ' found' : '') + (U.relic ? ' reg' : '') + '" data-a="u" data-x="' + x + '"><b>' + (at ? '<span class="tag">found at ' + at.name + '</span>' : '') + U.n + '<span class="n">' + U.t + ' yr</span></b><span class="cost">' + costHTML(c, V.v) + '</span><small>' + U.d + '</small></button>'; }
  if (!G.echo.pit && MAP.hasPit && G.seenMal >= 1 && !st.up.quar) up += '<div class="w wide locked"><b>Quarantine<span class="n">nobody knows how</span></b><small>The Plague is an old sickness. Somewhere in the valley its dead are buried, and people who lived over them would learn what it does. Settlers next door to such a place hear about it: watch the Chronicle and the map for a rumour.</small></div>';
  if (up) h += '<div class="grid one">' + up + '</div>'; else if (!cur) h += '<p class="dim">Nothing this lane can study yet. Lore, awe and bronze open most doors.</p>';
  const known = Object.keys(st.up); if (known.length) h += '<h3>Known <span class="dim">' + known.length + '</span></h3><p class="tags">' + known.map(k => '<span>' + UPG[k].n + '</span>').join('') + '</p>';
  setHTML('pStudy', h);
}
const DISCSRC = { terracing: 'hint_terrace', milling: 'hint_mill', archives: 'hint_lib', liturgy: 'hint_temple', casting: 'hint_foundry', quar: 'pit', delving: 'dun' };
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
function renderSite(V) {
  const st = V.st, s = visible(G.sel) ? G.sel : 0, S = MAP.sites[s], T = TER[S.ter], own = st.own[s], d = V.d, ri = MAP.rites.indexOf(s), riteKnown = ri >= 0 && ri < G.trail;
  if (S.shore) return setHTML('pSite', '<div class="civ"><h2>' + (G.H >= 700 ? S.name : 'An empty strand') + '</h2><p>Shingle and wind · nothing can be built here</p></div><p class="feat' + (G.H >= 700 ? ' bad' : '') + '">' + (G.H >= 700 ? 'The Ashen Host lands here in year 700 and takes every road out. In this lane, at the cursor\'s year: ' + S.adj.map(e => (visible(e.to) ? sname(e.to) : 'a road to somewhere unmapped') + (st.own[e.to] ? (st.sb[e.to].palisade ? ' (held, palisade)' : ' (settled, no palisade)') : ' (open ground, it walks straight through)')).join('; ') + '. One closed road does not close the others: it goes round.' : 'A long empty beach facing east. No fresh water, no soil. Settlers will not go.') + '</p>');
  let h = '<div class="civ"><h2>' + S.name + '</h2><p>' + T.n + (T.fav.length ? ' · good ground for ' + T.fav.map(j => JN[j].toLowerCase()).join(' and ') : ' · good ground for nothing') + (s ? ' · ' + S.dist + ' yr from home' : ' · home') + '</p></div>';
  const ft = !G.known[s] ? (riteKnown ? FEAT.rite : G.rumor[s] ? 'Rumour: ' + rumour(S) : 'No lane has lived here yet, so the Archive cannot say what is under it.') : S.feat === 'rite' ? (riteKnown ? FEAT.rite : 'Nothing unusual under it, as far as anyone has noticed.') : S.feat ? FEAT[S.feat] : s ? 'Nothing unusual under it.' : 'Where the four of them started.';
  h += '<p class="feat' + (G.known[s] && S.feat === 'pit' ? ' bad' : '') + '">' + ft + '</p>';
  if (st.dead) return setHTML('pSite', h + '<p class="dim">A lane that has ended takes no orders.</p>');
  const pj = st.proj.find(p => p.x === 'settle' && p.s === s);
  if (st.lost[s]) h += '<p class="bad">Glass. Nobody will live here again in this lane.</p>';
  else if (pj) h += '<p class="dim">Settlers are on the road. They arrive in ' + Math.max(0, pj.done - G.cur).toFixed(0) + ' years. Building orders placed now will wait for them.</p>';
  else if (!own) { const o = { k: 's', s }; if (reqOk(st, o, mods)) { const c = costOf(st, o, mods);
      h += '<div class="grid one"><button class="w wide settle' + (canPay(c, V.v) ? '' : ' short') + '" data-a="s"><b>Settle ' + S.name + '<span class="n">' + Math.round(settleTime(st, s)) + ' yr walk</span></b><span class="cost">' + costHTML(c, V.v) + '</span><small>Each site costs more than the last. ' + plots(st, s) + ' plots.</small></button></div>'; }
    else h += '<p class="dim">Too far. Settlers only set out for a site next to one this lane already holds.</p>'; }
  if (riteKnown && !st.lost[s]) { // the Bell: one rite at each hollow, in order
    if (ri < st.rite) h += '<p class="dim">The ' + ORD[ri + 1] + ' rite has been sung here.</p>';
    else if (st.proj.some(p => p.x === 'rite' && p.s === s)) h += '<p class="dim">The rite is being sung.</p>';
    else if (ri > st.rite) h += '<p class="dim">This is the ' + ORD[ri + 1] + ' hollow. This lane has sung ' + st.rite + ' of the rites before it, and they go in order.</p>';
    else { const c = costOf(st, { k: 'rt', s }, mods); h += '<div class="grid one"><button class="w wide reg' + (own && canPay(c, V.v) ? '' : ' short') + '" data-a="rt"><b>Sing the ' + ORD[ri + 1] + ' rite<span class="n">' + RITE_T + ' yr</span></b><span class="cost">' + costHTML(c, V.v) + '</span><small>' + (ri === 3 ? 'The last. The four hollows ring together, and what they ring is the Bell.' : 'The echo will come back from wherever the next hollow is.') + (own ? '' : ' The lane must hold this site first.') + '</small></button></div>'; } }
  if (S.feat === 'dun' && G.known[s]) { // the Sword: a standing war fought downward
    h += '<h3>The Undercroft <span class="dim">' + (st.rel.sword ? 'emptied' : st.depth + ' of ' + FLOORS + ' floors open in this lane') + '</span></h3><div class="dun">';
    for (let f = 1; f <= FLOORS; f++) { const F = MAP.floors[f], seen = f <= G.floor, open = f <= st.depth; h += '<div class="fl' + (open ? ' open' : '') + (seen && F.peril ? ' peril' : '') + '"><b>' + ROMAN[f] + '</b><span>' + (!seen ? 'unlit' : f === FLOORS ? 'the Sword' : Object.keys(F.loot).map(r => F.loot[r] + ' ' + RN[r].toLowerCase()).join(', ')) + '</span><i>' + (seen && F.peril ? 'keeps whoever opens it' : '') + '</i><em>' + f + ' guards</em></div>'; }
    h += '</div>';
    if (!st.rel.sword && st.depth < FLOORS) { const c = costOf(st, { k: 'dv' }, mods), gate = own && st.sb[s].gatehouse > 0, going = st.proj.some(p => p.x === 'delve');
      h += going ? '<p class="dim">A delve is below. It surfaces, or does not, in ' + Math.max(0, st.proj.find(p => p.x === 'delve').done - G.cur).toFixed(0) + ' years.</p>' : '<div class="grid one"><button class="w wide reg' + (gate && canPay(c, V.v) ? '' : ' short') + '" data-a="dv"><b>Arm one of the people and send them down<span class="n">' + DELVE_T + ' yr</span></b><span class="cost">' + costHTML(c, V.v) + '</span><small>Opens floor ' + ROMAN[st.depth + 1] + '. Every open floor needs a guard on the stair from then on, fed and armed, or what is below comes up.' + (gate ? '' : ' Needs a Gatehouse here, which needs Delving.') + '</small></button></div>'; } }
  if (own || pj) {
    const used = own ? d.used[s] || 0 : 0, cap = plots(st, s);
    h += '<h3>Build here <span class="' + (used >= cap ? 'bad' : 'dim') + '">' + used + ' of ' + cap + ' plots' + (used >= cap ? ' · full, raze or settle elsewhere' : ' · shift-click for five') + '</span></h3><div class="grid">';
    for (const x in BLD) { const B = BLD[x]; if (B.ter && !B.ter.includes(S.ter)) continue; if (B.at && s !== MAP.dun) continue; if (B.req && !B.req(st)) continue; if (B.uniq && st.b[x] > 0) continue;
      const c = costOf(st, { k: 'b', x, s }, mods), ok = own && canPay(c, V.v) && used < cap, n = own && st.sb[s][x] || '';
      let m = ''; if (BJ[x] && own && x !== 'gatehouse') { const v = siteMult(st, d, s, BJ[x][0]); m = '<em class="' + (v >= 1.2 ? 'hi' : v < .8 ? 'lo' : '') + '">×' + v.toFixed(2) + ' here</em>'; }
      h += '<button class="w' + (ok ? '' : ' short') + '" data-a="b" data-x="' + x + '" title="' + B.d + (own && used >= cap ? ' This site has no free plot, so the order would wait.' : '') + '"><b>' + B.n + '<span class="n">' + n + '</span></b><span class="cost">' + costHTML(c, V.v) + m + '</span><small>' + B.d + '</small></button>'; }
    h += '</div>';
    if (own && used) { h += '<h3>Standing here <span class="dim">razing frees the plot and returns nothing</span></h3><p class="tags raze">'; for (const x in st.sb[s]) h += '<span>' + BLD[x].n + (st.sb[s][x] > 1 ? ' ×' + st.sb[s][x] : '') + '<button data-a="raze" data-x="' + x + '" title="Raze one ' + BLD[x].n + ' here, at the cursor\'s year" aria-label="Raze one ' + BLD[x].n + '">raze</button></span>'; h += '</p>'; }
  }
  setHTML('pSite', h);
}
function whyWait(st, v, o) { /* why an order has not happened yet, as of the given state */
  if (o.k === 'b') { const B = BLD[o.x]; if (!st.own[o.s]) return 'site not settled'; if (room(st, o.s) <= 0) return 'no free plot'; if (B.req && !B.req(st)) return o.x === 'forge' ? 'needs a mine' : o.x === 'armory' ? 'needs a forge' : o.x === 'stele' ? 'needs a scriptorium and a shrine' : 'not studied yet'; }
  else if (o.k === 's' && !reqOk(st, o, mods)) return 'no settled neighbour';
  else if (o.k === 'u') { const U = UPG[o.x], need = (U.pre || []).find(p => !st.up[p]); if (need) return 'needs ' + UPG[need].n; if (U.req && !U.req(st, mods)) return 'needs a discovery'; if (studying(st)) return 'waiting its turn'; }
  else if (o.k === 'rt') { if (!st.own[o.s]) return 'site not settled'; if (busy(st, 'rite')) return 'a rite is under way'; }
  else if (o.k === 'rm') { if (st.forget === Infinity) return 'nothing is being forgotten yet'; if (busy(st, 'remember')) return 'already under way'; }
  else if (o.k === 'dv') { if (!st.own[MAP.dun] || !st.sb[MAP.dun].gatehouse) return 'needs a gatehouse'; if (busy(st, 'delve')) return 'a delve is below'; if (st.pop <= 2) return 'nobody to send'; }
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
    if (flash && flash.id === o.id) { if (Date.now() < flash.t) { s2 = flash.x; cls += ' flash'; } else flash = null; }
    h += '<li class="' + cls + '" data-a="goto" data-t="' + o.t + '"><span class="y">' + yr(o.t) + '</span><span class="what">' + describe(o) + '</span><span class="s">' + s2 + '</span><button data-a="tight" data-id="' + o.id + '" title="Tighten: move this order as early as it can go without waiting and without making any other order late" aria-label="Tighten">⇤</button><button data-a="del" data-id="' + o.id + '" title="Remove this order" aria-label="Remove">✕</button></li>';
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
  if (endSt.dead && G.cur >= endSt.dead) return endSt.by === 'The Unwriting' ? 'This lane was unwritten. Three relics, made here or lit from other lanes, hold a lane down. Drag the cursor back and change what led here.' : endSt.by + ' ended this lane. Drag the cursor back before it and prepare. The Archive now knows what it does.';
  if (V.seg.starving) return 'Famine. Scrub back to before it began: more farms on good ground, a granary filled in the good years, fewer huts, or fewer guards.';
  if (st.depth > 0 && !st.rel.sword && !V.seg.held) return 'The stair is not held. It needs one guard for every open floor, with arms in the stores for them to wear out. If it stays unheld, what is below comes up.';
  if (!b.orders.length) return 'No hurry. Years going by cost nothing: any year behind the horizon can be visited and changed, as often as you like. Press Space or Hold to stop the horizon while you look around. When ready, order a Hut and a Farm at Hearthford.';
  if (Object.keys(st.own).length === 1 && G.H > 90) return 'Hearthford has twelve plots and no ore. Pick a neighbouring site on the map and settle it. Each kind of work does best on its own ground, and the map shows what the ground is.';
  if (st.pend.length && !G.follow) return 'An order here is waiting. It will be carried out the moment this lane can pay for it, has somewhere to put it, and, for study, has finished what it was studying.';
  if (!G.follow) return 'You are in this lane\'s past. Any order placed here rewrites everything after year ' + yr(G.cur) + ', and whatever bled from it into other lanes. Press End to ride the horizon again.';
  if (G.br.length === 1 && G.H > 200) return 'Fork here copies this lane up to the cursor into a second lane. A lane studies one thing at a time, and whatever it learns reaches the others later: centuries later from a lane nobody remembers, decades from one with steles and full libraries.';
  return '';
}
function renderAll() {
  const b = act(), V = sim(b).at(G.cur), sp = speed();
  setHTML('hz', 'Horizon <b>year ' + yr(G.H) + '</b><span class="pace">' + [[0, 'Hold', 'Hold the horizon still; press again to let it go (Space does both). Nothing is lost either way: every year behind the horizon stays open to change'], [1, '1', 'One year each second'], [3, '3', 'Three years each second'], [10, '10', 'Ten years each second']].map(q => '<button data-a="rate" data-x="' + q[0] + '" title="' + q[2] + '" aria-pressed="' + (sp === q[0]) + '">' + q[1] + '</button>').join('') + '<small>yr/s</small></span><span class="unw" title="The year the Unwriting comes, in every lane. What the Archive records pushes it later.">Unwriting, year ' + yr(FINAL_T) + '</span>');
  setHTML('nEcho', String(Object.keys(G.echo).length));
  setHTML('curY', 'Year <b>' + yr(G.cur) + '</b>' + (G.follow ? '<span>riding the horizon</span>' : '<span>' + yr(G.H - G.cur) + ' yr before the horizon</span>'));
  $('bFollow').classList.toggle('on', G.follow); $('bFit').hidden = !G.vw;
  setHTML('hint', hint(b, V));
  renderLanes(); renderState(b, V); renderJobs(V); renderSite(V); renderOrders(b); renderLog(b);
  const tab = G.tab || 'work', st = V.st, nW = st.dead ? 0 : st.pend.length; for (const t of ['work', 'study', 'orders', 'log']) { $('t_' + t).hidden = t !== tab; $('tb_' + t).setAttribute('aria-selected', t === tab); }
  setHTML('tb_orders', 'Orders' + (nW ? '<i>' + nW + ' waiting</i>' : '')); const cs = st.proj.find(p => UPG[p.x]); setHTML('tb_study', 'Study' + (cs ? '<i>' + UPG[cs.x].n + '</i>' : st.dead ? '' : '<i class="idle">' + (st.pend.some(id => { const o = sim(b).order(id); return o && o.k === 'u'; }) ? 'waiting' : 'idle') + '</i>'));
}

/* --- archive, intro, ending --- */
function openModal(h) { $('mBody').innerHTML = h; $('modal').hidden = false; }
function closeModal() { $('modal').hidden = true; if (G.intro) { G.intro = false; save(); } }
function archiveHTML() {
  const E = G.echo, got = Object.keys(E).reduce((a, k) => a + (ENTRY[k] ? ENTRY[k].y : 0), 0), rows = G.br.map(b => { const V = sim(b).at(G.H); return '<li class="sub"><span><i style="background:' + HUES[b.hue] + '"></i>' + esc(b.name) + ' · ' + fmt(V.v.mem) + ' Memory</span><span>' + (V.st.dead ? 'silent' : Math.round(bleedDelay(V.v.mem)) + ' yr') + '</span></li>'; }).join('');
  let h = '<h2>The Archive</h2><p class="lede">Two kinds of thing happen here. What the Archive records is permanent, even if you rewrite or prune the lane that earned it. What bleeds between lanes is not: it exists only while the lane it came from still does it.</p>';
  h += '<div class="cols"><div><h3>When the Unwriting comes</h3><ul class="sum"><li>If nothing were recorded<span>year ' + BASE_FINAL + '</span></li><li>Pushed back by what is recorded<span>+' + got + ' yr</span></li><li class="tot">The Unwriting<span>year ' + FINAL_T + '</span></li></ul><p class="dim">Most entries buy years. Recording all the ordinary ones puts it at year ' + (BASE_FINAL + Object.values(YRS).reduce((a, b) => a + b, 0)) + '.</p>';
  h += '<h3>The bleed</h3><p>Lanes are shelved side by side and the ink soaks through. Whatever one lane learns, makes or lets loose reaches every other lane, later. How much later depends on the sender: ' + BLEED_MAX + ' years from a lane with no Memory, down toward ' + BLEED_MIN + ' from one that is well remembered. Memory comes from people living, more with Steles, and from lore and awe left unspent.</p><ul class="sum"><li>Heard from, as of the horizon<span></span></li>' + rows + '</ul>';
  h += '</div><div><h3>What the Archive has worked out</h3><div class="trial"><b>The valley</b><p>' + Object.keys(G.known).length + ' of ' + (MAP.sites.length - 1) + ' sites have been lived in by some lane. Nobody knows what is under a place until people live on it, though the neighbours hear things.</p></div>';
  h += '<div class="trial"><b>Three relics, three ways</b><p>' + (E.stair ? 'The <b>Sword</b> is at the bottom of the Undercroft, twelve floors down. Each delve opens one floor and costs more arms than the last. Every open floor needs a guard on the stair for good, eating three shares and wearing out arms.' : 'The <b>Sword</b> is somewhere under the valley. Nobody has found the way down.') + '</p><p>' + (G.trail ? 'The <b>Bell</b> is rung, not made: four rites at four hollows, in order, ' + RITE_C.join(', ') + ' awe. Each rite shows where the next hollow is. ' + G.trail + ' of 4 are known.' : 'The <b>Bell</b> is somewhere in the valley, or everywhere in it. Travellers\' talk is the only lead.') + '</p><p>' + (E.glass ? 'The <b>Lens</b> is where two lines of study meet: glass to lenses to parallax, and annals to counterfactuals to the margin. A lane studies one thing at a time, so one lane alone is slow. Two lanes each taking a line, and trading by the bleed, are not.' : 'The <b>Lens</b> has to be thought of before it can be ground. Nobody has started.') + '</p></div>';
  if (mods.mal >= 1) h += '<div class="trial"><b>What the relics let in</b><p>Each relic the Archive records lets one malady into every lane, at a fixed year, including the past of the lane that made the relic. ' + mods.mal + ' of 3 so far.</p><p>The first lets in the <b>Glass Plague</b>, year ' + MAL_T[1] + ': every site without a Lazaret turns to glass for good, and Hearthford without one ends the lane.' + (mods.mal >= 2 ? '</p><p>The second lets in the <b>Forgetting</b>, year ' + MAL_T[2] + ': every ' + FORGET_EVERY + ' years the lane loses the newest thing it knows, until it holds a Remembering. That costs ' + REMEMBER_C + ' lore and takes sixty years, less ten for each Scriptorium.' : '') + (mods.mal >= 3 ? '</p><p>The third lets in the <b>Sunless Years</b>, year ' + MAL_T[3] + ': sixty years of quarter harvests.' : '') + '</p></div>';
  if (E.margin) h += '<div class="trial"><b>From the margin</b><p>Dated things, in every lane: the Long Winter 260 to 340. The Ashen Host 700. The Drying from ' + DRY_T + '. A second winter 1250 to 1370.' + [1, 2, 3].map(o => ' ' + MALADY[o] + ' ' + MAL_T[o] + (mods.mal >= o ? '.' : ', if a ' + ['', 'first', 'second', 'third'][o] + ' relic is ever made.')).join('') + ' The Unwriting ' + FINAL_T + ', as things stand.</p></div>';
  if (E.breach) h += '<div class="trial"><b>What came up</b><p>A stair left unheld for ' + BREACH_T + ' years is breached. The lane loses a gatehouse, one in five of its people and two floors. Later, what came up walks through every other lane, and ' + BREACH_ARMS + ' arms turn it back.</p></div>';
  if (G.H >= DRY_T + 60) h += '<div class="trial"><b>The Drying · from year ' + DRY_T + '</b><p>The river never comes back. Farm yields slide to about half by year 1500 and stay there.</p></div>';
  if (G.H >= 655) h += '<div class="trial"><b>The Ashen Host · year 700</b><p>' + (G.H < 700 ? 'Something is coming from the east.' : 'It lands on the Ashen Strand and marches the roads at twice a settler\'s pace, for ' + HOST_SPAN + ' years. At each settled site it is stopped by a Palisade, or by ' + HOST_ARMS + ' arms spent in the field. Otherwise it burns the site and goes on. If it reaches Hearthford unopposed, the lane ends.') + '</p></div>';
  if (G.H >= FINAL_T - 60) h += '<div class="trial"><b>The Unwriting · year ' + FINAL_T + '</b><p>' + (G.H < FINAL_T ? 'Something is coming, and it is the last thing.' : 'It unwrites any lane that does not hold all three relics in year ' + FINAL_T + ', made there or lit from another lane. Light crosses at the speed of its maker\'s Memory, so a relic made late in a forgotten lane arrives after the page is gone. The year moves: see the left column.') + '</p></div>';
  h += '</div></div><h3>Recorded <span class="dim">' + Object.keys(E).length + ' entries</span></h3><div class="echoes">';
  for (const k in ENTRY) { const e = ENTRY[k];
    if (E[k]) h += '<div class="echo got"><b>' + e.n + '</b><p>' + e.fx + '</p><small>horizon year ' + yr(E[k]) + '</small></div>';
    else if (E.annals && !e.secret && (!e.gate || e.gate())) h += '<div class="echo"><b>Unrecorded</b><p>' + e.how + (e.y ? ' <span class="dim">' + e.y + ' years.</span>' : '') + '</p></div>'; }
  h += '</div><p class="dim">' + (E.annals ? 'Some entries leave no outline until they are found.' : 'The Archive cannot yet say what it is missing. A lane that kept annals would give it the habit.') + '</p>';
  h += '<h3>Save</h3><p class="dim">The game saves in this browser. Copy the save text to keep a backup or move it elsewhere.</p><div class="saverow"><button data-a="copy">Copy save text</button><input id="saveIn" placeholder="Paste save text here" aria-label="Save text to load"><button data-a="loadsave">Load</button><button data-a="reset" class="danger">Start over</button></div>';
  return h;
}
function treeHTML() { /* every line of study, by how deep it sits, as this lane stands at the cursor */
  const b = act(), st = sim(b).at(G.cur).st, depth = {}, dOf = x => depth[x] !== undefined ? depth[x] : (depth[x] = 1 + Math.max(-1, ...(UPG[x].pre || []).map(dOf))), inc = {};
  for (const e of incoming(b)) if (e.k === 'tech' && !st.up[e.x]) inc[e.x] = e;
  const cur = st.proj.find(p => UPG[p.x]), tiers = []; for (const x in UPG) (tiers[dOf(x)] = tiers[dOf(x)] || []).push(x);
  let h = '<h2>The tree</h2><p class="lede">' + esc(b.name) + ' lane, year ' + yr(G.cur) + '. A lane studies one thing at a time. Anything another lane finishes arrives here later, already paid for: sooner from a well-remembered lane.</p>';
  tiers.forEach((list, i) => { h += '<h3>' + (i ? 'Needs ' + i + ' earlier ' + (i > 1 ? 'steps' : 'step') : 'Open from the start') + '</h3><div class="tree">';
    for (const x of list) { const U = UPG[x], pre = (U.pre || []), ok = pre.every(p => st.up[p]), gated = U.req && !U.req(st, mods), known = st.up[x] || (U.relic && st.rel[U.relic]);
      const cls = known ? 'known' : cur && cur.x === x ? 'now' : inc[x] ? 'inc' : ok && !gated ? 'open' : 'shut';
      h += '<div class="tn ' + cls + (U.relic ? ' relic' : '') + '"><b>' + U.n + '</b><small>' + (known ? 'known' : cur && cur.x === x ? 'in study, ' + Math.ceil(cur.done - G.cur) + ' yr left' : inc[x] ? 'arriving ' + yr(inc[x].ta) + ' from ' + esc(inc[x].from) : gated ? 'needs something found on the map' : ok ? U.t + ' yr · ' + Object.keys(U.c).map(r => U.c[r] + ' ' + RN[r].toLowerCase()).join(', ') : 'after ' + pre.filter(p => !st.up[p]).map(p => UPG[p].n).join(' and ')) + '</small></div>'; }
    h += '</div>'; });
  return h;
}
function introHTML() {
  return '<h2>Apocrypha at the End of Time</h2><div class="story"><p>Apocrypha are the books that were left out. You keep the Archive at the far end of everything, and this is the shelf nobody was meant to read.</p><p>Four people start beside a river in year 0, in a valley nobody has mapped. The <b>horizon</b> is the latest year you can see, and it moves on by itself. Let it. Nothing is ever missed: drag along the river to visit any year behind the horizon, and whatever you order there rewrites every later year at once. You can hold the horizon still whenever you like.</p><p><b>Fork</b> a history into lanes that run side by side. Lanes <b>bleed</b>: what one learns, makes or lets loose reaches the others in time, and stops reaching them if you rewrite its source. How much time depends on how well the sending lane is remembered. A forgotten people is heard four centuries late.</p><p>There are three relics, and each is hidden a different way. One is under the ground. One is in the ground. One is in the way the first two sentences of this paragraph can both be true.</p></div><button data-a="close" class="primary">Open the Archive</button>';
}
function endingHTML() {
  const mins = Math.round((Date.now() - G.born) / 60000), w = G.br.filter(b => sim(b).at(G.H).st.won);
  return '<h2>The Morning After the End</h2><div class="story"><p>In year ' + FINAL_T + ' the Unwriting read ' + (w.length > 1 ? w.length + ' lanes' : 'the ' + esc(w[0] ? w[0].name : 'last') + ' lane') + ' and could not lift the page. It was held down at three corners: by something carried up a stair, something sung into four holes in the ground, and something two schools of thought had to agree on.</p><p>' + (w.length > 1 ? 'No one history did all of it. Each was lit by the others, late, and all of them paid for the light in glass, and in forgetting, and in the dark.' : 'One lane held, on light borrowed from histories that did not.') + '</p><p>The scholars who learned to read the margin left one note of their own in it, for whoever writes there: <i>we worked out that you exist. We are not angry about the plague. We would like to know how it ends.</i></p><p class="dim">Lanes kept: ' + G.br.map(b => esc(b.name)).join(', ') + '.' + (G.pruned.length ? ' Pruned, and remembered here anyway: ' + G.pruned.map(esc).join(', ') + '.' : '') + ' ' + Object.keys(G.echo).length + ' entries, ' + Object.keys(G.known).length + ' of ' + (MAP.sites.length - 1) + ' sites, ' + mins + ' minutes of your own time.</p><p>The horizon keeps receding. The lanes are still yours.</p></div><button data-a="close" class="primary">Keep reading</button>';
}
/* --- input --- */
function eventTimes(b) { const s = sim(b), a = new Set([0]); for (const r of s.recs) a.add(r.t); for (const o of b.orders) a.add(o.t); for (const l of s.log) a.add(l.t); return [...a].filter(t => t <= G.H).sort((x, y) => x - y); }
function jump(dir) { const ts = eventTimes(act()); let t = dir > 0 ? ts.find(x => x > G.cur + 1e-6) : [...ts].reverse().find(x => x < G.cur - 1e-6); if (t === undefined) { if (dir > 0) { G.follow = true; G.cur = G.H; } } else { G.cur = t; G.follow = false; } dirty = true; }
function nudge(d) { G.cur = Math.max(0, Math.min(G.H, (d > 0 ? Math.floor(G.cur) : Math.ceil(G.cur)) + d)); G.follow = G.cur >= G.H; dirty = true; }
function shake() {
  G.shakes++; G.H += 300; latch('shaken'); checkEchoes(); dirty = true;
  const q = ['Three centuries fall through at once. Of course you tried it.', 'The sand does not mind.', 'The Archive pretends not to notice.', 'Somewhere a light is now fifty years closer than you planned.', 'At this point it is less an hourglass than a maraca.'];
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
  else if (a === 'rt') place({ k: 'rt', s });
  else if (a === 'dv') place({ k: 'dv' });
  else if (a === 'rm') place({ k: 'rm' });
  else if (a === 'tab') G.tab = x;
  else if (a === 'rate') { const r = +x; if (!r && !speed()) G.rate = G.rate0 || 3; else { if (!r) G.rate0 = speed(); G.rate = r; } } // Hold pressed while held lets go, at the speed it interrupted: the same as Space
  else if (a === 'tree') openModal(treeHTML());
  else if (a === 'lim') { const V = sim(b).at(G.cur), sl = V.d.slots[x], cur = V.st.lim[x] == null ? sl : Math.min(sl, V.st.lim[x]); let n = Math.max(0, cur + (+el.dataset.d)); place({ k: 'l', x, n: n >= sl ? null : n }); }
  else if (a === 'up' || a === 'dn') { const list = sim(b).at(G.cur).st.prio.slice(), i = list.indexOf(x), j = i + (a === 'up' ? -1 : 1); if (j < 0 || j >= list.length) return;[list[i], list[j]] = [list[j], list[i]]; place({ k: 'p', list }); }
  else if (a === 'tight') { e.stopPropagation(); tighten(+el.dataset.id); }
  else if (a === 'del') { e.stopPropagation(); const id = +el.dataset.id, o = b.orders.find(o => o.id === id); if (o) edit(b, o.t, arr => arr.splice(arr.indexOf(o), 1)); }
  else if (a === 'goto') { G.cur = Math.min(G.H, +el.dataset.t); G.follow = false; }
  else if (a === 'sel') { G.act = +el.dataset.id; }
  else if (a === 'ren') { e.stopPropagation(); const id = +el.dataset.id, row = el.closest('.lane'), bb = lane(id); renaming = id; row.innerHTML = '<input id="renIn" maxlength="24" aria-label="Lane name" value="' + esc(bb.name) + '">'; cache.lanes = null; const inp = $('renIn'); inp.focus(); inp.select(); inp.onkeydown = ev => { ev.stopPropagation(); if (ev.key === 'Enter') rename(id, inp.value); if (ev.key === 'Escape') { renaming = null; dirty = true; } }; inp.onblur = () => { if (renaming === id) rename(id, inp.value); }; inp.onclick = ev => ev.stopPropagation(); return; }
  else if (a === 'prune') { e.stopPropagation(); const id = +el.dataset.id; if (pruneAsk === id) { pruneAsk = null; prune(id); } else pruneAsk = id; }
  else if (a === 'fork') fork();
  else if (a === 'unravel') { const t = G.cur; if (b.orders.some(o => o.t > t)) edit(b, t, arr => { for (let i = arr.length - 1; i >= 0; i--) if (arr[i].t > t) arr.splice(i, 1); }); }
  else if (a === 'undo') undo();
  else if (a === 'follow') { G.follow = !G.follow; if (G.follow) G.cur = G.H; else G.cur = Math.floor(G.cur); }
  else if (a === 'fit') { G.vw = null; G.vs = null; }
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
  else if (k === ' ') { if (speed()) { G.rate0 = speed(); G.rate = 0; } else G.rate = G.rate0 || 3; }
  else if (k === 'Home') { G.cur = 0; G.follow = false; } else if (k === 'End') { G.follow = true; G.cur = G.H; }
  else if (k === ',' || k === '<') jump(-1); else if (k === '.' || k === '>') jump(1);
  else if ((k === 'z' || k === 'Z') && e.ctrlKey) undo(); else if (k === 'f' && !e.ctrlKey) fork();
  else if (k >= '1' && k <= '9' && G.br[+k - 1]) G.act = G.br[+k - 1].id;
  else return;
  e.preventDefault(); dirty = true;
}
/* One thing going wrong in one part of a frame used to stop every later frame, with nothing on screen to say so: the
   page looked alive and answered nothing. Each part now fails by itself, the rest carry on, the player is told once,
   and the error is still thrown (a moment later) so the console and the tests see it. */
const faults = {};
function part(name, fn) {
  try { fn(); } catch (e) {
    if (!faults[name]) { faults[name] = 1; discovery('<b>Something went wrong</b><p>The Archive dropped a page while ' + name + '.</p><p class="un">The game is still running and your orders are saved. Reloading usually clears it. What it said: <b>' + esc(e && e.message || e) + '</b></p>'); setTimeout(() => { throw e; }); }
  }
}
function frame() {
  const now = Date.now(), dt = Math.max(0, (now - G.last) / 1000); G.last = now;
  part('counting the years', () => { advance(dt); if (G.follow) G.cur = G.H; if (G.cur > G.H) G.cur = G.H; if (!lane(G.act)) G.act = G.br[0].id; });
  part('drawing the river', drawRiver); part('drawing the map', drawMap);
  if (dirty || now - panelT > 200) { panelT = now; dirty = false; part('writing out the panels', renderAll); }
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
  document.addEventListener('pointerdown', e => { press = e.target.tagName === 'CANVAS' ? 0 : Date.now(); }, true); // see setHTML
  for (const ev of ['pointerup', 'pointercancel']) document.addEventListener(ev, () => { press = 0; dirty = true; }, true); window.addEventListener('blur', () => { press = 0; });
  const cv = $('cv'); let drag = false, strip = false;
  cv.addEventListener('pointerdown', e => { drag = true; cv.setPointerCapture(e.pointerId); const r = cv.getBoundingClientRect(), y = e.clientY - r.top; strip = y < OV; const i = Math.floor((y - OV - TOP) / ROW); if (!strip && G.br[i]) G.act = G.br[i].id; scrubTo(e, strip); });
  cv.addEventListener('pointermove', e => { if (drag) scrubTo(e, strip); });
  cv.addEventListener('pointerup', () => { drag = false; }); cv.addEventListener('pointercancel', () => { drag = false; });
  cv.addEventListener('dblclick', () => { G.vw = null; G.vs = null; });
  cv.addEventListener('wheel', e => { if (!e.ctrlKey && !e.shiftKey) return; // plain scrolling belongs to the page; hold Ctrl or Shift (or pinch) to zoom the river
    e.preventDefault(); const r = cv.getBoundingClientRect(), [v0, v1] = getView(), f = Math.exp((e.deltaY || e.deltaX) * 0.0015), tm = v0 + (e.clientX - r.left) / r.width * (v1 - v0), w = Math.max(20, Math.min(G.H, (v1 - v0) * f)); G.vw = w >= G.H ? null : w; G.vs = tm - (tm - v0) * (w / (v1 - v0)); dirty = true; }, { passive: false });
  $('map').addEventListener('pointerdown', pickSite);
  window.addEventListener('beforeunload', save); document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => JSON.parse(JSON.stringify(G)));
  if (G.intro) openModal(introHTML());
  window.apocrypha = { state: () => G, world: () => world, map: () => MAP, skip: y => { G.H += y; checkEchoes(); dirty = true; } };
  requestAnimationFrame(frame);
}
