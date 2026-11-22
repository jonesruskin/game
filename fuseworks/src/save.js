// Profile: meta stats, achievements → unlocks, Stardust (cosmetic currency, earned only by playing),
// cosmetics, settings, the saved run and the Daily Show record.
import { Platform } from './platform.js';
import { ACHIEVEMENTS, COSM, STAKES } from './content.js';
import { dayNumber } from './util.js';

const KEY = 'fuseworks_profile_v1';
const fresh = () => ({
  v: 1, created: Date.now(), tutorialDone: false, dust: 0,
  stats: { runs: 0, wins: 0, acts: 0, finales: 0, longest: 0, bestLaunch: 0, bestNight: 1, bosses: 0, maxMoney: 0, maxCats: 0, maxFormula: 1, dailies: 0, maxStakeWin: -1, shells: 0, launches: 0 },
  ach: {}, unlocked: [], seen: {}, owned: { theme_harbor: true, trail_classic: true, burst_classic: true }, equip: { theme: 'theme_harbor', trail: 'trail_classic', burst: 'burst_classic' },
  settings: { sfx: 0.8, music: 0.55, lowFx: false, reaches: true, fast: false }, run: null, daily: { day: 0, best: 0, done: false, night: 0 }, lastLauncher: 'classic', lastStake: 0, adDust: { day: 0, n: 0 },
});
export const Save = {
  p: null,
  load() {
    let raw = null; try { raw = Platform.storage().get(KEY); } catch (e) {} if (!raw) try { raw = localStorage.getItem(KEY); } catch (e) {}
    let p = null; try { p = raw ? JSON.parse(raw) : null; } catch (e) {}
    const f = fresh(); if (!p || typeof p !== 'object') p = f; else { for (const k in f) if (p[k] === undefined) p[k] = f[k]; for (const k in f.stats) if (p.stats[k] === undefined) p.stats[k] = f.stats[k]; for (const k in f.settings) if (p.settings[k] === undefined) p.settings[k] = f.settings[k]; }
    this.p = p; return p;
  },
  save() { try { const s = JSON.stringify(this.p); Platform.storage().set(KEY, s); if (Platform.name !== 'local') try { localStorage.setItem(KEY, s); } catch (e) {} } catch (e) {} },
  unlockedSet() { return new Set(this.p.unlocked); },
  stakesAvailable() { const fromAch = this.p.unlocked.includes('stake:1') ? 1 : 0; return Math.min(STAKES.length - 1, Math.max(fromAch, this.p.stats.maxStakeWin + 1)); },
  // live stat bumps during a run (so achievements can pop mid-run)
  bump(run) {
    const s = this.p.stats, r = run.stats;
    s.longest = Math.max(s.longest, r.longest); s.bestLaunch = Math.max(s.bestLaunch, r.bestLaunch); s.maxMoney = Math.max(s.maxMoney, r.maxMoney); s.maxCats = Math.max(s.maxCats, r.maxCats); s.maxFormula = Math.max(s.maxFormula, r.maxFormula); s.bestNight = Math.max(s.bestNight, r.bestNight);
    return this.checkAch(run);
  },
  addRunTotals(run) { const s = this.p.stats, r = run.stats; s.acts += r.acts; s.finales += r.finales; s.bosses += r.bosses; s.shells += r.shells; s.launches += r.launches; },
  checkAch(run) {
    const p = this.p, s = { ...p.stats }; if (run) { const r = run.stats; s.acts = p.stats.acts + r.acts; s.finales = p.stats.finales + r.finales; s.bosses = p.stats.bosses + r.bosses; }
    const out = [];
    for (const a of ACHIEVEMENTS) if (!p.ach[a.id] && a.test(s)) { p.ach[a.id] = Date.now(); p.dust += a.dust || 0; for (const u of a.unlock || []) if (!p.unlocked.includes(u)) p.unlocked.push(u); for (const u of a.unlock || []) if (u.startsWith('cosm:')) p.owned[u.slice(5)] = true; out.push(a); }
    if (out.length) this.save(); return out;
  },
  // end of run: totals, stardust, wins
  finishRun(run, { won, daily }) {
    const p = this.p; this.bump(run); this.addRunTotals(run); p.stats.runs++;
    if (won && !run.winCounted) { run.winCounted = true; p.stats.wins++; p.stats.maxStakeWin = Math.max(p.stats.maxStakeWin, run.stake); }
    if (daily) { const d = dayNumber(); const score = (run.night - 1) * 3 + run.actIdx; p.stats.dailies++; if (p.daily.day !== d) p.daily = { day: d, best: 0, done: false, night: 0 }; p.daily.done = true; if (score >= p.daily.best) { p.daily.best = score; p.daily.night = run.night; p.daily.bestLaunch = run.stats.bestLaunch; } }
    const dust = Math.max(0, this.runDust(run, won || run.won, daily) - (run.dustPaid || 0));
    p.dust += dust; p.run = null; const ach = this.checkAch(null); this.save(); return { dust, ach };
  },
  runDust(run, won, daily) { return Math.round(5 + run.stats.acts * 3 + run.stats.bosses * 6 + run.stats.finales * 2 + (won ? 60 : 0) + (daily ? 15 : 0)); },
  recordWin(run) { if (run.winCounted) return { ach: [], dust: 0 }; run.winCounted = true; const p = this.p; p.stats.wins++; p.stats.maxStakeWin = Math.max(p.stats.maxStakeWin, run.stake); const dust = this.runDust(run, true, run.daily); run.dustPaid = dust; p.dust += dust; this.bump(run); const ach = this.checkAch(run); this.save(); return { ach, dust }; },
  seeCat(id) { if (!this.p.seen[id]) { this.p.seen[id] = 1; } },
  buyCosmetic(id) { const c = COSM[id]; if (!c || this.p.owned[id] || c.achievement || this.p.dust < c.price) return false; this.p.dust -= c.price; this.p.owned[id] = true; this.save(); return true; },
  equip(id) { const c = COSM[id]; if (!c || !this.p.owned[id]) return false; this.p.equip[c.kind] = id; this.save(); return true; },
  adDustLeft() { const d = dayNumber(); if (this.p.adDust.day !== d) this.p.adDust = { day: d, n: 0 }; return 3 - this.p.adDust.n; },
  grantAdDust(n) { this.adDustLeft(); this.p.adDust.n++; this.p.dust += n; this.save(); },
  reset() { const s = this.p.settings; this.p = fresh(); this.p.settings = s; this.save(); },
};
