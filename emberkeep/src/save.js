// EMBERKEEP profile, economy, offline earnings, real-time lab, chests.
import { Platform } from './platform.js';
import { WISPS, WISP_IDS, START_DECK, WORKSHOP, wsCost, LAB, labTime, labCost, TIERS, CARD_MAX, cardShards, cardCoins, QUESTS, ACHIEVEMENTS, LOGIN, COSMETICS } from './data.js';
import { labVal } from './stats.js';
import { dayNumber, seeded, pick } from './util.js';

const KEY = 'emberkeep_profile_v1';
const fresh = () => ({
  v: 1, created: Date.now(), tutorialDone: false, coins: 0, gems: 0,
  cards: Object.fromEntries(START_DECK.map((t) => [t, 1])), shards: {}, deck: START_DECK.slice(),
  workshop: {}, lab: { levels: {}, active: [] }, tier: 0, best: TIERS.map(() => 0), maxTier: 0, bestRate: 0, bestRunCoins: 0,
  chests: [], stats: { runs: 0, waves: 0, kills: 0, merges: 0, bosses: 0, lvl5: 0, maxLvl: 1, powers: 0, wsBuys: 0, bestWave: 0, wispsOwned: 5, maxTier: 1, playTime: 0 },
  quests: { day: 0, list: [], prog: {}, claimed: {} }, login: { last: 0, streak: 0, pending: false }, ach: {},
  owned: { e_classic: true, t_forest: true }, equip: { skin: 'e_classic', theme: 't_forest' },
  settings: { sfx: 0.7, music: 0.35, lowFx: false }, autoPref: { summon: true, merge: true, power: false }, speedPref: 1,
  lastSeen: Date.now(), freeChestDay: 0, lastMidgame: 0, sinceAd: 0,
});
export const Save = {
  p: null, offline: null,
  load() {
    let raw = null; try { raw = Platform.storage().get(KEY) || localStorage.getItem(KEY); } catch (e) {}
    let p = null; try { p = raw ? JSON.parse(raw) : null; } catch (e) {}
    const f = fresh(); if (!p) p = f; else { for (const k in f) if (p[k] === undefined) p[k] = f[k]; for (const k in f.stats) if (p.stats[k] === undefined) p.stats[k] = f.stats[k]; while (p.best.length < TIERS.length) p.best.push(0); }
    this.p = p; this.rollDay();
    // offline earnings: the Keep holds the night while you're away
    const away = (Date.now() - (p.lastSeen || Date.now())) / 1000;
    if (away > 120 && p.bestRate > 0) { const cap = labVal(p, 'offlineCap') * 3600; const secs = Math.min(away, cap); const coins = Math.round(p.bestRate * labVal(p, 'offlineRate') * secs); if (coins > 0) this.offline = { coins, secs, away, capped: away > cap }; }
    this.tickLab(); p.lastSeen = Date.now(); this.save(); return p;
  },
  save() { try { this.p.lastSeen = Date.now(); Platform.storage().set(KEY, JSON.stringify(this.p)); } catch (e) {} },
  rollDay() {
    const p = this.p, d = dayNumber();
    if (p.quests.day !== d) { const r = seeded(d * 6151); const pool = QUESTS.slice(); const list = []; while (list.length < 3) { const q = pool.splice(Math.floor(r() * pool.length), 1)[0]; const n = Math.round(q.n[0] + r() * (q.n[1] - q.n[0])); list.push({ ...q, n, text: q.text.replace('{n}', n.toLocaleString()), key: d + q.id }); } p.quests = { day: d, list, prog: {}, claimed: {} }; }
    if (p.login.last !== d) { p.login.streak = p.login.last === d - 1 ? (p.login.streak % 7) + 1 : 1; p.login.last = d; p.login.pending = true; }
  },
  // coin rewards scale with progress so quests/logins stay meaningful at every stage
  scaledCoins(mult) { return Math.round(mult * Math.max(150, this.p.bestRunCoins * 0.3)); },
  grant(r, lines = []) {
    const p = this.p; if (!r) return lines;
    if (r.coins) { const c = r.raw ? r.coins : this.scaledCoins(r.coins); p.coins += c; lines.push({ icon: '🪙', text: `+${fmt(c)} coins` }); }
    if (r.gems) { p.gems += r.gems; lines.push({ icon: '💎', text: `+${r.gems} gems` }); }
    if (r.chest) { for (let i = 0; i < r.chest; i++) p.chests.push({ tier: p.maxTier, wave: Math.max(10, p.stats.bestWave) }); lines.push({ icon: '🎁', text: `+${r.chest} Ember Chest` }); }
    if (r.skin) { p.owned[r.skin] = true; lines.push({ icon: '🔥', text: 'Exclusive Ember skin unlocked!' }); }
    return lines;
  },
  // ---------------------------------------------------------------- workshop
  wsLevel(id) { return this.p.workshop[id] || 0; },
  buyWs(id) { const w = WORKSHOP.find((x) => x.id === id); const l = this.wsLevel(id); if (l >= w.max) return false; const c = wsCost(w, l); if (this.p.coins < c) return false; this.p.coins -= c; this.p.workshop[id] = l + 1; this.p.stats.wsBuys++; this.questAdd('wsBuys', 1); this.save(); return true; },
  // ---------------------------------------------------------------- lab (real time — keeps running while the game is closed)
  labSlots() { return labVal(this.p, 'slots'); },
  tickLab() { const p = this.p, now = Date.now(), done = []; p.lab.active = p.lab.active.filter((a) => { if (a.end <= now) { p.lab.levels[a.id] = (p.lab.levels[a.id] || 0) + 1; done.push(a.id); return false; } return true; }); if (done.length) this.save(); return done; },
  startLab(id) {
    const p = this.p; const r = LAB.find((x) => x.id === id); const l = p.lab.levels[id] || 0;
    if (l >= r.max || p.lab.active.some((a) => a.id === id) || p.lab.active.length >= this.labSlots()) return false;
    const c = labCost(r, l); if (p.coins < c) return false; p.coins -= c; p.lab.active.push({ id, end: Date.now() + labTime(r, l) * 1000, dur: labTime(r, l) * 1000 }); this.save(); return true;
  },
  // ---------------------------------------------------------------- wisps / chests
  openChest() {
    const p = this.p; const ch = p.chests.shift(); if (!ch) return null;
    const n = Math.round((6 + ch.tier * 4 + ch.wave / 8) * labVal(p, 'chestLuck'));
    const out = {}; const fresh = [];
    for (let i = 0; i < n; i++) {
      const locked = WISP_IDS.filter((t) => !p.cards[t]); let t;
      if (locked.length && Math.random() < 0.06) { t = pick(locked); p.cards[t] = 1; p.stats.wispsOwned = Object.keys(p.cards).length; fresh.push(t); }
      else t = pick(Object.keys(p.cards));
      out[t] = (out[t] || 0) + 1; p.shards[t] = (p.shards[t] || 0) + 1;
    }
    this.checkAch(); this.save(); return { shards: out, total: n, fresh };
  },
  canLevelCard(t) { const l = this.p.cards[t]; return l && l < CARD_MAX && (this.p.shards[t] || 0) >= cardShards(l) && this.p.coins >= cardCoins(l); },
  levelCard(t) { if (!this.canLevelCard(t)) return false; const l = this.p.cards[t]; this.p.shards[t] -= cardShards(l); this.p.coins -= cardCoins(l); this.p.cards[t] = l + 1; this.save(); return true; },
  setDeck(t, slot) { const d = this.p.deck; if (!this.p.cards[t]) return; const i = d.indexOf(t); if (i >= 0) [d[i], d[slot]] = [d[slot], d[i]]; else d[slot] = t; this.save(); },
  // ---------------------------------------------------------------- quests & achievements
  questAdd(stat, v) { const q = this.p.quests; for (const x of q.list) if (x.stat === stat) q.prog[x.key] = (q.prog[x.key] || 0) + v; },
  questState() { const q = this.p.quests; return q.list.map((x) => { const v = q.prog[x.key] || 0; return { ...x, v, done: v >= x.n, claimed: !!q.claimed[x.key], pct: Math.min(1, v / x.n) }; }); },
  claimQuest(key) { const s = this.questState().find((x) => x.key === key); if (!s || !s.done || s.claimed) return []; this.p.quests.claimed[key] = true; const l = this.grant({ coins: s.coins, gems: s.gems }); this.save(); return l; },
  claimLogin() { const p = this.p; if (!p.login.pending) return []; p.login.pending = false; const l = this.grant(LOGIN[(p.login.streak - 1) % 7]); this.save(); return l; },
  checkAch() { const p = this.p, out = []; for (const a of ACHIEVEMENTS) if (!p.ach[a.id] && (p.stats[a.stat] || 0) >= a.n) { p.ach[a.id] = true; out.push({ a, lines: this.grant({ gems: a.gems, skin: a.skin }) }); } return out; },
  // ---------------------------------------------------------------- run results
  applyRun(res) {
    const p = this.p, s = p.stats; const out = { newBest: false, unlocked: null };
    s.runs++; s.waves += res.wave - 1; s.kills += res.kills; s.merges += res.merges; s.bosses += res.bosses; s.lvl5 += res.lvl5; s.maxLvl = Math.max(s.maxLvl, res.maxLvl); s.powers += res.powers; s.playTime += res.time;
    if (res.wave > p.best[res.tier]) { p.best[res.tier] = res.wave; out.newBest = true; }
    s.bestWave = Math.max(s.bestWave, res.wave);
    p.coins += res.coins; p.bestRunCoins = Math.max(p.bestRunCoins, res.coins);
    if (res.time > 90) p.bestRate = Math.max(p.bestRate, res.coins / res.time);
    for (let i = 0; i < res.chests; i++) p.chests.push({ tier: res.tier, wave: res.wave });
    const nt = res.tier + 1; if (nt < TIERS.length && nt > p.maxTier && p.best[res.tier] >= TIERS[nt].unlock) { p.maxTier = nt; s.maxTier = nt + 1; out.unlocked = TIERS[nt]; }
    this.questAdd('waves', res.wave - 1); this.questAdd('merges', res.merges); this.questAdd('bosses', res.bosses); this.questAdd('kills', res.kills); this.questAdd('lvl5', res.lvl5); this.questAdd('powers', res.powers);
    out.ach = this.checkAch(); out.questsReady = this.questState().filter((x) => x.done && !x.claimed).length; p.sinceAd++;
    this.save(); return out;
  },
  buyCosmetic(id) { const c = COSMETICS.find((x) => x.id === id); if (!c || !c.price || this.p.owned[id] || this.p.gems < c.price.gems) return false; this.p.gems -= c.price.gems; this.p.owned[id] = true; this.save(); return true; },
};
export function fmt(n) { n = Math.floor(n); if (n < 10000) return n.toLocaleString('en-US'); const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']; let i = -1; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; } return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : n.toFixed(0)) + u[i]; }
export function fmtTime(sec) { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`; }
