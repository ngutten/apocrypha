#!/usr/bin/env node
/* Assemble a game's single-file page from src/, and refuse to write it if the script does not parse.
   Apocrypha is also written to docs/index.html, which is the page GitHub Pages serves.
   usage: node build.js <errata|palimpsest|apocrypha>   (no argument builds all three) */
const fs = require('fs'), path = require('path'), vm = require('vm');
const games = process.argv[2] ? [process.argv[2]] : ['errata', 'palimpsest', 'apocrypha'];
let bad = 0;
for (const g of games) {
  const src = f => fs.readFileSync(path.join(__dirname, g, 'src', f), 'utf8');
  const engine = src('engine.js'), ui = src('ui.js'), shell = src('shell.html');
  for (const [name, code] of [['engine.js', engine], ['engine.js + ui.js', engine + '\n' + ui]]) {
    try { new vm.Script(code, { filename: g + '/' + name }); } // parse only. This is the check that would have caught the 2026-11-12 outage.
    catch (e) { console.error('SYNTAX ERROR in ' + g + '/' + name + ': ' + e.message); bad++; }
  }
  if (bad) continue;
  const out = shell.replace('/*ENGINE*/', () => engine).replace('/*UI*/', () => ui);
  fs.mkdirSync(path.join(__dirname, g, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, g, 'dist', 'index.html'), out);
  console.log(g + ': dist/index.html, ' + out.length + ' bytes');
  if (g === 'apocrypha') { fs.mkdirSync(path.join(__dirname, 'docs'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'docs', 'index.html'), out); console.log(g + ': docs/index.html (the published page)'); }
}
process.exit(bad ? 1 : 0);
