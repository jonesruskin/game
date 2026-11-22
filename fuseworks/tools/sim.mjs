// Headless balance simulator: a bot plays full runs with the real game rules.
//   node tools/sim.mjs [runs=40] [stake=0] [launcher=classic] [--verbose]
import { Run } from '../src/run.js';
import { Sky, Launch, makeShell, IDLE } from '../src/sky.js';
import { CAT, CHARM, SHELLS, FIELD_AREA, NIGHTS } from '../src/content.js';
import { makeRng } from '../src/util.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--')); const VERBOSE = process.argv.includes('--verbose'); const NOVICE = process.argv.includes('--novice');
const RUNS = +(args[0] || 40), STAKE = +(args[1] || 0), LAUNCHER = args[2] || 'classic';
const W = Math.round(Math.sqrt(FIELD_AREA * 1.5)), H = Math.round(FIELD_AREA / W); // landscape-ish field
const ALL = new Set(['cat:fever', 'shell:comet', 'shell:strobe', 'cat:disco', 'cat:chain_letter', 'shell:spider', 'cat:tailwind', 'cat:phoenix', 'cat:midas', 'shell:crown', 'cat:royal', 'cat:mirror', 'cat:supernova', 'cat:butterfly', 'cat:constellation', 'cat:showrunner', 'cat:starfather']);

function cloneSky(run) {
  const a = run.act; const sky = new Sky(a.W, a.H, { mods: run.mods, boss: a.boss }); const map = new Map();
  for (const s of a.sky.shells) { const c = makeShell({ id: s.cid, type: s.type, color: s.color, enh: s.enh }); c.x = s.x; c.y = s.y; c.damp = s.damp; c.dry = s.dry; sky.shells.push(c); map.set(s, c); }
  return { sky, map };
}
let evals = 0;
function evalStarter(run, starter, seed = 1) {
  evals++; const a = run.act; const { sky, map } = cloneSky(run); const r = makeRng(seed);
  const fake = { money: run.money, luck: r, formulas: run.formulas, catalysts: run.catalysts, mods: run.mods, act: { boss: a.boss, purist: a.purist }, stats: run.stats };
  const L = new Launch(fake, { launchNo: a.launchNo + 1, isLast: a.launchNo + 1 >= a.launches, launchesLeft: a.launches - a.launchNo - 1, movesUsed: a.movesSince });
  sky.start(map.get(starter), L, run.launcherPos()); sky.runToEnd(); const score = L.finish(sky);
  return { score, chain: L.chain };
}
function bestStarters(run, k = 3) { return run.act.sky.alive.map((s) => ({ s, ...evalStarter(run, s) })).sort((a, b) => b.score - a.score).slice(0, k); }
function chainSet(run, starter) { // which shells burst if we light `starter`
  const a = run.act; const { sky, map } = cloneSky(run); const r = makeRng(1);
  const fake = { money: run.money, luck: r, formulas: run.formulas, catalysts: run.catalysts, mods: run.mods, act: { boss: a.boss, purist: a.purist }, stats: run.stats };
  const L = new Launch(fake, { launchNo: 1, isLast: false, launchesLeft: 1, movesUsed: 0 }); sky.start(map.get(starter), L, run.launcherPos()); sky.runToEnd();
  const inv = new Map([...map].map(([k, v]) => [v, k])); return new Set(sky.shells.filter((s) => s.state !== IDLE).map((s) => inv.get(s)));
}
function tryMoves(run) {
  const a = run.act; const left = a.launches - a.launchNo; const budget = Math.ceil(a.moves / Math.max(1, left));
  for (let m = 0; m < budget && a.moves > 0; m++) {
    const top = bestStarters(run, 2); if (!top.length) return; const base = top[0].score; let best = null;
    const lit = chainSet(run, top[0].s); const alive = a.sky.alive;
    const orphans = alive.filter((s) => !lit.has(s)).sort(() => Math.random() - 0.5).slice(0, 4);
    const anchors = alive.filter((s) => lit.has(s)).sort(() => Math.random() - 0.5).slice(0, 5);
    for (const sh of orphans) {
      const ox = sh.x, oy = sh.y;
      for (const other of anchors) for (let ang = 0; ang < 4; ang++) {
        const t = ang / 4 * Math.PI * 2 + Math.random() * 1.5; const d = 100 + Math.random() * 35; const x = other.x + Math.cos(t) * d, y = other.y + Math.sin(t) * d;
        if (!a.sky.canPlace(x, y, sh)) continue;
        sh.x = x; sh.y = y; let sc = 0; for (const st of [top[0].s, sh]) sc = Math.max(sc, evalStarter(run, st).score); sh.x = ox; sh.y = oy;
        if (sc > base * 1.05 && (!best || sc > best.sc)) best = { sh, x, y, sc };
      }
    }
    if (!best) break; run.moveShell(best.sh, best.x, best.y);
  }
}
const catValue = (id) => { const c = CAT[id]; return c.rarity * 3 + (/×|x:/.test(c.desc) ? 3 : 0) + 1; };
function shopBot(run) {
  const sh = run.shop; let guard = 0;
  const reserve = () => (run.night >= 3 ? 5 : 0);
  for (;;) {
    if (guard++ > 20) break; let did = false;
    // catalysts first
    sh.items.forEach((it, i) => { if (it.sold) return; if (it.kind === 'cat') { if (run.catalysts.length >= run.mods.catSlots) { const worst = run.catalysts.slice().sort((a, b) => catValue(a.id) - catValue(b.id))[0]; if (worst && catValue(it.id) > catValue(worst.id) + 2 && run.money + run.sellValue(worst) >= it.cost) run.sell(worst.uid); } if (run.canBuy(it) && run.money - it.cost >= 0) { run.buy(i); did = true; } } });
    sh.items.forEach((it, i) => { if (it.sold || it.kind === 'cat') return; if (it.kind === 'charm') { const c = CHARM[it.id]; if (c.kind === 'formula') { const n = run.crate.filter((x) => x.type === c.type).length; if (n >= 6 && run.money - it.cost >= reserve()) { run.buy(i); did = true; } } } else if (it.kind === 'shell' && run.money - it.cost >= reserve() + 4 && it.shell.enh) { run.buy(i); did = true; } });
    if (sh.bp && run.money - sh.bp.cost >= reserve()) { run.buyBlueprint(); did = true; }
    sh.packs.forEach((p, i) => { if (p.sold) return; if (run.money - p.cost >= reserve() + 2 && (p.kind === 'catalyst' || p.kind === 'formula')) { const pk = run.buyPack(i); if (pk) { let bi = -1, bv = -1; pk.opts.forEach((o, j) => { if (!run.canPick(o)) return; let v = 0; if (o.kind === 'cat') v = catValue(o.id); else if (o.kind === 'charm' && CHARM[o.id].kind === 'formula') v = run.crate.filter((x) => x.type === CHARM[o.id].type).length / 3; else v = 1; if (v > bv) { bv = v; bi = j; } }); if (bi >= 0) run.pickPack(bi); else run.closePack(); if (run.pack) run.closePack(); did = true; } } });
    if (!did) { if (run.catalysts.length < run.mods.catSlots && run.money >= run.rerollCost() + 8) { run.reroll(); continue; } break; }
  }
  // a decent player learns: additive catalysts first, multipliers last
  const isX = (id) => /\{x:/.test(CAT[id].desc); const sorted = run.catalysts.slice().sort((a, b) => isX(a.id) - isX(b.id)); run.catalysts.splice(0, run.catalysts.length, ...sorted); run.recalc();
  run.leaveShop();
}
function useCharms(run) {
  for (let i = run.charms.length - 1; i >= 0; i--) {
    const c = CHARM[run.charms[i].id]; if (!run.charmUsable(i)) continue;
    if (c.need > 0) { const alive = run.act.sky.alive; if (!alive.length) continue; const t = alive.slice(0, c.need); if (c.scrap) continue; run.useCharm(i, t); }
    else run.useCharm(i);
  }
}
function playRun(seed) {
  const run = new Run({ seed, launcher: LAUNCHER, stake: STAKE, unlocked: ALL });
  const log = { nights: 0, actRatios: [], launches: [], won: false, cats: [] };
  for (let guard = 0; guard < 200; guard++) {
    if (run.phase === 'preact') run.startAct(W, H);
    if (run.phase === 'act') {
      useCharms(run);
      if (!NOVICE) tryMoves(run);
      const best = NOVICE ? bestStarters(run, 4)[Math.floor(Math.random() * Math.min(4, run.act.sky.alive.length))] : bestStarters(run, 1)[0]; if (!best) { run.phase = 'over'; break; }
      run.beginLaunch(best.s); run.act.sky.runToEnd(); const target = run.act.target; const res = run.endLaunch();
      log.launches.push({ night: run.night, act: run.actIdx, score: res.score, chain: res.launch.chain, gf: res.launch.grandFinale });
      if (process.argv.includes('--debug') && (!isFinite(res.score) || res.score > 1e9)) { const L = res.launch; const cnt = {}; for (const e of L.log) { const key = e.k + (e.src ? ':' + run.catalysts.concat([]).find((c) => c.uid === e.src)?.id : ''); cnt[key] = (cnt[key] || 0) + 1; } console.log('HUGE', res.score, 'sparks', L.sparks, 'heat', L.heat, 'bursts', L.bursts, 'chain', L.chain, 'cats', run.catalysts.map((c) => c.id).join(','), JSON.stringify(cnt), 'formulas', JSON.stringify(run.formulas), 'end', L.endLog.map((e) => e.k + e.v).join(' ')); }
      if (res.cleared) { log.actRatios.push({ night: run.night, act: run.actIdx, r: run.act.score / target }); const co = run.cashOut(); if (co.won) { log.won = true; break; } shopBot(run); }
      else if (res.failed) break;
    }
  }
  log.nights = run.won ? NIGHTS + 1 : run.night; log.actReached = (run.night - 1) * 3 + run.actIdx; log.cats = run.catalysts.map((c) => c.id); log.money = run.money; log.formulas = run.formulas;
  return log;
}
const t0 = Date.now(); const results = [];
for (let i = 0; i < RUNS; i++) { const tr = Date.now(); results.push(playRun(1000 + i * 7919)); if (VERBOSE) process.stdout.write(`[${((Date.now() - tr) / 1000).toFixed(1)}s] `); if (VERBOSE) { const r = results[i]; console.log(`run ${i}: night ${r.nights} won=${r.won} cats=${r.cats.join(',')} formulas=${JSON.stringify(r.formulas)}`); } }
const nightsHist = {}; for (const r of results) nightsHist[r.nights] = (nightsHist[r.nights] || 0) + 1;
console.log(`\n${RUNS} runs · stake ${STAKE} · ${LAUNCHER} · field ${W}x${H} · ${((Date.now() - t0) / 1000).toFixed(1)}s · ${evals} chain evals`);
console.log('final night reached (9 = won):', JSON.stringify(nightsHist));
console.log('win rate:', (results.filter((r) => r.won).length / RUNS * 100).toFixed(0) + '%', ' avg acts cleared:', (results.reduce((s, r) => s + r.actReached, 0) / RUNS).toFixed(1));
// per-night launch stats
const byNight = {}; for (const r of results) for (const l of r.launches) { const k = l.night; (byNight[k] = byNight[k] || []).push(l); }
for (const n of Object.keys(byNight).sort((a, b) => a - b)) { const L = byNight[n]; const sc = L.map((l) => l.score).sort((a, b) => a - b); const ch = L.reduce((s, l) => s + l.chain, 0) / L.length; const gf = L.filter((l) => l.gf).length / L.length; console.log(`night ${n}: launches ${L.length}  median score ${sc[Math.floor(sc.length / 2)].toLocaleString()}  p90 ${sc[Math.floor(sc.length * 0.9)].toLocaleString()}  avg chain ${ch.toFixed(1)}  GF ${(gf * 100).toFixed(0)}%`); }
const ratios = {}; for (const r of results) for (const a of r.actRatios) { const k = `${a.night}.${a.act}`; (ratios[k] = ratios[k] || []).push(a.r); }
console.log('act clear overkill (median score/target):', Object.keys(ratios).sort((a, b) => parseFloat(a) - parseFloat(b)).map((k) => { const v = ratios[k].sort((a, b) => a - b); return `${k}:${v[Math.floor(v.length / 2)].toFixed(2)}`; }).join(' '));
