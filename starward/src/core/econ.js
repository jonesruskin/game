// STARWARD: the economy. Aggregates research modifiers, computes production / storage / energy from every
// building in every base, and integrates the stockpile over time.
import { BUILDINGS } from '../data/buildings.js';
import { TECH } from '../data/research.js';
import { RES } from '../data/resources.js';
import { SATS, MODULES } from '../data/space.js';
import { BODIES, SITES, TERRA } from '../data/solar.js';
import { curve } from '../util.js';

export function mods(s) {
  const m = { mult: {}, gen: 0, buildTime: 0, researchTime: 0, cap: 0, crews: 0, slots: 0, costs: 0, flags: new Set() };
  for (const id in s.tech) { const t = TECH[id]; if (!t) continue; const e = t.effect || {};
    for (const r in e.mult || {}) m.mult[r] = (m.mult[r] || 0) + e.mult[r];
    for (const k of ['gen', 'buildTime', 'researchTime', 'cap', 'crews', 'slots', 'costs']) if (e[k]) m[k] += e[k];
    if (e.flag) m.flags.add(e.flag); }
  for (const f in s.flags) if (s.flags[f]) m.flags.add(f);
  // satellites that multiply production (observation, weather)
  for (const x of (s.space && s.space.sats) || []) { const d = SATS[x.type]; for (const r in d.mult || {}) m.mult[r] = (m.mult[r] || 0) + d.mult[r] * x.lvl; }
  return m;
}
const val = (c, L) => (c ? curve(c[0], c[1], L) : 0);
// what one building contributes at level L (before the energy factor)
export function bStats(id, L, m) {
  const d = BUILDINGS[id]; const o = { prod: {}, cap: {}, gen: 0, draw: 0, speed: 0, house: 0, jobs: 0, grow: 0 }; if (!d || L <= 0) return o;
  o.house = val(d.house, L); o.jobs = Math.round(val(d.jobs, L)); o.grow = val(d.grow, L);
  for (const r in d.prod || {}) o.prod[r] = val(d.prod[r], L) * (1 + (m.mult[r] || 0));
  for (const r in d.cap || {}) o.cap[r] = val(d.cap[r], L) * (1 + m.cap);
  o.gen = val(d.gen, L) * (1 + m.gen); o.draw = val(d.draw, L); o.speed = d.speed ? d.speed * L : 0;
  return o;
}
export const lvlOf = (s, base, b) => { let best = 0; if (!s.bases[base]) return 0; for (const lot of Object.values(s.bases[base].lots)) if (lot.b === b) best = Math.max(best, lot.lvl); return best; };
export const hqLevel = (s, base = 'earth') => lvlOf(s, base, base === 'earth' ? 'hq' : 'hub');
// colonists drift in from Earth on their own (per Colony Hub level): plenty to the Moon, a trickle to Titan
const DRIFT = { moon: 1.0, mars: 0.3, ceres: 0.2, titan: 0.15 };
const terraHouse = (s, b) => { const T = TERRA[b]; if (!T) return 0; const n = (s.solar && s.solar.terra[b]) || 0; let h = 0; for (let k = 0; k < n; k++) h += T.stages[k].house; return h; };
// full economic picture
export function rates(s, m = mods(s)) {
  const R = { prod: {}, cap: {}, gen: 0, draw: 0, eff: 1, speed: 0, m, col: {} };
  for (const r in RES) { R.prod[r] = 0; R.cap[r] = RES[r].cap ? 0 : Infinity; }
  for (const bid in s.bases) {
    const B = s.bases[bid]; const body = BODIES[B.body] || {}; const colony = bid !== 'earth'; const sts = [];
    let house = 0, jobs = 0, grow = 0;
    for (const lot of Object.values(B.lots)) { if (!lot.b || lot.lvl <= 0) continue; const st = bStats(lot.b, lot.lvl, m); sts.push([lot.b, st]); house += st.house; jobs += st.jobs; grow += st.grow; }
    // colonies need hands: production scales with how many jobs are filled
    let staff = 1; if (colony) { house *= 1 + terraHouse(s, bid); grow += (DRIFT[bid] || 0.1) * lvlOf(s, bid, 'hub'); const pop = B.pop || 0; staff = jobs > 0 ? Math.min(1, pop / jobs) : 1; R.col[bid] = { house: Math.round(house), jobs, grow, staff, pop }; }
    const work = 0.3 + 0.7 * staff;
    for (const [b, st] of sts) {
      const k = b === 'hub' ? 1 : work; for (const r in st.prod) R.prod[r] += st.prod[r] * k * ((body.mult && body.mult[r]) || 1);
      for (const r in st.cap) R.cap[r] += st.cap[r]; R.gen += b === 'lsolar' && body.solar ? st.gen * body.solar : st.gen; R.draw += st.draw; R.speed += st.speed * k;
    }
  }
  // outposts, mining claims and gas-giant scoops across the Solar System
  const SS = s.solar; if (SS) { const claimK = 1 + lvlOf(s, 'ceres', 'beltControl') * 0.05;
    for (const id in SS.sites) { const L = SS.sites[id]; const d = SITES[id]; if (!L || !d) continue; const k = BODIES[id].presence === 'claim' ? claimK : 1; for (const r in d.prod || {}) R.prod[r] += val(d.prod[r], L) * k * (1 + (m.mult[r] || 0)); if (d.gen) R.gen += val(d.gen, L) * (1 + m.gen); } }
  // orbital assets: satellites and station modules
  const SP = s.space; if (SP) {
    for (const x of SP.sats) { const d = SATS[x.type]; for (const r in d.prod || {}) R.prod[r] += val(d.prod[r], x.lvl) * (1 + (m.mult[r] || 0)); if (d.gen) R.gen += val(d.gen, x.lvl) * (1 + m.gen); }
    for (const id in SP.modules) { const L = SP.modules[id]; const d = MODULES[id]; if (!L || !d) continue; for (const r in d.prod || {}) R.prod[r] += val(d.prod[r], L) * (1 + (m.mult[r] || 0)); for (const r in d.cap || {}) R.cap[r] += val(d.cap[r], L) * (1 + m.cap); if (d.gen) R.gen += val(d.gen, L) * (1 + m.gen); if (d.speed) R.speed += d.speed * L; }
  }
  R.eff = R.draw <= 0 ? 1 : Math.min(1, R.gen / R.draw);
  // production is throttled by power shortage (command buildings keep a trickle)
  for (const r in R.prod) R.prod[r] *= 0.25 + 0.75 * R.eff;
  return R;
}
// advance the stockpile by dt seconds at fixed rates (never pushes above cap; never removes overflow)
export function accrue(s, R, dt) {
  if (dt <= 0) return;
  for (const bid in R.col || {}) { const c = R.col[bid], B = s.bases[bid]; if (!B) continue; const pop = B.pop || 0; if (pop < c.house) B.pop = Math.min(c.house, pop + (c.grow * dt) / 3600); } for (const r in R.prod) { const add = (R.prod[r] * dt) / 3600; if (!add) continue; const cur = s.res[r] || 0; const cap = R.cap[r];
    if (cur >= cap) continue; s.res[r] = Math.min(cap, cur + add); }
}
export const canPay = (s, cost) => Object.entries(cost).every(([r, n]) => (s.res[r] || 0) >= n);
export const pay = (s, cost) => { for (const [r, n] of Object.entries(cost)) s.res[r] = (s.res[r] || 0) - n; };
export const give = (s, gift) => { for (const [r, n] of Object.entries(gift)) s.res[r] = (s.res[r] || 0) + n; };
