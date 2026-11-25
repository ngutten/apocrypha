/* Input that a person's hand produces and a scripted click does not: a press that lasts ~100 ms while the panels are
   being redrawn under it, and Space pressed while a button still has focus. Every press should do exactly one thing.
   usage: CHROME=<path to chromium> bun apocrypha/test/input.js */
const { chromium } = require('playwright');
const URL = 'file://' + require('path').resolve(__dirname, '../dist/index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { Math.random = () => .37; });
  await p.goto(URL); await p.waitForTimeout(1200);
  const st = () => p.evaluate(() => { const g = window.apocrypha.state(); return { H: Math.round(g.H), rate: g.rate == null ? 3 : g.rate, orders: g.br[0].orders.length, tab: g.tab || 'work' }; });
  const press = async (sel, ms) => { const r = await (await p.$(sel)).boundingBox(); await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); await p.waitForTimeout(ms); await p.mouse.up(); await p.waitForTimeout(60); };
  let bad = 0; const say = (ok, x) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'BAD  ') + x); };
  const h0 = (await st()).H; await p.waitForTimeout(1500); const h1 = (await st()).H; say(h1 === h0, 'horizon stands still while the intro is open (' + h0 + ' -> ' + h1 + ')');
  await p.click('#mBody [data-a=close]'); await p.waitForTimeout(700); const h2 = (await st()).H; say(h2 > h1, 'and moves once it is closed (' + h1 + ' -> ' + h2 + ')');
  // 1. slow presses on a build button while the horizon runs at 10 yr/s and the panels redraw
  await p.click('button[data-a=rate][data-x="10"]'); await p.evaluate(() => window.apocrypha.skip(150)); await p.waitForTimeout(300);
  let n0 = (await st()).orders, tries = 12; for (let i = 0; i < tries; i++) await press("#pSite button[data-a=b][data-x=farm]", 90 + i * 12);
  let n1 = (await st()).orders; say(n1 - n0 === tries, 'slow presses on Farm at 10 yr/s: ' + (n1 - n0) + ' of ' + tries + ' registered');
  n0 = n1; for (let i = 0; i < 24; i++) { await press('#tb_' + ['study', 'orders', 'log', 'work'][i % 4], 90 + i * 12); if ((await st()).tab !== ['study', 'orders', 'log', 'work'][i % 4]) { n0 = -1; break; } }
  say(n0 >= 0, 'slow presses on the tabs at 10 yr/s all took');
  // the speed buttons sit in the header line, which is rewritten every time the year changes: ten times a second here
  n0 = 0; for (let i = 0; i < 8; i++) { await p.click('button[data-a=rate][data-x="10"]'); await p.waitForTimeout(150); await press('button[data-a=rate][data-x="1"]', 110 + i * 15); if ((await st()).rate === 1) n0++; }
  say(n0 === 8, 'slow presses on a speed button while its own line is being rewritten: ' + n0 + ' of 8 registered');
  await p.click('button[data-a=rate][data-x="10"]'); await p.waitForTimeout(150);
  // 2. Hold: the button toggles, and Space does the same whatever has focus
  await p.click('button[data-a=rate][data-x="0"]'); await p.waitForTimeout(250); say((await st()).rate === 0, 'Hold holds');
  await p.click('button[data-a=rate][data-x="0"]'); await p.waitForTimeout(250); say((await st()).rate === 10, 'Hold clicked again lets go at the speed it was going (rate ' + (await st()).rate + ')');
  await p.click('button[data-a=rate][data-x="0"]'); await p.waitForTimeout(250);
  await p.keyboard.press('Space', { delay: 80 }); await p.waitForTimeout(300); say((await st()).rate === 10, 'Space right after clicking Hold lets go (rate ' + (await st()).rate + ')');
  await p.keyboard.press('Space', { delay: 80 }); await p.waitForTimeout(300); say((await st()).rate === 0, 'Space again holds (rate ' + (await st()).rate + ')');
  n0 = (await st()).orders; await p.click('#tb_work'); await p.click('#pSite button[data-a=b][data-x=hut]'); await p.waitForTimeout(100);
  await p.keyboard.press('Space', { delay: 80 }); await p.waitForTimeout(300); const s = await st(); say(s.orders === n0 + 1 && s.rate === 10, 'Space while a build button has focus only toggles the hold (orders +' + (s.orders - n0) + ', rate ' + s.rate + ')');
  await p.focus('#tb_log'); await p.keyboard.press('Space', { delay: 80 }); await p.waitForTimeout(300); const s2 = await st(); say(s2.rate === 0 && s2.tab === 'work', 'Space with a tab focused holds and does not switch tabs (rate ' + s2.rate + ', tab ' + s2.tab + ')');
  say(!errs.length, errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors');
  await b.close(); process.exit(bad ? 1 : 0);
})();
