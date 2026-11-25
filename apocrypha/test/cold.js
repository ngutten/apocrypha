/* The first twenty minutes, played the way a first-time player played them cold on 2026-11-23 (their log: clock
   running, Farm + Hut, hold, survey, settle a neighbour, queue a Mine and two studies, run at 10, the first discovery card,
   hold, dismiss the card, switch tabs). The thing to look for: no page errors, the frame loop still alive, and the
   tabs still switching after the card is dismissed.
   usage: CHROME=<path to chromium> bun apocrypha/test/cold.js [seeds=6] [startSeed=1] */
const { chromium } = require('playwright');
const URL = 'file://' + require('path').resolve(__dirname, '../dist/index.html');
const N = +process.argv[2] || 6, S0 = +process.argv[3] || 1;

async function play(browser, k) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), p = await ctx.newPage(), errs = [], notes = [];
  p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  await p.addInitScript(k => { Math.random = () => (k * 0.6180339887) % 1; let n = 0; const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = f => raf(t => { n++; f(t); }); window.__frames = () => n; }, k);
  await p.goto(URL); await p.waitForTimeout(1500);
  const G = () => p.evaluate(() => { const g = window.apocrypha.state(); return { H: Math.round(g.H), cur: Math.round(g.cur), rate: g.rate, tab: g.tab, sel: g.sel, trail: g.trail, orders: g.br[0].orders.length }; });
  const alive = async () => { const a = await p.evaluate(() => window.__frames()); await p.waitForTimeout(400); return (await p.evaluate(() => window.__frames())) - a; };
  const site = async id => { const q = await p.evaluate(id => { const cv = document.getElementById('map'), r = cv.getBoundingClientRect(), k = r.width / cv.width, s = MAP.sites[id]; return { x: r.left + V.X(s.x) * k, y: r.top + V.Y(s.y) * k }; }, id); await p.mouse.click(q.x, q.y); await p.waitForTimeout(250); };
  const tabOK = async t => { await p.click('#tb_' + t); await p.waitForTimeout(350); return p.evaluate(t => document.getElementById('tb_' + t).getAttribute('aria-selected') === 'true' && !document.getElementById('t_' + t).hidden, t); };

  notes.push('intro up at year ' + (await G()).H);
  await p.click('#mBody [data-a=close]'); await p.waitForTimeout(600);
  await p.click('#pSite button[data-a=b][data-x=farm]'); await p.waitForTimeout(300);
  await p.click('#pSite button[data-a=b][data-x=hut]'); await p.waitForTimeout(600);
  // look around: select a site, then hold
  const info = await p.evaluate(() => { const S = MAP.sites, r0 = MAP.rites[0], vis = S.filter(s => s.id && !s.shore && visible(s.id)).map(s => s.id), nb = S[0].adj.map(e => e.to).filter(id => !S[id].shore); const near = nb.find(id => id === r0 || S[id].adj.some(e => e.to === r0)); return { vis, nb, pick: near != null ? near : (nb.find(id => S[id].ter === 'hills') || nb[0]), near: near != null, ter: S[near != null ? near : nb[0]].ter }; });
  await site(info.vis[0]);
  await p.keyboard.press('Space'); await p.waitForTimeout(250); notes.push('Space after map click -> rate ' + (await G()).rate);
  if ((await G()).rate !== 0) await p.click('button[data-a=rate][data-x="0"]');
  for (const id of info.vis.slice(0, 6)) await site(id);
  // wait (running) until the settlers can be paid for, then settle and queue a mine/farm there
  await site(info.pick);
  if (await p.$('#pSite button[data-a=s]')) await p.click('#pSite button[data-a=s]'); else notes.push('no settle button for ' + info.pick);
  await p.waitForTimeout(300);
  const bld = await p.$('#pSite button[data-a=b][data-x=mine]') || await p.$('#pSite button[data-a=b][data-x=farm]'); if (bld) await bld.click(); await p.waitForTimeout(300);
  if (!(await tabOK('study'))) notes.push('STUDY TAB DID NOT OPEN');
  for (let i = 0; i < 2; i++) { const u = await p.$('#pStudy button[data-a=u]'); if (u) await u.click(); await p.waitForTimeout(300); }
  // "clicked Hold again expecting a toggle"
  await p.click('button[data-a=rate][data-x="0"]'); await p.waitForTimeout(250); notes.push('Hold clicked while held -> rate ' + (await G()).rate);
  await p.click('button[data-a=rate][data-x="10"]');
  // run until the first discovery card, or year 420
  let card = false; for (let i = 0; i < 90; i++) { await p.waitForTimeout(500); if (await p.$('.disc')) { card = true; break; } if ((await G()).H > 420) break; }
  const g1 = await G(); notes.push((card ? 'card at year ' : 'no card by year ') + g1.H + ' (settled ' + info.pick + ', next to first hollow: ' + info.near + ')');
  await p.click('button[data-a=rate][data-x="0"]'); await p.waitForTimeout(300);
  if (card) { await p.click('.disc [data-a=dismiss]'); await p.waitForTimeout(300); }
  const o = await tabOK('orders'), w = await tabOK('work'), l = await tabOK('log'), fr = await alive();
  // fork from the past, as they did
  await p.click('#tb_orders'); await p.keyboard.down('Shift'); for (let i = 0; i < 12; i++) await p.keyboard.press('ArrowLeft'); await p.keyboard.up('Shift'); await p.keyboard.press('f'); await p.waitForTimeout(600);
  const lanes = await p.evaluate(() => window.apocrypha.state().br.length), fr2 = await alive();
  const bad = errs.length || !o || !w || !l || fr < 3 || fr2 < 3;
  console.log((bad ? 'BAD ' : 'ok  ') + 'seed#' + k + ' tabs after dismiss: orders ' + o + ' work ' + w + ' log ' + l + ' · frames/0.4s ' + fr + ',' + fr2 + ' · lanes ' + lanes + ' · ' + notes.join(' · ') + (errs.length ? '\n   ERR ' + errs.slice(0, 3).join('\n   ERR ') : ''));
  if (bad) await p.screenshot({ path: require('path').resolve(__dirname, '../shots/cold-bad-' + k + '.png') });
  await ctx.close(); return bad ? 1 : 0;
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const res = await Promise.all(Array.from({ length: N }, (_, i) => play(b, S0 + i).catch(e => { console.log('BAD seed#' + (S0 + i) + ' script failed: ' + e.message.split('\n')[0]); return 1; })));
  await b.close(); const nb = res.reduce((a, x) => a + x, 0); console.log(nb ? nb + ' of ' + N + ' bad' : 'all ' + N + ' ok'); process.exit(nb ? 1 : 0);
})();
