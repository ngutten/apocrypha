/* How often is a press lost, by how long the button is held and how fast the horizon is running?
   Written to measure the old build (pass its path); on a fixed build every line should read n/n.
   usage: CHROME=<path to chromium> bun apocrypha/test/lost.js [path/to/index.html] [trials=12] */
const { chromium } = require('playwright');
const FILE = require('path').resolve(process.argv[2] || require('path').join(__dirname, '../dist/index.html')), N = +process.argv[3] || 12;
const box = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  for (const rate of [1, 3, 10]) for (const ms of [5, 40, 80, 130]) {
    const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); p.setDefaultTimeout(8000);
    await p.addInitScript(() => { Math.random = () => .37; });
    await p.goto('file://' + FILE); await p.waitForTimeout(700);
    await p.evaluate(() => { document.querySelector('#mBody [data-a=close]').click(); }); await p.waitForTimeout(300);
    let hitS = 0, hitB = 0;
    for (let i = 0; i < N; i++) { // a speed button: its line is rewritten every time the year changes
      await p.evaluate(r => { window.apocrypha.state().rate = r; }, rate); await p.waitForTimeout(130 + (i * 37) % 200);
      const want = rate === 1 ? 3 : 1, r = await box(p, 'button[data-a=rate][data-x="' + want + '"]');
      await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.waitForTimeout(ms); await p.mouse.up(); await p.waitForTimeout(40);
      if (await p.evaluate(() => window.apocrypha.state().rate) === want) hitS++;
    }
    await p.evaluate(r => { window.apocrypha.state().rate = r; }, rate);
    for (let i = 0; i < N; i++) { // a build button: rewritten only when what it says changes
      const n0 = await p.evaluate(() => window.apocrypha.state().br[0].orders.length), r = await box(p, '#pSite button[data-a=b][data-x=farm]');
      await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.waitForTimeout(ms); await p.mouse.up(); await p.waitForTimeout(40 + (i * 37) % 150);
      if (await p.evaluate(() => window.apocrypha.state().br[0].orders.length) > n0) hitB++;
    }
    console.log('rate ' + String(rate).padStart(2) + ' yr/s   press ' + String(ms).padStart(3) + ' ms   speed button ' + hitS + '/' + N + '   Farm ' + hitB + '/' + N);
    await p.close();
  }
  await b.close();
})();
