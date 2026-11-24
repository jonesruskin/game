// Spaceflight rules (ported from Starward, with player-designed rockets). Designs are saved, assembled in the
// Vehicle Assembly (single-stage sounding rockets at the pad), then flown on missions from the Launch Complex.
// Outcomes are rolled at liftoff (no save-scumming) and revealed on arrival. Satellites fill orbital slots;
// station modules grow an outpost in orbit. Registers its job completers, objective checks and economy hooks.
import { SATS, MODULES, MISSIONS, ORBITS } from '../data/space';
import { Design, designStats, PRESETS, TOPS, ENGINES, TANKS } from '../data/rockets';
import { lvlOf, canPay, pay, give, mods, modHooks, rateHooks, Mods } from './econ';
import { completers, stepChecks, Check, Note } from './game';
import { State, uid } from './state';
import { curve, round2, clamp } from './util';
export interface Sat { type: string; lvl: number; }
export interface Space { designs: Design[]; hangar: Record<string, number>; sats: Sat[]; modules: Record<string, number>; flights: number; fails: number; done: Record<string, number>; }
export const sp = (s: State): Space => (s.space || (s.space = { designs: [], hangar: {}, sats: [], modules: {}, flights: 0, fails: 0, done: {} }));
export const vabLevel = (s: State) => lvlOf(s, 'earth', 'vab');
export const padLevel = (s: State) => lvlOf(s, 'earth', 'launch');
export const launchSlots = (s: State) => (padLevel(s) ? 1 + (padLevel(s) >= 10 ? 1 : 0) + (padLevel(s) >= 18 ? 1 : 0) : 0);
export const assemblyLines = (s: State) => 1 + (vabLevel(s) >= 10 ? 1 : 0);
export const launchesBusy = (s: State) => s.jobs.filter((j) => j.kind === 'mission').length;
export const rocketsBusy = (s: State) => s.jobs.filter((j) => j.kind === 'rocket').length;
export const maxClass = (s: State) => Math.min(9, Math.ceil(padLevel(s) / 2));
export const slotsFor = (s: State, orbit: string, m: Mods = mods(s)) => ORBITS[orbit].base + (m.flags.has('orbitalOps') ? 1 : 0) + (orbit === 'leo' && m.flags.has('constellations') ? 2 : 0) + (orbit === 'lagrange' && s.tech.deepSpace ? 1 : 0);
export const satsIn = (s: State, orbit: string) => sp(s).sats.filter((x) => SATS[x.type].orbit === orbit);
export const designOf = (s: State, id: string) => sp(s).designs.find((d) => d.id === id) || PRESETS.find((d) => d.id === id) || null;
// presets the player has the parts for, plus everything they designed themselves
export const partOk = (s: State, req?: string) => !req || !!s.tech[req];
export const designUnlocked = (s: State, d: Design) => designStats(d).reqs.every((r) => partOk(s, r));
export const allDesigns = (s: State) => [...PRESETS.filter((d) => designUnlocked(s, d) && !sp(s).designs.some((x) => x.id === d.id)), ...sp(s).designs];
// reliability: the design's, plus the tracking station, satellites, academy and docking hub for crews, reuse experience
export function reliability(s: State, d: Design, crewed = false) {
  let p = designStats(d).rel + Math.min(0.06, lvlOf(s, 'earth', 'tracking') * 0.004); for (const x of sp(s).sats) p += (SATS[x.type].rel || 0) * x.lvl;
  if (crewed) p += lvlOf(s, 'earth', 'academy') * 0.01 + (sp(s).modules.dock || 0) * (MODULES.dock.rel || 0); if (s.tech.reusable) p += 0.02; return clamp(p, 0.05, 0.99);
}
export const flightCut = (s: State) => clamp(sp(s).sats.reduce((a, x) => a + (SATS[x.type].flightCut || 0) * x.lvl, 0), 0, 0.5);
export const fuelCut = (s: State) => clamp((sp(s).modules.depot || 0) * (MODULES.depot.fuelCut || 0) + lvlOf(s, 'moon', 'massDriver') * 0.03, 0, 0.6);
export const liftCut = (s: State) => clamp(lvlOf(s, 'earth', 'elevator') * 0.03, 0, 0.45);
// ---------------- designs ----------------
export function saveDesign(s: State, d: Design) { const S = sp(s); const i = S.designs.findIndex((x) => x.id === d.id); if (i >= 0) S.designs[i] = d; else S.designs.push(d); }
export function newDesignId(s: State) { return 'd' + (s.seq++).toString(36); }
export function deleteDesign(s: State, id: string) { const S = sp(s); if ((S.hangar[id] || 0) > 0 || s.jobs.some((j) => j.kind === 'rocket' && j.design.id === id)) return false; S.designs = S.designs.filter((d) => d.id !== id); return true; }
export function checkDesign(s: State, d: Design): Check {
  if (!d.stages.length) return { ok: false, why: 'Add a stage' }; const st = designStats(d);
  const miss = st.reqs.filter((r) => !s.tech[r]); if (miss.length) return { ok: false, why: 'Some parts need research', locked: true };
  if (d.stages.some((x, i) => i === 0 && ENGINES[x.eng].upper)) return { ok: false, why: 'Nuclear engines only fire in space: use them on upper stages' };
  if (st.cls === 0) return { ok: false, why: 'Too weak to reach space' };
  if (st.vab > 0 && !vabLevel(s)) return { ok: false, why: 'Multi-stage rockets are stacked in the Vehicle Assembly', locked: true };
  if (vabLevel(s) < st.vab) return { ok: false, why: `Vehicle Assembly level ${st.vab} for ${st.vab >= 7 ? 'XXL' : st.vab >= 5 ? 'XL' : st.vab >= 3 ? 'L' : 'M'} tanks`, locked: true };
  if (st.cls > maxClass(s)) return { ok: false, why: `Launch Complex level ${st.cls * 2 - 1} to fly class ${st.cls}`, locked: true };
  return { ok: true };
}
// ---------------- assembly ----------------
export const rocketCost = (s: State, d: Design) => { const c = { ...designStats(d).cost }; const k = (s.tech.reusable ? 0.85 : 1) * (1 - liftCut(s)); if (k < 1) for (const r in c) c[r] = round2(c[r] * k); return c; };
export const rocketTime = (s: State, d: Design) => Math.max(10, Math.round(designStats(d).time / (1 + vabLevel(s) * 0.06)));
export function canBuildRocket(s: State, d: Design): Check {
  if (!padLevel(s)) return { ok: false, why: 'Build the Launch Complex', locked: true }; const c = checkDesign(s, d); if (!c.ok) return c;
  if (rocketsBusy(s) >= assemblyLines(s)) return { ok: false, why: 'Assembly line busy', busy: true };
  const cost = rocketCost(s, d); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost };
  return { ok: true, cost, time: rocketTime(s, d) };
}
export function startRocket(s: State, d: Design, t = Date.now()): Check { const c = canBuildRocket(s, d); if (!c.ok) return c; pay(s, c.cost!); s.jobs.push({ id: uid(s), kind: 'rocket', design: JSON.parse(JSON.stringify(d)), start: t, end: t + c.time! * 1000 }); return c; }
// the smallest rocket in the hangar that can fly a mission (crewed missions need a capsule, landings a lander)
export function pickRocket(s: State, cls: number, crew = false, lander = false): Design | null {
  let best: Design | null = null, bc = 99; for (const id in sp(s).hangar) { if ((sp(s).hangar[id] || 0) <= 0) continue; const d = designOf(s, id); if (!d) continue; const st = designStats(d);
    if (st.cls < cls || (crew && !st.crew) || (lander && !st.lander)) continue; const sc = st.cls + (st.crew && !crew ? 0.5 : 0); if (sc < bc) { bc = sc; best = d; } }
  return best;
}
// ---------------- missions ----------------
export interface Payload { mission?: string; sat?: string; idx?: number; module?: string; }
export interface Spec { name: string; cls: number; cost: Record<string, number>; flight: number; req: string[]; lvl?: number; crew?: boolean; lander?: boolean; needs?: string; }
export function missionSpec(s: State, p: Payload): Spec {
  const lc = 1 - liftCut(s);
  if (p.sat) { const d = SATS[p.sat]; const cur = p.idx !== undefined ? sp(s).sats[p.idx] : null; const L = cur ? cur.lvl + 1 : 1; const cost: Record<string, number> = {}; for (const k in d.cost) cost[k] = round2(curve(d.cost[k][0], d.cost[k][1], L) * lc); if (cost.fuel) cost.fuel = round2(cost.fuel * (1 - fuelCut(s)));
    return { name: `${cur ? 'Upgrade' : 'Launch'} ${d.name}${L > 1 ? ' Mk ' + L : ''}`, cls: d.cls, cost, flight: Math.round(curve(d.flight[0], d.flight[1], L) * (1 - flightCut(s))), req: [d.req], lvl: L }; }
  if (p.module) { const d = MODULES[p.module]; const L = (sp(s).modules[p.module] || 0) + 1; const cost: Record<string, number> = {}; for (const k in d.cost) cost[k] = round2(curve(d.cost[k][0], d.cost[k][1], L) * lc); if (cost.fuel) cost.fuel = round2(cost.fuel * (1 - fuelCut(s)));
    return { name: `${L > 1 ? 'Expand' : 'Launch'} ${d.name}${L > 1 ? ' (level ' + L + ')' : ''}`, cls: d.cls, cost, flight: Math.round(curve(d.flight[0], d.flight[1], L) * (1 - flightCut(s))), req: [d.req], lvl: L, needs: d.needs }; }
  const d = MISSIONS[p.mission!]; const cost: Record<string, number> = { fuel: round2(d.fuel * (1 - fuelCut(s)) * lc), credits: round2(d.credits * lc) }; if (d.metal) cost.metal = round2(d.metal * lc);
  return { name: d.name, cls: d.cls, cost, flight: Math.round(d.flight * (1 - flightCut(s))), req: d.req, crew: !!d.crewed, lander: !!d.lander };
}
export function canLaunch(s: State, p: Payload): Check & { ms: Spec; rocket?: Design; rel?: number } {
  const ms = missionSpec(s, p);
  if (!padLevel(s)) return { ok: false, why: 'Build the Launch Complex', locked: true, ms };
  const miss = ms.req.filter((t) => t && !s.tech[t]); if (miss.length) return { ok: false, why: 'Research required', locked: true, ms };
  if (p.mission) { const d = MISSIONS[p.mission]; if ((d.flags || []).some((f) => !s.flags[f])) return { ok: false, why: 'Complete earlier missions first', locked: true, ms }; if (d.kind !== 'repeat' && d.flag && s.flags[d.flag]) return { ok: false, why: 'Accomplished', done: true, ms };
    if (d.needs && d.needs.academy && lvlOf(s, 'earth', 'academy') < d.needs.academy) return { ok: false, why: `Astronaut Academy level ${d.needs.academy}`, locked: true, ms };
    if (s.jobs.some((j) => j.kind === 'mission' && j.payload.mission === p.mission && d.kind !== 'repeat')) return { ok: false, why: 'Already in flight', busy: true, ms }; }
  if (p.module) { const d = MODULES[p.module]; if (ms.needs && !sp(s).modules[ms.needs]) return { ok: false, why: 'Launch the Core Module first', locked: true, ms }; if ((ms.lvl || 1) > d.max) return { ok: false, why: 'Maximum level', done: true, ms }; if (s.jobs.some((j) => j.kind === 'mission' && j.payload.module === p.module)) return { ok: false, why: 'Already in flight', busy: true, ms }; }
  if (p.sat) { const d2 = SATS[p.sat]; if (p.idx === undefined) { const used = satsIn(s, d2.orbit).length + s.jobs.filter((j) => j.kind === 'mission' && j.payload.sat && j.payload.idx === undefined && SATS[j.payload.sat].orbit === d2.orbit).length; if (used >= slotsFor(s, d2.orbit)) return { ok: false, why: `No free ${ORBITS[d2.orbit].name} slot`, full: true, ms }; }
    else if (s.jobs.some((j) => j.kind === 'mission' && j.payload.sat && j.payload.idx === p.idx)) return { ok: false, why: 'Upgrade already in flight', busy: true, ms }; }
  if (ms.cls > maxClass(s)) return { ok: false, why: `Launch Complex level ${ms.cls * 2 - 1} needed`, locked: true, ms };
  const rocket = pickRocket(s, ms.cls, ms.crew, ms.lander); if (!rocket) return { ok: false, why: `Needs a class ${ms.cls}+ rocket${ms.lander ? ' with a lander' : ms.crew ? ' with a crew capsule' : ''} in the hangar`, noRocket: true, ms };
  if (launchesBusy(s) >= launchSlots(s)) return { ok: false, why: 'Launch pad busy', busy: true, ms };
  if (!canPay(s, ms.cost)) return { ok: false, why: 'Not enough resources', cost: ms.cost, ms };
  return { ok: true, ms, rocket, rel: reliability(s, rocket, ms.crew) };
}
export function launch(s: State, p: Payload, t = Date.now()) {
  const c = canLaunch(s, p); if (!c.ok) return c; pay(s, c.ms.cost); const S = sp(s); S.hangar[c.rocket!.id]--;
  const ok = Math.random() < c.rel!; s.jobs.push({ id: uid(s), kind: 'mission', payload: p, design: JSON.parse(JSON.stringify(c.rocket)), name: c.ms.name, ok, start: t, end: t + c.ms.flight * 1000 });
  S.flights++; s.stats.launches = (s.stats.launches || 0) + 1; return c;
}
// ---------------- completion ----------------
completers.rocket = (s, j): Note => { const S = sp(s); const d: Design = j.design; if (!designOf(s, d.id)) saveDesign(s, d); S.hangar[d.id] = (S.hangar[d.id] || 0) + 1; s.stats.rocketsBuilt = (s.stats.rocketsBuilt || 0) + 1; return { kind: 'rocket', design: d.id, name: d.name }; };
completers.mission = (s, j): Note => {
  const S = sp(s); const P: Payload = j.payload; const d: Design = j.design;
  if (d.legs && Math.random() < 0.85) S.hangar[d.id] = (S.hangar[d.id] || 0) + 1; // the booster lands itself
  if (!j.ok) { S.fails++; const sci = P.mission ? Math.round(((MISSIONS[P.mission].reward || {}).science || 1000) * 0.1) : 300; give(s, { science: sci }); return { kind: 'fail', name: j.name, sci }; }
  if (P.sat) { if (P.idx !== undefined && S.sats[P.idx]) S.sats[P.idx].lvl++; else S.sats.push({ type: P.sat, lvl: 1 }); return { kind: 'sat', sat: P.sat, name: j.name }; }
  if (P.module) { S.modules[P.module] = (S.modules[P.module] || 0) + 1; return { kind: 'module', mod: P.module, lvl: S.modules[P.module], name: j.name }; }
  const m = MISSIONS[P.mission!]; const first = !S.done[P.mission!]; S.done[P.mission!] = (S.done[P.mission!] || 0) + 1;
  give(s, m.reward || {}); if (first && m.firstReward) give(s, m.firstReward); if (m.flag) s.flags[m.flag] = 1;
  return { kind: 'mission', mission: P.mission, name: m.name, first, reward: m.reward, base: m.base };
};
stepChecks.rockets = (s, st) => (s.stats.rocketsBuilt || 0) >= st.n;
stepChecks.sat = (s, st) => sp(s).sats.some((x) => x.type === st.sat);
stepChecks.module = (s, st) => (sp(s).modules[st.mod] || 0) >= st.lvl;
// orbital assets feed the economy: satellites and station modules
modHooks.push((s, m) => { for (const x of sp(s).sats) { const d = SATS[x.type]; for (const r in d.mult || {}) m.mult[r] = (m.mult[r] || 0) + d.mult![r] * x.lvl; } });
rateHooks.push((s, R) => { const S = sp(s); const m = R.m;
  for (const x of S.sats) { const d = SATS[x.type]; for (const r in d.prod || {}) R.prod[r] += curve(d.prod![r][0], d.prod![r][1], x.lvl) * (1 + (m.mult[r] || 0)); if (d.gen) R.gen += curve(d.gen[0], d.gen[1], x.lvl) * (1 + m.gen); }
  for (const id in S.modules) { const L = S.modules[id]; const d = MODULES[id]; if (!L || !d) continue; for (const r in d.prod || {}) R.prod[r] += curve(d.prod![r][0], d.prod![r][1], L) * (1 + (m.mult[r] || 0)); for (const r in d.cap || {}) R.cap[r] += curve(d.cap![r][0], d.cap![r][1], L) * (1 + m.cap); if (d.gen) R.gen += curve(d.gen[0], d.gen[1], L) * (1 + m.gen); if (d.speed) R.speed += d.speed * L; }
});
export { SATS, MODULES, MISSIONS, ORBITS, TOPS, ENGINES, TANKS };
