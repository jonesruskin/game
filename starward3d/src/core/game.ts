// Game rules (ported from Starward, placed on a Clash-style grid): construction and upgrades on real-time timers,
// construction drones, research, collecting, dark-matter speed-ups, objectives, and exact offline catch-up
// (production is integrated piecewise between timer completions, so a reactor finishing at 3 a.m. powers the
// mines from 3 a.m.). Later systems register job completers and objective checks through the hooks below.
import { BUILDINGS, allowedLevel, allowedCount, crewsFromHq, cmdReqs, capClamp, unlockHq, areaSide, GRID, kindOf } from '../data/buildings';
import { TECH, techCost, techTime } from '../data/research';
import { allSteps, Step } from '../data/objectives';
import { mods, rates, accrue, canPay, pay, give, hqLevel, lvlOf, collectsOf, Mods, Rates } from './econ';
import { State, Item, Job, uid } from './state';
import { curve, round2, timeCurve } from './util';
export interface Check { ok: boolean; why?: string; cost?: Record<string, number>; time?: number; crews?: boolean; hq?: boolean; tech?: string; reqs?: [string, number][]; max?: boolean; [k: string]: any; }
export interface Note { kind: string; t?: number; [k: string]: any; }
export const completers: Record<string, (s: State, j: Job) => Note | null> = {};
export const stepChecks: Record<string, (s: State, st: Step, R: Rates) => boolean> = {};
export const events: Note[] = []; // UI-facing notifications (drained by the app)
export const builtHooks: ((s: State, b: string) => void)[] = []; // a building finished for the first time
export const buildChecks: ((s: State, base: string, b: string) => Check | null)[] = []; // extra conditions (robots dig the tunnels)
// ---------------- costs and timers ----------------
export const costOf = (id: string, L: number, m: Mods) => { const d = BUILDINGS[id]; const out: Record<string, number> = {}; const h = d.cat === 'decor' ? Math.max(1, (d.req && d.req.hq) || 1) : unlockHq(id, L); for (const r in d.cost) out[r] = capClamp(round2(curve(d.cost[r][0], d.cost[r][1], L) * (1 - m.costs)), h, r); return out; };
export const timeOf = (id: string, L: number, m: Mods) => Math.max(2, Math.round(timeCurve(BUILDINGS[id].time, L) * (1 - m.buildTime)));
export const researchTimeOf = (t: string, R: Rates) => Math.max(5, Math.round((techTime(TECH[t]) * (1 - R.m.researchTime)) / (1 + R.speed)));
export const crewsTotal = (s: State, m = mods(s)) => crewsFromHq(hqLevel(s)) + m.crews;
export const crewsBusy = (s: State) => s.jobs.filter((j) => j.kind === 'build').length;
export const slotsTotal = (s: State, m = mods(s)) => 1 + m.slots;
export const slotsBusy = (s: State) => s.jobs.filter((j) => j.kind === 'research').length;
export const jobOf = (s: State, itemId: string) => s.jobs.find((j) => j.kind === 'build' && j.item === itemId);
export const itemOf = (s: State, base: string, id: string) => s.bases[base]?.items.find((i) => i.id === id);
export const countOf = (s: State, base: string, b: string) => s.bases[base].items.filter((i) => i.b === b).length;
// ---------------- the grid ----------------
export const dims = (b: string, r = 0): [number, number] => { const [w, d] = BUILDINGS[b].fp; return r % 2 ? [d, w] : [w, d]; };
export function area(s: State, base: string) { const side = areaSide(base, hqLevel(s, base) || 1); const lo = Math.floor((GRID - side) / 2); return { lo, hi: lo + side, side }; }
export function fits(s: State, base: string, b: string, x: number, z: number, r: number, ignore?: string): Check {
  const [w, d] = dims(b, r); const A = area(s, base);
  if (x < A.lo || z < A.lo || x + w > A.hi || z + d > A.hi) return { ok: false, why: 'Outside the base (raise the command level to expand it)' };
  for (const it of s.bases[base].items) { if (it.id === ignore) continue; const [iw, id] = dims(it.b, it.r); if (x < it.x + iw && x + w > it.x && z < it.z + id && z + d > it.z) return { ok: false, why: 'Something is in the way' }; }
  return { ok: true };
}
// the first free spot nearest the centre (used to suggest a placement)
export function freeSpot(s: State, base: string, b: string, r = 0): [number, number] | null {
  const A = area(s, base), [w, d] = dims(b, r), c = GRID / 2; let best: [number, number] | null = null, bd = 1e9;
  for (let z = A.lo; z + d <= A.hi; z++) for (let x = A.lo; x + w <= A.hi; x++) { const dd = Math.hypot(x + w / 2 - c, z + d / 2 - c); if (dd < bd && fits(s, base, b, x, z, r).ok) { bd = dd; best = [x, z]; } }
  return best;
}
// ---------------- building ----------------
export function canBuild(s: State, base: string, b: string): Check {
  const d = BUILDINGS[b]; const m = mods(s); const hq = hqLevel(s, base);
  if (!d || !s.bases[base]) return { ok: false, why: 'Unknown' }; if (!d.bases.includes(kindOf(base))) return { ok: false, why: 'Cannot be built on this world' };
  if (d.req && d.req.tech && !s.tech[d.req.tech]) return { ok: false, why: `Research ${TECH[d.req.tech].name}`, tech: d.req.tech };
  if (d.req && d.req.hq && hq < d.req.hq) return { ok: false, why: `Mission Control level ${d.req.hq}`, hq: true };
  for (const f of buildChecks) { const c = f(s, base, b); if (c) return c; }
  const lim = allowedCount(d, hq); if (countOf(s, base, b) >= lim) return { ok: false, why: lim ? 'Limit reached for this command level' : `Command level ${(d.count || []).findIndex((c) => c > 0) + 1}`, hq: true };
  if (!d.instant && crewsBusy(s) >= crewsTotal(s, m)) return { ok: false, why: 'All construction drones are busy', crews: true };
  const cost = costOf(b, 1, m); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost };
  return { ok: true, cost, time: timeOf(b, 1, m) };
}
export function startBuild(s: State, base: string, b: string, x: number, z: number, r: number, t = Date.now()): Check {
  const c = canBuild(s, base, b); if (!c.ok) return c; const f = fits(s, base, b, x, z, r); if (!f.ok) return f; pay(s, c.cost!);
  const it: Item = { id: uid(s, 'i'), b, x, z, r, lvl: 0, held: 0 }; s.bases[base].items.push(it);
  if (BUILDINGS[b].instant) { it.lvl = 1; s.stats.built++; for (const h of builtHooks) h(s, b); return { ...c, item: it }; } // walls go up at once
  s.jobs.push({ id: uid(s), kind: 'build', base, item: it.id, b, from: 0, to: 1, start: t, end: t + c.time! * 1000 }); return { ...c, item: it };
}
export const reqsMissing = (s: State, base: string, b: string, L: number) => cmdReqs(b, L, base).filter(([rb, n]) => !s.bases[base].items.some((i) => i.b === rb && i.lvl >= n));
export const levelCap = (s: State, base: string, b: string) => { const d = BUILDINGS[b]; if (d.command && base !== 'earth') return Math.max(1, Math.min(d.max, hqLevel(s, 'earth') - 7)); return allowedLevel(d, hqLevel(s, base)); };
export function canUpgrade(s: State, base: string, id: string): Check {
  const it = itemOf(s, base, id); if (!it) return { ok: false, why: 'Gone' }; const d = BUILDINGS[it.b]; const m = mods(s); const hq = hqLevel(s, base);
  if (jobOf(s, id)) return { ok: false, why: 'Under construction' };
  if (it.lvl >= d.max) return { ok: false, why: 'Maximum level', max: true };
  if (d.command && base !== 'earth' && it.lvl >= levelCap(s, base, it.b)) return { ok: false, why: `Mission Control level ${it.lvl + 8} on Earth`, hq: true };
  const miss = reqsMissing(s, base, it.b, it.lvl + 1); if (miss.length) return { ok: false, why: `First upgrade ${miss.map(([b, n]) => BUILDINGS[b].name + ' to level ' + n).join(', ')}`, reqs: miss, hq: true };
  if (it.lvl >= allowedLevel(d, hq)) return { ok: false, why: `Upgrade ${base === 'earth' ? 'Mission Control' : 'the Colony Hub'} first`, hq: true };
  if (!d.instant && crewsBusy(s) >= crewsTotal(s, m)) return { ok: false, why: 'All construction drones are busy', crews: true };
  const cost = costOf(it.b, it.lvl + 1, m); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost };
  return { ok: true, cost, time: timeOf(it.b, it.lvl + 1, m) };
}
// every wall of one level, in one go (as many as you can afford)
export function upgradeAllOf(s: State, base: string, b: string, lvl: number) { let n = 0; for (const it of s.bases[base].items.filter((i) => i.b === b && i.lvl === lvl)) { if (!startUpgrade(s, base, it.id).ok) break; n++; } return n; }
export function startUpgrade(s: State, base: string, id: string, t = Date.now()): Check {
  const c = canUpgrade(s, base, id); if (!c.ok) return c; pay(s, c.cost!); const it = itemOf(s, base, id)!;
  if (BUILDINGS[it.b].instant) { it.lvl++; s.stats.upgrades++; s.stats.upgradesStarted = (s.stats.upgradesStarted || 0) + 1; return c; }
  s.jobs.push({ id: uid(s), kind: 'build', base, item: id, b: it.b, from: it.lvl, to: it.lvl + 1, start: t, end: t + c.time! * 1000 }); s.stats.upgradesStarted = (s.stats.upgradesStarted || 0) + 1; return c;
}
export function moveItem(s: State, base: string, id: string, x: number, z: number, r: number): Check { const it = itemOf(s, base, id); if (!it) return { ok: false }; const f = fits(s, base, it.b, x, z, r, id); if (!f.ok) return f; it.x = x; it.z = z; it.r = r; return { ok: true }; }
export const canDemolish = (s: State, base: string, id: string) => { const it = itemOf(s, base, id); return !!it && !BUILDINGS[it.b].command && it.b !== 'launch' && !jobOf(s, id); };
export function demolish(s: State, base: string, id: string) { if (!canDemolish(s, base, id)) return false; s.bases[base].items = s.bases[base].items.filter((i) => i.id !== id); return true; }
// tap a collector: move what it holds into the stockpile (what does not fit stays inside)
export function collect(s: State, base: string, id: string, R = rates(s)) {
  const it = itemOf(s, base, id); if (!it) return null; const r = collectsOf(it.b); if (!r) return null; const held = Math.floor(it.held || 0); if (held < 1) return null;
  const room = Math.max(0, Math.floor(R.cap[r] - (s.res[r] || 0))); const n = Math.min(held, room); if (n <= 0) return { r, n: 0, full: true };
  it.held = (it.held || 0) - n; s.res[r] = (s.res[r] || 0) + n; s.stats.collected += n; s.stats.collects = (s.stats.collects || 0) + 1; return { r, n, full: n < held };
}
// ---------------- research ----------------
const builtAnywhere = (s: State, b: string) => Object.values(s.bases).some((B) => B.items.some((i) => i.b === b && i.lvl > 0));
export function canResearch(s: State, id: string): Check {
  const t = TECH[id]; if (!t) return { ok: false, why: 'Unknown' }; if (s.tech[id]) return { ok: false, why: 'Researched', done: true };
  if (s.jobs.some((j) => j.kind === 'research' && j.tech === id)) return { ok: false, why: 'In progress', busy: true };
  const miss = t.req.filter((r) => !s.tech[r]); if (miss.length) return { ok: false, why: 'Requires ' + miss.map((r) => TECH[r].name).join(', '), locked: true };
  if (t.hq && hqLevel(s) < t.hq) return { ok: false, why: `Mission Control ${t.hq}`, locked: true, hq: true };
  if (!builtAnywhere(s, 'research')) return { ok: false, why: 'Build a Research Center', locked: true };
  const m = mods(s); if (slotsBusy(s) >= slotsTotal(s, m)) return { ok: false, why: 'Research slot busy', slots: true };
  const cost = techCost(t); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost };
  return { ok: true, cost, time: researchTimeOf(id, rates(s, m)) };
}
export function startResearch(s: State, id: string, t = Date.now()): Check { const c = canResearch(s, id); if (!c.ok) return c; pay(s, c.cost!); s.jobs.push({ id: uid(s), kind: 'research', tech: id, start: t, end: t + c.time! * 1000 }); return c; }
// ---------------- time ----------------
function complete(s: State, j: Job): Note | null {
  s.jobs = s.jobs.filter((x) => x !== j);
  if (j.kind === 'build') { const it = itemOf(s, j.base!, j.item!); if (!it) return null; it.lvl = j.to!; if (j.from === 0) { s.stats.built++; for (const h of builtHooks) h(s, j.b!); } else s.stats.upgrades++; return { kind: 'build', b: j.b, lvl: j.to, base: j.base, item: j.item, first: j.from === 0 }; }
  if (j.kind === 'research') { s.tech[j.tech!] = 1; s.stats.researched++; return { kind: 'research', tech: j.tech }; }
  const f = completers[j.kind]; return f ? f(s, j) : null;
}
// advance the world to time t (handles offline gaps exactly); returns notifications in order
export function advance(s: State, t = Date.now()): Note[] {
  const out: Note[] = []; let guard = 0;
  while (guard++ < 10000) {
    const next = s.jobs.reduce<Job | null>((a, j) => (j.end <= t && (!a || j.end < a.end) ? j : a), null);
    const R = rates(s); let upTo = next ? Math.max(s.last, next.end) : t;
    const growing = Object.values(R.col).some((c) => c.pop < c.house && c.grow > 0); const partial = growing && upTo - s.last > 3600000; if (partial) upTo = s.last + 3600000;
    accrue(s, R, (upTo - s.last) / 1000); s.last = upTo;
    if (partial) continue; if (!next) break; const n = complete(s, next); if (n) { n.t = next.end; out.push(n); }
  }
  s.last = t; return out;
}
// dark-matter price of skipping the remaining time (finishing is free in the last minute)
export const dmCost = (sec: number) => (sec <= 60 ? 0 : Math.ceil(1.2 * Math.pow(sec / 60, 0.72)));
export function speedup(s: State, jobId: string, t = Date.now()) { const j = s.jobs.find((x) => x.id === jobId); if (!j) return { ok: false, why: 'Gone' }; const c = dmCost((j.end - t) / 1000);
  if ((s.res.dm || 0) < c) return { ok: false, why: 'Not enough dark matter', need: c }; s.res.dm -= c; s.stats.dmSpent += c; j.end = t; return { ok: true, spent: c }; }
export function skip(s: State, jobId: string, sec: number, t = Date.now()) { const j = s.jobs.find((x) => x.id === jobId); if (!j) return false; j.end = Math.max(t, j.end - sec * 1000); return true; }
export function cancel(s: State, jobId: string) {
  const j = s.jobs.find((x) => x.id === jobId); if (!j) return false; const m = mods(s);
  if (j.kind === 'build') { const cost = costOf(j.b!, j.to!, m); give(s, Object.fromEntries(Object.entries(cost).map(([r, n]) => [r, Math.floor(n * 0.5)]))); if (j.from === 0) s.bases[j.base!].items = s.bases[j.base!].items.filter((i) => i.id !== j.item); }
  else if (j.kind === 'research') { const cost = techCost(TECH[j.tech!]); give(s, Object.fromEntries(Object.entries(cost).map(([r, n]) => [r, Math.floor(n * 0.5)]))); }
  else return false;
  s.jobs = s.jobs.filter((x) => x !== j); return true;
}
// ---------------- objectives ----------------
const STEPS = allSteps();
export const currentStep = (s: State) => STEPS[s.obj.i] || null;
export const stepIndex = (s: State) => s.obj.i;
export const stepCount = () => STEPS.length;
export function stepDone(s: State, st: Step | null, R = rates(s)): boolean {
  if (!st) return false;
  switch (st.kind) {
    case 'hq': return hqLevel(s) >= st.lvl;
    case 'build': return Object.values(s.bases).some((B) => B.items.some((i) => i.b === st.b && i.lvl >= st.lvl));
    case 'buildOn': return !!s.bases[st.base] && s.bases[st.base].items.some((i) => i.b === st.b && i.lvl >= (st.lvl || 1));
    case 'tech': return !!s.tech[st.id2];
    case 'rate': return R.prod[st.res] + (R.collect[st.res] || 0) >= st.n;
    case 'energy': return R.gen - R.draw >= st.n;
    case 'flag': return !!s.flags[st.flag];
    case 'hubLvl': return !!s.bases[st.base || 'moon'] && hqLevel(s, st.base || 'moon') >= st.lvl;
    case 'colony': return !!s.bases[st.body];
    case 'pop': return !!s.bases[st.body] && (s.bases[st.body].pop || 0) >= st.n;
  }
  const f = stepChecks[st.kind]; return f ? f(s, st, R) : false;
}
export function claimStep(s: State) { const st = currentStep(s); if (!st || !stepDone(s, st)) return null; give(s, st.reward); s.obj.claimed[st.id] = Date.now(); s.obj.i++; return st; }
export { rates, mods, hqLevel, lvlOf };
