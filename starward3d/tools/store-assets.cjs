// Helioscend store assets, rendered from the real built game (dist/web), so run `npm run build` first:
//   covers (CrazyGames 1920x1080 / 800x1200 / 800x800), a text-free 1024x1024 thumbnail, five screenshots,
//   and silent preview videos (1920x1080 + 1080x1620, 18 s, the cover as the first second).
// A showcase programme is staged inside the game (a grown Earth spaceport with decorations, a terraformed Mars colony,
// star colonies, the Local Group, the Life Ladder, a War Games squad), then each view is shot on Playwright's virtual
// clock, so every frame is exact and every run is identical.
// Needs Playwright (Chromium) and ffmpeg.  From the repo root:  node starward3d/tools/store-assets.cjs [--no-video | --video-only]
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..'); const OUT = path.join(ROOT, 'starward3d', 'store');
const START = Date.UTC(2026, 10, 24, 15, 0, 0);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
function serve() { return new Promise((res) => { const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); }); srv.listen(0, () => res(srv)); }); }

// ---- runs in the page: the showcase programme ----
function stage() {
  const a = window.__app, s = a.s, G = window.__G, SO = window.__SO, D = window.__D, AL = window.__AL, LF = window.__LF, BY = window.__BY;
  s.tut = 99; s.name = 'Aurora Programme'; s.bases.earth.name = 'Cape Horizon';
  for (const t in D.TECH) s.tech[t] = 1; for (const r of ['credits', 'metal', 'fuel', 'science', 'cells', 'he3', 'rare', 'exotic', 'influence', 'xeno', 'antimatter']) s.res[r] = 1e13; s.res.dm = 1e6;
  const hq = s.bases.earth.items.find((i) => i.b === 'hq'); hq.lvl = 10;
  const build = (base, b, n = 1) => { for (let k = 0; k < n; k++) { const sp = G.freeSpot(s, base, b); if (!sp) return; const r = G.startBuild(s, base, b, sp[0], sp[1], 0); if (!r.ok) return; for (const j of [...s.jobs]) G.speedup(s, j.id); a.tickNow(); } };
  const earthB = Object.keys(D.BUILDINGS).filter((b) => b !== 'hq' && b !== 'wall' && D.BUILDINGS[b].bases.includes('earth') && D.BUILDINGS[b].cat !== 'decor');
  for (const b of earthB) build('earth', b, D.BUILDINGS[b].unique ? 1 : 2);
  for (const [b, n] of [['statue', 1], ['monument', 1], ['xenogarden', 1], ['beacon', 2], ['dishes', 1], ['rockgarden', 1], ['holotree', 6], ['flag', 4], ['lamp', 10]]) build('earth', b, n);
  for (const it of s.bases.earth.items) it.lvl = Math.min(D.BUILDINGS[it.b].max, it.b === 'hq' ? 14 : 13);
  // robots at work, so the bases are busy
  const sps = ['thunderhead', 'prism', 'umbra', 'mirrorplate', 'tidepool', 'rootbound', 'helio', 'digger', 'ember', 'sprout']; s.robots = s.robots || { list: [], dex: {}, cores: [], made: 0 };
  sps.forEach((sp, i) => { s.robots.list.push({ id: 'show' + i, sp, lvl: 20, post: null, born: Date.now() }); s.robots.dex[sp] = Date.now(); });
  // Mars, terraformed to rivers and green valleys, and Venus's cloud city
  SO.foundColony(s, 'mars'); SO.foundColony(s, 'venus'); SO.foundColony(s, 'titan'); const S = SO.sol(s); S.terra.mars = SO.TERRA.mars.stages.length; for (const b of ['europa', 'enceladus', 'jupiter', 'psyche', 'vesta', 'ceres', 'mercury']) S.sites[b] = 6;
  const colB = Object.keys(D.BUILDINGS).filter((b) => D.BUILDINGS[b].bases.includes('mars') && D.BUILDINGS[b].cat !== 'decor' && b !== 'hub' && b !== 'wall');
  const hub = s.bases.mars.items.find((i) => i.b === 'hub'); if (hub) hub.lvl = 12; for (const b of colB) build('mars', b, 2); for (const [b, n] of [['holotree', 3], ['flag', 2], ['lamp', 4], ['statue', 1]]) build('mars', b, n);
  for (const it of s.bases.mars.items) it.lvl = Math.min(D.BUILDINGS[it.b].max, 12); s.bases.mars.pop = 4000;
  // the stars, contact, life and the Local Group
  s.stars = { surveyed: {}, colonies: {}, ships: {}, mega: { laser: 3, dyson: 6, gate: 1 }, gates: {}, story: {} }; for (const id of ['proxima', 'acen', 'barnard', 'wolf359', 'lalande', 'sirius', 'epseri', 'ross128', 'trappist', 'tauceti', 'vega', 'altair', 'fomalhaut', 'gj667c', 'kapteyn']) s.stars.surveyed[id] = 1;
  for (const id of ['veyari', 'lumen', 'synod', 'mycelar', 'oshoru']) { AL.meet(s, id, 'music'); AL.known(s, id).und = 75; }
  const L = LF.life(s); for (const id of ['aresbrine', 'cloudmotes', 'plumespores', 'azotes', 'ventweavers', 'lithophages', 'floaters', 'kites']) { L.found[id] = Date.now(); L.st[id] = id === 'floaters' ? 2 : 3; }
  for (const e of LF.entries(s)) if (e.kind === 'exo' && e.rung >= 1) { L.found[e.id] = Date.now(); L.st[e.id] = 1; } for (const r of [0, 1, 2, 3, 4, 5, 6]) L.rungs[r] = Date.now(); L.sig = { drifters: 1 };
  const B = BY.bey(s); B.relay = 4; B.visited = { sagdeg: 1, lmc: 1, smc: 1 };
  s.kMax = 2.2; s.obj.i = 60; a.changed(); a.world.look = window.__STY.lookOf(s); a.world.sync(s);
  window.__G.events.length = 0; a.queue.length = 0; try { a.ui.closeModal(); a.ui.closeOver(); a.ui.renderHud(); a.ui.renderNav(); a.ui.renderObj(); } catch (e) {}
}
// views (each returns once the view is set; the clock then runs to settle it)
function view([name, land]) {
  const a = window.__app, w = a.world; try { a.ui.closeModal(); a.ui.closeOver(); } catch (e) {} a.queue.length = 0;
  const cam = (x, z, dist, yaw) => Object.assign(w.cam, { x, z, tx: x, tz: z, dist, tdist: dist, yaw, tyaw: yaw });
  if (name === 'earth') { if (a.s.at !== 'earth' || w.mode !== 'base') a.travel('earth'); cam(land ? -3 : 0, land ? 4 : 2, land ? 40 : 52, Math.PI / 4); }
  if (name === 'earthLow') { if (a.s.at !== 'earth' || w.mode !== 'base') a.travel('earth'); cam(-7, -7, 50, Math.PI / 4); }
  if (name === 'earthClose') { if (a.s.at !== 'earth' || w.mode !== 'base') a.travel('earth'); cam(-1, 3, 24, Math.PI / 4 + 0.5); }
  if (name === 'mars') { a.travel('mars'); cam(0, 0, land ? 30 : 40, Math.PI / 4 - 0.3); }
  if (name === 'system') { a.toBase(); a.openMap(); }
  if (name === 'stars') { a.toBase(); a.openStars(); }
  if (name === 'galaxy') { a.toBase(); a.openGalaxy(); }
  if (name === 'life') { a.ui.life.sel = 'floaters'; a.ui.life.rung = -1; a.ui.openOver('life'); }
  if (name === 'battle') { a.toBase(); a.travel('earth'); const W = window.__WG.war(a.s); W.sorties = 9; a.ui.openOver('war'); const b = document.createElement('button'); b.dataset.a = 'warAttack'; b.dataset.i = '0'; a.ui.act('warAttack', b); }
}
function deploy() { const a = window.__app; if (!a.battle) return; const B = a.battle.B, Lr = B.input.layout, m = (Lr.lo + Lr.hi) / 2, N = 52;
  // land just outside the red square, on whichever edges of the field have room
  const edges = [Lr.lo - 1.1, Lr.hi + 1.1].filter((v) => v > 0.1 && v < N - 0.1); if (!edges.length) return;
  for (let i = 0; i < B.input.army.length; i++) { a.ui.war.sel = i; const e = edges[i % edges.length], off = ((i % 5) - 2) * 1.8; if (Math.floor(i / 2) % 2) a.world.onBattleTap(e, m + off); else a.world.onBattleTap(m + off, e); } }
async function boot(b, w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.clock.install({ time: START }); await pg.goto(`${base}/starward3d/dist/web/index.html`);
  for (let i = 0; i < 400; i++) { await pg.clock.runFor(100); if (await pg.evaluate(() => !!(window.__app && window.__app.world && window.__G && window.__D))) break; }
  await pg.clock.runFor(1500); await pg.evaluate(stage); await pg.clock.runFor(1500); await pg.evaluate(() => { const a = window.__app; window.__G.events.length = 0; a.queue.length = 0; try { a.ui.closeModal(); } catch (e) {} });
  return { ctx, pg, errs };
}
const HIDE = '#hud,#nav,#obj,#bubbles,#toasts,#panel,#mapui,#place,#modal,#over,#rail,#bhud{display:none!important}';
let base = '';
async function shot(b, w, h, out, v, opts = {}) {
  const { ctx, pg, errs } = await boot(b, w, h); if (opts.clean) await pg.addStyleTag({ content: HIDE });
  await pg.evaluate(view, [v, w > h]); if (opts.clean) await pg.evaluate(() => { const e = window.__app.world.env; if (e && e.grid) e.grid.visible = false; if (e && e.bound) e.bound.visible = false; }); await pg.clock.runFor(2500);
  if (v === 'battle') { await pg.evaluate(deploy); await pg.clock.runFor(opts.fight || 11000); }
  await pg.evaluate(() => { const a = window.__app; a.queue.length = 0; try { a.ui.closeModal(); } catch (e) {} document.querySelectorAll('#toasts > *').forEach((t) => t.remove()); }); await pg.clock.runFor(300);
  await pg.screenshot({ path: out }); if (errs.length) console.warn('page errors:', errs.slice(0, 3)); await ctx.close();
}
async function cover(b, w, h, text, out, v) {
  const bg = path.join(ROOT, 'starward3d', 'tools', `.bg-${w}x${h}.png`); await shot(b, w, h, bg, v, { clean: true });
  const pg = await b.newPage({ viewport: { width: w, height: h } }); await pg.goto(`${base}/starward3d/tools/covers.html?w=${w}&h=${h}&text=${text ? 1 : 0}&bg=${encodeURIComponent('.bg-' + w + 'x' + h + '.png')}`);
  await pg.waitForFunction(() => window.coverReady, null, { timeout: 20000 }); await pg.screenshot({ path: out }); await pg.close(); fs.rmSync(bg, { force: true });
}
// the trailer: the spaceport → Mars in green → the Solar System → the stars → the Local Group → alien life → a War Games raid
async function video(b, w, h, coverPng) {
  const { ctx, pg, errs } = await boot(b, w, h); const land = w > h; await pg.addStyleTag({ content: '#obj,#toasts,#rail{display:none!important}' });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-frames-')); const FRAMES = 17 * 30;
  const cuts = { 0: 'earth', 90: 'mars', 170: 'system', 235: 'stars', 290: 'galaxy', 345: 'life', 405: 'battle' };
  for (let f = 0; f < FRAMES; f++) {
    if (cuts[f]) { await pg.evaluate(view, [cuts[f], land]); if (cuts[f] === 'battle') { await pg.clock.runFor(400); await pg.evaluate(deploy); } }
    await pg.evaluate(([f, land]) => { const a = window.__app, w = a.world; if (w.mode === 'base') { w.cam.tyaw += 0.0026; w.cam.yaw += 0.0026; if (f < 90) { w.cam.tdist -= land ? 0.05 : 0.06; } }
      if (w.mode === 'battle' && w.battle) w.battle.speed = 2; a.queue.length = 0; if (f % 10 === 0) { try { if (w.mode !== 'battle') a.ui.closeModal(); } catch (e) {} } }, [f, land]);
    await pg.clock.runFor(1000 / 30); await pg.screenshot({ path: path.join(tmp, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90 });
  }
  if (errs.length) console.warn('page errors:', errs.slice(0, 3));
  const out = path.join(OUT, `preview-${land ? 'landscape' : 'portrait'}-${w}x${h}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-t', '1', '-framerate', '30', '-i', coverPng, '-framerate', '30', '-i', path.join(tmp, 'f%04d.jpg'),
    '-filter_complex', `[0:v]scale=${w}:${h},setsar=1,format=yuv420p[a];[1:v]scale=${w}:${h},setsar=1,format=yuv420p[b];[a][b]concat=n=2:v=1:a=0[v]`, '-map', '[v]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-movflags', '+faststart', '-an', out]);
  fs.rmSync(tmp, { recursive: true, force: true }); await ctx.close(); console.log(`  ✔ ${path.relative(ROOT, out)} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
}
(async () => {
  if (!fs.existsSync(path.join(ROOT, 'starward3d', 'dist', 'web', 'index.html'))) { console.error('Build first: cd starward3d && npm run build'); process.exit(1); }
  const noVideo = process.argv.includes('--no-video'); fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(); base = `http://localhost:${srv.address().port}`; const b = await chromium.launch(); console.log('▶ starward3d');
  if (!process.argv.includes('--video-only')) {
    await cover(b, 1920, 1080, true, path.join(OUT, 'cover-landscape-1920x1080.png'), 'earth');
    await cover(b, 800, 1200, true, path.join(OUT, 'cover-portrait-800x1200.png'), 'earth');
    await cover(b, 800, 800, true, path.join(OUT, 'cover-square-800x800.png'), 'earthLow');
    await cover(b, 1024, 1024, false, path.join(OUT, 'poki-thumbnail-1024x1024.png'), 'earthClose');
    console.log('  ✔ covers + thumbnail');
    if (process.argv.includes('--fix')) { await cover(b, 800, 800, true, path.join(OUT, 'cover-square-800x800.png'), 'earthLow'); await shot(b, 1920, 1080, path.join(OUT, 'screenshot-4.png'), 'battle'); console.log('  ✔ square cover + battle screenshot'); await b.close(); srv.close(); return; }
    const shots = [['earth', 'the spaceport'], ['mars', 'a terraformed Mars colony'], ['life', 'the Life Ladder'], ['battle', 'a War Games raid'], ['galaxy', 'the Local Group']];
    for (let i = 0; i < shots.length; i++) await shot(b, 1920, 1080, path.join(OUT, `screenshot-${i + 1}.png`), shots[i][0]);
    console.log('  ✔ screenshots: ' + shots.map((x) => x[1]).join(', '));
  }
  if (!noVideo) {
    const cl = path.join(os.tmpdir(), 's3d-cl.png'), cp = path.join(os.tmpdir(), 's3d-cp.png');
    await cover(b, 1920, 1080, true, cl, 'earth'); await cover(b, 1080, 1620, true, cp, 'earth');
    await video(b, 1920, 1080, cl); await video(b, 1080, 1620, cp);
  }
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
