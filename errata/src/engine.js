/* ===== Engine: exact event-driven simulation. No timestepping. =====
   Between events every stock is a polynomial in tau = t - t0. Events are either
   scheduled (orders, timers, climate breakpoints, trials) or found as polynomial
   roots (a stock empties, fills, a cost becomes affordable, a throttle releases). */
const EPS = 1e-9;

/* --- polynomials: coefficient arrays, low order first --- */
function pev(p, x) { let s = 0; for (let i = p.length - 1; i >= 0; i--) s = s * x + p[i]; return s; }
function padd(a, b, k = 1) { const n = Math.max(a.length, b.length), o = new Array(n); for (let i = 0; i < n; i++) o[i] = (a[i] || 0) + k * (b[i] || 0); return o; }
function pscale(a, k) { return a.map(c => c * k); }
function pint(a, c0) { const o = [c0]; for (let i = 0; i < a.length; i++) o.push(a[i] / (i + 1)); return o; }
function pder(a) { if (a.length <= 1) return [0]; const o = []; for (let i = 1; i < a.length; i++) o.push(a[i] * i); return o; }
function ptrim(a) { let n = a.length; while (n > 1 && Math.abs(a[n - 1]) < 1e-14) n--; return n === a.length ? a : a.slice(0, n); }
function psign0(p) { for (const c of p) if (Math.abs(c) > 1e-11) return c > 0 ? 1 : -1; return 0; }
/* all real roots in [a,b], ascending: isolate between critical points, then bisect */
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

/* --- the world --- */
const RES = ['vein', 'ore', 'metal', 'arms', 'wood', 'lore', 'awe', 'food', 'mem']; // topological: inputs before outputs
const JOBS = {
  farmer: { out: ['food', 0.6], clim: 1 }, woodcutter: { out: ['wood', 0.4] },
  miner: { inp: ['vein', 0.25], out: ['ore', 0.25] }, smith: { inp: ['ore', 0.3], out: ['metal', 0.3] },
  armorer: { inp: ['metal', 0.2], out: ['arms', 0.2] }, scholar: { out: ['lore', 0.15] },
  priest: { out: ['awe', 0.15] }, forager: { out: ['food', 0.12] }
};
const JOBLIST = ['scholar', 'priest', 'armorer', 'smith', 'miner', 'woodcutter', 'farmer'];
const UPKEEP = 0.1;
const CLIM = [[0, 1], [260, 1], [300, .15], [340, .15], [380, 1], [1300, 1], [1340, .45], [1370, .45], [1400, 1], [2600, 1], [2670, .1], [2780, .1], [2850, 1], [3300, 1], [4000, .5], [1e7, .5]];
function climAt(t) { let i = 0; while (CLIM[i + 1][0] <= t) i++; const [a, ca] = CLIM[i], [b, cb] = CLIM[i + 1], m = (cb - ca) / (b - a); return [ca + m * (t - a), m]; }

const BLD = {
  hut: { n: 'Hut', c: { wood: 8 }, g: 1.2, d: 'Housing for 2 more.' },
  farm: { n: 'Farm', c: { wood: 10 }, g: 1.25, d: '2 farmer posts. Farm yield follows the climate.' },
  lumber: { n: 'Lumber camp', c: { wood: 14 }, g: 1.3, d: '2 woodcutter posts.' },
  granary: { n: 'Granary', c: { wood: 25 }, g: 1.4, d: 'Stores 150 more food.' },
  script: { n: 'Scriptorium', c: { wood: 30 }, g: 1.4, d: '1 scholar post.', req: s => s.pop >= 8 || s.b.script > 0 },
  shrine: { n: 'Shrine', c: { wood: 30 }, g: 1.4, d: '1 priest post.', req: s => s.pop >= 8 || s.b.shrine > 0 },
  mine: { n: 'Mine', c: { wood: 30 }, g: 1.35, d: '2 miner posts. The vein is finite.', req: s => s.b.lumber > 0 },
  forge: { n: 'Forge', c: { wood: 40, ore: 10 }, g: 1.4, d: '1 smith post. Ore into bronze.', req: s => s.b.mine > 0 },
  armory: { n: 'Armory', c: { wood: 60, metal: 15 }, g: 1.4, d: '1 armorer post. Bronze into arms.', req: s => s.b.forge > 0 },
  stele: { n: 'Stele', c: { lore: 40, awe: 40 }, g: 1.5, d: 'People leave 25% more Memory.', req: s => !!s.creed }
};
const T2 = s => s.tr[1];
const UPG = {
  axes: { n: 'Flint Axes', c: { wood: 15 }, t: 8, d: 'Woodcutters ×1.5.' },
  irrigation: { n: 'Irrigation', c: { lore: 15 }, t: 20, d: 'Farmers ×1.5.' },
  pottery: { n: 'Sealed Jars', c: { lore: 25, wood: 40 }, t: 15, d: 'Food storage ×1.5.' },
  writing: { n: 'Writing', c: { lore: 40 }, t: 25, d: 'Scholars ×2.' },
  rites: { n: 'Rites', c: { awe: 40 }, t: 25, d: 'Priests ×2.' },
  masonry: { n: 'Masonry', c: { wood: 120, lore: 30 }, t: 30, d: 'Each hut houses 3.' },
  picks: { n: 'Bronze Picks', c: { metal: 15 }, t: 15, d: 'Miners ×2. The vein drains twice as fast.', req: s => s.b.forge > 0 },
  plough: { n: 'Bronze Plough', c: { metal: 25 }, t: 20, d: 'Farmers ×1.5.', req: s => s.b.forge > 0 },
  bellows: { n: 'Bellows', c: { metal: 30, lore: 30 }, t: 25, d: 'Smiths ×2.', req: s => s.b.forge > 0 },
  medicine: { n: 'Herb-lore', c: { lore: 100, awe: 40 }, t: 40, d: 'Growth ×1.5. Famine kills half as fast.' },
  shafts: { n: 'Deep Shafts', c: { metal: 60, wood: 200 }, t: 40, d: 'Opens 4,000 more ore in the vein.', req: s => s.b.mine > 0 },
  abyss: { n: 'The Under-Roads', c: { metal: 400, lore: 300 }, t: 80, d: 'Opens 25,000 more ore.', req: s => s.up.shafts },
  blade: { n: 'Way of the Blade', creed: 1, c: { arms: 25 }, t: 10, d: 'Armorers ×3. One creed per lane.' },
  bell: { n: 'Way of the Bell', creed: 1, c: { awe: 100 }, t: 10, d: 'Priests ×3, growth ×1.5. One creed per lane.' },
  lens: { n: 'Way of the Lens', creed: 1, c: { lore: 100 }, t: 10, d: 'Scholars ×3, research takes ¾ the time. One creed per lane.' },
  drill: { n: 'The Long Drill', c: { arms: 150 }, t: 40, d: 'Armorers ×2, smiths ×1.5.', req: s => s.creed === 'blade' },
  hymnal: { n: 'The Thousand-Voice Hymnal', c: { awe: 300 }, t: 40, d: 'Each priest gains 2% per citizen.', req: s => s.creed === 'bell' },
  academy: { n: 'The Academy', c: { lore: 300 }, t: 40, d: 'Scholars ×2, research takes half the time.', req: s => s.creed === 'lens' },
  reg_sword: { n: 'Forge the Unbroken Sword', reg: 'sword', c: { arms: 4000, metal: 500 }, t: 300, d: 'A regalia. It will take three centuries.', req: s => s.creed === 'blade' && T2(s) },
  reg_bell: { n: 'Cast the Bell That Rings Backward', reg: 'bell', c: { awe: 20000, metal: 300 }, t: 300, d: 'A regalia. It will take three centuries.', req: s => s.creed === 'bell' && T2(s) },
  reg_lens: { n: 'Grind the Lens of Last Light', reg: 'lens', c: { lore: 20000, metal: 300 }, t: 300, d: 'A regalia. It will take three centuries.', req: s => s.creed === 'lens' && T2(s) },
  call_sword: { n: 'Recall the Unbroken Sword', reg: 'sword', c: { arms: 300, lore: 1500 }, t: 60, d: 'Another lane forged it. The Archive remembers how.', req: (s, M) => M.E.reg_sword && s.creed !== 'blade' },
  call_bell: { n: 'Recall the Backward Bell', reg: 'bell', c: { awe: 1500, lore: 1500 }, t: 60, d: 'Another lane cast it. The Archive remembers how.', req: (s, M) => M.E.reg_bell && s.creed !== 'bell' },
  call_lens: { n: 'Recall the Lens of Last Light', reg: 'lens', c: { lore: 1500, awe: 1500 }, t: 60, d: 'Another lane ground it. The Archive remembers how.', req: (s, M) => M.E.reg_lens && s.creed !== 'lens' }
};
const TRIALS = [
  { t: 800, n: 'The Ashen Host', omen: 'Smoke stands on the eastern horizon and does not move with the wind.',
    fail: 'The Ashen Host came. After them there was only ash.',
    ans: { blade: { r: 'arms', need: 150, e: 'shieldwall', x: 'The Host broke upon the shieldwall.' },
           bell: { r: 'awe', need: 600, e: 'kneel', x: 'The bells rang. The Host knelt, and then it stayed.' },
           lens: { r: 'lore', need: 600, e: 'fire', x: 'Fire that floats on water. The Host did not come twice.' } } },
  { t: 2000, n: 'The Glass Plague', omen: 'A fisherman coughs, and something in the cough chimes.',
    fail: 'The Glass Plague left the cities standing and perfectly quiet.',
    ans: { blade: { r: 'arms', need: 2500, e: 'cordon', x: 'The cordon held. It was not kind, but it held.' },
           bell: { r: 'awe', need: 9000, e: 'vigil', x: 'The vigil lasted nine years. Nobody was left alone to shatter.' },
           lens: { r: 'lore', need: 9000, e: 'cure', x: 'A scholar boiled the right moss. The chiming stopped.' } } }
];
const FINAL_T = 4000;
const FIXED = [];
CLIM.slice(1, -1).forEach(c => FIXED.push({ t: c[0], k: 'c' }));
FIXED.push({ t: 250, k: 'log', x: 'The elders say the summers are getting shorter.', c: 'omen' });
FIXED.push({ t: 380, k: 'winterEnd' });
TRIALS.forEach((T, i) => { FIXED.push({ t: T.t - 45, k: 'log', x: T.omen, c: 'omen' }); FIXED.push({ t: T.t, k: 'trial', i }); });
FIXED.push({ t: 3300, k: 'log', x: 'The sun is a shade redder than the old songs say it was.', c: 'omen' });
FIXED.push({ t: FINAL_T - 60, k: 'log', x: 'The stars at the edge of the sky are going out, one row at a time.', c: 'omen' });
FIXED.push({ t: FINAL_T, k: 'final' });
FIXED.sort((a, b) => a.t - b.t);
const STOCKFEATS = [['metal', 40, 'bronze'], ['lore', 60, 'letters'], ['awe', 60, 'sky']];

function derive(st, M) {
  const b = st.b, u = st.up, cr = st.creed, d = {};
  d.housing = 6 + M.housing + b.hut * (u.masonry ? 3 : 2);
  d.slots = { farmer: b.farm * 2, woodcutter: 2 + b.lumber * 2, miner: b.mine * 2, smith: b.forge, armorer: b.armory, scholar: b.script, priest: b.shrine };
  d.jm = {
    forager: M.forage, farmer: M.farm * (u.irrigation ? 1.5 : 1) * (u.plough ? 1.5 : 1), woodcutter: M.wood * (u.axes ? 1.5 : 1),
    miner: M.mine * (u.picks ? 2 : 1), smith: M.smith * (u.bellows ? 2 : 1) * (u.drill ? 1.5 : 1),
    armorer: M.arms * (cr === 'blade' ? 3 : 1) * (u.drill ? 2 : 1),
    scholar: M.lore * (u.writing ? 2 : 1) * (cr === 'lens' ? 3 : 1) * (u.academy ? 2 : 1),
    priest: M.awe * (u.rites ? 2 : 1) * (cr === 'bell' ? 3 : 1) * (u.hymnal ? 1 + 0.02 * st.pop : 1)
  };
  d.cap = { food: (100 + b.granary * 150) * M.foodCap * (u.pottery ? 1.5 : 1) };
  d.growT = 12 / (1 + st.pop / 8) / (M.growth * (u.medicine ? 1.5 : 1) * (cr === 'bell' ? 1.5 : 1));
  d.starveT = u.medicine ? 12 : 6;
  d.research = M.research * (u.academy ? .5 : 1) * (cr === 'lens' ? .75 : 1);
  d.memPop = 0.02 * (1 + 0.25 * b.stele);
  return d;
}
function costOf(st, o, M) {
  const out = {};
  if (o.k === 'b') { const B = BLD[o.x], f = Math.pow(B.g, st.b[o.x]) * M.cost; for (const r in B.c) out[r] = Math.ceil(B.c[r] * f); }
  else if (o.k === 'u') { const U = UPG[o.x]; for (const r in U.c) out[r] = Math.ceil(U.c[r] * M.cost); }
  return out;
}
function reqOk(st, o, M) { const D = o.k === 'b' ? BLD[o.x] : UPG[o.x]; return !D.req || !!D.req(st, M); }
/* 'void' = can never happen in this lane as it stands */
function isVoid(st, o) {
  if (o.k !== 'u') return false; const U = UPG[o.x];
  if (st.up[o.x] || st.proj.some(p => p.x === o.x)) return true;
  if (U.creed && (st.creed || st.proj.some(p => UPG[p.x].creed))) return true;
  if (U.reg && (st.up['reg_' + U.reg] || st.up['call_' + U.reg] || st.proj.some(p => UPG[p.x].reg === U.reg))) return true;
  return false;
}
function initState(M) {
  const b = {}; for (const k in BLD) b[k] = 0;
  return { t: 0, pop: 4 + M.startPop, s: { vein: 1500, ore: 0, metal: 0, arms: 0, wood: 5, lore: 0, awe: 0, food: 30, mem: 0 }, b, up: {}, proj: [], creed: null,
    prio: JOBLIST.slice(), lim: {}, grow: Infinity, starve: Infinity, noGrow: 0, deaths: 0, feats: {}, pend: [], tr: {}, fi: 0, dead: 0 };
}
function clone(st) { return { ...st, s: { ...st.s }, b: { ...st.b }, up: { ...st.up }, proj: st.proj.map(p => ({ ...p })), prio: st.prio.slice(), lim: { ...st.lim }, feats: { ...st.feats }, pend: st.pend.slice(), tr: { ...st.tr } }; }

class Sim {
  constructor(orders, M) { this.orders = orders; this.M = M; this.reset(); }
  reset() {
    this.segs = []; this.recs = []; this.feats = []; this.log = []; this.byId = null; this.nEv = 0;
    const st = initState(this.M); this.events(st, -1); this.segs.push(this.build(st));
  }
  /* orders changed at time t: keep everything strictly before it */
  invalidate(t) {
    this.byId = null;
    let i = this.idx(t); while (i >= 0 && this.segs[i].t0 >= t) i--;
    if (i < 0) return this.reset();
    const st = this.segs[i].st, keep = a => { let n = a.length; while (n && a[n - 1].t > st.t) n--; a.length = n; };
    this.segs.length = i; keep(this.recs); keep(this.feats); keep(this.log);
    this.segs.push(this.build(st));
  }
  order(id) { if (!this.byId) { this.byId = new Map(); for (const o of this.orders) this.byId.set(o.id, o); } return this.byId.get(id); }
  firstAfter(t) { let lo = 0, hi = this.orders.length; while (lo < hi) { const m = (lo + hi) >> 1; if (this.orders[m].t > t) hi = m; else lo = m + 1; } return lo; }
  idx(t) { let lo = 0, hi = this.segs.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (this.segs[m].t0 <= t) lo = m; else hi = m - 1; } return lo; }
  note(st, x, c) { this.log.push({ t: st.t, x, c }); }
  feat(st, k, t) { if (st.feats[k]) return; st.feats[k] = 1; this.feats.push({ k, t: t === undefined ? st.t : t }); }

  extend(T) {
    let cur = this.segs[this.segs.length - 1], guard = 0, stuck = 0;
    while (cur.t1 <= T && guard++ < 200000) {
      const st = clone(cur.st), tau = cur.t1 - cur.t0; st.t = cur.t1;
      for (const r of RES) { let v = pev(cur.P[r], tau); const cap = cur.d && cur.d.cap[r]; if (v < 1e-7) v = 0; if (cap && v > cap - 1e-7) v = cap; st.s[r] = v; }
      for (const f of cur.nf) st.feats[f] = 1;
      this.events(st, cur.t0);
      stuck = tau < 1e-7 ? stuck + 1 : 0;
      cur = this.build(st, stuck > 40 ? 1e-3 : EPS); this.segs.push(cur); this.nEv++;
    }
  }

  /* everything that happens at the instant st.t (orders with prevT < t <= st.t become due) */
  events(st, prevT) {
    const M = this.M;
    while (FIXED[st.fi] && FIXED[st.fi].t <= st.t) this.fixed(st, FIXED[st.fi++]);
    if (st.dead) return;
    if (st.proj.length) st.proj = st.proj.filter(p => {
      if (p.done > st.t + EPS) return true;
      st.up[p.x] = 1; const U = UPG[p.x];
      if (U.creed) { st.creed = p.x; this.feat(st, 'oath_' + p.x); this.note(st, 'The people swear to the ' + U.n.slice(4) + '.', 'creed'); }
      else if (U.reg) { if (p.x.startsWith('reg_')) this.feat(st, p.x); this.note(st, p.x.startsWith('reg_') ? 'It is finished. ' + U.n.replace(/^\w+ /, '') + ' exists.' : U.n.replace('Recall', 'Recalled:') + '.', 'feat'); }
      else this.note(st, U.n + ' is understood.', 'up');
      if (p.x === 'shafts') st.s.vein += 4000; if (p.x === 'abyss') st.s.vein += 25000;
      return false;
    });
    if (st.grow <= st.t + EPS) { st.pop++; st.grow = Infinity; }
    if (st.starve <= st.t + EPS) { st.pop--; st.deaths++; st.starve = Infinity; st.noGrow = st.t + 25; st.grow = Infinity; if (st.deaths === 1) this.note(st, 'The stores are empty. The first grave of the famine is dug.', 'bad'); }
    for (let i = this.firstAfter(prevT); i < this.orders.length && this.orders[i].t <= st.t; i++) {
      const o = this.orders[i];
      if (o.k === 'l') { if (o.n == null) delete st.lim[o.x]; else st.lim[o.x] = o.n; this.recs.push({ id: o.id, t: st.t, s: 'ok' }); }
      else if (o.k === 'p') { st.prio = o.list.slice(); this.recs.push({ id: o.id, t: st.t, s: 'ok' }); }
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
        if (o.k === 'b') { st.b[o.x]++; this.recs.push({ id: o.id, t: st.t, s: 'ok' }); }
        else { const done = st.t + UPG[o.x].t * derive(st, M).research; st.proj.push({ x: o.x, t0: st.t, done }); this.recs.push({ id: o.id, t: st.t, s: 'ok', done }); }
        st.pend.splice(i--, 1); again = true;
      }
    }
    if (st.pop >= 8) this.feat(st, 'hearth');
    if (st.deaths >= 3) this.feat(st, 'hunger');
    for (const [r, n, k] of STOCKFEATS) if (st.s[r] >= n) this.feat(st, k);
  }
  fixed(st, f) {
    if (st.dead) return;
    if (f.k === 'log') this.note(st, f.x, f.c);
    else if (f.k === 'winterEnd') {
      if (!st.deaths && st.pop >= 12) { this.feat(st, 'stored'); this.note(st, 'The Long Winter ends. Every name in the census is still there.', 'feat'); }
      else this.note(st, 'The Long Winter ends.' + (st.deaths ? ' ' + st.deaths + ' did not see the thaw.' : ''), st.deaths ? 'bad' : 'up');
    } else if (f.k === 'trial') {
      const T = TRIALS[f.i], keys = [st.creed, 'blade', 'bell', 'lens'].filter((k, i, a) => k && a.indexOf(k) === i);
      const k = keys.find(k => st.s[T.ans[k].r] >= T.ans[k].need - 1e-6);
      if (!k) return this.fall(st, T.fail, T.n);
      const A = T.ans[k]; st.s[A.r] -= A.need; st.tr[f.i] = k; this.feat(st, A.e); this.note(st, T.n + '. ' + A.x, 'feat');
      if (f.i === 0 && !st.creed) this.feat(st, 'unaligned');
    } else if (f.k === 'final') {
      const has = k => st.up['reg_' + k] || st.up['call_' + k];
      if (has('sword') && has('bell') && has('lens')) { st.tr[2] = 'all'; this.feat(st, 'dawn'); this.note(st, 'The Unmaking arrives. The Sword bars it, the Bell calls back what it took, the Lens shows it its own face. It unmakes itself. Morning comes anyway.', 'feat'); }
      else this.fall(st, 'The Unmaking arrives. It is not cruel. It simply finishes.', 'The Unmaking');
    }
  }
  fall(st, x, by) { st.dead = st.t; st.by = by; st.pend = []; st.proj = []; this.feat(st, 'ruin'); this.note(st, x, 'fall'); }

  /* closed-form segment starting from state st */
  build(st, minTau = EPS) {
    const M = this.M, seg = { t0: st.t, t1: Infinity, st, P: {}, mode: {}, w: {}, nf: [], d: null };
    if (st.dead) { for (const r of RES) seg.P[r] = [st.s[r]]; return seg; }
    const d = seg.d = derive(st, M);
    let free = st.pop;
    for (const j of st.prio) { const n = Math.max(0, Math.min(free, d.slots[j], st.lim[j] == null ? Infinity : st.lim[j])); seg.w[j] = n; free -= n; }
    seg.w.forager = free;
    const clim = climAt(st.t), F = {}; // F[j]: activity polynomial of job j
    for (const j in JOBS) F[j] = pscale(JOBS[j].clim ? clim : [1], seg.w[j] * d.jm[j]);
    let tS = Infinity; // next scheduled instant
    if (FIXED[st.fi]) tS = FIXED[st.fi].t;
    const oi = this.firstAfter(st.t); if (oi < this.orders.length) tS = Math.min(tS, this.orders[oi].t);
    for (const p of st.proj) tS = Math.min(tS, p.done);
    const roots = [];
    for (const r of RES) {
      let inflow = [0], D = r === 'food' ? st.pop * UPKEEP : 0;
      for (const j in JOBS) { const J = JOBS[j]; if (J.out[0] === r) inflow = padd(inflow, F[j], J.out[1]); if (J.inp && J.inp[0] === r) D += J.inp[1] * seg.w[j] * d.jm[j]; }
      if (r === 'mem') inflow = padd(padd([st.pop * d.memPop], seg.P.lore, 0.001), seg.P.awe, 0.001);
      const net = padd(inflow, [D], -1), s0 = st.s[r], cap = d.cap[r] || Infinity, sg = psign0(net);
      if (s0 <= EPS && sg < 0) { // empty: consumers throttled to what flows in
        seg.mode[r] = 'empty'; seg.P[r] = [0];
        for (const j in JOBS) if (JOBS[j].inp && JOBS[j].inp[0] === r) F[j] = pscale(inflow, seg.w[j] * d.jm[j] / D);
        roots.push(net);
      } else if (s0 >= cap - EPS && sg > 0) { seg.mode[r] = 'full'; seg.P[r] = [cap]; roots.push(net); }
      else { seg.P[r] = pint(net, s0); if (ptrim(net).length > 1 || sg < 0) roots.push(seg.P[r]); if (cap < Infinity) roots.push(padd(seg.P[r], [cap], -1)); }
    }
    seg.starving = seg.mode.food === 'empty';
    if (seg.starving) { st.grow = Infinity; if (st.starve === Infinity) st.starve = st.t + d.starveT; }
    else { st.starve = Infinity; if (st.pop >= d.housing) st.grow = Infinity; else if (st.grow === Infinity) st.grow = Math.max(st.t, st.noGrow) + d.growT; }
    tS = Math.min(tS, st.grow, st.starve);
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
    this.extend(t);
    const seg = this.segs[this.idx(t)], tau = t - seg.t0, v = {}, dv = {};
    for (const r of RES) { v[r] = Math.max(0, pev(seg.P[r], tau)); dv[r] = pev(pder(seg.P[r]), tau); }
    return { seg, st: seg.st, d: seg.d, v, dv, w: seg.w, mode: seg.mode, clim: climAt(t)[0] };
  }
}
