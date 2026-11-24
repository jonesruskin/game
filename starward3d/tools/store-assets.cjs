// Starward 3D store assets, rendered from the real built game (dist/web), so run `npm run build` first:
//   covers (CrazyGames 1920x1080 / 800x1200 / 800x800), a text-free 1024x1024 thumbnail, three screenshots,
//   and silent preview videos (1920x1080 + 1080x1620, 18 s, the cover as the first second).
// The game is driven on Playwright's virtual clock, so every frame is exact and every run is identical.
// Needs Playwright (Chromium) and ffmpeg.  From the repo root:  node starward3d/tools/store-assets.cjs [--no-video | --video-only]
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..'); const OUT = path.join(ROOT, 'starward3d', 'store');
const START = Date.UTC(2026, 10, 24, 15, 0, 0);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
function serve() { return new Promise((res) => { const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); }); srv.listen(0, () => res(srv)); }); }

// ---- runs in the page: a showcase colony at Commander level 24 ----
function stage(turf) {
  const a = window.__app, s = a.s, G = window.__G; let n = 0; const now = Date.now();
  const it = (t, x, z, lvl = 1, el) => ({ id: 'show' + n++, t, x, z, r: 0, lvl, ...(el ? { el } : {}) });
  s.name = 'Nova Haven'; s.lvl = 24; s.xp = 0; s.res = { credits: 2.43e6, cells: 4.1e5, dm: 840, iridium: 0 }; s.tut = 99;
  s.paint = { primary: '#e9eef5', accent: '#22c7e8' }; s.banner = { bg: '#1b6fd8', fg: '#ffd23a', emblem: 'rocket' };
  const H = s.islands.home; H.plots = ['1,1', '2,1', '3,1', '1,2', '2,2', '3,2', '1,3', '2,3', '3,3', '2,0', '0,2', '4,2', '2,4']; H.bought = 4; if (turf) H.turf = turf; else delete H.turf;
  const bays = { solar: it('bay', 7, 7, 8, 'solar'), plasma: it('bay', 11, 7, 7, 'plasma'), hydro: it('bay', 16, 7, 7, 'hydro'), bio: it('bay', 20, 7, 6, 'bio') };
  const items = [it('command', 13, 13, 9), ...Object.values(bays), it('fab', 7, 12, 6), it('fab', 7, 16, 5), it('assembly', 20, 12, 5), it('fusion', 19, 16, 4), it('arena', 13, 1, 5), it('pad', 25, 13, 6),
    it('statue', 14, 19, 1, 'colossus'), it('sign', 13, 22), it('fountain', 2, 14), it('pond', 14, 25), it('beacon', 12, 26), it('turbine', 17, 25), it('bench', 16, 27), it('topiary', 13, 28), it('dish', 28, 16), it('crystal', 24, 17),
    it('tree', 1, 12), it('tree', 4, 17), it('tree', 10, 13), it('tree', 11, 17), it('tree', 18, 11), it('tree', 8, 21), it('tree', 21, 21), it('tree', 26, 12), it('crystal', 18, 13), it('topiary', 10, 20), it('bench', 19, 20), it('rock', 7, 20),
    it('lamp', 12, 12), it('lamp', 17, 12), it('lamp', 12, 17), it('lamp', 17, 17), it('lamp', 5, 13), it('lamp', 5, 16), it('lamp', 12, 5), it('lamp', 17, 5),
    it('flag', 6, 6), it('flag', 23, 6), it('flag', 6, 23), it('flag', 23, 23), it('flag', 12, 0), it('flag', 17, 0),
    ...Array.from({ length: 16 }, (_, i) => it('path', 7 + i, 10)), it('path', 14, 11), it('path', 15, 11), it('path', 14, 12), it('path', 15, 12), it('path', 14, 17), it('path', 15, 17), it('path', 14, 18), it('path', 15, 18)];
  H.items = items;
  const crew = { solar: ['helio', 'solarflare', 'solaris'], plasma: ['ember', 'blastforge', 'primemover'], hydro: ['tidepool', 'tsunami', 'leviathan'], bio: ['sprout', 'gaia', 'genesis'] };
  s.bots = []; s.bay = {}; s.dex = {}; let k = 0;
  for (const [el, sps] of Object.entries(crew)) { const b = bays[el]; for (const sp of sps) { s.bots.push({ id: 'showbot' + k, sp, lvl: 12 + ((k * 7) % 19), fed: 0, bay: b.id, born: now }); k++; s.dex[sp] = now; } s.bay[b.id] = G.bayCap(b, s) * 0.7; }
  for (const sp of ['colossus', 'corona', 'tectonic', 'verdant', 'tesla', 'borealis', 'supernova', 'tempest', 'eventide', 'starweaver', 'quasar', 'seraph', 'voltaic', 'omega', 'horizon', 'veyari']) s.dex[sp] = now;
  s.jobs = []; s.cores = []; s.ready = {}; s.obj = { i: 22, claimed: {} }; s.stats = { ...s.stats, arenaWins: 31, fusions: 9, expeditions: 7, decor: 40, collects: 400 };
  a.changed(); try { a.ui.renderHud(); a.ui.renderObj(); } catch (e) {} G.events.length = 0; document.querySelectorAll('#modal [data-a="closeModal"]').forEach((b) => b.click()); try { a.ui.closeModal(); a.ui.closeOver(); } catch (e) {}
  const w = a.world; Object.assign(w.cam, { x: 0.5, z: 1.5, tx: 0.5, tz: 1.5, dist: 46, tdist: 46, yaw: Math.PI / 4, tyaw: Math.PI / 4 });
}
async function boot(b, w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.clock.install({ time: START }); await pg.goto(`${base}/starward3d/dist/web/index.html`);
  for (let i = 0; i < 400; i++) { await pg.clock.runFor(100); if (await pg.evaluate(() => !!(window.__app && window.__app.world && window.__G))) break; }
  await pg.clock.runFor(1500); return { ctx, pg, errs };
}
let base = '';
async function shot(b, w, h, out, opts = {}) {
  const { ctx, pg, errs } = await boot(b, w, h); await pg.evaluate(stage, opts.turf || null);
  await pg.addStyleTag({ content: '#hud,#nav,#obj,#bubbles,#toasts,#panel,#mapui,#place,#modal,#over{display:none!important}' });
  await pg.evaluate(([dist, ox, oz]) => { const c = window.__app.world.cam; Object.assign(c, { dist, tdist: dist, x: ox, tx: ox, z: oz, tz: oz }); }, [opts.dist || 40, opts.ox || 0.5, opts.oz || 1.5]);
  await pg.clock.runFor(2500); await pg.screenshot({ path: out }); if (errs.length) console.warn('page errors:', errs.slice(0, 3)); await ctx.close();
}
async function cover(b, w, h, text, out, opts) {
  const bg = path.join(ROOT, 'starward3d', 'tools', `.bg-${w}x${h}.png`); await shot(b, w, h, bg, opts);
  const pg = await b.newPage({ viewport: { width: w, height: h } }); await pg.goto(`${base}/starward3d/tools/covers.html?w=${w}&h=${h}&text=${text ? 1 : 0}&bg=${encodeURIComponent('.bg-' + w + 'x' + h + '.png')}`);
  await pg.waitForFunction(() => window.coverReady, null, { timeout: 20000 }); await pg.screenshot({ path: out }); await pg.close(); fs.rmSync(bg, { force: true });
}
// the trailer: collect → restyle the island → an Arena battle → a launch → the Solar System → the daily core spin
async function video(b, w, h, coverPng, shots) {
  const { ctx, pg, errs } = await boot(b, w, h); await pg.evaluate(stage, null);
  await pg.evaluate((land) => { const c = window.__app.world.cam; Object.assign(c, { dist: land ? 38 : 50, tdist: land ? 38 : 50 }); }, w > h);
  await pg.evaluate(() => { window.__act = (a, data = {}) => { const el = document.createElement('button'); el.dataset.a = a; for (const [k, v] of Object.entries(data)) el.dataset[k] = v; window.__app.ui.act(a, el); }; });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-frames-')); const FRAMES = 17 * 30; const land = w > h;
  for (let f = 0; f < FRAMES; f++) {
    await pg.evaluate(([f, land]) => { const a = window.__app, s = a.s, G = window.__G, w = a.world, H = s.islands.home; const byT = (t, el) => H.items.find((i) => i.t === t && (!el || i.el === el));
      if (w.mode === 'island') w.cam.tyaw += 0.0022;
      if (f === 24) a.collect(byT('bay', 'solar')); if (f === 38) a.collect(byT('bay', 'plasma')); if (f === 52) a.collect(byT('bay', 'hydro')); if (f === 64) a.collect(byT('bay', 'bio'));
      if (f === 92) { H.turf = 'neon'; a.changed(); } if (f === 122) { H.turf = 'sakura'; a.changed(); }
      if (f === 150) window.__act('arena'); if (f === 164) window.__act('fight', { i: '0' }); if (f === 176) { window.__act('autoBattle'); window.__act('battleSpeed'); }
      if (f >= 280 && f <= 330 && w.mode === 'arena' && !document.querySelector('#modal').classList.contains('hidden')) window.__act('leaveArena');
      if (f === 331 && w.mode === 'arena') { try { w.exitArena(); a.ui.closeModal(); } catch (e) {} }
      if (f === 336) { const p = byT('pad'); const c = w.centerOf(p); w.focus(c.x, c.z, land ? 24 : 32); w.launchFx(p.id, 3); }
      if (f === 392) window.__act('space'); if (f === 446) window.__act('closeMap');
      if (f === 452) { w.focus(0.5, 1.5, land ? 38 : 50); window.__act('spin'); }
    }, [f, land]);
    await pg.clock.runFor(1000 / 30);
    const fp = path.join(tmp, `f${String(f).padStart(4, '0')}.jpg`); await pg.screenshot({ path: fp, type: 'jpeg', quality: 90 });
    if (shots && shots.includes(f)) await pg.screenshot({ path: path.join(OUT, `screenshot-${shots.indexOf(f) + 1}.png`) });
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
  const L = { dist: 38, ox: -5.5, oz: 6.5 }, P = { dist: 52, ox: 0.5, oz: -2 }, Q = { dist: 44, ox: 0.5, oz: 0 };
  if (!process.argv.includes('--video-only')) {
    await cover(b, 1920, 1080, true, path.join(OUT, 'cover-landscape-1920x1080.png'), L);
    await cover(b, 800, 1200, true, path.join(OUT, 'cover-portrait-800x1200.png'), P);
    await cover(b, 800, 800, true, path.join(OUT, 'cover-square-800x800.png'), Q);
    await cover(b, 1024, 1024, false, path.join(OUT, 'poki-thumbnail-1024x1024.png'), { dist: 34, ox: 0.5, oz: 1.5 });
    console.log('  ✔ covers + thumbnail');
  }
  if (!noVideo) {
    const cl = path.join(os.tmpdir(), 's3d-cl.png'), cp = path.join(os.tmpdir(), 's3d-cp.png');
    await cover(b, 1920, 1080, true, cl, L); await cover(b, 1080, 1620, true, cp, P);
    await video(b, 1920, 1080, cl, [70, 240, 420]); await video(b, 1080, 1620, cp, null);
  }
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
