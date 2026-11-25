# Apocrypha at the End of Time

**Play it: https://ngutten.github.io/apocrypha/**

A game about editing history. Four people start beside a river in year 0. Every year behind the horizon stays open: go back, order something there, and every later year is recomputed at once. Fork a history into lanes that run side by side and bleed into each other, late. Three relics, each hidden a different way, and something at the end that unwrites any lane without all three.

It runs in the browser as one self-contained page, and saves in the browser. To move a save between browsers or addresses, open the Archive, press "Copy save text", and paste it into "Load" at the other end.

This repository holds Apocrypha and the two smaller games it grew out of, all on one exact, event-driven simulation engine. Each is a single HTML page.

| Game | What it added | Folder |
| --- | --- | --- |
| **Errata at the End of Time** | The core idea: scrub through time, place orders in the past, fork lanes. Latched "echoes". | `errata/` |
| **Palimpsest at the End of Time** | A seeded map of sites, a fixed-delay bleed between lanes, things hidden under the ground. | `palimpsest/` |
| **Apocrypha at the End of Time** | An inked procedural map, three relics behind three different systems (dungeon, trail, research tree), Memory-driven bleed, dated maladies. | `apocrypha/` |

`map-study/` is the standalone page used to work out the map's look before Apocrypha.

## Layout

```
build.js              assembles <game>/dist/index.html from <game>/src, and refuses if the script does not parse
docs/index.html       the published page: a copy of apocrypha/dist/index.html, served by GitHub Pages
package.json          npm scripts
<game>/src/engine.js  the simulation. No DOM. Loadable in Node.
<game>/src/ui.js      save, lanes, Archive, rendering, input
<game>/src/shell.html HTML and CSS, with /*ENGINE*/ and /*UI*/ markers
<game>/test/          Node engine tests and Playwright browser tests
<game>/dist/          built page (committed, since it is what gets published)
```

## Commands

```
npm install            # only needed for the browser tests (Playwright)
npm run build          # build all three; fails on a syntax error
npm test               # build, then engine fuzz and directed tests
npm run test:browser   # Apocrypha in a headless browser: loads at three sizes, a scripted early game,
                       # a three-relic late game with cheap costs, the Tighten action, presses of human
                       # length while the panels redraw (input.js), and a newcomer's first twenty minutes
                       # on six seeds (cold.js)
```

Set `CHROME=/path/to/chrome` if Playwright should use an installed browser instead of its own.

Playwright needs Node 20 or later. Where only an older Node is installed, Bun runs the browser tests as they are:
`CHROME=... bun apocrypha/test/input.js`, and likewise `err`, `shot`, `late`, `tight`, `cold`.

Open `apocrypha/dist/index.html` directly in a browser to play a local build. Saves are in the browser's local storage under `apocrypha-eot-save-1`.

## Before publishing

To publish: build, run `npm run prepublish-check`, read the output, and only then commit and push `main`. Pages serves `docs/index.html` a minute or so later. Do the checking and the pushing as separate steps. The published Apocrypha page is public and has players; a page that fails to parse is a dead page for all of them. This happened once, for two minutes, on 2026-11-12: a `//` comment in the middle of a long line. `build.js` has refused to write a page that does not parse ever since.

Rule changes rewrite every player's lanes from year 0. Treat the rules of the published game as frozen and try rule changes in a copy.

## How the engine works, in one paragraph

Between events, every stock is a polynomial in time. An event is either scheduled (an order, a timer, a dated trial) or the root of a polynomial (a stock empties or fills, a waiting order becomes affordable). Nothing about the future is ever stored: each segment recomputes "what happens next" from its start state alone, so an edit at year T only needs everything from T onward thrown away and rebuilt. Lanes affect each other only after a delay with a positive minimum, so all the lanes can be advanced together in steps of that minimum with no circularity. The fuzz tests check that a randomly edited world matches a freshly computed one exactly.

## Who made it

Built together by Margin (Claude, Anthropic) and Nich Guttenberg.

## Licence

[CC0 1.0](LICENSE): public domain, as far as the law allows. That covers the code, the text and the pages.
