// The Solar System (ported from Starward): planets move on real orbital periods (one game year = two real days), so
// transfer windows open and close. Reusable ships fly voyages: founding colonies, building and upgrading outposts,
// mining claims and gas-giant scoops, ferrying colonists. Colonies are real bases with their own ground and sky,
// people who need housing, water and air, and traits that come from their world.
import { BODIES, SITES, SHIPS, SHIP_ORDER, TERRA, ZONE_CLASS, SITE_MAX, BODY_ORDER, RELAY, TerraStage } from '../data/solar';
import { fitMax, GRID, BUILDINGS } from '../data/buildings';
import { lvlOf, canPay, pay, rateHooks, baseHooks, Rates } from './econ';
import { completers, stepChecks, Check, Note } from './game';
import { State, uid, Item } from './state';
import { curve, round2, hash, clamp } from './util';
export interface Solar { surveyed: Record<string, number>; sites: Record<string, number>; ships: Record<string, number>; terra: Record<string, number>; voyages: number; story: Record<string, number>; relays?: Record<string, number>; }
export const YEAR_MS = 2 * 86400000; const EPOCH = Date.UTC(2026, 0, 1); const TAU = Math.PI * 2;
export const sol = (s: State): Solar => (s.solar || (s.solar = { surveyed: {}, sites: {}, ships: {}, terra: {}, voyages: 0, story: {} }));
const wrap = (a: number) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const rootOf = (id: string) => BODIES[id].parent || id;
export const angleOf = (id: string, t = Date.now()) => { const r = rootOf(id); const b = BODIES[r]; if (!b.P) return 0; return (hash(r) % 628) / 100 + (TAU * (t - EPOCH)) / ((b.P / 365.25) * YEAR_MS); };
export const moonAngle = (id: string, t = Date.now()) => (hash(id) % 628) / 100 + (TAU * (t - EPOCH)) / (((BODIES[id].P || 10) / 365.25) * YEAR_MS);
// transfer window quality q (0..1): the inner system feels it fully, fusion-era targets far less
export function windowOf(id: string, t = Date.now()) {
  const r = rootOf(id); const b = BODIES[r]; if (!b.a || r === 'earth') return { q: 1, k: 0, fuel: 1, time: 1, open: true };
  const a2 = b.a; const phi = Math.PI * (1 - Math.pow((1 + a2) / (2 * a2), 1.5)); const d = wrap(angleOf(r, t) - angleOf('earth', t) - phi); const q = Math.pow((1 + Math.cos(d)) / 2, 3);
  const k = BODIES[id].zone === 'inner' || BODIES[id].zone === 'belt' ? 1 : 0.3; return { q, k, fuel: 1 + k * (0.45 - 0.9 * q), time: 1 + k * (0.25 - 0.5 * q), open: q > 0.6 };
}
export function nextWindow(id: string, t = Date.now()) { const r = rootOf(id); const b = BODIES[r]; if (!b.a || !b.P || r === 'earth' || windowOf(id, t).open) return 0; const syn = ((1 / Math.abs(1 / 365.25 - 1 / b.P)) / 365.25) * YEAR_MS; const step = syn / 400; for (let k = 1; k <= 400; k++) if (windowOf(id, t + k * step).open) return k * step; return 0; }
// ---------------- the fleet ----------------
export const yardLevel = (s: State) => (s.space && s.space.modules && s.space.modules.yard) || 0;
export const shipBusy = (s: State) => s.jobs.find((j) => j.kind === 'ship');
export const shipsOut = (s: State, id: string) => s.jobs.filter((j) => j.kind === 'voyage' && j.ship === id).length;
export const shipsFree = (s: State, id: string) => (sol(s).ships[id] || 0) - shipsOut(s, id);
export const shipTime = (s: State, id: string) => Math.round(SHIPS[id].time / (1 + yardLevel(s) * 0.08));
export function canBuildShip(s: State, id: string): Check { const d = SHIPS[id]; if (!d) return { ok: false, why: 'Unknown' }; if (d.req.some((t) => !s.tech[t])) return { ok: false, why: 'Research required', locked: true };
  if (yardLevel(s) < d.yard) return { ok: false, why: `Orbital Shipyard level ${d.yard}`, locked: true }; if (shipBusy(s)) return { ok: false, why: 'The shipyard is busy', busy: true };
  if (!canPay(s, d.cost)) return { ok: false, why: 'Not enough resources', cost: d.cost }; return { ok: true, cost: d.cost, time: shipTime(s, id) }; }
export function startShip(s: State, id: string, t = Date.now()) { const c = canBuildShip(s, id); if (!c.ok) return c; pay(s, c.cost!); s.jobs.push({ id: uid(s), kind: 'ship', ship: id, start: t, end: t + c.time! * 1000 }); return c; }
// ---------------- colonies ----------------
const M = GRID / 2; // grid centre: the hub sits on it
export interface ColonyDef { name: string; tech?: string; start: [string, number, number][]; pop: number; drift: number; traits: string[]; }
export const COLONY: Record<string, ColonyDef> = {
  moon: { name: 'Tranquility Base', start: [['hub', M - 2, M - 2], ['regolith', M - 7, M - 7], ['lsolar', M + 4, M - 7], ['ice', M - 7, M + 4]], pop: 16, drift: 1.0, traits: ['One-sixth gravity: cargo leaves the Moon cheaply (Mass Driver)', 'Polar ice for water and fuel', 'Helium-3 in the regolith', 'No air: colonists live under domes or underground'] },
  mars: { name: 'Bradbury Landing', tech: 'marsDirect', start: [['hub', M - 2, M - 2], ['regolith', M - 7, M - 7], ['reactor', M + 4, M - 7], ['dome', M - 8, M + 3], ['ice', M + 4, M + 4]], pop: 24, drift: 0.3, traits: ['Iron-rich ground: +15% metal', 'Sunlight is 43% of Earth\'s: solar arrays are weaker', 'Thin CO₂ air: domes or underground habitats until terraformed', 'Terraformable in seven stages'] },
  ceres: { name: 'Occator Station', tech: 'beltSettlement', start: [['hub', M - 2, M - 2], ['ice', M - 7, M - 7], ['reactor', M + 4, M - 7], ['dome', M - 8, M + 3]], pop: 24, drift: 0.2, traits: ['Capital of the belt: Mining Control boosts every claim', 'Briny ice: +40% fuel', 'Sunlight is 13% of Earth\'s'] },
  venus: { name: 'Cytherea', tech: 'aerostats', start: [['hub', M - 2, M - 2], ['skimmer', M - 7, M - 7], ['lsolar', M + 4, M - 7], ['dome', M - 8, M + 3]], pop: 24, drift: 0.3, traits: ['A city floating 50 km up, where the air is 1 bar and 25 °C', 'Breathable air is a lifting gas: the city floats on its own air', 'Sunlight 190% of Earth\'s: superb solar', 'Tourists pay a fortune: +25% credits', 'No ground to dig: water comes from the clouds (Cloud Skimmers)', 'Terraformable in six stages'] },
  titan: { name: 'Kraken Shore', tech: 'cryoHabitats', start: [['hub', M - 2, M - 2], ['ice', M - 7, M - 7], ['reactor', M + 4, M - 7], ['dome', M - 8, M + 3]], pop: 24, drift: 0.15, traits: ['A sea of liquid methane: the Hydrocarbon Refinery', 'Thick orange haze and -180 °C', 'Almost no sunlight: reactors only'] },
};
export const baseFounders: ((s: State, base: string) => void)[] = [];
// worlds whose open air people can breathe without terraforming (the kindest exoplanets)
export const airHooks: ((s: State, base: string) => boolean)[] = [];
export function foundColony(s: State, id: string) { const C = COLONY[id]; if (!C || s.bases[id]) return; let n = 0; const items: Item[] = C.start.map(([b, x, z]) => ({ id: id[0] + 'c' + (n++), b, x, z, r: 0, lvl: 1, held: 0 })); s.bases[id] = { body: id, name: C.name, items, pop: C.pop }; sol(s).surveyed[id] = 1; for (const f of baseFounders) f(s, id); }
// life support: colonists need water (ice mines, oceans) and air (the hub, greenhouses, domes, a breathable sky)
export function lifeSupport(s: State, base: string) {
  const B = s.bases[base]; if (!B || base === 'earth') return { water: Infinity, air: Infinity, ls: 1, pop: 0 }; let water = 0, air = 0;
  for (const it of B.items) { if (it.lvl <= 0) continue; if (it.b === 'ice') water += 45 * Math.pow(1.22, it.lvl - 1); if (it.b === 'hub') air += 30 * Math.pow(1.2, it.lvl - 1); if (it.b === 'greenhouse') air += 50 * Math.pow(1.22, it.lvl - 1); if (it.b === 'dome') air += 15 * Math.pow(1.2, it.lvl - 1); if (it.b === 'methane') water += 20 * Math.pow(1.2, it.lvl - 1); if (it.b === 'skimmer') water += 40 * Math.pow(1.22, it.lvl - 1); }
  const T = terraState(s, base); if (T) { water *= 1 + (T.water || 0) / 10; air *= 1 + (T.o2 || 0) / 4; if (breathable(T)) air = Infinity; } if (airHooks.some((h) => h(s, base))) air = Infinity; const pop = B.pop || 0; const ls = pop <= 0 ? 1 : Math.min(1, water / pop, air / pop); return { water, air, ls, pop };
}
// ---------------- voyages ----------------
export const siteLevel = (s: State, id: string) => sol(s).sites[id] || 0;
export const siteCost = (id: string, L: number) => { const d = SITES[id]; const o: Record<string, number> = {}; for (const r in d.cost) o[r] = round2(curve(d.cost[r][0], d.cost[r][1], L)); return fitMax(o); };
export const liftCutS = (s: State) => Math.min(0.45, lvlOf(s, 'earth', 'elevator') * 0.03);
export function travelTime(s: State, body: string, ship: string, t = Date.now()) { const b = BODIES[body]; const w = windowOf(body, t); let h = ((b.travel || 4) / SHIPS[ship].speed) * w.time; if (b.zone === 'jovian') h *= 1 - Math.min(0.5, siteLevel(s, 'callisto') * (SITES.callisto.travelCut || 0)); return Math.max(600, Math.round(h * 3600)); }
export interface Voyage { body: string; op: 'found' | 'site' | 'upgrade' | 'transport'; }
export function voyageSpec(s: State, P: Voyage, t = Date.now()) {
  const b = BODIES[P.body]; const w = windowOf(P.body, t); const L = siteLevel(s, P.body); let cost: Record<string, number> = {}; let name = '';
  if (P.op === 'found') { cost = { credits: 2000000, metal: 1500000 }; name = `Found ${COLONY[P.body]?.name || b.name}`; }
  else if (P.op === 'site') { cost = siteCost(P.body, 1); name = `Build ${SITES[P.body].name}`; }
  else if (P.op === 'upgrade') { cost = siteCost(P.body, L + 1); name = `${SITES[P.body].name} → level ${L + 1}`; }
  else { cost = { credits: 300000 }; name = `Colonists to ${b.name}`; }
  const cls = ZONE_CLASS[b.zone || 'inner'] || 1; const hrs = b.travel || 4; const phob = b.zone === 'inner' || P.body === 'mars' ? Math.min(0.4, siteLevel(s, 'phobos') * (SITES.phobos.fuelCut || 0)) : 0;
  const burn: Record<string, number> = cls === 1 ? { fuel: round2(hrs * 18000 * w.fuel * (1 - phob)) } : { he3: round2(hrs * (cls === 2 ? 12 : 18) * w.fuel) }; for (const r in burn) cost[r] = (cost[r] || 0) + burn[r];
  const lc = liftCutS(s); if (lc) for (const r in cost) if (r !== 'he3' && r !== 'rare') cost[r] = round2(cost[r] * (1 - lc));
  return { name, cost, cls, w };
}
export function pickShip(s: State, cls: number, people: boolean) { for (const id of SHIP_ORDER) { const d = SHIPS[id]; if (d.cls < cls || (people && !d.carries) || (!people && id === 'ares' && cls > 1)) continue; if (shipsFree(s, id) > 0) return id; } return null; }
export function canVoyage(s: State, P: Voyage, t = Date.now()): Check & { ms: ReturnType<typeof voyageSpec> } {
  const b = BODIES[P.body]; const ms = voyageSpec(s, P, t); if (!b) return { ok: false, why: 'Unknown world', ms };
  if (!sol(s).surveyed[P.body]) return { ok: false, why: 'Survey it with a probe first', locked: true, ms };
  if (P.op === 'found') { const C = COLONY[P.body]; if (!C || !C.tech) return { ok: false, why: 'No colony site', ms }; if (s.bases[P.body]) return { ok: false, why: 'Already settled', done: true, ms }; if (!s.tech[C.tech]) return { ok: false, why: 'Research required', locked: true, tech: C.tech, ms }; }
  if (P.op === 'site' || P.op === 'upgrade') { const d = SITES[P.body]; if (!d) return { ok: false, why: 'Nothing to build here', ms }; if (!s.tech[d.req]) return { ok: false, why: 'Research required', locked: true, tech: d.req, ms };
    const L = siteLevel(s, P.body); if (P.op === 'site' && L) return { ok: false, why: 'Already built', done: true, ms }; if (P.op === 'upgrade' && !L) return { ok: false, why: 'Build it first', ms }; if (L >= SITE_MAX) return { ok: false, why: 'Maximum level', done: true, ms }; }
  if (P.op === 'transport' && !s.bases[P.body]) return { ok: false, why: 'No colony yet', ms };
  if (s.jobs.some((j) => j.kind === 'voyage' && j.payload.body === P.body && j.payload.op !== 'transport' && P.op !== 'transport')) return { ok: false, why: 'A ship is already on its way', busy: true, ms };
  const ship = pickShip(s, ms.cls, P.op === 'transport');
  if (!ship) { const any = SHIP_ORDER.some((id) => SHIPS[id].cls >= ms.cls && (P.op !== 'transport' || SHIPS[id].carries) && (sol(s).ships[id] || 0) > 0); return { ok: false, why: any ? 'Every suitable ship is out on a voyage' : `Needs a class ${ms.cls}${P.op === 'transport' ? ' passenger' : ''} ship: build one at the Orbital Shipyard`, noShip: true, ms }; }
  if (!canPay(s, ms.cost)) return { ok: false, why: 'Not enough resources', cost: ms.cost, ms };
  return { ok: true, ms, ship, time: travelTime(s, P.body, ship, t) };
}
export function startVoyage(s: State, P: Voyage, t = Date.now()) { const c = canVoyage(s, P, t); if (!c.ok) return c; pay(s, c.ms.cost); s.jobs.push({ id: uid(s), kind: 'voyage', payload: P, ship: c.ship, name: c.ms.name, start: t, end: t + c.time! * 1000 }); sol(s).voyages++; s.stats.voyages = (s.stats.voyages || 0) + 1; return c; }
// ---------------- terraforming (stages run in Part 5's visuals) ----------------
export const terraStage = (s: State, body: string) => sol(s).terra[body] || 0;
// a sky you can breathe: colonists leave the domes, and air stops being a limit
export const breathable = (T: Record<string, number> | null) => !!T && (T.o2 || 0) >= 12;
export const terraJob = (s: State, body: string) => s.jobs.find((j) => j.kind === 'terra' && j.body === body);
export const terraTime = (s: State, body: string, n: number) => Math.round((TERRA[body].stages[n].days * 86400) / (1 + lvlOf(s, body, 'terraformer') * (BUILDINGS.terraformer.terra || 0.04)));
export function canTerra(s: State, body: string): Check & { stage?: TerraStage } {
  const T = TERRA[body]; if (!T) return { ok: false, why: 'Not terraformable' }; if (!s.bases[body]) return { ok: false, why: 'Found a colony first', locked: true };
  const n = terraStage(s, body); if (n >= T.stages.length) return { ok: false, why: 'Terraforming complete', done: true }; const st = T.stages[n];
  if (terraJob(s, body)) return { ok: false, why: 'A stage is under way', busy: true, stage: st };
  if (!s.tech[st.req]) return { ok: false, why: 'Research required', locked: true, tech: st.req, stage: st };
  const L = lvlOf(s, body, 'terraformer'); if (L < n + 1) return { ok: false, why: L ? `Atmosphere Processor level ${n + 1} needed` : 'Build an Atmosphere Processor', locked: true, stage: st };
  const time = terraTime(s, body, n); if (!canPay(s, st.cost)) return { ok: false, why: 'Not enough resources', cost: st.cost, stage: st, time };
  return { ok: true, stage: st, cost: st.cost, time };
}
export function startTerra(s: State, body: string, t = Date.now()) { const c = canTerra(s, body); if (!c.ok) return c; const n = terraStage(s, body); pay(s, c.stage!.cost); s.jobs.push({ id: uid(s), kind: 'terra', body, stage: n, name: `${BODIES[body].name}: ${c.stage!.name}`, start: t, end: t + c.time! * 1000 }); return c; }
// ---------------- comms relays ----------------
const relaysOf = (s: State) => { const S = sol(s); return S.relays || (S.relays = {}); };
export const relayLevel = (s: State, id: string) => relaysOf(s)[id] || 0;
export const relayCost = (L: number) => { const o: Record<string, number> = {}; for (const r in RELAY.cost) o[r] = round2(curve(RELAY.cost[r][0], RELAY.cost[r][1], L)); return fitMax(o); };
export const relayTime = (id: string) => Math.max(1800, Math.round((BODIES[id].travel || 2) * 3600 * 0.5));
export function canRelay(s: State, id: string): Check {
  if (id === 'earth' || !BODIES[id]) return { ok: false, why: 'Earth has its own satellites' }; if (!s.tech[RELAY.req]) return { ok: false, why: 'Research required', locked: true, tech: RELAY.req };
  if (!s.bases[id] && !sol(s).sites[id]) return { ok: false, why: 'Settle it or build an outpost first', locked: true }; const L = relayLevel(s, id); if (L >= RELAY.max) return { ok: false, why: 'Maximum level', done: true };
  if (s.jobs.some((j) => j.kind === 'relay' && j.body === id)) return { ok: false, why: 'Satellites on their way', busy: true };
  const cost = relayCost(L + 1), time = relayTime(id); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost, time }; return { ok: true, cost, time };
}
export function startRelay(s: State, id: string, t = Date.now()) { const c = canRelay(s, id); if (!c.ok) return c; pay(s, c.cost!); s.jobs.push({ id: uid(s), kind: 'relay', body: id, name: `Relays around ${BODIES[id].name}`, start: t, end: t + c.time! * 1000 }); return c; }
export function terraState(s: State, body: string) { const T = TERRA[body]; if (!T) return null; const n = terraStage(s, body); const o: Record<string, number> = { ...T.start, house: 0, n, of: T.stages.length, p: n / T.stages.length }; for (let k = 0; k < n; k++) { Object.assign(o, T.stages[k].set); o.house += T.stages[k].house; } return o; }
// ---------------- completion & hooks ----------------
completers.ship = (s, j): Note => { const S = sol(s); S.ships[j.ship] = (S.ships[j.ship] || 0) + 1; return { kind: 'ship', ship: j.ship }; };
completers.terra = (s, j): Note => { const S = sol(s); S.terra[j.body] = Math.max(S.terra[j.body] || 0, j.stage + 1); return { kind: 'terra', body: j.body, stage: j.stage, last: S.terra[j.body] >= TERRA[j.body].stages.length }; };
completers.relay = (s, j): Note => { const R = relaysOf(s); R[j.body] = (R[j.body] || 0) + 1; return { kind: 'relay', body: j.body, lvl: R[j.body] }; };
completers.voyage = (s, j): Note => {
  const S = sol(s); const P: Voyage = j.payload; const out: Note = { kind: 'voyage', op: P.op, body: P.body, name: j.name };
  if (P.op === 'found') { foundColony(s, P.body); out.founded = true; }
  if (P.op === 'site') { S.sites[P.body] = 1; const st = SITES[P.body].story; if (st && !S.story[st]) { S.story[st] = 1; s.flags[st] = 1; out.story = st; } }
  if (P.op === 'upgrade') S.sites[P.body] = (S.sites[P.body] || 0) + 1;
  if (P.op === 'transport' && s.bases[P.body]) { const n = SHIPS[j.ship].carries || 0; s.bases[P.body].pop = (s.bases[P.body].pop || 0) + n; out.people = n; }
  return out;
};
// each world's traits feed the economy
baseHooks.mult = (s, base, r) => { const b = BODIES[s.bases[base]?.body || base]; return ((b && b.mult && b.mult[r]) || 1) * (base === 'earth' ? 1 : 1 + RELAY.bonus * relayLevel(s, base)); };
baseHooks.solar = (s, base) => { const b = BODIES[s.bases[base]?.body || base]; return b && b.solar !== undefined ? b.solar : 1; };
baseHooks.house = (s, base) => { const T = terraState(s, base); return T ? T.house : 0; };
baseHooks.grow = (s, base) => (COLONY[base] ? COLONY[base].drift * lvlOf(s, base, 'hub') : 0.1);
baseHooks.life = (s, base) => lifeSupport(s, base).ls;
// outposts, mining claims and gas-giant scoops across the Solar System
// per-site multipliers from other systems (a lithophage outbreak halves a mining claim's output)
export const siteHooks: ((s: State, id: string) => number)[] = [];
rateHooks.push((s: State, R: Rates) => { const S = sol(s); const claimK = 1 + lvlOf(s, 'ceres', 'beltControl') * 0.05;
  for (const id in S.sites) { const L = S.sites[id]; const d = SITES[id]; if (!L || !d) continue; const k = (BODIES[id].presence === 'claim' ? claimK : 1) * (1 + RELAY.bonus * relayLevel(s, id)) * siteHooks.reduce((m, h) => m * h(s, id), 1); for (const r in d.prod || {}) R.prod[r] += curve(d.prod![r][0], d.prod![r][1], L) * k * (1 + (R.m.mult[r] || 0)); if (d.gen) R.gen += curve(d.gen[0], d.gen[1], L) * (1 + R.m.gen); } });
stepChecks.survey = (s, st) => !!sol(s).surveyed[st.body];
stepChecks.site = (s, st) => (sol(s).sites[st.body] || 0) >= (st.lvl || 1);
stepChecks.sites = (s, st) => Object.keys(sol(s).sites).length >= st.n;
stepChecks.terra = (s, st) => terraStage(s, st.body) >= st.n;
stepChecks.ship = (s, st) => (sol(s).ships[st.ship] || 0) >= 1;
stepChecks.relays = (s, st) => Object.values(relaysOf(s)).filter((v) => v > 0).length >= (st.n || 1);
export { BODIES, SITES, SHIPS, SHIP_ORDER, TERRA, BODY_ORDER, RELAY, clamp };
