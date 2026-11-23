// GLINT: the profile. Money, reputation, shop tier, upgrades, inventory (roughs + cut gems), display cases,
// commissions, apprentices, market state, collection (codex), hall of fame, stats, achievements, settings.
import { Platform } from './platform.js';
import { ACH, TIERS } from './economy.js';

const KEY = 'glint_profile_v1';
export const fresh = () => ({
  v: 1, created: Date.now(), name: 'Glint & Co.', money: 40, rep: 0, tier: 0, up: {},
  roughs: [], gems: [], cases: [null, null, null], markup: 1.25,
  orders: [], orderT: 60, staff: [], dealer: { stock: [], next: 0 }, exped: null, auction: null,
  codex: {}, hall: [], recipes: {}, sales: [],
  stats: { cut: 0, ideal: 0, fl: 0, perfect3: 0, best: 0, maxCt: 0, maxRare: 0, sold: 0, orders: 0, haggleWins: 0, dailies: 0, earned: 0, cracked: 0, playS: 0 },
  ach: {}, settings: { sfx: 0.8, music: 0.5, quality: 'auto', hints: true },
  daily: { day: 0, done: false, best: 0 }, lastSeen: Date.now(), tut: 0, bench: null, adGift: { day: 0, n: 0 },
});
export const Save = {
  p: null,
  load() {
    let raw = null; try { raw = Platform.storage().get(KEY); } catch (e) {} if (!raw) try { raw = localStorage.getItem(KEY); } catch (e) {}
    let p = null; try { p = raw ? JSON.parse(raw) : null; } catch (e) {}
    const f = fresh(); if (!p || typeof p !== 'object' || !p.v) p = f; else { for (const k in f) if (p[k] === undefined) p[k] = f[k]; for (const k in f.stats) if (p.stats[k] === undefined) p.stats[k] = f.stats[k]; for (const k in f.settings) if (p.settings[k] === undefined) p.settings[k] = f.settings[k]; }
    // keep the case array in step with the tier
    const n = TIERS[p.tier].cases; while (p.cases.length < n) p.cases.push(null);
    this.p = p; return p;
  },
  save() { if (!this.p) return; this.p.lastSeen = Date.now(); try { const s = JSON.stringify(this.p); Platform.storage().set(KEY, s); if (Platform.name !== 'local') try { localStorage.setItem(KEY, s); } catch (e) {} } catch (e) {} },
  reset() { this.p = fresh(); this.save(); },
  // returns newly earned achievements
  checkAch() { const out = []; for (const a of ACH) if (!this.p.ach[a.id] && a.test(this.p)) { this.p.ach[a.id] = Date.now(); this.p.money += a.reward; out.push(a); } return out; },
};
