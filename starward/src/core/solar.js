// STARWARD: Solar System rules. Planets move on real orbital periods (one game year = two real days), so
// transfer windows open and close: a Hohmann-style phase angle makes some days far cheaper to fly than others.
// Reusable ships carry out voyages: founding colonies, building outposts, mining claims and gas-giant scoops,
// upgrading them, and ferrying colonists. Mars can be terraformed in seven long stages.
import { BODIES, SITES, SHIPS, SHIP_ORDER, TERRA, ZONE_CLASS, SITE_MAX } from '../data/solar.js';
import { lvlOf, canPay, pay, give } from './econ.js';
import { uid } from './state.js';
import { curve, round2, clamp, hash } from '../util.js';
import { fitMax } from '../data/buildings.js';

export const YEAR_MS = 2 * 86400000; const EPOCH = Date.UTC(2026, 0, 1);
export const sol = (s) => s.solar || (s.solar = { surveyed: {}, sites: {}, ships: {}, terra: {}, voyages: 0, story: {} });
const TAU = Math.PI * 2; const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const rootOf = (id) => (BODIES[id].parent || id);
// heliocentric angle of a body (moons share their planet's), and a moon's angle around its planet
export const angleOf = (id, t = Date.now()) => { const r = rootOf(id); const b = BODIES[r]; if (!b.P) return 0; return (hash(r) % 628) / 100 + (TAU * (t - EPOCH)) / ((b.P / 365.25) * YEAR_MS); };
export const moonAngle = (id, t = Date.now()) => (hash(id) % 628) / 100 + (TAU * (t - EPOCH)) / ((BODIES[id].P / 365.25) * YEAR_MS);
// transfer window quality q (0..1) and its effect k (inner system feels it fully, fusion-era targets far less)
export function windowOf(id, t = Date.now()) {
  const r = rootOf(id); const b = BODIES[r]; if (!b.a || r === 'earth') return { q: 1, k: 0, fuel: 1, time: 1, open: true };
  const a2 = b.a; const phi = Math.PI * (1 - Math.pow((1 + a2) / (2 * a2), 1.5)); // how far the target must lead Earth at departure
  const d = wrap(angleOf(r, t) - angleOf('earth', t) - phi); const q = Math.pow((1 + Math.cos(d)) / 2, 3);
  const k = BODIES[id].zone === 'inner' || BODIES[id].zone === 'belt' ? 1 : 0.3;
  return { q, k, fuel: 1 + k * (0.45 - 0.9 * q), time: 1 + k * (0.25 - 0.5 * q), open: q > 0.6 };
}
// milliseconds until the window next opens (0 if open now)
export function nextWindow(id, t = Date.now()) {
  const r = rootOf(id); const b = BODIES[r]; if (!b.a || r === 'earth' || windowOf(id, t).open) return 0;
  const syn = (1 / Math.abs(1 / 365.25 - 1 / b.P)) / 365.25 * YEAR_MS; const step = syn / 400;
  for (let k = 1; k <= 400; k++) if (windowOf(id, t + k * step).open) return k * step; return 0;
}
// ---------------- the fleet ----------------
export const yardLevel = (s) => (s.space && s.space.modules && s.space.modules.yard) || 0;
export const shipBusy = (s) => s.jobs.find((j) => j.kind === 'ship');
export const shipsOut = (s, id) => s.jobs.filter((j) => j.kind === 'voyage' && j.ship === id).length;
export const shipsFree = (s, id) => (sol(s).ships[id] || 0) - shipsOut(s, id);
export function canBuildShip(s, id) {
  const d = SHIPS[id]; if (!d) return { ok: false, why: 'Unknown' };
  const miss = d.req.filter((t) => !s.tech[t]); if (miss.length) return { ok: false, why: 'Research required', locked: true };
  if (yardLevel(s) < d.yard) return { ok: false, why: `Orbital Shipyard level ${d.yard}`, locked: true };
  if (shipBusy(s)) return { ok: false, why: 'The shipyard is busy', busy: true };
  if (!canPay(s, d.cost)) return { ok: false, why: 'Not enough resources', cost: d.cost };
  return { ok: true, cost: d.cost, time: shipTime(s, id) };
}
export const shipTime = (s, id) => Math.round(SHIPS[id].time / (1 + yardLevel(s) * 0.08));
export function startShip(s, id, t = Date.now()) { const c = canBuildShip(s, id); if (!c.ok) return c; pay(s, c.cost); s.jobs.push({ id: uid(s), kind: 'ship', ship: id, start: t, end: t + c.time * 1000 }); return c; }
// ---------------- colonies ----------------
export const COLONY = {
  mars: { name: 'Bradbury Landing', tech: 'marsDirect', start: { hq: { b: 'hub', lvl: 1 }, M0: { b: 'regolith', lvl: 1 }, M1: { b: 'reactor', lvl: 1 }, M2: { b: 'dome', lvl: 1 } }, pop: 24, grow: 0.3 },
  ceres: { name: 'Occator Station', tech: 'beltSettlement', start: { hq: { b: 'hub', lvl: 1 }, M0: { b: 'ice', lvl: 1 }, M1: { b: 'reactor', lvl: 1 }, M2: { b: 'dome', lvl: 1 } }, pop: 24, grow: 0.2 },
  titan: { name: 'Kraken Shore', tech: 'cryoHabitats', start: { hq: { b: 'hub', lvl: 1 }, M0: { b: 'ice', lvl: 1 }, M1: { b: 'reactor', lvl: 1 }, M2: { b: 'dome', lvl: 1 } }, pop: 24, grow: 0.15 },
  moon: { grow: 1.0 },
};
export function foundColony(s, id) { const C = COLONY[id]; if (s.bases[id]) return; const lots = {}; for (const k in C.start) lots[k] = { ...C.start[k] }; s.bases[id] = { body: id, name: C.name, lots, pop: C.pop }; }
// ---------------- voyages ----------------
// op: 'found' (colony), 'site' (build the outpost / station / claim), 'upgrade' (next level), 'transport' (colonists)
export const siteLevel = (s, id) => sol(s).sites[id] || 0;
export const siteCost = (id, L) => { const d = SITES[id]; const o = {}; for (const r in d.cost) o[r] = round2(curve(d.cost[r][0], d.cost[r][1], L)); return fitMax(o); };
export const liftCut = (s) => Math.min(0.45, lvlOf(s, 'earth', 'elevator') * 0.03);
export function travelTime(s, body, ship, t = Date.now()) {
  const b = BODIES[body]; const w = windowOf(body, t); let h = b.travel / SHIPS[ship].speed * w.time;
  if (b.zone === 'jovian') h *= 1 - Math.min(0.5, siteLevel(s, 'callisto') * SITES.callisto.travelCut);
  return Math.max(600, Math.round(h * 3600));
}
export function voyageSpec(s, P, t = Date.now()) {
  const b = BODIES[P.body]; const w = windowOf(P.body, t); const L = siteLevel(s, P.body); let cost = {}; let name = '';
  if (P.op === 'found') { cost = { credits: 2000000, metal: 1500000 }; name = `Found ${COLONY[P.body].name}`; }
  else if (P.op === 'site') { cost = siteCost(P.body, 1); name = `Build ${SITES[P.body].name}`; }
  else if (P.op === 'upgrade') { cost = siteCost(P.body, L + 1); name = `${SITES[P.body].name} → level ${L + 1}`; }
  else if (P.op === 'transport') { cost = { credits: 300000 }; name = `Colonists to ${b.name}`; }
  const cls = ZONE_CLASS[b.zone] || 1; const hrs = b.travel;
  const burn = cls === 1 ? { fuel: round2(hrs * 18000 * w.fuel * (1 - phobosCut(s, P.body))) } : { he3: round2(hrs * (cls === 2 ? 12 : 18) * w.fuel) };
  for (const r in burn) cost[r] = (cost[r] || 0) + burn[r];
  const lc = liftCut(s); if (lc) for (const r in cost) if (r !== 'he3' && r !== 'rare') cost[r] = round2(cost[r] * (1 - lc));
  return { name, cost, cls, w };
}
const phobosCut = (s, body) => (BODIES[body].zone === 'inner' || body === 'mars' ? Math.min(0.4, siteLevel(s, 'phobos') * SITES.phobos.fuelCut) : 0);
// the best free ship for a job (smallest class that can reach; colonists need a ship that carries people)
export function pickShip(s, cls, people) { for (const id of SHIP_ORDER) { const d = SHIPS[id]; if (d.cls < cls || (people && !d.carries) || (!people && id === 'ares' && cls > 1)) continue; if (shipsFree(s, id) > 0) return id; } return null; }
export function canVoyage(s, P, t = Date.now()) {
  const b = BODIES[P.body]; if (!b) return { ok: false, why: 'Unknown world' }; const ms = voyageSpec(s, P, t);
  if (!sol(s).surveyed[P.body]) return { ok: false, why: 'Survey it with a probe first', locked: true, ms };
  if (P.op === 'found') { const C = COLONY[P.body]; if (!C || !C.tech) return { ok: false, why: 'No colony site', ms }; if (s.bases[P.body]) return { ok: false, why: 'Already settled', done: true, ms }; if (!s.tech[C.tech]) return { ok: false, why: 'Research required', locked: true, tech: C.tech, ms }; }
  if (P.op === 'site' || P.op === 'upgrade') { const d = SITES[P.body]; if (!d) return { ok: false, why: 'Nothing to build here', ms }; if (!s.tech[d.req]) return { ok: false, why: 'Research required', locked: true, tech: d.req, ms };
    const L = siteLevel(s, P.body); if (P.op === 'site' && L) return { ok: false, why: 'Already built', done: true, ms }; if (P.op === 'upgrade' && !L) return { ok: false, why: 'Build it first', ms }; if (L >= SITE_MAX) return { ok: false, why: 'Maximum level', done: true, ms }; }
  if (P.op === 'transport' && !s.bases[P.body]) return { ok: false, why: 'No colony yet', ms };
  if (s.jobs.some((j) => j.kind === 'voyage' && j.payload.body === P.body && j.payload.op !== 'transport' && P.op !== 'transport')) return { ok: false, why: 'A ship is already on its way', busy: true, ms };
  const ship = pickShip(s, ms.cls, P.op === 'transport');
  if (!ship) { const any = SHIP_ORDER.some((id) => SHIPS[id].cls >= ms.cls && (P.op !== 'transport' || SHIPS[id].carries) && (sol(s).ships[id] || 0) > 0); return { ok: false, why: any ? 'Every suitable ship is out on a voyage' : `Needs a class ${ms.cls}${P.op === 'transport' ? ' passenger' : ''} ship: build one at the Orbital Shipyard`, ship: true, ms }; }
  if (!canPay(s, ms.cost)) return { ok: false, why: 'Not enough resources', cost: ms.cost, ms };
  return { ok: true, ms, ship, time: travelTime(s, P.body, ship, t) };
}
export function startVoyage(s, P, t = Date.now()) { const c = canVoyage(s, P, t); if (!c.ok) return c; pay(s, c.ms.cost); s.jobs.push({ id: uid(s), kind: 'voyage', payload: P, ship: c.ship, name: c.ms.name, start: t, end: t + c.time * 1000 }); sol(s).voyages++; return c; }
// ---------------- terraforming ----------------
export const terraStage = (s, body) => sol(s).terra[body] || 0;
export function terraState(s, body) { const T = TERRA[body]; const n = terraStage(s, body); const o = { ...T.start, house: 0, n, of: T.stages.length, p: n / T.stages.length }; for (let k = 0; k < n; k++) { Object.assign(o, T.stages[k].set); o.house += T.stages[k].house; } return o; }
export const terraTime = (s, body) => { const st = TERRA[body].stages[terraStage(s, body)]; return Math.round((st.days * 86400 * (s.aliens && s.aliens.xt.mycelialTerra ? 0.7 : 1)) / (1 + lvlOf(s, body, 'terraformer') * 0.04)); };
export function canTerra(s, body) {
  const T = TERRA[body]; if (!T || !s.bases[body]) return { ok: false, why: 'Found a colony first' }; const n = terraStage(s, body); if (n >= T.stages.length) return { ok: false, why: 'Terraforming complete', done: true };
  const st = T.stages[n]; if (s.jobs.some((j) => j.kind === 'terra' && j.body === body)) return { ok: false, why: 'A stage is under way', busy: true, st };
  if (!s.tech[st.req]) return { ok: false, why: 'Research required', locked: true, tech: st.req, st };
  const hub = lvlOf(s, body, 'hub'); if (hub < n + 2) return { ok: false, why: `Colony Hub level ${n + 2}`, locked: true, st };
  if (!canPay(s, st.cost)) return { ok: false, why: 'Not enough resources', cost: st.cost, st };
  return { ok: true, st, time: terraTime(s, body) };
}
export function startTerra(s, body, t = Date.now()) { const c = canTerra(s, body); if (!c.ok) return c; pay(s, c.st.cost); s.jobs.push({ id: uid(s), kind: 'terra', body, stage: terraStage(s, body), start: t, end: t + c.time * 1000 }); return c; }
// ---------------- completing jobs ----------------
export function completeSolar(s, j) {
  const S = sol(s);
  if (j.kind === 'ship') { S.ships[j.ship] = (S.ships[j.ship] || 0) + 1; return { kind: 'ship', ship: j.ship }; }
  if (j.kind === 'terra') { S.terra[j.body] = Math.max(S.terra[j.body] || 0, j.stage + 1); return { kind: 'terra', body: j.body, stage: j.stage }; }
  if (j.kind !== 'voyage') return null;
  const P = j.payload; const out = { kind: 'voyage', op: P.op, body: P.body, name: j.name };
  if (P.op === 'found') { foundColony(s, P.body); out.founded = true; }
  if (P.op === 'site') { S.sites[P.body] = 1; const st = SITES[P.body].story; if (st && !S.story[st]) { S.story[st] = 1; s.flags[st] = 1; out.story = st; } }
  if (P.op === 'upgrade') S.sites[P.body] = (S.sites[P.body] || 0) + 1;
  if (P.op === 'transport' && s.bases[P.body]) { const n = SHIPS[j.ship].carries || 0; s.bases[P.body].pop = (s.bases[P.body].pop || 0) + n; out.people = n; }
  return out;
}
export { BODIES, SITES, SHIPS, SHIP_ORDER, TERRA };
