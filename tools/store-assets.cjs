// Generates every store asset for every game into <game>/store/ :
//   covers (CrazyGames 1920x1080 / 800x1200 / 800x800), Poki thumbnail (1024x1024, no text),
//   gameplay screenshots, and silent preview videos (landscape 1920x1080 + portrait 1080x1620, ~18s, cover as first frame).
// Requires: Playwright (with Chromium) and ffmpeg.   Run from repo root:  node tools/store-assets.cjs [game] [--no-video]
const http = require('http'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const GAMES = {
  stealstorm: { dir: '', key: 'stealstorm_profile_v1', profile: { tutorialDone: true, stats: { matches: 10 }, settings: { sfx: 0, music: 0 } } },
  hordemind: { dir: 'hordemind', key: 'hordemind_profile_v1', profile: { tutorialDone: true, hive: { brood: 10, vats: 10, forge: 4, chitin: 4, royal: 5, pit: 0 }, stats: { hunts: 10 }, settings: { sfx: 0, music: 0 } } },
  emberkeep: { dir: 'emberkeep', key: 'emberkeep_profile_v1', profile: { tutorialDone: true, coins: 0, deck: ['flame', 'storm', 'stone', 'void', 'arc'], cards: { flame: 3, frost: 3, storm: 3, stone: 3, gold: 2, venom: 2, sun: 2, void: 2, arc: 3 }, workshop: { wispDmg: 8, speed: 5, crit: 5, hp: 15, regen: 10, embers: 15, startEmbers: 10, nova: 2 }, lab: { levels: { autoSummon: 1, autoMerge: 1, autoPower: 1, speed2: 1 }, active: [] }, login: { last: 99999999, streak: 1, pending: false }, settings: { sfx: 0, music: 0 } } },
  fuseworks: { dir: 'fuseworks', key: 'fuseworks_profile_v1', profile: { tutorialDone: true, settings: { sfx: 0, music: 0, lowFx: false, reaches: true, fast: false } } },
  glint: { dir: 'glint', key: 'glint_profile_v1', profile: { v: 1, tut: 2, tier: 1, money: 2400, rep: 60, up: { machine: 2, refract: 1, loupe: 2, hammer: 2 }, cases: [null, null, null, null, null], settings: { sfx: 0, music: 0, quality: 'high', hints: true } } },
  driftline: { dir: 'driftline', key: 'driftline_profile_v1', profile: { tutorialDone: true, car: 'wraith', equip: { paint: 'p_synth', decal: 'd_bolt', glow: 'g_cyan', smoke: 's_pink' }, owned: { p_synth: true, d_bolt: true, g_cyan: true, s_pink: true, p_red: true, d_none: true, g_none: true, s_white: true }, stats: { races: 10 }, settings: { sfx: 0, music: 0 } } },
};
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
function serve() { return new Promise((res) => { const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); }); srv.listen(0, () => res(srv)); }); }

async function cover(b, base, g, w, h, text, out) {
  const pg = await b.newPage({ viewport: { width: w, height: h } });
  await pg.goto(`${base}/${g.dir ? g.dir + '/' : ''}tools/covers.html?w=${w}&h=${h}&text=${text ? 1 : 0}`);
  await pg.waitForFunction(() => window.coverReady, null, { timeout: 20000 }); await pg.waitForTimeout(200);
  await pg.screenshot({ path: out }); await pg.close();
}

// Per-game driver: sets up a scripted match with an autopilot, returns step() which advances 1/30s and renders.
const DRIVERS = {
  async stealstorm(pg) {
    await pg.evaluate(async () => {
      const a = window.__app; const { Bot } = await import('/src/game/bot.js');
      a.loop = () => {}; a.startMatch(); const m = a.match; const p = m.player;
      p.bot = new Bot(m, p, 0.95); p.bot.lootUntil = 0; p.bot.aggro = 1;
      window.__step = (render) => { for (let i = 0; i < 2; i++) { if (a.match) { a.match.update(1 / 60); if (p.hp < p.maxHp * 0.55) p.hp = p.maxHp * 0.55; } } if (render && a.match) { a.renderer.draw(a.match, 1 / 30); a.hud.update(1 / 30, ++window.__f); } };
      window.__f = 0;
      // stage the action: pull 4 rivals into a brawl around the player once the preroll ends
      window.__stage = () => { const near = m.fighters.filter((f) => !f.isPlayer && f.alive).slice(0, 4); near.forEach((f, i) => { const ang = i * 1.6 + 0.3; f.x = p.x + Math.cos(ang) * 480; f.y = p.y + Math.sin(ang) * 380; m.moveCircle(f, 0, 0); f.bot.lootUntil = 0; f.bot.aggro = 1; f.hp = f.maxHp; }); p.ult = 0.85; p.hp = p.maxHp; };
    });
    return { preroll: 6 * 30 };
  },
  async hordemind(pg) {
    await pg.evaluate(async () => {
      const a = window.__app; const { autoIntent } = await import('/hordemind/src/game.js');
      a.loop = () => {}; a.startHunt({ hero: 'ignis', diff: 0 }); const g = a.hunt; g.o.intent = autoIntent;
      g.mods.cap = 150; g.mods.spawn = 2.5; g.biomass += 900; g.brood.push('swarmling', 'bomber'); // a big, varied horde for the trailer
      window.__step = (render) => { for (let i = 0; i < 2; i++) { const h = a.hunt; if (!h) break; if (h.choosing) a.chooseEvo(h.choosing[0].id); h.update(1 / 60); if (h.queen.hp < 45) h.queen.hp = 45; if (h.hero.hp < h.hero.maxHp * 0.25) h.hero.hp = h.hero.maxHp * 0.25; } if (render && a.hunt) { a.renderer.draw(a.hunt, 1 / 30); a.hud.update(1 / 30); } };
    });
    return { preroll: 18 * 30 };
  },
  async emberkeep(pg) {
    await pg.evaluate(() => {
      const a = window.__app; a.loop = () => {}; a.startRun(); const r = a.run; r.auto = { summon: true, merge: true, power: true };
      window.__step = (render) => { for (let i = 0; i < 2; i++) { if (a.run) { a.run.update(1 / 60); if (a.run.hp < a.run.maxHp * 0.5) a.run.hp = a.run.maxHp * 0.5; } } if (render && a.run) { a.renderer.draw(a.run, 1 / 30, { ...a.ui, theme: a.theme, skin: a.skin }); a.hud.update(1 / 30); } };
    });
    return { preroll: 400 * 30 }; // ~wave 20: thick waves, a full board of merged wisps
  },
  async fuseworks(pg) {
    // scripted, real gameplay: preview a reach → one big chain → TARGET! → GRAND FINALE → ACT CLEAR → the Bazaar
    await pg.evaluate(() => {
      const a = window.__app; a.frame = () => {}; a.newRun({}); const r = a.run; r.night = 3; r.actIdx = 1;
      for (const id of ['spark_plug', 'peony_patch', 'echo', 'marshal', 'long_fuse']) r.addCatalyst(id);
      r.formulas.peony = 3; r.formulas.willow = 2; r.money = 14; r.charms.push({ id: 'gild' }); r.act = null; r.phase = 'preact'; a.startAct();
      const sky = r.act.sky; const al = sky.shells.filter((s) => s.state === 0); const cols = 5, sp = 150; const rows = Math.ceil(al.length / cols);
      al.forEach((s, i) => { const c = i % cols, rr = Math.floor(i / cols); s.x = sky.W / 2 + (c - (cols - 1) / 2) * sp + (rr % 2 ? sp / 2 : 0) - sp / 4 + (Math.sin(i * 7.3) * 18); s.y = sky.H * 0.5 + (rr - (rows - 1) / 2) * sp * 0.86 + Math.cos(i * 3.1) * 16; });
      const starter = al[Math.floor(al.length / 2)]; let f = 0, armed = false;
      window.__step = (render) => {
        for (let i = 0; i < 2; i++) {
          f++; const act = a.run.act;
          if (f === 95) a.u.hover = starter;
          if (f === 150) { a.u.hover = null; a.light(starter); }
          if (act && act.current && !armed && act.current.chain >= Math.round(al.length * 0.55)) { armed = true; act.target = Math.max(1, Math.round((a.shownScore + a.live) * 1.04 / 100) * 100); }
          if (f === 800) { const b = document.querySelector('[data-act=to-shop]'); if (b) b.click(); }
          a.step(1 / 60);
        }
        if (render) a.render(1 / 30);
      };
    });
    return { preroll: 1 * 30, shots: [102, 140, 430] };
  },
  async glint(pg) {
    // scripted, real gameplay: crack a rock → reveal → plan → grind three facet tiers to perfect meets (time-lapse) → polish → certificate → the shop
    await pg.evaluate(() => {
      const a = window.__app; a.frame = () => {}; a.ui.closeModal();
      const r = { id: 'trailer', sp: 'sapphire', vid: 'cornflower', seed: 31337, size: 5.8, clarity: 0.12, tone: 1.0, known: false, src: 'mystery', paid: 0 };
      a.bench.load(r); let f = 0, planAt = -1, certAt = -1;
      window.__step = (render) => {
        for (let i = 0; i < 2; i++) {
          f++; const b = a.bench; const L = a.benchL;
          if (b.stage === 'crack' && [20, 44, 66].includes(f)) b.hammer(L.gx + (f % 3 - 1) * 14, L.gy - 6);
          if (b.stage === 'plan' && planAt < 0) planAt = f;
          if (b.stage === 'plan' && f - planAt === 50) { b.place.yaw += 0.4; b.refit(); a.ui.bench(b); }
          if (b.stage === 'plan' && f - planAt === 100) b.startCut();
          if (b.stage === 'cut' && b.sub !== 'girdle') {
            if (!b.curve.ready) b.stepCurve(500);
            if (b.curve.ready && !b.grinding && !b.stageDone) { b.setAngle(b.curve.best.a); b.grindStart(); }
            const sd = b.stageDef(); if (b.grinding) { b.P[sd.u] = Math.min(1, (b.P[sd.u] || 0) + 0.03); if (b.P[sd.u] >= 1) b.grindStop(); }
          }
          if (b.stage === 'polish') { const t = f * 0.09; for (let k = 0; k < 3; k++) b.rub(L.gx + Math.cos(t + k) * L.gr * 0.55, L.gy + Math.sin(t * 1.3 + k) * L.gr * 0.4, 40); }
          if (b.stage === 'appraise' && certAt < 0) certAt = f;
          if (certAt > 0 && f - certAt === 330) { const btn = document.querySelector('.cert [data-act=case]'); if (btn) btn.click(); a.setView('shop'); for (let k = 0; k < 3; k++) a.shop.spawn(); }
          a.step(1 / 60);
        }
        if (render) a.render(1 / 30);
      };
    });
    return { preroll: 1, shots: [70, 220, 360] };
  },
  async driftline(pg) {
    await pg.evaluate(async () => {
      const a = window.__app; a.loop = () => {}; a.startRace({ mode: 'quick', seed: 412, name: 'Boulevard 88' });
      const r = a.race; r.o.intent = (rc) => { const c = rc.player; const o = rc.ai(c); const T = rc.track; let m = 0; for (let k = 6; k < 30; k += 3) m = Math.max(m, Math.abs(T.pts[(c.idx + k) % T.N].curv)); return { steer: o.steer * 1.25, brake: o.brake && !c.drift, drift: m > 0.28 }; };
      window.__step = (render) => { for (let i = 0; i < 2; i++) if (a.race) a.race.update(1 / 60); if (render && a.race) { a.renderer.draw(a.race, 1 / 30); a.hud.update(1 / 30, ++window.__f); } };
      window.__f = 0;
    });
    return { preroll: 2.2 * 30 };
  },
};

async function video(b, base, name, g, w, h, outDir, coverPng, shots) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [g.key, JSON.stringify(g.profile)]);
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto(`${base}/${g.dir ? g.dir + '/' : ''}index.html`); await pg.waitForFunction(() => window.__app && ['lobby', 'home', 'title', 'ready'].includes(window.__app.state), null, { timeout: 20000 });
  await pg.waitForTimeout(500);
  const { preroll, shots: dshots } = await DRIVERS[name](pg); if (dshots && shots) shots = dshots;
  await pg.evaluate((n) => { for (let i = 0; i < n; i++) window.__step(i > n - 3); if (window.__stage) window.__stage(); }, preroll);
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'frames-'));
  const FRAMES = 17 * 30;
  for (let i = 0; i < FRAMES; i++) {
    await pg.evaluate(() => window.__step(true));
    const fp = path.join(tmp, `f${String(i).padStart(4, '0')}.jpg`);
    await pg.screenshot({ path: fp, type: 'jpeg', quality: 90 });
    if (shots && shots.includes(i)) await pg.screenshot({ path: path.join(outDir, `screenshot-${shots.indexOf(i) + 1}.png`) });
  }
  if (errs.length) console.warn(name, 'page errors:', errs.slice(0, 3));
  const out = path.join(outDir, `preview-${w > h ? 'landscape' : 'portrait'}-${w}x${h}.mp4`);
  // 1s static cover as the opening frame, then gameplay. Silent, H.264, yuv420p (plays everywhere).
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-t', '1', '-framerate', '30', '-i', coverPng, '-framerate', '30', '-i', path.join(tmp, 'f%04d.jpg'),
    '-filter_complex', `[0:v]scale=${w}:${h},setsar=1,format=yuv420p[a];[1:v]scale=${w}:${h},setsar=1,format=yuv420p[b];[a][b]concat=n=2:v=1:a=0[v]`, '-map', '[v]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-movflags', '+faststart', '-an', out]);
  fs.rmSync(tmp, { recursive: true, force: true }); await ctx.close();
  console.log(`  ✔ ${path.relative(ROOT, out)} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
}

(async () => {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('--')); const noVideo = process.argv.includes('--no-video');
  const srv = await serve(); const base = `http://localhost:${srv.address().port}`; const b = await chromium.launch();
  for (const [name, g] of Object.entries(GAMES)) {
    if (only.length && !only.includes(name)) continue;
    const outDir = path.join(ROOT, g.dir, 'store'); fs.mkdirSync(outDir, { recursive: true }); console.log(`▶ ${name}`);
    await cover(b, base, g, 1920, 1080, true, path.join(outDir, 'cover-landscape-1920x1080.png'));
    await cover(b, base, g, 800, 1200, true, path.join(outDir, 'cover-portrait-800x1200.png'));
    await cover(b, base, g, 800, 800, true, path.join(outDir, 'cover-square-800x800.png'));
    await cover(b, base, g, 1024, 1024, false, path.join(outDir, 'poki-thumbnail-1024x1024.png'));
    console.log('  ✔ covers + Poki thumbnail');
    if (noVideo) continue;
    const tmpCoverL = path.join(require('os').tmpdir(), `${name}-cl.png`), tmpCoverP = path.join(require('os').tmpdir(), `${name}-cp.png`);
    await cover(b, base, g, 1920, 1080, true, tmpCoverL); await cover(b, base, g, 1080, 1620, true, tmpCoverP);
    await video(b, base, name, g, 1920, 1080, outDir, tmpCoverL, [90, 270, 450]);
    await video(b, base, name, g, 1080, 1620, outDir, tmpCoverP, null);
  }
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
