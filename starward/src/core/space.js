// STARWARD: spaceflight rules. Rockets are assembled in the Vehicle Assembly, missions fly from the
// Launch Complex (one per pad slot), outcomes are rolled at liftoff (no save-scumming) and revealed on arrival.
import { ROCKETS, ROCKET_ORDER, SATS, MODULES, MISSIONS, ORBITS } from '../data/space.js';
import { lvlOf, canPay, pay, give, rates, mods } from './econ.js';
import { uid } from './state.js';
import { BODIES, PROBE_CLASS } from '../data/solar.js';
import { sol, windowOf, liftCut } from './solar.js';
import { curve, round2, clamp } from '../util.js';

export const sp = (s) => (s.space || (s.space = { rockets: {}, sats: [], modules: {}, flights: 0, fails: 0, done: {} }));
export const vabLevel = (s) => lvlOf(s, 'earth', 'vab');
export const padLevel = (s) => lvlOf(s, 'earth', 'launch');
export const launchSlots = (s) => (padLevel(s) ? 1 + (padLevel(s) >= 10 ? 1 : 0) + (padLevel(s) >= 18 ? 1 : 0) : 0);
export const launchesBusy = (s) => s.jobs.filter((j) => j.kind === 'mission').length;
export const rocketBusy = (s) => s.jobs.find((j) => j.kind === 'rocket');
export const maxClass = (s) => Math.min(9, Math.ceil(padLevel(s) / 2));
export const slotsFor = (s, orbit, m = mods(s)) => ORBITS[orbit].base + (m.flags.has('orbitalOps') ? 1 : 0) + (orbit === 'leo' && m.flags.has('constellations') ? 2 : 0) + (orbit === 'lagrange' && m.flags.has('deepSpaceOps') ? 1 : 0) + (orbit === 'lagrange' && s.tech.deepSpace ? 1 : 0);
export const satsIn = (s, orbit) => sp(s).sats.filter((x) => SATS[x.type].orbit === orbit);
// reliability bonuses (tracking station, satellites, academy for crews, docking hub)
export function reliability(s, rocketId, def) {
  const r = ROCKETS[rocketId]; let p = r.rel + Math.min(0.06, lvlOf(s, 'earth', 'tracking') * 0.004);
  for (const x of sp(s).sats) if (SATS[x.type].rel) p += SATS[x.type].rel * x.lvl;
  if (def && def.crewed) { p += lvlOf(s, 'earth', 'academy') * 0.01 + (sp(s).modules.dock || 0) * MODULES.dock.rel; }
  if (s.tech.reusable) p += 0.02; return clamp(p, 0.05, 0.99);
}
export const flightCut = (s) => clamp(sp(s).sats.reduce((a, x) => a + (SATS[x.type].flightCut || 0) * x.lvl, 0), 0, 0.5);
export const fuelCut = (s) => clamp((sp(s).modules.depot || 0) * MODULES.depot.fuelCut + lvlOf(s, 'moon', 'massDriver') * 0.03, 0, 0.6);
// ---------------- rockets ----------------
export function canBuildRocket(s, id) {
  const r = ROCKETS[id]; if (!r) return { ok: false, why: 'Unknown' };
  const miss = r.req.filter((t) => !s.tech[t]); if (miss.length) return { ok: false, why: 'Research required', locked: true };
  if (!vabLevel(s) && r.vab > 0) return { ok: false, why: 'Build the Vehicle Assembly', locked: true };
  if (vabLevel(s) < r.vab) return { ok: false, why: `Vehicle Assembly level ${r.vab}`, locked: true };
  if (!padLevel(s)) return { ok: false, why: 'Build the Launch Complex', locked: true };
  if (rocketBusy(s)) return { ok: false, why: 'Assembly line busy', busy: true };
  const cost = rocketCost(s, id); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost };
  return { ok: true, cost, time: rocketTime(s, id) };
}
export const rocketCost = (s, id) => { const c = { ...ROCKETS[id].cost }; const k2 = (s.tech.reusable ? 0.75 : 1) * (1 - liftCut(s)); if (k2 < 1) for (const k in c) c[k] = round2(c[k] * k2); return c; };
export const rocketTime = (s, id) => Math.max(10, Math.round(ROCKETS[id].time / (1 + vabLevel(s) * 0.06)));
export function startRocket(s, id, t = Date.now()) { const c = canBuildRocket(s, id); if (!c.ok) return c; pay(s, c.cost); s.jobs.push({ id: uid(s), kind: 'rocket', rocket: id, start: t, end: t + c.time * 1000 }); return c; }
// smallest owned rocket that can fly a mission of class cls
export function pickRocket(s, cls) { for (const id of ROCKET_ORDER) if (ROCKETS[id].cls >= cls && (sp(s).rockets[id] || 0) > 0) return id; return null; }
// ---------------- missions ----------------
// payload: { mission } | { sat: type, idx (upgrade) } | { module: type } | { probe: body }
export function missionSpec(s, payload) {
  if (payload.probe) { const b = BODIES[payload.probe]; const w = windowOf(payload.probe); const lc = 1 - liftCut(s);
    return { name: `Survey probe to ${b.name}`, cls: PROBE_CLASS[b.zone], cost: { credits: round2((80000 + b.travel * 25000) * lc), fuel: round2(b.travel * 6000 * w.fuel * (1 - fuelCut(s)) * lc) }, flight: Math.round(b.travel * 3600 * 1.6 * w.time * (1 - flightCut(s))), req: ['planetaryProbes'], def: { probe: true } }; }
  if (payload.sat) { const d = SATS[payload.sat]; const cur = payload.idx !== undefined ? sp(s).sats[payload.idx] : null; const L = cur ? cur.lvl + 1 : 1; const cost = {}; for (const k in d.cost) cost[k] = round2(curve(d.cost[k][0], d.cost[k][1], L)); if (cost.fuel) cost.fuel = round2(cost.fuel * (1 - fuelCut(s)));
    return { name: `${cur ? 'Upgrade' : 'Launch'} ${d.name}${L > 1 ? ' Mk ' + L : ''}`, cls: d.cls, cost, flight: Math.round(curve(d.flight[0], d.flight[1], L) * (1 - flightCut(s))), req: [d.req], lvl: L, def: d }; }
  if (payload.module) { const d = MODULES[payload.module]; const L = (sp(s).modules[payload.module] || 0) + 1; const cost = {}; for (const k in d.cost) cost[k] = round2(curve(d.cost[k][0], d.cost[k][1], L)); if (cost.fuel) cost.fuel = round2(cost.fuel * (1 - fuelCut(s)));
    return { name: `${L > 1 ? 'Expand' : 'Launch'} ${d.name}${L > 1 ? ' (level ' + L + ')' : ''}`, cls: d.cls, cost, flight: Math.round(curve(d.flight[0], d.flight[1], L) * (1 - flightCut(s))), req: [d.req], lvl: L, def: d, needs: d.needs }; }
  const d = MISSIONS[payload.mission]; const cost = { fuel: round2(d.fuel * (1 - fuelCut(s))), credits: d.credits }; if (d.metal) cost.metal = d.metal;
  return { name: d.name, cls: d.cls, cost, flight: Math.round(d.flight * (1 - flightCut(s))), req: d.req, def: d };
}
export function canLaunch(s, payload) {
  const ms = missionSpec(s, payload); const d = ms.def;
  if (!padLevel(s)) return { ok: false, why: 'Build the Launch Complex', locked: true, ms };
  const miss = ms.req.filter((t) => t && !s.tech[t]); if (miss.length) return { ok: false, why: 'Research required', locked: true, ms };
  if (payload.mission) { if ((d.flags || []).some((f) => !s.flags[f])) return { ok: false, why: 'Complete earlier missions first', locked: true, ms }; if (d.kind !== 'repeat' && s.flags[d.flag]) return { ok: false, why: 'Already accomplished', done: true, ms };
    if (d.needs && d.needs.academy && lvlOf(s, 'earth', 'academy') < d.needs.academy) return { ok: false, why: `Astronaut Academy level ${d.needs.academy}`, locked: true, ms };
    if (s.jobs.some((j) => j.kind === 'mission' && j.payload.mission === payload.mission && d.kind !== 'repeat')) return { ok: false, why: 'Already in flight', busy: true, ms }; }
  if (payload.probe) { if (sol(s).surveyed[payload.probe]) return { ok: false, why: 'Already surveyed', done: true, ms }; if (s.jobs.some((j) => j.kind === 'mission' && j.payload.probe === payload.probe)) return { ok: false, why: 'A probe is on its way', busy: true, ms }; }
  if (payload.module) { if (ms.needs && !sp(s).modules[ms.needs]) return { ok: false, why: 'Launch the Core Module first', locked: true, ms }; if (ms.lvl > d.max) return { ok: false, why: 'Maximum level', done: true, ms }; if (s.jobs.some((j) => j.kind === 'mission' && j.payload.module === payload.module)) return { ok: false, why: 'Already in flight', busy: true, ms }; }
  if (payload.sat) { const d2 = SATS[payload.sat]; if (payload.idx === undefined) { const used = satsIn(s, d2.orbit).length + s.jobs.filter((j) => j.kind === 'mission' && j.payload.sat && j.payload.idx === undefined && SATS[j.payload.sat].orbit === d2.orbit).length; if (used >= slotsFor(s, d2.orbit)) return { ok: false, why: `No free ${ORBITS[d2.orbit].name} slot`, full: true, ms }; }
    else if (s.jobs.some((j) => j.kind === 'mission' && j.payload.sat && j.payload.idx === payload.idx)) return { ok: false, why: 'Upgrade already in flight', busy: true, ms }; }
  if (ms.cls > maxClass(s)) return { ok: false, why: `Launch Complex level ${ms.cls * 2 - 1} needed`, locked: true, ms };
  const rocket = pickRocket(s, ms.cls); if (!rocket) return { ok: false, why: `Needs a class ${ms.cls}+ rocket in the hangar`, rocket: true, ms };
  if (launchesBusy(s) >= launchSlots(s)) return { ok: false, why: 'Launch pad busy', busy: true, ms };
  if (!canPay(s, ms.cost)) return { ok: false, why: 'Not enough resources', cost: ms.cost, ms };
  return { ok: true, ms, rocket, rel: reliability(s, rocket, d) };
}
export function launch(s, payload, t = Date.now()) {
  const c = canLaunch(s, payload); if (!c.ok) return c; pay(s, c.ms.cost); sp(s).rockets[c.rocket]--;
  const ok = Math.random() < c.rel; s.jobs.push({ id: uid(s), kind: 'mission', payload, rocket: c.rocket, name: c.ms.name, ok, start: t, end: t + c.ms.flight * 1000 });
  sp(s).flights++; return c;
}
// apply a finished rocket / mission job
export function completeSpace(s, j) {
  const S = sp(s);
  if (j.kind === 'rocket') { S.rockets[j.rocket] = (S.rockets[j.rocket] || 0) + 1; s.stats.rocketsBuilt = (s.stats.rocketsBuilt || 0) + 1; return { kind: 'rocket', rocket: j.rocket }; }
  if (j.kind !== 'mission') return null;
  const P = j.payload; const R = ROCKETS[j.rocket];
  if (R.reusable && Math.random() < 0.85) S.rockets[j.rocket] = (S.rockets[j.rocket] || 0) + 1; // the booster lands itself
  if (!j.ok) { S.fails++; const sci = P.mission ? Math.round(((MISSIONS[P.mission].reward || {}).science || 1000) * 0.1) : P.probe ? Math.round(BODIES[P.probe].travel * 800) : 300; give(s, { science: sci }); return { kind: 'fail', name: j.name, sci }; }
  if (P.probe) { sol(s).surveyed[P.probe] = 1; give(s, { science: Math.round(BODIES[P.probe].travel * 4000) }); return { kind: 'survey', body: P.probe, name: j.name }; }
  if (P.sat) { if (P.idx !== undefined && S.sats[P.idx]) S.sats[P.idx].lvl++; else S.sats.push({ type: P.sat, lvl: 1 }); return { kind: 'sat', sat: P.sat, name: j.name }; }
  if (P.module) { S.modules[P.module] = (S.modules[P.module] || 0) + 1; return { kind: 'module', mod: P.module, lvl: S.modules[P.module], name: j.name }; }
  const d = MISSIONS[P.mission]; const first = !S.done[P.mission]; S.done[P.mission] = (S.done[P.mission] || 0) + 1;
  give(s, d.reward || {}); if (first && d.firstReward) give(s, d.firstReward); if (d.flag) s.flags[d.flag] = 1;
  if (d.base && !s.bases[d.base]) foundBase(s, d.base);
  return { kind: 'mission', mission: P.mission, name: d.name, first, base: d.base };
}
export function foundBase(s, id) {
  if (id === 'moon') s.bases.moon = { body: 'moon', name: 'Tranquility Base', lots: { hq: { b: 'hub', lvl: 1 }, M0: { b: 'regolith', lvl: 1 }, M1: { b: 'lsolar', lvl: 1 }, M2: { b: 'ice', lvl: 1 } }, pop: 16 };
}
export { MISSIONS, SATS, MODULES, ROCKETS, ROCKET_ORDER, ORBITS };
