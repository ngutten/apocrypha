/* ===== Engine: exact event-driven simulation, no timestepping. =====
   Between events every stock is a polynomial in tau = t - t0. Nothing about the future is stored:
   each segment recomputes "what happens next" from its start state. Lanes affect each other only
   after BLEED years, so all cross-lane dependencies point forward in time and the lanes can be
   advanced together in steps of BLEED. */
const EPS = 1e-9, BLEED_MIN = 20, BLEED_MAX = 400;
let FINAL_T = 2400; /* set by setTimeline: the Archive's records push the Unwriting later */
const bleedDelay = mem => BLEED_MIN + (BLEED_MAX - BLEED_MIN) / (1 + mem / 300); /* a well-remembered lane is heard sooner */
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
function hash2(ix, iy, s) { let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(s, 2147483647); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
function vnoise(x, y, s) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, s) { return (vnoise(x, y, s) + .5 * vnoise(x * 2.1, y * 2.1, s + 7) + .25 * vnoise(x * 4.3, y * 4.3, s + 13)) / 1.75 - .5; }


const TER = {
  plain: { n: 'River plain', fav: ['farmer'], c: '#a9bf6a', suf: ['Ford', 'Mead', 'Reach'] },
  forest: { n: 'Forest', fav: ['woodcutter', 'armorer'], c: '#5f9a78', suf: ['Holt', 'Shade', 'Weald'] },
  hills: { n: 'Hills', fav: ['miner', 'smith'], c: '#b7a58c', suf: ['Tor', 'Scar', 'Delve'] },
  ruins: { n: 'Ruins', fav: ['scholar'], c: '#8fa3d6', suf: ['Gate', 'Hold', 'Stair'] },
  peak: { n: 'High peak', fav: ['priest', 'miner'], c: '#c48bb8', suf: ['Horn', 'Crown', 'Spire'] },
  marsh: { n: 'Marsh', fav: [], c: '#7d8c7a', suf: ['Fen', 'Mire', 'Sink'] },
  shore: { n: 'Empty strand', fav: [], c: '#d0603f', suf: [] }
};
const FEAT = {
  dun: 'A stair going down, cut for feet larger than yours. Cold air comes up it. This is the Undercroft.',
  rite: 'A hollow in the rock shaped like the inside of a bell. Sound behaves strangely in it.',
  pit: 'A plague pit. A third of any people who settle here die of it.',
  hint_terrace: 'Terraced walls, older than the oldest song. Somebody once made this ground hold more than it should.', hint_mill: 'A millstone the size of a house, cracked, beside a dry race.', hint_lib: 'Shelves cut into the rock, floor to roof, every one of them empty.', hint_temple: 'A nave with no roof. A whisper at one end is a shout at the other.', hint_foundry: 'A casting pit, and in it the mould of something very large.',
  cache: 'A cache of seasoned timber and sealed grain.', vault: 'A vault of tablets, still legible.', stones: 'Standing stones that hum at dusk.', herd: 'A valley of half-tame cattle.'
};
const FLOORS = 12, ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
/* geography first: height and wetness fields, a bay to the east, rivers downhill. Sites read their ground off it. */
function geography(S, strand, seed) {
  const real = S.filter(s => !s.shore), home = S[0];
  const cx = y => { const t = Math.min(1, Math.abs(y - strand.y) / .5); return strand.x + .05 + .7 * t * t * (3 - 2 * t) + .08 * fbm(3.1, y * 2.3, seed + 21); };
  const sea = (x, y) => x - cx(y) + .11 * fbm(x * 4.6 + 1, y * 4.6, seed + 22) + .04 * fbm(x * 13, y * 13 + 4, seed + 23);
  const sand = (x, y) => { const d = Math.hypot(x - strand.x, (y - strand.y) * .8) + .05 * fbm(x * 6, y * 6, seed + 24); return d < .15 ? 1 : d > .27 ? 0 : 1 - (d - .15) / .12; };
  const hearth = (x, y) => { const d = Math.hypot(x - home.x, y - home.y); return d < .09 ? 1 : d > .17 ? 0 : 1 - (d - .09) / .08; }; // home is always river plain: the ground gives way to it
  const elev = (x, y) => { let d = Math.hypot(x - strand.x, y - strand.y) * .55; for (const s of real) { const q = Math.hypot(x - s.x, y - s.y); if (q < d) d = q; } return -.22 * x + .6 * fbm(x * 1.7 + 3, y * 1.7, seed + 31) + Math.max(0, d - .2) * 2.2 - .5 * hearth(x, y); };
  const moist = (x, y) => fbm(x * 2.3 + 17, y * 2.3 + 5, seed + 41);
  const rest = real.filter(s => s.id), e = rest.map(s => elev(s.x, s.y)).sort((p, q) => q - p), tPeak = (e[2] + e[3]) / 2, tHill = (e[6] + e[7]) / 2;
  const m = rest.filter(s => elev(s.x, s.y) <= tHill).map(s => moist(s.x, s.y)).sort((p, q) => q - p), tMarsh = (m[1] + m[2]) / 2, tForest = (m[6] + m[7]) / 2;
  const cls = (x, y) => { if (sea(x, y) > -.03 || sand(x, y) > .45) return 'shore'; if (hearth(x, y) > .5) return 'plain'; const h = elev(x, y); if (h > tPeak) return 'peak'; if (h > tHill) return 'hills'; const w = moist(x, y); return w > tMarsh ? 'marsh' : w > tForest ? 'forest' : 'plain'; };
  for (const s of real) { s.ter = cls(s.x, s.y); if (s.ter === 'shore') s.ter = 'plain'; }
  rest.filter(s => s.ter === 'plain' || s.ter === 'forest').sort((p, q) => hash2(p.id, 77, seed) - hash2(q.id, 77, seed)).slice(0, 3).forEach(s => { s.ruin = 1; s.ter = 'ruins'; });
  const rivers = [], src = real.slice().sort((p, q) => elev(q.x, q.y) - elev(p.x, p.y)), starts = [src[0]]; for (const q of src) if (starts.length < 3 && starts.every(p => Math.hypot(p.x - q.x, p.y - q.y) > .45)) starts.push(q);
  let bx0 = 9, bx1 = -9, by0 = 9, by1 = -9; for (const s of S) { bx0 = Math.min(bx0, s.x); bx1 = Math.max(bx1, s.x); by0 = Math.min(by0, s.y); by1 = Math.max(by1, s.y); }
  bx0 -= .35; by0 -= .3; by1 += .3; bx1 += .25; const cs = .03, nx = Math.ceil((bx1 - bx0) / cs), ny = Math.ceil((by1 - by0) / cs), E = new Float32Array(nx * ny), wet = new Uint8Array(nx * ny); let eMin = 9;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const v = elev(bx0 + i * cs, by0 + j * cs); E[j * nx + i] = v; if (v < eMin) eMin = v; }
  for (const st of starts) { const si = Math.round((st.x + .05 - bx0) / cs), sj = Math.round((st.y + .04 - by0) / cs), dist = new Float32Array(nx * ny).fill(1e9), prev = new Int32Array(nx * ny).fill(-1), done = new Uint8Array(nx * ny); dist[sj * nx + si] = 0; let end = -1;
    for (let it = 0; it < nx * ny; it++) { let k = -1, bd = 1e9; for (let q = 0; q < nx * ny; q++) if (!done[q] && dist[q] < bd) { bd = dist[q]; k = q; } if (k < 0) break; done[k] = 1; const i = k % nx, j = (k / nx) | 0; if (sea(bx0 + i * cs, by0 + j * cs) > .04 || wet[k]) { end = k; break; }
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { if (!a && !b) continue; const i2 = i + a, j2 = j + b; if (i2 < 0 || j2 < 0 || i2 >= nx || j2 >= ny) continue; const q = j2 * nx + i2, w = Math.hypot(a, b) * Math.pow(.08 + E[q] - eMin, 2) * (1 + .5 * hash2(i2, j2, seed + 61)); if (dist[k] + w < dist[q]) { dist[q] = dist[k] + w; prev[q] = k; } } }
    if (end < 0) continue; const joins = wet[end]; for (let k = end; k >= 0; k = prev[k]) wet[k] = 1; let pts = [];
    for (let k = end; k >= 0; k = prev[k]) { const i = k % nx, j = (k / nx) | 0; pts.unshift([bx0 + (i + (hash2(i, j, seed + 71) - .5) * .9) * cs, by0 + (j + (hash2(i, j, seed + 72) - .5) * .9) * cs]); }
    pts = pts.filter((p, i) => i % 3 === 0 || i === pts.length - 1);
    for (let r = 0; r < 3; r++) { const o = [pts[0]]; for (let i = 0; i + 1 < pts.length; i++) { const p = pts[i], q = pts[i + 1]; o.push([p[0] * .75 + q[0] * .25, p[1] * .75 + q[1] * .25], [p[0] * .25 + q[0] * .75, p[1] * .25 + q[1] * .75]); } o.push(pts[pts.length - 1]); pts = o; }
    if (joins) { let best = null, bd = 9; const z = pts[pts.length - 1]; for (const r of rivers) for (const p of r) { const d = Math.hypot(p[0] - z[0], p[1] - z[1]); if (d < bd) { bd = d; best = p; } } if (best) pts.push([best[0], best[1]]); }
    rivers.push(pts); }
  return { cx, sea, sand, hearth, elev, moist, tPeak, tHill, tMarsh, tForest, cls, rivers };
}
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
  const by = S.slice(1).sort((a, b) => a.dist - b.dist);
  // the strand: nothing can be built there. The Host lands on it and takes every road out.
  let mx = -9; for (const q of S) mx = Math.max(mx, q.x);
  const e2 = S.slice(1).sort((a, b) => b.x - a.x).slice(0, 2), sh = { id: n, x: mx + .27, y: (e2[0].y + e2[1].y) / 2, adj: [], ter: 'shore', feat: null, shore: 1, name: 'The Ashen Strand' };
  const near = S.slice(1).map(q => [Math.hypot(q.x - sh.x, q.y - sh.y), q]).sort((a, b) => a[0] - b[0]);
  near.slice(0, 3).forEach(([d, q], i) => { if (i === 2 && d > near[1][0] * 1.5) return; const len = Math.max(12, Math.round(d * 110)); sh.adj.push({ to: q.id, len }); q.adj.push({ to: n, len }); });
  sh.dist = Math.min(...sh.adj.map(e => S[e.to].dist + e.len)); S.push(sh);
  const geo = geography(S, sh, seed);
  // five places far from home and from each other: the Undercroft, and the four hollows of the Bell's trail
  const cand = by.slice(4), sp = [cand[cand.length - 1]];
  while (sp.length < 5) { let best = null, bv = -1; for (const s of cand) if (!sp.includes(s)) { const v = Math.min(s.dist * .7, ...sp.map(r => D[r.id][s.id])); if (v > bv) { bv = v; best = s; } } sp.push(best); }
  const dun = sp.find(s => s.ter === 'hills' || s.ter === 'peak') || sp[0]; dun.feat = 'dun';
  const rites = shuf(sp.filter(s => s !== dun)); rites.forEach(s => { s.feat = 'rite'; });
  const free = () => by.filter(s => !s.feat);
  const pitC = free().filter(s => by.indexOf(s) >= 3); if (pitC.length) pitC[Math.floor(R() * pitC.length)].feat = 'pit';
  shuf(free()).slice(0, 9).forEach((s, i) => { s.feat = ['hint_terrace', 'hint_mill', 'hint_lib', 'hint_temple', 'hint_foundry', 'cache', 'vault', 'stones', 'herd'][i]; });
  const pre = shuf(['Orrin', 'Kesh', 'Vale', 'Mara', 'Tolm', 'Isk', 'Brae', 'Dun', 'Ysa', 'Corr', 'Ael', 'Pell', 'Hask', 'Nim', 'Ruth', 'Ostra', 'Vesk', 'Lorn', 'Emm', 'Thar', 'Quil', 'Sav']);
  S.forEach((s, i) => { if (s.shore) return; s.name = i === 0 ? 'Hearthford' : pre[i % pre.length] + ' ' + TER[s.ter].suf[Math.floor(R() * 3)]; });
  // the Undercroft's floors: what each gives up, and which of them keep whoever goes down
  const perils = shuf([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).slice(0, 4), loot = ['metal', 'lore', 'awe', 'wood', 'metal', 'lore', 'awe', 'metal'], floors = [null];
  for (let f = 1; f <= FLOORS; f++) floors.push({ peril: perils.includes(f), loot: f === FLOORS ? null : { [loot[Math.floor(R() * loot.length)]]: Math.round(40 * Math.pow(1.45, f)) } });
  return { sites: S, D, east: n, hasPit: S.some(q => q.feat === 'pit'), geo, dun: dun.id, rites: rites.map(s => s.id), floors, seed };
}
let MAP = null;
/* what people living next door to a place say about it, before anyone has lived on it */
function rumour(N) { const f = N.feat; if (!f) return ''; if (f === 'pit') return 'Shepherds will not graze toward ' + N.name + '. They say the old dead are under it, and that the old dead are catching.'; if (f === 'dun') return 'People say there is a stair at ' + N.name + ' that goes down further than a stair should.'; if (f === 'rite') return N.id === MAP.rites[0] ? 'Travellers say a hollow at ' + N.name + ' answers when you sing into it, a moment before you start.' : ''; if (f.startsWith('hint')) return 'Worked stone shows through the scrub toward ' + N.name + '. Somebody built there before anybody was here.'; return ''; }

/* --- the economy --- */
const RES = ['vein', 'ore', 'metal', 'arms', 'wood', 'lore', 'awe', 'food', 'mem']; // inputs before outputs
const JOBS = {
  farmer: { out: ['food', 0.5], clim: 1 }, woodcutter: { out: ['wood', 0.4] },
  miner: { inp: ['vein', 0.25], out: ['ore', 0.25] }, smith: { inp: ['ore', 0.3], out: ['metal', 0.3] },
  armorer: { inp: ['metal', 0.2], out: ['arms', 0.2] }, scholar: { out: ['lore', 0.15] },
  priest: { out: ['awe', 0.15] }, forager: { out: ['food', 0.12] },
  guard: { inp: ['arms', 0.05], out: ['none', 0] } // guards hold the Undercroft's stair; they eat three shares and wear out arms
};
const JOBLIST = ['guard', 'scholar', 'priest', 'armorer', 'smith', 'miner', 'woodcutter', 'farmer'];
const UPKEEP = 0.1, GUARD_EATS = 0.2, DRY_T = 900;
let CLIM = [];
function climAt(t) { let i = 0; while (CLIM[i + 1][0] <= t) i++; const [a, ca] = CLIM[i], [b, cb] = CLIM[i + 1], m = (cb - ca) / (b - a); return [ca + m * (t - a), m]; }
const BJ = { farm: ['farmer', 2], lumber: ['woodcutter', 2], mine: ['miner', 2], forge: ['smith', 1], armory: ['armorer', 1], script: ['scholar', 1], shrine: ['priest', 1], gatehouse: ['guard', 4] };
const BLD = {
  hut: { n: 'Hut', c: { wood: 8 }, g: 1.25, d: 'Housing for 4 more.' },
  farm: { n: 'Farm', c: { wood: 10 }, g: 1.25, d: '2 farmer posts. Yield follows the climate.' },
  lumber: { n: 'Lumber camp', c: { wood: 14 }, g: 1.3, d: '2 woodcutter posts.' },
  granary: { n: 'Granary', c: { wood: 25 }, g: 1.4, d: 'Stores 150 more food.' },
  script: { n: 'Scriptorium', c: { wood: 30 }, g: 1.35, d: '1 scholar post.' },
  shrine: { n: 'Shrine', c: { wood: 30 }, g: 1.35, d: '1 priest post.' },
  mine: { n: 'Mine', c: { wood: 30 }, g: 1.35, d: '2 miner posts. Hills and peaks only. Veins are finite.', ter: ['hills', 'peak'] },
  gatehouse: { n: 'Gatehouse', c: { wood: 120, metal: 40 }, g: 1.5, d: '4 guard posts on the Undercroft stair. Only here.', at: 'dun', req: s => s.up.delving },
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
/* the tree. A lane studies one thing at a time; everything else waits its turn, or arrives by the bleed. */
const UPG = {
  axes: { n: 'Flint Axes', c: { wood: 15 }, t: 8, d: 'Woodcutters ×1.5.' },
  irrigation: { n: 'Irrigation', c: { lore: 15 }, t: 20, d: 'Farmers ×1.4.' },
  pottery: { n: 'Sealed Jars', c: { lore: 25, wood: 40 }, t: 15, d: 'Food storage ×1.5.' },
  writing: { n: 'Writing', c: { lore: 40 }, t: 25, d: 'Scholars ×2.' },
  rites: { n: 'Rites', c: { awe: 40 }, t: 25, d: 'Priests ×2.' },
  masonry: { n: 'Masonry', pre: ['pottery'], c: { wood: 120, lore: 30 }, t: 30, d: 'Each hut houses 6.' },
  roads: { n: 'Roads', pre: ['axes'], c: { wood: 200, lore: 60 }, t: 40, d: 'Distance from home counts half. Settlers arrive in half the time.' },
  picks: { n: 'Bronze Picks', pre: ['axes'], c: { metal: 15 }, t: 15, d: 'Miners ×2. Veins drain twice as fast.' },
  plough: { n: 'Bronze Plough', pre: ['irrigation'], c: { metal: 25 }, t: 20, d: 'Farmers ×1.4.' },
  bellows: { n: 'Bellows', pre: ['picks'], c: { metal: 30, lore: 30 }, t: 25, d: 'Smiths ×2.' },
  medicine: { n: 'Herb-lore', pre: ['rites', 'writing'], c: { lore: 100, awe: 40 }, t: 40, d: 'Growth ×1.5. Famine kills half as fast.' },
  fort: { n: 'Palisades', pre: ['masonry'], c: { wood: 150, lore: 40 }, t: 40, d: 'Unlocks the Palisade, which stops the Host at a site.' },
  shafts: { n: 'Deep Shafts', pre: ['picks'], c: { metal: 60, wood: 200 }, t: 40, d: 'Opens 4,000 more ore.' },
  drill: { n: 'The Long Drill', pre: ['bellows'], c: { arms: 100 }, t: 40, d: 'Armorers ×2, smiths ×1.5.' },
  hymnal: { n: 'The Thousand-Voice Hymnal', pre: ['medicine'], c: { awe: 300 }, t: 40, d: 'Each priest gains 2% per citizen.' },
  academy: { n: 'The Academy', pre: ['writing'], c: { lore: 300 }, t: 50, d: 'Scholars ×2.' },
  quar: { n: 'Quarantine', pre: ['medicine'], c: { lore: 500, awe: 150 }, t: 60, d: 'Unlocks the Lazaret, which keeps a site alive through the Glass Plague.', req: (s, M) => M.E.pit || !MAP.hasPit },
  delving: { n: 'Delving', pre: ['fort', 'shafts'], c: { metal: 150, lore: 150 }, t: 50, d: 'Unlocks the Gatehouse, and with it the way down into the Undercroft.', req: (s, M) => M.E.stair },
  terracing: { n: 'Terracing', pre: ['masonry'], c: { lore: 250, wood: 300 }, t: 50, d: 'Every site holds 2 more plots.', req: (s, M) => M.E.hint_terrace },
  milling: { n: 'The Great Wheel', pre: ['plough'], c: { lore: 300 }, t: 50, d: 'Unlocks the Great Mill.', req: (s, M) => M.E.hint_mill },
  archives: { n: 'Shelving the World', pre: ['academy'], c: { lore: 400 }, t: 50, d: 'Unlocks the Great Library.', req: (s, M) => M.E.hint_lib },
  liturgy: { n: 'The Long Liturgy', pre: ['hymnal'], c: { awe: 400 }, t: 50, d: 'Unlocks the Great Temple.', req: (s, M) => M.E.hint_temple },
  casting: { n: 'Casting in the Round', pre: ['bellows'], c: { lore: 200, metal: 100 }, t: 50, d: 'Unlocks the Great Foundry.', req: (s, M) => M.E.hint_foundry },
  glass: { n: 'Glassblowing', pre: ['writing', 'pottery'], c: { lore: 150, wood: 200 }, t: 60, d: 'Clear glass. On its own, good for windows.' },
  optics: { n: 'Lenses', pre: ['glass', 'academy'], c: { lore: 600, metal: 60 }, t: 90, d: 'Things far away, brought near.' },
  parallax: { n: 'Parallax', pre: ['optics'], c: { lore: 1800 }, t: 130, d: 'The same star from two places is two different stars. Something follows from that.' },
  annals: { n: 'Annals', pre: ['writing'], c: { lore: 200 }, t: 60, d: 'Every year written down as it happens, whether or not anything did.' },
  counterfact: { n: 'Counterfactuals', pre: ['annals', 'academy'], c: { lore: 900 }, t: 110, d: 'A discipline of asking what the annals would say had one thing gone otherwise.' },
  margin: { n: 'Reading the Margin', pre: ['counterfact'], c: { lore: 2200 }, t: 140, d: 'There are notes beside the annals in a hand nobody here has. The scholars learn to read them.' },
  lens: { n: 'Grind the Lens of Last Light', relic: 'lens', pre: ['parallax', 'margin'], c: { lore: 5000, metal: 300 }, t: 200, d: 'A relic. Two lines of study meet in one piece of glass.' }
};
const RELIC = {
  sword: { n: 'the Unbroken Sword', buff: 'Armorers ×2.' }, bell: { n: 'the Bell That Rings Backward', buff: 'Priests ×2.' }, lens: { n: 'the Lens of Last Light', buff: 'Scholars ×2.' }
};
const RITE_C = [200, 600, 1800, 5000], RITE_T = 60, DELVE_T = 20, FORGET_EVERY = 10, REMEMBER_C = 300, BREACH_T = 20, BREACH_ARMS = 200, NIGHT_T = 60;
const MALADY = [null, 'The Glass Plague', 'The Forgetting', 'The Sunless Years'];
const rememberTime = st => Math.max(10, 60 - 10 * st.b.script - (st.b.glib ? 20 : 0)); /* more scriptoria, faster copying */
const delveCost = d => Math.ceil(40 * Math.pow(1.25, d));
const TIDES = [{ t: 700, n: 'The Ashen Host', omen: 'Smoke stands on the eastern horizon and does not move with the wind.' }];
const HOST_ARMS = 100, HOST_SPAN = 250;
const MAL_T = [0, 1100, 1500, 1900];
const MAL_OMEN = ['', 'A fisherman coughs, and something in the cough chimes.', 'An old woman cannot find the word for the thing she is holding. By evening, nor can her daughter.', 'The astronomers recount the days and come up one short, then two.'];
let FIXED = [];
/* final: the year of the Unwriting. mal: how many maladies the Archive's relics have let in. Both come from what is recorded. */
function setTimeline(final, mal) {
  FINAL_T = final;
  CLIM = [[0, 1], [220, 1], [260, .15], [300, .15], [340, 1], [DRY_T, 1], [1200, .75], [1250, .3], [1320, .3], [1370, .62], [1500, .5], [final - 400, .5], [final, .3], [final + 60, .5], [1e7, .5]];
  FIXED = []; CLIM.slice(1, -1).forEach(c => FIXED.push({ t: c[0], k: 'c' }));
  FIXED.push({ t: 210, k: 'log', x: 'The elders say the summers are getting shorter.', c: 'omen' });
  FIXED.push({ t: 340, k: 'winterEnd' });
  TIDES.forEach((T, i) => { FIXED.push({ t: T.t - 45, k: 'log', x: T.omen, c: 'omen' }); FIXED.push({ t: T.t, k: 'tide', i }); });
  FIXED.push({ t: DRY_T - 20, k: 'log', x: 'The river is lower than the marks the grandfathers cut. People say it will come back.', c: 'omen' });
  FIXED.push({ t: DRY_T + 60, k: 'log', x: 'The Drying. The river has not come back, and each harvest is a little thinner than the one before. Nobody now expects otherwise.', c: 'bad' });
  FIXED.push({ t: 1190, k: 'log', x: 'The geese leave a month early and do not come back the usual way.', c: 'omen' });
  for (let ord = 1; ord <= Math.min(3, mal); ord++) { FIXED.push({ t: MAL_T[ord] - 45, k: 'log', x: MAL_OMEN[ord], c: 'omen' }); FIXED.push({ t: MAL_T[ord], k: 'mal', ord }); }
  FIXED.push({ t: final - 400, k: 'log', x: 'The sun is a shade redder than the old songs say it was.', c: 'omen' });
  FIXED.push({ t: final - 60, k: 'log', x: 'Words are going missing. Nobody can remember the name of the month before this one.', c: 'omen' });
  FIXED.push({ t: final, k: 'final' });
  FIXED.sort((a, b) => a.t - b.t);
}
const STOCKFEATS = [['metal', 40, 'bronze'], ['lore', 60, 'letters'], ['awe', 60, 'sky']];
const HOME_ROOM = 12, SITE_ROOM = 8;

const has = (st, k) => !!(st.rel[k] || st.src[k] > 0);
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
    forager: M.forage, guard: 1, farmer: M.farm * (u.irrigation ? 1.4 : 1) * (u.plough ? 1.4 : 1) * (st.night ? .25 : 1), woodcutter: M.wood * (u.axes ? 1.5 : 1),
    miner: M.mine * (u.picks ? 2 : 1), smith: M.smith * (u.bellows ? 2 : 1) * (u.drill ? 1.5 : 1),
    armorer: (u.drill ? 2 : 1) * (has(st, 'sword') ? 2 : 1), scholar: (u.writing ? 2 : 1) * (u.academy ? 2 : 1) * (has(st, 'lens') ? 2 : 1),
    priest: (u.rites ? 2 : 1) * (u.hymnal ? 1 + 0.02 * st.pop : 1) * (has(st, 'bell') ? 2 : 1)
  };
  d.cap = { food: (100 + gran * 150) * M.foodCap * (u.pottery ? 1.5 : 1) };
  d.growT = 12 / (1 + st.pop / 8) / (M.growth * (u.medicine ? 1.5 : 1));
  d.starveT = u.medicine ? 12 : 6;
  d.research = 1;
  d.memPop = 0.02 * (1 + 0.25 * st.b.stele);
  return d;
}
/* how well a post of job j works at site s: favoured ground, favoured neighbours, distance from home */
function siteMult(st, d, s, j) {
  const S = MAP.sites[s]; let m = d.eff[s] === undefined ? 1 : d.eff[s], a = 0;
  if (TER[S.ter].fav.includes(j)) m *= 1.5;
  const sb = st.sb[s]; if (sb) for (const g in GREAT) if (sb[g] && GREAT[g].includes(j)) m *= g === 'gmill' ? 2.5 : 2;
  for (const e of S.adj) if (st.own[e.to] && TER[MAP.sites[e.to].ter].fav.includes(j)) a++;
  return m * (1 + .2 * a);
}
function nSites(st) { let n = 0; for (const s in st.own) n++; for (const p of st.proj) if (p.x === 'settle') n++; return n; }
function costOf(st, o, M) {
  const out = {};
  if (o.k === 'b') { const B = BLD[o.x], f = Math.pow(B.g, st.b[o.x]) * M.cost; for (const r in B.c) out[r] = Math.ceil(B.c[r] * f); }
  else if (o.k === 'u') { const U = UPG[o.x]; for (const r in U.c) out[r] = Math.ceil(U.c[r] * M.cost); }
  else if (o.k === 's') { const n = nSites(st) - 1; out.wood = Math.ceil(40 * Math.pow(1.7, n) * M.cost); out.food = Math.ceil(30 * Math.pow(1.4, n) * M.cost); }
  else if (o.k === 'rt') out.awe = Math.ceil(RITE_C[st.rite] * M.cost);
  else if (o.k === 'dv') out.arms = Math.ceil(delveCost(st.depth) * M.cost);
  else if (o.k === 'rm') out.lore = Math.ceil(REMEMBER_C * M.cost);
  return out;
}
const plots = (st, s) => (s == 0 ? HOME_ROOM : SITE_ROOM) + (st.up.terracing ? 2 : 0);
function room(st, s) { let n = 0; const sb = st.sb[s] || {}; for (const b in sb) n += sb[b]; return plots(st, s) - n; }
const busy = (st, x) => st.proj.some(p => p.x === x);
const studying = st => st.proj.some(p => UPG[p.x]);
function reqOk(st, o, M) {
  if (o.k === 'b') { const B = BLD[o.x]; return !!st.own[o.s] && room(st, o.s) > 0 && (!B.ter || B.ter.includes(MAP.sites[o.s].ter)) && (!B.at || o.s === MAP.dun) && (!B.req || !!B.req(st)); }
  if (o.k === 'u') { const U = UPG[o.x]; return !studying(st) && (U.pre || []).every(p => st.up[p]) && (!U.req || !!U.req(st, M)); }
  if (o.k === 's') return !MAP.sites[o.s].shore && MAP.sites[o.s].adj.some(e => st.own[e.to]);
  if (o.k === 'rt') return !!st.own[o.s] && !busy(st, 'rite');
  if (o.k === 'dv') return !!st.own[MAP.dun] && st.sb[MAP.dun].gatehouse > 0 && !busy(st, 'delve') && st.pop > 2;
  if (o.k === 'rm') return st.forget < Infinity && !busy(st, 'remember');
  return true;
}
function isVoid(st, o) { /* can never happen in this lane as it stands */
  if (o.k === 'u') return !!(st.up[o.x] || busy(st, o.x) || (UPG[o.x].relic && st.rel[UPG[o.x].relic]));
  if (o.k === 's') return !!(MAP.sites[o.s].shore || st.own[o.s] || st.lost[o.s] || st.proj.some(p => p.x === 'settle' && p.s === o.s));
  if (o.k === 'b') { const B = BLD[o.x]; return !!st.lost[o.s] || !!(B.ter && !B.ter.includes(MAP.sites[o.s].ter)) || !!(B.at && o.s !== MAP.dun) || !!(B.uniq && st.b[o.x] > 0); }
  if (o.k === 'rt') return st.rite >= 4 || o.s !== MAP.rites[st.rite] || !!st.lost[o.s];
  if (o.k === 'dv') return st.depth >= FLOORS || !!st.lost[MAP.dun];
  if (o.k === 'rm') return !!st.mal[2] && st.forget === Infinity; // already over
  return false;
}
function settleTime(st, s) { let t = Infinity; for (const e of MAP.sites[s].adj) if (st.own[e.to]) t = Math.min(t, e.len); return t * (st.up.roads ? .5 : 1); }
const famThr = (st, d) => Math.min(d.cap.food * .5, st.pop * 3); /* a famine is over when this much is back in store */
function initState(M) {
  const b = {}; for (const k in BLD) b[k] = 0;
  return { t: 0, pop: 4 + M.startPop, s: { vein: 0, ore: 0, metal: 0, arms: 0, wood: 5, lore: 0, awe: 0, food: 30, mem: 0 }, b, sb: { 0: {} }, own: { 0: 1 }, lost: {}, up: {}, upT: {}, proj: [],
    rel: {}, src: {}, mal: {}, rite: 0, depth: 0, breach: Infinity, night: 0, forget: Infinity, forgot: 0, fam: 0, evict: Infinity, hq: [], hs: {}, ha: {}, hp: {}, hb: {}, prio: JOBLIST.slice(), lim: {}, grow: Infinity, starve: Infinity, noGrow: 0, deaths: 0, feats: {}, pend: [], fi: 0, won: 0, dead: 0 };
}
function clone(st) { const sb = {}; for (const s in st.sb) sb[s] = { ...st.sb[s] }; return { ...st, s: { ...st.s }, b: { ...st.b }, sb, own: { ...st.own }, lost: { ...st.lost }, up: { ...st.up }, upT: { ...st.upT }, mal: { ...st.mal }, proj: st.proj.map(p => ({ ...p })), hq: st.hq.map(h => ({ ...h })), hs: { ...st.hs }, ha: { ...st.ha }, hp: { ...st.hp }, hb: { ...st.hb }, rel: { ...st.rel }, src: { ...st.src }, prio: st.prio.slice(), lim: { ...st.lim }, feats: { ...st.feats }, pend: st.pend.slice() }; }

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
  order(id) { if (!this.byId) { this.byId = new Map(); for (const o of this.orders) this.byId.set(o.id, o); } return this.byId.get(id); }
  firstAfter(t) { let lo = 0, hi = this.orders.length; while (lo < hi) { const m = (lo + hi) >> 1; if (this.orders[m].t > t) hi = m; else lo = m + 1; } return lo; }
  idx(t) { let lo = 0, hi = this.segs.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (this.segs[m].t0 <= t) lo = m; else hi = m - 1; } return lo; }
  note(st, x, c) { this.log.push({ t: st.t, x, c }); }
  feat(st, k, t) { if (st.feats[k]) return; st.feats[k] = 1; this.feats.push({ k, t: t === undefined ? st.t : t }); }
  send(st, k, x) { this.emit.push({ t: st.t, k, x, d: bleedDelay(st.s.mem), from: this.id }); }

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
    if (st.night && st.night <= st.t + EPS) { st.night = 0; this.note(st, 'The sun comes back, a little at a time, as if unsure it is allowed.', 'up'); }
    for (const e of this.inbox) { // what bled through from other lanes, BLEED years after it happened there
      if (e.ta <= prevT || e.ta > st.t || st.dead) continue;
      if (e.k === 'tech') { if (st.up[e.x]) continue; this.learn(st, e.x); st.proj = st.proj.filter(p => p.x !== e.x); this.feat(st, 'bleed'); this.note(st, 'The people wake knowing ' + UPG[e.x].n + '. Nobody here taught it.', 'bleed'); }
      else if (e.k === 'light') { st.src[e.x] = (st.src[e.x] || 0) + 1; this.note(st, 'The light of ' + RELIC[e.x].n + ' reaches this lane from another. ' + RELIC[e.x].buff, 'feat'); }
      else if (e.k === 'dark') { st.src[e.x] = Math.max(0, (st.src[e.x] || 0) - 1); if (!st.src[e.x] && !st.rel[e.x]) this.note(st, 'The light of ' + RELIC[e.x].n + ' goes out. The lane that held it is gone.', 'bad'); }
      else if (e.k === 'breach') { if (st.s.arms >= BREACH_ARMS - 1e-6) { st.s.arms -= BREACH_ARMS; this.note(st, 'Things from under another history\'s hill come through, looking for a way back down. They are met.', 'feat'); } else { st.pop = Math.max(2, Math.ceil(st.pop * .85)); this.note(st, 'Things from under another history\'s hill come through. Nobody here has ever seen the Undercroft, and it takes one in seven of them anyway.', 'bad'); } }
    }
    if (st.dead) return;
    if (st.proj.length) { const due = st.proj.filter(p => p.done <= st.t + EPS); st.proj = st.proj.filter(p => p.done > st.t + EPS);
      for (const p of due) {
        if (p.x === 'settle') this.settle(st, p.s);
        else if (p.x === 'rite') { st.rite++; this.feats.push({ k: 'trail' + (st.rite + 1), t: st.t }); this.feat(st, 'rite' + st.rite);
          if (st.rite >= 4) this.raise(st, 'bell', 'The fourth rite ends. The four hollows ring together, each a little before it is struck, and what they ring is the Bell.');
          else this.note(st, 'The ' + ['first', 'second', 'third'][st.rite - 1] + ' rite is sung at ' + MAP.sites[p.s].name + '. Its echo comes back from the direction of ' + MAP.sites[MAP.rites[st.rite]].name + '.', 'feat'); }
        else if (p.x === 'delve') this.delved(st);
        else if (p.x === 'remember') { st.forget = Infinity; if (st.forgot <= 1) this.feat(st, 'kept'); this.note(st, 'The Remembering is finished. Everything this lane still knows is written down twice and read aloud each spring. The Forgetting has nothing left to take hold of.', 'feat'); }
        else { this.learn(st, p.x); const U = UPG[p.x]; if (U.relic) this.raise(st, U.relic, 'The glass is finished. Looked through one way it shows this lane. Looked through the other, it shows the rest.'); else { this.send(st, 'tech', p.x); this.note(st, U.n + ' is understood.', 'up'); } }
      } }
    if (st.forget <= st.t + EPS) { // the Forgetting takes the newest thing the lane knows, again and again, until it is answered
      const known = Object.keys(st.up).sort((a, b) => st.upT[b] - st.upT[a] || (a < b ? -1 : 1)), x = known[0];
      if (x) { delete st.up[x]; delete st.upT[x]; st.forgot++; st.forget = st.t + FORGET_EVERY; this.note(st, 'Nobody can say how ' + UPG[x].n + ' was done. The tools are still there. People pick them up and put them down again.', 'bad'); } else st.forget = Infinity; }
    if (st.breach <= st.t + EPS) { st.breach = Infinity; const s = MAP.dun; st.pop = Math.max(2, Math.ceil(st.pop * .8)); st.depth = Math.max(0, st.depth - 2); if (st.own[s] && st.sb[s].gatehouse) { st.b.gatehouse--; if (!--st.sb[s].gatehouse) delete st.sb[s].gatehouse; } st.proj = st.proj.filter(p => p.x !== 'delve'); this.feat(st, 'breach'); this.send(st, 'breach'); this.note(st, 'The stair is not held. What lives below comes up it, takes a gatehouse and one in five of the people, and reclaims two floors. Some of it keeps walking, out of this history.', 'bad'); }
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
        if (o.k === 'b') { st.b[o.x]++; st.sb[o.s][o.x] = (st.sb[o.s][o.x] || 0) + 1; }
        else if (o.k === 'u') { rec.done = st.t + UPG[o.x].t; st.proj.push({ x: o.x, t0: st.t, done: rec.done }); }
        else if (o.k === 's') { rec.done = st.t + settleTime(st, o.s); st.proj.push({ x: 'settle', s: o.s, t0: st.t, done: rec.done }); }
        else if (o.k === 'rt') { rec.done = st.t + RITE_T; st.proj.push({ x: 'rite', s: o.s, t0: st.t, done: rec.done }); }
        else if (o.k === 'rm') { rec.done = st.t + rememberTime(st); st.proj.push({ x: 'remember', t0: st.t, done: rec.done }); }
        else if (o.k === 'dv') { rec.done = st.t + DELVE_T; st.pop--; st.proj.push({ x: 'delve', s: MAP.dun, t0: st.t, done: rec.done }); }
        this.recs.push(rec); st.pend.splice(i--, 1); again = true;
      }
    }
    if (st.fam && st.s.food >= famThr(st, derive(st, M)) - 1e-6) st.fam = 0;
    if (st.pop >= 8) this.feat(st, 'hearth');
    if (st.deaths >= 3) this.feat(st, 'hunger');
    for (const [r, n, k] of STOCKFEATS) if (st.s[r] >= n) this.feat(st, k);
  }
  learn(st, x) { st.up[x] = 1; st.upT[x] = st.t; if (x === 'annals' || x === 'optics' || x === 'margin' || x === 'glass' || x === 'counterfact') this.feat(st, x); }
  raise(st, k, x) { /* a relic comes into being here, and its light starts across to the others */
    st.rel[k] = 1; this.feat(st, 'raised_' + k); this.send(st, 'light', k); this.note(st, x, 'feat');
    if (st.rel.sword && st.rel.bell && st.rel.lens) this.feat(st, 'whole');
  }
  delved(st) { /* a delve comes back, or does not */
    const f = ++st.depth, F = MAP.floors[f]; this.feats.push({ k: 'floor' + f, t: st.t }); st.s.vein += 600; let x = 'The delve reaches the ' + ORD[f] + ' floor of the Undercroft.';
    if (F.loot) for (const r in F.loot) { st.s[r] += F.loot[r]; x += ' It gives up ' + F.loot[r] + ' ' + r + '.'; }
    if (F.peril) x += ' Whoever went down did not come up.'; else st.pop++;
    if (f === 4) this.feat(st, 'deep4'); if (f === 8) this.feat(st, 'deep8');
    if (f >= FLOORS) { st.pop += F.peril ? 0 : 0; return this.raise(st, 'sword', x + ' At the bottom there is no monster. There is a sword in a stone floor, and the stair down was the scabbard.'); }
    this.note(st, x + ' The stair now needs ' + f + ' guards.', F.peril ? 'bad' : 'feat');
  }
  malady(st, ord) { /* what a relic's light drags behind it into another lane */
    if (ord === 1) { // the Glass Plague: every site without a lazaret is emptied for good
      let n = 0, safe = 0; const gone = [];
      for (const k in st.own) { n++; if (st.sb[k].lazaret) safe++; else gone.push(+k); }
      if (gone.includes(0)) return this.fall(st, 'The Glass Plague', 'The Glass Plague reached Hearthford and found no lazaret. The houses are still standing. They are perfectly quiet.');
      for (const k of gone) { this.drop(st, k); st.lost[k] = 1; }
      st.pop = Math.max(2, Math.ceil(st.pop * safe / n));
      if (!gone.length) { this.feat(st, 'plague'); this.note(st, 'The Glass Plague. Every settlement had its lazaret, and every one of them held.', 'feat'); }
      else this.note(st, 'The Glass Plague. ' + gone.map(k => MAP.sites[k].name).join(', ') + (gone.length > 1 ? ' are' : ' is') + ' glass now, and will not be lived in again.', 'bad');
    } else if (ord === 2) { // the Forgetting: from now on the newest thing known is lost every few years, until the lane holds a Remembering
      st.forget = st.t + FORGET_EVERY; this.note(st, 'The Forgetting begins. It starts with whatever was learned last.', 'bad');
    } else { st.night = st.t + NIGHT_T; this.feat(st, 'night'); this.note(st, 'The Sunless Years begin. For ' + NIGHT_T + ' years the farms give a quarter of what they did.', 'bad'); }
  }
  settle(st, s) {
    const S = MAP.sites[s], f = S.feat; st.own[s] = 1; st.sb[s] = {}; this.feats.push({ k: 'own:' + s, t: st.t }); this.feat(st, 'second');
    let x = 'Settlers reach ' + S.name + '.';
    if (S.ter === 'hills' || S.ter === 'peak') st.s.vein += 1500;
    if (f === 'dun') { this.feat(st, 'stair'); x += ' ' + FEAT.dun; }
    else if (f === 'rite' && s === MAP.rites[0]) { this.feats.push({ k: 'trail1', t: st.t }); x += ' ' + FEAT.rite; }
    else if (f === 'pit') { st.pop = Math.max(2, Math.ceil(st.pop * .65)); this.feat(st, 'pit'); x += ' The ground is full of old dead, and the old dead are catching.'; }
    else if (f && f.startsWith('hint_')) { this.feat(st, f); x += ' ' + FEAT[f]; }
    else if (f === 'cache') { st.s.wood += 150; st.s.food += 100; x += ' ' + FEAT[f]; }
    else if (f === 'vault') { st.s.lore += 150; x += ' ' + FEAT[f]; }
    else if (f === 'stones') { st.s.awe += 150; x += ' ' + FEAT[f]; }
    else if (f === 'herd') { st.s.food += 250; x += ' ' + FEAT[f]; }
    this.note(st, x, f === 'pit' ? 'bad' : f && f !== 'rite' ? 'feat' : 'up');
    for (const e of S.adj) { const N = MAP.sites[e.to], r = rumour(N); if (r && !st.own[e.to] && !st.lost[e.to]) { this.feats.push({ k: 'rum:' + e.to, t: st.t }); if (N.feat === 'rite') this.feats.push({ k: 'trail1', t: st.t }); this.note(st, r, 'omen'); } }
  }
  fixed(st, f) {
    if (st.dead) return;
    if (f.k === 'log') this.note(st, f.x, f.c);
    else if (f.k === 'winterEnd') {
      if (!st.deaths && st.pop >= 12) { this.feat(st, 'stored'); this.note(st, 'The Long Winter ends. Every name in the census is still there.', 'feat'); }
      else this.note(st, 'The Long Winter ends.' + (st.deaths ? ' ' + st.deaths + ' did not see the thaw.' : ''), st.deaths ? 'bad' : 'up');
    } else if (f.k === 'mal') { st.mal[f.ord] = 1; this.malady(st, f.ord);
    } else if (f.k === 'tide') { st.hq.push({ s: MAP.east, t: st.t }); st.hs[MAP.east] = 1; // the Host lands on the Strand and takes the roads
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
      if (st.sb[s].palisade) { this.feat(st, 'host'); st.hb[s] = st.t; return this.note(st, 'The Ashen Host breaks on the palisade at ' + MAP.sites[s].name + ' and goes no further that way.', 'feat'); }
      if (st.s.arms >= HOST_ARMS - 1e-6) { st.s.arms -= HOST_ARMS; this.feat(st, 'host'); st.hb[s] = st.t; return this.note(st, 'The Ashen Host is met in the field at ' + MAP.sites[s].name + ' and turned.', 'feat'); }
      if (s === 0) return this.fall(st, 'The Ashen Host', 'The Ashen Host reached Hearthford by the open road. After them there was only ash.');
      this.drop(st, s); st.pop = Math.max(2, Math.ceil(st.pop * .85)); this.note(st, 'The Ashen Host burns ' + MAP.sites[s].name + ' to the plots and takes the road onward.', 'bad');
    }
    st.ha[s] = st.t; if (!st.own[s] && s !== MAP.east && !MAP.sites[s].shore) this.note(st, 'The Ashen Host crosses the empty ground at ' + MAP.sites[s].name + '. Nobody is there to stop it.', 'omen');
    for (const e of MAP.sites[s].adj) { const ta = st.t + e.len * .5; if (!st.hs[e.to] && ta <= TIDES[0].t + HOST_SPAN) { st.hs[e.to] = 1; st.hp[e.to] = s; st.hq.push({ s: e.to, t: ta }); } }
  }

  /* closed-form segment starting from state st */
  build(st, minTau = EPS) {
    const M = this.M, seg = { t0: st.t, t1: Infinity, st, P: {}, mode: {}, w: {}, nf: [], d: null };
    if (st.dead) { for (const r of RES) seg.P[r] = [st.s[r]]; return seg; }
    const d = seg.d = derive(st, M), act = {};
    let free = st.pop;
    for (const j of (st.fam ? ['farmer', ...st.prio.filter(j => j !== 'farmer')] : st.prio)) { // best posts first; in a famine, farms before anything
      let n = Math.max(0, Math.min(free, d.slots[j], st.lim[j] == null ? Infinity : st.lim[j], j === 'guard' ? (st.rel.sword ? 0 : st.depth) : Infinity)), a = 0; seg.w[j] = n; free -= n; // no more guards than there are floors to hold
      for (const g of d.groups[j]) { const k = Math.min(n, g.n); a += k * g.m; n -= k; if (!n) break; }
      act[j] = a * d.jm[j];
    }
    seg.w.forager = free; act.forager = free * d.jm.forager; seg.act = act;
    const clim = climAt(st.t), F = {};
    for (const j in JOBS) F[j] = pscale(JOBS[j].clim ? clim : [1], act[j]);
    let tS = Infinity;
    if (FIXED[st.fi]) tS = FIXED[st.fi].t;
    const oi = this.firstAfter(st.t); if (oi < this.orders.length) tS = Math.min(tS, this.orders[oi].t);
    for (const p of st.proj) tS = Math.min(tS, p.done);
    for (const e of this.inbox) if (e.ta > st.t) { tS = Math.min(tS, e.ta); break; }
    for (const h of st.hq) tS = Math.min(tS, h.t); if (st.night) tS = Math.min(tS, st.night); tS = Math.min(tS, st.forget);
    const roots = [];
    for (const r of RES) {
      let inflow = [0], D = r === 'food' ? st.pop * UPKEEP + seg.w.guard * GUARD_EATS : 0;
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
    seg.held = st.depth === 0 || st.rel.sword || (seg.w.guard >= st.depth && seg.mode.arms !== 'empty'); // the stair needs one guard per floor opened, and arms in their hands
    if (seg.held) st.breach = Infinity; else if (st.breach === Infinity) st.breach = st.t + BREACH_T;
    tS = Math.min(tS, st.grow, st.starve, st.evict, st.breach);
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
  add(id, orders) { const s = new Sim(orders, this.M, id); for (const o of this.sims.values()) o.invalidate(BLEED_MIN); this.sims.set(id, s); return s; }
  remove(id) { this.sims.delete(id); for (const o of this.sims.values()) o.invalidate(BLEED_MIN); }
  edit(id, t) { for (const [k, s] of this.sims) s.invalidate(k === id ? t : t + BLEED_MIN); }
  ensure(T) {
    const S = [...this.sims.values()];
    for (let g = 0; g < 100000; g++) {
      let m = Infinity; for (const s of S) m = Math.min(m, s.doneTo);
      if (m >= T) return;
      const tgt = Math.min(T, m + BLEED_MIN);
      for (const s of S) if (s.doneTo < tgt) {
        const inbox = []; for (const o of S) if (o !== s) for (const e of o.emit) if (e.t + e.d <= tgt) inbox.push({ ...e, ta: e.t + e.d });
        inbox.sort((a, b) => a.ta - b.ta || a.from - b.from); s.inbox = inbox; s.extendTo(tgt);
      }
    }
  }
}
