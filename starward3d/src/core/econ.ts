// The economy (ported from Starward). Aggregates research modifiers, computes production, storage and energy from
// every building on every world, and integrates the stockpile over time. Collectors hold their own output
// until tapped. Later systems (satellites, colonies, star colonies, aliens) plug in through the hook lists below,
// so this file never has to import them.
import { BUILDINGS, holdHours } from '../data/buildings';
import { TECH } from '../data/research';
import { RES, COLLECTED } from '../data/resources';
import { State, Item } from './state';
import { curve } from './util';
export interface Mods { mult: Record<string, number>; gen: number; buildTime: number; researchTime: number; cap: number; crews: number; slots: number; costs: number; flags: Set<string>; }
export interface ColStats { house: number; jobs: number; grow: number; staff: number; pop: number; ls: number; }
export interface Rates { prod: Record<string, number>; cap: Record<string, number>; gen: number; draw: number; eff: number; speed: number; m: Mods; col: Record<string, ColStats>; item: Record<string, { r: string; rate: number; hold: number }>; collect: Record<string, number>; }
export interface BStats { prod: Record<string, number>; cap: Record<string, number>; gen: number; draw: number; speed: number; house: number; jobs: number; grow: number; }
// extension points for later parts
export const modHooks: ((s: State, m: Mods) => void)[] = [];
export const rateHooks: ((s: State, R: Rates) => void)[] = [];
export const boostHooks: ((s: State) => Record<string, number>)[] = []; // per-building multipliers (robot operators)
// per-building modifiers from where it stands (deposits under its footprint): output, energy and housing multipliers
export const itemHooks: ((s: State, base: string, it: Item) => { prod?: number; gen?: number; house?: number } | null)[] = [];
export const baseHooks: { mult: (s: State, base: string, r: string) => number; solar: (s: State, base: string) => number; house: (s: State, base: string) => number; grow: (s: State, base: string) => number; life: (s: State, base: string) => number } = { mult: () => 1, solar: () => 1, house: () => 0, grow: () => 0, life: () => 1 };
export function mods(s: State): Mods {
  const m: Mods = { mult: {}, gen: 0, buildTime: 0, researchTime: 0, cap: 0, crews: 0, slots: 0, costs: 0, flags: new Set() };
  for (const id in s.tech) { const t = TECH[id]; if (!t) continue; const e = t.effect || {};
    for (const r in e.mult || {}) m.mult[r] = (m.mult[r] || 0) + e.mult![r];
    for (const k of ['gen', 'buildTime', 'researchTime', 'cap', 'crews', 'slots', 'costs'] as const) if (e[k]) m[k] += e[k]!;
    if (e.flag) m.flags.add(e.flag); }
  for (const f in s.flags) if (s.flags[f]) m.flags.add(f);
  for (const h of modHooks) h(s, m);
  return m;
}
const val = (c: [number, number] | undefined, L: number) => (c ? curve(c[0], c[1], L) : 0);
// what one building contributes at level L (before the energy factor)
export function bStats(id: string, L: number, m: Mods): BStats {
  const d = BUILDINGS[id]; const o: BStats = { prod: {}, cap: {}, gen: 0, draw: 0, speed: 0, house: 0, jobs: 0, grow: 0 }; if (!d || L <= 0) return o;
  o.house = val(d.house, L); o.jobs = Math.round(val(d.jobs, L)); o.grow = val(d.grow, L);
  for (const r in d.prod || {}) o.prod[r] = val(d.prod![r], L) * (1 + (m.mult[r] || 0));
  for (const r in d.cap || {}) o.cap[r] = val(d.cap![r], L) * (1 + m.cap);
  o.gen = val(d.gen, L) * (1 + m.gen); o.draw = val(d.draw, L); o.speed = d.speed ? d.speed * L : 0;
  return o;
}
export const lvlOf = (s: State, base: string, b: string) => { const B = s.bases[base]; if (!B) return 0; let best = 0; for (const it of B.items) if (it.b === b) best = Math.max(best, it.lvl); return best; };
export const hqLevel = (s: State, base = 'earth') => lvlOf(s, base, base === 'earth' ? 'hq' : 'hub');
export const collectsOf = (b: string) => { const d = BUILDINGS[b]; if (!d || !d.collect) return null; return Object.keys(d.prod || {}).find((r) => COLLECTED.includes(r)) || null; };
// the full economic picture
export function rates(s: State, m = mods(s)): Rates {
  const R: Rates = { prod: {}, cap: {}, gen: 0, draw: 0, eff: 1, speed: 0, m, col: {}, item: {}, collect: {} };
  for (const r in RES) { R.prod[r] = 0; R.cap[r] = RES[r].cap ? 0 : Infinity; }
  const items: [Item, string, BStats, number][] = []; const boost: Record<string, number> = {}; for (const h of boostHooks) { const m = h(s); for (const k in m) boost[k] = (boost[k] || 0) + m[k]; }
  for (const bid in s.bases) {
    const B = s.bases[bid]; const colony = bid !== 'earth'; const sts: [Item, BStats][] = []; let house = 0, jobs = 0, grow = 0;
    for (const it of B.items) { if (it.lvl <= 0) continue; const st = bStats(it.b, it.lvl, m); for (const h of itemHooks) { const q = h(s, bid, it); if (!q) continue; if (q.prod) for (const r in st.prod) st.prod[r] *= q.prod; if (q.gen) st.gen *= q.gen; if (q.house) st.house *= q.house; } const k = 1 + (boost[it.id] || 0); if (k > 1) { for (const r in st.prod) st.prod[r] *= k; for (const r in st.cap) st.cap[r] *= k; st.gen *= k; st.speed *= k; } sts.push([it, st]); house += st.house; jobs += st.jobs; grow += st.grow; }
    let staff = 1, ls = 1; if (colony) { house *= 1 + baseHooks.house(s, bid); grow += baseHooks.grow(s, bid); const pop = B.pop || 0; staff = jobs > 0 ? Math.min(1, pop / jobs) : 1; ls = baseHooks.life(s, bid); if (ls < 1) grow = 0; R.col[bid] = { house: Math.round(house), jobs, grow, staff, pop, ls }; }
    const work = (0.3 + 0.7 * staff) * (0.4 + 0.6 * ls); // colonies need hands, water and air: output scales with both
    for (const [it, st] of sts) { const k = it.b === 'hub' ? 1 : work; items.push([it, bid, st, k]);
      for (const r in st.cap) R.cap[r] += st.cap[r]; R.gen += it.b === 'lsolar' ? st.gen * baseHooks.solar(s, bid) : st.gen; R.draw += st.draw; R.speed += st.speed * k; }
  }
  for (const h of rateHooks) h(s, R);
  R.eff = R.draw <= 0 ? 1 : Math.min(1, R.gen / R.draw);
  const pf = 0.25 + 0.75 * R.eff; // a power shortage throttles everything (command buildings keep a trickle)
  for (const r in R.prod) R.prod[r] *= pf;
  for (const [it, bid, st, k] of items) { const cr = collectsOf(it.b);
    for (const r in st.prod) { const v = st.prod[r] * k * baseHooks.mult(s, bid, r) * pf;
      if (r === cr) { R.item[it.id] = { r, rate: v, hold: v * holdHours(it.lvl) }; R.collect[r] = (R.collect[r] || 0) + v; } else R.prod[r] += v; } }
  return R;
}
// advance the stockpile and the collectors by dt seconds at fixed rates (never pushes above cap; never removes overflow)
// production that full storage cannot hold (the funding pools of the endgame catch it)
export const spillHooks: ((s: State, r: string, n: number) => void)[] = [];
export function accrue(s: State, R: Rates, dt: number) {
  if (dt <= 0) return;
  for (const bid in R.col) { const c = R.col[bid], B = s.bases[bid]; if (!B) continue; const pop = B.pop || 0; if (pop < c.house) B.pop = Math.min(c.house, pop + (c.grow * dt) / 3600); }
  for (const r in R.prod) { const add = (R.prod[r] * dt) / 3600; if (!add) continue; const cur = s.res[r] || 0; const cap = R.cap[r]; if (add > 0 && cur >= cap) { if (spillHooks.length) for (const h of spillHooks) h(s, r, add); continue; } const lim = Math.max(cap, cur); const next = Math.max(0, Math.min(lim, cur + add)); if (add > 0 && cur + add > lim && spillHooks.length) for (const h of spillHooks) h(s, r, cur + add - lim); s.res[r] = next; }
  for (const bid in s.bases) for (const it of s.bases[bid].items) { const x = R.item[it.id]; if (!x) continue; it.held = Math.min(x.hold, (it.held || 0) + (x.rate * dt) / 3600); }
}
export const canPay = (s: State, cost: Record<string, number>) => Object.entries(cost).every(([r, n]) => (s.res[r] || 0) >= n);
export const pay = (s: State, cost: Record<string, number>) => { for (const [r, n] of Object.entries(cost)) s.res[r] = (s.res[r] || 0) - n; };
export const give = (s: State, gift: Record<string, number>) => { for (const [r, n] of Object.entries(gift)) s.res[r] = (s.res[r] || 0) + n; };
// ---------------- the Kardashev scale ----------------
// Sagan: K = (log10 W − 6) / 10. Humanity's grid at the start (~1.8e13 W, K 0.73) grows with every watt the
// civilisation generates; later parts add the Dyson swarm and the stars through kHooks (watts).
export const kHooks: ((s: State, R: Rates) => number)[] = [];
export function watts(s: State, R: Rates) { let w = 1.8e13 * Math.pow(1 + R.gen / 25, 0.8); for (const h of kHooks) w += h(s, R); return w; }
export const kardashev = (s: State, R: Rates) => (Math.log10(watts(s, R)) - 6) / 10;
export const K_MILESTONES = [0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0];
export const kTitle = (k: number) => (k >= 3 ? 'Type III: a galactic civilisation' : k >= 2 ? 'Type II: master of a star' : k >= 1 ? 'Type I: master of a planet' : 'Type 0: a planet-bound species');
