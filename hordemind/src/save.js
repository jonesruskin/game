// HORDEMIND profile + economy.
import { Platform } from './platform.js';
import { HEROES, HERO, QUEENS, BUILDINGS, buildCost, PALETTES, QUEEN_SKINS, SPLATS, QUESTS, ACHIEVEMENTS, LOGIN } from './data.js';
import { dayNumber, seeded } from './util.js';

const KEY = 'hordemind_profile_v1';
const fresh = () => ({
  v: 1, created: Date.now(), tutorialDone: false, gold: 0, gems: 0, ichor: 0,
  stars: {}, hive: { brood: 0, vats: 0, forge: 0, chitin: 0, royal: 0, pit: 0 }, queen: 'vyx',
  owned: { natural: true, q_default: true, goo: true }, equip: { palette: 'natural', queenSkin: 'q_default', splat: 'goo' },
  stats: { hunts: 0, wins: 0, spawned: 0, damage: 0, evos: 0, abilities: 0, maxSwarm: 0, fastest: 9999, stars: 0, fastestInv: 0 },
  quests: { day: 0, list: [], prog: {}, claimed: {} }, login: { last: 0, streak: 0, pending: false }, ach: {},
  daily: { day: 0, best: null, played: false }, settings: { sfx: 0.7, music: 0.35, lowFx: false },
  lastMidgame: 0, sinceAd: 0, giftDay: 0,
});

export const Save = {
  p: null,
  load() {
    let raw = null; try { raw = Platform.storage().get(KEY) || localStorage.getItem(KEY); } catch (e) {}
    let p = null; try { p = raw ? JSON.parse(raw) : null; } catch (e) {}
    const f = fresh(); if (!p) p = f; else { for (const k in f) if (p[k] === undefined) p[k] = f[k]; for (const k in f.stats) if (p.stats[k] === undefined) p.stats[k] = f.stats[k]; for (const k in f.hive) if (p.hive[k] === undefined) p.hive[k] = 0; }
    this.p = p; this.rollDay(); this.save(); return p;
  },
  save() { try { Platform.storage().set(KEY, JSON.stringify(this.p)); } catch (e) {} },
  rollDay() {
    const p = this.p, d = dayNumber();
    if (p.quests.day !== d) { const r = seeded(d * 4241); const pool = QUESTS.slice(); const list = []; while (list.length < 3) { const q = pool.splice(Math.floor(r() * pool.length), 1)[0]; const n = Math.round(q.n[0] + r() * (q.n[1] - q.n[0])); list.push({ ...q, n, text: q.text.replace('{n}', n), key: d + q.id }); } p.quests = { day: d, list, prog: {}, claimed: {} }; }
    if (p.login.last !== d) { p.login.streak = p.login.last === d - 1 ? (p.login.streak % 7) + 1 : 1; p.login.last = d; p.login.pending = true; }
    if (p.daily.day !== d) p.daily = { day: d, best: null, played: false };
  },
  totalStars() { let n = 0; for (const k in this.p.stars) n += this.p.stars[k].filter(Boolean).length; return n; },
  heroUnlocked(h) { return this.totalStars() >= h.stars; },
  queenUnlocked(q) { return this.totalStars() >= q.unlock.stars; },
  grant(r, lines = []) {
    const p = this.p; if (!r) return lines;
    if (r.gold) { p.gold += r.gold; lines.push({ icon: '🪙', text: `+${r.gold} Gold` }); }
    if (r.gems) { p.gems += r.gems; lines.push({ icon: '💎', text: `+${r.gems} Gems` }); }
    if (r.ichor) { p.ichor += r.ichor; lines.push({ icon: '🧪', text: `+${r.ichor} Ichor` }); }
    if (r.palette) { p.owned[r.palette] = true; lines.push({ icon: '🎨', text: 'New swarm palette!' }); }
    return lines;
  },
  upgrade(id) { const b = BUILDINGS.find((x) => x.id === id); const lvl = this.p.hive[id]; if (lvl >= b.max) return false; const c = buildCost(lvl); if (this.p.ichor < c) return false; this.p.ichor -= c; this.p.hive[id]++; this.save(); return true; },
  buy(item, cur) { const pr = item.price; if (!pr || pr[cur] === undefined || this.p.owned[item.id] || this.p[cur] < pr[cur]) return false; this.p[cur] -= pr[cur]; this.p.owned[item.id] = true; this.save(); return true; },
  questState() { const q = this.p.quests; return q.list.map((x) => { const v = q.prog[x.key] ?? (x.min ? 9999 : 0); const done = x.min ? v <= x.n : v >= x.n; return { ...x, v, done, claimed: !!q.claimed[x.key], pct: x.min ? (done ? 1 : 0) : Math.min(1, v / x.n) }; }); },
  claimQuest(key) { const q = this.p.quests; const s = this.questState().find((x) => x.key === key); if (!s || !s.done || s.claimed) return []; q.claimed[key] = true; const l = this.grant({ gold: s.gold, ichor: s.ichor }); this.save(); return l; },
  claimLogin() { const p = this.p; if (!p.login.pending) return []; p.login.pending = false; const l = this.grant(LOGIN[(p.login.streak - 1) % 7]); this.save(); return l; },
  checkAch() { const p = this.p, out = []; for (const a of ACHIEVEMENTS) if (!p.ach[a.id] && (p.stats[a.stat] || 0) >= a.n) { p.ach[a.id] = true; out.push({ a, lines: this.grant(a.r) }); } return out; },
  dailySetup(d = dayNumber()) {
    const r = seeded(d * 9973); const h = HEROES[Math.floor(r() * HEROES.length)]; const q = QUEENS[Math.floor(r() * QUEENS.length)];
    const muts = [{ name: 'Glass Swarm', desc: 'Minions: -40% health, +50% damage', minionHp: 0.6, minionDmg: 1.5 }, { name: 'Gold Rush', desc: 'Biomass orbs are worth double', harvest: 2 }, { name: 'Swift Hero', desc: 'The hero moves 25% faster', heroSpeed: 1.25 }, { name: 'Colossus', desc: 'The hero has +40% health', heroHp: 1.4 }, { name: 'Iron Brood', desc: 'Minions: +60% health, -20% damage', minionHp: 1.6, minionDmg: 0.8 }];
    return { day: d, hero: h.id, queen: q.id, mut: muts[Math.floor(r() * muts.length)], diff: 1 };
  },
  applyHunt(res) {
    const p = this.p, s = p.stats, out = { lines: [], newStar: false };
    s.hunts++; s.spawned += res.spawned; s.damage += res.damage; s.evos += res.evos; s.abilities += res.abilities; s.maxSwarm = Math.max(s.maxSwarm, res.maxSwarm);
    if (res.won) { s.wins++; s.fastest = Math.min(s.fastest, res.time); if (res.time < 90) s.fastestInv = 1; }
    if (res.won && !res.daily) { const st = p.stars[res.hero] || (p.stars[res.hero] = [false, false, false]); if (!st[res.diff]) { st[res.diff] = true; out.newStar = true; } }
    s.stars = this.totalStars();
    const ichor = Math.round(res.damage / 120) + (res.won ? 40 + res.diff * 40 : 0) + (out.newStar ? 60 : 0);
    const gold = 15 + Math.round(res.damage / 400) + (res.won ? 35 : 0);
    out.ichor = ichor; out.gold = gold; p.ichor += ichor; p.gold += gold;
    if (res.daily) { p.daily.played = true; if (res.won && (p.daily.best === null || res.time < p.daily.best)) { p.daily.best = res.time; out.dailyPB = true; } }
    const q = p.quests; const add = (stat, v, min) => { for (const x of q.list) if (x.stat === stat) q.prog[x.key] = min ? Math.min(q.prog[x.key] ?? 9999, v) : (q.prog[x.key] || 0) + v; };
    add('hunts', 1); add('wins', res.won ? 1 : 0); add('spawned', res.spawned); add('damage', res.damage); add('evos', res.evos); add('abilities', res.abilities); if (res.won) add('fastest', res.time, true);
    out.questsReady = this.questState().filter((x) => x.done && !x.claimed).length;
    out.ach = this.checkAch(); p.sinceAd++;
    this.save(); return out;
  },
};
export { HERO, BUILDINGS, buildCost, PALETTES, QUEEN_SKINS, SPLATS };
