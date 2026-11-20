// DRIFTLINE profile + economy.
import { Platform } from './platform.js';
import { CARS, CUPS, QUESTS, ACHIEVEMENTS, LOGIN, ALL_ITEMS, leagueOf } from './data.js';
import { dayNumber, seeded } from './util.js';

const KEY = 'driftline_profile_v1';
const fresh = () => ({
  v: 1, name: 'Racer' + Math.floor(1000 + Math.random() * 9000), tutorialDone: false, gold: 0, gems: 0, trophies: 0, trophiesMax: 0,
  car: 'sparrow', stars: {}, ghosts: {}, best: {}, owned: { p_red: true, d_none: true, g_none: true, s_white: true },
  equip: { paint: 'p_red', decal: 'd_none', glow: 'g_none', smoke: 's_white' },
  stats: { races: 0, wins: 0, driftTime: 0, boost3: 0, overtakes: 0, cleanLaps: 0, dailyRuns: 0, golds: 0, stars: 0, trophiesMax: 0 },
  quests: { day: 0, list: [], prog: {}, claimed: {} }, login: { last: 0, streak: 0, pending: false }, ach: {}, daily: { day: 0, best: null, medal: 0 },
  settings: { sfx: 0.7, music: 0.3, lowFx: false }, lastMidgame: 0, sinceAd: 0, giftDay: 0,
});
export const Save = {
  p: null,
  load() {
    let raw = null; try { raw = Platform.storage().get(KEY) || localStorage.getItem(KEY); } catch (e) {}
    let p = null; try { p = raw ? JSON.parse(raw) : null; } catch (e) {}
    const f = fresh(); if (!p) p = f; else { for (const k in f) if (p[k] === undefined) p[k] = f[k]; for (const k in f.stats) if (p.stats[k] === undefined) p.stats[k] = f.stats[k]; }
    // ghosts can get big: keep only the 12 most recent tracks (cloud save limit friendly)
    const gk = Object.keys(p.ghosts); if (gk.length > 12) for (const k of gk.slice(0, gk.length - 12)) delete p.ghosts[k];
    this.p = p; this.rollDay(); this.save(); return p;
  },
  save() { try { Platform.storage().set(KEY, JSON.stringify(this.p)); } catch (e) {} },
  rollDay() {
    const p = this.p, d = dayNumber();
    if (p.quests.day !== d) { const r = seeded(d * 3301); const pool = QUESTS.slice(); const list = []; while (list.length < 3) { const q = pool.splice(Math.floor(r() * pool.length), 1)[0]; const n = Math.round(q.n[0] + r() * (q.n[1] - q.n[0])); list.push({ ...q, n, text: q.text.replace('{n}', n), key: d + q.id }); } p.quests = { day: d, list, prog: {}, claimed: {} }; }
    if (p.login.last !== d) { p.login.streak = p.login.last === d - 1 ? (p.login.streak % 7) + 1 : 1; p.login.last = d; p.login.pending = true; }
    if (p.daily.day !== d) p.daily = { day: d, best: null, medal: 0 };
  },
  totalStars() { let n = 0; for (const k in this.p.stars) n += this.p.stars[k]; return n; },
  carUnlocked(c) { return this.totalStars() >= c.stars; },
  cupUnlocked(c) { return this.totalStars() >= c.stars; },
  item(id) { return ALL_ITEMS.find((x) => x.id === id); },
  grant(r, lines = []) { const p = this.p; if (!r) return lines; if (r.gold) { p.gold += r.gold; lines.push({ icon: '🪙', text: `+${r.gold} Gold` }); } if (r.gems) { p.gems += r.gems; lines.push({ icon: '💎', text: `+${r.gems} Gems` }); } if (r.paint) { p.owned[r.paint] = true; lines.push({ icon: '🎨', text: 'Exclusive paint unlocked!' }); } return lines; },
  buy(it, cur) { const pr = it.price; if (!pr || pr[cur] === undefined || this.p.owned[it.id] || this.p[cur] < pr[cur]) return false; this.p[cur] -= pr[cur]; this.p.owned[it.id] = true; this.save(); return true; },
  questState() { const q = this.p.quests; return q.list.map((x) => { const v = q.prog[x.key] || 0; return { ...x, v, done: v >= x.n, claimed: !!q.claimed[x.key], pct: Math.min(1, v / x.n) }; }); },
  claimQuest(key) { const s = this.questState().find((x) => x.key === key); if (!s || !s.done || s.claimed) return []; this.p.quests.claimed[key] = true; const l = this.grant({ gold: s.gold }); this.save(); return l; },
  claimLogin() { const p = this.p; if (!p.login.pending) return []; p.login.pending = false; const l = this.grant(LOGIN[(p.login.streak - 1) % 7]); this.save(); return l; },
  checkAch() { const p = this.p, out = []; for (const a of ACHIEVEMENTS) if (!p.ach[a.id] && (p.stats[a.stat] || 0) >= a.n) { p.ach[a.id] = true; out.push({ a, lines: this.grant(a.r) }); } return out; },
  saveGhost(key, lapTime, rec) { const p = this.p; if (!p.best[key] || lapTime < p.best[key]) { p.best[key] = +lapTime.toFixed(3); p.ghosts[key] = rec.slice(); return true; } return false; },
  applyRace(res) {
    const p = this.p, s = p.stats, out = { lines: [] };
    s.races++; if (res.place === 1) s.wins++; s.driftTime += res.driftTime; s.boost3 += res.boost3; s.overtakes += res.overtakes; s.cleanLaps += res.cleanLaps;
    if (res.mode === 'career') { const k = res.trackKey; const st = res.place === 1 ? 3 : res.place === 2 ? 2 : res.place === 3 ? 1 : 0; if (st > (p.stars[k] || 0)) { out.newStars = st - (p.stars[k] || 0); p.stars[k] = st; } }
    if (res.mode === 'quick') { const table = [14, 9, 5, 1, -3, -6]; const before = p.trophies; p.trophies = Math.max(0, p.trophies + table[res.place - 1] - (res.place > 3 ? Math.floor(p.trophies / 300) : 0)); out.trophyDelta = p.trophies - before; p.trophiesMax = Math.max(p.trophiesMax, p.trophies); s.trophiesMax = p.trophiesMax; }
    if (res.mode === 'daily') { s.dailyRuns++; if (p.daily.best === null || res.time < p.daily.best) { p.daily.best = +res.time.toFixed(2); out.dailyPB = true; } if (res.medal > p.daily.medal) { if (res.medal === 3) s.golds++; p.daily.medal = res.medal; } }
    s.stars = this.totalStars();
    const gold = Math.round((res.mode === 'daily' ? 30 : [60, 40, 28, 18, 12, 8][res.place - 1] || 8) + res.overtakes * 2 + res.boost3 * 3 + res.driftTime * 0.5);
    out.gold = gold; p.gold += gold;
    const q = p.quests; const add = (stat, v) => { for (const x of q.list) if (x.stat === stat) q.prog[x.key] = (q.prog[x.key] || 0) + v; };
    add('races', 1); add('wins', res.place === 1 ? 1 : 0); add('driftTime', Math.round(res.driftTime)); add('boost3', res.boost3); add('overtakes', res.overtakes); add('cleanLaps', res.cleanLaps); add('dailyRuns', res.mode === 'daily' ? 1 : 0);
    out.questsReady = this.questState().filter((x) => x.done && !x.claimed).length; out.ach = this.checkAch(); p.sinceAd++;
    this.save(); return out;
  },
};
export { leagueOf };
