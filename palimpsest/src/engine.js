/* ===== Engine: exact event-driven simulation, no timestepping. =====
   Between events every stock is a polynomial in tau = t - t0. Nothing about the future is stored:
   each segment recomputes "what happens next" from its start state. Lanes affect each other only
   after BLEED years, so all cross-lane dependencies point forward in time and the lanes can be
   advanced together in steps of BLEED. */
const EPS = 1e-9, BLEED = 50, FINAL_T = 2400;
function pev(p, x) { let s = 0; for (let i = p.length - 1; i >= 0; i--) s = s * x + p[i]; return s; }
function padd(a, b, k = 1) { const n = Math.max(a.length, b.length), o = new Array(n); for (let i = 0; i < n; i++) o[i] = (a[i] || 0) + k * (b[i] || 0); return o; }
function pscale(a, k) { return a.map(c => c * k); }
function pint(a, c0) { const o = [c0]; for (let i = 0; i < a.length; i++) o.push(a[i] / (i + 1)); return o; }
function pder(a) { if (a.length <= 1) return [0]; const o = []; for (let i = 1; i < a.length; i++) o.push(a[i] * i); return o; }
function ptrim(a) { let n = a.length; while (n > 1 && Math.abs(a[n - 1]) < 1e-14) n--; return n === a.length ? a : a.slice(0, n); }
function psign0(p) { for (const c of p) if (Math.abs(c) > 1e-11) return c > 0 ? 1 : -1; return 0; }
function proots(p, a, b) {
  p = ptrim(p); const n = p.length - 1;
  if (n <= 0) return [];
  if (n === 1) { const r = -p[0] / p[1]; return r >= a && r <= b ? [r] : []; }
  const pts = [a, ...proots(pder(p), a, b), b], out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    let lo = pts[i], hi = pts[i + 1]; const flo = pev(p, lo), fhi = pev(p, hi);
    if (flo === 0) { if (out[out.length - 1] !== lo) out.push(lo); continue; }
    if (flo * fhi < 0) { for (let k = 0; k < 70; k++) { const m = (lo + hi) / 2; if ((pev(p, m) < 0) === (flo < 0)) lo = m; else hi = m; } out.push(hi); }
    else if (fhi === 0 && i === pts.length - 2) out.push(hi);
  }
  return out;
}
function firstRoot(p, tmax, min = EPS) { if (!(tmax > min)) return Infinity; for (const x of proots(p, 0, tmax)) if (x > min) return x; return Infinity; }

/* --- the map: seeded per save --- */
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const TER = {
  plain: { n: 'River plain', fav: ['farmer'], c: '#a9bf6a', suf: ['Ford', 'Mead', 'Reach'] },
  forest: { n: 'Forest', fav: ['woodcutter', 'armorer'], c: '#5f9a78', suf: ['Holt', 'Shade', 'Weald'] },
  hills: { n: 'Hills', fav: ['miner', 'smith'], c: '#b7a58c', suf: ['Tor', 'Scar', 'Delve'] },
  ruins: { n: 'Ruins', fav: ['scholar'], c: '#8fa3d6', suf: ['Gate', 'Hold', 'Stair'] },
  peak: { n: 'High peak', fav: ['priest'], c: '#c48bb8', suf: ['Horn', 'Crown', 'Spire'] },
  marsh: { n: 'Marsh', fav: [], c: '#7d8c7a', suf: ['Fen', 'Mire', 'Sink'] },
  shore: { n: 'Empty strand', fav: [], c: '#d0603f', suf: [] }
};
const FEAT = {
  relic_sword: 'The Unbroken Sword lies here, unfinished.', relic_bell: 'The Bell That Rings Backward lies here, uncast.', relic_lens: 'The Lens of Last Light lies here, unground.',
  deep: 'A vein far too rich for a hill this size. Something is asleep under it, and mining will wake it.',
  pit: 'A plague pit. A third of any people who settle here die of it.',
  hint_terrace: 'Terraced walls, older than the oldest song. Somebody once made this ground hold more than it should.', hint_mill: 'A millstone the size of a house, cracked, beside a dry race.', hint_lib: 'Shelves cut into the rock, floor to roof, every one of them empty.', hint_temple: 'A nave with no roof. A whisper at one end is a shout at the other.', hint_foundry: 'A casting pit, and in it the mould of something very large.',
  cache: 'A cache of seasoned timber and sealed grain.', vault: 'A vault of tablets, still legible.', stones: 'Standing stones that hum at dusk.', herd: 'A valley of half-tame cattle.'
};
function makeMap(seed) {
  const R = rng(seed), pts = [{ x: 0, y: 0 }]; let tries = 0;
  while (pts.length < 20 && tries++ < 9000) { const a = R() * 6.2832, r = Math.sqrt(R()), x = Math.cos(a) * r, y = Math.sin(a) * r * .62; if (pts.every(p => Math.hypot(p.x - x, p.y - y) > .215)) pts.push({ x, y }); }
  const n = pts.length, S = pts.map((p, id) => ({ id, x: p.x, y: p.y, adj: [], ter: 'plain', feat: null }));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { // Gabriel graph: planar-ish and always connected
    const mx = (S[i].x + S[j].x) / 2, my = (S[i].y + S[j].y) / 2, d = Math.hypot(S[i].x - S[j].x, S[i].y - S[j].y), r = d / 2 - 1e-9;
    if (S.every((s, k) => k === i || k === j || Math.hypot(s.x - mx, s.y - my) >= r)) { const len = Math.max(12, Math.round(d * 110)); S[i].adj.push({ to: j, len }); S[j].adj.push({ to: i, len }); }
  }
  const D = S.map((_, i) => S.map((_, j) => i === j ? 0 : Infinity));
  for (const s of S) for (const e of s.adj) D[s.id][e.to] = e.len;
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (D[i][k] + D[k][j] < D[i][j]) D[i][j] = D[i][k] + D[k][j];
  S.forEach(s => { s.dist = D[0][s.id]; });
  const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
  const by = S.slice(1).sort((a, b) => a.dist - b.dist), bag = shuf(['plain', 'plain', 'plain', 'plain', 'forest', 'forest', 'forest', 'hills', 'hills', 'hills', 'ruins', 'ruins', 'ruins', 'peak', 'peak', 'peak', 'marsh', 'marsh']);
  by.forEach((s, i) => { s.ter = i === 0 ? 'forest' : i === 1 ? 'hills' : bag[(i - 2) % bag.length]; });
  const far = by.slice(-10), rel = [far[far.length - 1]];
  while (rel.length < 3) { let best = null, bv = -1; for (const s of far) if (!rel.includes(s)) { const v = Math.min(s.dist, ...rel.map(r => D[r.id][s.id])); if (v > bv) { bv = v; best = s; } } rel.push(best); }
  shuf(['sword', 'bell', 'lens']).forEach((k, i) => { rel[i].feat = 'relic_' + k; });
  const free = () => by.filter(s => !s.feat);
  let deep = free().filter(s => s.ter === 'hills' && by.indexOf(s) >= 3).pop() || free().slice(-1)[0]; deep.ter = 'hills'; deep.feat = 'deep';
  const pitC = free().filter(s => by.indexOf(s) >= 3); if (pitC.length) pitC[Math.floor(R() * pitC.length)].feat = 'pit';
  shuf(free()).slice(0, 9).forEach((s, i) => { s.feat = ['hint_terrace', 'hint_mill', 'hint_lib', 'hint_temple', 'hint_foundry', 'cache', 'vault', 'stones', 'herd'][i]; });
  const pre = shuf(['Orrin', 'Kesh', 'Vale', 'Mara', 'Tolm', 'Isk', 'Brae', 'Dun', 'Ysa', 'Corr', 'Ael', 'Pell', 'Hask', 'Nim', 'Ruth', 'Ostra', 'Vesk', 'Lorn', 'Emm', 'Thar', 'Quil', 'Sav']);
  S.forEach((s, i) => { s.name = i === 0 ? 'Hearthford' : pre[i % pre.length] + ' ' + TER[s.ter].suf[Math.floor(R() * 3)]; });
  // the strand: nothing can be built there. The Host lands on it and takes every road out.
  let mx = -9; for (const q of S) mx = Math.max(mx, q.x);
  const e2 = S.slice(1).sort((a, b) => b.x - a.x).slice(0, 2), sh = { id: n, x: mx + .27, y: (e2[0].y + e2[1].y) / 2, adj: [], ter: 'shore', feat: null, shore: 1, name: 'The Ashen Strand' };
  const near = S.slice(1).map(q => [Math.hypot(q.x - sh.x, q.y - sh.y), q]).sort((a, b) => a[0] - b[0]);
  near.slice(0, 3).forEach(([d, q], i) => { if (i === 2 && d > near[1][0] * 1.5) return; const len = Math.max(12, Math.round(d * 110)); sh.adj.push({ to: q.id, len }); q.adj.push({ to: n, len }); });
  sh.dist = Math.min(...sh.adj.map(e => S[e.to].dist + e.len)); S.push(sh);
  return { sites: S, D, east: n, hasPit: S.some(q => q.feat === 'pit') };
}
let MAP = null;
/* what people living next door to a place say about it, before anyone has lived on it */
function rumour(N) { const f = N.feat; if (!f) return ''; if (f === 'pit') return 'Shepherds will not graze toward ' + N.name + '. They say the old dead are under it, and that the old dead are catching.'; if (f === 'deep') return 'On still nights the hill at ' + N.name + ' can be heard humming.'; if (f.startsWith('relic')) return 'Some nights there is a light over ' + N.name + ' that is not a fire.'; if (f.startsWith('hint')) return 'Worked stone shows through the scrub toward ' + N.name + '. Somebody built there before anybody was here.'; return ''; }

/* --- the economy --- */
const RES = ['vein', 'ore', 'metal', 'arms', 'wood', 'lore', 'awe', 'food', 'mem']; // inputs before outputs
const JOBS = {
  farmer: { out: ['food', 0.5], clim: 1 }, woodcutter: { out: ['wood', 0.4] },
  miner: { inp: ['vein', 0.25], out: ['ore', 0.25] }, smith: { inp: ['ore', 0.3], out: ['metal', 0.3] },
  armorer: { inp: ['metal', 0.2], out: ['arms', 0.2] }, scholar: { out: ['lore', 0.15] },
  priest: { out: ['awe', 0.15] }, forager: { out: ['food', 0.12] }
};
const JOBLIST = ['scholar', 'priest', 'armorer', 'smith', 'miner', 'woodcutter', 'farmer'];
const UPKEEP = 0.1;
const DRY_T = 900;
const CLIM = [[0, 1], [220, 1], [260, .15], [300, .15], [340, 1], [DRY_T, 1], [1200, .75], [1250, .3], [1320, .3], [1370, .62], [1500, .5], [1900, .5], [FINAL_T, .3], [FINAL_T + 60, .5], [1e7, .5]];
function climAt(t) { let i = 0; while (CLIM[i + 1][0] <= t) i++; const [a, ca] = CLIM[i], [b, cb] = CLIM[i + 1], m = (cb - ca) / (b - a); return [ca + m * (t - a), m]; }
const BJ = { farm: ['farmer', 2], lumber: ['woodcutter', 2], mine: ['miner', 2], forge: ['smith', 1], armory: ['armorer', 1], script: ['scholar', 1], shrine: ['priest', 1] };
const BLD = {
  hut: { n: 'Hut', c: { wood: 8 }, g: 1.25, d: 'Housing for 4 more.' },
  farm: { n: 'Farm', c: { wood: 10 }, g: 1.25, d: '2 farmer posts. Yield follows the climate.' },
  lumber: { n: 'Lumber camp', c: { wood: 14 }, g: 1.3, d: '2 woodcutter posts.' },
  granary: { n: 'Granary', c: { wood: 25 }, g: 1.4, d: 'Stores 150 more food.' },
  script: { n: 'Scriptorium', c: { wood: 30 }, g: 1.35, d: '1 scholar post.' },
  shrine: { n: 'Shrine', c: { wood: 30 }, g: 1.35, d: '1 priest post.' },
  mine: { n: 'Mine', c: { wood: 30 }, g: 1.35, d: '2 miner posts. Hills only. Veins are finite.', ter: 'hills' },
  forge: { n: 'Forge', c: { wood: 40, ore: 10 }, g: 1.35, d: '1 smith post. Ore into bronze.', req: s => s.b.mine > 0 },
  armory: { n: 'Armory', c: { wood: 60, metal: 15 }, g: 1.35, d: '1 armorer post. Bronze into arms.', req: s => s.b.forge > 0 },
  palisade: { n: 'Palisade', c: { wood: 80 }, g: 1.3, d: 'The Ashen Host stops at this site and goes no further through it.', req: s => s.up.fort },
  lazaret: { n: 'Lazaret', c: { wood: 150, lore: 100 }, g: 1.25, d: 'This site lives through the Glass Plague.', req: s => s.up.quar },
  gmill: { n: 'Great Mill', uniq: 1, c: { wood: 600, metal: 60 }, g: 1, d: 'One per lane. Farmers at this site ×2.5.', req: s => s.up.milling },
  glib: { n: 'Great Library', uniq: 1, c: { wood: 600, lore: 400 }, g: 1, d: 'One per lane. Scholars at this site ×2.', req: s => s.up.archives },
  gtemple: { n: 'Great Temple', uniq: 1, c: { wood: 600, awe: 400 }, g: 1, d: 'One per lane. Priests at this site ×2.', req: s => s.up.liturgy },
  gfoundry: { n: 'Great Foundry', uniq: 1, c: { wood: 600, metal: 200 }, g: 1, d: 'One per lane. Smiths and armorers at this site ×2.', req: s => s.up.casting },
  stele: { n: 'Stele', c: { lore: 40, awe: 40 }, g: 1.5, d: 'People leave 25% more Memory.', req: s => s.b.script > 0 && s.b.shrine > 0 }
};
const GREAT = { gmill: ['farmer'], glib: ['scholar'], gtemple: ['priest'], gfoundry: ['smith', 'armorer'] };
const UPG = {
  axes: { n: 'Flint Axes', c: { wood: 15 }, t: 8, d: 'Woodcutters ×1.5.' },
  irrigation: { n: 'Irrigation', c: { lore: 15 }, t: 20, d: 'Farmers ×1.4.' },
  pottery: { n: 'Sealed Jars', c: { lore: 25, wood: 40 }, t: 15, d: 'Food storage ×1.5.' },
  writing: { n: 'Writing', c: { lore: 40 }, t: 25, d: 'Scholars ×2.' },
  rites: { n: 'Rites', c: { awe: 40 }, t: 25, d: 'Priests ×2.' },
  masonry: { n: 'Masonry', c: { wood: 120, lore: 30 }, t: 30, d: 'Each hut houses 6.' },
  roads: { n: 'Roads', c: { wood: 200, lore: 60 }, t: 40, d: 'Distance from home counts half. Settlers arrive in half the time.' },
  picks: { n: 'Bronze Picks', c: { metal: 15 }, t: 15, d: 'Miners ×2. Veins drain twice as fast.', req: s => s.b.forge > 0 },
  plough: { n: 'Bronze Plough', c: { metal: 25 }, t: 20, d: 'Farmers ×1.4.', req: s => s.b.forge > 0 },
  bellows: { n: 'Bellows', c: { metal: 30, lore: 30 }, t: 25, d: 'Smiths ×2.', req: s => s.b.forge > 0 },
  medicine: { n: 'Herb-lore', c: { lore: 100, awe: 40 }, t: 40, d: 'Growth ×1.5. Famine kills half as fast.' },
  shafts: { n: 'Deep Shafts', c: { metal: 60, wood: 200 }, t: 40, d: 'Opens 4,000 more ore.', req: s => s.b.mine > 0 },
  drill: { n: 'The Long Drill', c: { arms: 100 }, t: 40, d: 'Armorers ×2, smiths ×1.5.' },
  hymnal: { n: 'The Thousand-Voice Hymnal', c: { awe: 300 }, t: 40, d: 'Each priest gains 2% per citizen.' },
  fort: { n: 'Palisades', c: { wood: 150, lore: 40 }, t: 40, d: 'Unlocks the Palisade, which stops the Host at a site.' },
  quar: { n: 'Quarantine', c: { lore: 500, awe: 150 }, t: 60, d: 'Unlocks the Lazaret, which keeps a site alive through the Plague.', req: (s, M) => M.E.pit || !MAP.hasPit },
  terracing: { n: 'Terracing', c: { lore: 250, wood: 300 }, t: 50, d: 'Every site holds 2 more plots.', req: (s, M) => M.E.hint_terrace },
  milling: { n: 'The Great Wheel', c: { lore: 300 }, t: 50, d: 'Unlocks the Great Mill.', req: (s, M) => M.E.hint_mill },
  archives: { n: 'Shelving the World', c: { lore: 400 }, t: 50, d: 'Unlocks the Great Library.', req: (s, M) => M.E.hint_lib },
  liturgy: { n: 'The Long Liturgy', c: { awe: 400 }, t: 50, d: 'Unlocks the Great Temple.', req: (s, M) => M.E.hint_temple },
  casting: { n: 'Casting in the Round', c: { lore: 200, metal: 100 }, t: 50, d: 'Unlocks the Great Foundry.', req: (s, M) => M.E.hint_foundry },
  academy: { n: 'The Academy', c: { lore: 300 }, t: 40, d: 'Scholars ×2. Research takes half the time.' }
};
const RELIC = {
  sword: { n: 'the Unbroken Sword', verb: 'Forge', c: { arms: 2200, metal: 400 }, sh: { awe: 600 }, shn: 'It wants to be feared. Awe turns it aside.', buff: 'Armorers ×2.' },
  bell: { n: 'the Bell That Rings Backward', verb: 'Cast', c: { awe: 9000 }, sh: { lore: 600 }, shn: 'It rings things back out of being. Lore holds them in place.', buff: 'Priests ×2.' },
  lens: { n: 'the Lens of Last Light', verb: 'Grind', c: { lore: 9000 }, sh: { arms: 300 }, shn: 'Whatever it shows walks out of it. Arms meet what walks.', buff: 'Scholars ×2.' }
};
const TIDES = [
  { t: 700, n: 'The Ashen Host', omen: 'Smoke stands on the eastern horizon and does not move with the wind.' },
  { t: 1500, n: 'The Glass Plague', omen: 'A fisherman coughs, and something in the cough chimes.' }
];
const HOST_ARMS = 100, HOST_SPAN = 250;
const RAISE_T = 200, WAKE_T = 80, SLEEPER = 300;
const FIXED = [];
CLIM.slice(1, -1).forEach(c => FIXED.push({ t: c[0], k: 'c' }));
FIXED.push({ t: 210, k: 'log', x: 'The elders say the summers are getting shorter.', c: 'omen' });
FIXED.push({ t: 340, k: 'winterEnd' });
TIDES.forEach((T, i) => { FIXED.push({ t: T.t - 45, k: 'log', x: T.omen, c: 'omen' }); FIXED.push({ t: T.t, k: 'tide', i }); });
FIXED.push({ t: DRY_T - 20, k: 'log', x: 'The river is lower than the marks the grandfathers cut. People say it will come back.', c: 'omen' });
FIXED.push({ t: DRY_T + 60, k: 'log', x: 'The Drying. The river has not come back, and each harvest is a little thinner than the one before. Nobody now expects otherwise.', c: 'bad' });
FIXED.push({ t: 1190, k: 'log', x: 'The geese leave a month early and do not come back the usual way.', c: 'omen' });
FIXED.push({ t: 1900, k: 'log', x: 'The sun is a shade redder than the old songs say it was.', c: 'omen' });
FIXED.push({ t: FINAL_T - 60, k: 'log', x: 'Words are going missing. Nobody can remember the name of the month before this one.', c: 'omen' });
FIXED.push({ t: FINAL_T, k: 'final' });
FIXED.sort((a, b) => a.t - b.t);
const STOCKFEATS = [['metal', 40, 'bronze'], ['lore', 60, 'letters'], ['awe', 60, 'sky']];
const HOME_ROOM = 12, SITE_ROOM = 8;

const has = (st, k) => !!(st.rel[k] || (st.paid[k] && st.src[k] > 0));
function derive(st, M) {
  const u = st.up, d = { eff: {}, used: {}, groups: {}, slots: {} };
  const dist = { 0: 0 }; // travel time from home through settled ground
  for (let ch = true; ch;) { ch = false; for (const s in st.own) if (dist[s] !== undefined) for (const e of MAP.sites[s].adj) if (st.own[e.to] && (dist[e.to] === undefined || dist[s] + e.len < dist[e.to] - 1e-9)) { dist[e.to] = dist[s] + e.len; ch = true; } }
  for (const s in st.own) d.eff[s] = 1 / (1 + (dist[s] === undefined ? 600 : dist[s]) * (u.roads ? .5 : 1) / 250);
  d.dist = dist;
  for (const j of JOBLIST) d.groups[j] = [];
  d.groups.woodcutter.push({ s: 0, n: 2, m: siteMult(st, d, 0, 'woodcutter') });
  let huts = 0, gran = 0;
  for (const s in st.own) { let n = 0; const sb = st.sb[s]; for (const b in sb) { n += sb[b]; if (BJ[b]) d.groups[BJ[b][0]].push({ s: +s, n: sb[b] * BJ[b][1], m: siteMult(st, d, +s, BJ[b][0]) }); else if (b === 'hut') huts += sb[b]; else if (b === 'granary') gran += sb[b]; } d.used[s] = n; }
  for (const j of JOBLIST) { d.groups[j].sort((a, b) => b.m - a.m || a.s - b.s); d.slots[j] = d.groups[j].reduce((a, g) => a + g.n, 0); }
  d.housing = 6 + M.housing + huts * (u.masonry ? 6 : 4);
  d.jm = {
    forager: M.forage, farmer: M.farm * (u.irrigation ? 1.4 : 1) * (u.plough ? 1.4 : 1), woodcutter: M.wood * (u.axes ? 1.5 : 1),
    miner: M.mine * (u.picks ? 2 : 1), smith: M.smith * (u.bellows ? 2 : 1) * (u.drill ? 1.5 : 1),
    armorer: (u.drill ? 2 : 1) * (has(st, 'sword') ? 2 : 1), scholar: (u.writing ? 2 : 1) * (u.academy ? 2 : 1) * (has(st, 'lens') ? 2 : 1),
    priest: (u.rites ? 2 : 1) * (u.hymnal ? 1 + 0.02 * st.pop : 1) * (has(st, 'bell') ? 2 : 1)
  };
  d.cap = { food: (100 + gran * 150) * M.foodCap * (u.pottery ? 1.5 : 1) };
  d.growT = 12 / (1 + st.pop / 8) / (M.growth * (u.medicine ? 1.5 : 1));
  d.starveT = u.medicine ? 12 : 6;
  d.research = M.research * (u.academy ? .5 : 1);
  d.memPop = 0.02 * (1 + 0.25 * st.b.stele);
  return d;
}
/* how well a post of job j works at site s: favoured ground, favoured neighbours, distance from home */
function siteMult(st, d, s, j) {
  if (st.red[s]) return 0; const S = MAP.sites[s]; let m = d.eff[s] === undefined ? 1 : d.eff[s], a = 0;
  if (TER[S.ter].fav.includes(j)) m *= 1.5;
  const sb = st.sb[s]; if (sb) for (const g in GREAT) if (sb[g] && GREAT[g].includes(j)) m *= g === 'gmill' ? 2.5 : 2;
  for (const e of S.adj) if (st.own[e.to] && !st.red[e.to] && TER[MAP.sites[e.to].ter].fav.includes(j)) a++;
  return m * (1 + .2 * a);
}
function nSites(st) { let n = 0; for (const s in st.own) n++; for (const p of st.proj) if (p.x === 'settle') n++; return n; }
function costOf(st, o, M) {
  const out = {};
  if (o.k === 'b') { const B = BLD[o.x], f = Math.pow(B.g, st.b[o.x]) * M.cost; for (const r in B.c) out[r] = Math.ceil(B.c[r] * f); }
  else if (o.k === 'u') { const U = UPG[o.x]; for (const r in U.c) out[r] = Math.ceil(U.c[r] * M.cost); }
  else if (o.k === 's') { const n = nSites(st) - 1; out.wood = Math.ceil(40 * Math.pow(1.7, n) * M.cost); out.food = Math.ceil(30 * Math.pow(1.4, n) * M.cost); }
  else if (o.k === 'r') { const c = RELIC[MAP.sites[o.s].feat.slice(6)].c, f = Math.pow(3, relicLoad(st)) * M.cost; for (const r in c) out[r] = Math.ceil(c[r] * f); }
  else if (o.k === 'sh') { const c = RELIC[o.x].sh; for (const r in c) out[r] = c[r]; }
  return out;
}
function relicLoad(st) { let n = 0; for (const k in st.rel) n++; for (const p of st.proj) if (p.x === 'raise') n++; return n; } /* each relic a lane carries makes the next three times heavier */
const plots = (st, s) => (s == 0 ? HOME_ROOM : SITE_ROOM) + (st.up.terracing ? 2 : 0);
function room(st, s) { let n = 0; const sb = st.sb[s] || {}; for (const b in sb) n += sb[b]; return plots(st, s) - n; }
function reqOk(st, o, M) {
  if (o.k === 'b') { const B = BLD[o.x]; return !!st.own[o.s] && !st.red[o.s] && room(st, o.s) > 0 && (!B.ter || MAP.sites[o.s].ter === B.ter) && (!B.req || !!B.req(st)); }
  if (o.k === 'u') { const U = UPG[o.x]; return !U.req || !!U.req(st, M); }
  if (o.k === 's') return !MAP.sites[o.s].shore && MAP.sites[o.s].adj.some(e => st.own[e.to]);
  if (o.k === 'r') return !!st.own[o.s];
  return true;
}
function isVoid(st, o) { /* can never happen in this lane as it stands */
  if (o.k === 'u') return !!(st.up[o.x] || st.proj.some(p => p.x === o.x));
  if (o.k === 's') return !!(MAP.sites[o.s].shore || st.own[o.s] || st.lost[o.s] || st.proj.some(p => p.x === 'settle' && p.s === o.s));
  if (o.k === 'b') return !!st.lost[o.s] || !!(BLD[o.x].ter && MAP.sites[o.s].ter !== BLD[o.x].ter) || !!(BLD[o.x].uniq && st.b[o.x] > 0);
  if (o.k === 'r') { const f = MAP.sites[o.s].feat; if (!f || !f.startsWith('relic_') || st.lost[o.s]) return true; return !!(st.rel[f.slice(6)] || st.proj.some(p => p.x === 'raise' && p.s === o.s)); }
  return false;
}
function settleTime(st, s) { let t = Infinity; for (const e of MAP.sites[s].adj) if (st.own[e.to]) t = Math.min(t, e.len); return t * (st.up.roads ? .5 : 1); }
const famThr = (st, d) => Math.min(d.cap.food * .5, st.pop * 3); /* a famine is over when this much is back in store */
function initState(M) {
  const b = {}; for (const k in BLD) b[k] = 0;
  return { t: 0, pop: 4 + M.startPop, s: { vein: 0, ore: 0, metal: 0, arms: 0, wood: 5, lore: 0, awe: 0, food: 30, mem: 0 }, b, sb: { 0: {} }, own: { 0: 1 }, lost: {}, red: {}, up: {}, proj: [],
    rel: {}, src: {}, paid: {}, fam: 0, evict: Infinity, hq: [], hs: {}, ha: {}, prio: JOBLIST.slice(), lim: {}, grow: Infinity, starve: Infinity, noGrow: 0, deaths: 0, feats: {}, pend: [], fi: 0, ri: 0, deepT: Infinity, deepS: -1, woke: 0, won: 0, dead: 0 };
}
function clone(st) { const sb = {}; for (const s in st.sb) sb[s] = { ...st.sb[s] }; return { ...st, s: { ...st.s }, b: { ...st.b }, sb, own: { ...st.own }, lost: { ...st.lost }, red: { ...st.red }, up: { ...st.up }, proj: st.proj.map(p => ({ ...p })), hq: st.hq.map(h => ({ ...h })), hs: { ...st.hs }, ha: { ...st.ha }, rel: { ...st.rel }, src: { ...st.src }, paid: { ...st.paid }, prio: st.prio.slice(), lim: { ...st.lim }, feats: { ...st.feats }, pend: st.pend.slice() }; }

class Sim {
  constructor(orders, M, id) { this.orders = orders; this.M = M; this.id = id; this.inbox = []; this.reset(); }
  reset() {
    this.segs = []; this.recs = []; this.feats = []; this.log = []; this.emit = []; this.byId = null; this.doneTo = 0;
    const st = initState(this.M); this.events(st, -1); this.segs.push(this.build(st));
  }
  trunc(t) { for (const a of [this.recs, this.feats, this.log, this.emit]) { let n = a.length; while (n && a[n - 1].t > t) n--; a.length = n; } }
  invalidate(t) { /* something at time t changed: keep only what is strictly before it */
    this.byId = null; if (t > this.doneTo) return;
    let i = this.idx(t); while (i >= 0 && this.segs[i].t0 >= t) i--;
    if (i < 0) return this.reset();
    const st = this.segs[i].st; this.segs.length = i; this.trunc(st.t); this.segs.push(this.build(st)); this.doneTo = st.t;
  }
  order(id) { if (typeof id === 'string') return { id, k: 'sh', x: id.slice(3) }; if (!this.byId) { this.byId = new Map(); for (const o of this.orders) this.byId.set(o.id, o); } return this.byId.get(id); }
  firstAfter(t) { let lo = 0, hi = this.orders.length; while (lo < hi) { const m = (lo + hi) >> 1; if (this.orders[m].t > t) hi = m; else lo = m + 1; } return lo; }
  idx(t) { let lo = 0, hi = this.segs.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (this.segs[m].t0 <= t) lo = m; else hi = m - 1; } return lo; }
  note(st, x, c) { this.log.push({ t: st.t, x, c }); }
  feat(st, k, t) { if (st.feats[k]) return; st.feats[k] = 1; this.feats.push({ k, t: t === undefined ? st.t : t }); }
  send(st, k, x) { this.emit.push({ t: st.t, k, x, from: this.id }); }

  /* advance to T. The open last segment is rebuilt first, because the inbox may have grown. */
  extendTo(T) {
    const last = this.segs.pop(); this.trunc(last.st.t);
    let cur = this.build(last.st), guard = 0, stuck = 0; this.segs.push(cur);
    while (cur.t1 <= T && guard++ < 200000) {
      const st = clone(cur.st), tau = cur.t1 - cur.t0; st.t = cur.t1;
      for (const r of RES) { let v = pev(cur.P[r], tau); const cap = cur.d && cur.d.cap[r]; if (v < 1e-7) v = 0; if (cap && v > cap - 1e-7) v = cap; st.s[r] = v; }
      for (const f of cur.nf) st.feats[f] = 1;
      this.events(st, cur.t0);
      stuck = tau < 1e-7 ? stuck + 1 : 0;
      cur = this.build(st, stuck > 40 ? 1e-3 : EPS); this.segs.push(cur);
    }
    this.doneTo = T;
  }

  /* everything that happens at the instant st.t */
  events(st, prevT) {
    const M = this.M;
    while (FIXED[st.fi] && FIXED[st.fi].t <= st.t) this.fixed(st, FIXED[st.fi++]);
    for (let go = true; go && !st.dead;) { go = false; for (let i = 0; i < st.hq.length; i++) if (st.hq[i].t <= st.t + EPS) { const h = st.hq.splice(i, 1)[0]; this.host(st, h.s); go = true; break; } }
    if (st.dead) return;
    while (M.red[st.ri] && M.red[st.ri].t <= st.t) { const s = M.red[st.ri++].s; st.red[s] = 1; if (st.own[s]) this.note(st, MAP.sites[s].name + ' is still there, but nobody can say what it was for. Its posts fall idle.', 'bad'); }
    const arrived = [];
    for (const e of this.inbox) { // what bled through from other lanes, BLEED years after it happened there
      if (e.ta <= prevT || e.ta > st.t) continue;
      if (e.k === 'tech') { if (st.up[e.x]) continue; st.up[e.x] = 1; st.proj = st.proj.filter(p => p.x !== e.x); this.feat(st, 'bleed'); this.note(st, 'The people wake knowing ' + UPG[e.x].n + '. Nobody here taught it.', 'bleed'); }
      else if (e.k === 'light') { st.src[e.x] = (st.src[e.x] || 0) + 1; if (!st.rel[e.x] && !st.paid[e.x] && !st.pend.includes('sh:' + e.x)) { st.pend.push('sh:' + e.x); arrived.push(e.x); } }
      else if (e.k === 'dark') { st.src[e.x] = Math.max(0, (st.src[e.x] || 0) - 1); if (!st.src[e.x] && st.paid[e.x]) this.note(st, 'The light of ' + RELIC[e.x].n + ' goes out. The lane that held it is gone.', 'bad'); }
      else if (e.k === 'sleeper' && !st.woke) this.sleeper(st, 'Something enormous walks through, on its way from another history.');
    }
    if (st.proj.length) st.proj = st.proj.filter(p => {
      if (p.done > st.t + EPS) return true;
      if (p.x === 'settle') this.settle(st, p.s);
      else if (p.x === 'raise') { const k = MAP.sites[p.s].feat.slice(6); st.rel[k] = 1; this.feat(st, 'raised_' + k); this.send(st, 'light', k); this.note(st, 'It is finished. ' + RELIC[k].n[0].toUpperCase() + RELIC[k].n.slice(1) + ' exists, and its light begins to cross to the other lanes.', 'feat'); if (st.rel.sword && st.rel.bell && st.rel.lens) this.feat(st, 'whole'); }
      else { st.up[p.x] = 1; this.send(st, 'tech', p.x); this.note(st, UPG[p.x].n + ' is understood.', 'up'); }
      return false;
    });
    if (st.deepT <= st.t + EPS) { st.deepT = Infinity; st.woke = 1; this.feat(st, 'woke'); this.send(st, 'sleeper'); this.sleeper(st, 'The mine breaks into a chamber, and the chamber opens an eye.', st.deepS); }
    if (st.evict <= st.t + EPS) { st.pop--; st.evict = Infinity; st.gone = (st.gone || 0) + 1; if (st.gone === 1) this.note(st, 'There are more people than roofs. The unhoused begin to drift away, a family every few years.', 'bad'); }
    if (st.grow <= st.t + EPS) { st.pop++; st.grow = Infinity; }
    if (st.starve <= st.t + EPS) { st.pop--; st.deaths++; st.starve = Infinity; st.noGrow = st.t + 60; st.grow = Infinity; if (st.deaths === 1) this.note(st, 'The stores are empty. The first grave of the famine is dug.', 'bad'); }
    for (let i = this.firstAfter(prevT); i < this.orders.length && this.orders[i].t <= st.t; i++) {
      const o = this.orders[i];
      if (o.k === 'l') { if (o.n == null) delete st.lim[o.x]; else st.lim[o.x] = o.n; this.recs.push({ id: o.id, t: st.t, s: 'ok' }); }
      else if (o.k === 'p') { st.prio = o.list.slice(); this.recs.push({ id: o.id, t: st.t, s: 'ok' }); }
      else if (o.k === 'd') { const ok = st.own[o.s] && st.sb[o.s][o.x] > 0; if (ok) { st.b[o.x]--; if (!--st.sb[o.s][o.x]) delete st.sb[o.s][o.x]; } this.recs.push({ id: o.id, t: st.t, s: ok ? 'ok' : 'void' }); }
      else st.pend.push(o.id);
    }
    for (let again = true; again && st.pend.length;) {
      again = false;
      for (let i = 0; i < st.pend.length; i++) {
        const o = this.order(st.pend[i]);
        if (isVoid(st, o)) { this.recs.push({ id: o.id, t: st.t, s: 'void' }); st.pend.splice(i--, 1); continue; }
        if (!reqOk(st, o, M)) continue;
        const c = costOf(st, o, M); let ok = true;
        for (const r in c) if (st.s[r] < c[r] - 1e-6) { ok = false; break; }
        if (!ok) continue;
        for (const r in c) st.s[r] = Math.max(0, st.s[r] - c[r]);
        const rec = { id: o.id, t: st.t, s: 'ok' };
        if (o.k === 'b') { st.b[o.x]++; st.sb[o.s][o.x] = (st.sb[o.s][o.x] || 0) + 1; if (o.x === 'mine' && MAP.sites[o.s].feat === 'deep' && !st.woke && st.deepT === Infinity) { st.deepT = st.t + WAKE_T; st.deepS = o.s; this.note(st, 'The miners at ' + MAP.sites[o.s].name + ' say the hill breathes. They are told to keep digging.', 'omen'); } }
        else if (o.k === 'u') { rec.done = st.t + UPG[o.x].t * derive(st, M).research; st.proj.push({ x: o.x, t0: st.t, done: rec.done }); }
        else if (o.k === 's') { rec.done = st.t + settleTime(st, o.s); st.proj.push({ x: 'settle', s: o.s, t0: st.t, done: rec.done }); }
        else if (o.k === 'r') { rec.done = st.t + RAISE_T; st.proj.push({ x: 'raise', s: o.s, t0: st.t, done: rec.done }); }
        else if (o.k === 'sh') { st.paid[o.x] = 1; this.feat(st, 'shadow'); this.note(st, 'The shadow of ' + RELIC[o.x].n + ' is answered. Its light is welcome here now.', 'feat'); }
        if (o.k !== 'sh') this.recs.push(rec);
        st.pend.splice(i--, 1); again = true;
      }
    }
    for (const k of arrived) if (!st.paid[k]) { st.pop = Math.max(2, Math.ceil(st.pop * .75)); this.note(st, 'The shadow of ' + RELIC[k].n + ' arrives from another lane, ahead of its light. ' + RELIC[k].shn + ' There was not enough. A quarter of the people are gone.', 'bad'); }
    if (st.fam && st.s.food >= famThr(st, derive(st, M)) - 1e-6) st.fam = 0;
    if (st.pop >= 8) this.feat(st, 'hearth');
    if (st.deaths >= 3) this.feat(st, 'hunger');
    for (const [r, n, k] of STOCKFEATS) if (st.s[r] >= n) this.feat(st, k);
  }
  settle(st, s) {
    const S = MAP.sites[s], f = S.feat; st.own[s] = 1; st.sb[s] = {}; this.feats.push({ k: 'own:' + s, t: st.t }); this.feat(st, 'second');
    let x = 'Settlers reach ' + S.name + '.';
    if (S.ter === 'hills') st.s.vein += 1500;
    if (f && f.startsWith('relic_')) { this.feat(st, 'found_' + f.slice(6)); x += ' ' + FEAT[f]; }
    else if (f === 'deep') { st.s.vein += 8000; x += ' The hill rings hollow. There is more ore here than a hill should hold.'; }
    else if (f === 'pit') { st.pop = Math.max(2, Math.ceil(st.pop * .65)); this.feat(st, 'pit'); x += ' The ground is full of old dead, and the old dead are catching.'; }
    else if (f && f.startsWith('hint_')) { this.feat(st, f); x += ' ' + FEAT[f]; }
    else if (f === 'cache') { st.s.wood += 150; st.s.food += 100; x += ' ' + FEAT[f]; }
    else if (f === 'vault') { st.s.lore += 150; x += ' ' + FEAT[f]; }
    else if (f === 'stones') { st.s.awe += 150; x += ' ' + FEAT[f]; }
    else if (f === 'herd') { st.s.food += 250; x += ' ' + FEAT[f]; }
    this.note(st, x, f === 'pit' ? 'bad' : f ? 'feat' : 'up');
    for (const e of S.adj) { const N = MAP.sites[e.to], r = rumour(N); if (r && !st.own[e.to] && !st.lost[e.to]) { this.feats.push({ k: 'rum:' + e.to, t: st.t }); this.note(st, r, 'omen'); } }
  }
  sleeper(st, x, s) {
    if (st.s.arms >= SLEEPER - 1e-6) { st.s.arms -= SLEEPER; this.note(st, x + ' The line holds. It goes back to sleep.', 'feat'); return; }
    st.pop = Math.max(2, Math.ceil(st.pop * .75));
    if (s !== undefined && s >= 0 && st.own[s]) { this.drop(st, s); st.lost[s] = 1; x += ' ' + MAP.sites[s].name + ' is lost, with a quarter of the people.'; }
    else x += ' A quarter of the people are simply not there afterwards.';
    this.note(st, x, 'bad');
  }
  fixed(st, f) {
    if (st.dead) return;
    if (f.k === 'log') this.note(st, f.x, f.c);
    else if (f.k === 'winterEnd') {
      if (!st.deaths && st.pop >= 12) { this.feat(st, 'stored'); this.note(st, 'The Long Winter ends. Every name in the census is still there.', 'feat'); }
      else this.note(st, 'The Long Winter ends.' + (st.deaths ? ' ' + st.deaths + ' did not see the thaw.' : ''), st.deaths ? 'bad' : 'up');
    } else if (f.k === 'tide' && f.i === 0) { st.hq.push({ s: MAP.east, t: st.t }); st.hs[MAP.east] = 1; // the Host lands in the east and takes the roads
    } else if (f.k === 'tide') { // the Plague: every site without a lazaret is emptied for good
      let n = 0, safe = 0; const gone = [];
      for (const k in st.own) { n++; if (st.sb[k].lazaret) safe++; else gone.push(+k); }
      if (gone.includes(0)) return this.fall(st, 'The Glass Plague', 'The Glass Plague reached Hearthford and found no lazaret. The houses are still standing. They are perfectly quiet.');
      for (const k of gone) { this.drop(st, k); st.lost[k] = 1; }
      st.pop = Math.max(2, Math.ceil(st.pop * safe / n));
      if (!gone.length) { this.feat(st, 'plague'); this.note(st, 'The Glass Plague. Every settlement had its lazaret, and every one of them held.', 'feat'); }
      else this.note(st, 'The Glass Plague. ' + gone.map(k => MAP.sites[k].name).join(', ') + (gone.length > 1 ? ' are' : ' is') + ' glass now, and will not be lived in again. The settlements with lazarets held.', 'bad');
    } else if (f.k === 'final') {
      if (has(st, 'sword') && has(st, 'bell') && has(st, 'lens')) { st.won = 1; this.feat(st, 'dawn'); this.note(st, 'The Unwriting arrives and finds the page already held down at three corners. It lifts what it can, which is nothing. Morning comes.', 'feat'); }
      else this.fall(st, 'The Unwriting', 'The Unwriting arrives. It is not cruel. It reads the lane once, and then the lane has not been written.');
    }
  }

  fall(st, by, x) { st.dead = st.t; st.by = by; st.pend = []; st.proj = []; st.hq = []; this.feat(st, 'ruin'); for (const k in st.rel) this.send(st, 'dark', k); this.note(st, x, 'fall'); }
  drop(st, s) { for (const b in st.sb[s]) st.b[b] -= st.sb[s][b]; delete st.own[s]; delete st.sb[s]; st.proj = st.proj.filter(p => p.s !== s); }
  host(st, s) { /* the Host reaches site s: stopped by a palisade or by arms, otherwise it burns the place and marches on */
    if (s === MAP.east) this.note(st, 'Sails off the Ashen Strand, more than anyone can count. The Host is ashore and on every road out.', 'bad');
    if (st.own[s]) {
      if (st.sb[s].palisade) { this.feat(st, 'host'); return this.note(st, 'The Ashen Host breaks on the palisade at ' + MAP.sites[s].name + ' and goes no further that way.', 'feat'); }
      if (st.s.arms >= HOST_ARMS - 1e-6) { st.s.arms -= HOST_ARMS; this.feat(st, 'host'); return this.note(st, 'The Ashen Host is met in the field at ' + MAP.sites[s].name + ' and turned.', 'feat'); }
      if (s === 0) return this.fall(st, 'The Ashen Host', 'The Ashen Host reached Hearthford by the open road. After them there was only ash.');
      this.drop(st, s); st.pop = Math.max(2, Math.ceil(st.pop * .85)); this.note(st, 'The Ashen Host burns ' + MAP.sites[s].name + ' to the plots and takes the road onward.', 'bad');
    }
    st.ha[s] = st.t;
    for (const e of MAP.sites[s].adj) { const ta = st.t + e.len * .5; if (!st.hs[e.to] && ta <= TIDES[0].t + HOST_SPAN) { st.hs[e.to] = 1; st.hq.push({ s: e.to, t: ta }); } }
  }

  /* closed-form segment starting from state st */
  build(st, minTau = EPS) {
    const M = this.M, seg = { t0: st.t, t1: Infinity, st, P: {}, mode: {}, w: {}, nf: [], d: null };
    if (st.dead) { for (const r of RES) seg.P[r] = [st.s[r]]; return seg; }
    const d = seg.d = derive(st, M), act = {};
    let free = st.pop;
    for (const j of (st.fam ? ['farmer', ...st.prio.filter(j => j !== 'farmer')] : st.prio)) { // best posts first; in a famine, farms before anything
      let n = Math.max(0, Math.min(free, d.slots[j], st.lim[j] == null ? Infinity : st.lim[j])), a = 0; seg.w[j] = n; free -= n;
      for (const g of d.groups[j]) { const k = Math.min(n, g.n); a += k * g.m; n -= k; if (!n) break; }
      act[j] = a * d.jm[j];
    }
    seg.w.forager = free; act.forager = free * d.jm.forager; seg.act = act;
    const clim = climAt(st.t), F = {};
    for (const j in JOBS) F[j] = pscale(JOBS[j].clim ? clim : [1], act[j]);
    let tS = Infinity;
    if (FIXED[st.fi]) tS = FIXED[st.fi].t;
    if (M.red[st.ri]) tS = Math.min(tS, M.red[st.ri].t);
    const oi = this.firstAfter(st.t); if (oi < this.orders.length) tS = Math.min(tS, this.orders[oi].t);
    for (const p of st.proj) tS = Math.min(tS, p.done);
    for (const e of this.inbox) if (e.ta > st.t) { tS = Math.min(tS, e.ta); break; }
    tS = Math.min(tS, st.deepT); for (const h of st.hq) tS = Math.min(tS, h.t);
    const roots = [];
    for (const r of RES) {
      let inflow = [0], D = r === 'food' ? st.pop * UPKEEP : 0;
      for (const j in JOBS) { const J = JOBS[j]; if (J.out[0] === r) inflow = padd(inflow, F[j], J.out[1]); if (J.inp && J.inp[0] === r) D += J.inp[1] * act[j]; }
      if (r === 'mem') inflow = padd(padd([st.pop * d.memPop], seg.P.lore, 0.001), seg.P.awe, 0.001);
      const net = padd(inflow, [D], -1), s0 = st.s[r], cap = d.cap[r] || Infinity, sg = psign0(net);
      if (s0 <= EPS && sg < 0) { // empty: consumers are throttled to what flows in
        seg.mode[r] = 'empty'; seg.P[r] = [0];
        for (const j in JOBS) if (JOBS[j].inp && JOBS[j].inp[0] === r) F[j] = pscale(inflow, act[j] / D);
        roots.push(net);
      } else if (s0 >= cap - EPS && sg > 0) { seg.mode[r] = 'full'; seg.P[r] = [cap]; roots.push(net); }
      else { seg.P[r] = pint(net, s0); if (ptrim(net).length > 1 || sg < 0) roots.push(seg.P[r]); if (cap < Infinity) roots.push(padd(seg.P[r], [cap], -1)); }
    }
    seg.starving = seg.mode.food === 'empty';
    if (seg.starving && !st.fam) { st.fam = 1; return this.build(st, minTau); } // hunger reorders the work at once
    if (st.fam && !seg.mode.food) roots.push(padd(seg.P.food, [famThr(st, d)], -1));
    if (seg.starving) { st.grow = Infinity; if (st.starve === Infinity) st.starve = st.t + d.starveT; }
    else { st.starve = Infinity; if (st.pop >= d.housing || st.fam) st.grow = Infinity; /* a hungry people does not grow */ else if (st.grow === Infinity) st.grow = Math.max(st.t, st.noGrow) + d.growT; }
    if (st.pop > d.housing) { if (st.evict === Infinity) st.evict = st.t + 3; } else st.evict = Infinity; // more people than roofs: one leaves every 3 years
    tS = Math.min(tS, st.grow, st.starve, st.evict);
    let tmax = Math.min(tS - st.t, 1e6), tR = Infinity;
    for (const p of roots) tR = Math.min(tR, firstRoot(p, Math.min(tmax, tR), minTau));
    tmax = Math.min(tmax, tR);
    for (const id of st.pend) { // when does a waiting order become affordable?
      const o = this.order(id); if (!reqOk(st, o, M)) continue;
      const c = costOf(st, o, M); let ta = 0;
      for (const r in c) { if (st.s[r] >= c[r] - 1e-6) continue; ta = Math.max(ta, firstRoot(padd(seg.P[r], [c[r]], -1), tmax, minTau)); if (ta === Infinity) break; }
      if (ta > 0 && ta < tR) { tR = ta; tmax = Math.min(tmax, tR); }
    }
    seg.t1 = Math.min(tS, st.t + tR);
    const span = Math.min(seg.t1 - st.t, 1e6);
    for (const [r, n, k] of STOCKFEATS) if (!st.feats[k]) { const x = firstRoot(padd(seg.P[r], [n], -1), span); if (x < Infinity) { seg.nf.push(k); this.feats.push({ k, t: st.t + x }); } }
    return seg;
  }
  at(t) {
    t = Math.min(t, this.doneTo);
    const seg = this.segs[this.idx(t)], tau = t - seg.t0, v = {}, dv = {};
    for (const r of RES) { v[r] = Math.max(0, pev(seg.P[r], tau)); dv[r] = pev(pder(seg.P[r]), tau); }
    return { seg, st: seg.st, d: seg.d, v, dv, w: seg.w, mode: seg.mode, clim: climAt(t)[0] };
  }
}

/* all the lanes together: an edit at t in one lane can only matter elsewhere from t + BLEED */
class World {
  constructor(M) { this.M = M; this.sims = new Map(); }
  add(id, orders) { const s = new Sim(orders, this.M, id); for (const o of this.sims.values()) o.invalidate(BLEED); this.sims.set(id, s); return s; }
  remove(id) { this.sims.delete(id); for (const o of this.sims.values()) o.invalidate(BLEED); }
  edit(id, t) { for (const [k, s] of this.sims) s.invalidate(k === id ? t : t + BLEED); }
  ensure(T) {
    const S = [...this.sims.values()];
    for (let g = 0; g < 100000; g++) {
      let m = Infinity; for (const s of S) m = Math.min(m, s.doneTo);
      if (m >= T) return;
      const tgt = Math.min(T, m + BLEED);
      for (const s of S) if (s.doneTo < tgt) {
        const inbox = []; for (const o of S) if (o !== s) for (const e of o.emit) if (e.t + BLEED <= tgt) inbox.push({ ...e, ta: e.t + BLEED });
        inbox.sort((a, b) => a.ta - b.ta || a.from - b.from); s.inbox = inbox; s.extendTo(tgt);
      }
    }
  }
}
